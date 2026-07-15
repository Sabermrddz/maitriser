# MAITRISEZ — Gestion de Quiz & Examens

Application MERN full-stack avec authentification Clerk, dédiée à la création, gestion et passation de quiz, examens à choix multiples, études de cas et examens oraux. Interface unique avec routage par rôle (utilisateur et administrateur) et support multilingue (français / anglais).

**Créateur : NEFISSI Mohamed Youcef**

---

## Fonctionnalités

### Interface Utilisateur (`/`)

- **Authentification** — Clerk (email, OAuth Google/GitHub, SSO)
- **Quiz** — Passation avec minuteur, feedback immédiat
- **Examens à Choix Multiples** — Mode examen chronométré
- **Études de Cas** — Cas pratiques avec sessionStorage (persistance en cas de rafraîchissement)
- **Examens Oraux** — Réponse vocale enregistrée via le navigateur
- **Livres** — Consultation de PDF, recherche avec debounce
- **Favoris** — Sauvegarde et gestion des questions favorites
- **Révision** — Revue détaillée des résultats
- **Profil** — Informations personnelles, progression
- **Support multilingue** — Français / Anglais

### Interface Administrateur (`/admin/*`)

- **Dashboard** — Statistiques globales, graphiques d'activité (Chart.js)
- **Gestion des Quiz** — CRUD complet, questions par module, minuteur, statut publié/brouillon
- **Gestion des Modules** — Organisation des quiz par thème
- **Gestion des Utilisateurs** — Consultation, recherche, pagination
- **Gestion des Examens Oraux** — Création et suivi des sessions vocales
- **Gestion des Livres** — Upload de PDF, consultation
- **Rapports** — Analyse des résultats par quiz, module, utilisateur
- **Profil Administrateur** — Modification des informations personnelles

### Backend (`Backend/` — port 4000)

- Authentification hybride **Clerk** (principal) + **JWT** (legacy email/mot de passe)
- Synchronisation automatique des utilisateurs Clerk vers MongoDB
- Gestion d'erreur du sync avec classification (token expiré → 401, API Clerk → 502, autres → 500)
- Contrôle d'accès par rôle (`admin` / `user`)
- Cache mémoire sur les endpoints GET fréquents
- Pagination, validation (`express-validator`)
- Journalisation structurée (Pino) — logs ajoutés sur toutes les routes clés
- Upload sécurisé de fichiers (PDF)
- Rate limiting global et par utilisateur
- Blacklist JWT in-memory avec TTL

---

## Technologies

| Frontend | Backend | Auth & Sécurité |
|---|---|---|
| React 18 + Vite | Node.js | Clerk Core 3 (`@clerk/react`) |
| React Router 7 | Express.js | JWT (legacy) |
| Chart.js + react-chartjs-2 | MongoDB + Mongoose | BcryptJS |
| Axios | Pino (logger) | express-validator |
| react-icons | node-cache | express-rate-limit |
| i18n (maison) | Nodemailer | Helmet + CORS |
| CSS Modules | Multer (PDF upload) | |

---

## Déploiement

### Méthode 1 — Développement local (npm)

#### Prérequis

