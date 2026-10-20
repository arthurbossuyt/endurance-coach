# Coach parity brief

Paste everything below the line into a general-purpose agent in an **interactive Claude desktop session** (Notion, Strava and Oura must be reachable, so not headless `claude -p`, see G-02). It records one data snapshot, answers the 5 standard questions twice from that snapshot (once per rule tree), and runs `scripts/parity gate`. It never writes to Notion.

Placeholders used below: `<repo>` is the endurance-coach checkout holding this file. `<home>` is `$ENDURANCE_COACH_HOME` if set, otherwise `~/.endurance-coach`. `<run date>` is today's local date as `YYYY-MM-DD`. `<run dir>` is `<home>/parity/<run date>/`.

---

You are running the endurance-coach parity check. Two copies of the coach's rule text exist:

- **OLD** = `~/.claude/skills/endurance-coach/` (the live skill)
- **NEW** = `<repo>/skills/endurance-coach/` (the plugin)

Your job: snapshot the athlete's data once, answer 5 fixed questions once by following only the OLD files and once by following only the NEW files, write both answer sets in a fixed format, and run the gate. You are a recorder, not a coach: copy, don't paraphrase.

Hard rules for the whole run:

- **Read-only.** Never call a Notion create, update, move or delete tool, never call a Garmin write tool, never edit `profile.yaml`, any `plan.yaml`, or any file under either rule tree. The only files you write are `fixture.md`, `old.md`, `new.md` (and `result.md`, which the gate writes) in `<run dir>`.
- **Athlete data stays in `<home>`.** Never copy a value from the fixture, `profile.yaml` or `plan.yaml` into `<repo>`, a commit or a commit message.
- Don't do anything beyond these three steps (no fuel rebuild of other pages, no switch, no `mv`).

## Step 1: snapshot (live tools allowed only here)

Create `<run dir>` and write `<run dir>/fixture.md`. Read `profile.yaml` and the active `plans/<id>/plan.yaml` in `<home>` first (if more than one plan folder exists, ask Arthur once which is active). Record the following, copying every string character for character as the tool returned it (keep `′`, `–`, `≤`, `\~`, spacing):

1. **Header:** `<run date>`, the local time, the active plan id, and the date range below.
2. **Range:** from the Monday of the current week (`<run date>` itself if it is a Monday) to the **next run day**: the first date after `<run date>` with a Workout schedule row that includes running.
3. **Notion Workout schedule rows** in the range: query the data source at profile.yaml `notion.workout_schedule.data_source_url` with the range as start and end, then `notion-fetch` each page. Per row, in date order:
   - `date`, `url`, `What?` (the title), `Sport`, `Shoe` (or `empty`), `Checkbox`
   - the `**📋 Target:**` line as fetched (or `no target line`)
   - every fuel line in page order, current and legacy labels (`🍞 Before`, `⛽ During`, `🥤 After`, `📝 Fuel log`, `🍞 Breakfast drill`, `🍞 Breakfast`, `⛽ Fuel`, `⛽ Gut rep`, `📝 Log after`), whole line from the opening `**`, plus any bullets under the Fuel log line (or `no fuel lines`)
4. **Strava week:** `list_activities` from the range's Monday `00:00:00` to `<run date>` `23:59:59`. Per activity: id, name, `sport_type`, `start_local`, distance (m), moving time (s), `relative_effort`.
5. **Oura:** readiness and sleep for the range's Monday to `<run date>`, via the `oura` CLI as NEW's `adapters/oura.md` says (`<repo>/skills/endurance-coach/scripts/oura readiness <monday> <run date>` and `... sleep <monday> <run date>`). Per day: readiness score and contributors, sleep score. If the CLI fails, write `unavailable` and the error message.
6. **Garmin:** only if `mcp__garmin__*` tools are available: for `<run date>`, `get_morning_training_readiness`, `get_sleep_summary`, `get_stats` (body battery fields, resting HR), and `get_activities_by_date` for the range. Otherwise write `Garmin: unavailable`.

From here on, **no live tool calls at all**: no Notion, Strava, Oura or Garmin. The fixture is the only source of athlete activity and schedule data. The only other files you may read are `profile.yaml`, the active `plan.yaml` (both are hash-stamped by the gate) and the rule files of the pass you are on.

## Step 2: two answer passes

Do the **OLD pass** completely and write `old.md`, then do the **NEW pass** from scratch and write `new.md`. In each pass:

- Start at that tree's `SKILL.md` and read the files under that tree that it, or the files it links, point you to. **Never open a file from the other tree during a pass**, and don't look at `old.md` while doing the NEW pass. If the tree's text differs from what you remember of the other tree, follow the tree you are on, even on details like `~`, labels, gram format or date format.
- Use only the fixture, `profile.yaml` and the active `plan.yaml`. If a rule says to pull live data, use the fixture's copy instead; if the fixture lacks it, write `none` for the affected field, never a guess.
- Ignore free coaching prose: only the 7 fields below are recorded.

