const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Public
router.get('/', productController.getProducts);

// Admin
router.post('/admin', authMiddleware, adminMiddleware, productController.createProduct);
router.get('/admin/all', authMiddleware, adminMiddleware, productController.getAllProductsAdmin);
router.patch('/admin/:id', authMiddleware, adminMiddleware, productController.updateProduct);
router.delete('/admin/:id', authMiddleware, adminMiddleware, productController.softDeleteProduct);

// Public detail (keep last)
router.get('/:id', productController.getProductById);

module.exports = router;