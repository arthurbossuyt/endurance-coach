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
- **Training Readiness** is the second opinion on recovery. Map its `score` to the same bands as Oura (below) to compare.
- **Garmin load and training status** come from the rest-only device (profile.yaml `devices.list`, `counts_as_training: false`) until the athlete owns a watch (`owned: true`), so don't base decisions on them yet.
- Garmin `training_load` and Strava `relative_effort` are different scales. Never add or compare them.

### Source of truth by phase

| Item | Before switch date | After switch date |
|---|---|---|
| Activities | Strava | Garmin (device-started activities only). Strava covers only history before the switch date |
| Recovery go/no-go | Oura | Oura |
| Recovery second opinion | Garmin Training Readiness, plus Body Battery, HRV status, sleep as secondary signals | same |
| Load | Strava `relative_effort` | Strava `relative_effort` until the Garmin load criteria below are met |
| Zones | profile.yaml `zones` (unchanged through the active plan's race, plan.yaml `race.race_date`) | same, until post-race update |

### Oura vs Garmin disagreement flag

- Convert both scores to Oura bands: **prime ≥85 · normal 70–84 · caution 60–69 · back off <60**. (Oura's "<70 caution" and "<60 back off" overlap, so 60–69 is caution.)
- If the two land in **different bands**, the go/no-go **follows Oura** and the answer **flags the disagreement and shows both numbers** (for example "Oura 82 normal, Garmin readiness 58 back off").
- Same band, or one source unavailable: no flag.
- Disagreement days are logged in the answer only. The follow-up ticket re-decides which source leads.

### Watch switch rule

Strava stays the activity source until the Garmin watch has recorded **one run that shows up in the Garmin MCP with HR and pace and is mirrored to Strava**. When the athlete confirms that, say the date you would record and, **after a yes**, write it to profile.yaml `watch_switch.switch_date` and set `watch_switch.source: learned` and `watch_switch.date` to today. In the same yes, also set the Garmin watch entry in profile.yaml `devices.list` to `owned: true` and `garmin_connected: true`. Never write it silently. From then on Garmin is primary for activities and Strava is used only for older history.

**Switch date:** read profile.yaml `watch_switch.switch_date`. Empty (`null`) means the switch has not happened yet.

### What counts as training

- The coach counts only activities the athlete **started on a recording device**: the devices with `counts_as_training: true` in profile.yaml `devices.list` (watch runs, bike-computer rides). Count them for sessions and load.
- **Skip auto-detected activities** (devices with `counts_as_training: false` are worn at rest, not during workouts). The MCP exposes no per-activity device field, so use `event_type`, `name` and whether HR/pace data look like a deliberately started session. If unsure, ask rather than count.
- Devices in play: profile.yaml `devices.list` (each device's `use`).

### Garmin load switch criteria

- Strava `relative_effort` stays the load metric (see [training-load.md](../references/training-load.md)) until the watch has **4 weeks of recorded data**.
- The switch to Garmin load is decided in the follow-up ticket, not by the coach.
