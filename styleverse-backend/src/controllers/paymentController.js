const crypto = require("crypto");
const Razorpay = require("razorpay");

const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Cart = require("../models/Cart");
const Address = require("../models/Address");

const {
  calculateCheckout,
} = require("../services/checkoutService");

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function getRazorpayClient() {
  const keyId =
    process.env.RAZORPAY_KEY_ID;

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured"
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function isValidObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(
    String(value || "")
  );
}

function buildShippingAddress(address) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1:
      address.addressLine1,
    addressLine2:
      address.addressLine2 || "",
    city: address.city,
    state: address.state,
    postalCode:
      address.postalCode,
    country:
      address.country || "India",
  };
}

function getThumbnail(product) {
  if (!product?.images?.length) {
    return "";
  }

  const mainImage =
    product.images.find(
      (image) => image?.isMain
    );

  if (mainImage?.url) {
    return mainImage.url;
  }

  const firstImage =
    product.images[0];

  if (
    typeof firstImage ===
    "string"
  ) {
    return firstImage;
  }

  return firstImage?.url || "";
}

function normalizePaymentMethod(
  method
) {
  const allowedMethods = [
    "card",
    "upi",
    "netbanking",
    "wallet",
    "emi",
    "paylater",
  ];

  if (
    allowedMethods.includes(method)
  ) {
    return method;
  }

  return "online";
}

