const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/cod', authMiddleware, orderController.createCodOrder);
router.get('/', authMiddleware, orderController.getMyOrders);
router.get('/:id', authMiddleware, orderController.getMyOrderById);

module.exports = router;