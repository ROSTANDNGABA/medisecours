# MediSecours+

Plateforme médicale d'urgence pour le **Cameroun**, dimensionnée pour **200 000+ utilisateurs**.

Elle permet de consulter des maladies et gestes de premiers soins, trouver des centres de santé
proches de la position réelle du patient, gérer des comptes patient/médecin/admin, se connecter
par email/mot de passe ou Google, échanger des messages en temps réel, et administrer l'ensemble
de la plateforme depuis un dashboard admin dédié.

---

## Stack

### Backend
- PHP 8.2+
- Symfony 7.4 + `symfony/rate-limiter`
- API Platform 4.x
- PostgreSQL 15+
- Doctrine ORM et migrations
- LexikJWTAuthenticationBundle (JWT TTL configurable via `JWT_TTL`, 3600s par défaut)
- Google API Client + composer/ca-bundle (fix SSL Windows)
- Nelmio CORS
- Symfony Mercure (SSE temps réel — messages)
- VichUploader (upload fichiers / photos profil)
- Gedmo Doctrine Extensions (SoftDelete, Loggable)
- PHPUnit / Symfony PHPUnit Bridge (34 tests)

### Frontend
- Next.js 16 App Router (Turbopack)
- React 19
- Tailwind CSS 4 (design system via `@theme` dans `globals.css`)
- Axios (interceptors JWT + gestion 401/429/410)
- SWR (cache global, deduplication 2 min)
- `@react-oauth/google`
- lucide-react, framer-motion, recharts
- Leaflet + react-leaflet (carte interactive centres de santé)

---

## Arborescence du projet

