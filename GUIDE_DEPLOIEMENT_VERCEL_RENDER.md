# Deploiement MediSecours : Vercel, Render et Neon

Architecture cible :

- frontend Next.js sur Vercel ;
- API Symfony dans un service Docker Render ;
- serveur WebSocket dans un second service Render ;
- PostgreSQL gere par Neon ;
- medias conserves sur un disque persistant Render ;
- emails envoyes par un relais SMTP, par exemple Brevo.

Le fichier racine `render.yaml` cree les deux services Render. La base Neon
doit etre creee separement avant le premier deploiement du backend.

## 1. Donnees medicales chargees automatiquement

Une base Neon neuve ne contient aucune donnee. Le demarrage du backend execute
maintenant, dans cet ordre :

1. les migrations Doctrine ;
2. `app:bootstrap-reference-data` ;
3. le demarrage de PHP-FPM et Nginx.

La version `2026-08-07.1` charge :

- 1 038 enregistrements du fichier source, donnant 1 026 maladies distinctes ;
- exactement 200 maladies visibles dans le catalogue patient ;
- l'index structure des symptomes ;
- 100 protocoles maitres et leurs variantes, soit 500 fiches de premiers secours.

La table `reference_data_version` enregistre la version appliquee. Un
redeploiement avec la meme valeur `REFERENCE_DATA_VERSION` ne recharge pas les
donnees. Un verrou PostgreSQL empeche deux instances de lancer le meme import
en parallele.

Pour publier une nouvelle version du catalogue :

1. modifier les donnees ou les generateurs dans le code ;
2. changer `REFERENCE_DATA_VERSION` dans `render.yaml`, par exemple
   `2026-09-01.1` ;
3. redeployer le backend.

Commandes de controle :

```bash
php bin/console app:bootstrap-reference-data --check --env=prod
php bin/console app:bootstrap-reference-data --catalog-version=2026-08-07.1 --env=prod
```

Ne pas utiliser `--force` en production sans sauvegarde : cette option
reconstruit les catalogues meme si la version est deja appliquee.

## 2. Creer la base Neon

1. Creer un projet et une base PostgreSQL dans Neon.
2. Choisir si possible une region proche de Render Frankfurt.
3. Ouvrir l'ecran **Connect** de Neon.
4. Selectionner la connexion directe, sans suffixe `-pooler`, pour le backend.
5. Copier la chaine de connexion complete fournie par Neon.

Exemple de forme, sans valeur reelle :

```text
postgresql://ROLE:MOT_DE_PASSE@EP-ENDPOINT.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

La connexion directe est utilisee parce que le demarrage effectue des
migrations et prend un verrou de session pendant le bootstrap. Ne jamais
committer cette URL. La placer uniquement dans la variable secrète
`DATABASE_URL` de Render.

Le backend ne cree plus de base PostgreSQL Render. Neon est la seule base de
production.

## 3. Generer les cles JWT

Depuis `medisecours-backend` :

```powershell
New-Item -ItemType Directory -Force config/jwt
openssl genpkey -algorithm RSA -aes-256-cbc -pkeyopt rsa_keygen_bits:4096 -out config/jwt/private.pem
openssl pkey -in config/jwt/private.pem -pubout -out config/jwt/public.pem
```

Convertir ensuite chaque fichier en base64 :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path "config/jwt/private.pem"))) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path "config/jwt/public.pem"))) | Set-Clipboard
```

Les deux services Render doivent recevoir exactement la meme valeur
`JWT_PUBLIC_KEY_BASE64`. Seul le backend recoit `JWT_PRIVATE_KEY_BASE64` et
`JWT_PASSPHRASE`.

## 4. Variables du backend Render

### Variables a saisir manuellement

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | chaine de connexion directe copiee depuis Neon |
| `JWT_PRIVATE_KEY_BASE64` | contenu base64 de `private.pem` |
| `JWT_PUBLIC_KEY_BASE64` | contenu base64 de `public.pem` |
| `JWT_PASSPHRASE` | phrase secrete de la cle privee |
| `FRONTEND_URL` | `https://votre-projet.vercel.app` |
| `DEFAULT_URI` | URL publique du backend Render |
| `CORS_ALLOW_ORIGIN` | `^https://votre-projet\.vercel\.app$` |
| `GOOGLE_CLIENT_ID` | identifiant du client OAuth Web Google |
| `MAILER_DSN` | DSN SMTP du fournisseur d'email |
| `MAILER_SENDER_EMAIL` | adresse expediteur verifiee |

### Variables deja configurees dans `render.yaml`

| Variable | Valeur ou origine |
|---|---|
| `APP_ENV` | `prod` |
| `APP_DEBUG` | `0` |
| `APP_SECRET` | genere par Render |
| `APP_SHARE_DIR` | `/app/var` |
| `TRUSTED_PROXIES` | `127.0.0.1,REMOTE_ADDR` |
| `PORT` | `10000` |
| `BOOTSTRAP_REFERENCE_DATA` | `1` |
| `REFERENCE_DATA_VERSION` | `2026-08-07.1` |
| `JWT_SECRET_KEY` | `/app/config/jwt/private.pem` |
| `JWT_PUBLIC_KEY` | `/app/config/jwt/public.pem` |
| `JWT_TTL` | `7200` secondes |
| `WS_PUBLISH_URL` | adresse interne du service WebSocket |
| `WS_PUBLISH_SECRET` | genere et partage par le groupe Render |
| `MAILER_SENDER_NAME` | `MediSecours` |

