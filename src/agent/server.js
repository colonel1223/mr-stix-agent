/**
 * Mr. Stix Server — HTTP + WebSocket
 * Serves the UI and pipes agent events to the browser in real-time.
 */

import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { StixAgent } from "./core.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.STIX_PORT) || 3117;
const WS_PORT = parseInt(process.env.STIX_WS_PORT) || 3118;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../dist")));

const agent = new StixAgent({ verbose: true });

// ─── REST API ─────────────────────────────────────────

app.post("/api/task", async (req, res) => {
  const { task, context } = req.body;
  if (!task) return res.status(400).json({ error: "No task provided" });

  try {
    const result = await agent.execute(task, context || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/stop", (req, res) => {
  agent.stop();
  res.json({ status: "stopped" });
});

app.get("/api/stats", (req, res) => {
  res.json(agent.getStats());
});

app.get("/api/log", (req, res) => {
  res.json(agent.getTaskLog());
});

app.get("/api/health", (req, res) => {
  res.json({ status: "alive", agent: "Mr. Stix", mood: "smug", uptime: process.uptime() });
});

// ─── WEBSOCKET ────────────────────────────────────────

const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  broadcast({ type: "connected", message: "Mr. Stix sees you.", timestamp: Date.now() });

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "task") {
        const result = await agent.execute(msg.task, msg.context || {});
        ws.send(JSON.stringify({ type: "task:result", data: result }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: err.message }));
    }
  });

  ws.on("close", () => clients.delete(ws));
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === 1) client.send(data);
  }
}

// Pipe all agent events to WebSocket clients
const events = [
  "task:start", "task:complete", "task:error", "task:stopped",
  "task:max_iterations", "iteration", "thought", "tool:call",
  "tool:result", "tool:error",
];

for (const event of events) {
  agent.on(event, (data) => broadcast({ type: event, data, timestamp: Date.now() }));
}

// ─── START ────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
\x1b[96m╔══════════════════════════════════════════╗
║  MR. STIX SERVER                         ║
║──────────────────────────────────────────║
║  HTTP API:    http://localhost:${PORT}       ║
║  WebSocket:   ws://localhost:${WS_PORT}        ║
║  Status:      ACTIVE                     ║
║  Mood:        Smug                       ║
╚══════════════════════════════════════════╝\x1b[0m
  `);
});