```
MediSecours/
├── Cahier de charges MediSecours final.pdf
├── medisecours-backend/
│   ├── README.md
│   ├── composer.json / composer.lock
│   ├── phpunit.xml.dist
│   ├── compose.yaml / compose.override.yaml
│   ├── bin/console
│   ├── config/
│   │   ├── bundles.php
│   │   ├── routes.yaml / services.yaml
│   │   ├── jwt/
│   │   │   ├── private.pem
│   │   │   └── public.pem
│   │   ├── packages/
│   │   │   ├── api_platform.yaml
│   │   │   ├── doctrine.yaml
│   │   │   ├── lexik_jwt_authentication.yaml
│   │   │   ├── nelmio_cors.yaml
│   │   │   ├── security.yaml
│   │   │   ├── mercure.yaml
│   │   │   ├── mailer.yaml
│   │   │   ├── stof_doctrine_extensions.yaml
│   │   │   └── vich_uploader.yaml
│   │   └── routes/
│   │       ├── api_platform.yaml
│   │       ├── framework.yaml
│   │       └── security.yaml
│   ├── migrations/
│   │   ├── Version20260629152913.php   — structure initiale
│   │   ├── Version20260629153544.php   — ajustements
│   │   ├── Version20260630094544.php   — centres de santé
│   │   ├── Version20260630102325.php   — messages/consultations
│   │   ├── Version20260630112006.php   — média objects
│   │   ├── Version20260630143000.php   — disponibilités
│   │   ├── Version20260630144500.php   — ajustements types
│   │   ├── Version20260701170758.php   — ajustements
│   │   ├── Version20260702100000.php   — email_verified, reset/verify tokens, table avis
│   │   ├── Version20260702122044.php   — alignement index Doctrine / séquence IDENTITY avis
│   │   └── Version20260702131711.php   — allergies/contacts JSON, disponibilités JSON
│   ├── public/index.php
│   ├── src/
│   │   ├── Command/
│   │   │   └── CreateAdminCommand.php
│   │   ├── Controller/
│   │   │   ├── AdminMedecinController.php   — stats + validation médecins
│   │   │   ├── GoogleAuthController.php
│   │   │   ├── JWTController.php            — login/register/verify/reset
│   │   │   ├── MedecinPublicController.php  — profils publics sans données sensibles
│   │   │   └── SecurityController.php
│   │   ├── DataFixtures/
│   │   │   └── AppFixtures.php              — admin + 5 médecins + 20 patients + données médicales
│   │   ├── Doctrine/
│   │   │   └── CurrentUserExtension.php     — filtre auto sur collections par user connecté
│   │   ├── Entity/
│   │   │   ├── User.php / Patient.php / Medecin.php   — héritage SINGLE_TABLE
│   │   │   ├── Categorie.php / Maladie.php / PremierSoin.php
│   │   │   ├── CentreDeSante.php
│   │   │   ├── Consultation.php / Message.php
│   │   │   ├── Avis.php                    — avis patients sur médecins (note 1-5, signalement)
│   │   │   └── MediaObject.php
│   │   ├── Repository/
│   │   │   ├── CentreDeSanteRepository.php  — requête SQL Haversine pour centres proches
│   │   │   └── (autres repositories standard Doctrine)
│   │   ├── Security/
│   │   │   └── Voter/MedecinVoter.php
│   │   ├── Serializer/
│   │   │   └── UserSerializer.php           — sérialisation centralisée User/Patient/Médecin
│   │   ├── State/
│   │   │   ├── CentreDeSanteProcheProvider.php  — géolocalisation Haversine
│   │   │   ├── ConsultationProcessor.php
│   │   │   ├── MessageProcessor.php             — publie sur Mercure après persistance
│   │   │   └── UserPasswordHasherProcessor.php
│   │   └── Kernel.php
│   ├── templates/
│   │   ├── base.html.twig
│   │   └── email/
│   │       ├── verify_email.html.twig
│   │       └── reset_password.html.twig
│   └── tests/
│       └── Api/
│           ├── AuthTest.php
│           ├── ConsultationTest.php
│           ├── MessageTest.php
│           └── SecurityTest.php
└── medisecours-frontend/
    ├── package.json
    ├── next.config.mjs
    ├── ADMIN_DASHBOARD_README.md
    ├── ADMIN_QUICKSTART.md
    └── src/
        ├── api/axios.js                     — instance Axios + interceptor JWT
        ├── contexts/AuthContext.jsx          — état auth global (mounted, isAdmin, isMedecin)
        ├── hooks/
        │   ├── useAuth.js
        │   ├── useDebounce.js
        │   ├── useGeolocation.js            — GPS navigateur
        │   └── useMercure.js               — SSE Mercure avec reconnexion exponentielle
        ├── lib/
        │   ├── cookies.js                   — sync localStorage ↔ cookie pour middleware
        │   └── fetcher.js                   — config SWR globale (deduplication 2min)
        ├── components/
        │   ├── CentresMap.jsx               — carte Leaflet icônes locales (sans CDN)
        │   ├── admin/CrudTable.jsx          — table CRUD générique pilotée par schema fields
        │   ├── cards/
        │   │   ├── CategoryCard.jsx         — card catégorie redesignée
        │   │   └── MaladieCard.jsx
        │   ├── layout/Navbar.jsx / Footer.jsx
        │   └── ui/
        │       ├── EmptyState.jsx
        │       ├── GravityBadge.jsx
        │       ├── LoadingSpinner.jsx
        │       ├── MedicalDisclaimer.jsx    — banner avertissement médical WCAG
        │       ├── SearchBar.jsx
        │       ├── Toast.jsx
        │       └── UrgencyBadge.jsx
        └── app/
            ├── globals.css                  — design system @theme Tailwind CSS 4
            ├── layout.js
            ├── providers.jsx                — masque Navbar/Footer sur /admin
            ├── page.jsx                     — accueil public
            ├── not-found.jsx
            ├── login/page.jsx               — redirection rôle (admin→/admin, autres→/)
            ├── register/page.jsx            — inscription patient ou médecin (3 étapes)
            ├── forgot-password/page.jsx
            ├── reset-password/page.jsx
            ├── verify-email/page.jsx
            ├── categories/page.jsx / [id]/page.jsx
            ├── maladies/page.jsx / [id]/page.jsx
            ├── centres/page.jsx             — carte + liste + GPS
            ├── medecins/page.jsx / [id]/page.jsx
            ├── messages/page.jsx            — messagerie Mercure SSE
            ├── profil/page.jsx
            └── admin/
                ├── layout.jsx               — layout séparé, sidebar sombre, route guard
                ├── page.jsx                 — dashboard KPIs + graphique + activité récente
                ├── utilisateurs/page.jsx    — table + filtre rôle + slide-over détails
                ├── medecins/page.jsx        — validation médecins (cards + approve/reject)
                ├── centres/page.jsx         — CRUD centres via CrudTable
                ├── catalogue/page.jsx       — 3 onglets : catégories, maladies, premiers soins
                ├── avis/page.jsx            — modération avis signalés
                └── parametres/page.jsx      — profil admin + infos plateforme
```

