---
name: ponytail-gain
description: "Show ponytail-ue measured impact from the Unreal benchmark, or say there are no published numbers yet. One-shot display."
homepage: https://github.com/cryptosebek/ponytail-ue
license: MIT
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
