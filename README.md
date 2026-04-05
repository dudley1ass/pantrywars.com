# Pantry Wars

**Repository:** [github.com/dudley1ass/pantrywars.com](https://github.com/dudley1ass/pantrywars.com)

Competition-style cooking app: build a pantry, run a mystery-basket challenge, duel your plan against an **AI rival chef**, timer, and judge scores.

## Run locally

```bash
npm install
npm start
```

Open **http://localhost:3000/** (or the port printed in the terminal).

Set **`ANTHROPIC_API_KEY`** in the environment before `npm start` so you are not prompted (e.g. PowerShell: `$env:ANTHROPIC_API_KEY='sk-ant-…'; npm start`). Otherwise the app asks once per browser and stores the key in `localStorage`. See `.env.example` for the variable name (Render injects it server-side).

The default Claude model is **`claude-3-5-sonnet-20241022`** (`PW_CLAUDE_MODEL` in `public/index.html`). Adjust there if you prefer another [Anthropic model ID](https://docs.anthropic.com/en/docs/about-claude/models).

**Deploying an existing site:** replace **`OPENAI_API_KEY`** with **`ANTHROPIC_API_KEY`** in your host’s environment (same value slot on Render — paste a new key from Anthropic, not OpenAI).

## Deploy on Render

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New → Web Service**, connect the repo.
3. **Build command:** `npm install`  
   **Start command:** `npm start`
4. Add environment variable **`ANTHROPIC_API_KEY`** (your Anthropic API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)). The proxy uses it when the browser does not send a key.
5. Optional: add a **`render.yaml`** Blueprint — this repo includes a starter file.

### Custom domain (e.g. pantrywars.com)

In Render: **Settings → Custom Domains** → add `pantrywars.com` and `www.pantrywars.com`, then set DNS at your registrar per Render’s instructions (usually A/CNAME to Render).

## Project layout

| Path | Purpose |
|------|---------|
| `server.js` | Express: static `public/` + `POST /api/anthropic` + legacy `POST /api/openai` (maps OpenAI-shaped requests to Claude) + `GET /api/config` |
| `public/index.html` | Single-page Pantry Wars UI |
| `package.json` | Node 18+, `express` |

## Legacy Python server

`start-server.py` is kept for reference; **use `npm start`** for the canonical dev/production server.

## License

Private / your product — configure as needed for Pantry Wars.
