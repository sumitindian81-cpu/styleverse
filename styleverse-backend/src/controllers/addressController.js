const Address = require('../models/Address');

exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: { addresses } });
  } catch (err) {
    next(err);
  }
};

exports.createAddress = async (req, res, next) => {
  try {
    const {
      fullName, phone,
      addressLine1, addressLine2,
      city, state, postalCode, country,
      isDefault
    } = req.body;

    if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({ success: false, message: 'Missing required address fields' });
    }

    if (isDefault === true) {
      await Address.updateMany({ userId: req.user.userId }, { $set: { isDefault: false } });
    }

    const address = await Address.create({
      userId: req.user.userId,
      fullName,
      phone,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      postalCode,
      country: country || 'India',
      isDefault: !!isDefault,
    });

    res.status(201).json({ success: true, data: { address } });
  } catch (err) {
    next(err);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.body.isDefault === true) {
      await Address.updateMany({ userId: req.user.userId }, { $set: { isDefault: false } });
    }

    const updated = await Address.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Address not found' });

    res.json({ success: true, data: { address: updated } });
  } catch (err) {
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Address.findOneAndDelete({ _id: id, userId: req.user.userId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Address not found' });

    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
};