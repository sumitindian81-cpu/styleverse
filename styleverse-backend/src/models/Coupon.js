const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },

    discountType: { type: String, enum: ["percent", "flat"], required: true },
    discountValue: { type: Number, required: true },

    minCartAmount: { type: Number, default: 0 },
    maxDiscountCap: { type: Number, default: null }, // optional cap for percent

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    usageLimit: { type: Number, default: null }, // total usage
    usedCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", CouponSchema);