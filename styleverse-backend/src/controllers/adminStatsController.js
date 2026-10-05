const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");

exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ status: { $ne: "deleted" } });

    const totalOrders = await Order.countDocuments();

    // revenue: only paid or COD delivered? (MVP: sum of order.totalAmount if exists)
    // Adjust field name as per your Order schema
    const revenueAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" }, // <-- if your field is different, change it
        },
      },
    ]);

    const totalRevenue = revenueAgg?.[0]?.totalRevenue || 0;

    const productsCount = await Product.countDocuments({ status: "active" });

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue,
        productsCount,
      },
    });
  } catch (err) {
    next(err);
  }
};