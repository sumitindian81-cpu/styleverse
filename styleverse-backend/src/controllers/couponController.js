const mongoose = require("mongoose");

const Coupon = require("../models/Coupon");
const Cart = require("../models/Cart");

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function isDateValid(coupon) {
  const now = new Date();

  if (
    coupon.startDate &&
    now < coupon.startDate
  ) {
    return false;
  }

  if (
    coupon.endDate &&
    now > coupon.endDate
  ) {
    return false;
  }

  return true;
}

function validateCouponPayload(payload, isUpdate = false) {
  const data = {
    ...payload,
  };

  if (data.code !== undefined) {
    data.code = normalizeCode(
      data.code
    );

    if (!data.code) {
      throw new Error(
        "Coupon code is required"
      );
    }

    if (
      !/^[A-Z0-9_-]{3,50}$/.test(
        data.code
      )
    ) {
      throw new Error(
        "Coupon code must be 3-50 characters and contain only letters, numbers, _ or -"
      );
    }
  } else if (!isUpdate) {
    throw new Error(
      "Coupon code is required"
    );
  }

  if (data.discountType !== undefined) {
    if (
      !["percent", "flat"].includes(
        data.discountType
      )
    ) {
      throw new Error(
        "discountType must be percent or flat"
      );
    }
  } else if (!isUpdate) {
    throw new Error(
      "discountType is required"
    );
  }

  if (
    data.discountValue !== undefined
  ) {
    const value = Number(
      data.discountValue
    );

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        "discountValue must be a non-negative number"
      );
    }

    data.discountValue = value;
  } else if (!isUpdate) {
    throw new Error(
      "discountValue is required"
    );
  }

  if (
    data.discountType === "percent"
  ) {
    if (
      Number(data.discountValue) > 100
    ) {
      throw new Error(
        "Percentage discount cannot exceed 100"
      );
    }
  }

  if (
    data.minCartAmount !== undefined
  ) {
    const value = Number(
      data.minCartAmount
    );

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        "minCartAmount must be a non-negative number"
      );
    }

    data.minCartAmount = value;
  }

  if (
    data.maxDiscountCap !== undefined &&
    data.maxDiscountCap !== null
  ) {
    const value = Number(
      data.maxDiscountCap
    );

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        "maxDiscountCap must be a non-negative number"
      );
    }

    data.maxDiscountCap = value;
  }

  if (
    data.startDate !== undefined &&
    data.startDate !== null &&
    data.startDate !== ""
  ) {
    const date = new Date(
      data.startDate
    );

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        "Invalid startDate"
      );
    }

    data.startDate = date;
  }

  if (
    data.endDate !== undefined &&
    data.endDate !== null &&
    data.endDate !== ""
  ) {
    const date = new Date(
      data.endDate
    );

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        "Invalid endDate"
      );
    }

    data.endDate = date;
  }

  if (
    data.startDate &&
    data.endDate &&
    data.startDate > data.endDate
  ) {
    throw new Error(
      "startDate cannot be later than endDate"
    );
  }

  if (
    data.usageLimit !== undefined &&
    data.usageLimit !== null
  ) {
    const value = Number(
      data.usageLimit
    );

    if (
      !Number.isInteger(value) ||
      value < 1
    ) {
      throw new Error(
        "usageLimit must be a positive integer"
      );
    }

    data.usageLimit = value;
  }

  if (
    data.usedCount !== undefined
  ) {
    const value = Number(
      data.usedCount
    );

    if (
      !Number.isInteger(value) ||
      value < 0
    ) {
      throw new Error(
        "usedCount must be a non-negative integer"
      );
    }

    data.usedCount = value;
  }

  if (
    data.isActive !== undefined
  ) {
    data.isActive = Boolean(
      data.isActive
    );
  }

  return data;
}

function pickCouponAdminFields(body) {
  const allowedFields = [
    "code",
    "discountType",
    "discountValue",
    "minCartAmount",
    "maxDiscountCap",
    "startDate",
    "endDate",
    "usageLimit",
    "usedCount",
    "isActive",
  ];

  const data = {};

  for (const field of allowedFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        field
      )
    ) {
      data[field] = body[field];
    }
  }

  return data;
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
    lowerMessage.includes("coupon") ||
    lowerMessage.includes("cart") ||
    lowerMessage.includes("code") ||
    lowerMessage.includes("discount") ||
    lowerMessage.includes("date") ||
    lowerMessage.includes("usage")
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
 * USER: APPLY COUPON
 * POST /api/coupons/apply
 * =====================================================
 */
