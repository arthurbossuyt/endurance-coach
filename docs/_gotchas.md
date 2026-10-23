# Gotchas

Traps that already cost time in this repo. Read the ones whose **Applies when** matches your task.
Format: `### G-NN · title`, **Applies when**, **Gotcha** (with the why), **Evidence**, **Verified**.

## Repo and tooling

### G-01 · Athlete-data ignore rules must be anchored to the root
**Applies when:** editing `.gitignore`, or adding a folder named `plans/`, `parity/` or `secrets/` anywhere in the repo.
**Gotcha:** an unanchored `plans/` also ignores `docs/plans/` and `examples/*/plans/`, so plan files and example plans get silently dropped from commits. Keep athlete-data entries anchored (`/plans/`, `/profile.yaml`, ...).
**Evidence:** `.gitignore:4-8`; plan `docs/plans/2026-10-17-public-plugin-repo-split.md` § Notes (2026-10-17 planning).
**Verified:** 2026-10-19

### G-02 · Headless `claude -p` fails from inside the Claude desktop app
**Applies when:** a Verify step runs `claude --plugin-dir ... -p ...`.
**Gotcha:** from the desktop app's shell and its terminal pane (including `!` commands), headless `claude` returns `401 OAuth access token has expired` even after `claude auth login`. To check the plugin loads, read the `system`/`init` event of `--output-format stream-json --verbose`: it lists plugins and skills before any API call. Anything that needs a model reply has to run from macOS Terminal.
**Evidence:** plan § Notes, Task 1 ⛔ and Task 1 ✅ (2026-10-17/18).
**Verified:** 2026-10-19

## Skill content

### G-03 · Plugin scripts are not on PATH
**Applies when:** an adapter or SKILL.md tells the model to run a script.
**Gotcha:** a plugin install puts the skill in a cache folder; nothing adds `scripts/` to PATH. Tell the model to run `<skill base directory>/scripts/<name>`. A bare command name only works on a machine with a hand-made symlink.
**Evidence:** `skills/endurance-coach/adapters/oura.md:3`; Review log round 1 #1.
**Verified:** 2026-10-19

### G-04 · Profile notes that repeat skill rules are rules, not personal data
**Applies when:** scrubbing a leak-scan hit in skill text.
**Gotcha:** some `profile.yaml` notes are copies of generic rule text (Notion date format, "don't tick planned sessions", the Hub write guard). Replacing those lines with a pointer to the note deletes the rule for every athlete whose profile lacks it. Keep the rule text and allowlist the key with a pin instead. Only replace values that are actually personal (products, dates, IDs, numbers). Placeholders must be generic (`<pantry product>`, `<session date>`), never an index like `products[0]`, which reads as "use the first one".
**Evidence:** `skills/endurance-coach/adapters/notion.md:26-29,68-69,110`; Review log round 1 #3, #4, #11.
**Verified:** 2026-10-19

### G-05 · Rule text moves verbatim; rewording breaks parity
**Applies when:** editing anything under `skills/endurance-coach/`.
**Gotcha:** the switch from Arthur's live skill to this plugin is gated on a literal parity check (old rules vs new). Reworded rules show up as diffs that someone has to justify. Move text as-is; when a change is deliberate, add it to the expected-diff list in the plan's Post-release parity step.
**Evidence:** plan § Critical decisions ("Move rule text verbatim") and § Post-release 5.
**Verified:** 2026-10-19

### G-06 · The live skill is a separate copy
**Applies when:** changing skill behaviour on a branch and expecting Arthur's coach to change.
**Gotcha:** `~/.claude/skills/endurance-coach` is a frozen copy, not a symlink to this repo. Branch edits reach Arthur only after the parity gate and the switch. Never edit the live copy from a branch; changes go repo first.
**Evidence:** `ls -la ~/.claude/skills/` (plain directory); plan § Critical decisions.
**Verified:** 2026-10-19

### G-07 · An ISO date in a committed doc can be an athlete value
**Applies when:** writing a date into a plan's Notes or Review log, an area doc or a commit message.
**Gotcha:** `scripts/leak-scan` treats every ISO date leaf in `profile.yaml` / `plan.yaml` / `session-log.yaml` as a needle, so a date that happens to equal one (a past race, a pantry or device date) is a hit. The pre-push hook scans every blob of every pushed commit, so one such date in an early commit blocks the push until history is squashed. Say "an earlier run" or leave the date out; the commit itself carries the date.
**Evidence:** `scripts/leak-scan:30` (ISO date leaves are needles); plan `docs/plans/2026-10-19-coach-parity-scripted-gate.md` § Review log round 1 #1 (two dated lines blocked the branch and forced a squash).
**Verified:** 2026-10-23