Pour desactiver exceptionnellement l'import automatique, mettre
`BOOTSTRAP_REFERENCE_DATA=0`.

## 5. Configurer les emails avec Brevo

Dans Brevo :

1. verifier le domaine ou au minimum l'adresse d'expedition ;
2. creer une cle SMTP dediee a MediSecours ;
3. recuperer le login SMTP et la cle SMTP ;
4. construire `MAILER_DSN`.

Forme recommandee :

```text
smtp://LOGIN_SMTP:CLE_SMTP_ENCODEE@smtp-relay.brevo.com:587
```

Si le login ou la cle contient `@`, `:`, `/`, `?`, `#` ou `%`, encoder cette
valeur pour une URL avant de la placer dans le DSN.

Variables associees :

```text
MAILER_DSN=smtp://...
MAILER_SENDER_EMAIL=no-reply@votre-domaine.com
MAILER_SENDER_NAME=MediSecours
FRONTEND_URL=https://votre-projet.vercel.app
```

Test depuis le Shell Render :

```bash
php bin/console app:test-email votre-adresse@example.com --env=prod
```

## 6. Configurer Google Authentication

Le flux actuel utilise Google Identity Services dans le navigateur. Il recoit
un ID token puis l'envoie a `/api/auth/google`. Aucun
`GOOGLE_CLIENT_SECRET` n'est necessaire pour ce flux.

Dans Google Cloud Console :

1. configurer l'ecran de consentement OAuth ;
2. creer un identifiant **OAuth client ID** de type **Web application** ;
3. ajouter l'URL Vercel dans les origines JavaScript autorisees ;
4. utiliser le meme Client ID sur Vercel et Render.

Variables :

```text
# Render backend
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Vercel frontend
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

Le projet actuel n'utilise pas de redirection OAuth serveur. Il n'est donc pas
necessaire d'ajouter une URL de callback pour ce flux Google ID token.

## 7. Variables du service WebSocket Render

| Variable | Valeur |
|---|---|
| `JWT_PUBLIC_KEY_BASE64` | meme cle publique que le backend |
| `WS_ALLOWED_ORIGINS` | URL exacte du frontend Vercel |
| `WS_PUBLISH_SECRET` | genere par le groupe `medisecours-realtime` |
| `JWT_ISSUER` | `medisecours-api` |
| `JWT_AUDIENCE` | `medisecours-websocket` |

L'URL publique utilisee par Vercel doit se terminer par `/ws` :

```text
wss://medisecours-websocket.onrender.com/ws
```

## 8. Variables Vercel

Configurer le projet Vercel avec `medisecours-frontend` comme **Root
Directory**.

| Variable | Valeur |
|---|---|
| `API_BASE_URL` | URL publique du backend Render |
| `NEXT_PUBLIC_WS_URL` | URL `wss://.../ws` du service WebSocket |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | meme Client ID Google que le backend |

Ne pas definir `NEXT_PUBLIC_API_BASE_URL` en production. Les appels `/api`
doivent passer par la reecriture Vercel afin que les cookies HttpOnly restent
associes au domaine frontend.

Ne jamais placer `WS_PUBLISH_SECRET`, les cles JWT ou `DATABASE_URL` dans
Vercel.

## 9. Creer les services Render

1. Pousser le depot sur GitHub.
2. Dans Render, choisir **New > Blueprint**.
3. Selectionner le fichier `render.yaml` a la racine.
4. Saisir toutes les variables marquees `sync: false`.
5. Creer les services.

Le Blueprint cree :

- `medisecours-backend` ;
- `medisecours-websocket`.

Il ne cree pas de base Render, car `DATABASE_URL` pointe vers Neon.

Le disque `medisecours-uploads`, monte sur `/app/var/uploads`, conserve les
photos, videos et notes vocales apres les redeploiements.

## 10. Verification apres deploiement

1. Ouvrir `/api/health` sur le backend Render.
2. Verifier dans les logs la migration puis le message
   `Catalogue 2026-08-07.1 charge et enregistre`.
3. Dans le Shell Render, lancer :

```bash
php bin/console app:bootstrap-reference-data --check --env=prod
```

Les volumes attendus sur une base neuve sont :

```text
Maladies stockees                1026
Maladies visibles aux patients   200
Fiches de premiers secours       500
```

4. Verifier `/api/public/conditions`.
5. Verifier `/api/public/first-aid-protocols`.
6. Tester une inscription classique et l'email recu.
7. Tester Google Login.
8. Envoyer un texte, une image et une note vocale entre patient et medecin.
9. Redeployer le backend et verifier qu'aucun doublon de catalogue n'apparait.

## 11. Securite

Ne jamais versionner :

- `.env.local` ou `.env.prod` ;
- les fichiers `config/jwt/*.pem` ;
- l'URL Neon ;
- les cles SMTP ;
- les secrets Google ou WebSocket.

Le fichier `.env.prod` a deja existe dans l'historique Git. Les anciennes
valeurs doivent etre considerees comme exposees et remplacees avant le
deploiement.
