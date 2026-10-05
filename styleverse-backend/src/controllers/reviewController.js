const mongoose = require("mongoose");
const Review = require("../models/Review");
const Product = require("../models/Product");

async function recalcProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const avg = stats[0]?.avg ? Number(stats[0].avg.toFixed(2)) : 0;
  const count = stats[0]?.count || 0;

  // ✅ IMPORTANT: update Product fields that exist in your Product.js
  await Product.findByIdAndUpdate(productId, {
    averageRating: avg,
    totalReviews: count,
  });

  return { averageRating: avg, totalReviews: count };
}

// POST /api/products/:id/reviews (auth)
exports.upsertReview = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.user.userId;

    const { rating, comment = "" } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, message: "rating is required" });
    }
    const r = Number(rating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, message: "rating must be between 1 and 5" });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== "active") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const review = await Review.findOneAndUpdate(
      { userId, productId },
      { rating: r, comment: String(comment).trim() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const ratingStats = await recalcProductRating(productId);

    return res.status(201).json({ success: true, data: { review, ratingStats } });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id/reviews (public)
exports.getProductReviews = async (req, res, next) => {
  try {
    const productId = req.params.id;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Review.find({ productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name")
        .lean(),
      Review.countDocuments({ productId }),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};