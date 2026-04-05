# SIGIS — administration web

## Déploiement (Vercel + backend Render)

Le front ([sigis-lime.vercel.app](https://sigis-lime.vercel.app/)) doit appeler l’API sur un **autre domaine** ([sigis-backend.onrender.com](https://sigis-backend.onrender.com/)). Le client HTTP utilise :

- **Développement local** : proxy Vite (`/v1` → `http://127.0.0.1:8000`), pas de variable requise.
- **Production** : URL du backend (par défaut `https://sigis-backend.onrender.com` dans `src/lib/api.ts`).

### Vercel — variables d’environnement (optionnel)

Si tu changes l’URL du backend, définis :

| Variable | Exemple |
|----------|---------|
| `VITE_API_BASE_URL` | `https://sigis-backend.onrender.com` |

Sans slash final. Redéploie le front après modification.

### Backend Render — CORS

Sur Render, définis `SIGIS_CORS_ORIGINS` pour inclure l’origine du front :

`https://sigis-lime.vercel.app`

(éventuellement avec `http://localhost:3000` ou `8080` pour le dev, séparés par des virgules). Le dépôt backend inclut cette origine dans les valeurs par défaut du code ; si une ancienne variable d’environnement sur Render ne la contient pas, mets à jour la config Render.
