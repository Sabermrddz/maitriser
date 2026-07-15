# MAITRISEZ — Frontend

Interface utilisateur React + Vite pour l'application de préparation aux examens de médecine et pharmacie.

## Stack

- **React 19** avec hooks et lazy loading
- **Vite 6** (build, HMR, proxy API)
- **Clerk React v6** — authentification (email, OAuth, SSO)
- **React Router 7** — routage par rôle (user / admin)
- **Axios** — appels API avec intercepteur token
- **Chart.js + react-chartjs-2** — graphiques du dashboard
- **i18n maison** — 424 clés de traduction (fr/en)
- **CSS** — thème teal `#04484F` + chartreuse `#C1FF30`

## Structure

```
src/
├── components/   # Composants partagés
├── pages/        # Pages utilisateur + admin
├── config/       # API, endpoints, axiosAdmin
├── context/      # Language, Sound, Theme
├── hooks/        # useAdminWS, useClerkToken
├── locales/      # i18n (fr, en)
├── styles/       # Thème teal + admin + dark mode
└── utils/        # Token store, logger, helpers
```

## Développement

```bash
npm install
npm run dev      # http://localhost:5173 (proxy API → :4000)
npm run build    # Production build → dist/
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | URL de l'API (défaut: proxy Vite) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk |
