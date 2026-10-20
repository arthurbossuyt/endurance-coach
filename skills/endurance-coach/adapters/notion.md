# Notion workout schedule — where the plan lives + how to change it

The user's training plan (per-day planned sessions) is stored in **Notion**, not the vault. Notion is the source of truth for anything dated/status-based and viewed on mobile. When the user asks to **adjust / add / move / review their training schedule**, this is the store to read and write. Strava (in [strava.md](strava.md)) is what they *actually did*; this Notion DB is what's *planned*.

All IDs, the shoe rotation and the plan's dates live in the athlete home (`$ENDURANCE_COACH_HOME` or `~/.endurance-coach/`): `profile.yaml` and the active plan's `plans/<id>/plan.yaml`. See [athlete-data.md](../references/athlete-data.md) § Where athlete data lives.

IDs verified on profile.yaml `notion.date` (notes in `notion.verified_note`) — if IDs 404 or the schema differs, re-discover with `notion-search` ("Workout schedule") and re-verify before writing.

## Locked plan

If the active plan has `locked: true` (plan.yaml), **never move, rewrite or add a session without the athlete's explicit yes.** Say what you would change and wait. Changing a session row's properties (`What?`, `Date`, `Sport`, `Shoe`) counts as a rewrite. Fuel lines and Fuel log entries (see Fuel on session pages) are still written without asking, except a substance rewrite of an existing fuel line: show it old → new and write it only after the athlete's yes (see Idempotent write).

## Canonical database — "Workout schedule Database"

Individual dated sessions live here. CRUD this one for schedule changes.

- **Database id / URL:** profile.yaml `notion.workout_schedule.database_id` → `notion.workout_schedule.url`
- **Data source URL (query/create against this):** profile.yaml `notion.workout_schedule.data_source_url`
- **Data source id:** profile.yaml `notion.workout_schedule.data_source_id`
- **Parent:** profile.yaml `notion.workout_schedule.parent` (page name, page id, and the page it sits under)

### Schema

| Property | Type | Notes |
|---|---|---|
| `What?` | title | Session description incl. intensity/protocol, e.g. `Long run 20km (last 4km MP)` |
| `Sport` | multi_select | profile.yaml `notion.workout_schedule.schema[1].notes` |
| `Date` | date | Single date. Set `date:Date:start` (ISO `YYYY-MM-DD`); `date:Date:end` NULL, `date:Date:is_datetime` 0. |
| `Checkbox` | checkbox | done marker: `"__YES__"`/`"__NO__"`. Don't tick planned sessions. |
| `📅 Training Plans` | relation | → the collection in profile.yaml `notion.workout_schedule.schema` (`📅 Training Plans` `target`). Usually leave as-is. |
| `Shoe` | select | Recommended shoe (added profile.yaml `notion.workout_schedule.schema[5].added`). **Set on every row that includes running**; leave empty for rest/gym-only rows. Options = the shoes in profile.yaml `shoe_rotation.by_session_type`. |

### Shoe rotation

Every new or rewritten run session gets a `Shoe`. Assign by session type from profile.yaml `shoe_rotation.by_session_type` (each entry: `session_type` → `shoe`; write the shoe name as the `Shoe` option).

Follow profile.yaml `shoe_rotation.race_shoe_mileage_rule` (keep race-shoe mileage low) and never debut a shoe on race day.

### Read upcoming

```sql
SELECT url, "What?", "Sport", "date:Date:start", "Checkbox"
FROM "<profile.yaml notion.workout_schedule.data_source_url>"
WHERE "date:Date:start" >= '<today, YYYY-MM-DD>'
ORDER BY "date:Date:start" ASC
```

- **Add:** `notion-create-pages` into data source profile.yaml `notion.workout_schedule.data_source_id`.
- **Move/rewrite:** `notion-update-page` on the session's page URL — update in place, don't duplicate.
- Locked plan (see above): Add and Move/rewrite need the athlete's explicit yes first.

## Fuel on session pages

Every session row gets fuel text in its page body, rest and gym days included. It is plain text in the body, not a Notion property. What to recommend comes from [nutrition-fueling.md](../references/nutrition-fueling.md) § Session fueling matrix; body weight and products come from profile.yaml `weight` and `pantry` (rules in [athlete-data.md](../references/athlete-data.md) § Fueling profile; pantry products only, otherwise generic g carbs). This section covers only the line format, the write pattern and the active plan's date windows.

### Format

