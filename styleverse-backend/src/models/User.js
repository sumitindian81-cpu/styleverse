const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      index: true,
    },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationOtpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerificationOtpAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    emailVerificationOtpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    // Admin can block/unblock users
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Password reset
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // Used to invalidate older JWTs after password changes
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);