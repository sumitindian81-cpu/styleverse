const express = require("express");

const router = express.Router();

const cartController = require("../controllers/cartController");

const authMiddleware = require("../middlewares/authMiddleware");

// Get current user's cart
router.get(
  "/",
  authMiddleware,
  cartController.getCart
);

// Checkout price preview
router.get(
  "/checkout",
  authMiddleware,
  cartController.getCheckoutPreview
);

// Add normal product or custom design
router.post(
  "/",
  authMiddleware,
  cartController.addToCart
);

// Update cart item quantity
router.patch(
  "/:itemId",
  authMiddleware,
  cartController.updateCartItem
);

// Remove cart item
router.delete(
  "/:itemId",
  authMiddleware,
  cartController.removeCartItem
);

// Add complete saved outfit to cart
router.post(
  "/outfit",
  authMiddleware,
  cartController.addOutfitToCart
);

module.exports = router;