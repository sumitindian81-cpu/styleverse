const mongoose = require("mongoose");

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const CustomDesign = require("../models/CustomDesign");

const { calculateCheckout } = require("../services/checkoutService");

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function createIdempotencyKey() {
  return `COD-${Date.now()}-${new mongoose.Types.ObjectId().toString()}`;
}

function getThumbnail(product) {
  if (!product?.images?.length) {
    return "";
  }

  const mainImage = product.images.find(
    (image) => image?.isMain
  );

  if (mainImage?.url) {
    return mainImage.url;
  }

  const firstImage = product.images[0];

  if (typeof firstImage === "string") {
    return firstImage;
  }

  return firstImage?.url || "";
}

function buildShippingAddress(address) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country || "India",
  };
}

function sendError(res, error) {
  const message =
    error?.message || "Internal server error";

  let statusCode = error?.statusCode || 500;

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("stock") ||
    lowerMessage.includes("available") ||
    lowerMessage.includes("coupon") ||
    lowerMessage.includes("cart") ||
    lowerMessage.includes("custom design") ||
    lowerMessage.includes("quantity") ||
    lowerMessage.includes("address")
  ) {
    statusCode = 400;
  }

  if (error?.code === 11000) {
    statusCode = 409;
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

/*
 * Build order-item snapshots from server-side checkout data.
 */
async function buildOrderItems(checkoutItems, userId) {
  const orderItems = [];

  for (const item of checkoutItems) {
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(
        "Quantity must be a positive integer"
      );
    }

    /*
     * -----------------------------------------
     * NORMAL PRODUCT
     * -----------------------------------------
     */
    if (
      item.productId &&
      !item.customDesignId
    ) {
      const product =
        await Product.findOne({
          _id: item.productId,
          status: "active",
        }).lean();

      if (!product) {
        throw new Error(
          "Product is no longer available"
        );
      }

      /*
       * Validate selected size stock.
       */
      if (item.selectedSize) {
        if (
          !Array.isArray(product.sizes) ||
          product.sizes.length === 0
        ) {
          throw new Error(
            `Size variant is not available for "${product.name}"`
          );
        }

        const sizeEntry =
          product.sizes.find(
            (entry) =>
              String(entry.size || "")
                .trim()
                .toLowerCase() ===
              String(item.selectedSize)
                .trim()
                .toLowerCase()
          );

        if (!sizeEntry) {
          throw new Error(
            `Selected size is no longer available for "${product.name}"`
          );
        }

        if (
          Number(sizeEntry.stock || 0) <
          quantity
        ) {
          throw new Error(
            `Insufficient stock for "${product.name}" in selected size`
          );
        }
      } else if (
        Number(product.stock || 0) <
        quantity
      ) {
        throw new Error(
          `Insufficient stock for "${product.name}"`
        );
      }

      orderItems.push({
        productId: product._id,
        customDesignId: undefined,
        outfitId: undefined,

        itemType: "product",

        name: product.name,
        thumbnail: getThumbnail(product),

        quantity,
        price: Number(item.price),

        selectedSize:
          item.selectedSize || "",

        selectedColor:
          item.selectedColor || "",

        itemStatus: "pending",
      });

      continue;
    }

    /*
     * -----------------------------------------
     * CUSTOM DESIGN
     * -----------------------------------------
     */
    if (item.customDesignId) {
      const design =
        await CustomDesign.findOne({
          _id: item.customDesignId,
          userId,
          status: "active",
        })
          .populate({
            path: "baseProductId",
            select:
              "name images status stock sizes colors isCustomizable",
          })
          .lean();

      if (!design) {
        throw new Error(
          "Custom design is no longer available"
        );
      }

      const baseProduct =
        design.baseProductId;

      if (
        !baseProduct ||
        baseProduct.status !== "active" ||
        baseProduct.isCustomizable !== true
      ) {
        throw new Error(
          "The base product for this custom design is no longer available"
        );
      }

      /*
       * Current CustomDesign flow does not store
       * selected size, so don't guess a size.
       */
      if (
        Array.isArray(baseProduct.sizes) &&
        baseProduct.sizes.length > 0
      ) {
        throw new Error(
          "Custom design checkout with size variants is not yet supported"
        );
      }

      if (
        Number(baseProduct.stock || 0) <
        quantity
      ) {
        throw new Error(
          `Insufficient stock for custom design "${design.title || baseProduct.name}"`
        );
      }

      orderItems.push({
        productId: baseProduct._id,
        customDesignId: design._id,
        outfitId: undefined,

        itemType: "custom_design",

        name:
          design.title ||
          baseProduct.name,

        thumbnail:
          design.previewImageUrl ||
          getThumbnail(baseProduct),

        quantity,
        price: Number(item.price),

        selectedSize: "",
        selectedColor: "",

        itemStatus: "pending",
      });

      continue;
    }

    /*
     * -----------------------------------------
     * OUTFIT
     * -----------------------------------------
     *
     * Outfit checkout is handled later when
     * checkoutService supports outfit items.
     */
    if (item.outfitId) {
      throw new Error(
        "Complete outfit checkout is not yet connected"
      );
    }

    throw new Error(
      "Cart contains an invalid order item"
    );
  }

  if (orderItems.length === 0) {
    throw new Error(
      "Order must contain at least one item"
    );
  }

  return orderItems;
}

