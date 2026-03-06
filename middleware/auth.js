const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

const auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Token manquant', data: null });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await Utilisateur.findById(decoded.id).populate('boutique');
    if (!user) return res.status(401).json({ success: false, message: 'Utilisateur introuvable', data: null });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token invalide', data: null });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ success: false, message: 'Accès refusé', data: null });
  }
  next();
};

module.exports = { auth, requireRole };
