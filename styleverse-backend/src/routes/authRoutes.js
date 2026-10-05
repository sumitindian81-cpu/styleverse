const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");

const { authLimiter, strictLimiter } = require("../middlewares/rateLimiter");

const {
  loginSchema,
  signupSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} = require("../validators/authValidators");

// -------------------------
// PUBLIC AUTH ROUTES
// -------------------------

// Signup
router.post(
  "/signup",
  authLimiter,
  validate(signupSchema),
  authController.signup
);

// Send / resend email verification OTP
router.post(
  "/send-otp",
  strictLimiter,
  validate(sendOtpSchema),
  authController.sendOtp
);

// Verify email OTP
router.post(
  "/verify-otp",
  strictLimiter,
  validate(verifyOtpSchema),
  authController.verifyOtp
);

// Login
router.post(
  "/login",
  strictLimiter,
  validate(loginSchema),
  authController.login
);

// Forgot password
router.post(
  "/forgot-password",
  strictLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// Reset password
router.post(
  "/reset-password",
  strictLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

// -------------------------
// PROTECTED AUTH ROUTES
// -------------------------

// Current user
router.get(
  "/me",
  authMiddleware,
  authController.getMe
);

// Update current user's profile
router.patch(
  "/me",
  authMiddleware,
  validate(updateProfileSchema),
  authController.updateProfile
);

module.exports = router;
