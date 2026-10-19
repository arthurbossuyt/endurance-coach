# Split coach into public repo: engine, athlete profile schema, adapters

**Ticket:** https://app.notion.com/p/3fb609f4daef81b49095e363adcefea2 · **Branch:** `feat/public-plugin-repo-split` · **Created:** 2026-10-17
**Recommended session:** Sonnet 5.5 · medium: the tasks are mostly independent file sets; the risky ones are pinned to Opus per task.

## TL;DR
Make the existing private repo an installable Claude Code plugin with the repo root as the plugin. Split the data-source sections into `adapters/`, port the Oura script, and add v0 JSON Schemas, a fictional example athlete, CI (ajv + gitleaks) and a local leak scan. The public flip, token move, locked-plan check and the switch from the live skill happen post-release with Arthur, gated on the scripted parity check.

## Critical decisions
Settled in exploration. Do not relitigate.
- Repo root is the plugin (`.claude-plugin/plugin.json` + existing `skills/endurance-coach/`), not `plugins/endurance-coach/`. `marketplace.json` lists it with `source: "./"`.
- Blocked by the ticket "Make the coach parity check a repeatable scripted gate"; the switch (Post-release) needs it.
- The in-progress fueling and Garmin tickets are frozen during this build. Any change from them lands in this repo first, then gets copied to `~/.claude/skills/endurance-coach`. Never edit the live copy from this branch.
- **Move rule text verbatim.** The adapter split moves sections, it does not reword rules. Any change in rule wording breaks the literal parity check.
- Oura token comes from `OURA_TOKEN_FILE`, then `<home>/secrets/oura` (`<home>` = `$ENDURANCE_COACH_HOME` or `~/.endurance-coach`), nothing else.
- Schemas live in `schemas/` at the repo root: v0, `schema_version` required, core keys required, `additionalProperties: true`. CI validates `examples/` only. A local npm script validates Arthur's real files and never runs in CI.
- Leak scan is a local one-off script over every commit, using every leaf value of `~/.endurance-coach/profile.yaml` and `plans/*/plan.yaml`. Gitleaks runs in CI for tokens. The repo goes public only when both are clean.
- No profile → generic answers plus one line that personal setup is not available yet. No Strava, Garmin or Oura call.
- No `.mcp.json` in the repo. Garmin is a documented opt-in.
- Switch when parity passes, not date-gated. The old skill gets archived for a one-mv rollback. The Valencia plan stays `locked: true`.
- Nothing from `~/.endurance-coach/` is ever committed or copied into examples, tests or docs. Example values are invented.

- (Arthur, 2026-10-17, task 9) Allowlist `profile.zones.hr.method`, `plan.dated_extras.items[1].session_type` and `profile.pantry.products[3].product` (generic vocabulary the rules depend on). Drop the cutoff date from notion.md:72 so it reads "Legacy fuel labels are migrated in place:". Do not allowlist `weight.date` or `daily_carbs.date`.

