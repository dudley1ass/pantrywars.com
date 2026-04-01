# Pantry Wars

Competition-style cooking app: build a pantry, run a mystery-basket challenge, duel your plan against an **AI rival chef**, timer, and judge scores.

## Run locally

```bash
npm install
npm start
```

Open **http://localhost:3000/** (or the port printed in the terminal).

Optional: copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` so guests are not prompted for a key. Otherwise the app asks once per browser and stores the key in `localStorage`.

## Deploy on Render

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New → Web Service**, connect the repo.
3. **Build command:** `npm install`  
   **Start command:** `npm start`
4. Add environment variable **`ANTHROPIC_API_KEY`** (your Anthropic secret). The proxy uses it when the browser does not send a key.
5. Optional: add a **`render.yaml`** Blueprint — this repo includes a starter file.

### Custom domain (e.g. pantrywars.com)

In Render: **Settings → Custom Domains** → add `pantrywars.com` and `www.pantrywars.com`, then set DNS at your registrar per Render’s instructions (usually A/CNAME to Render).

## Project layout

| Path | Purpose |
|------|---------|
| `server.js` | Express: static `public/` + `POST /api/anthropic` + `GET /api/config` |
| `public/index.html` | Single-page Pantry Wars UI |
| `package.json` | Node 18+, `express` |

## Legacy Python server

`start-server.py` is kept for reference; **use `npm start`** for the canonical dev/production server.

## License

Private / your product — configure as needed for Pantry Wars.
