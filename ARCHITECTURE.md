# Architecture & Documentation — MAITRISEZ (QuizApp-v7)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture Backend](#2-architecture-backend)
3. [Architecture Frontend](#3-architecture-frontend)
4. [Flux de données](#4-flux-de-données)
5. [Choix techniques justifiés](#5-choix-techniques-justifiés)
6. [Progression du développement (historique des commits)](#6-progression-du-développement)
7. [Points de défaillance et crash potentiels](#7-points-de-défaillance)

---

## 1. Vue d'ensemble

MAITRISEZ est une application de préparation aux examens de médecine et pharmacie. Elle permet aux étudiants de :

- Répondre à des QCM par module/matière
- Passer des examens blancs chronométrés (Mock Exam)
- Passer des examens oraux avec évaluation par critères (Voice Exam)
- Consulter des livres PDF (bibliothèque)
- Suivre leur progression (statistiques, séries)
- Marquer des questions pour révision (bookmarks)

**Stack technique :**

| Couche | Technologie | Version |
|--------|------------|---------|
| Frontend | React + Vite | React 19, Vite 6 |
| Authentification | Clerk (Core 3) | `@clerk/react` ~6.10, `@clerk/backend` ~3.8 |
| Backend | Express.js | Node 20+ |
| Base de données | MongoDB + Mongoose | MongoDB 7 |
| Cache backend | Map mémoire (in-memory) | TTL 5 min |
| Cache frontend | localStorage | TTL 1h |
| WebSocket | ws (native) | Admin en temps réel |
| Logger | Pino (backend) / Console (frontend) | |
| Tests | Vitest | |
| CI/CD | GitHub Actions | |
| Déploiement | Docker Compose (3 services) | |

---

## 2. Architecture Backend

### 2.1 Structure des dossiers

```
Backend/
├── controllers/       # Logique métier des routes
│   ├── authController.js     # verifyToken, requireAdmin
│   ├── contactController.js  # Gestion des messages contact
│   └── feedbackController.js # Gestion des feedbacks
├── middleware/
│   ├── jwtBlacklist.js       # Blacklist JWT en mémoire
│   ├── passwordValidator.js  # Validation force mot de passe
│   └── validate.js           # Gestion erreurs express-validator
├── models/                   # Schémas Mongoose (11 modèles)
├── routes/                   # Définition des routes Express
├── tests/                    # Tests Vitest
├── utils/
│   ├── asyncHandler.js       # catchAsync wrapper
│   ├── cache.js              # Cache mémoire avec TTL
│   ├── email.js              # Nodemailer (SMTP)
│   ├── escapeRegex.js
│   ├── logger.js             # Pino logger
│   └── paginate.js           # Pagination helper
├── uploads/books/            # Fichiers PDF uploadés
├── app.js                    # Configuration Express
├── index.js                  # Point d'entrée (connexion DB, serveur, WS)
├── ws.js                     # Serveur WebSocket (admin)
└── seed.mjs                  # Script d'initialisation des données
```

### 2.2 Modèles et relations

```
User ──╼ QuizResult       (via userId: String)
User ──╼ VoiceExamResult  (via userId: String)
User ──╼ Bookmark         (via userId: String)
User ──╼ Feedback         (via userId: ObjectId)

Module ──╼ Quiz           (via moduleId: ObjectId)
Module ──╼ VoiceExam      (via moduleId: ObjectId)
Module ──╼ Case           (via moduleId: ObjectId)
Module ──╼ Book           (via moduleIds: [ObjectId])

Case ──╼ Quiz             (via caseId: ObjectId)
```

**Particularité :** `QuizResult.userId` et `Bookmark.userId` sont des **strings** (pas des ObjectId). Les étudiants s'identifient via un `userId` texte (ex: "U001"), pas un `_id` MongoDB.

### 2.3 Pipeline middleware (app.js)

Ordre d'exécution des middlewares Express :

```
1. helmet()                    ── En-têtes de sécurité
2. compression()               ── Gzip/Brotli
3. httpLogger (Pino)           ── Logging HTTP (sauf /api/health)
4. Private Network Access      ── Bloque requêtes non-navigateur
5. cors()                      ── CORS (whitelist + ngrok)
6. OPTIONS catch-all           ── 204 pour toutes les preflight
7. express.json()              ── Parse JSON (limite 1MB)
8. globalLimiter               ── 1000 req/min
9. authLimiter (30/15min)      ── Login/register
   submitLimiter (20/min)      ── Soumissions quiz
   loginLimiter (10/15min)     ── Admin login
10. Routes publiques           ── /api/auth, /api/contact
11. verifyToken + userLimiter  ── Routes protégées
12. verifyToken + requireAdmin ── Routes admin
13. Error handler              ── 500 générique
```

### 2.4 Authentification — Double système

Le backend supporte **deux systèmes d'auth** en parallèle :

**Primaire — Clerk (Core 3) :**
- Les utilisateurs s'authentifient via le composant `<SignIn>` de Clerk
- Clerk émet des JWT courte durée (~1h)
- Le middleware `verifyToken` utilise `@clerk/backend` `verifyToken()` pour décoder le JWT
- Le `payload.sub` est le Clerk User ID (ex: `user_2abc123`)
- Recherche de l'utilisateur local : `User.findOne({ clerkId: payload.sub })`
- Si non trouvé → 401 "User not found. Sync your account first."

**Secondaire — JWT legacy :**
- Pour les utilisateurs créés avant l'introduction de Clerk
- Authentification via `POST /api/users/login` avec email + mot de passe
- Le middleware `verifyToken` tente Clerk d'abord, puis JWT en fallback

**Pourquoi Clerk ?**
- UI pré-construite (composants SignIn, SignUp, UserButton)
- Support OAuth (Google, GitHub), SSO, MFA sans développement
- Gestion des sessions (refresh automatique des tokens)
- Sécurité externalisée (rate limiting, breach detection)
- L'équipe peut se concentrer sur les fonctionnalités pédagogiques

### 2.5 Synchronisation Clerk → MongoDB

```
POST /api/auth/clerk-sync
Authorization: Bearer <JWT Clerk>

1. Vérifier le JWT Clerk → payload.sub (Clerk User ID)
2. Récupérer les infos utilisateur via Clerk API :
   - email, firstName + lastName, emailVerified
3. Chercher utilisateur local :
   ├── Si clerkId existe → Mettre à jour
   ├── Si email existe → Lier clerkId
   └── Sinon → Créer utilisateur
4. Retourner { userId, role }
```

**Gestion des erreurs :**
- `TokenVerificationError` → 401 avec message explicite (token expiré, signature invalide)
- `ClerkAPIResponseError` → statut approprié avec le message de Clerk
- Autres erreurs → 500 avec le message d'erreur pour diagnostic
- Log structuré incluant `message`, `reason`, `status`
- Succès → `logger.info({ userId, role }, 'Account synced via Clerk')`

### 2.6 Synchronisation échouée — UX

Si `/api/auth/clerk-sync` échoue, le frontend affiche une page d'erreur dédiée (`SyncErrorPage`) :
1. Message d'erreur technique affiché (format monospace)
2. Bouton **Retry** — appelle `getToken()` pour un token Clerk frais puis réessaye
3. Bouton **Sign Out** — déconnecte l'utilisateur de Clerk
4. Utilise `AbortController` pour le nettoyage au démontage du composant

### 2.6 WebSocket (admin)

- Point de montage : `/ws/admin`
- Authentification : JWT legacy en query param `?token=`
- Heartbeat : ping toutes les 30s
- Événements broadcastés : `quiz:submitted`, `user:signedUp`, `feedback:new`, `contact:new`
- Frontend : `useAdminWS` hook avec reconnection automatique (backoff exponentiel 1s → 30s max)

### 2.7 Cache

- Cache **in-memory** (Map) avec TTL par défaut de 5 minutes
- Routes mises en cache : `GET /api/modules`, `/api/books`, `/api/voice-exams`
- Invalidation : suppression par pattern (`GET:/api/...`) à chaque création/modification/suppression
- Pourquoi in-memory plutôt que Redis ? Faible volume de données, complexité déployement réduite

---

## 3. Architecture Frontend

### 3.1 Arbre des composants

```
<BrowserRouter>
  <ClerkProvider>
    <ErrorBoundary>
      <AppContent>
        ├── Routes admin (/admin/*)
        │   ├── <AdminSetup />
        │   └── <AdminProtectedRoute>
        │       └── <AdminLayout>
        │           ├── AdminHeader
        │           ├── Sidebar
        │           └── <Outlet /> (pages admin)
        │
        └── Routes utilisateur
            └── <UserLayout>
                ├── CookieConsent
                ├── <Header /> | <Header2 />
                ├── <Routes>
                │   ├── Pages publiques (/login, /about, etc.)
                │   └── <ProtectedRoute>
                │       └── Pages protégées (/dashboard, etc.)
                ├── FeedbackButton
                └── Footer
```

### 3.2 Providers (contexte)

| Provider | Scope | État | Persistance |
|----------|-------|------|-------------|
| `LanguageProvider` | UserLayout + AdminLayout | `lang` (fr/en) | localStorage `'lang'` |
| `SoundProvider` | UserLayout + AdminLayout | `soundEnabled` | localStorage `'soundEnabled'` |
| `ToastProvider` | UserLayout + AdminLayout | Tableau de notifications | Aucune |
| `ThemeProvider` | AdminLayout uniquement | `darkMode` | localStorage `'darkMode'` |

**Pourquoi `ThemeProvider` n'est que dans AdminLayout ?** — Le layout utilisateur gère le dark mode via des props (`isDarkMode`, `toggleDarkMode`) passées depuis le `useState` de `AppContent`, tandis que l'admin utilise un contexte complet. C'est une incohérence historique.

### 3.3 Cycle de vie d'un token Clerk

```
1. Clerk émet un JWT (validité ~1h)
       │
2. useClerkToken stocke le JWT dans tokenStore._token
       │
3. Intercepteur axios attache le token à chaque requête :
     config.headers.Authorization = `Bearer ${token}`
       │
4. Toutes les 30s, useClerkToken appelle getToken() pour refresh
       │
5. fetchWithAuth appelle refreshToken() avant chaque tentative,
   qui appelle Clerk getToken() pour un token frais
       │
6. AppContent (effet global) :
   ├── Appelle getToken() (retry 30×300ms si null)
   ├── POST /api/auth/clerk-sync avec Bearer token
   ├── Succès → setToken(appJWT), stocke userId/role dans localStorage
   └── Échec → SyncErrorPage avec message + Retry/SignOut
       │
7. Backend verifyToken :
   - Tente clerkVerify(token) → payload.sub → User.findOne({clerkId})
   - Échec → fallback JWT legacy
```

**Gestion d'échec du sync :**
- Le token Clerk est utilisé pour `clerk-sync` ; si ce endpoint échoue, aucun JWT applicatif n'est émis
- Toutes les requêtes API suivantes utilisent le token Clerk (via l'intercepteur axios)
- Le middleware `verifyToken` tente Clerk → échec → fallback JWT → échec → 401
- L'utilisateur voit une page d'erreur avec possibilité de réessayer ou se déconnecter
- Au retry, `getToken()` est rappelé pour obtenir un token Clerk frais

### 3.4 Les 4 patterns d'appels API

| Fonction | Utilisée par | Retry | Source du token |
|----------|-------------|-------|-----------------|
| `fetchWithAuth()` | Pages utilisateur | 3 retry sur 401 | `refreshToken()` → Clerk `getToken()` |
| `authFetch()` | Pages admin | 1 retry sur 401 | `refreshToken()` |
| `axiosAdmin` | Pages admin (QuizManagement, etc.) | 0 retry, redirect /login | `getToken()` (valeur en cache, potentiellement obsolète) |
| `axios.post()` direct | clerk-sync, admin claim | 0 retry | `getToken()` explicite |

**Pourquoi trois patterns différents ?** — Historique : l'app avait deux frontends séparés (user + admin) qui ont été fusionnés. Les patterns n'ont pas été unifiés.

### 3.5 Internationalisation (i18n)

- Provider : `LanguageContext.jsx`
- Fonction de traduction : `t(key, params)` avec interpolation `{param}`
- 424 clés de traduction par langue (fr/en)
- La valeur par défaut (si contexte manquant) retourne la clé elle-même

---

## 4. Flux de données

### 4.1 Connexion complète (de l'input utilisateur au dashboard)

```
1. Utilisateur saisit ses identifiants dans <SignIn /> Clerk
       │
2. Clerk authentifie (email/password, Google, etc.)
       │
3. isSignedIn = true, getToken() disponible
       │
4. AppContent (effet global) :
   a. Appelle getToken() (retry 30×300ms si null)
   b. setToken(token) dans tokenStore
   c. POST /api/auth/clerk-sync avec Bearer token
   d. Stocke userId + userRole dans localStorage
       │
5. Login.jsx détecte userId dans localStorage
   → navigate('/dashboard')
       │
6. DashboardPage :
   a. Lit userId depuis localStorage
   b. fetchWithAuth('/api/results/{userId}?limit=200')
   c. Calcule stats (total, correct, %, streak)
   d. Affiche les cartes de statistiques
```

### 4.2 Appel à une route protégée

```
1. fetchWithAuth('/api/modules')
       │
2. refreshToken() → appel à Clerk getToken()
       │
3. GET /api/modules avec Authorization: Bearer <token>
       │
4. Backend : verifyToken middleware
   ├── Clerk verifyToken(token) → payload.sub = "user_2abc"
   ├── User.findOne({ clerkId: "user_2abc" })
   └── req.user = { id, userId, role }
       │
5. Route handler : Module.find({}) → réponse JSON
       │
6. Frontend : affiche la liste des modules
```

---

## 5. Choix techniques justifiés

### 5.1 Pourquoi Clerk plutôt que Auth0, Firebase Auth, ou JWT maison ?

| Critère | Clerk | Auth0 | Firebase Auth | JWT maison |
|---------|-------|-------|---------------|------------|
| Temps d'intégration | 30 min | 2-3h | 1-2h | 1-2 semaines |
| UI pré-construite | ✅ Composants React | ✅ Hosted pages | ✅ UI Kit | ❌ |
| OAuth/MFA/SSO | ✅ | ✅ | ✅ | ❌ |
| Coût (démarrage) | Gratuit (10k users) | Gratuit (7k) | Gratuit | Gratuit |
| Maintenance | Zéro | Faible | Faible | Élevée |
| Sécurité | Externalisée | Externalisée | Externalisée | Interne |
| Contrôle des données | Partiel | Partiel | Partiel | Total |

**Décision :** Clerk a été choisi pour :
1. **Composants React prêts à l'emploi** — Pas besoin de construire des formulaires d'auth
2. **Gestion de session automatique** — Pas de refresh token à gérer manuellement
3. **Mise sur le marché rapide** — L'équipe se concentre sur les features pédagogiques

### 5.2 Pourquoi un double système d'auth (Clerk + JWT legacy) ?

L'application existait avant l'introduction de Clerk. Des utilisateurs avaient déjà des comptes avec email + mot de passe. Plutôt que de forcer une migration, le système hybride permet :

- **Nouveaux utilisateurs** → Clerk (recommandé)
- **Anciens utilisateurs** → JWT legacy (migration progressive)
- **Fallback** → Si Clerk est indisponible, les utilisateurs legacy peuvent encore se connecter

### 5.3 Pourquoi `fetchWithAuth` avec 3 retry ?

Le JWT Clerk est courte durée (~1h). Si le token expire entre le moment où la page charge et le moment où la requête est faite, le retry permet de :

1. Obtenir un token frais via `refreshToken()` → Clerk `getToken()`
2. Réessayer la requête avec le nouveau token
3. Si le refresh échoue (Clerk indisponible), le retry offre une tolérance

### 5.4 Pourquoi le sync est dans AppContent plutôt que login.jsx ?

**Problème initial :** Le sync était dans `login.jsx`. Mais :
1. Si Clerk redirigeait l'utilisateur ailleurs qu'à `/login` après auth, le sync ne s'exécutait jamais
2. Un bug de *race condition* (statut dans les dépendances de `useEffect`) annulait le sync

**Solution :** Déplacer le sync dans `AppContent` qui :
- Est monté une fois et ne se démonte jamais
- N'a pas de problème de *race condition* lié aux changements de route
- Garantit que le sync s'exécute quel que soit le point d'entrée

### 5.5 Pourquoi `afterSignInUrl="/login"` ?

Par défaut, Clerk redirige vers la racine (`/`) après authentification. Sans cette option :
1. L'utilisateur arrive à `/` (page d'accueil)
2. `login.jsx` n'est jamais rendu → le sync ne s'exécute pas
3. Tous les appels API échouent avec 401

Avec `afterSignInUrl="/login"` :
1. Clerk redirige vers `/login` après auth
2. `AppContent` détecte `isSignedIn` et exécute le sync
3. `login.jsx` détecte `userId` dans localStorage → navigue vers `/dashboard`

### 5.6 Pourquoi le cache est en mémoire (pas Redis) ?

| Critère | Cache mémoire (Map) | Redis |
|---------|---------------------|-------|
| Complexité | Aucune (intégré) | Service séparé |
| Performance | <1µs | <1ms |
| Persistance | ❌ Perdu au restart | ✅ |
| Partage multi-instances | ❌ | ✅ |
| Volume de données | < 100 entrées | Adapté |

Le volume de données est faible (modules, livres, examens — quelques centaines d'entrées max). Un seul serveur backend est déployé. Le cache mémoire est suffisant et évite la complexité de Redis.

### 5.7 Pourquoi Pino comme logger ?

Pino est le logger Node.js le plus rapide (5x plus rapide que Winston). Pour une application Express avec du logging HTTP (pino-http), les performances sont critiques car chaque requête génère une entrée de log. Pino écrit en JSON → facile à indexer avec des outils comme ELK.

---

## 6. Progression du développement

### Commit 1 — `5f0c4f4` — Initialisation
Stack MERN complète avec Clerk Core 3. Deux frontends séparés (user + admin). Backend Express avec routes de base et modèles MongoDB.

### Commit 2 — `1d2a087` — README
Documentation du projet et instructions d'installation.

### Commit 3 — `3a9db2e` — Robustesse
- Gestion des erreurs process (`uncaughtException`, `unhandledRejection`)
- Wrapper `catchAsync` pour les routes asynchrones
- ESLint, tests Vitest, CI/CD GitHub Actions
- Dockerfiles backend + frontend

### Commit 4 — `2569633` — Token stale
**Problème :** Les tokens Clerk devenaient obsolètes (stale). Le frontend utilisait un token en cache qui pouvait expirer.
**Solution :** `fetchWithAuth` appelle maintenant `refreshToken()` (Clerk `getToken()`) avant chaque requête. Ajout de 3 retry sur 401 et d'un intervalle de refresh toutes les 30s.

### Commit 5 — `0199292` — Bugs critiques
- CORS renforcé
- Correction de `getToken` manquant dans BooksPage
- Auth iframe BookPreview
- Token stale dans AdminFrontend
- Fuite de `err.message` dans les routes admin (sécurité)

### Commit 6 — `9fe365c` — Remediation audit
- Durcissement sécurité (CORS, Helmet, validation)
- Rebranding → MAITRISEZ
- Pages légales (CGU, confidentialité)
- Validateur de mot de passe

### Commit 7 — `147cb62` — Fusion frontends
Les deux applications React (userFrontend + AdminFrontend) sont fusionnées en un seul `frontend/`. Réduction de la duplication, déploiement simplifié.

### Commit 8 — `0d669d1` — Vulnérabilités
- Comparaison en temps constant (`timingSafeEqual`) pour le code admin
- Protection contre le path traversal dans les téléchargements de livres

### Commit 9 — `465b062` — Corrections pédagogiques
- Affichage des résultats de quiz
- Fonctionnalité de bookmark (mismatch de types quizId)
- Parcours des examens cas cliniques

### Commit 10 — `1db8ee5` — Déploiement Docker
- Docker Compose (mongo + backend + frontend)
- Ajustement des limites de rate limiting
- Script seed (modules, quizzes, examens oraux)
- Documentation déploiement complète

### Commit 11 — `946a748` — Polissage
- Finalisation du dark mode (toutes les pages)
- Internationalisation complète (424 clés fr/en)
- UserHistoryModal pour l'admin
- Audit des couleurs (uniformisation theme teal)

### Commit 12 — `92e636d` — Fix sync login
**Problème :** Le sync Clerk → MongoDB s'exécutait dans login.jsx avec une race condition (le statut dans les dépendances useEffect l'annulait). Si Clerk redirigeait ailleurs qu'à `/login`, le sync ne s'exécutait pas du tout.
**Solution :** Déplacement du sync dans AppContent (global). Login.jsx simplifié : affiche `<SignIn />` et attend `userId` dans localStorage. Ajout de `afterSignInUrl="/login"`.

### Commit 13 — (non commité) — Robustesse sync & logs

**Améliorations :**

1. **Gestion d'erreur du `clerk-sync` :**
   - Classification des erreurs : `TokenVerificationError` → 401, `ClerkAPIResponseError` → statut Clerk, autres → 500
   - Message d'erreur détaillé retourné au client (plus de "Failed to sync account" générique)
   - Log enrichi avec `message`, `reason`, `status` pour diagnostic

2. **UX de l'échec de synchronisation :**
   - Page d'erreur dédiée (`SyncErrorPage`) avec le message technique et les boutons Retry / Sign Out
   - `useCallback` pour la fonction de sync avec `AbortController` pour le nettoyage
   - Au retry, un token Clerk frais est obtenu via `getToken()`

3. **Logs ajoutés :**
   - `clerkRoutes.js` — log de succès après sync réussi
   - `authController.js` — log de succès après vérification Clerk et JWT
   - `userAuthRoutes.js` — logs d'inscription, connexion, mise à jour de profil
   - `quizResultRoutes.js` — log de soumission de quiz + correction du `broadcast` après `return` (dead code)

4. **Correction :** `broadcast('quiz:submitted', ...)` dans `quizResultRoutes.js` était placé après `return`, rendant l'appel WebSocket mort. Déplacé avant le `return`.

---

## 7. Points de défaillance

### 7.1 Authentification Clerk

| Scénario | Comportement | Risque |
|----------|-------------|--------|
| Token expire pendant l'utilisation | `fetchWithAuth` reçoit 401, appelle `refreshToken()`, Clerk refresh silencieux | Transitoire : succès au retry |
| Refresh token échoue | 3 retry échouent → `"Token rejected after 3 retries"` | L'utilisateur voit une erreur, pas de redirect automatique vers login |
| Clerk indisponible | Backend fallback vers JWT legacy. Utilisateurs Clerk : 401 | Utilisateurs legacy non affectés |
| `CLERK_SECRET_KEY` manquante | Clerk auth désactivée. Seul le JWT legacy fonctionne | 401 pour tous les utilisateurs Clerk |

### 7.2 Race conditions

| Scénario | Risque |
|----------|--------|
| L'utilisateur se déconnecte pendant le sync | `userId` ou `adminRole` peut rester dans localStorage après logout |
| Navigation rapide entre pages | Les refs guards (`syncedRef.current`) et flags `aborted` protègent |
| Démontage du composant avant la fin d'un async | Possibilité de `setState` sur composant démonté si le check `aborted` est oublié |
| Dashboard fetch deux fois | Protégé par `fetchedRef.current` |

### 7.3 Variables d'environnement manquantes

| Variable | Conséquence |
|----------|------------|
| `JWT_SECRET` (backend) | Server refuse de démarrer (fatal) |
| `MONGODB_URI` (backend) | Server refuse de démarrer (fatal) |
| `CLERK_SECRET_KEY` (backend) | Clerk auth désactivée (warn) |
| `ADMIN_SECRET_CODE` (backend) | Code admin trop court → `timingSafeEqual` échoue (warn) |
| `VITE_CLERK_PUBLISHABLE_KEY` (frontend) | Clerk ne charge jamais → app bloquée sur "Loading..." |
| `VITE_API_BASE_URL` (frontend) | Appels API en relatif (marche avec proxy Vite ou Nginx) |

### 7.4 MongoDB

| Phase | Comportement |
|-------|-------------|
| Démarrage | `mongoose.connect()` échoue → `logger.fatal()` → `process.exit(1)` |
| Runtime (transitoire) | Toute opération DB throw → catchAsync → Express error handler → 500 |
| Reconnexion | Mongoose tente automatiquement. Échec permanent → la prochaine opération DB throw |

### 7.5 Erreurs réseau

| Pattern | Gestion |
|---------|---------|
| `fetchWithAuth` | Ne retry pas sur les erreurs réseau (seulement 401). `TypeError: fetch failed` |
| `authFetch` | Même comportement |
| `axiosAdmin` | L'intercepteur ne catch pas les erreurs réseau (pas de réponse) |
| `axios.post` direct | Doit être catché par l'appelant |

### 7.6 Incohérences d'état

| Scénario | Problème |
|----------|----------|
| `userId` localStorage obsolète | Login.jsx boucle en polling "Syncing..." |
| `adminRole` localStorage obsolète | AdminProtectedRoute sync puis redirect vers /admin/setup |
| `darkMode` localStorage désynchronisé | `data-theme` peut être en décalage |
| Token store stale pendant que refresh échoue | `fetchWithAuth` tente, 401, retry, échoue |

### 7.7 Données manquantes dans localStorage

| Clé manquante | Comportement |
|---------------|-------------|
| `userId` | Login.jsx affiche "Syncing..." (polling 500ms) |
| `adminRole` | AdminProtectedRoute montre "Syncing account..." |
| `darkMode` | Défaut : `true` (dark mode) |
| `lang` | Défaut : `'fr'` (français) |
| `dashboardStats` | Fetch depuis l'API |

### 7.8 Côté backend

| Défaillance | UX | Log backend |
|------------|----|-------------|
| SMTP non configuré | "Envoyer email" échoue silencieusement | `warn: "No SMTP configured"` |
| Upload fichier (disque plein) | 500 | `error: "Upload failed"` |
| CSV import corrompu | Rapport d'erreur détaillé | `error: "CSV import failed"` |
| Rate limit dépassé | 429 "Too many requests" | Pino log la réponse 429 |
| WebSocket déconnecté | "Reconnecting..." dans le dashboard admin | `warn: "WebSocket closed"` |

---

## Index des fichiers clés

| Fichier | Rôle |
|---------|------|
| `Backend/app.js` | Configuration Express, middleware chain, routage |
| `Backend/index.js` | Point d'entrée, connexion DB, démarrage serveur |
| `Backend/controllers/authController.js` | Middleware verifyToken (Clerk + JWT fallback) |
| `Backend/routes/clerkRoutes.js` | Endpoint `/api/auth/clerk-sync` |
| `Backend/seed.mjs` | Script d'initialisation des données |
| `frontend/src/App.jsx` | AppContent, UserLayout, AdminLayout, sync global |
| `frontend/src/hooks/useClerkToken.js` | Gestion token Clerk, intercepteur axios |
| `frontend/src/utils/tokenStore.js` | Stockage token in-memory |
| `frontend/src/config/api.js` | `fetchWithAuth` avec retry |
| `frontend/src/pages/login.jsx` | Page de connexion Clerk |
| `frontend/src/components/protectedRoute.jsx` | Garde routes utilisateur |
| `frontend/src/components/AdminProtectedRoute.jsx` | Garde routes admin |
