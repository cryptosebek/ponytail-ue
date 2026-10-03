# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Ponytail is a "lazy senior dev" ruleset for AI coding agents (YAGNI, reuse, stdlib first, minimal diff), packaged for ~20 hosts (Claude Code, Codex, Cursor, Windsurf, Cline, Copilot, Gemini, OpenCode, Pi, Qoder, Kiro, OpenClaw, Hermes, MCP, ...). The product is mostly text (the ruleset) plus per-host adapters that inject it. `AGENTS.md` is the project's own instructions *and* the canonical ruleset; follow it when working here.

This is **ponytail-ue**, a fork tuned for Unreal Engine C++ (remote `upstream` = DietrichGebert/ponytail). The fork's changes are deliberately narrow so upstream merges stay easy:

- UE rule text in `AGENTS.md` (and its rule copies), `skills/ponytail/SKILL.md` ("Unreal Engine" section, UE intensity example, UE "When NOT to be lazy" carve-outs), `skills/ponytail-review` and `skills/ponytail-audit`.
- UE safety phrases (`HasAuthority`, `CoreRedirect`, `TWeakObjectPtr`, `game thread`, `IMPLEMENT_SIMPLE_AUTOMATION_TEST`) are pinned as invariants in `scripts/check-rule-copies.js`.
- Only the marketplace names, the npm package name, and repo URLs were renamed to `ponytail-ue`. Plugin names, skill names, and `/ponytail` commands stay `ponytail`, because hooks (`ponytail-mode-tracker.js` matches `/ponytail:ponytail`) and Hermes (`__init__.py`, `ponytail:{command}`) hardcode that namespace.

## Commands

```bash
npm test                                   # node --test tests/*.test.js, then pi-extension and ponytail-mcp tests
node --test tests/hooks.test.js            # single test file
node --test --test-name-pattern="<name>" tests/hooks.test.js   # single test
node scripts/check-rule-copies.js          # rule copies must match AGENTS.md
node scripts/check-versions.js             # version strings consistent across manifests
node scripts/build-openclaw-skills.js      # regenerate .openclaw/skills from skills/
npm install --prefix ponytail-mcp          # MCP deps (needed before npm test in CI)
```

CI (`.github/workflows/test.yml`) runs check-rule-copies, check-versions, then `npm test` (Node 22; Python 3.12 + pandas for correctness checks).

## Architecture

- **Ruleset sources of truth**: `AGENTS.md` (compact) and `skills/ponytail/SKILL.md` (runtime, longer, has lite/full/ultra intensity tables). Other skills (`ponytail-audit|debt|gain|help|review`) live in `skills/`; `commands/*.toml` (Gemini) and `.opencode/command/` mirror them.
- **Rule copies**: `.cursor/rules/`, `.windsurf/`, `.clinerules/`, `.agents/`, `.qoder/`, `.kiro/steering/`, `.github/copilot-instructions.md` are byte-equal copies of AGENTS.md (minus host frontmatter and the trailing "Yes, this file also applies..." line). `.openclaw/skills/` is generated. Edit the source, then sync copies; `check-rule-copies.js` enforces it.
- **Hook runtime** (`hooks/`): `ponytail-activate.js` (SessionStart: writes `.ponytail-active` flag in the Claude config dir, emits ruleset as hidden context, statusline nudge), `ponytail-mode-tracker.js`, `ponytail-subagent.js`, statusline scripts (`.sh`/`.ps1`). `ponytail-instructions.js` is the shared builder (filters SKILL.md by mode); `ponytail-config.js` resolves default mode; `ponytail-runtime.js` has host detection (Codex/Copilot/Cursor/Zcode) and output writing. Host hook manifests are the `*-hooks.json` files.
- **Reuse of the builder**: `pi-extension/` and `ponytail-mcp/` both import `hooks/ponytail-instructions.js`, so every host emits identical rules. Each has its own `package.json` and tests.
- **Plugin manifests**: `.claude-plugin/`, `.codex-plugin/`, `.devin-plugin/`, `.github/plugin/`, `.grok-plugin/`, `.qoder-plugin/`, `.agents/plugins/`, `plugin.json`, `plugin.yaml`, `gemini-extension.json`, `opencode.json`, `__init__.py` (Hermes), `.opencode/plugins/`. Versions must agree (`check-versions.js`).
- **Benchmarks** (`benchmarks/`): agentic harness in `benchmarks/agentic/run.py`; `--selftest` validates scorers against `good`/`bad` references in `tasks.py`.

## Contribution rules (from CONTRIBUTING.md)

- Any change to what the agent is told (skills, AGENTS.md, rule copies, `.openclaw/skills/`) needs a three-arm benchmark (baseline / main / your change, >=6 runs per arm, current model) or it is closed. Run with `PONYTAIL_PLUGIN_DIR=/abs/path python run.py --task <task> --arms ponytail --models opus --runs 6` from `benchmarks/agentic`.
- Hooks, installers, adapters, docs: no benchmark; run `npm test`, `check-rule-copies.js`, `check-versions.js`. One change per PR, link the issue.
- Non-trivial logic leaves one runnable check behind (see AGENTS.md); mark deliberate simplifications with a `ponytail:` comment naming the ceiling.
