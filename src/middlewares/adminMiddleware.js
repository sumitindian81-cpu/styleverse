module.exports = function adminMiddleware(req, res, next) {
  // authMiddleware must run before this
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};