const mongoose = require("mongoose");

const CustomDesign = require("../models/CustomDesign");
const Product = require("../models/Product");
const BodyProfile = require("../models/BodyProfile");

// ==========================================
// Helper: Validate Body Profile Ownership
// ==========================================

const validateBodyProfile = async (
  bodyProfileId,
  userId
) => {
  if (!bodyProfileId) {
    return {
      ok: true,
      profileId: null,
    };
  }

  if (!mongoose.isValidObjectId(bodyProfileId)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid bodyProfileId",
    };
  }

  const profile = await BodyProfile.findOne({
    _id: bodyProfileId,
    userId,
    isActive: true,
  })
    .select("_id category unit measurements")
    .lean();

  if (!profile) {
    return {
      ok: false,
      status: 404,
      message:
        "Body profile not found or does not belong to you",
    };
  }

  return {
    ok: true,
    profileId: profile._id,
  };
};

// ==========================================
// Helper: Validate Measurements
// ==========================================

const validateMeasurements = (measurements) => {
  if (measurements === undefined) {
    return {
      ok: true,
      value: undefined,
    };
  }

  if (
    measurements === null ||
    typeof measurements !== "object" ||
    Array.isArray(measurements)
  ) {
    return {
      ok: false,
      status: 400,
      message: "measurements must be an object",
    };
  }

  const allowedNumericFields = [
    "garmentLength",
    "sleeveLength",
    "neckDepth",
    "shoulderWidth",
    "chest",
    "waist",
    "hip",
    "armhole",
    "hemWidth",

    // Upper-specific
    "neck",
    "bicep",
    "wrist",
    "shirtLength",

    // Lower-specific
    "inseam",
    "outseam",
    "thigh",
    "knee",
    "frontRise",
    "backRise",
    "legOpening",

    // Optional
    "bust",
    "underbust",
    "highHip",
    "seat",
    "elbow",
    "calf",
    "ankle",
  ];

  const cleaned = {};

  for (const key of allowedNumericFields) {
    if (
      measurements[key] === undefined ||
      measurements[key] === null ||
      measurements[key] === ""
    ) {
      continue;
    }

    const value = Number(measurements[key]);

    if (!Number.isFinite(value) || value < 0) {
      return {
        ok: false,
        status: 400,
        message: `Invalid measurement: ${key}`,
      };
    }

    cleaned[key] = value;
  }

  const unit = measurements.unit ?? "cm";

  if (!["cm", "in"].includes(unit)) {
    return {
      ok: false,
      status: 400,
      message:
        "measurement unit must be cm or in",
    };
  }

  cleaned.unit = unit;

  // Preserve any additional custom measurements
  // for future garment-specific controls.
  if (
    measurements.customMeasurements &&
    typeof measurements.customMeasurements ===
      "object" &&
    !Array.isArray(
      measurements.customMeasurements
    )
  ) {
    cleaned.customMeasurements =
      measurements.customMeasurements;
  }

  return {
    ok: true,
    value: cleaned,
  };
};

// ==========================================
// Helper: Normalize Attributes
// ==========================================

const normalizeAttributes = (attributes) => {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    return {};
  }

  return {
    color:
      typeof attributes.color === "string"
        ? attributes.color.trim()
        : "",

    pattern:
      typeof attributes.pattern === "string"
        ? attributes.pattern.trim()
        : "",

    sleeveStyle:
      typeof attributes.sleeveStyle ===
      "string"
        ? attributes.sleeveStyle.trim()
        : "",

    neckDesign:
      typeof attributes.neckDesign ===
      "string"
        ? attributes.neckDesign.trim()
        : "",

    length:
      typeof attributes.length === "string"
        ? attributes.length.trim()
        : "",

    lengthType:
      typeof attributes.lengthType ===
      "string"
        ? attributes.lengthType.trim()
        : "",

    fit:
      typeof attributes.fit === "string"
        ? attributes.fit.trim()
        : "",

    size:
      typeof attributes.size === "string"
        ? attributes.size.trim()
        : "",

    customOptions:
      attributes.customOptions &&
      typeof attributes.customOptions ===
        "object" &&
      !Array.isArray(
        attributes.customOptions
      )
        ? attributes.customOptions
        : {},
  };
};

// ==========================================
// POST /api/custom-designs
// ==========================================

