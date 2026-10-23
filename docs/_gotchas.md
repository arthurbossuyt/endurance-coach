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

### G-07 · A fuel rule lives in three files; change them together
**Applies when:** changing what a fuel line contains or how it is compared (matrix rows, ramp windows, idempotent write, finish count).
**Gotcha:** the same rule is stated in `references/nutrition-fueling.md` (matrix), `adapters/notion.md` (Format, Idempotent write, Ramp windows Scope, Safety) and `SKILL.md` (When fuel shows up, Fuel my upcoming sessions). Editing one leaves the others contradicting it, and the model then builds different target lines on different runs. In the keep-hand-written-fuel-clauses branch the MP Before cell, the Scope bullet and the Format table each disagreed after a first edit, and review round 1 and 2 found it. After a rule change, grep the changed term in all three files and re-run the read-only dry run (plan task 3) twice.
**Evidence:** `skills/endurance-coach/references/nutrition-fueling.md:58`; `skills/endurance-coach/adapters/notion.md:62,123`; plan `docs/plans/2026-10-19-keep-hand-written-fuel-clauses.md` Review log rounds 1-2.
**Verified:** 2026-10-23

### G-08 · Plan files are committed: no athlete text, not even in acceptance criteria
**Applies when:** writing or quoting examples in a `docs/plans/` file (ACs, Notes, Critical decisions).
**Gotcha:** `scripts/leak-scan` only matches known needles, so hand-written Notion page text quoted in a plan passes it but is still athlete data in a public repo. Use generic placeholders ("a remark on the session's length") and `MM-DD` dates; keep real wording in `~/.endurance-coach/parity/`. Scrubbing later does not remove it from earlier commits.
**Evidence:** `git log -S"this one runs about" -- docs/plans` (1f50ba9 added it, 4702712 removed it).
**Verified:** 2026-10-23

### G-09 · Local `main` can lag `origin/main`; diff against `origin/main`
**Applies when:** reviewing or leak-scanning a branch (`git diff main...HEAD`, `scripts/leak-scan --revs main..HEAD`).
**Gotcha:** local `main` was behind `origin/main` (33c6f7c vs bd4b7eb), so `main...HEAD` also shows already-merged PR changes and the range scans extra commits. Use `origin/main`, or fetch and fast-forward first.
**Evidence:** `git rev-parse main origin/main` on this branch (2026-10-23).
**Verified:** 2026-10-23
