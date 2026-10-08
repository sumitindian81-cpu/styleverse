const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");

function parseNumber(
  value,
  fieldName,
  { min = null, nullable = false } = {}
) {
  if (
    (value === undefined ||
      value === null ||
      value === "") &&
    nullable
  ) {
    return null;
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    throw new Error(
      `${fieldName} must be a valid number`
    );
  }

  if (min !== null && num < min) {
    throw new Error(
      `${fieldName} must be at least ${min}`
    );
  }

  return num;
}

function parseBoolean(
  value,
  defaultValue = false
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return (
    String(value).toLowerCase() === "true"
  );
}

function parseJsonField(
  value,
  fallback = []
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(
      "Invalid JSON format in product field"
    );
  }
}

function getUploadedFiles(req) {
  return [
    ...(req.files?.images || []),
    ...(req.files?.image || []),
  ];
}

function createCloudinaryUpload(
  fileBuffer
) {
  return new Promise(
    (resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder:
              "styleverse/products",
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }

            resolve(result);
          }
        );

      uploadStream.end(fileBuffer);
    }
  );
}

async function uploadProductImages(
  files = []
) {
  if (!files.length) {
    return [];
  }

  const uploaded = [];

  try {
    for (const file of files) {
      const result =
        await createCloudinaryUpload(
          file.buffer
        );

      uploaded.push({
        url: result.secure_url,
        isMain: false,
      });
    }

    return uploaded;
  } catch (error) {
    console.error(
      "Cloudinary product image upload failed:",
      error
    );

    throw new Error(
      "Product image upload failed"
    );
  }
}

function applyMainImage(
  images,
  mainImageIndex = 0
) {
  if (
    !Array.isArray(images) ||
    images.length === 0
  ) {
    return [];
  }

  let selectedIndex =
    Number(mainImageIndex);

  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= images.length
  ) {
    selectedIndex = 0;
  }

  return images.map(
    (image, index) => ({
      url: image.url,
      isMain:
        index === selectedIndex,
    })
  );
}

