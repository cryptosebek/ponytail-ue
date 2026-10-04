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

Numbers below are from one run of the Unreal benchmark: 5 tickets x 3 arms x
3 runs, Sonnet, each cell built with UE 5.8. Small sample, one model. Do not
quote upstream ponytail's web-task numbers; they don't transfer to Unreal C++.

```
  ponytail gain          Unreal benchmark · 15 runs per arm · Sonnet · UE 5.8

                    done   safe   done+safe   mean lines
  no plugin         12/15  12/15     9/15        16.2
  upstream          14/15  12/15    11/15        12.9
  ponytail-ue       14/15  15/15    14/15        13.5

  Clear gap: rename ticket, CoreRedirect added 3/3 (ponytail-ue) vs 0/3 (others).
  Upstream wrote the shortest code; ponytail-ue is not shorter than it.
  Both plugins cost more per run (~$0.08 vs ~$0.06).

  Reproduce:   node benchmarks/run.js --all --runs 3 --compile
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
