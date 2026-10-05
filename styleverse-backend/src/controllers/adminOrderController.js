const mongoose = require("mongoose");
const Order = require("../models/Order");

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
];

const buildStatusTimestampUpdate = (status) => {
  const update = {};

  if (status === "confirmed") {
    update.confirmedAt = new Date();
  }

  if (status === "shipped") {
    update.shippedAt = new Date();
  }

  if (status === "delivered") {
    update.deliveredAt = new Date();
  }

  if (status === "cancelled") {
    update.cancelledAt = new Date();
  }

  return update;
};

exports.listOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const query = {};

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      query.status = status;
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .populate("userId", "name email")
        .lean(),

      Order.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const {
      status,
      trackingNumber,
      carrier,
      estimatedDelivery,
    } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;

    const timestampUpdate =
      buildStatusTimestampUpdate(status);

    if (timestampUpdate.confirmedAt) {
      order.confirmedAt = timestampUpdate.confirmedAt;
    }

    if (timestampUpdate.shippedAt) {
      order.shippedAt = timestampUpdate.shippedAt;
    }

    if (timestampUpdate.deliveredAt) {
      order.deliveredAt = timestampUpdate.deliveredAt;
    }

    if (timestampUpdate.cancelledAt) {
      order.cancelledAt = timestampUpdate.cancelledAt;
    }

    if (trackingNumber !== undefined) {
      order.trackingNumber =
        trackingNumber === null
          ? null
          : String(trackingNumber).trim() || null;
    }

    if (carrier !== undefined) {
      order.carrier =
        carrier === null
          ? null
          : String(carrier).trim() || null;
    }

    if (estimatedDelivery !== undefined) {
      if (
        estimatedDelivery === null ||
        estimatedDelivery === ""
      ) {
        order.estimatedDelivery = null;
      } else {
        const parsedDate = new Date(estimatedDelivery);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid estimated delivery date",
          });
        }

        order.estimatedDelivery = parsedDate;
      }
    }

    await order.save();

    const updated = await Order.findById(order._id)
      .populate("userId", "name email")
      .lean();

    return res.json({
      success: true,
      message: "Order updated successfully",
      data: {
        order: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};