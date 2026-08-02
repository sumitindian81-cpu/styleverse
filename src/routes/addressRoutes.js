const express = require('express');
const router = express.Router();

const addressController = require('../controllers/addressController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, addressController.getAddresses);
router.post('/', authMiddleware, addressController.createAddress);
router.patch('/:id', authMiddleware, addressController.updateAddress);
router.delete('/:id', authMiddleware, addressController.deleteAddress);

module.exports = router;