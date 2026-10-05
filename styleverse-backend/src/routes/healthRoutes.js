const express = require("express");
const router = express.Router();

// GET /api/health
router.get("/", (req, res) => {
  res.json({ success: true, message: "Styleverse API healthy" });
});

module.exports = router;