/*
 * Decrease stock safely.
 *
 * IMPORTANT:
 * For a size-based product:
 * - selected size stock decreases
 * - overall product.stock also decreases
 *
 * This keeps both inventory values synchronized.
 */
async function decrementStock(orderItems) {
  const rollbackItems = [];

  try {
    for (const item of orderItems) {
      if (!item.productId) {
        continue;
      }

      /*
       * -----------------------------------------
       * CUSTOM DESIGN
       * -----------------------------------------
       */
      if (
        item.itemType === "custom_design"
      ) {
        const updated =
          await Product.findOneAndUpdate(
            {
              _id: item.productId,
              status: "active",
              stock: {
                $gte: item.quantity,
              },
            },
            {
              $inc: {
                stock: -item.quantity,
              },
            },
            {
              new: true,
            }
          ).lean();

        if (!updated) {
          throw new Error(
            `Stock changed before order could be completed for "${item.name}"`
          );
        }

        rollbackItems.push({
          productId: item.productId,
          quantity: item.quantity,
          type: "stock",
        });

        continue;
      }

      /*
       * -----------------------------------------
       * SIZE VARIANT
       * -----------------------------------------
       */
      if (item.selectedSize) {
        const product =
          await Product.findOne({
            _id: item.productId,
            status: "active",
          });

        if (!product) {
          throw new Error(
            `Product "${item.name}" is no longer available`
          );
        }

        if (
          !Array.isArray(product.sizes) ||
          product.sizes.length === 0
        ) {
          throw new Error(
            `Size variant is not available for "${item.name}"`
          );
        }

        const sizeEntry =
          product.sizes.find(
            (entry) =>
              String(entry.size || "")
                .trim()
                .toLowerCase() ===
              String(item.selectedSize)
                .trim()
                .toLowerCase()
          );

        if (!sizeEntry) {
          throw new Error(
            `Selected size is no longer available for "${item.name}"`
          );
        }

        if (
          Number(sizeEntry.stock || 0) <
          item.quantity
        ) {
          throw new Error(
            `Insufficient stock for "${item.name}" in selected size`
          );
        }

        /*
         * Decrease selected size stock.
         */
        sizeEntry.stock -=
          item.quantity;

        /*
         * Decrease overall product stock too.
         */
        if (
          Number(product.stock || 0) <
          item.quantity
        ) {
          throw new Error(
            `Overall stock is insufficient for "${item.name}"`
          );
        }

        product.stock -=
          item.quantity;

        product.markModified("sizes");

        await product.save();

        rollbackItems.push({
          productId: item.productId,
          quantity: item.quantity,
          type: "size",
          size: item.selectedSize,
        });

        continue;
      }

      /*
       * -----------------------------------------
       * NORMAL PRODUCT STOCK
       * -----------------------------------------
       */
      const updated =
        await Product.findOneAndUpdate(
          {
            _id: item.productId,
            status: "active",
            stock: {
              $gte: item.quantity,
            },
          },
          {
            $inc: {
              stock: -item.quantity,
            },
          },
          {
            new: true,
          }
        ).lean();

      if (!updated) {
        throw new Error(
          `Stock changed before order could be completed for "${item.name}"`
        );
      }

      rollbackItems.push({
        productId: item.productId,
        quantity: item.quantity,
        type: "stock",
      });
    }

    return rollbackItems;
  } catch (error) {
    await rollbackStock(
      rollbackItems
    );

    throw error;
  }
}

