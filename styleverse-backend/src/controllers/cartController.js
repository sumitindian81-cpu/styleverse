const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const CustomDesign = require("../models/CustomDesign");
const Outfit = require("../models/Outfit");

const {
  calculateCheckout,
} = require("../services/checkoutService");

const CART_PRODUCT_POPULATE =
  "name price images stock status sizes colors type gender slug isCustomizable";

const CART_CUSTOM_DESIGN_POPULATE =
  "userId title price previewImageUrl baseItemType attributes baseProductId status";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function parsePositiveInteger(value, fallback = null) {
  const num = Number(value);

  if (!Number.isInteger(num) || num < 1) {
    return fallback;
  }

  return num;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Backfill missing _id values for legacy cart items.
// New CartItem documents already receive _id from the schema.
function ensureCartItemIds(cart) {
  let changed = false;

  for (const item of cart.items || []) {
    if (!item._id) {
      item._id = new mongoose.Types.ObjectId();
      changed = true;
    }
  }

  return changed;
}

function findSize(product, selectedSize) {
  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : [];

  if (sizes.length === 0) {
    if (selectedSize) {
      return {
        valid: false,
        message: `This product does not support size "${selectedSize}"`,
      };
    }

    return {
      valid: true,
      entry: null,
    };
  }

  if (!selectedSize) {
    return {
      valid: false,
      message: `Please select a size for "${product.name}"`,
    };
  }

  const normalized = selectedSize.toLowerCase();

  const entry = sizes.find(
    (item) =>
      normalizeString(item.size).toLowerCase() === normalized
  );

  if (!entry) {
    return {
      valid: false,
      message: `Selected size is not available for "${product.name}"`,
    };
  }

  return {
    valid: true,
    entry,
  };
}

function findColor(product, selectedColor) {
  const colors = Array.isArray(product.colors)
    ? product.colors
    : [];

  if (colors.length === 0) {
    if (selectedColor) {
      return {
        valid: false,
        message: `This product does not support color "${selectedColor}"`,
      };
    }

    return {
      valid: true,
      entry: null,
    };
  }

  if (!selectedColor) {
    return {
      valid: false,
      message: `Please select a color for "${product.name}"`,
    };
  }

  const normalized = selectedColor.toLowerCase();

  const entry = colors.find(
    (item) =>
      normalizeString(item.name).toLowerCase() === normalized
  );

  if (!entry) {
    return {
      valid: false,
      message: `Selected color is not available for "${product.name}"`,
    };
  }

  return {
    valid: true,
    entry,
  };
}

async function getPopulatedCart(userId) {
  return Cart.findOne({ userId })
    .populate(
      "items.productId",
      CART_PRODUCT_POPULATE
    )
    .populate({
      path: "items.customDesignId",
      select: CART_CUSTOM_DESIGN_POPULATE,
      populate: {
        path: "baseProductId",
        select:
          "name price images stock status sizes colors type gender isCustomizable",
      },
    })
    .populate(
      "items.outfitId",
      "name previewImageUrl status"
    );
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [],
      appliedCouponId: null,
    });

    return cart;
  }

  // Backfill missing subdocument IDs for legacy cart items.
  if (ensureCartItemIds(cart)) {
    await cart.save();
  }

  return cart;
}

// --------------------------------------------------
// GET CART
// --------------------------------------------------

