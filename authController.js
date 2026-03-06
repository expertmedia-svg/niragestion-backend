const jwt = require('jsonwebtoken');
const Utilisateur = require('./models/Utilisateur');
const { sendSuccess, sendError } = require('./middleware/helpers');

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 'Email et mot de passe requis', 400);

    const user = await Utilisateur.findOne({ email }).populate('boutique');
    if (!user) return sendError(res, 'Identifiants invalides', 401);

    const ok = await user.comparePassword(password);
    if (!ok) return sendError(res, 'Identifiants invalides', 401);

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    const userObj = user.toObject();
    delete userObj.mot_de_passe;

    return sendSuccess(res, { token, user: userObj }, 'Connecté');
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
