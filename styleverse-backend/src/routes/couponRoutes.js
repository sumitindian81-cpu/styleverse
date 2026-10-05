const express = require("express");

const router = express.Router();

const couponController = require("../controllers/couponController");
const authMiddleware = require("../middlewares/authMiddleware");

/*
 * Apply coupon to logged-in user's cart
 */
router.post(
  "/apply",
  authMiddleware,
  couponController.applyCoupon
);

/*
 * Remove applied coupon from logged-in user's cart
 */
router.delete(
  "/remove",
  authMiddleware,
  couponController.removeCoupon
);

module.exports = router;