# MediConnect - Frontend (React + Vite)

The frontend client for the **MediConnect Healthcare Platform**, built with **React 19**, **Vite 8**, and **React Router 7**.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev

# 4. Build for production
npm run build

# 5. Preview production build
npm run preview
```

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Starts local development server at `http://localhost:5173` |
| `build` | `vite build` | Compiles optimized production bundle into `dist/` |
| `preview` | `vite preview` | Previews the production build locally |
| `lint` | `oxlint` | Runs fast code quality and syntax checks |

---

## Deployment Routing

This project includes pre-configured routing rewrite rules so refreshing pages (like `/doctors`, `/appointments`, etc.) does not cause a 404 error on static hosts:
- **Netlify / Cloudflare Pages**: `public/_redirects` &rarr; copies to `dist/_redirects`
- **Vercel**: `vercel.json`
