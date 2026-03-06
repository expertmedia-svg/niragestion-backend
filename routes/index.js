const express = require('express');
const router = express.Router();

const { auth, requireRole } = require('../middleware/auth');
const { login } = require('../authController');
const { getDashboard, getRapportVentes, getRapportStock, getRapportProduits } = require('../dashboardController');
const ventesCtrl = require('../ventesController');
const produitsCtrl = require('../produitsController');
const boutiquesCtrl = require('../boutiquesController');
const categoriesCtrl = require('../categoriesController');

// Auth
router.post('/auth/login', login);

// Dashboard & rapports (protégés)
router.get('/dashboard', auth, getDashboard);
router.get('/rapports/ventes', auth, getRapportVentes);
router.get('/rapports/stock', auth, getRapportStock);
router.get('/rapports/produits', auth, getRapportProduits);

// Ventes
router.get('/ventes', auth, ventesCtrl.getAll);
router.get('/ventes/:id', auth, ventesCtrl.getOne);
router.post('/ventes', auth, ventesCtrl.create);
router.delete('/ventes/:id', auth, requireRole('admin'), ventesCtrl.cancel);

// Produits
router.get('/produits', auth, produitsCtrl.getAll);
router.post('/produits', auth, requireRole('admin'), produitsCtrl.create);
router.post('/produits/:id/stock', auth, requireRole('admin'), produitsCtrl.mouvementStock);

// Boutiques
router.get('/boutiques', auth, boutiquesCtrl.getAll);
router.post('/boutiques', auth, requireRole('admin'), boutiquesCtrl.create);

// Catégories
router.get('/categories', auth, categoriesCtrl.getAll);

module.exports = router;
