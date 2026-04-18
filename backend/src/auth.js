const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { readDb } = require('./db');

function createToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing bearer token.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const db = await readDb();
    const user = db.users.find((u) => u.id === payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token user.' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

async function validatePassword(user, plainPassword) {
  return bcrypt.compare(plainPassword, user.passwordHash);
}

module.exports = {
  createToken,
  authenticate,
  requireAdmin,
  validatePassword,
};
