const mongoose = require('mongoose');

const ligneVenteSchema = new mongoose.Schema({
  produit:       { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nom_produit:   { type: String, required: true },
  prix_unitaire: { type: Number, required: true },
  quantite:      { type: Number, required: true, min: 1 },
  sous_total:    { type: Number, required: true },
}, { _id: false });

const venteSchema = new mongoose.Schema({
  reference:     { type: String, unique: true },
  boutique:      { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  caissier:      { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  lignes:        { type: [ligneVenteSchema], required: true },
  sous_total:    { type: Number, required: true },
  remise_pct:    { type: Number, default: 0, min: 0, max: 100 },
  remise_montant:{ type: Number, default: 0 },
  total:         { type: Number, required: true },
  mode_paiement: { type: String, enum: ['Espèces','Orange Money','Moov Money','Carte bancaire'], required: true },
  montant_recu:  { type: Number },
  monnaie:       { type: Number, default: 0 },
  statut:        { type: String, enum: ['validée','annulée'], default: 'validée' },
  note:          { type: String },
}, { timestamps: true });

venteSchema.pre('save', async function (next) {
  if (this.reference) return next();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await mongoose.model('Vente').countDocuments({
    reference: new RegExp(`^VNT-${date}-`)
  });
  this.reference = `VNT-${date}-${String(count + 1).padStart(4, '0')}`;
  next();
});

venteSchema.index({ boutique: 1, createdAt: -1 });
venteSchema.index({ caissier: 1 });

module.exports = mongoose.model('Vente', venteSchema);
