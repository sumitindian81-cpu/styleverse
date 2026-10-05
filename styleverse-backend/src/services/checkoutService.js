const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const CustomDesign = require("../models/CustomDesign");
const Coupon = require("../models/Coupon");

const SHIPPING_FEE = 0;

function createCheckoutError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function isCouponDateValid(coupon) {
  const now = new Date();

  if (coupon.startDate && now < coupon.startDate) return false;
  if (coupon.endDate && now > coupon.endDate) return false;

  return true;
}

function calculateCouponDiscount(coupon, subtotal) {
  let discount = 0;

  if (coupon.discountType === "percent") {
    discount = (subtotal * coupon.discountValue) / 100;

    if (coupon.maxDiscountCap != null) {
      discount = Math.min(discount, coupon.maxDiscountCap);
    }
  } else if (coupon.discountType === "flat") {
    discount = coupon.discountValue;
  }

  discount = Math.max(0, Math.min(discount, subtotal));

  return Number(discount.toFixed(2));
}

function validateQuantity(quantity) {
  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 1) {
    throw createCheckoutError("Quantity must be a positive integer");
  }

  return qty;
}

function findSizeEntry(product, selectedSize) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  if (sizes.length === 0) {
    return null;
  }

  const normalizedSize = String(selectedSize || "").trim();

  if (!normalizedSize) {
    throw createCheckoutError(
      `Please select a size for "${product.name}"`
    );
  }

  const sizeEntry = sizes.find(
    (entry) =>
      String(entry.size || "").trim().toLowerCase() ===
      normalizedSize.toLowerCase()
  );

  if (!sizeEntry) {
    throw createCheckoutError(
      `Selected size is not available for "${product.name}"`
    );
  }

  return sizeEntry;
}

function validateSelectedColor(product, selectedColor) {
  const colors = Array.isArray(product.colors) ? product.colors : [];

  if (colors.length === 0) {
    return null;
  }

  const normalizedColor = String(selectedColor || "").trim();

  if (!normalizedColor) {
    throw createCheckoutError(
      `Please select a color for "${product.name}"`
    );
  }

  const colorEntry = colors.find(
    (entry) =>
      String(entry.name || "").trim().toLowerCase() ===
      normalizedColor.toLowerCase()
  );

  if (!colorEntry) {
    throw createCheckoutError(
      `Selected color is not available for "${product.name}"`
    );
  }

  return colorEntry;
}

function validateProductAvailability(
  product,
  quantity,
  selectedSize = "",
  selectedColor = ""
) {
  if (!product || product.status !== "active") {
    throw createCheckoutError(
      "Product is no longer available"
    );
  }

  if (
    !Number.isFinite(Number(product.price)) ||
    Number(product.price) < 0
  ) {
    throw createCheckoutError(
      `Invalid price for "${product.name}"`
    );
  }

  if (selectedSize) {
    const sizeEntry = findSizeEntry(product, selectedSize);

    if (Number(sizeEntry.stock || 0) < quantity) {
      throw createCheckoutError(
        `Insufficient stock for "${product.name}" in size "${sizeEntry.size}"`
      );
    }
  } else {
    const sizes = Array.isArray(product.sizes)
      ? product.sizes
      : [];

    // If the product has size variants, a size must be selected.
    if (sizes.length > 0) {
      throw createCheckoutError(
        `Please select a size for "${product.name}"`
      );
    }
  }

  if (selectedColor) {
    validateSelectedColor(product, selectedColor);
  } else if (Array.isArray(product.colors) && product.colors.length > 0) {
    throw createCheckoutError(
      `Please select a color for "${product.name}"`
    );
  }

  if (
    selectedSize &&
    Array.isArray(product.sizes) &&
    product.sizes.length > 0
  ) {
    const sizeEntry = findSizeEntry(product, selectedSize);

    if (Number(sizeEntry.stock || 0) < quantity) {
      throw createCheckoutError(
        `Insufficient stock for "${product.name}" in size "${sizeEntry.size}"`
      );
    }

    return;
  }

  if (Number(product.stock || 0) < quantity) {
    throw createCheckoutError(
      `Insufficient stock for "${product.name}"`
    );
  }
}

async function loadCart(userId) {
  return Cart.findOne({ userId })
    .populate({
      path: "items.productId",
      select:
        "name price images stock status sizes colors type gender slug isCustomizable",
    })
    .populate({
      path: "items.customDesignId",
      select:
        "userId title price previewImageUrl baseItemType attributes baseProductId status",
      populate: {
        path: "baseProductId",
        select:
          "name price images stock status sizes colors type gender isCustomizable",
      },
    })
    .lean();
}

async function getValidCoupon(couponId) {
  if (!couponId) {
    return null;
  }

  if (!isValidObjectId(couponId)) {
    throw createCheckoutError("Invalid applied coupon");
  }

  const coupon = await Coupon.findById(couponId).lean();

  if (!coupon) {
    throw createCheckoutError("Applied coupon no longer exists");
  }

  if (!coupon.isActive) {
    throw createCheckoutError("Applied coupon is inactive");
  }

  if (!isCouponDateValid(coupon)) {
    throw createCheckoutError(
      "Applied coupon is expired or not started yet"
    );
  }

  if (
    coupon.usageLimit != null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throw createCheckoutError(
      "Applied coupon usage limit reached"
    );
  }

  return coupon;
}

