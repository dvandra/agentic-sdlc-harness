/**
 * Agentic SDLC Orchestrator
 *
 * Drives the full pipeline: Impact Map → Task Creation → Development → Testing → CI Fix
 * Uses the Cursor SDK to chain specialized agents.
 *
 * Usage:
 *   npx tsx scripts/orchestrator.ts --feature "Add CSV export for SBOMs" --repo https://github.com/org/repo
 *   npx tsx scripts/orchestrator.ts --feature "Add CSV export" --repo . --local
 *   npx tsx scripts/orchestrator.ts --jira PROJ-1234 --repo https://github.com/org/repo
 */

import { Agent } from "@cursor/sdk";

interface OrchestratorConfig {
  feature: string;
  repoUrl: string;
  local: boolean;
  jiraKey?: string;
  apiKey: string;
  model: string;
  maxCIFixAttempts: number;
}

function parseArgs(): OrchestratorConfig {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("CURSOR_API_KEY environment variable is required");
    process.exit(1);
  }

  const feature = get("--feature");
  const repo = get("--repo");

  if (!feature || !repo) {
    console.error("Usage: npx tsx scripts/orchestrator.ts --feature <description> --repo <url|.>");
    console.error("  --feature    Feature description or Jira ticket summary");
    console.error("  --repo       GitHub repo URL (cloud) or '.' (local)");
    console.error("  --jira       Optional Jira key (e.g., PROJ-1234)");
    console.error("  --local      Force local runtime");
    console.error("  --model      Model ID (default: composer-2)");
    process.exit(1);
  }

  return {
    feature,
    repoUrl: repo,
    local: args.includes("--local") || repo === ".",
    jiraKey: get("--jira"),
    apiKey,
    model: get("--model") ?? "composer-2",
    maxCIFixAttempts: 5,
  };
}

function runtimeConfig(config: OrchestratorConfig) {
  if (config.local) {
    return { local: { cwd: process.cwd() } };
  }
  return {
    cloud: {
      repos: [{ url: config.repoUrl }],
    },
  };
}

async function runAgent(
  prompt: string,
  config: OrchestratorConfig,
  options?: { autoCreatePR?: boolean }
): Promise<{ status: string; agentId: string }> {
  const agent = Agent.create({
    apiKey: config.apiKey,
    model: { id: config.model },
    ...runtimeConfig(config),
    ...(options?.autoCreatePR && !config.local
      ? { cloud: { repos: [{ url: config.repoUrl }], autoCreatePR: true } }
      : {}),
  });

  try {
    const run = await agent.send(prompt);
    console.log(`  Agent: ${agent.agentId} | Run: ${run.id}`);

    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        if (event.type === "assistant") {
          for (const block of event.message.content) {
            if (block.type === "text") process.stdout.write(block.text);
          }
        }
      }
    }

    const result = await run.wait();
    console.log(`\n  Status: ${result.status}`);
    return { status: result.status, agentId: agent.agentId };
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

// ── Stage 1: Repository Impact Map ──────────────────────────────────
async function stageImpactMap(config: OrchestratorConfig): Promise<string> {
  console.log("\n══════════════════════════════════════════════");
  console.log("  STAGE 1: REPOSITORY IMPACT MAP");
  console.log("══════════════════════════════════════════════\n");

  const prompt = `You are running the "impact-map" skill from .cursor/skills/impact-map/SKILL.md.

Feature request: "${config.feature}"
${config.jiraKey ? `Jira key: ${config.jiraKey}` : ""}

Follow the impact-map skill workflow exactly:
1. Scan the codebase thoroughly — search for files, grep for patterns, read key modules
2. Produce a repository impact map following templates/impact-map-template.md
3. Save it to docs/impact-maps/
4. Present the map and stop for human review

Remember: every file path and symbol must be verified against real code.`;

  const result = await runAgent(prompt, config);
  return result.agentId;
}

// ── Stage 2: Structured Task Creation ───────────────────────────────
async function stageTaskCreation(
  config: OrchestratorConfig,
  previousAgentId: string
): Promise<string> {
  console.log("\n══════════════════════════════════════════════");
  console.log("  STAGE 2: STRUCTURED TASK CREATION");
  console.log("══════════════════════════════════════════════\n");

  const prompt = `You are running the "task-creator" skill from .cursor/skills/task-creator/SKILL.md.

The impact map for "${config.feature}" has been approved by the human reviewer.

Follow the task-creator skill workflow:
1. Read the impact map from docs/impact-maps/
2. Read the task template from templates/task-template.md
3. Create structured tasks in docs/tasks/
4. Present a summary table of all tasks with dependencies

Every file path and symbol reference must be verified against the current codebase.`;

  const result = await runAgent(prompt, config);
  return result.agentId;
}

