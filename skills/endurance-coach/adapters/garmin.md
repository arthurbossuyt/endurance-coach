## Garmin: connected MCP

MCP server `garmin` (Taxuspt/garmin_mcp). In the recommended setup it is pinned to a commit with a 19-tool read allowlist, so no write, upload, schedule or delete tools exist; the stock server has them (see the rule below). Tools are `mcp__garmin__<name>`. Dates are `YYYY-MM-DD`. Null fields are dropped from responses, not returned as null, so a missing key means no data.

Use Garmin only when the `garmin` MCP is connected (its `mcp__garmin__*` tools are available). If it is not, skip Garmin silently and do not suggest `garmin-mcp-auth`. Never call a write, upload, schedule or delete tool, even if the server offers one (the stock community server does).

- **Activities:** `get_activities(start, limit)` / `get_activities_by_date` — `activities[]` with `id, name, type, event_type, start_time, distance_meters, duration_seconds, avg_hr_bpm, max_hr_bpm, owner_display_name`. `get_activity(id)` adds `training_effect, anaerobic_training_effect, training_load, body_battery_impact`, cadence/power. `get_activity_splits`, `get_activity_hr_in_timezones` for execution analysis.
- **Devices:** `get_devices`, `get_primary_training_device`, `get_device_last_used`. Which devices are connected now: the entries in profile.yaml `devices.list` with `garmin_connected: true` (no entry with `owned: false` is connected).
- **Sleep:** `get_sleep_summary(date)` (date = wake-up day) — `sleep_score`, `sleep_score_qualifier`, `sleep_hours`, deep/light/REM percent, `avg_overnight_hrv`. `get_sleep_data` for detail.
- **HRV:** `get_hrv_data(date)` — `last_night_avg_hrv_ms`, `weekly_avg_hrv_ms`, `baseline_balanced_low_ms`/`_upper_ms`, `status`, `feedback`.
- **Body Battery:** `get_body_battery(start, end)` gives only a label (`body_battery_level` string) plus events. For numbers use `get_stats(date)`: `body_battery_highest/lowest/current/charged/drained`. Also has `resting_heart_rate_bpm`, `last_7_days_avg_resting_hr`.
- **Stress:** `get_stress_summary(date)`, `get_stats`.
- **Training Readiness:** `get_morning_training_readiness(date)` (object) or `get_training_readiness(date)` (list) — `score`, `level`, `feedback`, plus factor percents (sleep, recovery, HRV, stress history, training load), `recovery_time_hours`, `acute_load`.
- **Training status/load:** `get_training_status(date)` — `training_status`, `acute_load`, `chronic_load`, `load_ratio`, `acwr_status`, `optimal_chronic_load_min/_max`, `vo2_max`. Reference only until the load switch criteria below are met.
- **VO2max / race predictor:** `get_vo2max_trend(start, end)` — `latest_vo2_max`, `change`, `trend[]`. `get_race_predictions` — treat as a trend signal, not a target; it can return the plain text `No race predictions found.` (no data, not an error).

### Interpreting Garmin numbers

- **Sleep score / HRV status / Body Battery** are wellness context, not go/no-go. Read HRV against the user's own baseline band, not absolutes. Body Battery is relative to the day's charge, so compare to recent days.
- **Training Readiness** is mostly a recovery clock for recent watch load, not a reading of the body. Oura reads physiology (HRV, resting HR, temperature) and decides train / don't train. Its two load factors are `recovery_factor_percent` (set by `recovery_time_hours`) and `training_load_factor_percent` (set by `acute_load`). When a load factor is its lowest factor, Garmin is saying "recent load", not "unrecovered body": it gates intensity (see Intensity gate below), not the go/no-go. Map its `score` to the same bands as Oura (below) to compare.
- **Garmin load and training status** come from the rest-only device (profile.yaml `devices.list`, `counts_as_training: false`) until the athlete owns a watch (`owned: true`), so don't base decisions on them yet.
- Garmin `training_load` and Strava `relative_effort` are different scales. Never add or compare them.

### Source of truth by phase

