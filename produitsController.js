const Produit = require('./models/Produit');
const MouvementStock = require('./models/MouvementStock');
const { sendSuccess, sendError } = require('./middleware/helpers');

// GET /api/produits
const getAll = async (req, res, next) => {
  try {
    const { boutique_id, alerte, search, categorie_id } = req.query;

    const filter = { actif: true };
    if (req.user && req.user.role === 'caissier') {
      filter.boutique = req.user.boutique;
    } else if (boutique_id) {
      filter.boutique = boutique_id;
    }
    if (categorie_id) filter.categorie = categorie_id;
    if (alerte) filter.$expr = { $lte: ['$stock', '$seuil_alerte'] };
    if (search) {
      filter.$or = [
        { nom: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
      ];
    }

    const produits = await Produit.find(filter)
      .populate('categorie', 'nom')
      .populate('boutique', 'nom couleur')
      .sort('nom');

    sendSuccess(res, produits);
  } catch (err) { next(err); }
};

// POST /api/produits
const create = async (req, res, next) => {
  try {
    const { nom, boutique, categorie, prix_achat, prix_vente, stock = 0, seuil_alerte = 0, code } = req.body;
    if (!nom || !boutique || prix_achat == null || prix_vente == null) {
      return sendError(res, 'Champs requis: nom, boutique, prix_achat, prix_vente', 400);
    }

    const produit = await Produit.create({
      nom,
      boutique,
      categorie: categorie || null,
      prix_achat,
      prix_vente,
      stock,
      seuil_alerte,
      code,
    });

    if (stock > 0) {
      await MouvementStock.create({
        produit: produit._id,
        boutique,
        type: 'entrée',
        quantite: stock,
        stock_avant: 0,
        stock_apres: stock,
        note: 'Stock initial',
        utilisateur: req.user?._id,
      });
    }

    sendSuccess(res, produit, 'Produit créé', 201);
  } catch (err) { next(err); }
};

// POST /api/produits/:id/stock
const mouvementStock = async (req, res, next) => {
  try {
    const { type, quantite, note } = req.body;
    if (!type || !quantite) return sendError(res, 'type et quantite requis', 400);

    const produit = await Produit.findById(req.params.id);
    if (!produit) return sendError(res, 'Produit introuvable', 404);

    const qte = Number(quantite);
    let stockAvant = produit.stock;
    let stockApres = stockAvant;

    if (type === 'entrée') stockApres += qte;
    else if (type === 'sortie') {
      if (qte > stockAvant) return sendError(res, 'Stock insuffisant', 400);
      stockApres -= qte;
    } else {
      return sendError(res, 'Type invalide', 400);
    }

    produit.stock = stockApres;
    await produit.save();

    const mv = await MouvementStock.create({
      produit: produit._id,
      boutique: produit.boutique,
      type,
      quantite: qte,
      stock_avant: stockAvant,
      stock_apres: stockApres,
      note,
      utilisateur: req.user?._id,
    });

    sendSuccess(res, mv, 'Mouvement enregistré');
  } catch (err) { next(err); }
};

module.exports = { getAll, create, mouvementStock };
