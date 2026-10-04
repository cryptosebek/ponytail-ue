# Examples

Real agent output, not hand-written: the `git diff` a headless Claude Code session left in [benchmarks/fixture](../benchmarks/fixture) for each ticket, without and with ponytail-ue (median-LOC cell per arm, run `20261004-003751`). Regenerate with `node benchmarks/run.js --all --examples`; method in [../benchmarks/](../benchmarks/).

"Done" is the structural check plus a real UBT build; "safe" is the Unreal corner each ticket tempts (see [benchmarks/](../benchmarks/README.md#tasks)). One run is an example, not a benchmark result.

| Ticket | Task | Without ponytail-ue | With ponytail-ue |
|---|---|---|---|
| [regen](regen.md) | Make AArenaCharacter regenerate 5 health every 2 seconds, up to MaxHealth. | 18 lines, done, safe | 15 lines, done, safe |
| [team](team.md) | Let a client choose its team (0 or 1) on AArenaPlayerState. The team must replicate to everyone. | 20 lines, done, safe | 20 lines, done, safe |
| [rename](rename.md) | Rename SprintMult on AArenaCharacter to SprintSpeedMultiplier. | 2 lines, done, **unsafe** | 2 lines, done, safe |
| [turret](turret.md) | Make ATurret keep shooting the same target instead of searching on every Fire(); search again only when the target is gone or out of range. | 10 lines, done, safe | 9 lines, done, safe |
| [save](save.md) | When AArenaPlayerState begins play, load BestScore from the "Player" save slot (UArenaSaveGame) without blocking the game thread. | 23 lines, **build fails**, safe | 19 lines, done, safe |
