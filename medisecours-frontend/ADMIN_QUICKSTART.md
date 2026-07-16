# 🚀 Guide Rapide — Dashboard Admin MediSecours+

## Démarrage en 3 étapes

### 1️⃣ Créer un Compte Admin

#### Option A : Via Fixtures Symfony (Recommandé)
```php
// backend/src/DataFixtures/AdminFixtures.php
$admin = new User();
$admin->setEmail('admin@medisecours.cm');
$admin->setPassword($this->passwordHasher->hashPassword($admin, 'Admin@2026'));
$admin->setRoles(['ROLE_ADMIN']);
$admin->setNom('Admin');
$admin->setPrenom('Super');
$manager->persist($admin);
$manager->flush();
```

Puis :
```bash
cd medisecours-backend
php bin/console doctrine:fixtures:load --append
```

#### Option B : Directement en base de données
```sql
INSERT INTO user (email, password, roles, nom, prenom, created_at)
VALUES (
  'admin@medisecours.cm',
  '$2y$13$...', -- hash bcrypt du mot de passe
  '["ROLE_ADMIN"]',
  'Admin',
  'Super',
  NOW()
);
```

### 2️⃣ Lancer l'Application

#### Backend (Terminal 1)
```bash
cd medisecours-backend
symfony server:start
# ou
php -S localhost:8000 -t public
```

#### Frontend (Terminal 2)
```bash
cd medisecours-frontend
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### 3️⃣ Se Connecter

1. Ouvrir `http://localhost:3000/login`
2. Entrer les identifiants admin :
   - Email : `admin@medisecours.cm`
   - Password : `Admin@2026`
3. Cliquer "Se connecter"
4. ✅ **Redirection automatique vers** `http://localhost:3000/admin`

---

## 📱 Navigation Dashboard

Une fois connecté, vous verrez la **sidebar sombre** à gauche avec 7 sections :

### 📊 Vue d'ensemble
**URL** : `/admin`  
**Contenu** :
- 4 KPI cards (Utilisateurs, Médecins, En Attente, Centres)
- Graphique de croissance
- Feed activité récente
- Raccourcis rapides

### 👥 Utilisateurs
**URL** : `/admin/utilisateurs`  
**Actions** :
- Rechercher par nom/email
- Filtrer par rôle (Patient/Médecin/Admin)
- Cliquer sur une ligne → détails dans slide-over

### 🩺 Validation Médecins
**URL** : `/admin/medecins`  
**Actions** :
- Voir les médecins en attente
- Cliquer "Approuver" (vert) → valide le médecin
- Cliquer "Rejeter" (rouge) → refuse la validation

### 🏥 Centres de Santé
**URL** : `/admin/centres`  
**Actions** :
- Cliquer "Ajouter" → formulaire popup
- Remplir nom, type, adresse, ville, région, etc.
- Cliquer "Enregistrer"
- Pour modifier : cliquer l'icône crayon
- Pour supprimer : cliquer l'icône corbeille

### 📋 Catalogue Médical
**URL** : `/admin/catalogue`  
**Onglets** :
1. **Catégories** : Ajouter/modifier les catégories de maladies (ex: Maladies tropicales, Urgences, etc.)
2. **Maladies** : Ajouter/modifier les fiches maladies
3. **Premiers Soins** : Ajouter/modifier les protocoles de premiers soins

### ⭐ Avis & Modération
**URL** : `/admin/avis`  
**Actions** :
- Voir les avis signalés par les utilisateurs
- "Rejeter le signalement" → garde l'avis
- "Supprimer l'avis" → supprime définitivement

### ⚙️ Paramètres
**URL** : `/admin/parametres`  
**Contenu** :
- Modifier votre profil admin
- Infos plateforme

---

## 🎯 Workflows Typiques

### Valider un Nouveau Médecin

1. Aller sur **Vue d'ensemble** → voir le feed "Médecins en attente"
2. Ou aller directement sur **Validation Médecins**
3. Vérifier :
   - Spécialité
   - Numéro d'ordre
   - Email/téléphone
4. Cliquer **"Approuver"**
5. ✅ Le médecin peut maintenant accéder à l'interface médecin

### Ajouter un Centre de Santé

1. Aller sur **Centres de Santé**
2. Cliquer **"Ajouter"**
3. Remplir le formulaire :
   - **Nom** : Ex. "Hôpital Central de Yaoundé"
   - **Type** : Ex. "hopital_general"
   - **Adresse** : Ex. "Avenue de l'Indépendance"
   - **Ville** : Ex. "Yaoundé"
   - **Région** : Ex. "Centre"
   - **Téléphone** : Ex. "+237 222 23 40 30"
   - **Latitude/Longitude** : Si disponible
   - **Horaires** : Ex. "Lun-Ven : 8h-18h, Sam : 8h-13h"
   - **Spécialités** : Ex. "Cardiologie, Pédiatrie, Chirurgie"
   - **Services** : Ex. "Urgences, Hospitalisation, Laboratoire"
   - **Description** : Texte libre
   - ✅ **Actif** : Cocher
   - ✅ **Urgences 24h** : Cocher si applicable
4. Cliquer **"Enregistrer"**
5. ✅ Le centre apparaît sur `/centres` pour les patients

### Gérer une Maladie

