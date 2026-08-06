# Déploiement de MediSecours

Ce guide déploie :

- le frontend Next.js sur Vercel ;
- l’API Symfony et PostgreSQL sur Render ;
- le serveur WebSocket sur un second service Render ;
- les médias sur un disque persistant Render.

## 1. Préparer le dépôt

Le fichier `render.yaml` à la racine décrit les services Render. Vercel doit
utiliser `medisecours-frontend` comme répertoire racine du projet.

Ne jamais versionner :

- les fichiers `.env.local` et `.env.prod` ;
- les fichiers `config/jwt/*.pem` ;
- les valeurs base64 des clés JWT ;
- `WS_PUBLISH_SECRET`, `APP_SECRET` ou les identifiants SMTP.

Le fichier `.env.prod` ayant déjà été suivi par Git dans ce projet, considérer
ses anciennes valeurs comme compromises : les remplacer avant le déploiement
dans Render, Google Cloud et le fournisseur SMTP. Le retrait du fichier dans
un nouveau commit n’efface pas les versions présentes dans l’historique Git.

## 2. Générer les clés JWT

Depuis `medisecours-backend`, créer une paire RSA protégée par une phrase
secrète :

```powershell
New-Item -ItemType Directory -Force config/jwt
openssl genpkey -algorithm RSA -aes-256-cbc -pkeyopt rsa_keygen_bits:4096 -out config/jwt/private.pem
openssl pkey -in config/jwt/private.pem -pubout -out config/jwt/public.pem
```

OpenSSL demande la phrase secrète dans le terminal. Conserver cette phrase
dans un gestionnaire de secrets.

Convertir ensuite les deux fichiers en base64, sans modifier les fichiers :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path "config/jwt/private.pem"))) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path "config/jwt/public.pem"))) | Set-Clipboard
```

Exécuter les commandes séparément et coller chaque résultat dans la variable
Render correspondante. Les deux services doivent recevoir exactement la même
valeur `JWT_PUBLIC_KEY_BASE64`.

## 3. Créer les services Render

1. Pousser le dépôt sur GitHub ou GitLab.
2. Dans Render, choisir **New > Blueprint**.
3. Sélectionner le dépôt et le fichier racine `render.yaml`.
4. Renseigner toutes les variables marquées `sync: false`.
5. Lancer la création du Blueprint.

Le Blueprint crée :

- `medisecours-db` ;
- `medisecours-backend` ;
- `medisecours-websocket`.

### Variables du backend Render

| Variable | Valeur attendue |
|---|---|
| `JWT_PRIVATE_KEY_BASE64` | contenu base64 de `private.pem` |
| `JWT_PUBLIC_KEY_BASE64` | contenu base64 de `public.pem` |
| `JWT_PASSPHRASE` | phrase secrète utilisée par OpenSSL |
| `FRONTEND_URL` | `https://votre-projet.vercel.app` |
| `DEFAULT_URI` | `https://medisecours-backend.onrender.com` |
| `CORS_ALLOW_ORIGIN` | `^https://votre-projet\.vercel\.app$` |
| `GOOGLE_CLIENT_ID` | identifiant OAuth Web Google |
| `GOOGLE_CLIENT_SECRET` | secret OAuth Google |
| `MAILER_DSN` | DSN SMTP du fournisseur |
| `MAILER_SENDER_EMAIL` | adresse d’expédition vérifiée |

Le groupe `medisecours-realtime` génère une seule valeur
`WS_PUBLISH_SECRET`, partagée automatiquement par le backend et le WebSocket.
Le Blueprint configure aussi `TRUSTED_PROXIES=127.0.0.1,REMOTE_ADDR` afin que
Symfony utilise correctement l’adresse client et le protocole transmis par le
proxy Render.

### Variables du WebSocket Render

| Variable | Valeur attendue |
|---|---|
| `JWT_PUBLIC_KEY_BASE64` | même valeur que sur le backend |
| `WS_ALLOWED_ORIGINS` | `https://votre-projet.vercel.app` |

Plusieurs origines sont séparées par des virgules, sans chemin final.

### Stockage des médias

