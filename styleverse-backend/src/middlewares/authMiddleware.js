const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const user = await User.findById(decoded.userId).select(
      "+passwordChangedAt"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Blocked users immediately lose access
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account blocked by admin",
      });
    }

    // Invalidate tokens issued before the last password change.
    if (
      user.passwordChangedAt &&
      decoded.iat &&
      decoded.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please log in again.",
      });
    }

    // Always use the latest role from database.
    req.user = {
      userId: user._id.toString(),
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};