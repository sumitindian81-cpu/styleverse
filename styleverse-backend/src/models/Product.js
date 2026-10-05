const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },

    description: { type: String, required: true },

    brand: { type: String, default: '', trim: true },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    price: { type: Number, required: true },
    mrp: { type: Number, default: null },
    discountPercent: { type: Number, default: 0 },

    stock: { type: Number, required: true, min: 0 },

    sizes: [
      {
        size: { type: String },      // "S","M","L"
        stock: { type: Number, min: 0, default: 0 },
      },
    ],

    colors: [
      {
        name: String,                // "Red"
        code: String,                // "#FF0000"
      },
    ],

    gender: {
      type: String,
      enum: ['men', 'women', 'kids', 'unisex'],
      default: 'unisex',
      index: true,
    },

    type: {
      type: String,
      enum: ['top', 'bottom', 'dress', 'shoes', 'bag', 'jewelry', 'accessory', 'outerwear'],
      required: true,
      index: true,
    },

    material: { type: String, default: '' },
    pattern: { type: String, default: '' },

    images: [
      {
        url: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      },
    ],

    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
        isCustomizable: { type: Boolean, default: false, index: true },

    //status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// Helpful indexes for search & filtering
ProductSchema.index({ name: 'text', description: 'text', brand: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
