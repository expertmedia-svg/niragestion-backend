const mongoose = require('mongoose');

const boutiqueSchema = new mongoose.Schema({
  nom:       { type: String, required: true },
  adresse:   { type: String },
  telephone: { type: String },
  couleur:   { type: String, default: '#F97316' },
  devise:    { type: String, default: 'FCFA' },
}, { timestamps: true });

module.exports = mongoose.model('Boutique', boutiqueSchema);
