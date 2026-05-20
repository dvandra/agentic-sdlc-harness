/**
 * Run a single SDLC stage independently.
 * Useful for re-running a failed stage or running stages manually.
 *
 * Usage:
 *   npx tsx scripts/run-stage.ts impact-map --feature "Add CSV export" --repo .
 *   npx tsx scripts/run-stage.ts task-create --feature "Add CSV export" --repo .
 *   npx tsx scripts/run-stage.ts develop --task 1 --repo .
 *   npx tsx scripts/run-stage.ts test --resume <agent-id> --repo .
 *   npx tsx scripts/run-stage.ts ci-fix --resume <agent-id> --repo .
 */

import { Agent } from "@cursor/sdk";

const SKILLS: Record<string, string> = {
  "impact-map": "impact-map",
  "task-create": "task-creator",
  develop: "developer",
  test: "tester",
  "ci-fix": "ci-fixer",
};

async function main() {
  const [stage, ...rest] = process.argv.slice(2);
  const apiKey = process.env.CURSOR_API_KEY;

  if (!apiKey || !stage || !SKILLS[stage]) {
    console.error(`Usage: npx tsx scripts/run-stage.ts <stage> [options]`);
    console.error(`Stages: ${Object.keys(SKILLS).join(", ")}`);
    process.exit(1);
  }

  const get = (flag: string): string | undefined => {
    const idx = rest.indexOf(flag);
    return idx !== -1 ? rest[idx + 1] : undefined;
  };

  const repo = get("--repo") ?? ".";
  const isLocal = repo === "." || rest.includes("--local");
  const model = get("--model") ?? "composer-2";
  const feature = get("--feature") ?? "the current feature";
  const resumeId = get("--resume");

  const runtimeOpts = isLocal
    ? { local: { cwd: process.cwd() } }
    : { cloud: { repos: [{ url: repo }] } };

  const skillName = SKILLS[stage];
  const prompt = buildPrompt(stage, feature, get("--task"));

  let agent;
  if (resumeId) {
    agent = Agent.resume(resumeId, {
      apiKey,
      model: { id: model },
      ...runtimeOpts,
    });
  } else {
    agent = Agent.create({
      apiKey,
      model: { id: model },
      ...runtimeOpts,
    });
  }

  try {
    console.log(`Running stage: ${stage} (skill: ${skillName})`);
    const run = await agent.send(prompt);
    console.log(`Agent: ${agent.agentId} | Run: ${run.id}`);

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
    console.log(`\nResult: ${result.status}`);
    console.log(`Agent ID (for resume): ${agent.agentId}`);
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

function buildPrompt(stage: string, feature: string, taskNum?: string): string {
  switch (stage) {
    case "impact-map":
      return `Run the "impact-map" skill from .cursor/skills/impact-map/SKILL.md.
Feature: "${feature}". Scan the codebase and produce a grounded impact map.`;

    case "task-create":
      return `Run the "task-creator" skill from .cursor/skills/task-creator/SKILL.md.
The impact map for "${feature}" is approved. Create structured tasks.`;

    case "develop":
      return `Run the "developer" skill from .cursor/skills/developer/SKILL.md.
Implement task ${taskNum ?? 1} from docs/tasks/. Follow the spec exactly.`;

    case "test":
      return `Run the "tester" skill from .cursor/skills/tester/SKILL.md.
Write comprehensive tests for the current implementation.`;

    case "ci-fix":
      return `Run the "ci-fixer" skill from .cursor/skills/ci-fixer/SKILL.md.
Check CI status, fix failures, loop until green.`;

    default:
      return "";
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
