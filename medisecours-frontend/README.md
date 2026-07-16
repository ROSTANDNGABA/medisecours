# MediSecours+ — Frontend (Next.js)

Plateforme médicale d'urgence pour le Cameroun (200 000+ utilisateurs). Next.js 16 (App Router) + React 19 + Tailwind CSS 4.

## Démarrage

```bash
npm install
npm run dev
```

Le backend Symfony doit tourner sur `http://127.0.0.1:8000`, avec Mercure sur `http://127.0.0.1:8000/.well-known/mercure`.

## Comptes de test

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@medisecours.com | Admin@2026! | Admin |
| medecin0@medisecours.com | Medecin@2026! | Médecin |
| patient0@medisecours.com | Patient@2026! | Patient |

## Trois espaces indépendants

- **Public** (`/`, `/maladies`, `/centres`, `/messages`, `/profil`) — Navbar/Footer visibles
- **Espace Médecin** (`/medecin/*`) — sidebar dédiée, sans Navbar/Footer public
  - `/medecin` — tableau de bord (KPIs, consultations actives, avis, messages récents)
  - `/medecin/consultations` — gestion des consultations (filtres par statut)
  - `/medecin/messages` — messagerie temps réel (Mercure SSE)
  - `/medecin/profil` — profil + créateur de disponibilités hebdomadaires
  - `/medecin/avis` — avis reçus + signalement
- **Admin** (`/admin/*`) — sidebar redessinée avec sections groupées + horloge
  - `/admin` — vue d'ensemble (KPIs)
  - `/admin/utilisateurs`, `/admin/medecins` (validation), `/admin/centres`, `/admin/catalogue`, `/admin/avis` (modération), `/admin/parametres`

La redirection post-connexion est basée sur le rôle : `ROLE_ADMIN` → `/admin`, `ROLE_MEDECIN` → `/medecin`, sinon page d'origine ou accueil.

## Nouveautés de cette itération

- `src/hooks/useMercure.js` — hook SSE avec reconnexion à backoff exponentiel (créé car absent du frontend précédent, requis par `prompt_medecin_dashboard.md`)
- `src/contexts/AuthContext.jsx` — ajout de `mounted` pour la sécurité d'hydratation (toutes les pages `/medecin` et `/admin` attendent `mounted` avant de vérifier le rôle)
- `src/components/ui/Avatar.jsx` — avatar basé sur les initiales, couleur dérivée du nom
- `src/proxy.js` — protège désormais aussi `/medecin/*` (redirige vers `/` si le rôle n'est pas `ROLE_MEDECIN`)
- `src/app/admin/layout.jsx` — refonte complète : sections groupées, indicateur actif animé, horloge temps réel, badge de validations en attente
- Admin éclaté en sous-pages dédiées (`utilisateurs`, `medecins`, `centres`, `catalogue`, `avis`, `parametres`) au lieu d'un unique tableau à onglets

## Limites connues / hypothèses

- `useMercure` suppose un hub Mercure accessible sur `http://127.0.0.1:8000/.well-known/mercure` avec CORS/JWT publiés par le backend — à ajuster si l'URL diffère en prod.
- Le format de retour de `PATCH /api/admin/medecins/{id}/validation` est supposé être `{ message, user: { estValide, ... } }` d'après `README-2.md` — vérifier que le champ est bien lu correctement dans `admin/medecins/page.jsx`.
- Non testé contre le vrai backend (pas d'accès réseau à `127.0.0.1:8000` depuis cet environnement).