function sendError(
  res,
  error,
  defaultStatus = 500
) {
  const message =
    error?.message ||
    "Internal server error";

  let statusCode =
    error?.statusCode ||
    defaultStatus;

  const lowerMessage =
    message.toLowerCase();

  if (
    lowerMessage.includes("address") ||
    lowerMessage.includes("cart") ||
    lowerMessage.includes("stock") ||
    lowerMessage.includes("available") ||
    lowerMessage.includes("coupon") ||
    lowerMessage.includes("payment") ||
    lowerMessage.includes("signature") ||
    lowerMessage.includes("amount") ||
    lowerMessage.includes("order")
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
 * =====================================================
 * ORDER ITEM SNAPSHOT
 * =====================================================
 */

function buildOrderItems(
  checkoutItems
) {
  if (
    !Array.isArray(checkoutItems) ||
    checkoutItems.length === 0
  ) {
    throw new Error(
      "Order must contain at least one item"
    );
  }

  return checkoutItems.map(
    (item) => ({
      productId:
        item.productId || null,

      customDesignId:
        item.customDesignId || null,

      outfitId:
        item.outfitId || null,

      itemType:
        item.customDesignId
          ? "custom_design"
          : item.outfitId
            ? "outfit"
            : "product",

      name:
        item.name,

      thumbnail:
        item.thumbnail || "",

      quantity:
        Number(item.quantity),

      price:
        Number(item.price),

      selectedSize:
        item.selectedSize || "",

      selectedColor:
        item.selectedColor || "",

      itemStatus:
        "pending",
    })
  );
}

/*
 * =====================================================
 * STOCK VALIDATION
 * =====================================================
 */

async function validateOrderStock(
  order
) {
  for (
    const item of order.items
  ) {
    if (!item.productId) {
      continue;
    }

    const product =
      await Product.findOne({
        _id: item.productId,
        status: "active",
      }).lean();

    if (!product) {
      throw new Error(
        `Product "${item.name}" is no longer available`
      );
    }

    /*
     * Size variant
     */
    if (item.selectedSize) {
      const sizeEntry =
        Array.isArray(product.sizes)
          ? product.sizes.find(
              (entry) =>
                String(
                  entry.size || ""
                )
                  .trim()
                  .toLowerCase() ===
                String(
                  item.selectedSize
                )
                  .trim()
                  .toLowerCase()
            )
          : null;

      if (!sizeEntry) {
        throw new Error(
          `Selected size is no longer available for "${item.name}"`
        );
      }

      if (
        Number(
          sizeEntry.stock || 0
        ) < item.quantity
      ) {
        throw new Error(
          `Insufficient stock for "${item.name}" in selected size`
        );
      }

      if (
        Number(
          product.stock || 0
        ) < item.quantity
      ) {
        throw new Error(
          `Overall stock is insufficient for "${item.name}"`
        );
      }

      continue;
    }

    /*
     * Normal/custom-design stock
     */
    if (
      Number(product.stock || 0) <
      item.quantity
    ) {
      throw new Error(
        `Insufficient stock for "${item.name}"`
      );
    }
  }
}

/*
 * =====================================================
 * STOCK DECREMENT
 * =====================================================
 */

async function decrementOrderStock(
  order
) {
  const rollbackItems = [];

  try {
    for (
      const item of order.items
    ) {
      if (!item.productId) {
        continue;
      }

      /*
       * Custom design
       */
      if (
        item.itemType ===
        "custom_design"
      ) {
        const updatedProduct =
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
                stock:
                  -item.quantity,
              },
            },
            {
              new: true,
            }
          ).lean();

        if (!updatedProduct) {
          throw new Error(
            `Stock changed before payment completion for "${item.name}"`
          );
        }

        rollbackItems.push({
          productId:
            item.productId,
          quantity:
            item.quantity,
          type: "stock",
        });

        continue;
      }

      /*
       * Size-based product
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
          !Array.isArray(
            product.sizes
          ) ||
          product.sizes.length ===
            0
        ) {
          throw new Error(
            `Size variant is not available for "${item.name}"`
          );
        }

        const sizeEntry =
          product.sizes.find(
            (entry) =>
              String(
                entry.size || ""
              )
                .trim()
                .toLowerCase() ===
              String(
                item.selectedSize
              )
                .trim()
                .toLowerCase()
          );

        if (!sizeEntry) {
          throw new Error(
            `Selected size is no longer available for "${item.name}"`
          );
        }

        if (
          Number(
            sizeEntry.stock || 0
          ) < item.quantity
        ) {
          throw new Error(
            `Insufficient stock for "${item.name}" in selected size`
          );
        }

        /*
         * Keep size stock and overall stock
         * synchronized.
         */
        if (
          Number(product.stock || 0) <
          item.quantity
        ) {
          throw new Error(
            `Overall stock is insufficient for "${item.name}"`
          );
        }

        sizeEntry.stock -=
          item.quantity;

        product.stock -=
          item.quantity;

        product.markModified(
          "sizes"
        );

        await product.save();

        rollbackItems.push({
          productId:
            item.productId,
          quantity:
            item.quantity,
          type: "size",
          size:
            item.selectedSize,
        });

        continue;
      }

      /*
       * Normal product
       */
      const updatedProduct =
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
              stock:
                -item.quantity,
            },
          },
          {
            new: true,
          }
        ).lean();

      if (!updatedProduct) {
        throw new Error(
          `Stock changed before payment completion for "${item.name}"`
        );
      }

      rollbackItems.push({
        productId:
          item.productId,
        quantity:
          item.quantity,
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
 * =====================================================
 * STOCK ROLLBACK
 * =====================================================
 */

async function rollbackStock(
  rollbackItems
) {
  for (
    const item of rollbackItems
  ) {
    try {
      if (
        item.type === "size"
      ) {
        const product =
          await Product.findById(
            item.productId
          );

        if (!product) {
          continue;
        }

        const sizeEntry =
          Array.isArray(
            product.sizes
          )
            ? product.sizes.find(
                (entry) =>
                  String(
                    entry.size || ""
                  )
                    .trim()
                    .toLowerCase() ===
                  String(
                    item.size || ""
                  )
                    .trim()
                    .toLowerCase()
              )
            : null;

        if (sizeEntry) {
          sizeEntry.stock +=
            item.quantity;

          product.stock =
            Number(
              product.stock || 0
            ) + item.quantity;

          product.markModified(
            "sizes"
          );

          await product.save();
        }

        continue;
      }

      await Product.updateOne(
        {
          _id: item.productId,
        },
        {
          $inc: {
            stock:
              item.quantity,
          },
        }
      );
    } catch (
      rollbackError
    ) {
      console.error(
        "Stock rollback failed:",
        rollbackError.message
      );
    }
  }
}

/*
 * =====================================================
 * COUPON USAGE
 * =====================================================
 */

async function incrementCouponUsage(
  order
) {
  if (!order.couponId) {
    return;
  }

  const coupon =
    await Coupon.findById(
      order.couponId
    );

  if (!coupon) {
    throw new Error(
      "Coupon no longer exists"
    );
  }

  if (!coupon.isActive) {
    throw new Error(
      "Coupon is inactive"
    );
  }

  const now =
    new Date();

  if (
    (coupon.startDate &&
      now < coupon.startDate) ||
    (coupon.endDate &&
      now > coupon.endDate)
  ) {
    throw new Error(
      "Coupon is expired or not started yet"
    );
  }

  const filter = {
    _id: coupon._id,
    isActive: true,
  };

  if (
    coupon.usageLimit != null
  ) {
    filter.usedCount = {
      $lt:
        coupon.usageLimit,
    };
  }

  const result =
    await Coupon.updateOne(
      filter,
      {
        $inc: {
          usedCount: 1,
        },
      }
    );

  if (
    result.modifiedCount !==
    1
  ) {
    throw new Error(
      "Coupon usage limit reached"
    );
  }
}

/*
 * =====================================================
 * CLEAR CART
 * =====================================================
 */

async function clearUserCart(
  userId
) {
  const result =
    await Cart.updateOne(
      {
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
    result.matchedCount !== 1
  ) {
    throw new Error(
      "Cart could not be cleared"
    );
  }
}

/*
 * =====================================================
 * VERIFY RAZORPAY AMOUNT
 * =====================================================
 */

async function verifyGatewayAmount(
  razorpay,
  providerOrderId,
  expectedAmountInPaise
) {
  const gatewayOrder =
    await razorpay.orders.fetch(
      providerOrderId
    );

  if (!gatewayOrder) {
    throw new Error(
      "Razorpay order not found"
    );
  }

  if (
    Number(
      gatewayOrder.amount
    ) !==
    Number(
      expectedAmountInPaise
    )
  ) {
    throw new Error(
      "Payment amount mismatch"
    );
  }

  if (
    String(
      gatewayOrder.currency
    ).toUpperCase() !==
    "INR"
  ) {
    throw new Error(
      "Unsupported payment currency"
    );
  }

  return gatewayOrder;
}

/*
 * =====================================================
 * FINALIZE PAID PAYMENT
 * =====================================================
 */

async function finalizePaidPayment(
  payment,
  gatewayPayment,
  rawPayload
) {
  if (!payment) {
    throw new Error(
      "Payment record not found"
    );
  }

  if (!payment.orderId) {
    throw new Error(
      "Payment is not linked to an order"
    );
  }

  const order =
    await Order.findById(
      payment.orderId
    );

  if (!order) {
    throw new Error(
      "Local order not found"
    );
  }

  /*
   * Already completed.
   */
  if (
    order.paymentStatus ===
      "paid" &&
    payment.status ===
      "succeeded"
  ) {
    return order;
  }

  /*
   * Validate inventory first.
   */
  await validateOrderStock(
    order
  );

  /*
   * Prevent duplicate inventory adjustment.
   *
   * verify API and webhook can both arrive.
   */
  const lock =
    await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        inventoryAdjusted:
          false,
      },
      {
        $set: {
          inventoryAdjusted:
            true,
        },
      },
      {
        new: true,
      }
    );

  if (!lock) {
    const latestOrder =
      await Order.findById(
        order._id
      );

    if (
      latestOrder?.paymentStatus ===
      "paid"
    ) {
      return latestOrder;
    }

    throw new Error(
      "Payment is already being processed"
    );
  }

  let rollbackItems = [];

  try {
    /*
     * Decrease stock.
     */
    rollbackItems =
      await decrementOrderStock(
        order
      );

    /*
     * Coupon usage.
     */
    if (order.couponId) {
      await incrementCouponUsage(
        order
      );
    }

    /*
     * Update payment record.
     */
    await Payment.updateOne(
      {
        _id: payment._id,
      },
      {
        $set: {
          status:
            "succeeded",

          providerPaymentId:
            gatewayPayment?.id ||
            payment.providerPaymentId,

          paymentMethod:
            normalizePaymentMethod(
              gatewayPayment?.method
            ),

          capturedAt:
            new Date(),

          raw:
            rawPayload ||
            payment.raw,
        },
      }
    );

    /*
     * Update order.
     */
    order.paymentStatus =
      "paid";

    order.paymentMethod =
      "razorpay";

    order.paymentOrderId =
      payment.providerOrderId;

    order.paymentId =
      gatewayPayment?.id ||
      payment.providerPaymentId;

    order.paymentSignature =
      payment.providerSignature ||
      null;

    order.status =
      "confirmed";

    order.confirmedAt =
      new Date();

    order.statusHistory =
      Array.isArray(
        order.statusHistory
      )
        ? order.statusHistory
        : [];

    order.statusHistory.push({
      status:
        "confirmed",

      note:
        "Razorpay payment captured and order confirmed",

      changedAt:
        new Date(),
    });

    await order.save();

    /*
     * Clear cart.
     */
    await clearUserCart(
      order.userId
    );

    return order;
  } catch (error) {
    /*
     * Rollback stock.
     */
    if (
      rollbackItems.length > 0
    ) {
      await rollbackStock(
        rollbackItems
      );
    }

    /*
     * Release inventory lock.
     */
    await Payment.updateOne(
      {
        _id: payment._id,
      },
      {
        $set: {
          inventoryAdjusted:
            false,
        },
      }
    );

    throw error;
  }
}

/*
 * =====================================================
 * CREATE RAZORPAY ORDER
 * =====================================================
 */

exports.createRazorpayOrder =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      const {
        addressId,
      } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      if (!addressId) {
        return res.status(400).json({
          success: false,
          message:
            "addressId is required",
        });
      }

      if (
        !isValidObjectId(
          addressId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid addressId",
        });
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
       * IMPORTANT:
       * Use the same checkout service as
       * the cart/checkout page.
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
        checkout.items.length ===
          0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cart is empty",
        });
      }

      const amountInPaise =
        Math.round(
          Number(
            checkout.totalAmount
          ) * 100
        );

      if (
        !Number.isInteger(
          amountInPaise
        ) ||
        amountInPaise <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment amount",
        });
      }

      const razorpay =
        getRazorpayClient();

      /*
       * Create Razorpay gateway order.
       */
      const razorpayOrder =
        await razorpay.orders.create(
          {
            amount:
              amountInPaise,

            currency:
              "INR",

            receipt:
              `SV-${Date.now()}`,

            notes: {
              userId:
                String(userId),

              addressId:
                String(addressId),
            },
          }
        );

      /*
       * Build local order snapshot.
       */
      const orderItems =
        buildOrderItems(
          checkout.items
        );

      /*
       * Create our local order.
       */
      const order =
        await Order.create({
          userId,

          items:
            orderItems,

          subtotal:
            Number(
              checkout.subtotal
            ),

          discount:
            Number(
              checkout.discount || 0
            ),

          shippingFee:
            Number(
              checkout.shippingFee || 0
            ),

          totalAmount:
            Number(
              checkout.totalAmount
            ),

          currency:
            "INR",

          couponId:
            checkout.coupon?.id ||
            null,

          couponCode:
            checkout.coupon?.code ||
            "",

          paymentStatus:
            "pending",

          paymentMethod:
            "razorpay",

          paymentOrderId:
            razorpayOrder.id,

          shippingAddress:
            buildShippingAddress(
              address
            ),

          status:
            "pending",

          statusHistory: [
            {
              status:
                "pending",

              note:
                "Awaiting Razorpay payment",

              changedAt:
                new Date(),
            },
          ],

          placedAt:
            new Date(),
        });

      /*
       * Create local payment record.
       */
      const payment =
        await Payment.create({
          userId,

          orderId:
            order._id,

          provider:
            "razorpay",

          providerOrderId:
            razorpayOrder.id,

          amount:
            Number(
              checkout.totalAmount
            ),

          amountInPaise,

          currency:
            "INR",

          status:
            "created",

          paymentMethod:
            "online",

          inventoryAdjusted:
            false,

          raw:
            razorpayOrder,
        });

      return res.status(201).json({
        success: true,
        data: {
          razorpayKeyId:
            process.env
              .RAZORPAY_KEY_ID,

          razorpayOrderId:
            razorpayOrder.id,

          amountInPaise,

          currency:
            "INR",

          paymentId:
            payment._id,

          orderId:
            order._id,

          orderNumber:
            order.orderNumber,
        },
      });
    } catch (error) {
      console.error(
        "createRazorpayOrder error:",
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
 * VERIFY RAZORPAY PAYMENT
 * =====================================================
 */

exports.verifyRazorpayPaymentAndCreateOrder =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required Razorpay payment fields",
        });
      }

      /*
       * Find payment belonging to the
       * current user.
       */
      const payment =
        await Payment.findOne({
          providerOrderId:
            razorpay_order_id,

          userId,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment record not found",
        });
      }

      /*
       * Already successfully completed.
       */
      if (
        payment.status ===
          "succeeded" &&
        payment.orderId
      ) {
        const existingOrder =
          await Order.findById(
            payment.orderId
          );

        return res.status(200).json({
          success: true,
          message:
            "Payment already verified",
          data: {
            order:
              existingOrder,
          },
        });
      }

      if (
        !process.env
          .RAZORPAY_KEY_SECRET
      ) {
        throw new Error(
          "Razorpay key secret is not configured"
        );
      }

      /*
       * Verify checkout signature.
       */
      const signatureBody =
        `${razorpay_order_id}|${razorpay_payment_id}`;

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(
            signatureBody
          )
          .digest("hex");

      const receivedSignature =
        String(
          razorpay_signature
        );

      const signaturesMatch =
        expectedSignature.length ===
          receivedSignature.length &&
        crypto.timingSafeEqual(
          Buffer.from(
            expectedSignature,
            "utf8"
          ),
          Buffer.from(
            receivedSignature,
            "utf8"
          )
        );

      if (!signaturesMatch) {
        await Payment.updateOne(
          {
            _id:
              payment._id,
          },
          {
            $set: {
              status:
                "failed",

              providerPaymentId:
                razorpay_payment_id,

              providerSignature:
                razorpay_signature,

              failureReason:
                "Invalid Razorpay signature",
            },
          }
        );

        return res.status(400).json({
          success: false,
          message:
            "Payment verification failed",
        });
      }

      const razorpay =
        getRazorpayClient();

      /*
       * Verify gateway order amount.
       */
      await verifyGatewayAmount(
        razorpay,

        razorpay_order_id,

        payment.amountInPaise
      );

      /*
       * Fetch actual payment from Razorpay.
       */
      const gatewayPayment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );

      if (!gatewayPayment) {
        throw new Error(
          "Razorpay payment not found"
        );
      }

      /*
       * Ensure payment belongs to
       * the expected Razorpay order.
       */
      if (
        String(
          gatewayPayment.order_id
        ) !==
        String(
          razorpay_order_id
        )
      ) {
        throw new Error(
          "Razorpay payment/order mismatch"
        );
      }

      /*
       * Verify actual gateway amount.
       */
      if (
        Number(
          gatewayPayment.amount
        ) !==
        Number(
          payment.amountInPaise
        )
      ) {
        throw new Error(
          "Payment amount mismatch"
        );
      }

      /*
       * Only captured payments can
       * create a paid order.
       */
      if (
        gatewayPayment.status !==
        "captured"
      ) {
        await Payment.updateOne(
          {
            _id:
              payment._id,
          },
          {
            $set: {
              status:
                "failed",

              providerPaymentId:
                razorpay_payment_id,

              providerSignature:
                razorpay_signature,

              failureReason:
                `Payment status is ${gatewayPayment.status}`,
            },
          }
        );

        return res.status(400).json({
          success: false,
          message:
            `Payment is not captured. Current status: ${gatewayPayment.status}`,
        });
      }

      /*
       * Save payment gateway data.
       */
      payment.providerPaymentId =
        razorpay_payment_id;

      payment.providerSignature =
        razorpay_signature;

      payment.paymentMethod =
        normalizePaymentMethod(
          gatewayPayment.method
        );

      payment.status =
        "succeeded";

      payment.capturedAt =
        new Date();

      payment.raw = {
        order:
          gatewayPayment.order_id,

        payment:
          gatewayPayment,
      };

      await payment.save();

      /*
       * Finalize order + stock + cart.
       */
      const order =
        await finalizePaidPayment(
          payment,
          gatewayPayment,
          {
            order:
              gatewayPayment.order_id,

            payment:
              gatewayPayment,
          }
        );

      /*
       * Store Razorpay identifiers
       * on local order.
       */
      await Order.updateOne(
        {
          _id:
            order._id,
        },
        {
          $set: {
            paymentOrderId:
              razorpay_order_id,

            paymentId:
              razorpay_payment_id,

            paymentSignature:
              razorpay_signature,
          },
        }
      );

      const finalOrder =
        await Order.findById(
          order._id
        );

      return res.status(201).json({
        success: true,
        message:
          "Payment verified and order confirmed",
        data: {
          order:
            finalOrder,
        },
      });
    } catch (error) {
      console.error(
        "verifyRazorpayPayment error:",
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
 * RAZORPAY WEBHOOK
 * =====================================================
 */

exports.handleRazorpayWebhook =
  async (req, res) => {
    try {
      const webhookSecret =
        process.env
          .RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return res.status(500).json({
          success: false,
          message:
            "Razorpay webhook secret is not configured",
        });
      }

      /*
       * app.js must provide the raw
       * request body for this route.
       */
      if (
        !Buffer.isBuffer(
          req.body
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Webhook raw body is required",
        });
      }

      const receivedSignature =
        req.headers[
          "x-razorpay-signature"
        ];

      if (!receivedSignature) {
        return res.status(400).json({
          success: false,
          message:
            "Missing webhook signature",
        });
      }

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            webhookSecret
          )
          .update(req.body)
          .digest("hex");

      const received =
        String(
          receivedSignature
        );

      const signaturesMatch =
        expectedSignature.length ===
          received.length &&
        crypto.timingSafeEqual(
          Buffer.from(
            expectedSignature,
            "utf8"
          ),
          Buffer.from(
            received,
            "utf8"
          )
        );

      if (!signaturesMatch) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid webhook signature",
        });
      }

      let payload;

      try {
        payload =
          JSON.parse(
            req.body.toString(
              "utf8"
            )
          );
      } catch {
        return res.status(400).json({
          success: false,
          message:
            "Invalid webhook JSON",
        });
      }

      const event =
        payload?.event;

      const eventId =
        req.headers[
          "x-razorpay-event-id"
        ];

      /*
       * ---------------------------------------------
       * PAYMENT CAPTURED / ORDER PAID
       * ---------------------------------------------
       */
      if (
        event ===
          "payment.captured" ||
        event ===
          "order.paid"
      ) {
        const paymentEntity =
          payload?.payload
            ?.payment?.entity;

        const orderEntity =
          payload?.payload
            ?.order?.entity;

        const providerOrderId =
          paymentEntity?.order_id ||
          orderEntity?.id;

        const providerPaymentId =
          paymentEntity?.id;

        if (!providerOrderId) {
          return res.status(200).json({
            success: true,
            message:
              "Webhook acknowledged",
          });
        }

        const payment =
          await Payment.findOne({
            providerOrderId,
          });

        if (!payment) {
          return res.status(200).json({
            success: true,
            message:
              "Webhook acknowledged; local payment not found",
          });
        }

        /*
         * Duplicate webhook event.
         */
        if (
          eventId &&
          payment.processedWebhookEventIds.includes(
            String(eventId)
          )
        ) {
          return res.status(200).json({
            success: true,
            message:
              "Webhook already processed",
          });
        }

        /*
         * Save gateway payment data.
         */
        payment.providerPaymentId =
          providerPaymentId ||
          payment.providerPaymentId;

        payment.paymentMethod =
          normalizePaymentMethod(
            paymentEntity?.method
          );

        payment.providerSignature =
          payment.providerSignature ||
          null;

        payment.status =
          "succeeded";

        payment.capturedAt =
          new Date();

        payment.raw =
          payload;

        if (eventId) {
          payment.processedWebhookEventIds.push(
            String(eventId)
          );
        }

        await payment.save();

        /*
         * Finalize local order.
         */
        const order =
          await finalizePaidPayment(
            payment,
            paymentEntity,
            payload
          );

        await Order.updateOne(
          {
            _id:
              order._id,
          },
          {
            $set: {
              paymentOrderId:
                providerOrderId,

              paymentId:
                providerPaymentId ||
                null,

              paymentStatus:
                "paid",

              paymentMethod:
                "razorpay",

              status:
                "confirmed",
            },
          }
        );

        return res.status(200).json({
          success: true,
          message:
            "Webhook processed successfully",
        });
      }

      /*
       * ---------------------------------------------
       * PAYMENT FAILED
       * ---------------------------------------------
       */
      if (
        event ===
        "payment.failed"
      ) {
        const paymentEntity =
          payload?.payload
            ?.payment?.entity;

        const providerOrderId =
          paymentEntity?.order_id;

        const providerPaymentId =
          paymentEntity?.id;

        if (!providerOrderId) {
          return res.status(200).json({
            success: true,
            message:
              "Webhook acknowledged",
          });
        }

        const payment =
          await Payment.findOne({
            providerOrderId,
          });

        if (!payment) {
          return res.status(200).json({
            success: true,
            message:
              "Webhook acknowledged; payment not found",
          });
        }

        if (
          eventId &&
          payment.processedWebhookEventIds.includes(
            String(eventId)
          )
        ) {
          return res.status(200).json({
            success: true,
            message:
              "Webhook already processed",
          });
        }

        payment.status =
          "failed";

        payment.providerPaymentId =
          providerPaymentId ||
          payment.providerPaymentId;

        payment.paymentMethod =
          normalizePaymentMethod(
            paymentEntity?.method
          );

        payment.failureReason =
          paymentEntity
            ?.error_description ||
          "Razorpay payment failed";

        payment.raw =
          payload;

        if (eventId) {
          payment.processedWebhookEventIds.push(
            String(eventId)
          );
        }

        await payment.save();

        /*
         * Mark local pending order cancelled.
         * Stock was not decremented yet for
         * a pending Razorpay order.
         */
        if (payment.orderId) {
          await Order.updateOne(
            {
              _id:
                payment.orderId,

              paymentStatus:
                "pending",
            },
            {
              $set: {
                status:
                  "cancelled",

                cancelledAt:
                  new Date(),
              },

              $push: {
                statusHistory: {
                  status:
                    "cancelled",

                  note:
                    "Razorpay payment failed",

                  changedAt:
                    new Date(),
                },
              },
            }
          );
        }

        return res.status(200).json({
          success: true,
          message:
            "Failed payment webhook processed",
        });
      }

      /*
       * Other events.
       */
      return res.status(200).json({
        success: true,
        message:
          "Webhook acknowledged",
      });
    } catch (error) {
      console.error(
        "handleRazorpayWebhook error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Webhook processing failed",
      });
    }
  };