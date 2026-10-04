# Contributing

> This is ponytail-ue, an Unreal Engine C++ fork. Changes to the shared, non-Unreal parts belong upstream at [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail). Here, Unreal rule changes should keep the UE invariants in `scripts/check-rule-copies.js` passing and show numbers from the Unreal benchmark below.

Thanks for helping. There are two kinds of changes, with different bars.

## Changes to the ruleset need a benchmark

The ruleset is what every ponytail user loads in every session. That means `skills/`, `AGENTS.md`,
the rule copies (`.cursor/`, `.windsurf/`, `.clinerules/`, `.agents/`, `.qoder/`, `.kiro/`,
`.github/copilot-instructions.md`), `.openclaw/skills/`, and anything else that changes what the
agent is told.

I only merge a change there if the PR shows a benchmark with three arms, same task, same model:

1. `baseline` (no ponytail)
2. current ponytail (`main`)
3. ponytail with your change

The PR should show:

- a task where your change should make a difference, and the numbers showing it does,
- at least one existing task it could break, and the numbers showing it doesn't (a new rule
  often fights an old one),
- at least 6 runs per arm on a current model, and which model you used.

Without that, the PR gets closed, however good the idea is.

[`benchmarks/run.js`](benchmarks/run.js) does the work ([setup](benchmarks/README.md#run)). The
`ponytail` arm loads the plugin from `PONYTAIL_PLUGIN_DIR`, so run it once against a checkout of
`main` and once against your branch:

```bash
node benchmarks/run.js --selftest
PONYTAIL_PLUGIN_DIR=/abs/path/to/ponytail-ue-main node benchmarks/run.js --task <task> --arms baseline,ponytail --model opus --runs 6
PONYTAIL_PLUGIN_DIR=/abs/path/to/your-branch node benchmarks/run.js --task <task> --arms ponytail --model opus --runs 6
```

If your task isn't in `TASKS` yet, add it with a `good` and a `bad` reference edit of the fixture,
so `--selftest` (and `npm test`) proves the scorer catches the difference. If you have an engine,
`--selftest --compile` proves both references build.

Rule text lives in `AGENTS.md` and `skills/ponytail/SKILL.md`. Keep the copies in sync
(`node scripts/check-rule-copies.js`) and regenerate `.openclaw/` with
`node scripts/build-openclaw-skills.js`.

## Everything else

Bug fixes in hooks, installers, adapters, and docs don't need a benchmark. Before you open the PR:

```bash
npm test
node scripts/check-rule-copies.js
node scripts/check-versions.js
```

Keep the PR to one change and link the issue it fixes.
