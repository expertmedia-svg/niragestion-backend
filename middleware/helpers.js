const JournalActivite = require('../models/JournalActivite');

const sendSuccess = (res, data = null, message = 'OK', status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

const sendError = (res, message = 'Erreur serveur', status = 400) => {
  return res.status(status).json({ success: false, message, data: null });
};

const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: 'Route introuvable', data: null });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur API:', err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, message: err.message || 'Erreur serveur', data: null });
};

const logActivity = async (utilisateurId, action, module, cibleId, meta, ip) => {
  try {
    await JournalActivite.create({
      utilisateur: utilisateurId,
      action,
      module,
      cible: cibleId,
      meta,
      ip,
    });
  } catch (e) {
    console.error('Erreur logActivity:', e.message);
  }
};

module.exports = { sendSuccess, sendError, notFound, errorHandler, logActivity };
