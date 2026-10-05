const mongoose = require("mongoose");
const BodyProfile = require("../models/BodyProfile");

const BODY_CATEGORIES = ["male", "female", "kids"];
const UNITS = ["cm", "in"];

const MEASUREMENT_LIMITS = {
  height: [1, 300],
  neck: [1, 150],
  shoulderWidth: [1, 150],
  chest: [1, 300],
  bust: [1, 300],
  underbust: [1, 250],
  waist: [1, 300],
  belly: [1, 300],
  highHip: [1, 300],
  hip: [1, 300],
  seat: [1, 300],
  bicep: [1, 150],
  elbow: [1, 100],
  wrist: [1, 100],
  armLength: [1, 150],
  armhole: [1, 150],
  thigh: [1, 150],
  knee: [1, 120],
  calf: [1, 120],
  ankle: [1, 100],
  inseam: [1, 200],
  outseam: [1, 250],
  frontRise: [1, 150],
  backRise: [1, 150],
  legOpening: [1, 100],
  torsoLength: [1, 150],
  shoulderToWaist: [1, 200],
  waistToKnee: [1, 200],
};

const validateCategory = (category) => {
  if (!BODY_CATEGORIES.includes(category)) {
    return {
      ok: false,
      message: "category must be male, female, or kids",
    };
  }

  return { ok: true };
};

const validateUnit = (unit) => {
  if (!UNITS.includes(unit)) {
    return {
      ok: false,
      message: "unit must be cm or in",
    };
  }

  return { ok: true };
};

const validateAge = (category, age) => {
  if (category !== "kids") {
    return { ok: true };
  }

  const numericAge = Number(age);

  if (
    !Number.isFinite(numericAge) ||
    numericAge < 0 ||
    numericAge > 18
  ) {
    return {
      ok: false,
      message: "For kids, age must be between 0 and 18",
    };
  }

  return { ok: true };
};

const normalizeNumber = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
};

const validateMeasurements = (
  measurements,
  category
) => {
  if (
    !measurements ||
    typeof measurements !== "object" ||
    Array.isArray(measurements)
  ) {
    return {
      ok: false,
      message: "measurements object is required",
    };
  }

  const cleaned = {};

  for (const [key, value] of Object.entries(
    measurements
  )) {
    // Unknown keys are ignored here because the schema
    // controls persisted fields.
    if (!MEASUREMENT_LIMITS[key]) {
      continue;
    }

    if (
      value === null ||
      value === "" ||
      value === undefined
    ) {
      cleaned[key] = null;
      continue;
    }

    const numericValue = normalizeNumber(value);

    if (numericValue === null) {
      return {
        ok: false,
        message: `Invalid measurement: ${key}`,
      };
    }

    const [min, max] = MEASUREMENT_LIMITS[key];

    if (
      numericValue < min ||
      numericValue > max
    ) {
      return {
        ok: false,
        message: `${key} must be between ${min} and ${max}`,
      };
    }

    cleaned[key] = numericValue;
  }

  // Height is required for all body profiles.
  if (
    cleaned.height === undefined ||
    cleaned.height === null
  ) {
    return {
      ok: false,
      message: "height is required",
    };
  }

  /*
   * We intentionally do not force every measurement.
   * Different garment categories will need different
   * measurements, and women/kids do not use exactly
   * the same fields as men.
   */

  return {
    ok: true,
    measurements: cleaned,
  };
};

const normalizeName = (name) => {
  if (
    typeof name !== "string" ||
    !name.trim()
  ) {
    return "My Body Profile";
  }

  return name.trim().slice(0, 100);
};