---

## Compte Admin par défaut (Fixtures)

| Champ | Valeur |
|---|---|
| Email | `admin@medisecours.com` |
| Mot de passe | `Admin@2026!` |
| Prénom / Nom | Super Admin |
| Téléphone | +237 690000000 |
| Rôle | `ROLE_ADMIN` |

> ⚠️ Changer ce mot de passe avant toute démonstration publique ou déploiement.

Autres comptes de test créés par les fixtures :

| Type | Email | Mot de passe | Quantité |
|---|---|---|---|
| Médecins (validés) | `medecin0` à `medecin4@medisecours.com` | `Medecin@2026!` | 5 |
| Patients | `patient0` à `patient19@medisecours.com` | `Patient@2026!` | 20 |

---

## Configuration backend

Depuis `medisecours-backend` :

```bash
composer install
```

Configurer `.env` ou `.env.local` :

```dotenv
DATABASE_URL="postgresql://user:password@127.0.0.1:5432/medisecours_db?serverVersion=15&charset=utf8"

JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=une_passphrase_forte_ici
JWT_TTL=3600

GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'

# Mailer
MAILER_DSN=smtp://localhost:1025
MAILER_SENDER_EMAIL=noreply@medisecours.cm
MAILER_SENDER_NAME="MediSecours+"
FRONTEND_URL=http://localhost:3000

# Mercure (SSE temps réel)
MERCURE_URL=http://127.0.0.1:3001/.well-known/mercure
MERCURE_PUBLIC_URL=http://127.0.0.1:3001/.well-known/mercure
MERCURE_JWT_SECRET=un_secret_mercure_fort
```

Créer la base et appliquer les migrations :

```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

Générer les clés JWT (si absentes) :

```bash
php bin/console lexik:jwt:generate-keypair --overwrite
php bin/console lexik:jwt:check-config
```

Charger les données de test :

```bash
# Supprime toutes les données et recharge les fixtures
php bin/console doctrine:fixtures:load

# Ajoute les fixtures sans supprimer les données existantes
php bin/console doctrine:fixtures:load --append
```

---

## Démarrage

### Backend

```bash
symfony server:start
```

```
http://127.0.0.1:8000
http://127.0.0.1:8000/api/docs   ← Documentation API Platform (Swagger)
```

### Frontend

```bash
npm install
npm run dev
```

```
http://localhost:3000              ← Application publique
http://localhost:3000/admin        ← Dashboard admin (ROLE_ADMIN requis)
```

---

## Authentification

### Connexion classique

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@medisecours.com",
  "password": "Admin@2026!"
}
```

Réponse :

```json
{
  "token": "eyJ...",
  "user": {
    "id": "...",
    "email": "admin@medisecours.com",
    "roles": ["ROLE_ADMIN", "ROLE_USER"],
    "nom": "Admin",
    "prenom": "Super",
    "type": "patient"
  }
}
```

