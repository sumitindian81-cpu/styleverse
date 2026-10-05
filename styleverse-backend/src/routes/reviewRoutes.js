const express = require("express");
const router = express.Router({ mergeParams: true });

const reviewController = require("../controllers/reviewController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", reviewController.getProductReviews);
router.post("/", authMiddleware, reviewController.upsertReview);

module.exports = router;