const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");

const ALLOWED_GENDERS = [
  "men",
  "women",
  "kids",
  "unisex",
];

const ALLOWED_TYPES = [
  "top",
  "bottom",
  "dress",
  "shoes",
  "bag",
  "jewelry",
  "accessory",
  "outerwear",
];

const ALLOWED_SORTS = [
  "new",
  "price_asc",
  "price_desc",
  "rating",
];

const MAX_LIMIT = 50;

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function parsePositiveInteger(
  value,
  fallback,
  max = null
) {
  const num = Number(value);

  if (!Number.isInteger(num) || num < 1) {
    return fallback;
  }

  if (max !== null) {
    return Math.min(num, max);
  }

  return num;
}

function parseNonNegativeNumber(
  value,
  fieldName
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const num = Number(value);

  if (
    !Number.isFinite(num) ||
    num < 0
  ) {
    throw new Error(
      `${fieldName} must be a valid non-negative number`
    );
  }

  return num;
}

/*
 * =====================================================
 * PRODUCT BUSINESS VALIDATION
 * =====================================================
 */

function validateProductBusinessRules({
  price,
  mrp,
  discountPercent,
  stock,
  sizes,
  colors,
  gender,
  type,
  images,
}) {
  const numericPrice = Number(price);

  if (
    !Number.isFinite(numericPrice) ||
    numericPrice < 0
  ) {
    return (
      "price must be a valid non-negative number"
    );
  }

  /*
   * MRP must not be lower than selling price.
   */
  if (
    mrp !== undefined &&
    mrp !== null &&
    mrp !== ""
  ) {
    const numericMrp = Number(mrp);

    if (
      !Number.isFinite(numericMrp) ||
      numericMrp < 0
    ) {
      return (
        "mrp must be a valid non-negative number"
      );
    }

    if (numericMrp < numericPrice) {
      return (
        "mrp cannot be less than price"
      );
    }
  }

  /*
   * Discount is dynamic per product.
   */
  if (
    discountPercent !== undefined &&
    discountPercent !== null &&
    discountPercent !== ""
  ) {
    const discount =
      Number(discountPercent);

    if (
      !Number.isFinite(discount) ||
      discount < 0 ||
      discount > 100
    ) {
      return (
        "discountPercent must be between 0 and 100"
      );
    }
  }

  /*
   * Product stock.
   */
  const numericStock =
    Number(stock);

  if (
    !Number.isInteger(numericStock) ||
    numericStock < 0
  ) {
    return (
      "stock must be a non-negative integer"
    );
  }

  /*
   * Gender.
   */
  if (
    gender !== undefined &&
    !ALLOWED_GENDERS.includes(gender)
  ) {
    return "Invalid gender";
  }

  /*
   * Product type.
   */
  if (
    type !== undefined &&
    !ALLOWED_TYPES.includes(type)
  ) {
    return "Invalid product type";
  }

  /*
   * Sizes.
   */
  if (sizes !== undefined) {
    if (!Array.isArray(sizes)) {
      return "sizes must be an array";
    }

    for (const item of sizes) {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return "Each size must be an object";
      }

      if (
        item.size !== undefined &&
        typeof item.size !== "string"
      ) {
        return "size must be a string";
      }

      const sizeStock =
        Number(item.stock ?? 0);

      if (
        !Number.isInteger(sizeStock) ||
        sizeStock < 0
      ) {
        return (
          "size stock must be a non-negative integer"
        );
      }
    }
  }

  /*
   * Colors.
   */
  if (colors !== undefined) {
    if (!Array.isArray(colors)) {
      return "colors must be an array";
    }

    for (const color of colors) {
      if (
        !color ||
        typeof color !== "object"
      ) {
        return "Each color must be an object";
      }

      if (
        typeof color.name !== "string" ||
        !color.name.trim()
      ) {
        return (
          "Each color must have a valid name"
        );
      }

      if (
        color.code !== undefined &&
        typeof color.code !== "string"
      ) {
        return "color code must be a string";
      }
    }
  }

  /*
   * Images.
   */
  if (images !== undefined) {
    if (!Array.isArray(images)) {
      return "images must be an array";
    }

    for (const image of images) {
      if (
        !image ||
        typeof image !== "object"
      ) {
        return "Each image must be an object";
      }

      if (
        typeof image.url !== "string" ||
        !image.url.trim()
      ) {
        return (
          "Each image must have a valid url"
        );
      }
    }

    /*
     * Only one image can be main.
     */
    if (images.length > 0) {
      const mainCount =
        images.filter(
          (image) =>
            image.isMain === true
        ).length;

      if (mainCount > 1) {
        return (
          "Only one image can be marked as main"
        );
      }
    }
  }

  return null;
}