async function calculateCheckout(userId) {
  if (!userId || !isValidObjectId(userId)) {
    throw createCheckoutError("Invalid user");
  }

  const cart = await loadCart(userId);

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw createCheckoutError("Cart is empty");
  }

  const items = [];
  let subtotal = 0;

  for (const cartItem of cart.items) {
    const quantity = validateQuantity(cartItem.quantity);

    // ---------------------------------------
    // NORMAL PRODUCT
    // ---------------------------------------
    if (cartItem.productId) {
      const product = cartItem.productId;

      validateProductAvailability(
        product,
        quantity,
        cartItem.selectedSize || "",
        cartItem.selectedColor || ""
      );

      const price = Number(product.price);
      const lineTotal = Number(
        (price * quantity).toFixed(2)
      );

      subtotal += lineTotal;

      items.push({
        productId: product._id,
        customDesignId: undefined,
        outfitId: cartItem.outfitId || undefined,

        name: product.name,

        thumbnail:
          product.images?.find((image) => image.isMain)?.url ||
          product.images?.[0]?.url ||
          "",

        quantity,
        price,

        selectedSize: cartItem.selectedSize || "",
        selectedColor: cartItem.selectedColor || "",
      });

      continue;
    }

    // ---------------------------------------
    // CUSTOM DESIGN
    // ---------------------------------------
    if (cartItem.customDesignId) {
      const design = cartItem.customDesignId;

      if (!design || design.status !== "active") {
        throw createCheckoutError(
          "Cart contains an invalid or inactive custom design"
        );
      }

      if (String(design.userId) !== String(userId)) {
        throw createCheckoutError(
          "You are not allowed to purchase this custom design",
          403
        );
      }

      const baseProduct = design.baseProductId;

      if (
        !baseProduct ||
        baseProduct.status !== "active" ||
        baseProduct.isCustomizable !== true
      ) {
        throw createCheckoutError(
          "The base product for this custom design is no longer available"
        );
      }

      const designPrice = Number(design.price);

      if (
        !Number.isFinite(designPrice) ||
        designPrice < 0
      ) {
        throw createCheckoutError(
          "Invalid custom design price"
        );
      }

      /*
        A custom design currently does not store its own
        selected size/color. Therefore we validate only
        base-product stock at product level when no size
        variants exist.

        Size-based custom designs will be handled through
        the dedicated design-variant flow later.
      */
      if (
        Array.isArray(baseProduct.sizes) &&
        baseProduct.sizes.length > 0
      ) {
        const totalAvailableSizeStock =
          baseProduct.sizes.reduce(
            (sum, entry) =>
              sum + Number(entry.stock || 0),
            0
          );

        if (totalAvailableSizeStock < quantity) {
          throw createCheckoutError(
            `Insufficient stock for custom design "${design.title || baseProduct.name}"`
          );
        }
      } else if (Number(baseProduct.stock || 0) < quantity) {
        throw createCheckoutError(
          `Insufficient stock for custom design "${design.title || baseProduct.name}"`
        );
      }

      const lineTotal = Number(
        (designPrice * quantity).toFixed(2)
      );

      subtotal += lineTotal;

      items.push({
        productId: baseProduct._id,
        customDesignId: design._id,
        outfitId: undefined,

        name: design.title || baseProduct.name,

        thumbnail:
          design.previewImageUrl ||
          baseProduct.images?.find((image) => image.isMain)?.url ||
          baseProduct.images?.[0]?.url ||
          "",

        quantity,
        price: designPrice,

        selectedSize: "",
        selectedColor: "",
      });

      continue;
    }

    throw createCheckoutError(
      "Cart contains an invalid item"
    );
  }

  subtotal = Number(subtotal.toFixed(2));

  // ---------------------------------------
  // COUPON
  // ---------------------------------------
  let coupon = null;
  let discount = 0;

  if (cart.appliedCouponId) {
    coupon = await getValidCoupon(
      cart.appliedCouponId
    );

    if (
      subtotal <
      Number(coupon.minCartAmount || 0)
    ) {
      throw createCheckoutError(
        `Minimum cart amount is ₹${coupon.minCartAmount}`
      );
    }

    discount = calculateCouponDiscount(
      coupon,
      subtotal
    );
  }

  const shippingFee = Number(
    SHIPPING_FEE.toFixed(2)
  );

  const totalAmount = Number(
    (subtotal - discount + shippingFee).toFixed(2)
  );

  if (totalAmount < 0) {
    throw createCheckoutError(
      "Invalid checkout total"
    );
  }

  return {
    cart,
    items,
    subtotal,
    discount,
    shippingFee,
    totalAmount,
    currency: "INR",

    coupon: coupon
      ? {
          id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        }
      : null,
  };
}

module.exports = {
  calculateCheckout,
};