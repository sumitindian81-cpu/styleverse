const express = require("express");
const router = express.Router();

const customDesignController = require("../controllers/customDesignController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, customDesignController.createCustomDesign);
router.get("/", authMiddleware, customDesignController.getMyCustomDesigns);
router.get("/:id", authMiddleware, customDesignController.getCustomDesignById);

router.patch("/:id", authMiddleware, customDesignController.updateCustomDesign); // ✅ add
router.delete("/:id", authMiddleware, customDesignController.deleteCustomDesign); // ✅ add

router.patch("/:id", authMiddleware, customDesignController.updateCustomDesign); // Phase 10
router.delete("/:id", authMiddleware, customDesignController.deleteCustomDesign); // Phase 10

module.exports = router;