/**
 * Task Pipeline — Mr. Stix doesn't just do one thing.
 * He does ALL the things. In order. Without complaint.
 *
 * Pipelines let you chain tasks, pass context between them,
 * and run complex multi-step workflows.
 */

import { StixAgent } from "./core.js";

export class Pipeline {
  constructor(name, agent = null) {
    this.name = name;
    this.agent = agent || new StixAgent();
    this.steps = [];
    this.results = [];
    this.status = "idle";
  }

  /**
   * Add a step to the pipeline.
   * @param {string} task - Task description
   * @param {object} options - { condition, transform, onError }
   */
  step(task, options = {}) {
    this.steps.push({
      task,
      condition: options.condition || null,     // (prevResults) => boolean
      transform: options.transform || null,     // (prevResults) => contextObject
      onError: options.onError || "continue",   // "stop" | "continue" | "retry"
      retries: options.retries || 0,
      id: `step_${this.steps.length}`,
    });
    return this; // chainable
  }

  /**
   * Execute the entire pipeline.
   */
  async run() {
    this.status = "running";
    this.results = [];
    const startTime = Date.now();

    console.log(`\n\x1b[96m[PIPELINE]\x1b[0m Starting: ${this.name} (${this.steps.length} steps)`);

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];

      // Check condition
      if (step.condition && !step.condition(this.results)) {
        console.log(`\x1b[33m[SKIP]\x1b[0m Step ${i + 1}: condition not met`);
        this.results.push({ skipped: true, step: step.id });
        continue;
      }

      // Build context from previous results
      const context = step.transform
        ? step.transform(this.results)
        : { previousTasks: this.results.filter((r) => !r.skipped) };

      console.log(`\x1b[96m[STEP ${i + 1}/${this.steps.length}]\x1b[0m ${step.task.slice(0, 80)}`);

      let attempt = 0;
      let result = null;

      while (attempt <= step.retries) {
        try {
          result = await this.agent.execute(step.task, context);
          break;
        } catch (err) {
          attempt++;
          if (attempt > step.retries) {
            if (step.onError === "stop") {
              this.status = "failed";
              console.log(`\x1b[31m[FAILED]\x1b[0m Pipeline stopped at step ${i + 1}: ${err.message}`);
              return { status: "failed", completedSteps: i, results: this.results, error: err.message };
            }
            result = { error: err.message, task: step.task };
          }
        }
      }

      this.results.push(result);
    }

    this.status = "complete";
    const duration = Date.now() - startTime;

    console.log(`\x1b[32m[PIPELINE COMPLETE]\x1b[0m ${this.name}: ${this.results.length} steps, ${(duration / 1000).toFixed(1)}s`);

    return {
      status: "complete",
      pipeline: this.name,
      steps: this.results.length,
      duration,
      results: this.results,
    };
  }
}

/**
 * Pre-built pipeline templates for common workflows.
 */
export const templates = {
  /**
   * Code Review Pipeline
   * Reads code → analyzes quality → suggests fixes → generates report
   */
  codeReview: (targetPath) => {
    return new Pipeline("Code Review")
      .step(`List all source code files in ${targetPath} and identify the primary language and framework used.`)
      .step(`Read and analyze the code quality of the main files. Look for: bugs, security issues, performance problems, code smells, missing error handling, and style inconsistencies.`)
      .step(`Write a detailed code review report as a markdown file at ./review-report.md. Include: summary, critical issues, warnings, suggestions, and a quality score from 1-10.`);
  },

  /**
   * Data Analysis Pipeline
   * Reads data → computes stats → generates visualizations → writes report
   */
  dataAnalysis: (dataPath) => {
    return new Pipeline("Data Analysis")
      .step(`Read and analyze the data file at ${dataPath}. Identify the schema, data types, row count, missing values, and basic statistics for all numeric columns.`)
      .step(`Perform deeper analysis: identify trends, outliers, correlations, and notable patterns in the data. Compute relevant aggregations.`)
      .step(`Generate a comprehensive analysis report as ./analysis-report.md with all findings, key insights, and recommendations.`);
  },

  /**
   * Project Scaffold Pipeline
   * Creates project structure → installs deps → writes configs → creates README
   */
  scaffold: (projectName, type = "node") => {
    return new Pipeline("Project Scaffold")
      .step(`Create a new ${type} project called "${projectName}" with a proper directory structure, package.json, and configuration files.`)
      .step(`Add essential boilerplate: entry point, basic tests, .gitignore, ESLint config, and CI/CD workflow file.`)
      .step(`Write a comprehensive README.md with setup instructions, architecture overview, and usage examples.`);
  },

  /**
   * Documentation Pipeline
   * Reads codebase → extracts API → generates docs
   */
  document: (targetPath) => {
    return new Pipeline("Documentation Generator")
      .step(`Scan ${targetPath} and identify all exported functions, classes, and modules. Map the dependency graph.`)
      .step(`Generate comprehensive API documentation for each module as markdown files in ./docs/`)
      .step(`Create a docs/README.md with a table of contents linking all documentation files.`);
  },

  /**
   * Refactor Pipeline
   * Analyzes → plans → executes → verifies
   */
  refactor: (targetPath, goal) => {
    return new Pipeline("Refactor")
      .step(`Analyze the codebase at ${targetPath}. Understand the current architecture and identify what needs to change to achieve: ${goal}`)
      .step(`Create a detailed refactoring plan with specific file changes needed. Write the plan to ./refactor-plan.md`)
      .step(`Execute the refactoring plan. Make all the code changes described in the plan.`)
      .step(`Verify the refactoring by reading the modified files and checking that the changes are consistent and complete.`);
  },
};

export default Pipeline;
