# Registered AI Skills

> context_type: registered_ai_skills

## SDLC Phase Skills (per repo)

| Skill | Location | What It Does | Used By |
|-------|----------|-------------|---------|
| impact-map | `repos/{mco,mcoa}/.cursor/skills/impact-map/SKILL.md` | Scan codebase, produce grounded impact analysis with verified file paths | Impact Map Agent |
| task-creator | `repos/{mco,mcoa}/.cursor/skills/task-creator/SKILL.md` | Convert approved impact map into structured, ordered tasks | Task Creator Agent |
| developer | `repos/{mco,mcoa}/.cursor/skills/developer/SKILL.md` | Implement task following repo conventions, Go standards, DCO | Developer Agent |
| tester | `repos/{mco,mcoa}/.cursor/skills/tester/SKILL.md` | Write unit/integration/E2E tests with testify | Tester Agent |
| ci-fixer | `repos/{mco,mcoa}/.cursor/skills/ci-fixer/SKILL.md` | Parse CI output, diagnose, fix lint/test/build failures | CI-Fixer Agent |

## Domain Specialist Skills

| Skill | Location | What It Does | Triggered By |
|-------|----------|-------------|-------------|
| rightsizing (MCO) | `repos/mco/.cursor/skills/rightsizing/SKILL.md` | MCO RS code map: API types, controllers, sub-packages, delegation, Policy mode | "rightsizing", "acm_rs", "PrometheusRule policy" |
| rightsizing (MCOA) | `repos/mcoa/.cursor/skills/rightsizing/SKILL.md` | MCOA RS code map: recording rules, handlers, Helm, Perses, ScrapeConfig | "rightsizing", "acm_rs", "ScrapeConfig rightsizing" |
| prediction | `repos/mcoa/.cursor/skills/prediction/SKILL.md` | Prediction engine: models, features, anomaly, providers, training, privacy | "prediction", "forecasting", "Holt-Winters", "anomaly detection" |

## Quick Reference Files

| Reference | Location | What It Contains |
|-----------|----------|-----------------|
| MCO RS reference | `repos/mco/.cursor/skills/rightsizing/reference.md` | Metric names, constants, resource names, MCO CR paths, ADC keys, prediction config |
| MCOA RS reference | `repos/mcoa/.cursor/skills/rightsizing/reference.md` | Package layout, ADC keys, Helm values paths, prediction metrics, provider config |

## Skill Composition

Skills can be composed for complex tasks:

- **Impact map + rightsizing**: "Read @impact-map and @rightsizing skills, then analyze the prediction engine feature"
- **Developer + prediction**: "Read @developer and @prediction skills, then implement the STL model"
- **Tester + rightsizing**: "Read @tester and @rightsizing skills, then write tests for forecast rules"
- **CI-fixer + developer**: CI-fixer reads CI output, then applies developer conventions to fix

## Hooks (Automated Behaviors)

| Hook | Repo | Trigger | What It Does |
|------|------|---------|-------------|
| check-phase-gate.sh | Both | Before next SDLC phase | Blocks progression without human approval |
| mco-post-edit.sh | MCO | After file edit | Reminds: `make deps` after go.mod, `make bundle` after API changes, `fmt.Print` detection |
| mcoa-post-edit.sh | MCOA | After file edit | Reminds: Helm chart updates when signal packages change, scheme registration |
