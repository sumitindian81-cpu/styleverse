const express = require("express");

const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const upload = require("../middlewares/uploadMiddleware");

const adminProductController = require("../controllers/adminProductController");

/*
 * =====================================================
 * ADMIN PRODUCT ROUTES
 * Base: /api/admin
 * =====================================================
 */

/*
 * GET /api/admin/products
 *
 * Admin product listing
 * Supports:
 * - search
 * - pagination
 */
router.get(
  "/products",
  authMiddleware,
  adminMiddleware,
  adminProductController.listProducts
);

/*
 * GET /api/admin/products/:id
 *
 * Get single product for admin
 */
router.get(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  adminProductController.getProduct
);

/*
 * POST /api/admin/products
 *
 * Create product
 *
 * Content-Type:
 * multipart/form-data
 *
 * Accepted image field names:
 * - images
 * - image
 *
 * Maximum:
 * - 5 files
 */
router.post(
  "/products",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    {
      name: "images",
      maxCount: 5,
    },
    {
      name: "image",
      maxCount: 5,
    },
  ]),
  adminProductController.createProduct
);

/*
 * PATCH /api/admin/products/:id
 *
 * Update product
 *
 * Content-Type:
 * multipart/form-data
 *
 * Accepted image field names:
 * - images
 * - image
 *
 * Maximum:
 * - 5 files per field
 */
router.patch(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    {
      name: "images",
      maxCount: 5,
    },
    {
      name: "image",
      maxCount: 5,
    },
  ]),
  adminProductController.updateProduct
);

/*
 * DELETE /api/admin/products/:id
 *
 * Delete product
 */
router.delete(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  adminProductController.deleteProduct
);

module.exports = router;