exports.createCustomDesign = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const {
      baseProductId,
      bodyProfileId = null,
      title,
      attributes,
      measurements,
      previewImageUrl,
    } = req.body;

    if (!baseProductId) {
      return res.status(400).json({
        success: false,
        message:
          "baseProductId is required",
      });
    }

    if (
      !mongoose.isValidObjectId(
        baseProductId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid baseProductId",
      });
    }

    // Validate base product
    const base = await Product.findOne({
      _id: baseProductId,
      status: "active",
      isCustomizable: true,
    }).lean();

    if (!base) {
      return res.status(404).json({
        success: false,
        message:
          "Base product not found or not customizable",
      });
    }

    // Validate body profile ownership
    const bodyValidation =
      await validateBodyProfile(
        bodyProfileId,
        userId
      );

    if (!bodyValidation.ok) {
      return res.status(
        bodyValidation.status
      ).json({
        success: false,
        message: bodyValidation.message,
      });
    }

    // Validate measurements
    const measurementValidation =
      validateMeasurements(
        measurements
      );

    if (!measurementValidation.ok) {
      return res.status(
        measurementValidation.status
      ).json({
        success: false,
        message:
          measurementValidation.message,
      });
    }

    // Server-controlled attributes
    const cleanAttributes =
      normalizeAttributes(attributes);

    // Server-controlled price
    const finalPrice = Number(base.price);

    if (
      !Number.isFinite(finalPrice) ||
      finalPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Base product has an invalid price",
      });
    }

    const design =
      await CustomDesign.create({
        userId,

        baseProductId: base._id,

        bodyProfileId:
          bodyValidation.profileId,

        baseItemType:
          base.type || "top",

        title:
          typeof title === "string" &&
          title.trim()
            ? title.trim()
            : `Custom ${base.name}`,

        attributes: cleanAttributes,

        measurements:
          measurementValidation.value ||
          {
            unit: "cm",
            customMeasurements: {},
          },

        previewImageUrl:
          typeof previewImageUrl ===
          "string"
            ? previewImageUrl.trim()
            : "",

        price: finalPrice,

        status: "active",
      });

    return res.status(201).json({
      success: true,
      message:
        "Custom design saved successfully",
      data: {
        design,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// GET /api/custom-designs
// ==========================================

exports.getMyCustomDesigns = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const items =
      await CustomDesign.find({
        userId,
        status: "active",
      })
        .sort({
          createdAt: -1,
        })
        .populate(
          "baseProductId",
          "name images price type status isCustomizable sizes colors"
        )
        .populate(
          "bodyProfileId",
          "name category unit measurements isDefault isActive"
        )
        .lean();

    return res.json({
      success: true,
      data: {
        items,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// GET /api/custom-designs/:id
// ==========================================

exports.getCustomDesignById = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid design ID",
      });
    }

    const design =
      await CustomDesign.findOne({
        _id: id,
        userId,
        status: "active",
      })
        .populate(
          "baseProductId",
          "name images price type status isCustomizable sizes colors"
        )
        .populate(
          "bodyProfileId",
          "name category unit measurements isDefault isActive"
        )
        .lean();

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    return res.json({
      success: true,
      data: {
        design,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PATCH /api/custom-designs/:id
// ==========================================

exports.updateCustomDesign = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid design ID",
      });
    }

    const design =
      await CustomDesign.findOne({
        _id: id,
        userId,
        status: "active",
      });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    const {
      bodyProfileId,
      title,
      attributes,
      measurements,
      previewImageUrl,
    } = req.body;

    // -----------------------------
    // Body Profile
    // -----------------------------

    if (
      bodyProfileId !== undefined
    ) {
      const bodyValidation =
        await validateBodyProfile(
          bodyProfileId,
          userId
        );

      if (!bodyValidation.ok) {
        return res.status(
          bodyValidation.status
        ).json({
          success: false,
          message:
            bodyValidation.message,
        });
      }

      design.bodyProfileId =
        bodyValidation.profileId;
    }

    // -----------------------------
    // Title
    // -----------------------------

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        title.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid title",
        });
      }

      design.title =
        title.trim();
    }

    // -----------------------------
    // Attributes
    // -----------------------------

    if (attributes !== undefined) {
      if (
        !attributes ||
        typeof attributes !==
          "object" ||
        Array.isArray(attributes)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attributes",
        });
      }

      design.attributes =
        normalizeAttributes(
          attributes
        );
    }

    // -----------------------------
    // Measurements
    // -----------------------------

    if (
      measurements !== undefined
    ) {
      const measurementValidation =
        validateMeasurements(
          measurements
        );

      if (!measurementValidation.ok) {
        return res.status(
          measurementValidation.status
        ).json({
          success: false,
          message:
            measurementValidation.message,
        });
      }

      design.measurements =
        measurementValidation.value;
    }

    // -----------------------------
    // Preview
    // -----------------------------

    if (
      previewImageUrl !== undefined
    ) {
      if (
        typeof previewImageUrl !==
        "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid previewImageUrl",
        });
      }

      design.previewImageUrl =
        previewImageUrl.trim();
    }

    // -----------------------------
    // Revalidate base product
    // -----------------------------

    const base =
      await Product.findOne({
        _id: design.baseProductId,
        status: "active",
        isCustomizable: true,
      }).lean();

    if (!base) {
      return res.status(400).json({
        success: false,
        message:
          "Base product is no longer available for customization",
      });
    }

    // Server controlled
    design.baseItemType =
      base.type || "top";

    const finalPrice =
      Number(base.price);

    if (
      !Number.isFinite(finalPrice) ||
      finalPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Base product has an invalid price",
      });
    }

    design.price =
      finalPrice;

    await design.save();

    const updated =
      await CustomDesign.findById(
        design._id
      )
        .populate(
          "baseProductId",
          "name images price type status isCustomizable sizes colors"
        )
        .populate(
          "bodyProfileId",
          "name category unit measurements isDefault isActive"
        )
        .lean();

    return res.json({
      success: true,
      message:
        "Custom design updated successfully",
      data: {
        design: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// DELETE /api/custom-designs/:id
// ==========================================

exports.deleteCustomDesign = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid design ID",
      });
    }

    const updated =
      await CustomDesign.findOneAndUpdate(
        {
          _id: id,
          userId,
          status: "active",
        },
        {
          status: "deleted",
        },
        {
          new: true,
        }
      ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message:
          "Design not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Custom design deleted successfully",
      data: {
        deleted: true,
      },
    });
  } catch (err) {
    next(err);
  }
};