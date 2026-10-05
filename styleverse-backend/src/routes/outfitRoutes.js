const express = require("express");

const router = express.Router();

const outfitController = require("../controllers/outfitController");
const authMiddleware = require("../middlewares/authMiddleware");

// ==========================================
// Protected Outfit Routes
// ==========================================

// Create outfit
router.post(
  "/",
  authMiddleware,
  outfitController.createOutfit
);

// Get my outfits
router.get(
  "/",
  authMiddleware,
  outfitController.getMyOutfits
);

// ==========================================
// Public Shared Outfit Route
// IMPORTANT: Keep this BEFORE /:id
// ==========================================

router.get(
  "/shared/:token",
  outfitController.getSharedOutfit
);

// Get one of my outfits
router.get(
  "/:id",
  authMiddleware,
  outfitController.getOutfitById
);

// Update my outfit
router.patch(
  "/:id",
  authMiddleware,
  outfitController.updateOutfit
);

// Delete my outfit
router.delete(
  "/:id",
  authMiddleware,
  outfitController.deleteOutfit
);

// ==========================================
// Share / Unshare
// ==========================================

// Share my outfit
router.post(
  "/:id/share",
  authMiddleware,
  outfitController.shareOutfit
);

// Disable sharing
router.delete(
  "/:id/share",
  authMiddleware,
  outfitController.unshareOutfit
);

module.exports = router;