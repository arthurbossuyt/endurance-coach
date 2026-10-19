## Strava — connected MCP

Tools are `mcp__…__<name>`. All distances in **metres**, times in **seconds**, speeds in **m/s** (athlete's `measurement_preference` is Metric).

- **`list_activities`** — the workhorse. Recent sessions with id, name, `sport_type`, `start_local`, and a summary (distance, moving/elapsed time, elevation_gain, avg/max_speed, `relative_effort`, total_calories, PR/achievement counts). Use `range_start`/`range_end` (ISO local, e.g. `2026-06-08T00:00:00`) to scope "this week"; `first` for a count. Default order is newest-first.
- **`get_activity_performance(activity_id)`** — one session's avg/max HR, avg watts, avg cadence, calories, perceived exertion, plus PRs, segment efforts, best efforts, and laps. Use to analyse a specific workout (e.g. were the intervals actually at the prescribed intensity).
- **`get_activity_streams(activity_id, streams=[…])`** — time-series for deep analysis: `heart_rate`, `watts`, `velocity_smooth`, `cadence`, `grade_smooth`, `altitude`, `distance`, `time`, etc. Use for HR/pace decoupling on a long run, or interval execution. Heavy payload — fetch only when a summary won't answer the question, and pass a `resolution` if you don't need full granularity.
- **`get_athlete_zones`** — HR / power / run-pace zones + FTP. Pull this to interpret intensities correctly instead of guessing zones.
- **`get_athlete_profile`** — name, weight, units, current focus.
- **`get_training_plan`** — Strava's own running plan, if one exists.
- `get_gear`, `get_club_info` — rarely needed for coaching.

### The athlete's current zones (profile.yaml `zones`; re-pull if stale, see `zones.stale_note`)

- **HR zones**: `zones.hr` (method in `zones.hr.method`, bpm).
- **Run pace zones**: `zones.run_pace` (m/s, method and reference effort in `zones.run_pace.method` / `.reference`).
- **Cycling FTP**: `zones.ftp.value` (`zones.ftp.note` says where it came from). If `zones.ftp.stale_strava_ftp` is set, Strava's `get_athlete_zones` still returns that stale estimated FTP and power zones derived from it until the athlete updates FTP in their Strava settings; until then, use `zones.ftp.value` and the recalculated zones below instead of the tool's power zone output.
- **Recalculated 7-zone power model**: `zones.power` (same % thresholds as Strava's model, listed in `zones.power.thresholds_pct`), W.

### Interpreting Strava numbers

- **Pace**: min/km = `1000 / avg_speed / 60`. E.g. 2.996 m/s → 5:34/km. Always convert m/s to pace for the user.
- **`relative_effort`** is Strava's HR-based session-load proxy — directionally like a per-session TSS. Sum it across a week to read volume/load trend; cross-reference [training-load.md](../references/training-load.md) (CTL/ATL/TSB, ramp rate) for the framework. It is *not* power-based TSS — treat as a proxy, not gospel.
- When `zones.hr.method` is MaxHeartRate, HR zones are **MaxHR-derived**, so Z2 is an approximation — apply the usual ±caveat from [zone2-aerobic.md](../references/zone2-aerobic.md) and prefer lactate/field-test data if the user has it.
