## Oura — CLI helper

Shell out to the script at `scripts/oura` in this skill's base directory (wraps Oura v2): run it by its full path, `<skill base directory>/scripts/oura <subcommand>`. If `oura` is on PATH (for example a symlink in `~/.local/bin`), the short form works too. Token: `$OURA_TOKEN_FILE` if set, otherwise `<home>/secrets/oura`, where `<home>` is `$ENDURANCE_COACH_HOME` or `~/.endurance-coach`; nothing else. Dates are `YYYY-MM-DD`; most subcommands default to the last 7 days.

- **`oura readiness [start] [end]`** — the go/no-go signal. Daily `score` (0–100) + `contributors` (each 0–100): `hrv_balance`, `resting_heart_rate`, `recovery_index`, `previous_night`, `sleep_balance`, `body_temperature`, `sleep_regularity`, `activity_balance`, `previous_day_activity`. Plus `temperature_deviation`.
- **`oura sleep [start] [end]`** — daily sleep scores. **`oura sleep-detail`** — durations, stages, latency, efficiency, when sleep quality is the question.
- **`oura activity [start] [end]`** — daily activity/steps/calories (training-day vs rest-day load).
- **`oura hr`** (default last 1d), **`oura stress`**, **`oura spo2`** — for specific follow-ups.
- **`oura raw <path> [query]`** — any endpoint (e.g. `oura raw usercollection/workout`).

### Interpreting Oura readiness

- **≥85** prime — green light for a key/quality session. **70–84** normal — train as planned. **<70** caution — favour easier/aerobic, cut intensity before volume. **<60** back off — recovery/rest or very easy only.
- A **low contributor pinpoints why**: low `hrv_balance` + elevated `resting_heart_rate` → systemic fatigue/under-recovery; low `previous_night`/`sleep_balance` → sleep debt; raised `body_temperature` / `temperature_deviation` (>~0.5 °C) alongside a low score → possible illness or deep fatigue — be conservative and, if symptomatic, defer to the safety/referral rules in SKILL.md.
- Tie it back to load: poor readiness *after* a hard block is expected fatigue (read with `relative_effort` trend + [training-load.md](../references/training-load.md) TSB); poor readiness on a planned rest week is a flag.
