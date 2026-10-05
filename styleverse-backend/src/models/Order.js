const mongoose = require("mongoose");
const crypto = require("crypto");

const ORDER_STATUSES = [
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

const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const PAYMENT_METHODS = [
  "cod",
  "razorpay",
];

const ORDER_ITEM_TYPES = [
  "product",
  "custom_design",
  "outfit",
];

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },

    customDesignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomDesign",
      default: null,
      index: true,
    },

    outfitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outfit",
      default: null,
      index: true,
    },

    itemType: {
      type: String,
      enum: ORDER_ITEM_TYPES,
      default: "product",
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },

    thumbnail: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },

    // Price snapshot at order time
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    selectedSize: {
      type: String,
      default: "",
      trim: true,
      maxlength: 50,
    },

    selectedColor: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    itemStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
  },
  {
    _id: true,
  }
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },

    addressLine2: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    postalCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
      maxlength: 100,
    },
  },
  {
    _id: false,
  }
);

const StatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const OrderSchema = new mongoose.Schema(
  {
    // Order owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Human-readable order number
    // Example: SV-20260910-A1B2C3D4
    orderNumber: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      maxlength: 100,
    },

    // Prevent duplicate order creation
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
      maxlength: 200,
    },

    // Ordered items
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },

    // Price snapshot
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
      enum: ["INR"],
    },

    // Coupon snapshot/reference
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
      index: true,
    },

    couponCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
      maxlength: 100,
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cod",
      index: true,
    },

    // Razorpay references
    paymentOrderId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    paymentId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    paymentSignature: {
      type: String,
      default: null,
      trim: true,
    },

    // Shipping address snapshot
    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },

    // Order lifecycle
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },

    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },

    // Tracking
    trackingNumber: {
      type: String,
      default: null,
      trim: true,
      index: true,
      maxlength: 200,
    },

    carrier: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },

    estimatedDelivery: {
      type: Date,
      default: null,
    },

    // Important timestamps
    placedAt: {
      type: Date,
      default: Date.now,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    shippedAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Generate order number.
 *
 * Mongoose 9:
 * Do not use callback-style next() middleware.
 */
OrderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    const datePart = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const randomPart = crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();

    this.orderNumber = `SV-${datePart}-${randomPart}`;
  }
});

/*
 * Create initial status history entry.
 *
 * Mongoose 9:
 * No next() callback.
 */
OrderSchema.pre("save", function () {
  if (
    this.isNew &&
    (!Array.isArray(this.statusHistory) ||
      this.statusHistory.length === 0)
  ) {
    this.statusHistory = [
      {
        status: this.status,
        note: "Order created",
        changedAt: new Date(),
      },
    ];
  }
});

/*
 * Keep totals logically valid.
 */
OrderSchema.pre("validate", function () {
  const subtotal = Number(this.subtotal || 0);
  const discount = Number(this.discount || 0);
  const shippingFee = Number(this.shippingFee || 0);
  const totalAmount = Number(this.totalAmount || 0);

  if (discount > subtotal) {
    this.discount = subtotal;
  }

  const calculatedTotal = Number(
    (
      subtotal -
      Number(this.discount || 0) +
      shippingFee
    ).toFixed(2)
  );

  if (
    Math.abs(totalAmount - calculatedTotal) > 0.01
  ) {
    this.invalidate(
      "totalAmount",
      "totalAmount does not match subtotal, discount and shippingFee"
    );
  }
});

/*
 * Helpful indexes.
 */
OrderSchema.index({
  userId: 1,
  createdAt: -1,
});

OrderSchema.index({
  status: 1,
  createdAt: -1,
});

OrderSchema.index({
  paymentStatus: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Order",
  OrderSchema
);