Le frontend stocke le token dans `localStorage` **et** dans un cookie via `lib/cookies.js`
(nécessaire pour le middleware Next.js). Le token est injecté automatiquement dans tous les
appels Axios via un interceptor de requête.

### Inscription

```http
POST /api/auth/register
Content-Type: application/json
```

Patient :
```json
{
  "email": "patient@example.cm",
  "password": "MotDePasseFort1!",
  "type": "patient",
  "nom": "Dupont", "prenom": "Jean",
  "telephone": "+237 690000000",
  "quartier": "Bonamoussadi"
}
```

Médecin :
```json
{
  "email": "medecin@example.cm",
  "password": "MotDePasseFort1!",
  "type": "medecin",
  "nom": "Koffi", "prenom": "Marie",
  "specialite": "Cardiologie",
  "numeroOrdre": "CM-ORD-12345"
}
```

> Un médecin nouvellement inscrit a `estValide: false` — il doit être approuvé par un admin.

### Connexion Google

```http
POST /api/auth/google
Content-Type: application/json

{ "googleIdToken": "eyJ..." }
```

Le backend vérifie le token Google, crée un patient si l'email est inconnu, retourne un JWT MediSecours+.

Dans Google Cloud Console, ajouter comme origines JavaScript autorisées :
```
http://localhost:3000
http://127.0.0.1:3000
```

### Vérification d'email

```http
GET /api/auth/verify-email?token=xxx
```

### Mot de passe oublié

```http
POST /api/auth/forgot-password
Content-Type: application/json
{ "email": "user@example.cm" }
```

```http
POST /api/auth/reset-password
Content-Type: application/json
{ "token": "xxx", "password": "NouveauMotDePasse1!" }
```

---

## Rôles

| Rôle | Description |
|---|---|
| `ROLE_USER` | Base ajoutée automatiquement à tout utilisateur |
| `ROLE_PATIENT` | Patient inscrit ou créé via Google |
| `ROLE_MEDECIN` | Médecin inscrit (accès messagerie + consultations) |
| `ROLE_ADMIN` | Accès dashboard admin, CRUD protégé, validation médecins |

---

## Endpoints — Référence complète

### Publics (sans authentification)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Connexion email/mot de passe |
| `POST` | `/api/auth/register` | Inscription patient ou médecin |
| `POST` | `/api/auth/google` | Connexion Google OAuth2 |
| `GET` | `/api/auth/verify-email?token=xxx` | Vérification adresse email |
| `POST` | `/api/auth/forgot-password` | Demande de réinitialisation mot de passe |
| `POST` | `/api/auth/reset-password` | Réinitialisation effective du mot de passe |
| `GET` | `/api/categories` | Liste des catégories médicales |
| `GET` | `/api/categories/{id}` | Détail d'une catégorie |
| `GET` | `/api/maladies` | Liste maladies (filtres: nom, symptomes, categorie, niveauGravite, urgence, contagieux) |
| `GET` | `/api/maladies/{id}` | Détail d'une maladie |
| `GET` | `/api/premier_soins` | Liste des protocoles de premiers soins |
| `GET` | `/api/premier_soins/{id}` | Détail d'un protocole |
| `GET` | `/api/centre_de_santes` | Liste des centres de santé (filtres: type, ville, region, estActif) |
| `GET` | `/api/centre_de_santes/{id}` | Détail d'un centre |
| `GET` | `/api/centres_de_santes/proches` | Centres dans un rayon GPS (Haversine) |
| `GET` | `/api/avis` | Avis sur les médecins |
| `GET` | `/api/medecins-publics` | Profils publics médecins validés (sans données personnelles) |
| `GET` | `/api/medecins-publics/{id}` | Profil public d'un médecin + ses avis |

> Rate limiting (par IP) : login 10/min · register 5/h · google 20/min · reset-password 3/h

