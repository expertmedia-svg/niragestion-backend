require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const connectDB                    = require('./config/database');
const routes                       = require('./routes/index');
const { errorHandler, notFound }   = require('./middleware/helpers');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connexion MongoDB ─────────────────────────────────────────────────────────
connectDB();

// ── Sécurité ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' }
}));
app.use('/api/', rateLimit({
  windowMs: 60 * 1000, max: 300,
  message: { success: false, message: 'Trop de requêtes.' }
}));

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Fichiers statiques ────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
app.get('/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    db: dbState[mongoose.connection.readyState],
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// ── Routes API ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 & Erreurs ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Démarrage ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║      🏬  BoutiqueGest API — MongoDB           ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log(`║  Port  : ${PORT}                                ║`);
  console.log(`║  Env   : ${(process.env.NODE_ENV || 'development').padEnd(12)}                 ║`);
  console.log(`║  DB    : MongoDB                              ║`);
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
