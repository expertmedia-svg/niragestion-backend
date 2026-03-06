require('dotenv').config({ path: '.env' });

const connectDB = require('./config/database');
const Boutique = require('./models/Boutique');
const Categorie = require('./models/Categorie');
const Utilisateur = require('./models/Utilisateur');
const Produit = require('./models/Produit');
const Vente = require('./models/Vente');
const MouvementStock = require('./models/MouvementStock');
const JournalActivite = require('./models/JournalActivite');

const run = async () => {
  await connectDB();

  console.log('🧹 Nettoyage des collections...');
  await Promise.all([
    Boutique.deleteMany({}),
    Categorie.deleteMany({}),
    Utilisateur.deleteMany({}),
    Produit.deleteMany({}),
    Vente.deleteMany({}),
    MouvementStock.deleteMany({}),
    JournalActivite.deleteMany({}),
  ]);

  console.log('📦 Création des boutiques...');
  const nira = await Boutique.create({ nom: 'NIRA Boutique', couleur: '#F97316', devise: 'FCFA' });
  const far = await Boutique.create({ nom: 'France Au Revoir', couleur: '#0EA5E9', devise: 'FCFA' });

  console.log('📂 Création des catégories...');
  const catAlim = await Categorie.create({ nom: 'Alimentation', couleur: '#22C55E' });
  const catBoisson = await Categorie.create({ nom: 'Boissons', couleur: '#3B82F6' });

  console.log('👤 Création des utilisateurs...');
  const admin = await Utilisateur.create({
    nom: 'Admin',
    email: 'admin@boutiquest.bf',
    mot_de_passe: 'Admin1234!',
    role: 'admin',
  });

  const moussa = await Utilisateur.create({
    nom: 'Moussa',
    email: 'moussa@boutiquest.bf',
    mot_de_passe: 'Caissier123!',
    role: 'caissier',
    boutique: nira._id,
  });

  const fatima = await Utilisateur.create({
    nom: 'Fatima',
    email: 'fatima@boutiquest.bf',
    mot_de_passe: 'Caissier123!',
    role: 'caissier',
    boutique: far._id,
  });

  console.log('🛒 Création de quelques produits...');
  const produits = await Produit.insertMany([
    { nom: 'Riz 25kg', boutique: nira._id, categorie: catAlim._id, prix_achat: 10000, prix_vente: 13000, stock: 20, seuil_alerte: 5 },
    { nom: 'Huile 5L', boutique: nira._id, categorie: catAlim._id, prix_achat: 6000, prix_vente: 8000, stock: 15, seuil_alerte: 4 },
    { nom: 'Biscuit carton', boutique: nira._id, categorie: catAlim._id, prix_achat: 5000, prix_vente: 7000, stock: 8, seuil_alerte: 3 },
    { nom: 'Coca-Cola 1,5L', boutique: far._id, categorie: catBoisson._id, prix_achat: 400, prix_vente: 600, stock: 30, seuil_alerte: 10 },
    { nom: 'Eau minérale 1,5L', boutique: far._id, categorie: catBoisson._id, prix_achat: 250, prix_vente: 400, stock: 40, seuil_alerte: 10 },
  ]);

  for (const p of produits) {
    await MouvementStock.create({
      produit: p._id,
      boutique: p.boutique,
      type: 'entrée',
      quantite: p.stock,
      stock_avant: 0,
      stock_apres: p.stock,
      note: 'Stock initial',
      utilisateur: admin._id,
    });
  }

  console.log('✅ Données initiales insérées.');
  process.exit(0);
};

run().catch(err => {
  console.error('Erreur seed:', err);
  process.exit(1);
});