Session bodies are bold labelled lines, one per line (`**🎯 Goal:**`, `**📋 Target:**`, `**⌚ Garmin steps:**`, `**🧘 GOWOD:**`). Fuel uses four labels, always in this order:

| Label | On which sessions | Content |
|---|---|---|
| `**🍞 Before:**` | every session | The matrix "Before" for the row, plus the breakfast step from the ramp window for long and race-specific runs. Rest days: the daily g/kg note. |
| `**⛽ During:**` | every session | The matrix "During": g/h, gel timing, water. `Water. No carbs.` where the matrix says so. |
| `**🥤 After:**` | only rows marked After: yes | Carbs plus protein within 1 h. |
| `**📝 Fuel log:**` | every session that includes a run | Placeholder until the athlete reports back (see Fuel log below). |

- One line per label. Short and concrete: minutes, grams, ml.
- Name a product only if it is in the pantry, with its grams (`<pantry product> (<its pantry.products[].carbs_per_serving>)`). Products marked unverified are named without counting their grams.
- **Never write `~` in page text.** Notion stores it escaped as `\~`, so the fetched line no longer matches what you wrote and a later `old_str` breaks. Write `<grams>` or `about <grams>`, not `~<grams>`. If a fetched line already contains `\~`, copy it into `old_str` exactly as fetched, backslash included.
- Every gel mention carries "with 150–200 ml water".

Legacy fuel labels are migrated in place:

| Legacy label | Becomes |
|---|---|
| `**🍞 Breakfast drill:**` | `**🍞 Before:**` |
| `**🍞 Breakfast:**` | `**🍞 Before:**` |
| `**⛽ Fuel:**` | `**⛽ During:**` |
| `**⛽ Gut rep:**` | `**⛽ During:**` |
| `**📝 Log after:**` | `**📝 Fuel log:**` |

A **fuel line** is a line that starts with one of the nine labels above. Everything else (Goal, Target, Garmin steps, GOWOD, free text) is not a fuel line and never appears in an `old_str`.

### Idempotent write (one page)

`notion-update-page` `update_content` needs each `old_str` to match the page exactly and only once, so the whole line is the key.