### Protégés JWT (utilisateur connecté)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/{id}` | Voir son propre profil |
| `PATCH` | `/api/users/{id}` | Modifier son profil |
| `GET` | `/api/messages` | Messages de l'utilisateur connecté |
| `POST` | `/api/messages` | Envoyer un message (Mercure notifie le destinataire) |
| `GET` | `/api/consultations` | Consultations liées à l'utilisateur |
| `POST` | `/api/consultations` | Créer une consultation |
| `POST` | `/api/avis` | Laisser un avis sur un médecin (patient seulement) |
| `PATCH` | `/api/avis/{id}` | Modifier son avis (30 jours max) |
| `DELETE` | `/api/avis/{id}` | Supprimer son avis |

### Admin (ROLE_ADMIN requis)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | Liste complète de tous les utilisateurs |
| `GET` | `/api/admin/stats` | Statistiques globales de la plateforme |
| `GET` | `/api/admin/medecins/en-attente` | Médecins en attente de validation |
| `PATCH` | `/api/admin/medecins/{id}/validation` | Valider ou invalider un médecin |
| `POST` | `/api/categories` | Créer une catégorie |
| `PATCH` | `/api/categories/{id}` | Modifier une catégorie |
| `DELETE` | `/api/categories/{id}` | Supprimer une catégorie |
| `POST` | `/api/maladies` | Créer une maladie |
| `PATCH` | `/api/maladies/{id}` | Modifier une maladie |
| `DELETE` | `/api/maladies/{id}` | Supprimer une maladie |
| `POST` | `/api/premier_soins` | Créer un protocole de premiers soins |
| `PATCH` | `/api/premier_soins/{id}` | Modifier un protocole |
| `DELETE` | `/api/premier_soins/{id}` | Supprimer un protocole |
| `POST` | `/api/centre_de_santes` | Créer un centre de santé |
| `PATCH` | `/api/centre_de_santes/{id}` | Modifier un centre |
| `DELETE` | `/api/centre_de_santes/{id}` | Supprimer un centre |
| `PATCH` | `/api/avis/{id}` | Modifier un avis (ex: `signale: false`) |
| `DELETE` | `/api/avis/{id}` | Supprimer un avis signalé |

### Réponse `/api/admin/stats`

```json
{
  "utilisateurs": {
    "patients": 20,
    "medecins": 5,
    "medecinsValides": 5,
    "medecinsEnAttente": 0,
    "total": 26
  },
  "contenu": {
    "maladies": 20,
    "categories": 10,
    "centres": 25
  },
  "activite": {
    "consultations": 0,
    "consultationsEnCours": 0,
    "messages": 0,
    "avis": 0,
    "avisSignales": 0
  }
}
```

### Réponse `/api/admin/medecins/en-attente`

```json
{
  "total": 2,
  "medecins": [
    {
      "id": "...",
      "email": "medecin@example.cm",
      "nom": "Koffi",
      "prenom": "Marie",
      "specialite": "Cardiologie",
      "numeroOrdre": "CM-ORD-12345",
      "telephone": "+237 690000000",
      "estValide": false,
      "roles": ["ROLE_MEDECIN", "ROLE_USER"]
    }
  ]
}
```

---

## Dashboard Admin

Le frontend dispose d'un dashboard admin **complètement séparé** du reste de l'application.

### Accès

```
http://localhost:3000/admin
```

Connexion avec `admin@medisecours.com` / `Admin@2026!` → redirection automatique vers `/admin`.

### Navigation

| Section | URL | Description |
|---|---|---|
| Vue d'ensemble | `/admin` | KPIs, graphique de croissance, activité récente |
| Utilisateurs | `/admin/utilisateurs` | Liste complète, filtre par rôle, slide-over détails |
| Validation Médecins | `/admin/medecins` | Cards avec actions Approuver / Rejeter |
| Centres de Santé | `/admin/centres` | CRUD complet (16 champs, régions Cameroun) |
| Catalogue Médical | `/admin/catalogue` | Onglets : Catégories · Maladies · Premiers Soins |
| Avis & Modération | `/admin/avis` | Avis signalés avec Dismiss / Supprimer |
| Paramètres | `/admin/parametres` | Profil admin, infos plateforme |