/*
 * =====================================================
 * CATEGORY CHECK
 * =====================================================
 */

async function ensureCategoryExists(
  categoryId
) {
  if (!isValidObjectId(categoryId)) {
    return false;
  }

  const category =
    await Category.findById(
      categoryId
    )
      .select("_id isActive")
      .lean();

  return Boolean(
    category &&
      category.isActive !== false
  );
}

/*
 * =====================================================
 * ADMIN: CREATE PRODUCT
 * =====================================================
 */

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
      brand,
      categoryId,
      price,
      mrp,
      discountPercent,
      stock,
      sizes,
      colors,
      gender,
      type,
      material,
      pattern,
      images,
      isFeatured,
      isNewArrival,
      isBestSeller,
      isOnSale,
      isCustomizable,
      status,
    } = req.body;

    /*
     * Required fields.
     */
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      !categoryId ||
      price === undefined ||
      price === null ||
      stock === undefined ||
      stock === null ||
      !type
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, slug, description, categoryId, price, stock and type are required",
      });
    }

    /*
     * Category validation.
     */
    if (
      !isValidObjectId(categoryId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId",
      });
    }

    const categoryExists =
      await ensureCategoryExists(
        categoryId
      );

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message:
          "Category not found or inactive",
      });
    }

    /*
     * Business validation.
     */
    const validationError =
      validateProductBusinessRules({
        price,
        mrp,
        discountPercent,
        stock,
        sizes,
        colors,
        gender,
        type,
        images,
      });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    /*
     * Product creation.
     */
    const product =
      await Product.create({
        name: name.trim(),

        slug: slug.trim(),

        description:
          description.trim(),

        brand:
          typeof brand === "string"
            ? brand.trim()
            : "",

        categoryId,

        price: Number(price),

        mrp:
          mrp === undefined ||
          mrp === null ||
          mrp === ""
            ? null
            : Number(mrp),

        discountPercent:
          discountPercent ===
            undefined ||
          discountPercent === null
            ? 0
            : Number(
                discountPercent
              ),

        stock: Number(stock),

        sizes:
          Array.isArray(sizes)
            ? sizes
            : [],

        colors:
          Array.isArray(colors)
            ? colors
            : [],

        gender:
          gender || "unisex",

        type,

        material:
          typeof material ===
          "string"
            ? material.trim()
            : "",

        pattern:
          typeof pattern ===
          "string"
            ? pattern.trim()
            : "",

        images:
          Array.isArray(images)
            ? images
            : [],

        isFeatured:
          isFeatured === true,

        isNewArrival:
          isNewArrival === true,

        isBestSeller:
          isBestSeller === true,

        isOnSale:
          isOnSale === true,

        isCustomizable:
          isCustomizable === true,

        status:
          status === "inactive"
            ? "inactive"
            : "active",
      });

    return res.status(201).json({
      success: true,
      data: {
        product,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Product slug already exists",
      });
    }

    next(err);
  }
};

/*
 * =====================================================
 * PUBLIC: LIST PRODUCTS
 * =====================================================
 */

