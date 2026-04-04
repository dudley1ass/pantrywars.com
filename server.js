/**
 * Pantry Wars — Express server for Render / local dev
 * Serves public/ and proxies POST /api/openai (CORS-safe OpenAI access).
 */
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.get("/api/config", (_req, res) => {
  const key = process.env.OPENAI_API_KEY;
  res.json({
    app: "Pantry Wars",
    openaiConfigured: !!(key && String(key).trim()),
  });
});

app.post("/api/openai", async (req, res) => {
  const bodyKey = (req.body.api_key || "").trim();
  const envKey = (process.env.OPENAI_API_KEY || "").trim();
  const apiKey = bodyKey || envKey;
  const payload = req.body.payload;

  if (!apiKey) {
    return res.status(400).json({
      error: {
        message:
          "Missing API key. On Render set OPENAI_API_KEY, or enter your key in the app (API key button clears local storage).",
      },
    });
  }
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: { message: "missing payload" } });
  }

  try {
    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.status(r.status).set("Content-Type", "application/json").send(text);
  } catch (e) {
    console.error("[pantry-wars] openai proxy", e);
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
