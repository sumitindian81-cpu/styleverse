const express = require("express");

const router = express.Router();

const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middlewares/authMiddleware");

/*
 * Razorpay Webhook
 *
 * Raw body is already configured in app.js
 * before express.json().
 */
router.post(
  "/razorpay/webhook",
  paymentController.handleRazorpayWebhook
);

/*
 * Create Razorpay order
 */
router.post(
  "/razorpay/create-order",
  authMiddleware,
  paymentController.createRazorpayOrder
);

/*
 * Verify Razorpay payment
 */
router.post(
  "/razorpay/verify",
  authMiddleware,
  paymentController.verifyRazorpayPaymentAndCreateOrder
);

module.exports = router;