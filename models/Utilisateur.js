const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const utilisateurSchema = new mongoose.Schema({
  nom:      { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  mot_de_passe: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'caissier'], required: true },
  boutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' },
}, { timestamps: true });

utilisateurSchema.pre('save', async function (next) {
  if (!this.isModified('mot_de_passe')) return next();
  const salt = await bcrypt.genSalt(10);
  this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, salt);
  next();
});

utilisateurSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.mot_de_passe);
};

module.exports = mongoose.model('Utilisateur', utilisateurSchema);
