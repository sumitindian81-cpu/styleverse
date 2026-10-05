const express = require("express");
const router = express.Router();

const studioController = require("../controllers/studioController");

router.get("/base-items", studioController.getBaseItems);

module.exports = router;