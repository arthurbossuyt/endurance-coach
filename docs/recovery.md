# Recovery and load

How the coach reads recovery (Oura, Garmin Training Readiness) and training load. Plan and decisions: [docs/plans/2026-11-17-recovery-source-blend.md](plans/2026-11-17-recovery-source-blend.md). Traps: G-11, G-12 in [_gotchas.md](_gotchas.md).

## What exists

| Rule | Where |
|---|---|
| Oura readiness makes the go/no-go call; bands prime ≥85 · normal 70–84 · caution 60–69 · back off <60 | `skills/endurance-coach/adapters/oura.md:13`, `adapters/garmin.md` § Oura vs Garmin disagreement flag |
| Garmin Training Readiness is read as a load-recovery clock; its two load factors are `recovery_factor_percent` and `training_load_factor_percent` | `adapters/garmin.md` § Interpreting Garmin numbers |
| Intensity gate: after the watch switch, Oura ≥70 with Garmin `score` <70 or `recovery_time_hours` > 24 means easy aerobic only, no quality session; driver, clock, missing fields, Oura or Garmin unavailable | `adapters/garmin.md` § Intensity gate |
| Flag only when Oura and Garmin sit on opposite sides of 70, with both numbers and the lower score's driver | `adapters/garmin.md` § Oura vs Garmin disagreement flag |
| Load metric: Strava `relative_effort` until profile.yaml `load_switch.switch_date`, then Garmin acute/chronic load | `adapters/garmin.md` § Garmin load switch criteria; schema `schemas/profile.schema.json` (`load_switch`, optional) |
| Summaries the model reads first | `SKILL.md` Recovery and Workflow bullets; `references/athlete-data.md` default workflow and § Failure handling (**Garmin unavailable**) |

## Extending

- A change to any of these rules touches all four rule files (G-12). Grep the changed term in `SKILL.md`, `references/athlete-data.md`, `adapters/garmin.md` and `adapters/oura.md`.
- Then run the gates again, also after review fixes: `scripts/parity rules --old origin/main --new HEAD --manifest <manifest>` (manifest under `~/.endurance-coach/parity/`, never in the repo), and the cold replay: one fresh subagent per scenario that gets only the rule files plus that day's Oura and Garmin numbers, results in the parity folder. A replay of older rule text proves nothing about new text.
- A new one-off source or metric switch follows the `watch_switch` / `load_switch` pattern: a dated profile key, proposed by the coach, written only after the athlete's yes, never inferred from the active plan (a new plan must not switch it back).

## Decisions to respect

- Oura decides train / don't train; Garmin never makes the go/no-go call, it only gates intensity.
- No gate before the watch switch: readiness from a device worn only at rest does not see training load.
- The load metric does not change before the active plan's race; zones are re-calibrated after that race too.
- Disagreement days are not stored; both APIs return history.
