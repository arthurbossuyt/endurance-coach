# Athlete data — Strava + Garmin (training) + Oura (recovery)

This skill can read the user's **real** training and recovery data. Use it to ground advice in what they've actually done instead of asking them to self-report or guessing. Never fabricate a number you could have looked up; if a source is unavailable, say so and fall back to asking.

## Where athlete data lives

The athlete's personal data is not in this skill. It lives in the athlete home: `$ENDURANCE_COACH_HOME` if set, otherwise `~/.endurance-coach/`.

- **`profile.yaml`**: stable facts. Zones (`zones`), devices and the watch switch (`devices`, `watch_switch`), body weight and daily carb anchors (`weight`, `daily_carbs`), pantry and preferences (`pantry`, `preferences`), shoe rotation (`shoe_rotation`), Notion IDs (`notion.workout_schedule`, `notion.training_hub`).
- **The active plan, `plans/<id>/plan.yaml`**: block-specific rules. Race (`race`), ramp windows (`ramp_windows`), dated extras (`dated_extras`), race-dose cap (`race_dose_cap`), weekly rhythm (`weekly_rhythm`), past races (`past_races`), the vault rationale link (`rationale.vault_path`), the Notion pointer (`notion`) and `locked`. If more than one plan folder exists, ask the athlete which one is active.
- Read both before any answer about the athlete's own training. Every `profile.yaml` / `plan.yaml` key named in these references is a path into those files.
- **No profile yet:** if `profile.yaml` does not exist in the athlete home, answer only the generic part of the question, add one line saying personal setup is not available yet, and call no Strava, Garmin or Oura tool or CLI. This applies to a missing file only. A missing key in an existing profile keeps the rule below. This overrides every "always" pull rule in this skill.
- If a file or key is missing, say so and ask the athlete. Never fill in a value from memory.

## When to pull each source

- **Strava — always**, for any question about the user's *own* training (progress, plan, load, "what should I do today", "am I overtraining", "how did this block go", taper, race-readiness). Pull recent activity *before* answering. Skip only for purely generic knowledge questions that don't touch their own training (e.g. "what's the physiology of Zone 2?").
- **Oura — when the question is about today's or this week's sessions** ("what should I do today?", "how should I adjust this week?", "should I do my long run tomorrow?", "how did this week go?"). Pull readiness/sleep so recovery state drives the go/no-go and intensity call. For longer-horizon questions (build a 12-week plan), Oura isn't needed unless the user raises sleep/recovery.

- **Garmin — alongside Oura for the same today/this-week questions**, plus whenever the user names Body Battery, HRV status, training readiness, VO2max, race predictor or "my Garmin data". Before the switch date it is a secondary wellness signal. After it, it is the activity source (see [Source of truth by phase](../adapters/garmin.md#source-of-truth-by-phase)). Only when the `garmin` MCP is connected (see garmin.md).

Default workflow for a "what should I do" question: **activities (Strava before the switch date, Garmin after) → recovery (Oura primary, Garmin Training Readiness second opinion, flag disagreements) → recommendation.**

## Adapters

Each data source has its own adapter file: tools, zones, unit conversions and how to read its numbers. Read the matching one before pulling or reasoning over that source.

- [Strava](../adapters/strava.md): activities, zones, interpreting Strava numbers.
- [Garmin](../adapters/garmin.md): activities, sleep, HRV, Body Battery, Training Readiness, source of truth by phase, the Oura vs Garmin flag, the watch switch rule, what counts as training.
- [Oura](../adapters/oura.md): the `oura` CLI and interpreting readiness.
- [Notion](../adapters/notion.md): the Workout schedule, the locked-plan rule and fuel on session pages.

## Fueling profile

The source of truth for body weight, the product pantry and fueling preferences is profile.yaml (`weight`, `daily_carbs`, `pantry`, `preferences`). Session-level rules live in [nutrition-fueling.md](nutrition-fueling.md); the gut-training rationale lives in the vault (path in plan.yaml `rationale.vault_path`). Link there, don't copy.

### Body weight and daily anchors

- **Body weight:** profile.yaml `weight.value` (`weight.unit`, set on `weight.date`).
- Daily carbs by load: profile.yaml `daily_carbs` in g/kg (`moderate_training` for moderate training, `carb_load` for carb-load). Grams per day = g/kg × body weight, rounded to the nearest 5 g. Recompute if the weight changes.

### Pantry

Name a product in a fuel recommendation only if it is listed in profile.yaml `pantry.products`. Otherwise write generic grams of carbs.

- Each product carries `carbs_per_serving`, `verified` and `notes`. Follow each product's notes.
- A product with `verified: false` is named without counting its grams (check the label).

### Preferences

- profile.yaml `preferences.items` (each item: `text`, `source`, `date`). Apply every item's `text` to fuel recommendations.

### Updating this profile

- When the athlete mentions a new product, a dislike or a tolerance (good or bad), **offer to save it** and say what you would write.
- **Edit profile.yaml only after a yes.** Add the entry to `pantry.products` (same fields as the existing products) or `preferences.items` (`{ text, source, date }`), with `source: learned` and `date: "YYYY-MM-DD"` (today).
- Once saved, use it in later fuel recommendations. Never write to profile.yaml silently.

## Failure handling

If the Strava MCP or `oura` CLI errors or returns nothing, **say the data was unavailable and ask the user to self-report** (recent sessions, how they feel/slept). Do not invent numbers — this upholds the no-fabrication rule in SKILL.md. This data is the user's own; only ever read it for them.

**Garmin unavailable:** the server reports errors as normal text, not as a tool error. Treat any response starting `Error retrieving …` or containing `Garmin login failed. Run 'garmin-mcp-auth'…` as unavailable, never as data. Then:

- Say Garmin is unavailable and tell the user to re-run `garmin-mcp-auth` (tokens last about 6 months), then restart the session.
- Answer from Strava + Oura. Do not invent Garmin numbers.
- Plain-text non-JSON replies such as `No race predictions found.` mean no data for that tool, not an error and not a value.
- If Strava or Oura is also down, fall back to asking the user to self-report.