Le disque `medisecours-uploads` est monté dans `/app/var/uploads`. Il empêche
la disparition des photos, vidéos, notes vocales et images de profil lors
d’un redéploiement.

Le Blueprint utilise les offres Render payantes minimales, car :

- un disque persistant n’est pas disponible sur un service gratuit ;
- un WebSocket gratuit peut s’endormir et interrompre les notifications ;
- une base gratuite n’est pas adaptée à une conservation durable.

Pour une démonstration temporaire, les plans peuvent être changés en `free`,
mais les médias ne doivent alors pas dépendre du système de fichiers local.

## 4. Déployer le frontend sur Vercel

1. Importer le même dépôt dans Vercel.
2. Définir **Root Directory** sur `medisecours-frontend`.
3. Laisser le framework détecté sur **Next.js**.
4. Ajouter les variables d’environnement de production.
5. Déployer.

### Variables Vercel

| Variable | Valeur attendue |
|---|---|
| `API_BASE_URL` | `https://medisecours-backend.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://medisecours-websocket.onrender.com/ws` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | identifiant OAuth Web Google |

Ne pas définir `NEXT_PUBLIC_API_BASE_URL` sur Vercel. Les appels `/api`
passent par la réécriture Next.js, ce qui maintient les cookies
d’authentification sur le même domaine.

Ne jamais ajouter `WS_PUBLISH_SECRET` à Vercel : le navigateur ne doit pas
connaître ce secret.

## 5. Finaliser les domaines

Après le premier déploiement Vercel, reporter son URL exacte dans Render :

- `FRONTEND_URL` ;
- `CORS_ALLOW_ORIGIN` ;
- `WS_ALLOWED_ORIGINS`.

Redéployer ensuite les deux services Render.

Dans Google Cloud Console, ajouter l’URL Vercel dans les **origines JavaScript
autorisées**. Le flux actuel envoie un ID token à `/api/auth/google` et
n’utilise pas de route de callback OAuth côté navigateur.

Pour un domaine personnalisé, remplacer l’URL Vercel dans Vercel, Render,
Google OAuth et les expressions CORS.

## 6. Base de données

Le conteneur backend exécute automatiquement les migrations Doctrine au
démarrage, avec cinq tentatives si PostgreSQL n’est pas encore disponible.

Les migrations créent le schéma, mais elles ne copient pas les données de la
base locale. Pour conserver des comptes ou des contenus locaux, effectuer un
export PostgreSQL contrôlé puis un import dans la base Render. Ne jamais
importer de données personnelles réelles dans un environnement de test.

## 7. Vérifications après déploiement

Contrôler dans cet ordre :

1. `GET https://medisecours-backend.onrender.com/api/health` renvoie `200`.
2. `GET https://medisecours-websocket.onrender.com/health` renvoie `200`.
3. La page d’accueil Vercel charge sans erreur de console.
4. L’inscription, la connexion, l’actualisation de session et la déconnexion fonctionnent.
5. Une photo envoyée reste disponible après un redéploiement backend.
6. Un patient et un médecin voient les nouveaux messages sans recharger la page.
7. Les images, vidéos et notes vocales s’affichent chez l’expéditeur et le destinataire.
8. Les emails de vérification et de consultation contiennent l’URL Vercel.
9. Google Login accepte le domaine de production.
10. Les routes administrateur refusent toujours les écritures anonymes.

## 8. Diagnostic rapide

- `401 /api/auth/refresh` après connexion : vérifier que le navigateur appelle
  `/api/...` sur Vercel et que `API_BASE_URL` est défini côté serveur Vercel.
- WebSocket `403` : vérifier l’origine exacte dans `WS_ALLOWED_ORIGINS` et le
  suffixe `/ws` dans `NEXT_PUBLIC_WS_URL`.
- WebSocket `4003` : vérifier que les deux services utilisent la même clé JWT
  publique et que la phrase secrète correspond à la clé privée.
- Médias perdus : vérifier le disque Render et son montage
  `/app/var/uploads`.
- Erreur SMTP : vérifier le DSN, l’adresse expéditrice autorisée et les règles
  réseau du fournisseur.
