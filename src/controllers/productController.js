const Product = require('../models/Product');

// ADMIN: create product
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name, slug, description, brand,
      categoryId, price, mrp, discountPercent,
      stock, sizes, colors, gender, type,
      material, pattern, images,
      isFeatured, isNewArrival, isBestSeller, isOnSale,
      status
    } = req.body;

    if (!name || !slug || !description || !categoryId || price == null || stock == null || !type) {
      return res.status(400).json({
        success: false,
        message: 'name, slug, description, categoryId, price, stock, type are required',
      });
    }

    const product = await Product.create({
      name,
      slug,
      description,
      brand: brand || '',
      categoryId,
      price,
      mrp: mrp ?? null,
      discountPercent: discountPercent ?? 0,
      stock,
      sizes: sizes || [],
      colors: colors || [],
      gender: gender || 'unisex',
      type,
      material: material || '',
      pattern: pattern || '',
      images: images || [],
      isFeatured: !!isFeatured,
      isNewArrival: !!isNewArrival,
      isBestSeller: !!isBestSeller,
      isOnSale: !!isOnSale,
      status: status || 'active',
    });

    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
};

// PUBLIC: list products
exports.getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      type,
      gender,
      minPrice,
      maxPrice,
      sort = 'new',
      page = 1,
      limit = 12,
    } = req.query;

    const query = { };
    console.log('GET /api/products query:', req.query);
    console.log('Mongo query object:', query);
    if (category) query.categoryId = category;
    if (type) query.type = type;
    if (gender) query.gender = gender;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    if (sort === 'price_desc') sortObj = { price: -1 };
    if (sort === 'rating') sortObj = { averageRating: -1 };

    const [items, total] = await Promise.all([
      Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('categoryId', 'name slug'),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUBLIC: product detail
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('categoryId', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
};

// ADMIN: list all products (including inactive)
exports.getAllProductsAdmin = async (req, res, next) => {
  try {
    const items = await Product.find()
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name slug');

    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

// ADMIN: update product
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true })
      .populate('categoryId', 'name slug');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: { product: updated } });
  } catch (err) {
    next(err);
  }
};

// ADMIN: soft delete product (mark inactive)
exports.softDeleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Product.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product marked as inactive' });
  } catch (err) {
    next(err);
  }
};
