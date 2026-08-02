const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');

exports.createCodOrder = async (req, res, next) => {
  try {
    const { addressId } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: 'addressId is required' });
    }

    const address = await Address.findOne({ _id: addressId, userId: req.user.userId });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const cart = await Cart.findOne({ userId: req.user.userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const p = item.productId;

      if (!p || p.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Cart has invalid/inactive product' });
      }

      const price = Number(p.price);
      subtotal += price * item.quantity;

      orderItems.push({
        productId: p._id,
        name: p.name,
        thumbnail: (p.images && p.images[0] && p.images[0].url) ? p.images[0].url : '',
        quantity: item.quantity,
        price,
        selectedSize: item.selectedSize || '',
        selectedColor: item.selectedColor || '',
      });
    }

    const shippingFee = 0;
    const discount = 0;
    const totalAmount = subtotal - discount + shippingFee;

    const order = await Order.create({
      userId: req.user.userId,
      items: orderItems,
      subtotal,
      discount,
      shippingFee,
      totalAmount,
      currency: 'INR',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      status: 'pending',
    });

    // clear cart
    cart.items = [];
    cart.appliedCouponId = null;
    await cart.save();

    res.status(201).json({ success: true, data: { order } });
  } catch (err) {
    next(err);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: { orders } });
  } catch (err) {
    next(err);
  }
};
exports.getMyOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('getMyOrderById HIT, id=', id);
//exports.getMyOrderById = async (req, res, next) => {
  //try {
    //const { id } = req.params;

    const order = await Order.findOne({ _id: id, userId: req.user.userId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.json({ success: true, data: { order } });
  } catch (err) {
    next(err);
  }
};