### Architecture technique

- `src/app/admin/layout.jsx` — layout dédié avec sidebar sombre (bg-primary-900), route guard
- `src/app/providers.jsx` — masque Navbar/Footer public sur toutes les routes `/admin`
- `src/app/login/page.jsx` — redirection post-login basée sur le rôle :
  - `ROLE_ADMIN` → `/admin`
  - `ROLE_MEDECIN` / `ROLE_PATIENT` → `/`
- Composant `CrudTable` réutilisé pour centres, catalogue
- Graphique dashboard avec `recharts` (AreaChart)
- Animations `AnimatePresence` sur les listes (approve/reject = sortie fluide)

---

## Géolocalisation des centres de santé

```http
GET /api/centres_de_santes/proches?lat={lat}&lng={lng}&rayon=25&limit=30
```

| Paramètre | Description |
|---|---|
| `lat` | Latitude réelle de l'utilisateur |
| `lng` | Longitude réelle de l'utilisateur |
| `rayon` | Rayon en kilomètres (défaut: 25) |
| `limit` | Nombre maximum de résultats (défaut: 30) |

La formule **Haversine** est implémentée directement en SQL dans `CentreDeSanteRepository`.
La colonne `distance` n'existe pas en base — elle est calculée à la volée et ajoutée dans
la réponse de l'état API Platform, jamais persistée.

Le frontend demande la position via `navigator.geolocation.getCurrentPosition()`.
En production, HTTPS est requis pour la géolocalisation navigateur.

---

## Messagerie temps réel (Mercure SSE)

Les messages utilisent **Mercure Server-Sent Events** :

1. Client → `POST /api/messages` (contenu + destinataire)
2. `MessageProcessor.php` persiste le message en base
3. `MessageProcessor.php` publie sur Mercure topic `user/{destinataire_id}`
4. Le frontend souscrit via `useMercure.js` avec reconnexion exponentielle
5. Le message apparaît instantanément sans polling

```env
# Backend .env
MERCURE_URL=http://127.0.0.1:3001/.well-known/mercure
MERCURE_JWT_SECRET=un_secret_mercure_fort

# Frontend .env.local
NEXT_PUBLIC_MERCURE_URL=http://127.0.0.1:3001/.well-known/mercure
```

---

## Données structurées (JSON en base)

Depuis la migration `Version20260702131711` :

| Champ | Ancien type | Nouveau type | Exemple |
|---|---|---|---|
| `allergies` | TEXT | JSON | `["Pénicilline", "Aspirine"]` |
| `contacts_urgence` | TEXT | JSON | `[{"nom":"Mère","telephone":"+237...","lien":"parent"}]` |
| `disponibilites` | TEXT | JSON | `[{"jour":"Lundi","debut":"08:00","fin":"17:00"}]` |

La méthode `isDisponibleMaintenant()` de l'entité `Medecin` exploite le JSON structuré
pour calculer si un médecin est disponible à l'instant T.

---

## Créer un administrateur

### Via commande Symfony (recommandé)

```bash
php bin/console app:create-admin admin@medisecours.com Admin@2026!
# Avec options
php bin/console app:create-admin admin@medisecours.com Admin@2026! --nom=Admin --prenom=Super
```

Si l'utilisateur existe déjà, la commande met à jour son mot de passe et ajoute `ROLE_ADMIN`.

### Via fixtures

```bash
php bin/console doctrine:fixtures:load
```

Le compte `admin@medisecours.com` / `Admin@2026!` est créé automatiquement.

---

## Validation médecin

```http
PATCH /api/admin/medecins/{id}/validation
Authorization: Bearer <token_admin>
Content-Type: application/json

{ "estValide": true }
```

