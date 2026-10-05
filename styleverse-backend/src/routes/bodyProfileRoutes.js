const express = require("express");

const router = express.Router();

const bodyProfileController = require("../controllers/bodyProfileController");
const authMiddleware = require("../middlewares/authMiddleware");

// ==========================================
// Protected Body Profile Routes
// ==========================================

// Create body profile
router.post(
  "/",
  authMiddleware,
  bodyProfileController.createBodyProfile
);

// Get all my body profiles
router.get(
  "/",
  authMiddleware,
  bodyProfileController.getMyBodyProfiles
);

// Get default body profile
// IMPORTANT: Keep this BEFORE /:id
router.get(
  "/default",
  authMiddleware,
  bodyProfileController.getDefaultBodyProfile
);

// Get one body profile
router.get(
  "/:id",
  authMiddleware,
  bodyProfileController.getBodyProfileById
);

// Update body profile
router.patch(
  "/:id",
  authMiddleware,
  bodyProfileController.updateBodyProfile
);

// Set profile as default
router.post(
  "/:id/default",
  authMiddleware,
  bodyProfileController.setDefaultBodyProfile
);

// Soft delete body profile
router.delete(
  "/:id",
  authMiddleware,
  bodyProfileController.deleteBodyProfile
);

module.exports = router;