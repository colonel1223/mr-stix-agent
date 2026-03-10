# Mr. Stix — Autonomous Desktop Agent

```
  ◉ ◉
   ⌣
   ╤
───┼───
   │      Simple. Relentless. Efficient.
  ╱ ╲
 ╱   ╲
🥾    🥾
```

An autonomous AI agent framework with a 3D desktop companion UI. He's a stick figure. Don't underestimate him.

## What He Does

Takes tasks and **completes them autonomously** — reading files, writing code, running commands, analyzing data, chaining operations until done. No hand-holding.

- **Filesystem** — Read, write, edit, search across codebases
- **Shell** — Run any command, build projects, process data
- **Analysis** — CSV/JSON ingestion, stats, pattern detection
- **Task decomposition** — Complex goals → executable steps
- **Self-verification** — Checks own work before reporting done
- **Pipelines** — Pre-built workflow templates (code review, refactor, docs)
- **Memory** — Persistent context across tasks
- **Live 3D UI** — Watch Mr. Stix work in real-time

## Quick Start

```bash
cd mr-stix-agent
bash scripts/setup.sh
nano .env                    # Add ANTHROPIC_API_KEY
npm run stix                 # Interactive CLI
npm run dev                  # Full 3D UI + server
```

## Single Task

```bash
npm run stix -- "analyze all JS files and write a quality report"
```

## API

```bash
npm run agent
curl -X POST http://localhost:3117/api/task \
  -H "Content-Type: application/json" \
  -d '{"task": "create a REST API for a todo app"}'
```

## Pipeline Templates

```javascript
import { templates } from "./src/agent/pipeline.js";
await templates.codeReview("./src").run();
await templates.dataAnalysis("./data/sales.csv").run();
await templates.scaffold("my-api", "node").run();
await templates.refactor("./src", "convert to TypeScript").run();
```

## Architecture

```
CLI / Web UI → REST + WebSocket → StixAgent Core → Claude API
                                    ├── Tool Registry (8 tools)
                                    ├── Memory Store
                                    └── Pipeline Engine
```

---

*Simple. Don't underestimate him.*