Réponse :
```json
{
  "message": "Médecin validé avec succès.",
  "user": { "id": "...", "estValide": true, ... }
}
```

---

## Design system frontend

Défini dans `src/app/globals.css` via la syntaxe Tailwind CSS 4 `@theme` :

```css
@theme {
  --color-primary-50:  #EAF0F7;
  --color-primary-100: #CBDBEA;
  --color-primary-300: #6F94B8;
  --color-primary-500: #1E3A5F;   /* bleu médical principal */
  --color-primary-700: #152A45;
  --color-primary-900: #0C1A2C;   /* fond sidebar admin */
  --color-mint-100:    #D1FAE5;
  --color-mint-500:    #10B981;   /* actions positives, liens actifs */
  --color-mint-700:    #047857;
  --color-urgence-100: #FEE2E2;
  --color-urgence-500: #EF4444;   /* urgences, actions dangereuses */
  --color-urgence-700: #B91C1C;
  --color-sable:       #F6F3EC;   /* fond clair, texte dark mode */
  --font-display: "Plus Jakarta Sans", sans-serif;
  --font-sans:    "Inter", sans-serif;
  --shadow-glass: 0 8px 32px 0 rgba(30,58,95,0.15);
}
```

Usage Tailwind : `bg-primary-900`, `text-mint-500`, `shadow-glass`, etc.

---

## Commandes utiles

### Backend

```bash
# Migrations
php bin/console doctrine:migrations:migrate
php bin/console doctrine:migrations:status
php bin/console doctrine:schema:validate

# Vérifications
php bin/console lint:yaml config
php bin/console lint:container
php bin/console lexik:jwt:check-config

# Admin
php bin/console app:create-admin admin@medisecours.com Admin@2026!

# Fixtures
php bin/console doctrine:fixtures:load

# Tests
vendor/bin/phpunit                     # Windows
vendor/bin/simple-phpunit              # alternatif
```

### Frontend

```bash
npm run dev        # serveur de développement (Turbopack)
npm run build      # build de production
npm run start      # serveur de production
npm run lint       # ESLint
```

---

## Tests

```
Backend  : 34 tests, 34 assertions — PHPUnit
Frontend : build production OK, 0 erreur TypeScript, 0 warning
```

Suites de tests backend :

| Fichier | Couverture |
|---|---|
| `AuthTest.php` | Login, register, Google OAuth, verify-email, reset-password |
| `ConsultationTest.php` | Création, accès filtré par rôle |
| `MessageTest.php` | Envoi, accès restreint expéditeur/destinataire |
| `SecurityTest.php` | Accès public/protégé, rate limiting, legacy 410 |

---

## Notes de sécurité

