const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Public
router.get('/', categoryController.getCategories);

// Admin
router.post('/admin', authMiddleware, adminMiddleware, categoryController.createCategory);
router.get('/admin', authMiddleware, adminMiddleware, categoryController.getAllCategoriesAdmin);
router.patch('/admin/:id', authMiddleware, adminMiddleware, categoryController.updateCategory);
router.delete('/admin/:id', authMiddleware, adminMiddleware, categoryController.deleteCategory);

module.exports = router;