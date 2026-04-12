# Unthink AI

Unthink AI is a Vite + React app with a Netlify/Express API proxy that requires each user to provide their own Gemini API key per request.

## Local development

1. Install dependencies:
   `npm install`
2. Optional: create `.env` from `.env.example` if you need to set `PORT`
3. Start the app with Express middleware:
   `npm run dev`
4. Open `http://localhost:3000`

## Production deployment (Netlify)

- Build command: `npm run build`
- Publish directory: `dist`
- Netlify Function path: `netlify/functions/decide.ts`
- API redirect: `/api/decide -> /.netlify/functions/decide` in `netlify.toml`
- Security headers and SPA fallback redirects are configured in `netlify.toml`

## API request flow

1. Browser sends `POST /api/decide` with `{ prompt, apiKey }`
2. In Netlify production, redirect routes request to `/.netlify/functions/decide`
3. API validates prompt length (1-500 chars) and presence of `apiKey`
4. API calls Gemini using the user-provided `apiKey`
5. API returns `{ decision }`

## Environment variables

- `PORT` (optional): used by local Express runtime

## SEO assets

- Page-level metadata in `index.html` (title, description, canonical, OG/Twitter)
- `public/robots.txt`
- `public/sitemap.xml`
- `public/og-image.svg`

## Post-deploy verification checklist

1. Confirm canonical resolves to your final production domain
2. Confirm `https://<domain>/robots.txt` is reachable
3. Confirm `https://<domain>/sitemap.xml` is reachable
4. Confirm `POST https://<domain>/api/decide` returns JSON
5. Run Google URL Inspection on the homepage

## Netlify AI Endpoint

- Endpoint: `POST /api/decide` -> Netlify Function `netlify/functions/decide.ts`
- No server-managed Gemini key is used
- Users must pass their own Gemini API key in each request