const clearOtherDefaults = async (
  userId,
  excludeId = null
) => {
  const query = {
    userId,
    isActive: true,
    isDefault: true,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  await BodyProfile.updateMany(
    query,
    {
      $set: {
        isDefault: false,
      },
    }
  );
};

// ==========================================
// POST /api/body-profiles
// ==========================================
exports.createBodyProfile = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const {
      name,
      category,
      age = null,
      unit = "cm",
      measurements,
      avatarParameters = {},
      isDefault = false,
    } = req.body;

    // Category
    const categoryValidation =
      validateCategory(category);

    if (!categoryValidation.ok) {
      return res.status(400).json({
        success: false,
        message: categoryValidation.message,
      });
    }

    // Unit
    const unitValidation =
      validateUnit(unit);

    if (!unitValidation.ok) {
      return res.status(400).json({
        success: false,
        message: unitValidation.message,
      });
    }

    // Age
    const ageValidation =
      validateAge(category, age);

    if (!ageValidation.ok) {
      return res.status(400).json({
        success: false,
        message: ageValidation.message,
      });
    }

    // Measurements
    const measurementValidation =
      validateMeasurements(
        measurements,
        category
      );

    if (!measurementValidation.ok) {
      return res.status(400).json({
        success: false,
        message:
          measurementValidation.message,
      });
    }

    if (
      avatarParameters !== null &&
      (
        typeof avatarParameters !== "object" ||
        Array.isArray(avatarParameters)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "avatarParameters must be an object",
      });
    }

    const shouldBeDefault =
      Boolean(isDefault);

    if (shouldBeDefault) {
      await clearOtherDefaults(userId);
    }

    const profile =
      await BodyProfile.create({
        userId,
        name: normalizeName(name),
        category,
        age:
          category === "kids"
            ? Number(age)
            : null,
        unit,
        measurements:
          measurementValidation.measurements,
        avatarParameters:
          avatarParameters || {},
        isDefault: shouldBeDefault,
        isActive: true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Body profile created successfully",
      data: {
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// GET /api/body-profiles
// ==========================================
exports.getMyBodyProfiles = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const items = await BodyProfile.find({
      userId,
      isActive: true,
    })
      .sort({
        isDefault: -1,
        createdAt: -1,
      })
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
// GET /api/body-profiles/default
// ==========================================
exports.getDefaultBodyProfile = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const profile =
      await BodyProfile.findOne({
        userId,
        isActive: true,
        isDefault: true,
      }).lean();

    return res.json({
      success: true,
      data: {
        profile: profile || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// GET /api/body-profiles/:id
// ==========================================
exports.getBodyProfileById = async (
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
        message: "Invalid body profile ID",
      });
    }

    const profile =
      await BodyProfile.findOne({
        _id: id,
        userId,
        isActive: true,
      }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Body profile not found",
      });
    }

    return res.json({
      success: true,
      data: {
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PATCH /api/body-profiles/:id
// ==========================================
exports.updateBodyProfile = async (
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
        message: "Invalid body profile ID",
      });
    }

    const profile =
      await BodyProfile.findOne({
        _id: id,
        userId,
        isActive: true,
      });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Body profile not found",
      });
    }

    const {
      name,
      category,
      age,
      unit,
      measurements,
      avatarParameters,
      isDefault,
    } = req.body;

    // Category
    if (category !== undefined) {
      const categoryValidation =
        validateCategory(category);

      if (!categoryValidation.ok) {
        return res.status(400).json({
          success: false,
          message:
            categoryValidation.message,
        });
      }

      profile.category = category;
    }

    // Unit
    if (unit !== undefined) {
      const unitValidation =
        validateUnit(unit);

      if (!unitValidation.ok) {
        return res.status(400).json({
          success: false,
          message: unitValidation.message,
        });
      }

      profile.unit = unit;
    }

    // Age
    if (
      age !== undefined ||
      category !== undefined
    ) {
      const effectiveCategory =
        category !== undefined
          ? category
          : profile.category;

      const effectiveAge =
        age !== undefined
          ? age
          : profile.age;

      const ageValidation =
        validateAge(
          effectiveCategory,
          effectiveAge
        );

      if (!ageValidation.ok) {
        return res.status(400).json({
          success: false,
          message: ageValidation.message,
        });
      }

      profile.age =
        effectiveCategory === "kids"
          ? Number(effectiveAge)
          : null;
    }

    // Name
    if (name !== undefined) {
      if (typeof name !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid profile name",
        });
      }

      profile.name =
        normalizeName(name);
    }

    // Measurements
    if (measurements !== undefined) {
      const measurementValidation =
        validateMeasurements(
          measurements,
          profile.category
        );

      if (!measurementValidation.ok) {
        return res.status(400).json({
          success: false,
          message:
            measurementValidation.message,
        });
      }

      profile.measurements = {
        ...profile.measurements?.toObject?.(),
        ...measurementValidation.measurements,
      };
    }

    // Avatar parameters for future 3D renderer
    if (avatarParameters !== undefined) {
      if (
        avatarParameters === null ||
        typeof avatarParameters !== "object" ||
        Array.isArray(avatarParameters)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "avatarParameters must be an object",
        });
      }

      profile.avatarParameters =
        avatarParameters;
    }

    // Default flag
    if (isDefault !== undefined) {
      if (typeof isDefault !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "isDefault must be boolean",
        });
      }

      if (isDefault) {
        await clearOtherDefaults(
          userId,
          profile._id
        );
      }

      profile.isDefault = isDefault;
    }

    await profile.save();

    return res.json({
      success: true,
      message:
        "Body profile updated successfully",
      data: {
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// POST /api/body-profiles/:id/default
// ==========================================
exports.setDefaultBodyProfile = async (
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
        message: "Invalid body profile ID",
      });
    }

    const profile =
      await BodyProfile.findOne({
        _id: id,
        userId,
        isActive: true,
      });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Body profile not found",
      });
    }

    await clearOtherDefaults(
      userId,
      profile._id
    );

    profile.isDefault = true;

    await profile.save();

    return res.json({
      success: true,
      message:
        "Default body profile updated",
      data: {
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// DELETE /api/body-profiles/:id
// ==========================================
exports.deleteBodyProfile = async (
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
        message: "Invalid body profile ID",
      });
    }

    const profile =
      await BodyProfile.findOne({
        _id: id,
        userId,
        isActive: true,
      });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Body profile not found",
      });
    }

    profile.isActive = false;
    profile.isDefault = false;

    await profile.save();

    return res.json({
      success: true,
      message:
        "Body profile deleted successfully",
      data: {
        deleted: true,
      },
    });
  } catch (err) {
    next(err);
  }
};