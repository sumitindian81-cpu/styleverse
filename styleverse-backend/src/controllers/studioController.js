const Product = require("../models/Product");

// GET /api/studio/base-items?type=top
exports.getBaseItems = async (req, res, next) => {
  try {
    const { type } = req.query;

    const query = {
      status: "active",
      isCustomizable: true,
    };
    if (type) query.type = type;

    const items = await Product.find(query)
      .sort({ createdAt: -1 })
      .select("name price images type gender brand slug")
      .lean();

    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};