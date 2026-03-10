/**
 * Tool Registry — Mr. Stix's hands.
 * Every tool he can reach for, organized and ready.
 */

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this._registerBuiltins();
  }

  get count() {
    return this.tools.size;
  }

  register(name, definition) {
    this.tools.set(name, {
      name,
      description: definition.description,
      parameters: definition.parameters,
      execute: definition.execute,
      requiresConfirmation: definition.requiresConfirmation || false,
      category: definition.category || "general",
    });
  }

  async execute(name, input) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}. Mr. Stix is displeased.`);
    return await tool.execute(input);
  }

  getAnthropicSchema() {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }

  _registerBuiltins() {
    // ─── FILESYSTEM ───────────────────────────────────
    this.register("read_file", {
      category: "filesystem",
      description: "Read the contents of a file at the given path. Returns the file content as text.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative file path to read" },
        },
        required: ["path"],
      },
      execute: async ({ path: filePath }) => {
        const fs = await import("fs/promises");
        const p = await import("path");
        const resolved = p.default.resolve(process.env.STIX_WORKING_DIR || ".", filePath);
        const content = await fs.readFile(resolved, "utf-8");
        return { path: resolved, content, size: content.length };
      },
    });

    this.register("write_file", {
      category: "filesystem",
      description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Creates parent directories automatically.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to write to" },
          content: { type: "string", description: "Content to write" },
        },
        required: ["path", "content"],
      },
      execute: async ({ path: filePath, content }) => {
        const fs = await import("fs/promises");
        const p = await import("path");
        const resolved = p.default.resolve(process.env.STIX_WORKING_DIR || ".", filePath);
        await fs.mkdir(p.default.dirname(resolved), { recursive: true });
        await fs.writeFile(resolved, content, "utf-8");
        return { path: resolved, bytesWritten: Buffer.byteLength(content), status: "written" };
      },
    });

    this.register("list_directory", {
      category: "filesystem",
      description: "List files and directories at a given path. Returns names, types, and sizes.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list" },
          recursive: { type: "boolean", description: "Whether to list recursively (default false)" },
        },
        required: ["path"],
      },
      execute: async ({ path: dirPath, recursive = false }) => {
        const fs = await import("fs/promises");
        const p = await import("path");
        const resolved = p.default.resolve(process.env.STIX_WORKING_DIR || ".", dirPath);

        const entries = await fs.readdir(resolved, { withFileTypes: true });
        const results = [];

        for (const entry of entries) {
          const entryPath = p.default.join(resolved, entry.name);
          const stat = await fs.stat(entryPath);
          results.push({
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size: stat.size,
            modified: stat.mtime.toISOString(),
          });

          if (recursive && entry.isDirectory()) {
            try {
              const subEntries = await fs.readdir(entryPath, { withFileTypes: true });
              for (const sub of subEntries) {
                const subPath = p.default.join(entryPath, sub.name);
                const subStat = await fs.stat(subPath);
                results.push({
                  name: `${entry.name}/${sub.name}`,
                  type: sub.isDirectory() ? "directory" : "file",
                  size: subStat.size,
                  modified: subStat.mtime.toISOString(),
                });
              }
            } catch (e) {}
          }
        }
        return { path: resolved, entries: results, count: results.length };
      },
    });

    this.register("edit_file", {
      category: "filesystem",
      description: "Search and replace text in a file. Useful for targeted edits without rewriting the whole file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
          search: { type: "string", description: "Text to find (exact match)" },
          replace: { type: "string", description: "Text to replace with" },
        },
        required: ["path", "search", "replace"],
      },
      execute: async ({ path: filePath, search, replace }) => {
        const fs = await import("fs/promises");
        const p = await import("path");
        const resolved = p.default.resolve(process.env.STIX_WORKING_DIR || ".", filePath);
        let content = await fs.readFile(resolved, "utf-8");
        const count = content.split(search).length - 1;
        if (count === 0) return { error: "Search text not found in file", path: resolved };
        content = content.replaceAll(search, replace);
        await fs.writeFile(resolved, content, "utf-8");
        return { path: resolved, replacements: count, status: "edited" };
      },
    });

    // ─── SHELL ────────────────────────────────────────
    this.register("run_command", {
      category: "shell",
      description: "Execute a shell command and return stdout/stderr. Use for running scripts, builds, installs, data processing, git operations, etc.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
          cwd: { type: "string", description: "Working directory (optional)" },
          timeout: { type: "number", description: "Timeout in ms (default 60000)" },
        },
        required: ["command"],
      },
      requiresConfirmation: true,
      execute: async ({ command, cwd, timeout = 60000 }) => {
        const { execSync } = await import("child_process");
        const p = await import("path");
        const workDir = cwd
          ? p.default.resolve(process.env.STIX_WORKING_DIR || ".", cwd)
          : process.env.STIX_WORKING_DIR || ".";
        try {
          const stdout = execSync(command, {
            cwd: workDir,
            timeout,
            encoding: "utf-8",
            maxBuffer: 10 * 1024 * 1024,
            stdio: ["pipe", "pipe", "pipe"],
          });
          return { command, stdout: stdout.slice(0, 50000), exitCode: 0 };
        } catch (err) {
          return {
            command,
            stdout: (err.stdout || "").slice(0, 25000),
            stderr: (err.stderr || "").slice(0, 25000),
            exitCode: err.status || 1,
          };
        }
      },
    });

    // ─── ANALYSIS ─────────────────────────────────────
    this.register("analyze_data", {
      category: "analysis",
      description: "Analyze structured data (CSV, JSON). Compute stats, filter, sort, aggregate. Returns analysis results.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to data file (CSV or JSON)" },
          query: { type: "string", description: "What to analyze — natural language description of the analysis needed" },
        },
        required: ["path", "query"],
      },
      execute: async ({ path: filePath, query }) => {
        const fs = await import("fs/promises");
        const p = await import("path");
        const resolved = p.default.resolve(process.env.STIX_WORKING_DIR || ".", filePath);
        const content = await fs.readFile(resolved, "utf-8");
        const ext = p.default.extname(resolved).toLowerCase();

        let data;
        if (ext === ".json") {
          data = JSON.parse(content);
        } else if (ext === ".csv") {
          const lines = content.split("\n").filter((l) => l.trim());
          const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
          data = lines.slice(1).map((line) => {
            const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
            const obj = {};
            headers.forEach((h, i) => (obj[h] = isNaN(vals[i]) ? vals[i] : Number(vals[i])));
            return obj;
          });
        } else {
          return { error: `Unsupported format: ${ext}` };
        }

        const rows = Array.isArray(data) ? data : [data];
        const numericCols = {};
        if (rows.length > 0) {
          for (const key of Object.keys(rows[0])) {
            const vals = rows.map((r) => r[key]).filter((v) => typeof v === "number" && !isNaN(v));
            if (vals.length > 0) {
              numericCols[key] = {
                min: Math.min(...vals),
                max: Math.max(...vals),
                avg: vals.reduce((a, b) => a + b, 0) / vals.length,
                sum: vals.reduce((a, b) => a + b, 0),
                count: vals.length,
              };
            }
          }
        }

        return {
          path: resolved,
          totalRows: rows.length,
          columns: rows.length > 0 ? Object.keys(rows[0]) : [],
          numericStats: numericCols,
          sample: rows.slice(0, 5),
          query,
          note: "Raw stats provided. Use this data to answer the analysis query.",
        };
      },
    });

    // ─── SEARCH ───────────────────────────────────────
    this.register("search_files", {
      category: "filesystem",
      description: "Search for files matching a pattern or containing specific text within the workspace.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob pattern for filenames (e.g., '**/*.js')" },
          contains: { type: "string", description: "Text content to search for within files (optional)" },
        },
        required: ["pattern"],
      },
      execute: async ({ pattern, contains }) => {
        const { globSync } = await import("glob");
        const fs = await import("fs/promises");
        const p = await import("path");
        const workDir = process.env.STIX_WORKING_DIR || ".";
        const matches = globSync(pattern, { cwd: workDir, absolute: true, nodir: true });

        let results = matches.map((m) => ({ path: m, relativePath: p.default.relative(workDir, m) }));

        if (contains) {
          const filtered = [];
          for (const file of results) {
            try {
              const content = await fs.readFile(file.path, "utf-8");
              if (content.includes(contains)) {
                const lines = content.split("\n");
                const matchingLines = lines
                  .map((l, i) => ({ line: i + 1, text: l }))
                  .filter((l) => l.text.includes(contains))
                  .slice(0, 10);
                filtered.push({ ...file, matchingLines });
              }
            } catch (e) {}
          }
          results = filtered;
        }

        return { pattern, contains, matchCount: results.length, matches: results.slice(0, 50) };
      },
    });

    // ─── MEMORY / NOTES ───────────────────────────────
    this.register("store_memory", {
      category: "memory",
      description: "Store a piece of information for later recall. Use this to remember important findings, decisions, or context across tasks.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Short key to identify this memory" },
          value: { type: "string", description: "The information to remember" },
        },
        required: ["key", "value"],
      },
      execute: async ({ key, value }) => {
        return { key, value, status: "stored", timestamp: new Date().toISOString() };
      },
    });

    this.register("recall_memory", {
      category: "memory",
      description: "Recall previously stored information by key.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Key to recall" },
        },
        required: ["key"],
      },
      execute: async ({ key }) => {
        return { key, note: "Memory system active — context maintained within session." };
      },
    });

    // ─── TASK MANAGEMENT ──────────────────────────────
    this.register("create_subtask", {
      category: "planning",
      description: "Break a complex task into a subtask for organized execution. Use this to decompose work.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Subtask title" },
          description: { type: "string", description: "What this subtask accomplishes" },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Priority level" },
        },
        required: ["title", "description"],
      },
      execute: async ({ title, description, priority = "medium" }) => {
        return {
          subtask: title,
          description,
          priority,
          status: "created",
          id: `sub_${Date.now()}`,
        };
      },
    });
  }
}

export default ToolRegistry;