// ── Stage 3: Development ────────────────────────────────────────────
async function stageDevelopment(
  config: OrchestratorConfig,
  taskNumber: number
): Promise<string> {
  console.log("\n══════════════════════════════════════════════");
  console.log(`  STAGE 3: DEVELOPMENT (Task ${taskNumber})`);
  console.log("══════════════════════════════════════════════\n");

  const prompt = `You are running the "developer" skill from .cursor/skills/developer/SKILL.md.

Implement the structured task found in docs/tasks/ for task ${taskNumber}.

Follow the developer skill workflow exactly:
1. Read the task spec
2. Read all referenced files and patterns
3. Create a feature branch
4. Implement the changes following existing patterns
5. Write tests alongside implementation
6. Self-review against acceptance criteria
7. Open a PR

Stay strictly within the task scope. Do not make architectural decisions.`;

  const result = await runAgent(prompt, config, { autoCreatePR: true });
  return result.agentId;
}

// ── Stage 4: Testing ────────────────────────────────────────────────
async function stageTesting(
  config: OrchestratorConfig,
  previousAgentId: string
): Promise<string> {
  console.log("\n══════════════════════════════════════════════");
  console.log("  STAGE 4: TESTING");
  console.log("══════════════════════════════════════════════\n");

  const agent = Agent.resume(previousAgentId, {
    apiKey: config.apiKey,
    model: { id: config.model },
    ...runtimeConfig(config),
  });

  try {
    const run = await agent.send(`Now run the "tester" skill from .cursor/skills/tester/SKILL.md.

Add comprehensive tests for the implementation you just completed:
1. Read the task's acceptance criteria and test requirements
2. Find existing test patterns in the project
3. Write unit, integration, and E2E tests
4. Run them and verify they pass
5. Report a coverage map`);

    const result = await run.wait();
    console.log(`  Status: ${result.status}`);
    return agent.agentId;
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

// ── Stage 5: CI Fix Loop ────────────────────────────────────────────
async function stageCIFix(
  config: OrchestratorConfig,
  previousAgentId: string
): Promise<void> {
  console.log("\n══════════════════════════════════════════════");
  console.log("  STAGE 5: CI MONITORING & AUTO-FIX");
  console.log("══════════════════════════════════════════════\n");

  const agent = Agent.resume(previousAgentId, {
    apiKey: config.apiKey,
    model: { id: config.model },
    ...runtimeConfig(config),
  });

  try {
    const run = await agent.send(`Now run the "ci-fixer" skill from .cursor/skills/ci-fixer/SKILL.md.

Check the CI status on the PR. If any checks are failing:
1. Read the failure logs
2. Diagnose the root cause
3. Fix with minimal changes
4. Push and re-check
5. Loop until green (max ${config.maxCIFixAttempts} attempts)

Also review and address any PR comments.
If CI is green and no unresolved comments, report the PR as merge-ready.`);

    const result = await run.wait();
    console.log(`  Status: ${result.status}`);
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

// ── Main Pipeline ───────────────────────────────────────────────────
async function main() {
  const config = parseArgs();

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       AGENTIC SDLC PIPELINE                 ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Feature: ${config.feature.slice(0, 35).padEnd(35)}║`);
  console.log(`║  Runtime: ${(config.local ? "local" : "cloud").padEnd(35)}║`);
  console.log(`║  Model:   ${config.model.padEnd(35)}║`);
  console.log("╚══════════════════════════════════════════════╝");

  // Stage 1: Impact Map (requires human review after)
  const impactMapAgentId = await stageImpactMap(config);

  console.log("\n┌─────────────────────────────────────────────┐");
  console.log("│  HUMAN CHECKPOINT: Review the impact map     │");
  console.log("│  Check docs/impact-maps/ and approve or edit │");
  console.log("│  Press Enter to continue after review...     │");
  console.log("└─────────────────────────────────────────────┘");

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Stage 2: Task Creation
  const taskAgentId = await stageTaskCreation(config, impactMapAgentId);

  // Stage 3 + 4 + 5: Development → Testing → CI Fix
  // For each task, run dev → test → CI fix sequentially
  const devAgentId = await stageDevelopment(config, 1);
  const testAgentId = await stageTesting(config, devAgentId);
  await stageCIFix(config, testAgentId);

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  PIPELINE COMPLETE                           ║");
  console.log("║  PR is ready for human merge approval        ║");
  console.log("╚══════════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
