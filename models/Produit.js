const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema({
  nom:           { type: String, required: true },
  code:          { type: String },
  boutique:      { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  categorie:     { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie' },
  prix_achat:    { type: Number, required: true },
  prix_vente:    { type: Number, required: true },
  stock:         { type: Number, default: 0 },
  seuil_alerte:  { type: Number, default: 0 },
  actif:         { type: Boolean, default: true },
}, { timestamps: true });

produitSchema.index({ boutique: 1, nom: 1 });

module.exports = mongoose.model('Produit', produitSchema);
