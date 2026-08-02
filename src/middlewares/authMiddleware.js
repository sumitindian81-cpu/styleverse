const { verifyToken } = require('../utils/jwt');

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    //console.log('Auth header:', authHeader); // DEBUG LINE

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    //console.log('Token to verify:', token); // DEBUG LINE

    try {
      const decoded = verifyToken(token);
      console.log('Decoded token:', decoded); // DEBUG LINE
      req.user = decoded;
      next();
    } catch (err) {
      //console.error('JWT verify error:', err);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (err) {
    next(err);
  }
};