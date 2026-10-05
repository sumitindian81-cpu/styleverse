const mongoose = require("mongoose");

const BODY_CATEGORIES = ["male", "female", "kids"];
const UNITS = ["cm", "in"];

const BodyProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "My Body Profile",
    },

    category: {
      type: String,
      enum: BODY_CATEGORIES,
      required: true,
      index: true,
    },

    // Used for kids profiles.
    age: {
      type: Number,
      min: 0,
      max: 18,
      default: null,
    },

    unit: {
      type: String,
      enum: UNITS,
      default: "cm",
      required: true,
    },

    measurements: {
      // Common
      height: {
        type: Number,
        min: 1,
        max: 300,
        required: true,
      },

      // Upper body
      neck: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      shoulderWidth: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      chest: {
        type: Number,
        min: 1,
        max: 300,
        default: null,
      },

      bust: {
        type: Number,
        min: 1,
        max: 300,
        default: null,
      },

      underbust: {
        type: Number,
        min: 1,
        max: 250,
        default: null,
      },

      waist: {
        type: Number,
        min: 1,
        max: 300,
        default: null,
      },

      belly: {
        type: Number,
        min: 1,
        max: 300,
        default: null,
      },

      highHip: {
        type: Number,
        min: 1,
        max: 300,
        default: null,
      },

      hip: {
        type: Number,
        min: 1,
        max: 300,
        default: null,
      },

      seat: {
        type: Number,
        min: 1,
        max: 300,
        default: null,
      },

      bicep: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      elbow: {
        type: Number,
        min: 1,
        max: 100,
        default: null,
      },

      wrist: {
        type: Number,
        min: 1,
        max: 100,
        default: null,
      },

      armLength: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      armhole: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      // Lower body
      thigh: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      knee: {
        type: Number,
        min: 1,
        max: 120,
        default: null,
      },

      calf: {
        type: Number,
        min: 1,
        max: 120,
        default: null,
      },

      ankle: {
        type: Number,
        min: 1,
        max: 100,
        default: null,
      },

      inseam: {
        type: Number,
        min: 1,
        max: 200,
        default: null,
      },

      outseam: {
        type: Number,
        min: 1,
        max: 250,
        default: null,
      },

      frontRise: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      backRise: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      legOpening: {
        type: Number,
        min: 1,
        max: 100,
        default: null,
      },

      // Optional additional body measurements
      torsoLength: {
        type: Number,
        min: 1,
        max: 150,
        default: null,
      },

      shoulderToWaist: {
        type: Number,
        min: 1,
        max: 200,
        default: null,
      },

      waistToKnee: {
        type: Number,
        min: 1,
        max: 200,
        default: null,
      },

      customMeasurements: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    // Future 3D avatar parameters can be stored here.
    avatarParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

BodyProfileSchema.index({
  userId: 1,
  createdAt: -1,
});

BodyProfileSchema.index({
  userId: 1,
  category: 1,
  isActive: 1,
});

BodyProfileSchema.index(
  {
    userId: 1,
    isDefault: 1,
  },
  {
    partialFilterExpression: {
      isDefault: true,
      isActive: true,
    },
  }
);

module.exports = mongoose.model(
  "BodyProfile",
  BodyProfileSchema
);