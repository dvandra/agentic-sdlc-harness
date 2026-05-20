/**
 * Cross-Repo Pipeline for MCO + MCOA
 *
 * Many features span both repositories. This orchestrator:
 * 1. Runs impact map analysis on both repos
 * 2. Creates tasks that respect cross-repo dependencies
 * 3. Implements MCO changes first (usually the dependency direction)
 * 4. Implements MCOA changes second
 * 5. Runs CI fixes on both
 *
 * Usage:
 *   npx tsx scripts/cross-repo-pipeline.ts \
 *     --feature "Add PrometheusAgent support for custom metrics" \
 *     --mco-repo https://github.com/<org>/multicluster-observability-operator \
 *     --mcoa-repo https://github.com/<org>/multicluster-observability-addon
 *
 *   # Local mode (both repos checked out)
 *   npx tsx scripts/cross-repo-pipeline.ts \
 *     --feature "Add PrometheusAgent support" \
 *     --mco-repo /path/to/mco --mcoa-repo /path/to/mcoa --local
 */

import { Agent } from "@cursor/sdk";

interface CrossRepoConfig {
  feature: string;
  mcoRepo: string;
  mcoaRepo: string;
  local: boolean;
  apiKey: string;
  model: string;
}

function parseArgs(): CrossRepoConfig {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("CURSOR_API_KEY required");
    process.exit(1);
  }

  return {
    feature: get("--feature") ?? "",
    mcoRepo: get("--mco-repo") ?? "",
    mcoaRepo: get("--mcoa-repo") ?? "",
    local: args.includes("--local"),
    apiKey,
    model: get("--model") ?? "composer-2",
  };
}

function makeRuntimeOpts(config: CrossRepoConfig, repoUrl: string) {
  if (config.local) {
    return { local: { cwd: repoUrl } };
  }
  return { cloud: { repos: [{ url: repoUrl }] } };
}

async function runAgentOnRepo(
  prompt: string,
  config: CrossRepoConfig,
  repoUrl: string,
  opts?: { autoCreatePR?: boolean }
) {
  const agent = Agent.create({
    apiKey: config.apiKey,
    model: { id: config.model },
    ...makeRuntimeOpts(config, repoUrl),
    ...(opts?.autoCreatePR && !config.local
      ? { cloud: { repos: [{ url: repoUrl }], autoCreatePR: true } }
      : {}),
  });

  try {
    console.log(`  Agent: ${agent.agentId}`);
    const run = await agent.send(prompt);

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
    return { status: result.status, agentId: agent.agentId };
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

async function main() {
  const config = parseArgs();

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  CROSS-REPO PIPELINE: MCO + MCOA                ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Feature: ${config.feature.slice(0, 39).padEnd(39)}║`);
  console.log("╚══════════════════════════════════════════════════╝");

  // ── Phase 1: Parallel Impact Maps ──────────────────────────────
  console.log("\n═══ PHASE 1: PARALLEL IMPACT MAPS ═══\n");

  const impactMapPrompt = (repo: string) =>
    `You are running the impact-map skill. Feature: "${config.feature}".
Scan the codebase thoroughly and produce a grounded impact map.
Also identify any cross-repo impact with the ${repo === "MCO" ? "MCOA" : "MCO"} repository.
Save the map to docs/impact-maps/ and stop for human review.`;

  const [mcoMap, mcoaMap] = await Promise.all([
    (async () => {
      console.log("  [MCO] Starting impact map analysis...");
      return runAgentOnRepo(impactMapPrompt("MCO"), config, config.mcoRepo);
    })(),
    (async () => {
      console.log("  [MCOA] Starting impact map analysis...");
      return runAgentOnRepo(impactMapPrompt("MCOA"), config, config.mcoaRepo);
    })(),
  ]);

  console.log("\n┌──────────────────────────────────────────────────┐");
  console.log("│  HUMAN CHECKPOINT: Review both impact maps       │");
  console.log("│  MCO:  docs/impact-maps/                         │");
  console.log("│  MCOA: docs/impact-maps/                         │");
  console.log("│  Press Enter after review...                     │");
  console.log("└──────────────────────────────────────────────────┘");

  await new Promise<void>((r) => process.stdin.once("data", () => r()));

  // ── Phase 2: Task Creation (parallel) ──────────────────────────
  console.log("\n═══ PHASE 2: TASK CREATION ═══\n");

  await Promise.all([
    (async () => {
      console.log("  [MCO] Creating structured tasks...");
      await runAgentOnRepo(
        `Impact map approved. Run task-creator skill. Create structured tasks from docs/impact-maps/. Feature: "${config.feature}"`,
        config, config.mcoRepo
      );
    })(),
    (async () => {
      console.log("  [MCOA] Creating structured tasks...");
      await runAgentOnRepo(
        `Impact map approved. Run task-creator skill. Create structured tasks from docs/impact-maps/. Feature: "${config.feature}"`,
        config, config.mcoaRepo
      );
    })(),
  ]);

  // ── Phase 3: Development (MCO first, then MCOA) ───────────────
  console.log("\n═══ PHASE 3: DEVELOPMENT ═══\n");

  console.log("  [MCO] Implementing (runs first — usually the dependency)...");
  const mcoDevResult = await runAgentOnRepo(
    `Run developer skill. Implement tasks from docs/tasks/. Feature: "${config.feature}". Follow task specs exactly.`,
    config, config.mcoRepo, { autoCreatePR: true }
  );

  console.log("\n  [MCOA] Implementing (after MCO)...");
  const mcoaDevResult = await runAgentOnRepo(
    `Run developer skill. Implement tasks from docs/tasks/. Feature: "${config.feature}". Follow task specs exactly. Note: MCO changes are being made in parallel.`,
    config, config.mcoaRepo, { autoCreatePR: true }
  );

  // ── Phase 4: Testing + CI Fix (parallel) ───────────────────────
  console.log("\n═══ PHASE 4: TESTING + CI FIX ═══\n");

  await Promise.all([
    (async () => {
      console.log("  [MCO] Running tests + CI fix loop...");
      const agent = Agent.resume(mcoDevResult.agentId, {
        apiKey: config.apiKey,
        model: { id: config.model },
        ...makeRuntimeOpts(config, config.mcoRepo),
      });
      try {
        const run = await agent.send("Run tester skill: write tests. Then run ci-fixer skill: fix any CI failures. Loop until green.");
        await run.wait();
      } finally {
        await agent[Symbol.asyncDispose]();
      }
    })(),
    (async () => {
      console.log("  [MCOA] Running tests + CI fix loop...");
      const agent = Agent.resume(mcoaDevResult.agentId, {
        apiKey: config.apiKey,
        model: { id: config.model },
        ...makeRuntimeOpts(config, config.mcoaRepo),
      });
      try {
        const run = await agent.send("Run tester skill: write tests. Then run ci-fixer skill: fix any CI failures. Loop until green.");
        await run.wait();
      } finally {
        await agent[Symbol.asyncDispose]();
      }
    })(),
  ]);

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  CROSS-REPO PIPELINE COMPLETE                   ║");
  console.log("║  PRs ready for human review + merge              ║");
  console.log("╚══════════════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
