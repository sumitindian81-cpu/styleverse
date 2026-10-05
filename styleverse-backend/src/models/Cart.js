const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },

    // future: CustomDesign support
    customDesignId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomDesign' },

    quantity: { type: Number, required: true, min: 1, default: 1 },

    selectedSize: { type: String, default: '' },
    selectedColor: { type: String, default: '' },

    outfitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit' },
  },
  { _id: true }
);

const CartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    items: [CartItemSchema],
    appliedCouponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', CartSchema);