1. Aller sur **Catalogue Médical**
2. Cliquer onglet **"Maladies"**
3. Cliquer **"Ajouter"**
4. Remplir :
   - **Nom** : Ex. "Paludisme"
   - **Niveau de Gravité** : Ex. "MODÉRÉE"
   - **Urgence** : Cocher si urgence médicale
   - **Contagieux** : Cocher si contagieux
   - **Description** : Texte explicatif
   - **Symptômes** : Liste des symptômes
   - **Causes** : Causes connues
   - **Précautions** : Mesures préventives
   - **Traitement** : Traitement recommandé
5. Cliquer **"Enregistrer"**
6. ✅ La maladie apparaît sur `/maladies` pour les patients

### Modérer un Avis Signalé

1. Aller sur **Avis & Modération**
2. Lire l'avis et la raison du signalement
3. **Cas 1** : Avis inapproprié (insultes, spam)
   - Cliquer **"Supprimer l'avis"**
   - ✅ L'avis est supprimé définitivement
4. **Cas 2** : Faux signalement (avis légitime)
   - Cliquer **"Rejeter le signalement"**
   - ✅ L'avis reste visible, le flag `signale` passe à `false`

---

## 🔧 Résolution de Problèmes

### ❌ Problème : "Impossible de charger le dashboard"

**Causes possibles** :
1. Backend pas lancé
2. Endpoint `/api/admin/stats` pas implémenté
3. Token JWT expiré

**Solutions** :
```bash
# Vérifier backend
curl http://localhost:8000/api/admin/stats

# Si erreur 401 → reconnecter
# Si erreur 404 → implémenter endpoint backend
```

### ❌ Problème : Redirigé vers `/login` en boucle

**Cause** : Le compte n'a pas `ROLE_ADMIN`

**Solution** :
```sql
-- Vérifier les rôles en base
SELECT id, email, roles FROM user WHERE email = 'admin@medisecours.cm';

-- Si roles != ["ROLE_ADMIN"], mettre à jour
UPDATE user SET roles = '["ROLE_ADMIN"]' WHERE email = 'admin@medisecours.cm';
```

### ❌ Problème : Sidebar ne s'affiche pas sur mobile

**Cause** : Normale, c'est le comportement responsive

**Solution** : Cliquer le bouton **hamburger** (☰) en haut à gauche

### ❌ Problème : Graphique ne s'affiche pas

**Cause** : `recharts` pas installé

**Solution** :
```bash
cd medisecours-frontend
npm install recharts
npm run dev
```

---

## 📝 Checklist Endpoints Backend

Avant d'utiliser le dashboard admin, assurez-vous que ces endpoints Symfony sont implémentés :

### Stats & Dashboard
- [ ] `GET /api/admin/stats` → retourne stats complètes
- [ ] `GET /api/admin/medecins/en-attente` → retourne médecins non validés
- [ ] `PATCH /api/admin/medecins/{id}/validation` → body `{ "estValide": boolean }`

### Users
- [ ] `GET /api/users` → tous les users (filtrable par rôle idéalement)
- [ ] `PATCH /api/users/{id}` → modifier user

### Centres
- [ ] `GET /api/centre_de_santes` → tous les centres
- [ ] `POST /api/centre_de_santes` → créer centre
- [ ] `PATCH /api/centre_de_santes/{id}` → modifier centre
- [ ] `DELETE /api/centre_de_santes/{id}` → supprimer centre

### Catalogue
- [ ] `GET /api/categories` → toutes les catégories
- [ ] `POST /api/categories` → créer catégorie
- [ ] `PATCH /api/categories/{id}` → modifier catégorie
- [ ] `DELETE /api/categories/{id}` → supprimer catégorie
- [ ] Idem pour `/api/maladies` et `/api/premier_soins`

### Avis
- [ ] `GET /api/avis?signale=true` → avis signalés
- [ ] `PATCH /api/avis/{id}` → modifier avis (ex: `signale: false`)
- [ ] `DELETE /api/avis/{id}` → supprimer avis

---

## 🎨 Personnalisation

### Changer les Couleurs
Les couleurs sont définies dans `src/app/globals.css` :
```css
@theme {
  --color-primary-500: #1E3A5F;  /* Bleu foncé sidebar */
  --color-mint-500: #10B981;      /* Vert actions */
  --color-urgence-500: #EF4444;   /* Rouge danger */
  /* ... */
}
```

### Ajouter une Section Admin
1. Créer `src/app/admin/ma-section/page.jsx`
2. Ajouter dans `navigation` array de `layout.jsx` :
```javascript
{ name: 'Ma Section', href: '/admin/ma-section', icon: IconeLucide }
```
3. Rebuild : `npm run build`

---

## 🚀 Mise en Production

### Build Optimisé
```bash
cd medisecours-frontend
npm run build
npm run start  # serveur production Node.js
```

### Variables d'Environnement
Créer `.env.production` :
```env
NEXT_PUBLIC_API_URL=https://api.medisecours.cm
NEXT_PUBLIC_GOOGLE_CLIENT_ID=votre_client_id_production
```

### Déploiement Vercel (Recommandé)
```bash
npm install -g vercel
vercel --prod
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- 📖 **README Principal** : `ADMIN_DASHBOARD_README.md`
- 📝 **Changelog** : `CHANGELOG_ADMIN.md`

---

## 🆘 Support

En cas de problème :
1. Vérifier la console navigateur (F12)
2. Vérifier les logs backend Symfony
3. Vérifier que tous les endpoints backend répondent
4. Vérifier le token JWT dans localStorage

**Bon courage avec MediSecours+ Admin ! 🏥🇨🇲**
