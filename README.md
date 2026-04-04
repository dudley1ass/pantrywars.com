# Pantry Wars

**Repository:** [github.com/dudley1ass/pantrywars.com](https://github.com/dudley1ass/pantrywars.com)

Competition-style cooking app: build a pantry, run a mystery-basket challenge, duel your plan against an **AI rival chef**, timer, and judge scores.

## Run locally

```bash
npm install
npm start
```

Open **http://localhost:3000/** (or the port printed in the terminal).

Set **`OPENAI_API_KEY`** in the environment before `npm start` so you are not prompted (e.g. PowerShell: `$env:OPENAI_API_KEY='sk-…'; npm start`). Otherwise the app asks once per browser and stores the key in `localStorage`. See `.env.example` for the variable name (Render injects it server-side).

## Deploy on Render

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New → Web Service**, connect the repo.
3. **Build command:** `npm install`  
   **Start command:** `npm start`
4. Add environment variable **`OPENAI_API_KEY`** (your OpenAI API secret from [platform.openai.com](https://platform.openai.com/api-keys)). The proxy uses it when the browser does not send a key.
5. Optional: add a **`render.yaml`** Blueprint — this repo includes a starter file.

### Custom domain (e.g. pantrywars.com)

In Render: **Settings → Custom Domains** → add `pantrywars.com` and `www.pantrywars.com`, then set DNS at your registrar per Render’s instructions (usually A/CNAME to Render).

## Project layout

| Path | Purpose |
|------|---------|
| `server.js` | Express: static `public/` + `POST /api/openai` + `GET /api/config` |
| `public/index.html` | Single-page Pantry Wars UI |
| `package.json` | Node 18+, `express` |

## Legacy Python server

`start-server.py` is kept for reference; **use `npm start`** for the canonical dev/production server.

## License

Private / your product — configure as needed for Pantry Wars.