exports.applyCoupon = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId;

    const code = normalizeCode(
      req.body?.code
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message:
          "code is required",
      });
    }

    /*
     * Find coupon.
     */
    const coupon =
      await Coupon.findOne({
        code,
      }).lean();

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message:
          "Invalid coupon code",
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon is inactive",
      });
    }

    if (!isDateValid(coupon)) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon is expired or not started yet",
      });
    }

    if (
      coupon.usageLimit != null &&
      Number(coupon.usedCount) >=
        Number(coupon.usageLimit)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon usage limit reached",
      });
    }

    /*
     * Ensure cart exists and is not empty.
     */
    const cart =
      await Cart.findOne({
        userId,
      });

    if (
      !cart ||
      !Array.isArray(cart.items) ||
      cart.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cart is empty",
      });
    }

    /*
     * Save coupon on cart.
     *
     * Actual subtotal/discount/final total
     * is calculated by checkoutService.
     */
    cart.appliedCouponId =
      coupon._id;

    await cart.save();

    /*
     * Import here to avoid circular startup
     * dependencies.
     */
    const {
      calculateCheckout,
    } = require("../services/checkoutService");

    /*
     * Recalculate complete checkout after
     * applying the coupon.
     *
     * This ensures minimum amount and all
     * server-side cart validations pass.
     */
    let checkout;

    try {
      checkout =
        await calculateCheckout(
          userId
        );
    } catch (checkoutError) {
      /*
       * Coupon is not applicable:
       * remove it from cart again.
       */
      await Cart.updateOne(
        {
          _id: cart._id,
          userId,
        },
        {
          $set: {
            appliedCouponId:
              null,
          },
        }
      );

      return sendError(
        res,
        checkoutError,
        400
      );
    }

    return res.json({
      success: true,
      message:
        "Coupon applied successfully",
      data: {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          discountType:
            coupon.discountType,
          discountValue:
            coupon.discountValue,
          minCartAmount:
            coupon.minCartAmount || 0,
          maxDiscountCap:
            coupon.maxDiscountCap ??
            null,
        },

        subtotal:
          checkout.subtotal,

        discountAmount:
          checkout.discount,

        shippingFee:
          checkout.shippingFee,

        totalAfterDiscount:
          checkout.totalAmount,
      },
    });
  } catch (error) {
    console.error(
      "applyCoupon error:",
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
 * USER: REMOVE COUPON
 * DELETE /api/coupons/remove
 * =====================================================
 */
exports.removeCoupon = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized",
      });
    }

    const cart =
      await Cart.findOne({
        userId,
      });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message:
          "Cart not found",
      });
    }

    if (!cart.appliedCouponId) {
      return res.status(200).json({
        success: true,
        message:
          "No coupon applied",
      });
    }

    cart.appliedCouponId = null;

    await cart.save();

    return res.json({
      success: true,
      message:
        "Coupon removed successfully",
    });
  } catch (error) {
    console.error(
      "removeCoupon error:",
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
 * ADMIN: CREATE COUPON
 * =====================================================
 */
exports.createCoupon = async (
  req,
  res
) => {
  try {
    const rawData =
      pickCouponAdminFields(
        req.body || {}
      );

    const payload =
      validateCouponPayload(
        rawData,
        false
      );

    /*
     * Do not allow clients to manually
     * create arbitrary usedCount.
     */
    payload.usedCount = 0;

    const coupon =
      await Coupon.create(
        payload
      );

    return res.status(201).json({
      success: true,
      data: {
        coupon,
      },
    });
  } catch (error) {
    console.error(
      "createCoupon error:",
      error.message
    );

    return sendError(
      res,
      error,
      400
    );
  }
};

/*
 * =====================================================
 * ADMIN: GET ALL COUPONS
 * =====================================================
 */
exports.getAllCoupons = async (
  req,
  res
) => {
  try {
    const items =
      await Coupon.find()
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      success: true,
      data: {
        items,
      },
    });
  } catch (error) {
    console.error(
      "getAllCoupons error:",
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
 * ADMIN: UPDATE COUPON
 * =====================================================
 */
exports.updateCoupon = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid coupon id",
      });
    }

    const rawData =
      pickCouponAdminFields(
        req.body || {}
      );

    if (
      Object.keys(rawData).length ===
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid coupon fields provided",
      });
    }

    /*
     * Get current coupon first so conditional
     * validation works correctly for partial
     * updates.
     */
    const existingCoupon =
      await Coupon.findById(
        id
      ).lean();

    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon not found",
      });
    }

    const mergedData = {
      ...existingCoupon,
      ...rawData,
    };

    const validated =
      validateCouponPayload(
        mergedData,
        true
      );

    /*
     * Keep only fields that were actually
     * supplied by admin, except normalized
     * dependent values.
     */
    const updateData = {};

    for (const field of Object.keys(
      rawData
    )) {
      updateData[field] =
        validated[field];
    }

    /*
     * If discountType changes, validate
     * the resulting discountValue.
     */
    if (
      rawData.discountType !==
        undefined ||
      rawData.discountValue !==
        undefined
    ) {
      updateData.discountType =
        validated.discountType;

      updateData.discountValue =
        validated.discountValue;
    }

    /*
     * If dates are supplied, use normalized
     * Date objects.
     */
    if (
      rawData.startDate !==
      undefined
    ) {
      updateData.startDate =
        validated.startDate;
    }

    if (
      rawData.endDate !==
      undefined
    ) {
      updateData.endDate =
        validated.endDate;
    }

    /*
     * Normalize code.
     */
    if (
      rawData.code !==
      undefined
    ) {
      updateData.code =
        validated.code;
    }

    const coupon =
      await Coupon.findByIdAndUpdate(
        id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon not found",
      });
    }

    return res.json({
      success: true,
      data: {
        coupon,
      },
    });
  } catch (error) {
    console.error(
      "updateCoupon error:",
      error.message
    );

    return sendError(
      res,
      error,
      400
    );
  }
};

/*
 * =====================================================
 * ADMIN: DELETE COUPON
 * =====================================================
 */
exports.deleteCoupon = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid coupon id",
      });
    }

    const coupon =
      await Coupon.findByIdAndDelete(
        id
      );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon not found",
      });
    }

    /*
     * If users still have this coupon
     * attached to their cart, clear it.
     */
    await Cart.updateMany(
      {
        appliedCouponId:
          coupon._id,
      },
      {
        $set: {
          appliedCouponId:
            null,
        },
      }
    );

    return res.json({
      success: true,
      data: {
        deleted: true,
      },
    });
  } catch (error) {
    console.error(
      "deleteCoupon error:",
      error.message
    );

    return sendError(
      res,
      error
    );
  }
};