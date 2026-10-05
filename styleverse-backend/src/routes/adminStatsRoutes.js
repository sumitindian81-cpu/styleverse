const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const adminStatsController = require("../controllers/adminStatsController");

router.get("/stats", authMiddleware, adminMiddleware, adminStatsController.getStats);

module.exports = router;