1. `notion-fetch` the page. Split `<content>` into lines and collect the fuel lines (current and legacy labels) in page order.
2. Build the target lines for this session: Before, During, After (if the row says so), Fuel log (if it includes a run).
   Lines are compared by substance, never by wording. The **substance fields** of a fuel line are: grams or g/kg, g/h, gel count and gel timing, product, water amount, and timing window (`2–3 h before`); `No carbs` counts as 0 g. Everything else on the line is a **context clause** (a remark on the session's length, a reminder to note the stomach, a hand-written note). A fetched line has the **same substance** as its target line when every substance field holds the same value on both (same numbers and units, same product, same timing), whatever the wording, order or punctuation. A field that differs, or that is on one line and not the other, is a **substance conflict**.
3. Pick the call:
   - **No fuel lines, including an empty body:** one `insert_content` (position `end`) with the target lines joined by `\n`.
   - **Otherwise:** one `update_content` with one `content_updates` entry per existing fuel line:
     - `old_str` = the whole line exactly as fetched, from the opening `**` to the end of the line, no trailing newline. Copy it character for character (`′`, `–`, `≤`, spacing).
     - `new_str` = the line for its label (legacy labels mapped as above):
       - Same substance: the line exactly as fetched, whatever its wording.
       - Substance conflict: the fetched line with only the conflicting fields changed to the target values. Every other clause is carried over word for word. A context clause that contradicts a new value (it states, explains or depends on the old one) is dropped and named in the report as dropped; never drop a clause silently. This rewrite waits for the athlete's yes (see Safety).
     - A target label with no line on the page rides along on a neighbour: append it (`\n` + line) to the `new_str` of the closest earlier fuel label in the canonical order; if there is none, prepend it (line + `\n`) to the closest later one. The block stays together and in order, in a single call.
     - Two lines that map to the same label (e.g. `⛽ Fuel` and `⛽ Gut rep`): the first becomes the target line, the others are removed (`old_str` = `\n` + line, `new_str` = empty).
     - An entry whose `new_str` equals its `old_str` (same substance, current label, nothing riding along): drop that entry. Nothing left means no call; count the page as unchanged.
4. Never use `replace_content` for fuel (it rewrites the whole body, Goal and GOWOD included) and never `replace_all_matches`.

Safety:
- Re-running gives the same page: after the first write every label is current, so each entry is a same-label replace or nothing. A page never holds two copies of a label.
- The same label twice with identical text (an old duplicate) cannot be matched uniquely: skip the page and report it, don't guess.
- A filled `📝 Fuel log` (anything other than the placeholder) is the athlete's data. Never overwrite it or its bullets; leave it out of the update.
- A legacy `📝 Log after` is a prompt, not data: replace it with the placeholder.
- A substance rewrite of an existing fuel line needs the athlete's yes: show that line old → new and, until they agree, write it as fetched (a legacy label still migrated). The page's other entries go in the same call. Fuel on a page with no fuel lines and legacy label migration stay automatic.
- If `update_content` fails on a match, re-fetch, rebuild the entries and retry once. Still failing: report the page and move on.

### Fuel log

- Placeholder, written with the plan: `**📝 Fuel log:** to fill after the session: date · breakfast … · took … · stomach x/10 · note`
- After the session (feedback loop in SKILL.md), replace the placeholder line with the entry, e.g. `**📝 Fuel log:** <session date> · breakfast bagel + honey 2 h before · took 2 gels (30′, 60′) + 400 ml water · stomach 2/10 · note`. `old_str` = the placeholder line.
- Any later entry for the same page goes in a bullet under that line, one bullet per entry: `old_str` = the last line of the log (the label line or its last bullet), `new_str` = that line + `\n- <date> · …`.
- Write only what the athlete reported. Leave out fields the athlete didn't mention rather than filling them in.

### Ramp windows (active plan)

Read plan.yaml `ramp_windows` (overall span in `ramp_windows.period`). Applied as `ramp_windows.applies_to` says: on top of the matrix rows for long runs, MP sessions, the weekly gut rep and race week. Pick the window by the session date (`windows[].from` / `to`). The why lives in the vault at plan.yaml `rationale.vault_path` § Gut plan (link, don't copy). Gel size: `ramp_windows.gel`.

- Each window's `long_run_gels` goes in `⛽ During`; its `breakfast` goes in `🍞 Before`.
- **Scope:** a window's `long_run_gels` applies to long runs only (and to MP sessions as the matrix MP row says: "following the gel interval for the date"), and its `breakfast` to long and race-specific runs only. Every other session type (easy runs, the gut-rep easy run, threshold, gym, rest) keeps its matrix row plus matching dated extras and never takes a window's gels or breakfast.
- **No window for the date:** this only selects the window for those session types. If a date inside `ramp_windows.period` falls between windows, use the most recent earlier window, including any condition it carries (for example "only if the stomach stayed quiet"). Dates outside `period` get no ramp: use the matrix row alone.

Dated extras:
- Apply every item in plan.yaml `dated_extras.items` whose `weekday`, `date` or `from`–`to` matches the session, as its `text` says. If the item has `session_type`, the session must also be of that type. `<…>` placeholders in an item's text are filled from profile.yaml the same way (grams rounded to the nearest 5 g).
- If the vault plan has another dated gut item for that day (dinner or low-FODMAP trial, sweat test), add a short clause to `🍞 Before`; the details stay in the vault.

## Training Hub (dashboard, view-only)

Page and embedded databases ("This Week's Schedule", "Active Training Plan"): profile.yaml `notion.training_hub` (`url`, `this_weeks_schedule_id`, `active_training_plan_id`). Per-day sessions the coach edits live in the Workout schedule Database above — don't write to the Hub DBs (not verified for CRUD).

## Current goal race (active plan)

- **Race:** plan.yaml `race` (`name`, `race_date`, `goal`). Goal pace is `race.goal_pace`; while it is empty, it is set after the sessions in `race.goal_pace_set_after`.
- **Sessions:** linked to the plan's row in 📅 Training Plans (plan.yaml `notion.training_plans_row`: `id`, `name`; filter in `notion.sessions_filter`). The row's status and the session count and dates are Notion state: read them from Notion.
- **Rationale:** vault path in plan.yaml `rationale.vault_path`.
- **Done:** plan.yaml `past_races`.

Weekly rhythm: plan.yaml `weekly_rhythm.days` (updated on `weekly_rhythm.date`). GOWOD (ACTIVATE / RECOVER / DAILY FLOW / Mobility Test) is written into each session row. The `Sport` multi-select has no "Mobility" option and page writes cannot create one, so GOWOD-only rest days carry no Sport tag; adding the option needs a data-source schema change.