- Ne jamais versionner les secrets de production (`.env`, `private.pem`).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` est public par nature — normal.
- En production, remplacer la règle CORS `localhost` par votre domaine réel.
- Les clés JWT de production doivent être générées séparément du développement.
- Changer `Admin@2026!` avant toute démonstration ou déploiement public.
- En production, géolocalisation nécessite **HTTPS** (obligation navigateurs modernes).

---

## Dépannage

### Google `origin_mismatch`

Ajouter dans Google Cloud Console → Origines JavaScript autorisées :
```
http://localhost:3000
http://127.0.0.1:3000
```

### Google Auth → erreur 503

Le backend ne peut pas joindre l'API Google. Vérifier la connexion internet et le bundle `composer/ca-bundle`.

### JWT invalide / erreur 401

```bash
php bin/console lexik:jwt:check-config
```

### Position GPS indisponible

- Navigateur doit autoriser la localisation.
- GPS activé sur mobile.
- En production : HTTPS obligatoire.
- En local : `localhost` et `127.0.0.1` acceptés par les navigateurs modernes.

### Sidebar admin invisible

La sidebar est cachée (`hidden`) sur mobile et visible (`md:flex`) sur desktop (≥768px).
Sur mobile, utiliser le bouton hamburger (☰) dans la top bar pour l'ouvrir.

### Erreur 500 au démarrage

Vérifier que `APP_SECRET` n'est pas vide dans `.env`.

### Fixtures échouent avec erreur 401 Mercure

Normal : la création de `Message` en fixtures déclenche Mercure qui nécessite le serveur SSE.
Les fixtures ne créent pas de messages — section désactivée dans `AppFixtures.php`.

### Erreur `Too many requests` (429)

Rate limiting actif. Attendre la fenêtre configurée :
- Login : 10/min
- Register : 5/h
- Reset password : 3/h

---

## Migrations — Historique

| Version | Date | Description |
|---|---|---|
| 20260629152913 | 29/06/26 | Structure initiale : User, Patient, Medecin, héritage STI |
| 20260629153544 | 29/06/26 | Ajustements entités initiales |
| 20260630094544 | 30/06/26 | CentreDeSante, coordonnées GPS |
| 20260630102325 | 30/06/26 | Message, Consultation |
| 20260630112006 | 30/06/26 | MediaObject (VichUploader) |
| 20260630143000 | 30/06/26 | Champs disponibilités médecin |
| 20260630144500 | 30/06/26 | Ajustements types de colonnes |
| 20260701170758 | 01/07/26 | Ajustements divers |
| 20260702100000 | 02/07/26 | email_verified, tokens reset/verify, table avis, suppression colonne distance |
| 20260702122044 | 02/07/26 | Alignement conventions Doctrine : index, séquence IDENTITY avis |
| 20260702131711 | 03/07/26 | allergies/contacts_urgence/disponibilites TEXT → JSON, ajout disponibilites_texte |

---

## Historique des corrections majeures

### 03/07/2026 — Dashboard Admin complet

- **Dashboard admin séparé** — layout dédié, sidebar sombre, route guard ROLE_ADMIN
- **7 pages admin** : Vue d'ensemble, Utilisateurs, Validation Médecins, Centres, Catalogue, Avis, Paramètres
- **Redirection post-login** basée sur le rôle (admin → `/admin`, autres → `/`)
- **Graphique Recharts** — AreaChart croissance utilisateurs/consultations
- **Validation médecins** — cards visuelles avec Approve/Reject + AnimatePresence
- **CRUD centres** — 16 champs, types et régions Cameroun
- **Catalogue médical** — 3 onglets : catégories, maladies, premiers soins
- **Modération avis** — avis signalés avec dismiss/delete
- **CategoryCard redesignée** — design minimaliste avec point coloré + grand cercle décoratif
- **Correction sidebar** — séparation desktop (toujours visible) et mobile (hamburger)
- **Providers.jsx** — masquage Navbar/Footer conditionnel sur routes `/admin`

### 02/07/2026 — Sécurité & Scalabilité

- `GET /api/users` protégé `ROLE_ADMIN`
- Route legacy `/api/login` → 410 Gone
- Rate limiting activé (login, register, google, reset-password)
- Vérification email + reset password complets
- Entité `Avis` créée avec repository et API Platform
- `UserSerializer` centralisé (4 controllers unifiés)
- `MedecinVoter` pour contrôle d'accès fin
- `MedecinPublicController` sans exposition données personnelles
- `MessageProcessor` publie sur Mercure après persistance
- 34 tests PHPUnit (vs 7 initialement)
- Migration `Version20260702100000` : email_verified, tokens, table avis

### 30/06/2026 — Fondations

- Architecture Symfony + API Platform complète
- Authentification JWT + Google OAuth
- Entités : User/Patient/Medecin, Maladie/Categorie, CentreDeSante, Message, Consultation
- Géolocalisation Haversine SQL
- Frontend Next.js avec design system complet

---

## Date de mise à jour

Documentation mise à jour le **03/07/2026**.
