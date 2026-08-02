const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId })
      .populate('items.productId', 'name price images stock status');

    res.json({ success: true, data: { cart: cart || { userId: req.user.userId, items: [] } } });
  } catch (err) {
    next(err);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, selectedSize = '', selectedColor = '' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, message: 'quantity must be >= 1' });
    }

    let cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      cart = await Cart.create({ userId: req.user.userId, items: [] });
    }

    // same product + same variant => merge
    const existingIndex = cart.items.findIndex((it) =>
      it.productId?.toString() === productId &&
      (it.selectedSize || '') === (selectedSize || '') &&
      (it.selectedColor || '') === (selectedColor || '')
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += qty;
    } else {
      cart.items.push({
        productId,
        quantity: qty,
        selectedSize,
        selectedColor,
      });
    }

    await cart.save();

    const populated = await Cart.findOne({ userId: req.user.userId })
      .populate('items.productId', 'name price images stock status');

    res.status(201).json({ success: true, data: { cart: populated } });
  } catch (err) {
    next(err);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, message: 'quantity must be >= 1' });
    }

    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });

    item.quantity = qty;
    await cart.save();

    const populated = await Cart.findOne({ userId: req.user.userId })
      .populate('items.productId', 'name price images stock status');

    res.json({ success: true, data: { cart: populated } });
  } catch (err) {
    next(err);
  }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });

    item.deleteOne();
    await cart.save();

    const populated = await Cart.findOne({ userId: req.user.userId })
      .populate('items.productId', 'name price images stock status');

    res.json({ success: true, data: { cart: populated } });
  } catch (err) {
    next(err);
  }
};