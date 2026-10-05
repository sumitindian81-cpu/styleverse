const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const adminOrderController = require("../controllers/adminOrderController");

// GET /api/admin/orders
router.get("/orders", authMiddleware, adminMiddleware, adminOrderController.listOrders);

// PATCH /api/admin/orders/:id
router.patch("/orders/:id", authMiddleware, adminMiddleware, adminOrderController.updateOrderStatus);

module.exports = router;
