const mongoose = require("mongoose");
const crypto = require("crypto");

const Outfit = require("../models/Outfit");
const Product = require("../models/Product");
const CustomDesign = require("../models/CustomDesign");
const BodyProfile = require("../models/BodyProfile");

const ALLOWED_ROLES = [
  "top",
  "bottom",
  "dress",
  "shoes",
  "bag",
  "jewelry",
  "accessory",
  "outerwear",
];

const generateShareToken = () => {
  return crypto.randomBytes(24).toString("hex");
};

const validateItems = async (items, userId) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "items must be a non-empty array",
    };
  }

  for (const item of items) {
    if (!item || typeof item !== "object") {
      return {
        ok: false,
        status: 400,
        message: "Invalid outfit item",
      };
    }

    if (!ALLOWED_ROLES.includes(item.role)) {
      return {
        ok: false,
        status: 400,
        message: `Invalid outfit role: ${item.role}`,
      };
    }

    const hasProduct = !!item.productId;
    const hasCustomDesign = !!item.customDesignId;

    if (!hasProduct && !hasCustomDesign) {
      return {
        ok: false,
        status: 400,
        message:
          "Each outfit item must contain either productId or customDesignId",
      };
    }

    if (hasProduct && hasCustomDesign) {
      return {
        ok: false,
        status: 400,
        message:
          "An outfit item cannot contain both productId and customDesignId",
      };
    }

    if (
      item.productId &&
      !mongoose.isValidObjectId(item.productId)
    ) {
      return {
        ok: false,
        status: 400,
        message: "Invalid productId",
      };
    }

    if (
      item.customDesignId &&
      !mongoose.isValidObjectId(item.customDesignId)
    ) {
      return {
        ok: false,
        status: 400,
        message: "Invalid customDesignId",
      };
    }
  }

  // Validate normal products
  const productIds = items
    .filter((item) => item.productId)
    .map((item) => item.productId);

  if (productIds.length > 0) {
    const products = await Product.find({
      _id: { $in: productIds },
      status: "active",
    })
      .select("_id")
      .lean();

    const activeProductIds = new Set(
      products.map((product) => String(product._id))
    );

    for (const productId of productIds) {
      if (!activeProductIds.has(String(productId))) {
        return {
          ok: false,
          status: 404,
          message:
            "One or more products are invalid or inactive",
        };
      }
    }
  }

  // Validate user's custom designs
  const customDesignIds = items
    .filter((item) => item.customDesignId)
    .map((item) => item.customDesignId);

  if (customDesignIds.length > 0) {
    const designs = await CustomDesign.find({
      _id: { $in: customDesignIds },
      userId,
      status: "active",
    })
      .select("_id")
      .lean();

    const validDesignIds = new Set(
      designs.map((design) => String(design._id))
    );

    for (const designId of customDesignIds) {
      if (!validDesignIds.has(String(designId))) {
        return {
          ok: false,
          status: 404,
          message:
            "One or more custom designs were not found or do not belong to you",
        };
      }
    }
  }

  return { ok: true };
};

const validateBodyProfile = async (
  bodyProfileId,
  userId
) => {
  if (!bodyProfileId) {
    return {
      ok: true,
      value: null,
    };
  }

  if (!mongoose.isValidObjectId(bodyProfileId)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid bodyProfileId",
    };
  }

  const bodyProfile = await BodyProfile.findOne({
    _id: bodyProfileId,
    userId,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!bodyProfile) {
    return {
      ok: false,
      status: 404,
      message:
        "Body profile not found or does not belong to you",
    };
  }

  return {
    ok: true,
    value: bodyProfileId,
  };
};

