const mongoose = require("mongoose");

const PAYMENT_STATUSES = [
  "created",
  "succeeded",
  "failed",
  "refunded",
];

const PAYMENT_METHODS = [
  "card",
  "upi",
  "netbanking",
  "wallet",
  "emi",
  "paylater",
  "online",
];

const PaymentSchema = new mongoose.Schema(
  {
    /*
     * User who initiated the payment
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /*
     * Our local Styleverse order
     */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    /*
     * Payment provider
     */
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
      index: true,
    },

    /*
     * Razorpay order ID
     *
     * Must be unique because one Razorpay order
     * must map to one local payment record.
     */
    providerOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    /*
     * Razorpay payment ID
     */
    providerPaymentId: {
      type: String,
      default: null,
      trim: true,
    },

    /*
     * Razorpay checkout signature
     */
    providerSignature: {
      type: String,
      default: null,
      trim: true,
    },

    /*
     * Amount in INR
     */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * Amount in paise
     */
    amountInPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message:
          "amountInPaise must be an integer",
      },
    },

    /*
     * Currency
     */
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
      enum: ["INR"],
    },

    /*
     * Payment lifecycle
     */
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "created",
      index: true,
    },

    /*
     * Actual Razorpay payment method
     */
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "online",
    },

    /*
     * Prevent duplicate inventory adjustment
     * when both verify API and webhook arrive.
     */
    inventoryAdjusted: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
     * Store processed webhook event IDs
     * so duplicate webhook delivery does not
     * execute the same event repeatedly.
     */
    processedWebhookEventIds: {
      type: [String],
      default: [],
    },

    /*
     * Failure information
     */
    failureReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },

    /*
     * Gateway capture time
     */
    capturedAt: {
      type: Date,
      default: null,
    },

    /*
     * Raw Razorpay data snapshot
     */
    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Helpful indexes.
 *
 * providerOrderId is already unique/indexed by its field
 * definition above, so it is NOT declared again here.
 */
PaymentSchema.index({
  userId: 1,
  createdAt: -1,
});

PaymentSchema.index({
  orderId: 1,
  createdAt: -1,
});

PaymentSchema.index({
  providerPaymentId: 1,
});

PaymentSchema.index({
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Payment",
  PaymentSchema
);