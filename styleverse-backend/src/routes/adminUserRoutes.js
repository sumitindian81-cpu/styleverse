const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const adminUserController = require("../controllers/adminUserController");

// GET /api/admin/users
router.get("/users", authMiddleware, adminMiddleware, adminUserController.listUsers);

// PATCH /api/admin/users/:id  (block/unblock)
router.patch("/users/:id", authMiddleware, adminMiddleware, adminUserController.updateUserStatus);

module.exports = router;