exports.getCart = async (req, res, next) => {
  try {
    // Also handles legacy carts whose items may not
    // have had subdocument _ids in older data.
    const cart = await getOrCreateCart(req.user.userId);

    const populatedCart = await getPopulatedCart(
      req.user.userId
    );

    return res.json({
      success: true,
      data: {
        cart:
          populatedCart || {
            _id: cart._id,
            userId: req.user.userId,
            items: [],
            appliedCouponId: null,
          },
      },
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------
// GET CHECKOUT PREVIEW
// --------------------------------------------------
// GET /api/cart/checkout
//
// This endpoint gives frontend the final server-side
// subtotal, discount, shipping and total before placing
// an order.
// --------------------------------------------------

exports.getCheckoutPreview = async (
  req,
  res,
  next
) => {
  try {
    const checkout = await calculateCheckout(
      req.user.userId
    );

    return res.json({
      success: true,
      data: {
        subtotal: checkout.subtotal,
        discount: checkout.discount,
        shippingFee: checkout.shippingFee,
        totalAmount: checkout.totalAmount,
        currency: checkout.currency,
        coupon: checkout.coupon,
        items: checkout.items,
      },
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------
// ADD NORMAL PRODUCT / CUSTOM DESIGN TO CART
// --------------------------------------------------

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const {
      productId,
      customDesignId,
      quantity = 1,
      selectedSize = "",
      selectedColor = "",
    } = req.body;

    // Exactly one source must be provided.
    if (!productId && !customDesignId) {
      return res.status(400).json({
        success: false,
        message:
          "productId or customDesignId is required",
      });
    }

    if (productId && customDesignId) {
      return res.status(400).json({
        success: false,
        message:
          "Send only one: productId OR customDesignId",
      });
    }

    const qty = parsePositiveInteger(quantity);

    if (!qty) {
      return res.status(400).json({
        success: false,
        message:
          "quantity must be a positive integer",
      });
    }

    const normalizedSize =
      normalizeString(selectedSize);

    const normalizedColor =
      normalizeString(selectedColor);

    const cart = await getOrCreateCart(userId);

    // ------------------------------------------------
    // CASE A: NORMAL PRODUCT
    // ------------------------------------------------

    if (productId) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid productId",
        });
      }

      const product = await Product.findOne({
        _id: productId,
        status: "active",
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found or inactive",
        });
      }

      // Validate selected size.
      const sizeResult = findSize(
        product,
        normalizedSize
      );

      if (!sizeResult.valid) {
        return res.status(400).json({
          success: false,
          message: sizeResult.message,
        });
      }

      // Validate selected color.
      const colorResult = findColor(
        product,
        normalizedColor
      );

      if (!colorResult.valid) {
        return res.status(400).json({
          success: false,
          message: colorResult.message,
        });
      }

      // Validate stock.
      if (sizeResult.entry) {
        if (
          Number(sizeResult.entry.stock || 0) <
          qty
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock for "${product.name}" in size "${sizeResult.entry.size}"`,
          });
        }
      } else if (
        Number(product.stock || 0) < qty
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for "${product.name}"`,
        });
      }

      // Merge same product + variant.
      const existingIndex = cart.items.findIndex(
        (item) =>
          item.productId?.toString() ===
            productId &&
          !item.customDesignId &&
          !item.outfitId &&
          normalizeString(item.selectedSize) ===
            normalizedSize &&
          normalizeString(item.selectedColor) ===
            normalizedColor
      );

      if (existingIndex >= 0) {
        const existingQty =
          Number(cart.items[existingIndex].quantity);

        const finalQty = existingQty + qty;

        // Revalidate total desired quantity.
        if (sizeResult.entry) {
          if (
            Number(sizeResult.entry.stock || 0) <
            finalQty
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Insufficient stock for "${product.name}" in size "${sizeResult.entry.size}"`,
            });
          }
        } else if (
          Number(product.stock || 0) <
          finalQty
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock for "${product.name}"`,
          });
        }

        cart.items[existingIndex].quantity =
          finalQty;
      } else {
        cart.items.push({
          productId: product._id,
          quantity: qty,
          selectedSize: normalizedSize,
          selectedColor: normalizedColor,
        });
      }

      await cart.save();

      const populated =
        await getPopulatedCart(userId);

      return res.status(201).json({
        success: true,
        data: { cart: populated },
      });
    }

    // ------------------------------------------------
    // CASE B: CUSTOM DESIGN
    // ------------------------------------------------

    if (!isValidObjectId(customDesignId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customDesignId",
      });
    }

    const design =
      await CustomDesign.findOne({
        _id: customDesignId,
        userId,
        status: "active",
      }).populate(
        "baseProductId",
        "name price images stock status sizes colors type gender isCustomizable"
      );

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Custom design not found",
      });
    }

    const baseProduct =
      design.baseProductId;

    if (
      !baseProduct ||
      baseProduct.status !== "active" ||
      baseProduct.isCustomizable !== true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Base product for this custom design is no longer available",
      });
    }

    // Current CustomDesign doesn't store a
    // selected size/color independently.
    // Therefore we reject arbitrary variant data
    // instead of silently storing it.
    if (normalizedSize || normalizedColor) {
      return res.status(400).json({
        success: false,
        message:
          "Custom design does not accept manual size or color overrides at this stage",
      });
    }

    // Validate design/base-product stock.
    if (
      Array.isArray(baseProduct.sizes) &&
      baseProduct.sizes.length > 0
    ) {
      const totalSizeStock =
        baseProduct.sizes.reduce(
          (sum, sizeEntry) =>
            sum +
            Number(sizeEntry.stock || 0),
          0
        );

      const existingIndex =
        cart.items.findIndex(
          (item) =>
            item.customDesignId?.toString() ===
              customDesignId &&
            !item.productId &&
            !item.outfitId
        );

      const existingQty =
        existingIndex >= 0
          ? Number(
              cart.items[existingIndex].quantity
            )
          : 0;

      if (totalSizeStock < existingQty + qty) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for custom design "${design.title || baseProduct.name}"`,
        });
      }
    } else {
      const existingIndex =
        cart.items.findIndex(
          (item) =>
            item.customDesignId?.toString() ===
              customDesignId &&
            !item.productId &&
            !item.outfitId
        );

      const existingQty =
        existingIndex >= 0
          ? Number(
              cart.items[existingIndex].quantity
            )
          : 0;

      if (
        Number(baseProduct.stock || 0) <
        existingQty + qty
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for custom design "${design.title || baseProduct.name}"`,
        });
      }
    }

    const existingIndex =
      cart.items.findIndex(
        (item) =>
          item.customDesignId?.toString() ===
            customDesignId &&
          !item.productId &&
          !item.outfitId
      );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity +=
        qty;
    } else {
      cart.items.push({
        customDesignId:
          design._id,
        quantity: qty,
      });
    }

    await cart.save();

    const populated =
      await getPopulatedCart(userId);

    return res.status(201).json({
      success: true,
      data: { cart: populated },
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------
// UPDATE CART ITEM
// --------------------------------------------------

exports.updateCartItem = async (
  req,
  res,
  next
) => {
  try {
    const { itemId } = req.params;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID",
      });
    }

    const qty = parsePositiveInteger(
      req.body.quantity
    );

    if (!qty) {
      return res.status(400).json({
        success: false,
        message:
          "quantity must be a positive integer",
      });
    }

    // getOrCreateCart also backfills legacy
    // cart-item IDs before locating the item.
    const cart = await getOrCreateCart(
      req.user.userId
    );

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // ----------------------------------------------
    // NORMAL PRODUCT
    // ----------------------------------------------

    if (item.productId) {
      const product =
        await Product.findOne({
          _id: item.productId,
          status: "active",
        });

      if (!product) {
        return res.status(400).json({
          success: false,
          message:
            "Product is no longer available",
        });
      }

      const sizeResult = findSize(
        product,
        normalizeString(item.selectedSize)
      );

      if (!sizeResult.valid) {
        return res.status(400).json({
          success: false,
          message: sizeResult.message,
        });
      }

      const colorResult = findColor(
        product,
        normalizeString(item.selectedColor)
      );

      if (!colorResult.valid) {
        return res.status(400).json({
          success: false,
          message: colorResult.message,
        });
      }

      if (sizeResult.entry) {
        if (
          Number(sizeResult.entry.stock || 0) <
          qty
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock for "${product.name}" in size "${sizeResult.entry.size}"`,
          });
        }
      } else if (
        Number(product.stock || 0) < qty
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for "${product.name}"`,
        });
      }
    }

    // ----------------------------------------------
    // CUSTOM DESIGN
    // ----------------------------------------------

    if (item.customDesignId) {
      const design =
        await CustomDesign.findOne({
          _id: item.customDesignId,
          userId: req.user.userId,
          status: "active",
        }).populate(
          "baseProductId",
          "name stock status sizes isCustomizable"
        );

      if (
        !design ||
        !design.baseProductId ||
        design.baseProductId.status !==
          "active" ||
        design.baseProductId.isCustomizable !==
          true
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Custom design is no longer available",
        });
      }

      const baseProduct =
        design.baseProductId;

      if (
        Array.isArray(baseProduct.sizes) &&
        baseProduct.sizes.length > 0
      ) {
        const totalSizeStock =
          baseProduct.sizes.reduce(
            (sum, entry) =>
              sum +
              Number(entry.stock || 0),
            0
          );

        if (totalSizeStock < qty) {
          return res.status(400).json({
            success: false,
            message:
              "Insufficient stock for custom design",
          });
        }
      } else if (
        Number(baseProduct.stock || 0) <
        qty
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient stock for custom design",
        });
      }
    }

    item.quantity = qty;

    await cart.save();

    const populated =
      await getPopulatedCart(
        req.user.userId
      );

    return res.json({
      success: true,
      data: { cart: populated },
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------
// REMOVE CART ITEM
// --------------------------------------------------

exports.removeCartItem = async (
  req,
  res,
  next
) => {
  try {
    const { itemId } = req.params;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID",
      });
    }

    // getOrCreateCart also backfills legacy
    // cart-item IDs before locating the item.
    const cart = await getOrCreateCart(
      req.user.userId
    );

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    item.deleteOne();

    await cart.save();

    const populated =
      await getPopulatedCart(
        req.user.userId
      );

    return res.json({
      success: true,
      data: { cart: populated },
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------
// ADD COMPLETE OUTFIT TO CART
// --------------------------------------------------

exports.addOutfitToCart = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const {
      outfitId,
      overrides = {},
    } = req.body;

    if (!outfitId) {
      return res.status(400).json({
        success: false,
        message: "outfitId is required",
      });
    }

    if (!isValidObjectId(outfitId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfitId",
      });
    }

    if (
      !overrides ||
      typeof overrides !== "object" ||
      Array.isArray(overrides)
    ) {
      return res.status(400).json({
        success: false,
        message: "overrides must be an object",
      });
    }

    const outfit =
      await Outfit.findOne({
        _id: outfitId,
        userId,
        status: "active",
      }).lean();

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: "Outfit not found",
      });
    }

    if (
      !Array.isArray(outfit.items) ||
      outfit.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Outfit has no items",
      });
    }

    const productIds = outfit.items.map(
      (item) => item.productId
    );

    const products =
      await Product.find({
        _id: { $in: productIds },
        status: "active",
      }).lean();

    const productMap = new Map(
      products.map((product) => [
        String(product._id),
        product,
      ])
    );

    // Every saved outfit product must
    // still exist and be active.
    for (const item of outfit.items) {
      const product =
        productMap.get(
          String(item.productId)
        );

      if (!product) {
        return res.status(400).json({
          success: false,
          message:
            "One or more outfit products are no longer available",
        });
      }

      if (
        String(product.type) !==
        String(item.role)
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Outfit item role does not match product type for "${product.name}"`,
        });
      }

      const override =
        overrides[String(product._id)] || {};

      const selectedSize =
        normalizeString(
          override.size ??
            item.defaultSize ??
            ""
        );

      const selectedColor =
        normalizeString(
          override.color ??
            item.defaultColor ??
            ""
        );

      const sizeResult = findSize(
        product,
        selectedSize
      );

      if (!sizeResult.valid) {
        return res.status(400).json({
          success: false,
          message: sizeResult.message,
        });
      }

      const colorResult = findColor(
        product,
        selectedColor
      );

      if (!colorResult.valid) {
        return res.status(400).json({
          success: false,
          message: colorResult.message,
        });
      }

      if (sizeResult.entry) {
        if (
          Number(sizeResult.entry.stock || 0) <
          1
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Out of stock for "${product.name}" in size "${sizeResult.entry.size}"`,
          });
        }
      } else if (
        Number(product.stock || 0) < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            `"${product.name}" is out of stock`,
        });
      }
    }

    const cart = await getOrCreateCart(userId);

    for (const item of outfit.items) {
      const productId =
        String(item.productId);

      const product =
        productMap.get(productId);

      const override =
        overrides[productId] || {};

      const selectedSize =
        normalizeString(
          override.size ??
            item.defaultSize ??
            ""
        );

      const selectedColor =
        normalizeString(
          override.color ??
            item.defaultColor ??
            ""
        );

      const existingIndex =
        cart.items.findIndex(
          (cartItem) =>
            cartItem.productId?.toString() ===
              productId &&
            !cartItem.customDesignId &&
            cartItem.outfitId?.toString() ===
              String(outfitId) &&
            normalizeString(
              cartItem.selectedSize
            ) === selectedSize &&
            normalizeString(
              cartItem.selectedColor
            ) === selectedColor
        );

      if (existingIndex >= 0) {
        const newQty =
          Number(
            cart.items[existingIndex]
              .quantity
          ) + 1;

        const sizeResult = findSize(
          product,
          selectedSize
        );

        if (sizeResult.entry) {
          if (
            Number(sizeResult.entry.stock || 0) <
            newQty
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Insufficient stock for "${product.name}"`,
            });
          }
        } else if (
          Number(product.stock || 0) <
          newQty
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock for "${product.name}"`,
          });
        }

        cart.items[existingIndex].quantity =
          newQty;
      } else {
        cart.items.push({
          productId: product._id,
          quantity: 1,
          selectedSize,
          selectedColor,
          outfitId: outfit._id,
        });
      }
    }

    await cart.save();

    const populated =
      await getPopulatedCart(userId);

    return res.status(201).json({
      success: true,
      data: { cart: populated },
    });
  } catch (err) {
    next(err);
  }
};