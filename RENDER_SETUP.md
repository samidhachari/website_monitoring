# Render deployment setup

Follow these steps to deploy the screenshot backend on Render using either the Dockerfile or the Node build.

1. Create a new Web Service on Render and connect your GitHub repo.
2. Branch: `main`.
3. Environment: choose a service with at least 1 GB RAM.

If using Docker (recommended):
- Select 'Docker' as the environment and set the Dockerfile path to `/Dockerfile.playwright`.

If NOT using Docker:
- Build Command: `npm run setup && npm run build`
- Start Command: `npm start`

Environment Variables (Render service settings):
- `SUPABASE_SERVICE_ROLE_KEY` (secret)
- `SUPABASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_SUPABASE_URL`

After deploy, set `NEXT_PUBLIC_API_URL` on Vercel to your Render service URL.
