const Category = require('../models/Category');

exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, parentCategoryId, description, imageUrl, isActive } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'name and slug are required' });
    }

    const category = await Category.create({
      name,
      slug,
      parentCategoryId: parentCategoryId || null,
      description: description || '',
      imageUrl: imageUrl || '',
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    res.status(201).json({ success: true, data: { category } });
  } catch (err) {
    next(err);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (err) {
    next(err);
  }
};

exports.getAllCategoriesAdmin = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ success: true, data: { categories } });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Category.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Category not found' });

    res.json({ success: true, data: { category: updated } });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });

    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};