/*
 * Restore stock if order creation fails.
 */
async function rollbackStock(
  rollbackItems
) {
  for (const item of rollbackItems) {
    try {
      /*
       * -----------------------------------------
       * SIZE STOCK ROLLBACK
       * -----------------------------------------
       */
      if (item.type === "size") {
        const product =
          await Product.findById(
            item.productId
          );

        if (!product) {
          continue;
        }

        const sizeEntry =
          Array.isArray(product.sizes)
            ? product.sizes.find(
                (entry) =>
                  String(entry.size || "")
                    .trim()
                    .toLowerCase() ===
                  String(item.size || "")
                    .trim()
                    .toLowerCase()
              )
            : null;

        if (sizeEntry) {
          /*
           * Restore selected size.
           */
          sizeEntry.stock +=
            item.quantity;

          /*
           * Restore overall product stock.
           */
          product.stock =
            Number(product.stock || 0) +
            item.quantity;

          product.markModified(
            "sizes"
          );

          await product.save();
        }

        continue;
      }

      /*
       * -----------------------------------------
       * NORMAL STOCK ROLLBACK
       * -----------------------------------------
       */
      await Product.updateOne(
        {
          _id: item.productId,
        },
        {
          $inc: {
            stock: item.quantity,
          },
        }
      );
    } catch (rollbackError) {
      console.error(
        "Stock rollback failed:",
        rollbackError.message
      );
    }
  }
}

/*
 * =====================================================
 * CREATE COD ORDER
 * =====================================================
 */
