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

Numbers below are from the latest Unreal benchmark: 5 tickets x 3 arms x 6
runs, Sonnet, each cell built with UE 5.8. One model, so small gaps are noise.
Do not quote upstream ponytail's web-task numbers; they don't transfer to
Unreal C++.

```
  ponytail gain          Unreal benchmark · 30 runs per arm · Sonnet · UE 5.8

                         done   safe   done+safe   mean lines
  no plugin              25/30  24/30    19/30        16.2
  ponytail-ue (shipped)  28/30  30/30    28/30        13.7
  + 2 rules (reverted)   25/30  30/30    25/30        13.9

  Clear gap: rename ticket, CoreRedirect added 12/12 with ponytail-ue vs 0/6 without.
  Two extra rules were tried and reverted: save built 1/6 with them vs 4/6.
  Plugin runs cost ~$0.08 vs ~$0.06 without.

  Reproduce:   node benchmarks/run.js --all --runs 6 --compile
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
