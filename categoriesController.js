const Categorie = require('./models/Categorie');
const { sendSuccess } = require('./middleware/helpers');

// GET /api/categories
const getAll = async (req, res, next) => {
  try {
    const cats = await Categorie.find().sort('nom');
    sendSuccess(res, cats);
  } catch (err) { next(err); }
};

module.exports = { getAll };
