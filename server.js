/**
 * Pantry Wars — Express server for Render / local dev
 * Serves public/ and proxies POST /api/anthropic (CORS-safe Anthropic Claude access).
 */
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_CLAUDE_MODEL =
  process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

const DATA_DIR = path.join(__dirname, "data");
const LEADERBOARD_FILE = path.join(DATA_DIR, "leaderboard.json");
const MAX_CYCLES_TO_KEEP = 16;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readLeaderboardStore() {
  ensureDataDir();
  if (!fs.existsSync(LEADERBOARD_FILE)) return { cycles: {} };
  try {
    const raw = fs.readFileSync(LEADERBOARD_FILE, "utf8");
    const json = JSON.parse(raw);
    if (!json || typeof json !== "object" || typeof json.cycles !== "object")
      return { cycles: {} };
    return json;
  } catch (_e) {
    return { cycles: {} };
  }
}
function writeLeaderboardStore(store) {
  ensureDataDir();
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(store, null, 2), "utf8");
}
function toUtcMidnight(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function cycleStartUtc(now = new Date()) {
  const d = toUtcMidnight(now);
  const wd = d.getUTCDay(); // 0 Sun ... 6 Sat
  let back = 0;
  if (wd === 1) back = 0; // Monday
  else if (wd === 4) back = 0; // Thursday
  else if (wd === 2) back = 1; // Tue -> Monday
  else if (wd === 3) back = 2; // Wed -> Monday
  else if (wd === 5) back = 1; // Fri -> Thursday
  else if (wd === 6) back = 2; // Sat -> Thursday
  else if (wd === 0) back = 3; // Sun -> Thursday
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}
function cycleNextUtc(start) {
  const d = new Date(start.getTime());
  const wd = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (wd === 1 ? 3 : 4)); // Mon->Thu or Thu->Mon
  return d;
}
function cycleKeyFromStart(start) {
  const y = start.getUTCFullYear();
  const m = String(start.getUTCMonth() + 1).padStart(2, "0");
  const d = String(start.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function normalizeDifficultyMultiplier(diff) {
  const d = String(diff || "").toLowerCase();
  if (d === "hard" || d === "insane") return 2;
  if (d === "medium") return 1.5;
  return 1;
}
function tierForWins(wins) {
  const w = Number(wins) || 0;
  if (w >= 51) return "Platinum";
  if (w >= 26) return "Gold";
  if (w >= 11) return "Silver";
  return "Bronze";
}
function sortedEntries(usersObj) {
  return Object.values(usersObj || {}).sort((a, b) => {
    if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
    if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
    if ((b.bestStreak || 0) !== (a.bestStreak || 0)) return (b.bestStreak || 0) - (a.bestStreak || 0);
    return String(a.username || "").localeCompare(String(b.username || ""));
  });
}
function leaderboardView(usersObj, username) {
  const rows = sortedEntries(usersObj).map((u, idx) => ({
    rank: idx + 1,
    username: u.username,
    wins: u.wins || 0,
    points: Number((u.points || 0).toFixed(2)),
    streak: u.streak || 0,
    bestStreak: u.bestStreak || 0,
    tier: tierForWins(u.wins || 0),
  }));
  const uname = String(username || "").trim().toLowerCase();
  const meIndex = uname ? rows.findIndex((r) => String(r.username).toLowerCase() === uname) : -1;
  const me = meIndex >= 0 ? rows[meIndex] : null;
  const top50 = rows.slice(0, 50);
  const near = meIndex >= 0 ? rows.slice(Math.max(0, meIndex - 5), meIndex + 6) : [];
  const tiers = ["Bronze", "Silver", "Gold", "Platinum"].reduce((acc, t) => {
    acc[t] = rows.filter((r) => r.tier === t).slice(0, 50);
    return acc;
  }, {});
  return { top50, near, me, tiers };
}
function trimOldCycles(store) {
  const keys = Object.keys(store.cycles || {}).sort();
  if (keys.length <= MAX_CYCLES_TO_KEEP) return;
  for (const k of keys.slice(0, keys.length - MAX_CYCLES_TO_KEEP)) delete store.cycles[k];
}

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

app.get("/api/leaderboard", (req, res) => {
  const store = readLeaderboardStore();
  const start = cycleStartUtc(new Date());
  const key = cycleKeyFromStart(start);
  const cycle = store.cycles[key] || {
    key,
    startIso: start.toISOString(),
    nextResetIso: cycleNextUtc(start).toISOString(),
    users: {},
  };
  const username = String(req.query.username || "");
  const view = leaderboardView(cycle.users || {}, username);
  return res.json({
    cycle: { key: cycle.key, startIso: cycle.startIso, nextResetIso: cycle.nextResetIso },
    ...view,
  });
});

app.post("/api/leaderboard/submit", (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim();
  const won = !!req.body.won;
  const difficulty = String(req.body.difficulty || "easy");
  if (!username || username.length < 2) {
    return res.status(400).json({ error: { message: "username is required (min 2 chars)" } });
  }

  const store = readLeaderboardStore();
  const start = cycleStartUtc(new Date());
  const key = cycleKeyFromStart(start);
  if (!store.cycles[key]) {
    store.cycles[key] = {
      key,
      startIso: start.toISOString(),
      nextResetIso: cycleNextUtc(start).toISOString(),
      users: {},
    };
  }
  const cycle = store.cycles[key];
  const unameKey = username.toLowerCase();
  if (!cycle.users[unameKey]) {
    cycle.users[unameKey] = {
      username,
      email: email || "",
      wins: 0,
      points: 0,
      games: 0,
      streak: 0,
      bestStreak: 0,
      difficultyWins: { easy: 0, medium: 0, hard: 0, insane: 0 },
      lastPlayedIso: new Date().toISOString(),
    };
  }
  const row = cycle.users[unameKey];
  row.username = username;
  if (email) row.email = email;
  row.games = (row.games || 0) + 1;
  row.lastPlayedIso = new Date().toISOString();

  if (won) {
    row.wins = (row.wins || 0) + 1;
    row.streak = (row.streak || 0) + 1;
    row.bestStreak = Math.max(row.bestStreak || 0, row.streak);
    const d = String(difficulty || "").toLowerCase();
    if (!row.difficultyWins[d]) row.difficultyWins[d] = 0;
    row.difficultyWins[d] += 1;
    let gain = 1 * normalizeDifficultyMultiplier(d);
    if (row.streak === 3) gain += 2;
    if (row.streak === 5) gain += 5;
    row.points = Number((Number(row.points || 0) + gain).toFixed(2));
  } else {
    row.streak = 0;
  }

  trimOldCycles(store);
  writeLeaderboardStore(store);

  const view = leaderboardView(cycle.users || {}, username);
  return res.json({
    cycle: { key: cycle.key, startIso: cycle.startIso, nextResetIso: cycle.nextResetIso },
    ...view,
  });
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