| Item | Before switch date | After switch date |
|---|---|---|
| Activities | Strava | Garmin (device-started activities only). Strava covers only history before the switch date |
| Recovery go/no-go | Oura | Oura |
| Intensity gate | none: Garmin Training Readiness, Body Battery, HRV status, sleep are context only (no watch records load) | the gate (see Intensity gate below) |
| Load | Strava `relative_effort` | Strava `relative_effort` until profile.yaml `load_switch.switch_date`, then Garmin acute/chronic load (see the load switch criteria below) |
| Zones | profile.yaml `zones` (unchanged through the active plan's race, plan.yaml `race.race_date`) | same, until post-race update |

### Oura vs Garmin disagreement flag

- Convert both scores to Oura bands: **prime ≥85 · normal 70–84 · caution 60–69 · back off <60**. (Oura's "<70 caution" and "<60 back off" overlap, so 60–69 is caution.)
- Flag only when the two land on **opposite sides of 70** (one ≥70, the other <70). The go/no-go **follows Oura** and the answer **flags the disagreement, shows both numbers and names the driver of the lower score** (Garmin's lowest factor, or Oura's lowest contributor, see [oura.md](oura.md); if neither is in the reading, say the driver is not known). Example: "Oura <score> <band>, Garmin readiness <score> <band>, driver: <factor>".
- Same side of 70 (for example normal vs prime), or one source unavailable: no flag.
- Oura <70: Oura's caution / back-off call stands; if the Garmin test also fires (see Intensity gate), say so: no quality session.

### Intensity gate

- **When it applies:** profile.yaml `watch_switch.switch_date` is set, Oura readiness is ≥70 and the morning Garmin reading has `score` <70 or `recovery_time_hours` > 24. So after the watch switch every flagged day with Oura on top is a gated day, whatever drives the Garmin score.
- **Then:** the go/no-go follows Oura and easy aerobic work is fine, but recommend no quality session (threshold, MP, intervals, race-pace), even when Oura is prime. Name Garmin's driver (the lowest factor percent: a load factor means recent load, HRV or sleep means the body; on a tie, name both). If `recovery_time_hours` is above 0, say when the clock clears: the reading's timestamp plus its `recovery_time_hours`. If it is 0, say Garmin's recovery clock is clear but its score is still low (name the driver), so the block holds for today only; tomorrow's reading decides again.
- **Missing fields:** null fields are dropped (top of this file), so a reading can lack `score` or `recovery_time_hours`. Run the test that has its field; never treat a missing field as 0. If neither field is there, the gate was not checked: say so.
- **Planned quality session inside the gate:** suggest swapping it for easy running or move it to the first day whose morning reading no longer triggers the gate (at the earliest the day the clock clears); with a multi-day clock the gate is checked again every morning. On a locked plan nothing moves without the athlete's explicit yes (see [notion.md](notion.md) § Locked plan).
- **Oura <70:** the gate does not apply; Oura's caution / back-off call stands.
- **Oura unavailable** (CLI error or no reading today): follow [athlete-data.md](../references/athlete-data.md) § Failure handling (say so, ask how they feel). Garmin alone never makes the go/no-go call, but if the gate's Garmin test fires, recommend no quality session.
- **Garmin unavailable** (the `garmin` MCP is connected but errors, see [athlete-data.md](../references/athlete-data.md) § Failure handling, **Garmin unavailable**): answer Oura-only as before and add one line that the intensity gate was not checked. A Garmin MCP that is not connected stays silent (rule at the top of this file).

### Watch switch rule

Strava stays the activity source until the Garmin watch has recorded **one run that shows up in the Garmin MCP with HR and pace and is mirrored to Strava**. When the athlete confirms that, say the date you would record and, **after a yes**, write it to profile.yaml `watch_switch.switch_date` and set `watch_switch.source: learned` and `watch_switch.date` to today. In the same yes, also set the Garmin watch entry in profile.yaml `devices.list` to `owned: true` and `garmin_connected: true`. Never write it silently. From then on Garmin is primary for activities and Strava is used only for older history.

**Switch date:** read profile.yaml `watch_switch.switch_date`. Empty (`null`) means the switch has not happened yet.

### What counts as training

- The coach counts only activities the athlete **started on a recording device**: the devices with `counts_as_training: true` in profile.yaml `devices.list` (watch runs, bike-computer rides). Count them for sessions and load.
- **Skip auto-detected activities** (devices with `counts_as_training: false` are worn at rest, not during workouts). The MCP exposes no per-activity device field, so use `event_type`, `name` and whether HR/pace data look like a deliberately started session. If unsure, ask rather than count.
- Devices in play: profile.yaml `devices.list` (each device's `use`).

### Garmin load switch criteria

- Strava `relative_effort` stays the load metric (see [training-load.md](../references/training-load.md)) until profile.yaml `load_switch.switch_date` is set. Missing or `null` means not switched.
- The switch happens once: offer it at the first check-in after any race date that is on or after `watch_switch.switch_date` and already past (the active plan's `race.race_date`, its `past_races`, or the race of another plan folder in the athlete home), together with the post-race zone update. Say the date you would record (the day after that race) and, **after a yes**, write it to `load_switch.switch_date` with `load_switch.source: learned` and `load_switch.date` today. Never write it silently, and never without a watch switch date (a rest-only device can't measure training load).
- From that date Garmin acute/chronic load (`get_training_status`: `acute_load`, `chronic_load`, `load_ratio`) is the load metric. A new plan or race does not switch it back.
