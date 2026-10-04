---
name: ponytail-gain
description: >
  Show ponytail's measured impact as a compact scoreboard from the Unreal
  benchmark (benchmarks/ in this repo). One-shot display, not a persistent
  mode, and not a per-repo number. Trigger: /ponytail-gain, "ponytail gain",
  "what does ponytail save", "show ponytail impact", "ponytail scoreboard".
---

# Ponytail Gain

Display this card when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

ponytail-ue has no published Unreal benchmark medians yet. Do not quote
upstream ponytail's numbers: they were measured on web tasks (FastAPI,
React) and don't transfer to Unreal C++.

```
  ponytail gain                   Unreal benchmark · no published medians yet

  Measure it:  node benchmarks/run.js --all --runs 3
               5 UE tickets, no plugin vs ponytail-ue:
               lines added, ticket done, Unreal corner not cut, cost

  This repo:   /ponytail-debt  (shortcuts you deferred)
               /ponytail-audit (what's still cuttable)
```

## Honesty boundary

Benchmark medians are not this repo. NEVER print a per-repo savings
number ("you saved X lines/tokens here"): the unbuilt version was never
written, so there is no real baseline to subtract from in a live repo. The
only real per-repo figures come from `/ponytail-debt` (a counted ledger), and
this card points there instead of inventing one.

## Boundaries

One-shot display. Edits nothing, changes no mode.
"stop ponytail" or "normal mode": revert.
