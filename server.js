/**
 * Pantry Wars — Express server for Render / local dev
 * Serves public/ and proxies POST /api/anthropic (CORS-safe Anthropic access).
 */
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.get("/api/config", (_req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    app: "Pantry Wars",
    anthropicConfigured: !!(key && String(key).trim()),
  });
});

app.post("/api/anthropic", async (req, res) => {
  const bodyKey = (req.body.api_key || "").trim();
  const envKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  const apiKey = bodyKey || envKey;
  const payload = req.body.payload;

  if (!apiKey) {
    return res.status(400).json({
      error: {
        message:
          "Missing API key. On Render set ANTHROPIC_API_KEY, or enter your key in the app (API key button clears local storage).",
      },
    });
  }
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: { message: "missing payload" } });
  }

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.status(r.status).set("Content-Type", "application/json").send(text);
  } catch (e) {
    console.error("[pantry-wars] anthropic proxy", e);
    res.status(502).json({ error: { message: String(e.message || e) } });
  }
});

app.use(
  express.static(path.join(__dirname, "public"), {
    index: "index.html",
    extensions: ["html"],
  })
);

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pantry Wars — http://localhost:${PORT}/`);
});