exports.getProducts = async (
  req,
  res,
  next
) => {
  try {
    const {
      search,
      category,
      type,
      gender,
      minPrice,
      maxPrice,
      size,
      color,
      minRating,
      sort = "new",
      page = 1,
      limit = 12,
    } = req.query;

    /*
     * Public catalog only shows active products.
     */
    const query = {
      status: "active",
    };

    /*
     * Category.
     */
    if (category) {
      if (
        !isValidObjectId(category)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category ID",
        });
      }

      query.categoryId =
        category;
    }

    /*
     * Type.
     */
    if (type) {
      if (
        !ALLOWED_TYPES.includes(
          type
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product type",
        });
      }

      query.type = type;
    }

    /*
     * Gender.
     */
    if (gender) {
      if (
        !ALLOWED_GENDERS.includes(
          gender
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid gender",
        });
      }

      query.gender = gender;
    }

    /*
     * Size.
     */
    if (size) {
      query["sizes.size"] =
        String(size).trim();
    }

    /*
     * Color.
     */
    if (color) {
      query["colors.name"] =
        String(color).trim();
    }

    /*
     * Minimum rating.
     */
    if (
      minRating !== undefined
    ) {
      const rating =
        Number(minRating);

      if (
        !Number.isFinite(rating) ||
        rating < 0 ||
        rating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "minRating must be between 0 and 5",
        });
      }

      query.averageRating = {
        $gte: rating,
      };
    }

    /*
     * Price range.
     */
    const min =
      parseNonNegativeNumber(
        minPrice,
        "minPrice"
      );

    const max =
      parseNonNegativeNumber(
        maxPrice,
        "maxPrice"
      );

    if (
      min !== null &&
      max !== null &&
      min > max
    ) {
      return res.status(400).json({
        success: false,
        message:
          "minPrice cannot be greater than maxPrice",
      });
    }

    if (
      min !== null ||
      max !== null
    ) {
      query.price = {};

      if (min !== null) {
        query.price.$gte = min;
      }

      if (max !== null) {
        query.price.$lte = max;
      }
    }

    /*
     * Search.
     */
    if (
      search &&
      String(search).trim()
    ) {
      query.$text = {
        $search:
          String(search).trim(),
      };
    }

    /*
     * Sorting.
     */
    if (
      !ALLOWED_SORTS.includes(
        sort
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid sort option",
      });
    }

    /*
     * Pagination.
     */
    const pageNum =
      parsePositiveInteger(
        page,
        1
      );

    const limitNum =
      parsePositiveInteger(
        limit,
        12,
        MAX_LIMIT
      );

    const skip =
      (pageNum - 1) *
      limitNum;

    /*
     * Sort object.
     */
    let sortObj = {
      createdAt: -1,
    };

    if (
      sort === "price_asc"
    ) {
      sortObj = {
        price: 1,
      };
    } else if (
      sort === "price_desc"
    ) {
      sortObj = {
        price: -1,
      };
    } else if (
      sort === "rating"
    ) {
      sortObj = {
        averageRating: -1,
        totalReviews: -1,
      };
    }

    /*
     * Query products.
     */
    const [
      items,
      total,
    ] = await Promise.all([
      Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate(
          "categoryId",
          "name slug"
        )
        .lean(),

      Product.countDocuments(
        query
      ),
    ]);

    return res.json({
      success: true,
      data: {
        items,

        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages:
            Math.ceil(
              total / limitNum
            ),
        },
      },
    });
  } catch (err) {
    if (
      err?.message?.startsWith(
        "minPrice"
      ) ||
      err?.message?.startsWith(
        "maxPrice"
      )
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

/*
 * =====================================================
 * PUBLIC: PRODUCT DETAIL
 * =====================================================
 */

exports.getProductById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      console.log(
        "PUBLIC PRODUCT DETAIL ID:",
        id
      );

      /*
       * Validate ObjectId first.
       */
      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      /*
       * Step 1:
       * Find strictly by MongoDB _id.
       */
      const product =
        await Product.findById(
          id
        )
          .populate(
            "categoryId",
            "name slug"
          )
          .lean();

      /*
       * Diagnostic log.
       */
      console.log(
        "PUBLIC PRODUCT DETAIL RESULT:",
        product
          ? {
              id: product._id,
              name: product.name,
              status: product.status,
            }
          : null
      );

      /*
       * Product missing.
       */
      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      /*
       * Public catalog only exposes active products.
       */
      if (
        product.status !== "active"
      ) {
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

/*
 * =====================================================
 * ADMIN: LIST ALL PRODUCTS
 * =====================================================
 */

exports.getAllProductsAdmin =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        page = 1,
        limit = 50,
        search = "",
        status,
        category,
        type,
        gender,
      } = req.query;

      const query = {};

      /*
       * Search.
       */
      if (
        search &&
        String(search).trim()
      ) {
        const searchText =
          String(search).trim();

        query.$or = [
          {
            name: {
              $regex:
                searchText,
              $options: "i",
            },
          },
          {
            brand: {
              $regex:
                searchText,
              $options: "i",
            },
          },
        ];
      }

      /*
       * Status.
       */
      if (status) {
        if (
          ![
            "active",
            "inactive",
          ].includes(status)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid status",
          });
        }

        query.status = status;
      }

      /*
       * Category.
       */
      if (category) {
        if (
          !isValidObjectId(
            category
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid category ID",
          });
        }

        query.categoryId =
          category;
      }

      /*
       * Type.
       */
      if (type) {
        if (
          !ALLOWED_TYPES.includes(
            type
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product type",
          });
        }

        query.type = type;
      }

      /*
       * Gender.
       */
      if (gender) {
        if (
          !ALLOWED_GENDERS.includes(
            gender
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid gender",
          });
        }

        query.gender = gender;
      }

      /*
       * Pagination.
       */
      const pageNum =
        parsePositiveInteger(
          page,
          1
        );

      const limitNum =
        parsePositiveInteger(
          limit,
          50,
          MAX_LIMIT
        );

      const skip =
        (pageNum - 1) *
        limitNum;

      const [
        items,
        total,
      ] = await Promise.all([
        Product.find(query)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNum)
          .populate(
            "categoryId",
            "name slug"
          )
          .lean(),

        Product.countDocuments(
          query
        ),
      ]);

      return res.json({
        success: true,
        data: {
          items,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages:
              Math.ceil(
                total / limitNum
              ),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

/*
 * =====================================================
 * ADMIN: UPDATE PRODUCT
 * =====================================================
 */

exports.updateProduct =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const allowedFields = [
        "name",
        "slug",
        "description",
        "brand",
        "categoryId",
        "price",
        "mrp",
        "discountPercent",
        "stock",
        "sizes",
        "colors",
        "gender",
        "type",
        "material",
        "pattern",
        "images",
        "isFeatured",
        "isNewArrival",
        "isBestSeller",
        "isOnSale",
        "isCustomizable",
        "status",
      ];

      const update = {};

      /*
       * Only allow known fields.
       */
      for (
        const field of allowedFields
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          update[field] =
            req.body[field];
        }
      }

      if (
        Object.keys(update)
          .length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid fields provided for update",
        });
      }

      /*
       * Category validation.
       */
      if (
        Object.prototype.hasOwnProperty.call(
          update,
          "categoryId"
        )
      ) {
        if (
          !isValidObjectId(
            update.categoryId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid categoryId",
          });
        }

        const categoryExists =
          await ensureCategoryExists(
            update.categoryId
          );

        if (!categoryExists) {
          return res.status(400).json({
            success: false,
            message:
              "Category not found or inactive",
          });
        }
      }

      /*
       * Normalize numeric fields.
       */
      if (
        update.price !== undefined
      ) {
        update.price =
          Number(update.price);
      }

      if (
        update.mrp !== undefined
      ) {
        update.mrp =
          update.mrp === "" ||
          update.mrp === null
            ? null
            : Number(update.mrp);
      }

      if (
        update.discountPercent !==
        undefined
      ) {
        update.discountPercent =
          Number(
            update.discountPercent
          );
      }

      if (
        update.stock !== undefined
      ) {
        update.stock =
          Number(update.stock);
      }

      /*
       * Business validation.
       *
       * Only fields that are actually present
       * should participate in the validation.
       */
      const validationError =
        validateProductBusinessRules({
          price:
            update.price ??
            0,

          mrp:
            update.mrp,

          discountPercent:
            update.discountPercent,

          stock:
            update.stock ??
            0,

          sizes:
            update.sizes,

          colors:
            update.colors,

          gender:
            update.gender,

          type:
            update.type,

          images:
            update.images,
        });

      if (
        update.price !== undefined ||
        update.mrp !== undefined ||
        update.discountPercent !==
          undefined ||
        update.stock !==
          undefined ||
        update.sizes !== undefined ||
        update.colors !== undefined ||
        update.gender !== undefined ||
        update.type !== undefined ||
        update.images !== undefined
      ) {
        if (validationError) {
          return res.status(400).json({
            success: false,
            message:
              validationError,
          });
        }
      }

      /*
       * String validation.
       */
      if (
        update.name !==
        undefined
      ) {
        if (
          typeof update.name !==
            "string" ||
          !update.name.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "name must be a non-empty string",
          });
        }

        update.name =
          update.name.trim();
      }

      if (
        update.slug !==
        undefined
      ) {
        if (
          typeof update.slug !==
            "string" ||
          !update.slug.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "slug must be a non-empty string",
          });
        }

        update.slug =
          update.slug.trim();
      }

      if (
        update.description !==
        undefined
      ) {
        if (
          typeof update.description !==
            "string" ||
          !update.description.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "description must be a non-empty string",
          });
        }

        update.description =
          update.description.trim();
      }

      if (
        update.brand !==
        undefined
      ) {
        if (
          typeof update.brand ===
          "string"
        ) {
          update.brand =
            update.brand.trim();
        }
      }

      if (
        update.material !==
        undefined
      ) {
        if (
          typeof update.material ===
          "string"
        ) {
          update.material =
            update.material.trim();
        }
      }

      if (
        update.pattern !==
        undefined
      ) {
        if (
          typeof update.pattern ===
          "string"
        ) {
          update.pattern =
            update.pattern.trim();
        }
      }

      /*
       * Boolean normalization.
       *
       * This also supports multipart/form-data
       * where booleans arrive as strings.
       */
      const booleanFields = [
        "isFeatured",
        "isNewArrival",
        "isBestSeller",
        "isOnSale",
        "isCustomizable",
      ];

      for (
        const field of booleanFields
      ) {
        if (
          update[field] !==
          undefined
        ) {
          if (
            typeof update[field] ===
            "string"
          ) {
            update[field] =
              update[field].toLowerCase() ===
              "true";
          } else {
            update[field] =
              Boolean(
                update[field]
              );
          }
        }
      }

      /*
       * Find and update.
       */
      const updated =
        await Product.findByIdAndUpdate(
          id,
          update,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            "categoryId",
            "name slug"
          )
          .lean();

      if (!updated) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      return res.json({
        success: true,
        data: {
          product: updated,
        },
      });
    } catch (err) {
      if (
        err?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Product slug already exists",
        });
      }

      next(err);
    }
  };

/*
 * =====================================================
 * ADMIN: SOFT DELETE PRODUCT
 * =====================================================
 */

exports.softDeleteProduct =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const updated =
        await Product.findByIdAndUpdate(
          id,
          {
            status: "inactive",
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      return res.json({
        success: true,
        message:
          "Product marked as inactive",
      });
    } catch (err) {
      next(err);
    }
  };