## Acceptance criteria
- AC-01: Given github.com/arthurbossuyt/endurance-coach, when the leak scan runs over every commit, then no leaf string or number from ~/.endurance-coach/profile.yaml or plans/*/plan.yaml (shoes, pantry products, Notion IDs, zones, weight, races, dates) and no token appears; only then is the repo made public, with an MIT LICENSE.
- AC-02: Given the repo root, when Claude Code runs with --plugin-dir ~/endurance-coach, then the endurance-coach skill loads from .claude-plugin/plugin.json, and .claude-plugin/marketplace.json lists it with source "./".
- AC-03: Given skills/endurance-coach/, when inspected, then SKILL.md and references/ hold generic knowledge only, and adapters/ holds strava.md, garmin.md, oura.md and notion.md split out of athlete-data.md and notion-schedule.md, with every SKILL.md link pointing at the new paths.
- AC-04: Given schemas/ at the repo root, when inspected, then JSON Schemas exist for profile, plan and session log (v0, schema_version required, core keys required, additionalProperties true), and a GitHub Action validates examples/ with ajv on every push and passes.
- AC-05: Given examples/, when read, then a fictional triathlete profile.yaml + plans/<id>/plan.yaml exists and validates.
- AC-06: Given Arthur's real ~/.endurance-coach files, when the local validate script runs, then they validate against the same schemas (never run in CI).
- AC-07: Given no profile.yaml exists, when an athlete asks about their own training, then the coach gives generic answers plus one line saying personal setup is not available yet, and calls no Strava, Garmin or Oura tool.
- AC-08: Given skills/endurance-coach/scripts/oura, when run on macOS and Linux, then it returns readiness data, reading the token only from OURA_TOKEN_FILE or <home>/secrets/oura (no date -v), and ~/.local/bin/oura is a symlink to it.
- AC-09: Given the repo, when inspected, then it ships no .mcp.json, has gitleaks in CI, and the README documents install, Garmin (community MCP, password login, re-auth about every 6 months) as opt-in, and the educational-not-medical disclaimer.
- AC-10: Given Arthur's ~/.endurance-coach with the Valencia plan.yaml (locked: true), when the plugin runs via --plugin-dir, then it adopts the plan from the Notion pointer without copying sessions, never moves, rewrites or adds sessions without an explicit yes, and still writes fuel lines and Fuel log entries.
- AC-11: Given the scripted parity gate, when the old skill and the plugin are compared on the same day (literal rules + the 5 standard questions), then they agree on session, intensity, fuel and shoe; only then is the old skill moved to ~/.claude/skills-archive/ and the plugin installed user-wide.
- AC-12: Given the build is in progress, when the in-progress fueling or Garmin tickets change rules, then the change lands in the repo first and is copied to the live skill, and before parity the plugin is not installed user-wide (no duplicate endurance-coach trigger).

## Tasks
Markers: ⬜ todo · 🔄 doing · ✅ done · ⛔ blocked

No test suite exists in this repo. Verify steps use `claude --plugin-dir`, grep/diff checks and the npm scripts added in task 5.

### 1. Plugin manifests + MIT license · ✅ · [infra] · Sonnet 5.5 / low
**Files:** `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `LICENSE`
**Do:** Add `plugin.json` at the repo root (name `endurance-coach`, version `0.1.0`, description from the SKILL.md frontmatter, author Arthur Bossuyt, MIT). Add `marketplace.json` with one plugin entry, `"source": "./"`. Copy the field shapes from `~/.claude/plugins/marketplaces/visual-explainer-marketplace/`. Add a standard MIT `LICENSE` (2026, Arthur Bossuyt). No `.mcp.json`.
**Verify:** `claude plugin validate ~/endurance-coach` (if the subcommand exists) and `claude --plugin-dir ~/endurance-coach -p "List the skills you have available, names only."` output contains `endurance-coach:endurance-coach`. `claude plugin list` does not show it installed user-wide.
**Satisfies:** AC-02, AC-12 (part)
**Why this model:** config files copied from an existing marketplace.

### 2. Split data-source sections into adapters/ · ✅ · [backend] · Opus 5.5 / high
**Files:** `skills/endurance-coach/references/athlete-data.md`, `skills/endurance-coach/references/notion-schedule.md` → `skills/endurance-coach/adapters/notion.md` (git mv), new `skills/endurance-coach/adapters/{strava,garmin,oura}.md`, `skills/endurance-coach/SKILL.md`, `skills/endurance-coach/references/nutrition-fueling.md`
**Do:** Move `athlete-data.md` § Strava (:23), § Oura (:48) and § Garmin (:64) verbatim into `adapters/strava.md`, `oura.md` and `garmin.md`. `athlete-data.md` keeps § Where athlete data lives, § When to pull each source, § Fueling profile and § Failure handling, plus a short "Adapters" list linking the four files. `git mv` `notion-schedule.md` to `adapters/notion.md`. Keep its `\~` rule. Update every relative link in SKILL.md (:52-54, :68, :77, :121-122), `nutrition-fueling.md:73` and inside the moved files (`../references/...`). In `adapters/oura.md`, replace the `~/oura token.txt` sentence (:50) with the token order from Critical decisions and the script path `scripts/oura` relative to the skill folder. That sentence is the only rule text allowed to change. Keep every other line byte-identical.
**Verify:** A shell check that every non-blank line of `git show main:skills/endurance-coach/references/{athlete-data,notion-schedule}.md` appears in the new files, apart from the Oura token line, the link lines and the new Adapters list (print the misses; they must be exactly those). `grep -rnoE '\]\(([^)#]+)' skills/endurance-coach` → each target file exists. `grep -rn 'oura token.txt' skills/` → empty.
**Satisfies:** AC-03
**Why this model:** a cross-cutting move where any rewording breaks literal parity.

### 3. Portable Oura script · ✅ · [backend] · Sonnet 5.5 / medium
**Files:** `skills/endurance-coach/scripts/oura`
**Do:** Copy `~/.local/bin/oura` into the repo as an executable file. Token: `OURA_TOKEN_FILE`, else `${ENDURANCE_COACH_HOME:-$HOME/.endurance-coach}/secrets/oura`, else die with a message naming both. Remove the `~/oura token.txt` default. Make `days_ago` portable: use BSD `date -v` only when `date -v-1d` succeeds, else GNU `date -d "N days ago"`. Update the help text to match. Change nothing else.
**Verify:** `bash -n` on the script. `OURA_TOKEN_FILE="$HOME/oura token.txt" skills/endurance-coach/scripts/oura readiness` returns JSON with `data`. With no env var and no secrets file, it exits non-zero and names both paths. Linux is checked by the CI job in task 6.
**Satisfies:** AC-08 (script part)
**Why this model:** a small bash edit to an existing script.

### 4. No-profile guard · ✅ · [backend] · Sonnet 5.5 / medium
**Files:** `skills/endurance-coach/SKILL.md`, `skills/endurance-coach/references/athlete-data.md`
**Do:** Add a rule next to "Athlete files first" (SKILL.md:43) and in `athlete-data.md` § Where athlete data lives. If `profile.yaml` doesn't exist in the athlete home, answer the generic part of the question only, add one line saying personal setup isn't available yet, and call no Strava, Garmin or Oura tool or CLI. A missing *key* in an existing profile keeps today's "say so and ask" rule (`athlete-data.md:12`). Additive wording only; existing lines stay as they are.
**Verify:** `ENDURANCE_COACH_HOME=$(mktemp -d) claude --plugin-dir ~/endurance-coach -p "What should I do in training today?" --output-format stream-json --verbose` → the final text has the setup line, and the stream has no `tool_use` named `mcp__*strava*`, `mcp__garmin__*`, or a Bash call to `oura`.
**Satisfies:** AC-07
**Why this model:** a small additive rule that follows an existing one.

### 5. v0 schemas, example triathlete, validate scripts · ✅ · [backend] · Opus 5.5 / high
**Files:** `schemas/profile.schema.json`, `schemas/plan.schema.json`, `schemas/session-log.schema.json`, `examples/triathlete/profile.yaml`, `examples/triathlete/plans/<id>/plan.yaml`, `package.json`
**Do:** Write draft 2020-12 JSON Schemas. Take the profile and plan shapes from the top-level keys of Arthur's real files (profile: zones, devices, watch_switch, weight, daily_carbs, pantry, preferences, shoe_rotation, notion; plan: id, locked, lock, race, notion, rationale, ramp_windows, dated_extras, race_dose_cap, weekly_rhythm, past_races). Read only their *structure*, never copy values. Require `schema_version` plus the keys the skill depends on, with `additionalProperties: true`. Session log v0: `schema_version`, `entries[]` of `{date, session_ref, rpe, feel, fueling, notes}`, each value with optional `source` + `date`. Write a fictional triathlete (invented name, zones, products, shoes, race; `locked: false`). `package.json`: devDeps `ajv-cli` + `ajv-formats`, plus scripts `validate:examples` and `validate:local` (local = `${ENDURANCE_COACH_HOME:-~/.endurance-coach}`, YAML via `js-yaml`).
**Verify:** `npm ci && npm run validate:examples` passes. `npm run validate:local` passes on Arthur's files. `git diff --cached` contains no value from `~/.endurance-coach` (task 7's scan re-checks).
**Satisfies:** AC-04 (schemas), AC-05, AC-06
**Why this model:** a schema contract the later hosted app builds on, and the task works next to personal data.

### 6. CI workflows + issue template · ✅ · [infra] · Sonnet 5.5 / medium · parallel-safe
**Files:** `.github/workflows/validate.yml`, `.github/workflows/gitleaks.yml`, `.github/ISSUE_TEMPLATE/feedback.yml`
**Do:** `validate.yml` runs on every push and PR, on ubuntu-latest: `npm ci`, `npm run validate:examples`, `bash -n skills/endurance-coach/scripts/oura`, and a GNU date check that `OURA_TOKEN_FILE=/dev/null scripts/oura help` exits 0 and the script never calls `date -v` on Linux. `gitleaks.yml` uses `gitleaks/gitleaks-action` pinned to a SHA, with full history (`fetch-depth: 0`). Issue template: a short feedback form (what you asked, what the coach said, what you expected, sport). Pin all actions to SHAs.
**Verify:** `actionlint` (install via brew if missing) is clean on both workflows. The green run on GitHub is confirmed at /release.
**Satisfies:** AC-04 (CI), AC-08 (Linux), AC-09 (gitleaks)
**Why this model:** standard workflows, with nothing novel to design.

### 7. Local leak scan script · ✅ · [infra] · Opus 5.5 / high
**Files:** `scripts/leak-scan`, `scripts/leak-scan.allow`
**Do:** Bash or node script, local only (never in CI). Read every leaf value from `<home>/profile.yaml` and `<home>/plans/*/plan.yaml`: strings of 4+ chars, numbers of 3+ digits, all UUID/hex IDs, and the Strava athlete id if present. Search every blob in `git rev-list --all` for each value, case-insensitive. Print matches as `commit:path:line` plus the YAML key path, never the value itself. `leak-scan.allow` lists YAML key paths to skip (generic words such as session types); it must hold key paths only, never values. Exit non-zero on any hit.
**Verify:** On this branch after tasks 1-6, `scripts/leak-scan` exits 0. On a throwaway branch, commit a file holding one real profile value: scan exits 1 and names its key path. Then delete that branch with `git branch -D` and run `git reflog expire --expire=now --all && git gc --prune=now`. Never push the throwaway branch.
**Satisfies:** AC-01 (scan)
**Why this model:** a security gate whose false negatives make a public leak.

### 8. README · ✅ · [infra] · Sonnet 5.5 / medium · parallel-safe
**Files:** `README.md`
**Do:** Cover: what it is, install (`/plugin marketplace add arthurbossuyt/endurance-coach`, or `claude --plugin-dir` for local), the athlete home (`ENDURANCE_COACH_HOME`, `profile.yaml`, `plans/<id>/plan.yaml`, `secrets/`), the adapters (Strava via the official connector, required for automatic data; Garmin opt-in via the community MCP with password login and re-auth about every 6 months, no `.mcp.json` shipped; Oura via `scripts/oura` + token), schemas + `npm run validate:examples`, the example athlete, the no-profile behaviour, adults only, an educational-not-medical disclaimer, and MIT. No personal data, no em-dashes.
**Verify:** manual read, plus `grep -c '—' README.md` → 0.
**Satisfies:** AC-09, AC-02 (docs)
**Why this model:** docs copy.

### 9. Scrub leaked values from skill text · ✅ · [backend] · Opus 5.5 / high
**Files:** `skills/endurance-coach/adapters/notion.md`, plus whichever of `adapters/strava.md`, `references/athlete-data.md`, `references/nutrition-fueling.md` hold a needs-review hit
**Do:** For every key path `scripts/leak-scan` reports in the working tree (task 7 Notes: confirmed + needs-review, everything except the allowlist), replace the literal value in the skill text with a reference to its key path (e.g. "profile.yaml `weight.date`", "plan.yaml `ramp_windows.windows[0].from`"), matching the reference style already used in SKILL.md and athlete-data.md. If a free-text note is copied word for word, replace it with a pointer to its key path. Change only the value, and leave the surrounding rule wording as it is. Keep the Coggan %FTP allowlist entries. Do not touch the live copy at `~/.claude/skills/endurance-coach`.
**Verify:**
- *Literal parity on this change:* a throwaway local script (not committed) takes every line this task changed, fills each inserted key reference with its value from the real `~/.endurance-coach` YAML, and compares the result with the same line at HEAD before the task. Each line must come out byte-identical, or differ only in reference phrasing that the report lists. Print pass/fail per line number only, never values.
- `scripts/leak-scan` reports **no hit in the working tree or index**. The only hits left are in commits before this task, which the Post-release squash removes.
- `npm run validate:examples` still passes.
**Satisfies:** AC-01 (text), AC-03
**Why this model:** personal data sits next to parity-sensitive rule text.

## Post-release
Run with Arthur at /release. These touch his live machine, Notion and the repo's visibility.

1. **Oura token + symlink:** Arthur moves `~/oura token.txt` to `~/.endurance-coach/secrets/oura` (chmod 600). Then `ln -sf ~/endurance-coach/skills/endurance-coach/scripts/oura ~/.local/bin/oura`, and `oura readiness` returns data. Update the Oura memory note. (AC-08)
2. **Squash history:** after merging to main, make one fresh root commit (`git checkout --orphan public main && git commit -m "endurance-coach v0.1.0"`). A force-push to main is **not enough**: PR #1's `refs/pull/1/head` keeps the leaked commits reachable on GitHub, and it would turn public with the repo. So Arthur deletes the private GitHub repo (`gh repo delete arthurbossuyt/endurance-coach`, which can't be undone; the old history stays in the local clone as a backup), re-creates it private, pushes the `public` branch as `main`, and re-points the local `origin`. Then `scripts/leak-scan` must exit 0 over the whole new history. (AC-01)
3. **Go public:** `scripts/leak-scan` exits 0 on `main`, and the gitleaks + validate runs are green. Then `gh repo edit arthurbossuyt/endurance-coach --visibility public --accept-visibility-change-consequences`. (AC-01)
4. **Locked-plan check:** in a `--plugin-dir` session on the real data, ask for tomorrow's session and fuel (it should adopt the plan from the Notion pointer). Ask to move a session (it should ask for an explicit yes first). Ask to fuel next week (fuel lines plus the Fuel log placeholder get written). (AC-10)
5. **Parity + switch:** run the scripted parity gate (blocking ticket), literal rules plus the 5 standard questions, old skill vs plugin on the same day. Expected literal diffs, decided on this branch (map them, don't fail on them): notion.md Sport row (profile pointer), product and `~` examples (`<pantry product>`, `<grams>`), Fuel log example (`<session date>`), the Shoe `added` date pointer, the oura.md token and script lines, the no-profile and Garmin-connected rules in SKILL.md/athlete-data.md/garmin.md. Only on a pass: `mv ~/.claude/skills/endurance-coach ~/.claude/skills-archive/endurance-coach-<date>`, install the plugin user-wide, and check that only one endurance-coach skill triggers. Rollback is one `mv` back. (AC-11, AC-12)

## Review log
<!-- /peer-review appends one table per round -->

### Round 1 · 2026-10-18 · leads: self (/code-review), sonnet, haiku (fable failed: no usage credits)
| # | Lead | Sev | Finding | Verdict | Why / commit |
|---|---|---|---|---|---|
| 1 | self | High | oura.md:3 runs `oura` from PATH, not the plugin script | ✅ | 09e0325 |
| 2 | self | High | scripts/oura: `help` and usage errors need a token | ✅ | 09e0325 |
| 3 | self | Medium | notion.md:110 Fuel log example uses the ramp-window start date | ✅ | 09e0325 |
| 4 | self | Medium | notion.md:68 product example points at pantry.products[0] | ✅ | 09e0325 |
| 5 | self | High | leak-scan skips 2-digit numbers (body weight) | ✅ | 09e0325 (kg/bpm/W needles) |
| 6 | self | Medium | leak-scan ignores untracked files | ✅ | 09e0325 |
| 7 | self | Medium | leak-scan hides INDEX label behind a commit label | ✅ | 09e0325 |
| 8 | self | Medium | leak-scan cat-file parser breaks on a missing object | ✅ | 09e0325 |
| 9 | self | Low | athlete-home loading duplicated in two scripts | ✅ | 09e0325 (scripts/lib/athlete-home.cjs) |
| 10 | self | Low | validate:local default path is shell-specific | ✅ | 09e0325 |
| 11 | haiku | High | notion.md: task 9 swapped generic Notion rules (Date format, Checkbox, Hub write guard, gut-item clause, GOWOD tag) for profile-note pointers | ✅ | 9c1622a: Arthur chose to restore them word for word from main; matching note keys allowlisted with pins; the Sport row stays a pointer |
| 12 | sonnet + haiku | Medium | leak-scan allowlist keyed by array index; a reorder exempts a new value | ✅ | 9c1622a: entries pinned to sha256 of their value |
| 13 | sonnet + haiku | High | leak-scan skips session-log.yaml, secrets/, prose dates, path and ref names | ✅ | 9c1622a |
| 14 | sonnet | Medium | no-profile guard has no precedence over the "always" pull rules | ✅ | 9c1622a: "overrides every always rule" |
| 15 | sonnet | Medium | garmin.md assumes the MCP is connected; the stock server has write tools | ✅ | 9c1622a: only-if-connected + never-write lines |
| 16 | sonnet + haiku | Medium | oura: token in curl argv; no -f, no timeout | ✅ | 9c1622a: header on stdin, --fail-with-body, --max-time 30 |
| 17 | sonnet | Low | .gitignore misses session-log and token files | ✅ | 9c1622a |
| 18 | haiku | Low | plan `id` never checked against its folder | ✅ | 9c1622a |
| 19 | sonnet | Low | oura `hr` window is UTC | ⏭ | inherited; ticket https://app.notion.com/p/3fd609f4daef8183b4f6d962a351b8ea |
| 20 | sonnet | Medium | schemas require every key of Arthur's files (Notion, ramp_windows, past_races…) | ❌ | exploration risk: "v0 only needs to fit Arthur + the example athlete"; a minimal profile is onboarding, child (b) |
| 21 | sonnet | Low | fuel flow assumes Notion; no chat fallback | ❌ | decision: Notion pattern moves unchanged, generalising is child (d) |
| 22 | haiku | Low | binary blobs skipped silently; folded YAML text not matched when wrapped | ❌ | summary prints the binary count; whole-value match is the design |
| 23 | haiku | Low | oura help prints `${ENDURANCE_COACH_HOME:-…}` literally | ❌ | intended: it documents the lookup rule, not one machine's path |
| 24 | haiku | Low | session-log `fueling` object branch accepts any object | ❌ | by design: "free text or a structured object" in v0; the session log is child (e) |

### Round 2 · 2026-10-19 · leads: sonnet, haiku (fable skipped: no usage credits)
| # | Lead | Sev | Finding | Verdict | Why / commit |
|---|---|---|---|---|---|
| 1 | sonnet + haiku | Medium | leak-scan number needle misses float forms (72.50, 180.0) | ✅ | ebd7e60 |
| 2 | sonnet | Medium | Oura token at `~/oura token.txt` never a needle until it moves to secrets/ | ✅ | ebd7e60: $OURA_TOKEN_FILE + legacy path scanned |
| 3 | sonnet | Medium | oura `--fail-with-body` needs curl 7.76+ | ✅ | ebd7e60: falls back to --fail |
| 4 | sonnet + haiku | Medium | dates as ordinals ("14th") or numeric (14/03/2027) not needled | ✅ | ebd7e60 |
| 5 | sonnet | Low | unit needle misses a range's first bound ("58–62 bpm") | ✅ | ebd7e60 |
| 6 | haiku | Medium | 2-digit numbers missed without a unit ("weight 82 today") | ✅ | ebd7e60: key-word context needle; new argument vs round 1 #5 (unit-only) |
| 7 | sonnet + haiku | Medium | Garmin: SKILL.md:47 and garmin.md:3 contradict the round 1 "skip silently" rule | ✅ | ebd7e60: auth advice only when connected but erroring; pinned-setup wording |
| 8 | sonnet | Low | notion.md:27/68/69/110 not verbatim, so the parity gate will diff | ✅ | plan: expected diffs listed in Post-release 5 |
| 9 | haiku | Medium | leaf strings under 4 chars never searched | ❌ | task 7 Do: 4+ chars by design; 3-char leaves are vocabulary (Gel, Run) and would hit everywhere |
| 10 | sonnet + haiku | Low | letter-prefixed numbers ("HR142", "FTP250") missed | ❌ | false positives on SHAs and hex ids in docs; documented in leak-scan |
| 11 | sonnet | Low | Strava MCP server instructions may override the no-profile guard | ❌ | not fixable in skill text; covered by task 4's CLI check, to run with the Strava connector on |
| 12 | haiku | Low | `<grams>` / `<session date>` not marked as fill-ins | ❌ | `<…>` is the skill's fill-in convention (notion.md dated extras rule) |

## Notes
<!-- deviations recorded during execution -->
- Task 1 ⛔ (4ba0464): files done, `claude plugin validate` passes, not installed user-wide. The load check `claude --plugin-dir ... -p` fails with 401 "OAuth access token has expired" (headless CLI auth, not the code). Re-run after re-auth; task 4 Verify needs the same CLI. marketplace.json name `endurance-coach-marketplace`, category `health` added.
- 2026-10-17 (planning): `.gitignore` had unanchored `plans/`, `parity/`, `secrets/`, `profile.yaml`, which also ignored `docs/plans/` and would have silently dropped `examples/triathlete/plans/` and `examples/triathlete/profile.yaml`. Anchored them to the root (`/plans/` etc.) and added `node_modules/`, committed with this plan. Task 5: check `git status` shows the example files before you call the task done.
- Task 2 ✅ (6ab6a7d): link fix landed at nutrition-fueling.md:44, not :73 (:73 still points at athlete-data.md, which stays). Also fixed the plain-text `notion-schedule.md § Locked plan` at SKILL.md:59, and SKILL.md:41/:121 now name the adapters. The Garmin subsections (source-of-truth table, Oura vs Garmin flag, watch switch, load switch) moved to garmin.md. Rule wording unchanged.
- Task 3 ✅ (3d72b30): the GNU `date -d` branch is untested locally and is left to the task 6 Linux CI job.
- Task 4 ✅ (d7bf5fc), static check only: the rule is in SKILL.md and athlete-data.md, the change is purely additive, and the missing-key rule is kept. The subagent sent no report, so the orchestrator checked git itself. **CLI Verify still open**: it gets re-run after Arthur fixes the CLI login.
- Task 5 ✅ (dc194c6): uses `ajv` (2020, strict) + `ajv-formats` + `js-yaml` through `scripts/validate.mjs` instead of `ajv-cli`, because ajv-cli 5 is unmaintained and has 5 audit vulns. Added `examples/triathlete/session-log.yaml` so CI exercises the session-log schema. Example plan id `lakeside-2027`. `devices.list[].counts_as_training` is optional. YAML is loaded with CORE_SCHEMA so dates stay strings. The leak check found 19 generic-string hits (`*.source` labels, Notion DB/property names already in the skill text, a session type, a weekday): task 7's allowlist needs these key paths.
- Task 6 ✅ (312a1bb, merged 16608dc): `scripts/oura help` dies without a token file, because the token check runs before the `help` case. The plan's `OURA_TOKEN_FILE=/dev/null` check could not work, so CI uses a mktemp dummy token. **Finding for /code-review:** `oura help` should work without a token. The Linux date check pulls out `days_ago` and compares it with `date -d`, which also covers task 3's GNU branch. Actions are pinned to SHAs (checkout v7.0.1, setup-node v7.1.0, gitleaks-action v3.0.0). Neither workflow has run on GitHub yet.
- Task 8 ✅ (9da9695, merged 18012fe): full README rewrite, 0 em-dashes. Both worktrees started at 823434a and were reset to b6b6a31 before work began.
- Task 7 ⛔ (3e2a877: script + 55-path allowlist + `.claude/` in .gitignore): the script works (a planted value was caught in a throwaway clone). The real scan exits 1 with 17 key paths. Confirmed personal values in `adapters/notion.md` (inherited from main's c100130 `references/notion-schedule.md`): weight/daily-carbs dates :72, ramp-window dates :110, a schema `added` date :31, a pantry product + carbs per serving :68-69. Needs review (free text copied word for word): training_hub note, dated_extras vault_rule, gowod note, workout_schedule schema notes, a second session_type, one pantry product word, the HR zone method. Power-zone %FTP bounds are allowlisted as textbook Coggan values, pending Arthur's veto. Fixing these needs a text scrub (parity-sensitive) plus a history rewrite of main before going public.
- 2026-10-17: Arthur chose to scrub the leaked values (new task 9), keep the Coggan %FTP allowlist, and squash history before going public (Post-release 2). The squash re-creates the repo, because PR refs would otherwise keep the old commits public.
- Task 9 partial (ffd674c): 11 lines in notion.md scrubbed, parity passes 11/11 (lines between :26 and :137). Three lines gained pointer wording ("Follow plan.yaml `dated_extras.vault_rule`." and similar). The 4 remaining hits went to Arthur: 3 allowlisted, 1 date dropped.
- Task 9 ✅ (9dd47bd): 3 key paths allowlisted, the notion.md:72 date dropped, `weight.date`/`daily_carbs.date` not allowlisted. Leak scan is clean in the working tree and index. The only history hits are c100130, 6ab6a7d, ffd674c and 183ac8b (one plan line where a line number matched a zone value), and the Post-release squash removes them all.
- Task 1 ✅ (2026-10-18): the `--output-format stream-json` init event of a `--plugin-dir` run lists plugin `endurance-coach@inline` (path ~/endurance-coach) and skill `endurance-coach:endurance-coach`. It was read from the start-up event, because the model call itself still returns 401 in the app terminal pane. Task 4 CLI Verify is **still open** for the same reason; run it from macOS Terminal during QA. During `--plugin-dir` testing both `endurance-coach` (live) and `endurance-coach:endurance-coach` load, so check in the stream which skill was invoked.
- Task 7 ✅ (2026-10-19, at /release): task 9 cleared the ⛔ cause (leaked values in skill text). The scan shows no WORKTREE/INDEX/PATH/REF hit. It still exits 1 on purpose, on history-only hits in c100130, 6ab6a7d, ffd674c and 183ac8b, until the Post-release 2 squash; exit 0 over the whole history is checked there. `claude plugin validate` warns that root CLAUDE.md is not plugin context, which is intended (it is for contributors).
