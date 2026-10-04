# Benchmark

Does ponytail-ue change what an agent writes in a real Unreal project? Each cell is a real headless
Claude Code session that gets a fresh copy of [`fixture/`](fixture/) (a tiny UE 5.8 project:
a character, a player state, a turret, a save game) and a one-line ticket. It is scored on the
`git diff` it leaves behind.

## Tasks

Each ticket hides an over-build trap, a corner the UE rules say never to cut, or both:

| Task | Ticket | Safe means |
|---|---|---|
| `regen` | regenerate 5 health every 2 seconds | periodic work isn't tied to frame rate (a Tick that ignores its delta fails) |
| `team` | let a client choose its team, replicated | the Server RPC range-checks the client's value |
| `rename` | rename a `UPROPERTY` | a `CoreRedirect` keeps the value saved in existing assets |
| `turret` | keep the same target between shots | the remembered pointer is GC-visible (`UPROPERTY` + `IsValid`, or `TWeakObjectPtr`) |
| `save` | load the best score without blocking | no hand-rolled thread touches UObjects without hopping back to the game thread |

## Metrics

- **loc**: added C++/C# lines under `Source/`, comments included. Tests (`Tests/` folders,
  `*Test.cpp`, `*Spec.cpp`) are counted apart as `tests`, never as bloat.
- **correct**: the ticket is done. A structural check of the result, plus a real UBT build of the
  editor target when you pass `--compile`.
- **safe**: the corner above was not cut.
- **cost / seconds**: straight from the Claude Code JSON output.

The checks are regexes over the result, not a C++ parser. Each one ships a good and a bad reference
edit, and `--selftest` (also part of `npm test`) proves the good edit passes, the bad one is caught,
and the untouched fixture doesn't count as done. `--selftest --compile` also builds every reference.

## Run

Needs the `claude` CLI (or `CLAUDE_BIN` pointing at it). `--compile` needs `UE_ROOT`.

```bash
node benchmarks/run.js --selftest
node benchmarks/run.js --all --arms baseline,ponytail --model sonnet --runs 3
node benchmarks/run.js --report benchmarks/runs/<stamp> --examples
```

- `--arms`: `baseline` (no plugin), `ponytail` (this checkout, or `PONYTAIL_PLUGIN_DIR`),
  `upstream` (`UPSTREAM_PLUGIN_DIR`, e.g. a DietrichGebert/ponytail checkout, to check the UE rules
  beat the generic ones on Unreal work).
- `--model`: any `claude --model` value, comma list ok. `--runs`, `--workers` (default 4).
- `--compile`: build every cell with UBT (`UE_ROOT=".../UE_5.8"`). Builds serialize on UBT's mutex,
  and each build's ~2.5 GB of output is deleted once the verdict (`_build.json`) and `_build.log` are saved.
- `--report <dir>`: rescore kept workspaces without spending, and `--examples` rewrites
  [`examples/`](../examples/) from the median-LOC cell of each arm.

Workspaces stay in `benchmarks/runs/<stamp>/` (gitignored) for inspection. Every arm runs with
`--setting-sources project,local` (your globally enabled plugins are off), no MCP servers, no shell
tools, and the same "write the code and stop, don't build" instruction.
