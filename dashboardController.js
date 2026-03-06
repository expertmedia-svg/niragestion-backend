const mongoose  = require('mongoose');
const Vente     = require('./models/Vente');
const Produit   = require('./models/Produit');
const Boutique  = require('./models/Boutique');
const { sendSuccess } = require('./middleware/helpers');

// GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const boutiqueFilter = req.user.role === 'caissier'
      ? { boutique: req.user.boutique }
      : {};
    const boutiqueFilterProd = req.user.role === 'caissier'
      ? { boutique: req.user.boutique }
      : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [caJour, caMois, stockCritique, topProduits, modesVente, parBoutique, benefice] = await Promise.all([
      // CA aujourd'hui
      Vente.aggregate([
        { $match: { ...boutiqueFilter, statut: 'validée', createdAt: { $gte: today } } },
        { $group: { _id: null, ca: { $sum: '$total' }, nb: { $sum: 1 } } }
      ]),
      // CA mois
      Vente.aggregate([
        { $match: { ...boutiqueFilter, statut: 'validée', createdAt: { $gte: firstOfMonth } } },
        { $group: { _id: null, ca: { $sum: '$total' }, nb: { $sum: 1 } } }
      ]),
      // Stock critique
      Produit.find({ ...boutiqueFilterProd, actif: true, $expr: { $lte: ['$stock', '$seuil_alerte'] } })
        .populate('boutique', 'nom')
        .select('nom stock seuil_alerte boutique')
        .sort('stock'),
      // Top 5 produits
      Vente.aggregate([
        { $match: { ...boutiqueFilter, statut: 'validée' } },
        { $unwind: '$lignes' },
        { $group: { _id: '$lignes.nom_produit', qte: { $sum: '$lignes.quantite' }, ca: { $sum: '$lignes.sous_total' } } },
        { $sort: { qte: -1 } }, { $limit: 5 },
        { $project: { nom_produit: '$_id', qte_totale: '$qte', ca_total: '$ca', _id: 0 } }
      ]),
      // Modes de paiement
      Vente.aggregate([
        { $match: { ...boutiqueFilter, statut: 'validée' } },
        { $group: { _id: '$mode_paiement', nb: { $sum: 1 }, total: { $sum: '$total' } } },
        { $project: { mode_paiement: '$_id', nb: 1, total: 1, _id: 0 } }
      ]),
      // CA par boutique (admin)
      req.user.role === 'admin' ? Vente.aggregate([
        { $match: { statut: 'validée' } },
        { $group: { _id: '$boutique', ca: { $sum: '$total' }, nb: { $sum: 1 } } },
        { $lookup: { from: 'boutiques', localField: '_id', foreignField: '_id', as: 'boutiqueInfo' } },
        { $unwind: '$boutiqueInfo' },
        { $project: { nom: '$boutiqueInfo.nom', couleur: '$boutiqueInfo.couleur', ca: 1, nb: 1, _id: 0 } }
      ]) : Promise.resolve([]),
      // Bénéfice brut estimé
      Vente.aggregate([
        { $match: { ...boutiqueFilter, statut: 'validée' } },
        { $unwind: '$lignes' },
        { $lookup: { from: 'produits', localField: 'lignes.produit', foreignField: '_id', as: 'p' } },
        { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, benefice: { $sum: { $multiply: [{ $subtract: ['$lignes.prix_unitaire', { $ifNull: ['$p.prix_achat', 0] }] }, '$lignes.quantite'] } } } }
      ]),
    ]);

    sendSuccess(res, {
      ca_jour:        { montant: caJour[0]?.ca || 0,  nb_ventes: caJour[0]?.nb || 0 },
      ca_mois:        { montant: caMois[0]?.ca || 0,  nb_ventes: caMois[0]?.nb || 0 },
      benefice_brut:  benefice[0]?.benefice || 0,
      stock_critique: stockCritique,
      top_produits:   topProduits,
      modes_paiement: modesVente,
      par_boutique:   parBoutique,
    });
  } catch (err) { next(err); }
};

// GET /api/rapports/ventes
const getRapportVentes = async (req, res, next) => {
  try {
    const { date_debut, date_fin, boutique_id, groupby = 'jour' } = req.query;
    const boutiqueFilter = req.user.role === 'caissier' ? req.user.boutique : boutique_id ? new mongoose.Types.ObjectId(boutique_id) : null;

    const match = { statut: 'validée' };
    if (boutiqueFilter) match.boutique = boutiqueFilter;
    if (date_debut || date_fin) {
      match.createdAt = {};
      if (date_debut) match.createdAt.$gte = new Date(date_debut);
      if (date_fin)   match.createdAt.$lte = new Date(date_fin + 'T23:59:59');
    }

    const dateGroupMap = {
      jour:    { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
      semaine: { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } },
      mois:    { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
    };

    const result = await Vente.aggregate([
      { $match: match },
      { $group: {
        _id: dateGroupMap[groupby] || dateGroupMap.jour,
        nb_ventes: { $sum: 1 },
        ca: { $sum: '$total' },
        remises: { $sum: '$remise_montant' },
        panier_moyen: { $avg: '$total' },
      }},
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
    ]);

    sendSuccess(res, result);
  } catch (err) { next(err); }
};

// GET /api/rapports/stock
const getRapportStock = async (req, res, next) => {
  try {
    const boutiqueFilter = req.user.role === 'caissier' ? { boutique: req.user.boutique } : req.query.boutique_id ? { boutique: req.query.boutique_id } : {};

    const produits = await Produit.find({ ...boutiqueFilter, actif: true })
      .populate('categorie', 'nom')
      .populate('boutique', 'nom')
      .sort('stock');

    const valeurTotale = produits.reduce((s, p) => s + p.stock * p.prix_achat, 0);
    const nbCritiques  = produits.filter(p => p.stock <= p.seuil_alerte).length;

    sendSuccess(res, { produits, valeur_totale: valeurTotale, nb_critiques: nbCritiques });
  } catch (err) { next(err); }
};

// GET /api/rapports/produits
const getRapportProduits = async (req, res, next) => {
  try {
    const { date_debut, date_fin, boutique_id, limit = 10 } = req.query;
    const boutiqueFilter = req.user.role === 'caissier' ? req.user.boutique : boutique_id ? new mongoose.Types.ObjectId(boutique_id) : null;

    const match = { statut: 'validée' };
    if (boutiqueFilter) match.boutique = boutiqueFilter;
    if (date_debut || date_fin) {
      match.createdAt = {};
      if (date_debut) match.createdAt.$gte = new Date(date_debut);
      if (date_fin)   match.createdAt.$lte = new Date(date_fin + 'T23:59:59');
    }

    const result = await Vente.aggregate([
      { $match: match },
      { $unwind: '$lignes' },
      { $group: {
        _id: { produit: '$lignes.produit', nom: '$lignes.nom_produit' },
        qte_vendue: { $sum: '$lignes.quantite' },
        ca_total: { $sum: '$lignes.sous_total' },
        nb_ventes: { $sum: 1 },
      }},
      { $sort: { qte_vendue: -1 } },
      { $limit: parseInt(limit) },
      { $project: { produit_id: '$_id.produit', nom_produit: '$_id.nom', qte_vendue: 1, ca_total: 1, nb_ventes: 1, _id: 0 } }
    ]);

    sendSuccess(res, result);
  } catch (err) { next(err); }
};

module.exports = { getDashboard, getRapportVentes, getRapportStock, getRapportProduits };