// POST /api/outfits
exports.createOutfit = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const {
      name = "",
      items = [],
      previewImageUrl = "",
      bodyProfileId = null,
    } = req.body;

    const bodyValidation = await validateBodyProfile(
      bodyProfileId,
      userId
    );

    if (!bodyValidation.ok) {
      return res.status(bodyValidation.status).json({
        success: false,
        message: bodyValidation.message,
      });
    }

    const itemValidation = await validateItems(
      items,
      userId
    );

    if (!itemValidation.ok) {
      return res.status(itemValidation.status).json({
        success: false,
        message: itemValidation.message,
      });
    }

    const cleanItems = items.map((item) => ({
      productId: item.productId || null,
      customDesignId: item.customDesignId || null,
      role: item.role,
      selectedSize:
        typeof item.selectedSize === "string"
          ? item.selectedSize.trim()
          : "",
      selectedColor:
        typeof item.selectedColor === "string"
          ? item.selectedColor.trim()
          : "",
    }));

    const outfit = await Outfit.create({
      userId,
      name:
        typeof name === "string"
          ? name.trim()
          : "",
      bodyProfileId: bodyValidation.value,
      items: cleanItems,
      previewImageUrl:
        typeof previewImageUrl === "string"
          ? previewImageUrl.trim()
          : "",
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Outfit saved successfully",
      data: {
        outfit,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/outfits
exports.getMyOutfits = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const items = await Outfit.find({
      userId,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .populate(
        "bodyProfileId",
        "name unit measurements isDefault isActive"
      )
      .populate(
        "items.productId",
        "name price images type gender status"
      )
      .populate(
        "items.customDesignId",
        "title price attributes measurements previewImageUrl baseProductId baseItemType status"
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

// GET /api/outfits/:id
exports.getOutfitById = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID",
      });
    }

    const outfit = await Outfit.findOne({
      _id: id,
      userId,
      status: "active",
    })
      .populate(
        "bodyProfileId",
        "name unit measurements isDefault isActive"
      )
      .populate(
        "items.productId",
        "name price images type gender status"
      )
      .populate(
        "items.customDesignId",
        "title price attributes measurements previewImageUrl baseProductId baseItemType status"
      )
      .lean();

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: "Outfit not found",
      });
    }

    return res.json({
      success: true,
      data: {
        outfit,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/outfits/:id
exports.updateOutfit = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID",
      });
    }

    const outfit = await Outfit.findOne({
      _id: id,
      userId,
      status: "active",
    });

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: "Outfit not found",
      });
    }

    const {
      name,
      items,
      previewImageUrl,
      bodyProfileId,
    } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid outfit name",
        });
      }

      outfit.name = name.trim();
    }

    if (bodyProfileId !== undefined) {
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

      outfit.bodyProfileId =
        bodyValidation.value;
    }

    if (items !== undefined) {
      const itemValidation =
        await validateItems(
          items,
          userId
        );

      if (!itemValidation.ok) {
        return res.status(
          itemValidation.status
        ).json({
          success: false,
          message: itemValidation.message,
        });
      }

      outfit.items = items.map((item) => ({
        productId: item.productId || null,
        customDesignId:
          item.customDesignId || null,
        role: item.role,
        selectedSize:
          typeof item.selectedSize === "string"
            ? item.selectedSize.trim()
            : "",
        selectedColor:
          typeof item.selectedColor === "string"
            ? item.selectedColor.trim()
            : "",
      }));
    }

    if (previewImageUrl !== undefined) {
      if (typeof previewImageUrl !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid previewImageUrl",
        });
      }

      outfit.previewImageUrl =
        previewImageUrl.trim();
    }

    await outfit.save();

    const updated = await Outfit.findById(
      outfit._id
    )
      .populate(
        "bodyProfileId",
        "name unit measurements isDefault isActive"
      )
      .populate(
        "items.productId",
        "name price images type gender status"
      )
      .populate(
        "items.customDesignId",
        "title price attributes measurements previewImageUrl baseProductId baseItemType status"
      )
      .lean();

    return res.json({
      success: true,
      message: "Outfit updated successfully",
      data: {
        outfit: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/outfits/:id
exports.deleteOutfit = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID",
      });
    }

    const updated =
      await Outfit.findOneAndUpdate(
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
        message: "Outfit not found",
      });
    }

    return res.json({
      success: true,
      message: "Outfit deleted successfully",
      data: {
        deleted: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/outfits/:id/share
exports.shareOutfit = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid outfit ID",
      });
    }

    const outfit = await Outfit.findOne({
      _id: id,
      userId,
      status: "active",
    });

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: "Outfit not found",
      });
    }

    if (!outfit.shareToken) {
      outfit.shareToken = generateShareToken();
    }

    outfit.isPublic = true;
    outfit.sharedAt = new Date();

    await outfit.save();

    return res.json({
      success: true,
      message: "Outfit shared successfully",
      data: {
        outfitId: outfit._id,
        shareToken: outfit.shareToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/outfits/:id/share
exports.unshareOutfit = async (
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
        message: "Invalid outfit ID",
      });
    }

    const outfit = await Outfit.findOne({
      _id: id,
      userId,
      status: "active",
    });

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: "Outfit not found",
      });
    }

    outfit.isPublic = false;
    outfit.sharedAt = null;

    await outfit.save();

    return res.json({
      success: true,
      message: "Outfit sharing disabled",
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/outfits/shared/:token
// Public route — authentication is NOT required.
exports.getSharedOutfit = async (
  req,
  res,
  next
) => {
  try {
    const { token } = req.params;

    if (
      !token ||
      typeof token !== "string" ||
      token.length < 20 ||
      token.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid share token",
      });
    }

    const outfit = await Outfit.findOne({
      shareToken: token,
      isPublic: true,
      status: "active",
    })
      .select(
        "name items previewImageUrl bodyProfileId sharedAt createdAt"
      )
      .populate(
        "items.productId",
        "name price images type gender status"
      )
      .populate(
        "items.customDesignId",
        "title price attributes measurements previewImageUrl baseProductId baseItemType status"
      )
      .lean();

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: "Shared outfit not found",
      });
    }

    return res.json({
      success: true,
      data: {
        outfit,
      },
    });
  } catch (err) {
    next(err);
  }
};