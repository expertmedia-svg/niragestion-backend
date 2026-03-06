const mongoose = require('mongoose');

const categorieSchema = new mongoose.Schema({
  nom:      { type: String, required: true },
  couleur:  { type: String, default: '#3B82F6' },
}, { timestamps: true });

module.exports = mongoose.model('Categorie', categorieSchema);
