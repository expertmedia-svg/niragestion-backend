const Boutique = require('./models/Boutique');
const { sendSuccess, sendError } = require('./middleware/helpers');

// GET /api/boutiques
const getAll = async (req, res, next) => {
  try {
    const boutiques = await Boutique.find().sort('nom');
    sendSuccess(res, boutiques);
  } catch (err) { next(err); }
};

// POST /api/boutiques (admin)
const create = async (req, res, next) => {
  try {
    const { nom, adresse, telephone, couleur } = req.body;
    if (!nom) return sendError(res, 'Nom requis', 400);
    const b = await Boutique.create({ nom, adresse, telephone, couleur });
    sendSuccess(res, b, 'Boutique créée', 201);
  } catch (err) { next(err); }
};

module.exports = { getAll, create };
