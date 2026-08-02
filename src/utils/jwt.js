const jwt = require('jsonwebtoken');

function generateToken(user) {
  // सिर्फ ज़रूरी fields payload में
  const payload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret);
}
// Self test on startup (optional)


// तुरंत call कर दो
//selfTestJWT();
module.exports = {
  generateToken,
  verifyToken,
};