exports.createCodOrder = async (
  req,
  res
) => {
  let rollbackItems = [];
  let createdOrderId = null;
  let couponIncremented = false;
  let couponIdForRollback = null;

  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      addressId,
      idempotencyKey,
    } = req.body || {};

    /*
     * Address validation.
     */
    if (!addressId) {
      return res.status(400).json({
        success: false,
        message:
          "addressId is required",
      });
    }

    if (
      !isValidObjectId(addressId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid addressId",
      });
    }

    /*
     * Prevent duplicate order creation.
     */
    if (idempotencyKey) {
      const existingOrder =
        await Order.findOne({
          userId,
          idempotencyKey:
            String(
              idempotencyKey
            ).trim(),
        });

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message:
            "Order already created",
          data: {
            order:
              existingOrder,
          },
        });
      }
    }

    /*
     * Verify address ownership.
     */
    const address =
      await Address.findOne({
        _id: addressId,
        userId,
      });

    if (!address) {
      return res.status(404).json({
        success: false,
        message:
          "Address not found",
      });
    }

    /*
     * Server-side checkout calculation.
     */
    const checkout =
      await calculateCheckout(
        userId
      );

    if (
      !checkout ||
      !Array.isArray(
        checkout.items
      ) ||
      checkout.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const cart =
      checkout.cart;

    /*
     * Coupon snapshot.
     */
    let couponId = null;
    let couponCode = "";

    if (
      cart?.appliedCouponId
    ) {
      const coupon =
        await Coupon.findById(
          cart.appliedCouponId
        );

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message:
            "Applied coupon no longer exists",
        });
      }

      if (!coupon.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "Applied coupon is inactive",
        });
      }

      const now =
        new Date();

      if (
        (coupon.startDate &&
          now < coupon.startDate) ||
        (coupon.endDate &&
          now > coupon.endDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Applied coupon is expired or not started yet",
        });
      }

      if (
        coupon.usageLimit != null &&
        Number(
          coupon.usedCount
        ) >=
          Number(
            coupon.usageLimit
          )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon usage limit reached",
        });
      }

      if (
        Number(
          checkout.subtotal
        ) <
        Number(
          coupon.minCartAmount || 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Minimum cart amount is ₹${coupon.minCartAmount}`,
        });
      }

      couponId =
        coupon._id;

      couponCode =
        coupon.code;
    }

    couponIdForRollback =
      couponId;

    /*
     * Create order-item snapshot.
     */
    const orderItems =
      await buildOrderItems(
        checkout.items,
        userId
      );

    const finalIdempotencyKey =
      String(
        idempotencyKey ||
          createIdempotencyKey()
      ).trim();

    /*
     * Decrease stock.
     */
    rollbackItems =
      await decrementStock(
        orderItems
      );

    /*
     * Create COD order.
     */
    const order =
      await Order.create({
        userId,

        idempotencyKey:
          finalIdempotencyKey,

        items: orderItems,

        subtotal: Number(
          checkout.subtotal
        ),

        discount: Number(
          checkout.discount || 0
        ),

        shippingFee: Number(
          checkout.shippingFee || 0
        ),

        totalAmount: Number(
          checkout.totalAmount
        ),

        currency:
          checkout.currency ||
          "INR",

        couponId,
        couponCode,

        paymentStatus:
          "pending",

        paymentMethod:
          "cod",

        shippingAddress:
          buildShippingAddress(
            address
          ),

        status:
          "confirmed",

        statusHistory: [
          {
            status: "confirmed",
            note:
              "COD order placed successfully",
            changedAt:
              new Date(),
          },
        ],

        placedAt:
          new Date(),

        confirmedAt:
          new Date(),
      });

    createdOrderId =
      order._id;

    /*
     * Increment coupon usage.
     */
    if (couponId) {
      const couponFilter = {
        _id: couponId,
        isActive: true,
      };

      const currentCoupon =
        await Coupon.findById(
          couponId
        ).lean();

      if (
        currentCoupon?.usageLimit !=
        null
      ) {
        couponFilter.usedCount = {
          $lt:
            currentCoupon.usageLimit,
        };
      }

      const couponUpdate =
        await Coupon.updateOne(
          couponFilter,
          {
            $inc: {
              usedCount: 1,
            },
          }
        );

      if (
        couponUpdate.modifiedCount !==
        1
      ) {
        throw new Error(
          "Coupon could not be applied to the order"
        );
      }

      couponIncremented =
        true;
    }

    /*
     * Clear cart.
     */
    const cartUpdate =
      await Cart.updateOne(
        {
          _id: cart._id,
          userId,
        },
        {
          $set: {
            items: [],
            appliedCouponId:
              null,
          },
        }
      );

    if (
      cartUpdate.matchedCount !==
      1
    ) {
      throw new Error(
        "Cart could not be cleared after order creation"
      );
    }

    /*
     * SUCCESS
     */
    return res.status(201).json({
      success: true,
      message:
        "COD order placed successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    console.error(
      "createCodOrder error:",
      error.message
    );

    /*
     * Restore stock.
     */
    if (
      rollbackItems.length > 0
    ) {
      await rollbackStock(
        rollbackItems
      );
    }

    /*
     * Restore coupon usage.
     */
    if (
      couponIncremented &&
      couponIdForRollback
    ) {
      try {
        await Coupon.updateOne(
          {
            _id:
              couponIdForRollback,
            usedCount: {
              $gt: 0,
            },
          },
          {
            $inc: {
              usedCount: -1,
            },
          }
        );
      } catch (
        couponRollbackError
      ) {
        console.error(
          "Coupon rollback failed:",
          couponRollbackError.message
        );
      }
    }

    /*
     * Delete partially created order.
     */
    if (createdOrderId) {
      try {
        await Order.findByIdAndDelete(
          createdOrderId
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Order rollback failed:",
          deleteError.message
        );
      }
    }

    /*
     * Duplicate idempotency request.
     */
    if (
      error?.code === 11000 &&
      error?.keyPattern
        ?.idempotencyKey
    ) {
      const existingOrder =
        await Order.findOne({
          userId:
            req.user?.userId,
          idempotencyKey:
            String(
              req.body
                ?.idempotencyKey ||
                ""
            ).trim(),
        });

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message:
            "Order already created",
          data: {
            order:
              existingOrder,
          },
        });
      }
    }

    return sendError(
      res,
      error
    );
  }
};

/*
 * =====================================================
 * GET MY ORDERS
 * =====================================================
 */
exports.getMyOrders = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const orders =
      await Order.find({
        userId,
      }).sort({
        createdAt: -1,
      });

    return res.json({
      success: true,
      data: {
        orders,
      },
    });
  } catch (error) {
    console.error(
      "getMyOrders error:",
      error.message
    );

    return sendError(
      res,
      error
    );
  }
};

/*
 * =====================================================
 * GET MY ORDER BY ID
 * =====================================================
 */
exports.getMyOrderById = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId;

    const { id } =
      req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid order id",
      });
    }

    const order =
      await Order.findOne({
        _id: id,
        userId,
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    return res.json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    console.error(
      "getMyOrderById error:",
      error.message
    );

    return sendError(
      res,
      error
    );
  }
};