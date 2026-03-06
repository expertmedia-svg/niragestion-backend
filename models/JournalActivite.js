const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  action:      { type: String, required: true },
  module:      { type: String },
  cible:       { type: mongoose.Schema.Types.ObjectId },
  meta:        { type: Object },
  ip:          { type: String },
}, { timestamps: true });

module.exports = mongoose.model('JournalActivite', journalSchema);