- Node.js 20+
- MongoDB 7+ (local ou distant)
- Compte Clerk (gratuit sur https://clerk.com)

#### 1. Cloner

```bash
git clone https://github.com/youyounefissi16-lang/maitriser.git
cd maitriser
```

#### 2. Backend

```bash
cd Backend
cp .env.example .env
npm install
```

Éditer `Backend/.env` :

```env
MONGODB_URI=mongodb://localhost:27017/quizapp
PORT=4000
JWT_SECRET=your_jwt_secret_at_least_32_chars
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
ADMIN_SECRET_CODE=your_admin_secret_code
CORS_ORIGIN=http://localhost:5173
```

#### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
```

Éditer `frontend/.env` :

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

#### 4. Lancer

```bash
# Terminal 1 — Backend
cd Backend && npm run dev

# Terminal 2 — Frontend (avec proxy Vite pour les appels API)
cd frontend && npm run dev
```

Le frontend utilise un proxy Vite intégré (configuré dans `vite.config.js`) :
- `/api/*` → `http://localhost:4000` (requêtes HTTP)
- `/ws/*` → `ws://localhost:4000` (WebSocket admin)

#### 5. Accès

- **Utilisateur** : `http://localhost:5173`
- **Admin** : `http://localhost:5173/admin/dashboard`
- **Configuration admin** : `http://localhost:5173/admin/setup`
- **API** : `http://localhost:4000/api`

#### 6. Données de démonstration

```bash
cd Backend
cp ../seed.mjs .
node seed.mjs
```

Cela crée 6 modules (Cardiologie, Pneumologie, etc.), 10 QCM et 6 examens oraux.

---

### Méthode 2 — Docker Compose (production-like)

#### Prérequis

- Docker Desktop 24+
- Docker Compose (inclus avec Docker Desktop)
- Compte Clerk

#### 1. Configurer

```bash
git clone https://github.com/youyounefissi16-lang/maitriser.git
cd maitriser
```

Créer un fichier `.env` à la racine (optionnel — les valeurs par défaut sont dans `docker-compose.yml`) :

```env
JWT_SECRET=your_jwt_secret_at_least_32_chars
CLERK_SECRET_KEY=sk_test_...
ADMIN_SECRET_CODE=your_admin_secret_code
```

#### 2. Lancer

```bash
docker compose up --build -d
```

Cela démarre 3 conteneurs :

| Service | Port | Rôle |
|---|---|---|
| `mongodb` | 27017 | Base de données |
| `backend` | 4000 | API Express |
| `frontend` | 5173 | Nginx servant le SPA + proxy API |

#### 3. Amorcer les données

```bash
node seed.mjs
```

#### 4. Accès

- `http://localhost:5173`

#### Architecture Docker

```
Browser ──> localhost:5173 ──> Nginx (frontend container)
                                  ├── /api/*     ──> backend:4000
                                  └── /ws/admin  ──> backend:4000 (WebSocket)
```

Pas de problèmes CORS : toutes les requêtes transitent par le même port 5173.

---

### Méthode 3 — Partager avec un tunnel (démo externe)

Pour donner accès à des personnes en dehors de votre réseau local :

#### Option A — Cloudflare Tunnel (recommandé)

```bash
# Après avoir lancé Docker Compose
cloudflared tunnel --url http://localhost:5173
```

Cloudflare fournit une URL publique : `https://xxxx.trycloudflare.com`

#### Option B — ngrok

```bash
ngrok http 5173
```

**Attention** : les tunnels Cloudflare gratuits n'ont aucune garantie de disponibilité. Pour une utilisation en production, utilisez un tunnel nommé Cloudflare ou déployez sur un VPS.

---

### Méthode 4 — VPS / Production

#### Prérequis

- Serveur Ubuntu/Debian avec Docker
- Nom de domaine pointant vers le serveur
- Let's Encrypt (Certbot) pour le SSL

#### 1. Déployer

```bash
git clone https://github.com/youyounefissi16-lang/maitriser.git
cd maitriser
docker compose up --build -d
```

#### 2. Nginx reverse proxy (SSL)

Installer Nginx et Certbot, puis configurer :

```nginx
server {
    listen 443 ssl;
    server_name votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Support WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 3. Variables d'environnement sécurisées

Ne pas utiliser les valeurs par défaut de `docker-compose.yml`. Créer un fichier `.env` :

```env
JWT_SECRET=<généré via: openssl rand -base64 48>
CLERK_SECRET_KEY=sk_live_...          # Clé de production Clerk
ADMIN_SECRET_CODE=<code_admin_complexe_16_caractères_min>
```

---

## Seed de données

Le script `seed.mjs` peuple la base MongoDB avec des données de démonstration :

```
Exécution : node seed.mjs
```

Données créées :

| Type | Quantité | Exemples |
|---|---|---|
| Modules | 6 | Cardiologie, Pneumologie, Neurologie... |
| QCM | 10 | Insuffisance cardiaque, AVC, Asthme... |
| Examens oraux | 6 | Cas cliniques avec critères d'évaluation |

Le script se connecte à `mongodb://localhost:27017/quizapp` (modifiable via `MONGODB_URI`).

**Pour réinitialiser :** le script efface et recrée toutes les données à chaque exécution.

---

## Structure du projet

```
maitriser/
├── Backend/
│   ├── controllers/         # Logique métier
│   ├── models/              # Schémas Mongoose
│   ├── routes/              # Définitions des routes API
│   ├── middleware/          # JWT blacklist, validate, password validator
│   ├── utils/               # Cache, email, pagination, logger, escapeRegex
│   └── index.js             # Point d'entrée
│
├── frontend/                # Interface unique (React + Vite)
│   ├── src/
│   │   ├── components/      # Composants partagés (Header, quizCard, adminHeader...)
│   │   ├── pages/           # Pages utilisateur + admin (Dashboard, QuizManagement...)
│   │   ├── config/          # API, endpoints, authFetch, axiosAdmin
│   │   ├── context/         # Language, Sound, Theme
│   │   ├── hooks/           # useAdminWS, useClerkToken
│   │   ├── locales/         # i18n (fr, en)
│   │   ├── styles/          # Thème teal + thème admin + dark mode
│   │   └── utils/           # Token store, shuffle, sound, logger
│   ├── Dockerfile           # Build multi-stage (Vite → Nginx)
│   └── nginx.conf           # Proxy API + WebSocket
│
├── seed.mjs                 # Script d'amorçage des données
├── docker-compose.yml       # Orchestration complète
├── sample_quizzes.csv       # Exemples de données CSV
└── README.md
```

---

## API — Aperçu

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/clerk-sync` | Synchroniser un utilisateur Clerk | Token |
| POST | `/api/auth/login` | Connexion legacy (email/mot de passe) | — |
| POST | `/api/auth/signup` | Inscription legacy | — |
| POST | `/api/admin/claim` | Réclamer le rôle admin | Token |
| GET | `/api/modules` | Modules (filtrés par année) | Token |
| GET | `/api/quizzes` | Quiz paginés | Token |
| GET | `/api/voice-exams` | Examens oraux (filtrés) | Token |
| GET | `/api/books` | Livres paginés | Token |
| POST | `/api/quizzes/:id/submit` | Soumettre un quiz | Token |
| GET | `/api/results/:userId` | Résultats paginés | Token |
| GET | `/api/dashboard-stats` | Statistiques dashboard | Token |

Toutes les routes sous `/api/` (sauf health, auth legacy) nécessitent un token Clerk ou JWT valide.

---

## Variables d'environnement

### Backend (`Backend/.env`)

| Variable | Requis | Défaut | Description |
|---|---|---|---|
| `MONGODB_URI` | Oui | — | URI de connexion MongoDB |
| `PORT` | Non | 4000 | Port du serveur |
| `JWT_SECRET` | Oui | — | ≥ 32 caractères, pour tokens legacy |
| `CLERK_SECRET_KEY` | Oui | — | Clé secrète Clerk (staging/prod) |
| `ADMIN_SECRET_CODE` | Oui | — | **≥ 16 caractères obligatoire**, pour activer admin |
| `CORS_ORIGIN` | Non | `http://localhost:5173` | Origines autorisées (séparées par des virgules) |
| `SMTP_*` | Non | — | Configuration email (notifications) |

### Frontend (`frontend/.env`)

| Variable | Requis | Défaut | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Non | `''` (relative) | URL de base de l'API. En dev sans proxy : `http://localhost:4000` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Oui | — | Clé publique Clerk |

---

## Sécurité

- Authentification via **Clerk** (tokens JWT court-lived, refresh automatique)
- Fallback JWT/BcryptJS pour les comptes legacy
- Intercepteur Axios avec token dynamique (`getToken()`)
- Blacklist JWT in-memory avec nettoyage par TTL
- Rate limiting : global (1000/min), par utilisateur (300/min), auth (30/15min)
- Protection des routes par rôle côté frontend et backend
- Validation des entrées (`express-validator`, `.isMongoId()`)
- Protection path traversal sur les téléchargements de fichiers
- Headers de sécurité (Helmet, CORS)
- Messages d'erreur génériques côté client (pas de fuite de stack)

---

## Licence

MIT