exports.listProducts = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      status = "active",
    } = req.query;

    const safePage = Math.max(
      Number(page) || 1,
      1
    );

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 50,
        1
      ),
      100
    );

    const query = {};

    /*
     * Active is the default catalogue view.
     *
     * Older products that do not have a status field
     * are also treated as active.
     *
     * Once a product is removed, its status becomes
     * "inactive", so it will not appear again.
     */
    if (status === "inactive") {
      query.status = "inactive";
    } else {
      query.status = {
        $ne: "inactive",
      };
    }

    if (String(search).trim()) {
      const normalizedSearch =
        String(search).trim();

      query.$or = [
        {
          name: {
            $regex:
              normalizedSearch,
            $options: "i",
          },
        },
        {
          brand: {
            $regex:
              normalizedSearch,
            $options: "i",
          },
        },
      ];
    }

    const skip =
      (safePage - 1) *
      safeLimit;

    const [
      items,
      total,
    ] = await Promise.all([
      Product.find(query)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Product.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages:
          Math.ceil(
            total / safeLimit
          ),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (
  req,
  res,
  next
) => {
  try {
    const { id } =
      req.params;

    const product =
      await Product.findById(
        id
      ).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    return res.json({
      success: true,
      data: {
        product,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      slug,
      description,
      brand = "",
      categoryId,
      price,
      mrp,
      discountPercent = 0,
      stock,
      gender = "unisex",
      type,
      material = "",
      pattern = "",
      mainImageIndex = 0,
      isFeatured = false,
      isNewArrival = false,
      isBestSeller = false,
      isOnSale = false,
      isCustomizable = false,
      status = "active",
    } = req.body;

    if (
      !String(name || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product name is required",
      });
    }

    if (
      !String(slug || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product slug is required",
      });
    }

    if (
      !String(
        description || ""
      ).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product description is required",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message:
          "categoryId is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message:
          "Product type is required",
      });
    }

    const parsedPrice =
      parseNumber(
        price,
        "price",
        {
          min: 0,
        }
      );

    const parsedMrp =
      parseNumber(
        mrp,
        "mrp",
        {
          min: 0,
          nullable: true,
        }
      );

    const parsedDiscountPercent =
      parseNumber(
        discountPercent,
        "discountPercent",
        {
          min: 0,
        }
      );

    const parsedStock =
      parseNumber(
        stock,
        "stock",
        {
          min: 0,
        }
      );

    const sizes =
      parseJsonField(
        req.body.sizes,
        []
      );

    const colors =
      parseJsonField(
        req.body.colors,
        []
      );

    if (
      !Array.isArray(sizes) ||
      !Array.isArray(colors)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "sizes and colors must be arrays",
      });
    }

    const files =
      getUploadedFiles(req);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one product image is required",
      });
    }

    const normalizedSlug =
      String(slug).trim();

    const existingSlug =
      await Product.findOne({
        slug: normalizedSlug,
      });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message:
          "Product slug already exists",
      });
    }

    const uploadedImages =
      await uploadProductImages(
        files
      );

    const images =
      applyMainImage(
        uploadedImages,
        mainImageIndex
      );

    const product =
      await Product.create({
        name: String(name).trim(),

        slug: normalizedSlug,

        description:
          String(
            description
          ).trim(),

        brand:
          String(
            brand
          ).trim(),

        categoryId,

        price:
          parsedPrice,

        mrp:
          parsedMrp,

        discountPercent:
          parsedDiscountPercent,

        stock:
          parsedStock,

        sizes,
        colors,

        gender,
        type,

        material:
          String(
            material
          ).trim(),

        pattern:
          String(
            pattern
          ).trim(),

        images,

        isFeatured:
          parseBoolean(
            isFeatured
          ),

        isNewArrival:
          parseBoolean(
            isNewArrival
          ),

        isBestSeller:
          parseBoolean(
            isBestSeller
          ),

        isOnSale:
          parseBoolean(
            isOnSale
          ),

        isCustomizable:
          parseBoolean(
            isCustomizable
          ),

        status,
      });

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully",
      data: {
        product,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      const product =
        await Product.findById(
          id
        );

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Product not found",
          });
      }

      const body =
        req.body;

      if (
        body.name !==
        undefined
      ) {
        product.name =
          String(
            body.name
          ).trim();
      }

      if (
        body.slug !==
        undefined
      ) {
        const newSlug =
          String(
            body.slug
          ).trim();

        const existingSlug =
          await Product.findOne({
            slug: newSlug,
            _id: {
              $ne: id,
            },
          });

        if (existingSlug) {
          return res
            .status(409)
            .json({
              success: false,
              message:
                "Product slug already exists",
            });
        }

        product.slug =
          newSlug;
      }

      if (
        body.description !==
        undefined
      ) {
        product.description =
          String(
            body.description
          ).trim();
      }

      if (
        body.brand !==
        undefined
      ) {
        product.brand =
          String(
            body.brand
          ).trim();
      }

      if (
        body.categoryId !==
        undefined
      ) {
        product.categoryId =
          body.categoryId;
      }

      if (
        body.price !==
        undefined
      ) {
        product.price =
          parseNumber(
            body.price,
            "price",
            {
              min: 0,
            }
          );
      }

      if (
        body.mrp !==
        undefined
      ) {
        product.mrp =
          parseNumber(
            body.mrp,
            "mrp",
            {
              min: 0,
              nullable: true,
            }
          );
      }

      if (
        body.discountPercent !==
        undefined
      ) {
        product.discountPercent =
          parseNumber(
            body.discountPercent,
            "discountPercent",
            {
              min: 0,
            }
          );
      }

      if (
        body.stock !==
        undefined
      ) {
        product.stock =
          parseNumber(
            body.stock,
            "stock",
            {
              min: 0,
            }
          );
      }

      if (
        body.gender !==
        undefined
      ) {
        product.gender =
          body.gender;
      }

      if (
        body.type !==
        undefined
      ) {
        product.type =
          body.type;
      }

      if (
        body.material !==
        undefined
      ) {
        product.material =
          String(
            body.material
          ).trim();
      }

      if (
        body.pattern !==
        undefined
      ) {
        product.pattern =
          String(
            body.pattern
          ).trim();
      }

      if (
        body.sizes !==
        undefined
      ) {
        product.sizes =
          parseJsonField(
            body.sizes,
            []
          );
      }

      if (
        body.colors !==
        undefined
      ) {
        product.colors =
          parseJsonField(
            body.colors,
            []
          );
      }

      if (
        body.isFeatured !==
        undefined
      ) {
        product.isFeatured =
          parseBoolean(
            body.isFeatured,
            product.isFeatured
          );
      }

      if (
        body.isNewArrival !==
        undefined
      ) {
        product.isNewArrival =
          parseBoolean(
            body.isNewArrival,
            product.isNewArrival
          );
      }

      if (
        body.isBestSeller !==
        undefined
      ) {
        product.isBestSeller =
          parseBoolean(
            body.isBestSeller,
            product.isBestSeller
          );
      }

      if (
        body.isOnSale !==
        undefined
      ) {
        product.isOnSale =
          parseBoolean(
            body.isOnSale,
            product.isOnSale
          );
      }

      if (
        body.isCustomizable !==
        undefined
      ) {
        product.isCustomizable =
          parseBoolean(
            body.isCustomizable,
            product.isCustomizable
          );
      }

      if (
        body.status !==
        undefined
      ) {
        product.status =
          body.status;
      }

      const files =
        getUploadedFiles(req);

      if (files.length > 0) {
        const uploadedImages =
          await uploadProductImages(
            files
          );

        const keepExistingImages =
          parseBoolean(
            body.keepExistingImages,
            false
          );

        const existingImages =
          keepExistingImages
            ? product.images.map(
                (image) => ({
                  url: image.url,
                  isMain: false,
                })
              )
            : [];

        const combinedImages = [
          ...existingImages,
          ...uploadedImages,
        ];

        product.images =
          applyMainImage(
            combinedImages,
            body.mainImageIndex ??
              0
          );
      }

      await product.save();

      return res.json({
        success: true,
        message:
          "Product updated successfully",
        data: {
          product,
        },
      });
    } catch (err) {
      next(err);
    }
  };

exports.deleteProduct =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      const product =
        await Product.findById(
          id
        );

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Product not found",
          });
      }

      /*
       * Soft delete:
       * product database me rahega,
       * lekin active catalogue se hide ho jayega.
       */
      product.status =
        "inactive";

      await product.save();

      return res.json({
        success: true,
        message:
          "Product removed from the catalogue",
        data: {
          deleted: true,
          status: "inactive",
        },
      });
    } catch (err) {
      next(err);
    }
  };