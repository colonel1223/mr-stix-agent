#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════╗
 * ║         MR. STIX — COMMAND LINE INTERFACE         ║
 * ║                                                   ║
 * ║  Usage:                                           ║
 * ║    node src/agent/cli.js "your task here"         ║
 * ║    node src/agent/cli.js --interactive             ║
 * ║                                                   ║
 * ╚═══════════════════════════════════════════════════╝
 */

import { StixAgent } from "./core.js";
import { createInterface } from "readline";
import dotenv from "dotenv";
dotenv.config();

const STIX_ASCII = `
\x1b[90m╔══════════════════════════════════════╗
║\x1b[0m\x1b[97m           ◉ ◉                       \x1b[90m║
║\x1b[0m\x1b[97m            ⌣                         \x1b[90m║
║\x1b[0m\x1b[97m           ╤                           \x1b[90m║
║\x1b[0m\x1b[97m        ───┼───                        \x1b[90m║
║\x1b[0m\x1b[97m           │        \x1b[96mMR. STIX v1.0\x1b[97m     \x1b[90m║
║\x1b[0m\x1b[97m          ╱ ╲       \x1b[90mAgent Framework\x1b[97m   \x1b[90m║
║\x1b[0m\x1b[97m         ╱   ╲      \x1b[33m"I handle it."\x1b[97m   \x1b[90m║
║\x1b[0m\x1b[97m        🥾    🥾                       \x1b[90m║
╚══════════════════════════════════════╝\x1b[0m
`;

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  white: "\x1b[97m",
  bgBlue: "\x1b[44m",
};

function log(color, prefix, msg) {
  const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`${COLORS.gray}[${timestamp}]${COLORS.reset} ${color}${prefix}${COLORS.reset} ${msg}`);
}

async function main() {
  console.clear();
  console.log(STIX_ASCII);

  const args = process.argv.slice(2);
  const isInteractive = args.includes("--interactive") || args.includes("-i") || args.length === 0;

  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-api-key-here") {
    log(COLORS.red, "[ERROR]", "No API key found. Copy .env.example to .env and add your Anthropic API key.");
    log(COLORS.yellow, "[HINT]", "cp .env.example .env && nano .env");
    process.exit(1);
  }

  const agent = new StixAgent({ verbose: true });

  // Wire up events
  agent.on("task:start", ({ taskId, task }) => {
    log(COLORS.cyan, "[TASK]", `${COLORS.bright}${task}${COLORS.reset}`);
    log(COLORS.gray, "[ID]", taskId);
    console.log(`${COLORS.gray}${"─".repeat(50)}${COLORS.reset}`);
  });

  agent.on("iteration", ({ iteration, max }) => {
    log(COLORS.gray, `[LOOP ${iteration}/${max}]`, "Thinking...");
  });

  agent.on("thought", ({ text }) => {
    // Truncate long thoughts for display
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        log(COLORS.white, "[STIX]", line);
      }
    }
  });

  agent.on("tool:call", ({ tool, input }) => {
    const inputPreview = JSON.stringify(input).slice(0, 120);
    log(COLORS.magenta, `[TOOL]`, `${COLORS.bright}${tool}${COLORS.reset} ${COLORS.gray}${inputPreview}${COLORS.reset}`);
  });

  agent.on("tool:result", ({ tool, success }) => {
    const icon = success ? "✓" : "✗";
    const color = success ? COLORS.green : COLORS.red;
    log(color, `[${icon}]`, `${tool} complete`);
  });

  agent.on("tool:error", ({ tool, error }) => {
    log(COLORS.red, "[ERR]", `${tool}: ${error}`);
  });

  agent.on("task:complete", ({ iterations, duration }) => {
    console.log(`${COLORS.gray}${"─".repeat(50)}${COLORS.reset}`);
    log(COLORS.green, "[DONE]", `${iterations} iterations, ${(duration / 1000).toFixed(1)}s`);
    const stats = agent.getStats();
    log(COLORS.gray, "[STATS]", `Tasks: ${stats.tasksCompleted} | Tools: ${stats.totalToolCalls} | Uptime: ${Math.round(stats.uptime)}s`);
  });

  if (!isInteractive) {
    // Single task mode
    const task = args.filter((a) => !a.startsWith("-")).join(" ");
    if (!task) {
      log(COLORS.red, "[ERROR]", "No task provided.");
      process.exit(1);
    }
    const result = await agent.execute(task);
    console.log(`\n${COLORS.cyan}${COLORS.bright}═══ RESULT ═══${COLORS.reset}`);
    console.log(result.result);
    process.exit(0);
  }

  // Interactive mode
  log(COLORS.cyan, "[MODE]", "Interactive. Type a task, press Enter. Type 'quit' to exit.");
  log(COLORS.gray, "[TIP]", "Commands: 'stats', 'log', 'clear', 'quit'");
  console.log();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${COLORS.cyan}stix>${COLORS.reset} `,
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    switch (input.toLowerCase()) {
      case "quit":
      case "exit":
        log(COLORS.yellow, "[STIX]", "Mr. Stix will be here when you need him. He always is.");
        process.exit(0);
        break;

      case "stats":
        const stats = agent.getStats();
        console.log(`${COLORS.cyan}${JSON.stringify(stats, null, 2)}${COLORS.reset}`);
        break;

      case "log":
        const taskLog = agent.getTaskLog();
        for (const t of taskLog.slice(-5)) {
          log(COLORS.gray, `[${t.id}]`, `${t.task.slice(0, 60)} → ${t.iterations} iters, ${(t.duration / 1000).toFixed(1)}s`);
        }
        break;

      case "clear":
        console.clear();
        console.log(STIX_ASCII);
        break;

      default:
        try {
          await agent.execute(input);
        } catch (err) {
          log(COLORS.red, "[FATAL]", err.message);
        }
        break;
    }

    console.log();
    rl.prompt();
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
