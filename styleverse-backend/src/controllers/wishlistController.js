const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user.userId })
      .populate('productIds', 'name price images status');

    res.json({
      success: true,
      data: { wishlist: wishlist || { userId: req.user.userId, productIds: [] } },
    });
  } catch (err) {
    next(err);
  }
};

exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ userId: req.user.userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId: req.user.userId, productIds: [] });
    }

    const already = wishlist.productIds.some((id) => id.toString() === productId);
    if (!already) wishlist.productIds.push(productId);

    await wishlist.save();

    const populated = await Wishlist.findOne({ userId: req.user.userId })
      .populate('productIds', 'name price images status');

    res.status(201).json({ success: true, data: { wishlist: populated } });
  } catch (err) {
    next(err);
  }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ userId: req.user.userId });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    wishlist.productIds = wishlist.productIds.filter((id) => id.toString() !== productId);
    await wishlist.save();

    const populated = await Wishlist.findOne({ userId: req.user.userId })
      .populate('productIds', 'name price images status');

    res.json({ success: true, data: { wishlist: populated } });
  } catch (err) {
    next(err);
  }
};