const Joi = require("joi");

const passwordSchema = Joi.string().min(6).max(128).required();

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: passwordSchema,
});

exports.signupSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().required(),
  password: passwordSchema,
});

// Send email verification OTP
exports.sendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

// Verify email OTP
exports.verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().pattern(/^\d{6}$/).required(),
});

// Forgot password
exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

// Reset password
exports.resetPasswordSchema = Joi.object({
  token: Joi.string().min(10).required(),
  newPassword: passwordSchema,
});

// Basic profile update
exports.updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
});