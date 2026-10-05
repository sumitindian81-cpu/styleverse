const express = require("express");
const router = express.Router();

const couponController = require("../controllers/couponController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

router.post("/", authMiddleware, adminMiddleware, couponController.createCoupon);
router.get("/", authMiddleware, adminMiddleware, couponController.getAllCoupons);
router.patch("/:id", authMiddleware, adminMiddleware, couponController.updateCoupon);
router.delete("/:id", authMiddleware, adminMiddleware, couponController.deleteCoupon);

module.exports = router;