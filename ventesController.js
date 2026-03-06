const mongoose       = require('mongoose');
const Vente          = require('./models/Vente');
const Produit        = require('./models/Produit');
const MouvementStock = require('./models/MouvementStock');
const { sendSuccess, sendError, logActivity } = require('./middleware/helpers');

// POST /api/ventes
const create = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { boutique_id, lignes, mode_paiement, remise_pct = 0, montant_recu, note } = req.body;

    if (!boutique_id || !lignes?.length || !mode_paiement) {
      await session.abortTransaction();
      return sendError(res, 'Champs requis : boutique_id, lignes, mode_paiement.');
    }

    // ── 1. Vérifier chaque produit et calculer les totaux ─────────────────────
    let sousTotal = 0;
    const lignesValidees = [];

    for (const ligne of lignes) {
      const produit = await Produit.findOne({ _id: ligne.produit_id, actif: true, boutique: boutique_id }).session(session);
      if (!produit) {
        await session.abortTransaction();
        return sendError(res, `Produit ID ${ligne.produit_id} introuvable dans cette boutique.`);
      }
      if (produit.stock < ligne.quantite) {
        await session.abortTransaction();
        return sendError(res, `Stock insuffisant pour "${produit.nom}" (disponible: ${produit.stock}).`);
      }
      const ligneTotal = produit.prix_vente * ligne.quantite;
      sousTotal += ligneTotal;
      lignesValidees.push({
        produit: produit._id,
        nom_produit: produit.nom,
        prix_unitaire: produit.prix_vente,
        quantite: ligne.quantite,
        sous_total: ligneTotal,
        stock_avant: produit.stock,
      });
    }

    // ── 2. Calculer remise et total ───────────────────────────────────────────
    const remiseMontant = sousTotal * (remise_pct / 100);
    const total = sousTotal - remiseMontant;
    const monnaie = mode_paiement === 'Espèces' && montant_recu > total ? montant_recu - total : 0;

    // ── 3. Créer la vente ─────────────────────────────────────────────────────
    const [vente] = await Vente.create([{
      boutique: boutique_id,
      caissier: req.user._id,
      lignes: lignesValidees.map(({ stock_avant, ...l }) => l),
      sous_total: sousTotal,
      remise_pct,
      remise_montant: remiseMontant,
      total,
      mode_paiement,
      montant_recu: montant_recu || total,
      monnaie,
      note,
    }], { session });

    // ── 4. Décrémenter le stock + log mouvements ──────────────────────────────
    for (const ligne of lignesValidees) {
      const stockApres = ligne.stock_avant - ligne.quantite;
      await Produit.findByIdAndUpdate(ligne.produit, { stock: stockApres }, { session });
      await MouvementStock.create([{
        produit: ligne.produit, boutique: boutique_id, type: 'sortie',
        quantite: ligne.quantite, stock_avant: ligne.stock_avant, stock_apres: stockApres,
        reference: vente.reference, utilisateur: req.user._id,
      }], { session });
    }

    await session.commitTransaction();
    await logActivity(req.user._id, 'création_vente', 'ventes', vente._id, { reference: vente.reference, total }, req.ip);

    const ventePopulée = await Vente.findById(vente._id)
      .populate('boutique', 'nom devise')
      .populate('caissier', 'nom');

    sendSuccess(res, ventePopulée, 'Vente enregistrée.', 201);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally { session.endSession(); }
};

// GET /api/ventes
const getAll = async (req, res, next) => {
  try {
    const { boutique_id, date_debut, date_fin, mode_paiement, limit = 50, page = 1 } = req.query;

    const filter = { statut: 'validée' };
    if (req.user.role === 'caissier') filter.boutique = req.user.boutique;
    else if (boutique_id) filter.boutique = boutique_id;

    if (date_debut || date_fin) {
      filter.createdAt = {};
      if (date_debut) filter.createdAt.$gte = new Date(date_debut);
      if (date_fin)   filter.createdAt.$lte = new Date(date_fin + 'T23:59:59');
    }
    if (mode_paiement) filter.mode_paiement = mode_paiement;

    const [ventes, total] = await Promise.all([
      Vente.find(filter)
        .populate('boutique', 'nom couleur')
        .populate('caissier', 'nom')
        .sort('-createdAt')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      Vente.countDocuments(filter),
    ]);

    sendSuccess(res, { ventes, total, pages: Math.ceil(total / limit), page: parseInt(page) });
  } catch (err) { next(err); }
};

// GET /api/ventes/:id
const getOne = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id)
      .populate('boutique', 'nom adresse telephone devise')
      .populate('caissier', 'nom');
    if (!vente) return sendError(res, 'Vente introuvable.', 404);
    sendSuccess(res, vente);
  } catch (err) { next(err); }
};

// DELETE /api/ventes/:id — Annuler (admin seulement, restaure le stock)
const cancel = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const vente = await Vente.findOne({ _id: req.params.id, statut: 'validée' }).session(session);
    if (!vente) { await session.abortTransaction(); return sendError(res, 'Vente introuvable ou déjà annulée.', 404); }

    for (const ligne of vente.lignes) {
      const produit = await Produit.findById(ligne.produit).session(session);
      if (produit) {
        const stockApres = produit.stock + ligne.quantite;
        await Produit.findByIdAndUpdate(ligne.produit, { stock: stockApres }, { session });
        await MouvementStock.create([{
          produit: ligne.produit, boutique: vente.boutique, type: 'entrée',
          quantite: ligne.quantite, stock_avant: produit.stock, stock_apres: stockApres,
          reference: vente.reference, note: 'Annulation vente', utilisateur: req.user._id,
        }], { session });
      }
    }

    vente.statut = 'annulée';
    await vente.save({ session });
    await session.commitTransaction();
    await logActivity(req.user._id, 'annulation_vente', 'ventes', vente._id, { reference: vente.reference }, req.ip);
    sendSuccess(res, null, `Vente ${vente.reference} annulée. Stock restauré.`);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally { session.endSession(); }
};

module.exports = { create, getAll, getOne, cancel };
