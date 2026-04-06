/**
 * Pantry Wars — Express server for Render / local dev
 * Serves public/ and proxies POST /api/anthropic (CORS-safe Anthropic Claude access).
 */
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_CLAUDE_MODEL =
  process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

/** Legacy OpenAI chat/completions body → Anthropic Messages API body. */
function legacyOpenaiChatToAnthropicBody(payload) {
  const msgs = Array.isArray(payload.messages) ? payload.messages : [];
  const systemChunks = [];
  const anthMsgs = [];
  for (const m of msgs) {
    if (!m) continue;
    const role = String(m.role || "").toLowerCase();
    let content = m.content;
    if (typeof content === "number") content = String(content);
    if (typeof content !== "string") content = JSON.stringify(content);
    if (!String(content).trim()) continue;
    if (role === "system") systemChunks.push(content);
    else if (role === "user" || role === "assistant")
      anthMsgs.push({ role, content });
  }
  const maxTok = Math.min(
    Math.max(256, Number(payload.max_tokens) || 4096),
    8192
  );
  const body = {
    model: DEFAULT_CLAUDE_MODEL,
    max_tokens: maxTok,
    messages: anthMsgs.length
      ? anthMsgs
      : [{ role: "user", content: "(empty)" }],
  };
  if (systemChunks.length) body.system = systemChunks.join("\n\n");
  return body;
}

/** Anthropic message JSON → minimal OpenAI chat.completion shape (for cached old clients). */
function anthropicMessageToOpenaiChatCompletion(anth) {
  let text = "";
  if (anth.content && Array.isArray(anth.content)) {
    text = anth.content
      .filter((c) => c && c.type === "text")
      .map((c) => c.text || "")
      .join("");
  }
  const fr = anth.stop_reason === "max_tokens" ? "length" : "stop";
  return {
    id: anth.id || "chatcmpl-mapped",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: anth.model || DEFAULT_CLAUDE_MODEL,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: fr,
      },
    ],
  };
}

app.get("/api/config", (_req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const ok = !!(key && String(key).trim());
  res.json({
    app: "Pantry Wars",
    anthropicConfigured: ok,
    openaiConfigured: ok,
  });
});

/**
 * Cached older frontends still POST here with OpenAI-shaped `payload`.
 * Translate to Anthropic so an `sk-ant-…` key works (never send it to OpenAI).
 */
app.post("/api/openai", async (req, res) => {
  const bodyKey = (req.body.api_key || "").trim();
  const envKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  const apiKey = bodyKey || envKey;
  const payload = req.body.payload;

  if (!apiKey) {
    return res.status(400).json({
      error: {
        message:
          "Missing API key. Set ANTHROPIC_API_KEY on the server, or paste your Anthropic key in the app.",
      },
    });
  }
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: { message: "missing payload" } });
  }

  try {
    const anthBody = legacyOpenaiChatToAnthropicBody(payload);
    const upstreamSignal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(300000)
        : undefined;
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(anthBody),
      signal: upstreamSignal,
    });
    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).set("Content-Type", "application/json").send(text);
    }
    const anth = JSON.parse(text);
    if (anth.type === "error" && anth.error) {
      return res.status(400).set("Content-Type", "application/json").send(text);
    }
    const openaiShape = anthropicMessageToOpenaiChatCompletion(anth);
    res.status(200).json(openaiShape);
  } catch (e) {
    console.error("[pantry-wars] legacy /api/openai → anthropic shim", e);
    res.status(502).json({ error: { message: String(e.message || e) } });
  }
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
    const upstreamSignal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(300000)
        : undefined;
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
      signal: upstreamSignal,
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
