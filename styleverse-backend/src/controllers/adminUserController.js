const User = require("../models/User");

exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("name email role isEmailVerified isBlocked createdAt")
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { items, total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isBlocked must be boolean" });
    }

    // ✅ Safety: admin user ko block/unblock change nahi karne dena
    const target = await User.findById(id).select("role").lean();
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (target.role === "admin") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot block admin user" });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { isBlocked },
      { new: true }
    )
      .select("name email role isEmailVerified isBlocked createdAt")
      .lean();

    res.json({ success: true, data: { user: updated } });
  } catch (err) {
    next(err);
  }
};