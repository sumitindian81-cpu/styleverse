const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

function generateToken(user) {
  const payload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  });
}

function verifyToken(token) {
  if (!token) {
    throw new Error("Token is required");
  }

  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  generateToken,
  verifyToken,
};