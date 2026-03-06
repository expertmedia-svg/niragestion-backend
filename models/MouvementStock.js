const mongoose = require('mongoose');

const mouvementStockSchema = new mongoose.Schema({
  produit:      { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  boutique:     { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  type:         { type: String, enum: ['entrée', 'sortie'], required: true },
  quantite:     { type: Number, required: true },
  stock_avant:  { type: Number, required: true },
  stock_apres:  { type: Number, required: true },
  reference:    { type: String },
  note:         { type: String },
  utilisateur:  { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
}, { timestamps: true });

module.exports = mongoose.model('MouvementStock', mouvementStockSchema);