### The 5 questions

Ask each one as Arthur would type it, word for word:

| Block | Question | Subject row(s) in the fixture |
|---|---|---|
| `## Q1` | What should I do today? | the row(s) dated `<run date>` |
| `## Q2` | How did this week go? | every row from the range's Monday to `<run date>` |
| `## Q3` | What should I eat before my run? | the next run: the first row dated on or after `<run date>` that includes running and has no running activity on its date in the fixture |
| `## Q4` | How did my last run go? (post-session check-in) | the last run: the latest row dated on or before `<run date>` that includes running and has a running activity on its date in the fixture |
| `## Q5` | Which shoe should I wear for my run? | the next run, as in Q3 |

A row "includes running" when its `Sport` or `What?` says so. For Q4, the athlete's check-in reply is fixed, use it exactly: "Breakfast was a normal meal 2 h before, I took water only, stomach 1/10." Do not invent anything beyond it.

### The 7 fields

| Key | Value |
|---|---|
| `session` | The row's `What?` title, copied from the fixture. |
| `intensity` | The text after `**📋 Target:**` on the row, copied from the fixture; `none` if the row has no Target line. |
| `fuel.before` | The `**🍞 Before:**` line this tree's rules build for the row, whole line from the opening `**`, as it would be written to the page. |
| `fuel.during` | The `**⛽ During:**` line, built the same way. |
| `fuel.after` | The `**🥤 After:**` line if the tree's rules give the row an After line, else `none`. |
| `fuel.log` | Q4: the Fuel log line the rules would write for the fixed check-in reply (the label line, or the bullet if the rules put it under an existing entry). Every other question: the Fuel log line the rules build for the row (the placeholder for a row that includes running), else `none`. |
| `shoe` | The row's `Shoe` value from the fixture; if it is `empty` on a row that includes running, the shoe the tree's shoe rotation rules assign, written as the `Shoe` option; `none` for a row without running. |

Building the fuel lines: pick the matrix row, ramp window and dated extras for the row's date exactly as the tree says, never copy the page's current fuel lines. Fill every `<…>` from `profile.yaml` / `plan.yaml` and round grams the way the tree says (e.g. to the nearest 5 g). Name a product only as the tree's pantry rules allow.

Value rules (the gate compares values literally, whitespace-trimmed only):

- One line per value, no line breaks, no surrounding quotes or backticks, no comment after it.
- Copy fixture strings character for character.
- `none` (lowercase) when a field doesn't apply or no subject row exists.
- A subject with several rows (Q2, or two rows on one date): the per-row values joined with ` | ` in date order, then fixture order. Keep a `none` in the position of a row the field doesn't apply to.

## Step 3: write the files and run the gate

Write `<run dir>/old.md` (OLD pass) and `<run dir>/new.md` (NEW pass) in exactly this format: five blocks, each heading exactly `## Q<n>` with nothing after it, each holding the 7 keys once in this order as `- <key>: <value>` lines. Put nothing else in a block (no other `- word:` lines); a title line above `## Q1` is fine.

```
# Parity answers · <OLD|NEW> · <run date>

## Q1
- session: <What? title>
- intensity: <Target text>
- fuel.before: <🍞 Before line>
- fuel.during: <⛽ During line>
- fuel.after: <🥤 After line or none>
- fuel.log: <📝 Fuel log line or none>
- shoe: <Shoe option or none>

## Q2
- session: <title> | <title> | <title>
- intensity: <Target text> | <Target text> | none
- fuel.before: <line> | <line> | <line>
- fuel.during: <line> | <line> | <line>
- fuel.after: none | <line> | none
- fuel.log: <line> | <line> | none
- shoe: <Shoe option> | <Shoe option> | none

## Q3
(same 7 keys)

## Q4
(same 7 keys)

## Q5
(same 7 keys)
```

Once both files are written, never edit either one to make the gate pass. Then run, from `<repo>`:

```
scripts/parity gate --old ~/.claude/skills/endurance-coach --new skills/endurance-coach --manifest <home>/parity/switch-manifest.yaml --dir <run dir>
```

Report to Arthur: the `gate:` line, every `UNMAPPED`, `UNUSED` and `MISMATCH` row as printed (they name file:line or `Q<n> <key>`, never values), and the path of `result.md`. Then **stop**: no Notion write, no fixes, no switch. A PASS goes stale after any edit to either tree, `profile.yaml` or the active `plan.yaml`, and after today; `scripts/parity verify --dir <run dir>` checks that before the switch.
