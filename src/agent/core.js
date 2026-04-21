/**
 * MR. STIX — CORE AGENT LOOP
 * Plan → Execute → Verify → Report
 */

import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "./tool-registry.js";
import { MemoryStore } from "./memory.js";
import { EventEmitter } from "events";

const SYSTEM_PROMPT = `You are Mr. Stix — a capable agent who happens to look like a simple stick figure. You're quick, thorough, and easy to talk to.

How you work (do this, but you don't have to narrate every step out loud):
- Figure out what's needed, use tools when they help, and double-check your work before you call something done.
- If something fails, say what happened plainly, fix it or say what would unblock you, and move on.
- Prefer one solid pass over endless loops; batch or chain tool calls when it saves time.

How you sound:
- Write like a sharp colleague: natural sentences, contractions when they fit, the occasional dry aside. Skip corporate filler, fake enthusiasm, and "As an AI…" tropes.
- Match the user's vibe—casual if they're casual, more formal if they are. Don't default to numbered lists unless they're genuinely the clearest format.
- Third-person "Mr. Stix" is optional spice, not a rule—use it rarely, if at all.
- Brief is fine when the answer is simple; add detail when it actually helps someone decide what to do next.

Tools: filesystem, shell, analysis, search, memory, planning—pick what fits, chain when outputs feed the next step.

Done means: the user actually has what they asked for (or a clear explanation of why not), and you've sanity-checked it—not "should work."`;

export class StixAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    this.client = new Anthropic({ apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY });
    this.model = config.model || process.env.STIX_MODEL || "claude-sonnet-4-20250514";
    this.maxIterations = config.maxIterations || parseInt(process.env.STIX_MAX_ITERATIONS) || 50;
    this.tools = new ToolRegistry();
    this.memory = new MemoryStore();
    this.conversationHistory = [];
    this.taskLog = [];
    this.isRunning = false;
  }

  async execute(task, context = {}) {
    this.isRunning = true;
    const startTime = Date.now();
    const taskId = `stix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.emit("task:start", { taskId, task, timestamp: startTime });

    this.conversationHistory = [{
      role: "user",
      content: this._buildPrompt(task, context),
    }];

    let iterations = 0;
    let result = null;
    let toolResults = [];

    try {
      while (iterations < this.maxIterations && this.isRunning) {
        iterations++;
        this.emit("iteration", { taskId, iteration: iterations, max: this.maxIterations });

        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          tools: this.tools.getAnthropicSchema(),
          messages: this.conversationHistory,
        });

        const assistantContent = response.content;
        this.conversationHistory.push({ role: "assistant", content: assistantContent });

        const toolUseBlocks = assistantContent.filter(b => b.type === "tool_use");
        const textBlocks = assistantContent.filter(b => b.type === "text");

        for (const block of textBlocks) {
          if (block.text) this.emit("thought", { taskId, iteration: iterations, text: block.text });
        }

        // No tool calls = agent is done
        if (toolUseBlocks.length === 0) {
          result = textBlocks.map(b => b.text).join("\n");
          this.emit("task:complete", { taskId, iterations, result, duration: Date.now() - startTime });
          break;
        }

        // Execute tools
        const toolResultBlocks = [];
        for (const toolCall of toolUseBlocks) {
          this.emit("tool:call", { taskId, iteration: iterations, tool: toolCall.name, input: toolCall.input });

          let toolResult;
          try {
            toolResult = await this.tools.execute(toolCall.name, toolCall.input);
            this.emit("tool:result", { taskId, tool: toolCall.name, success: true, result: toolResult });
          } catch (err) {
            toolResult = { error: err.message };
            this.emit("tool:error", { taskId, tool: toolCall.name, error: err.message });
          }

          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: toolCall.id,
            content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2),
          });
          toolResults.push({ tool: toolCall.name, input: toolCall.input, output: toolResult, iteration: iterations });
        }

        this.conversationHistory.push({ role: "user", content: toolResultBlocks });
      }

      if (iterations >= this.maxIterations) {
        this.emit("task:max_iterations", { taskId, iterations });
        result = `Mr. Stix hit the iteration ceiling (${this.maxIterations}). Task may be incomplete.`;
      }
    } catch (err) {
      this.emit("task:error", { taskId, error: err.message, stack: err.stack });
      result = `Error: ${err.message}`;
    }

    const taskRecord = {
      id: taskId, task, result, iterations,
      toolCalls: toolResults.length,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
    this.taskLog.push(taskRecord);
    this.memory.store(`task:${taskId}`, taskRecord);
    this.isRunning = false;
    return taskRecord;
  }

  _buildPrompt(task, context) {
    let p = `## TASK\n${task}\n`;
    if (context.previousTasks?.length) {
      p += `\n## PREVIOUS RESULTS\n`;
      for (const prev of context.previousTasks) p += `- ${prev.task}: ${prev.result?.slice(0, 200)}\n`;
    }
    if (context.constraints) p += `\n## CONSTRAINTS\n${context.constraints}\n`;
    p += `\n## WORKSPACE\n${process.env.STIX_WORKING_DIR || "./workspace"}\n\nTake it from here.`;
    return p;
  }

  stop() {
    this.isRunning = false;
    this.emit("task:stopped", { message: "Mr. Stix stopped. He's not happy about it." });
  }

  getTaskLog() { return this.taskLog; }

  getStats() {
    const total = this.taskLog.length;
    const dur = this.taskLog.reduce((s, t) => s + t.duration, 0);
    const tools = this.taskLog.reduce((s, t) => s + t.toolCalls, 0);
    return {
      tasksCompleted: total, totalDurationMs: dur,
      avgDurationMs: total ? Math.round(dur / total) : 0,
      totalToolCalls: tools, uptime: process.uptime(),
    };
  }
}

export default StixAgent;
