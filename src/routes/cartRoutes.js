const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, cartController.getCart);
router.post('/', authMiddleware, cartController.addToCart);
router.patch('/:itemId', authMiddleware, cartController.updateCartItem);
router.delete('/:itemId', authMiddleware, cartController.removeCartItem);

module.exports = router;