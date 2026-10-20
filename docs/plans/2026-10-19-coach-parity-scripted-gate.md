# Make the coach parity check a repeatable scripted gate

**Ticket:** https://app.notion.com/p/3fc609f4daef81c58705f2af02aeb8f0 · **Branch:** `feat/coach-parity-scripted-gate` · **Created:** 2026-10-19
**Recommended session:** Sonnet 5.5 · medium: tasks are sequential and file-disjoint; the only judgement calls (manifest entries) are already decided in the old plan's step 5 and below.

## TL;DR
`scripts/parity` replaces the hand-written agent brief with three checks. `rules` diffs two rule trees line by line against a manifest of expected diffs. `answers` compares the 5 standard questions literally on four fields, run from one recorded data snapshot. `verify` makes a PASS go stale after any edit to the skills, profile or plan. A generic brief in `docs/` drives the snapshot and the two answer runs in an interactive desktop session, because headless runs can't reach Notion or Strava.

## Critical decisions
Settled in exploration. Do not relitigate.
- The question runs happen in an **interactive desktop session** with a general-purpose agent, against a recorded fixture. Not headless `claude -p`: it loads only the garmin MCP, and G-02 means it fails from the desktop app anyway.
- Both answer runs read **only the fixture**, never live tools, so data can't drift between the OLD run and the NEW run.
- The agent follows each rule tree **by reading its files by path**. No fixture mode goes into SKILL.md (that would be a rule-text change, G-05).
- The **switch manifest lives in `~/.endurance-coach/parity/`, never in the repo**: old-only lines include pantry product names. Only the script and the generic brief are committed.
- Compare **literally**, whitespace-trimmed only, on four fields: session (Notion title), intensity (target string), fuel lines (Before / During / After / Fuel log), shoe. Free coaching prose is not compared. Substance mode missed a gram-format change in an earlier run.
- The rules diff runs on the multiset of non-blank lines across `SKILL.md`, `references/*.md` and `adapters/*.md`. Each relative link target is reduced to its file name (anchor kept), so cross-file moves and link rewrites from the adapter split aren't diffs.
- Unused manifest entries fail the gate, just like UNMAPPED lines, so the manifest can't rot.
- The PASS is hash-stamped (rule trees, `profile.yaml`, active `plan.yaml`). Any later edit makes `verify` fail.
- The 51-page fuel-target rebuild (the 2026-10-17 brief) is **not** in the default gate. Out of scope: a CI rule-change gate (follow-up after the switch), hand-written fuel clauses (their own ticket).
- No new runtime deps: Node + `js-yaml` (already in devDependencies) + `scripts/lib/athlete-home.cjs`.

## Acceptance criteria
- AC-01: Given two rule trees (--old <dir|git ref> --new <dir|git ref>), when scripts/parity rules runs, then it compares the normalized multiset of non-blank lines of SKILL.md, references/*.md and adapters/*.md (relative link targets resolved to their file name before compare, cross-file moves allowed) and lists every line that is old-only or new-only.
- AC-02: Given a manifest of expected diffs (each entry: old line, new line or "removed"/"added", reason), when the rules run finishes, then every diff line is either matched by an entry (MAPPED) or reported as UNMAPPED, and the script exits non-zero on any UNMAPPED line or any unused manifest entry.
- AC-03: Given the switch run (old = ~/.claude/skills/endurance-coach, new = ~/endurance-coach/skills/endurance-coach), when it runs, then the manifest lives at ~/.endurance-coach/parity/switch-manifest.* (never in the repo) and covers the step-5 list plus the diffs that list misses today: link-path rewrites, the Legacy fuel labels cutoff date (task 9) and the Garmin MCP-server paragraph.
- AC-04: Given a fixed brief file in the repo (generic, no athlete values), when a general-purpose agent in an interactive desktop session runs it, then it first writes one data snapshot (Notion Workout schedule rows for the question dates, Strava week, Oura readiness, Garmin if connected) to ~/.endurance-coach/parity/<date>/fixture.*, and both answer runs read only that fixture, never live tools.
- AC-05: Given the fixture, when the brief answers the 5 standard questions (today, this week, eat before my run, post-session check-in, which shoe) once following the old skill files and once following the plugin files, then each answer is written as a fixed block with the fields session (Notion title), intensity (target string), fuel (Before/During/After/Fuel log lines as built from the rules) and shoe (select value) to old.md and new.md in the same folder.
- AC-06: Given old.md and new.md, when scripts/parity answers runs, then the four fields are compared literally per question (no substance mode, only whitespace trimmed) and any mismatch fails the gate with the question and field named.
- AC-07: Given a run, when it ends, then result.md records PASS/FAIL, the date, and a sha256 of each rule tree, profile.yaml and the active plan.yaml; and scripts/parity verify exits non-zero if any of those hashes no longer match the current files (a PASS is stale after any edit).
- AC-08: Given post-release step 5, when the switch is attempted, then the mv to ~/.claude/skills-archive/ and the user-wide install run only after rules, answers and verify all pass on the same day, and the plan's step 5 text points at the scripted commands instead of a hand-written brief.
- AC-09: Given the repo after the build, when inspected, then scripts/parity has a usage header like scripts/leak-scan, docs/architecture.md lists it, the vault Parity check section points at it, and scripts/leak-scan stays clean (no athlete value in the brief, script or examples).

## Tasks
Markers: ⬜ todo · 🔄 doing · ✅ done · ⛔ blocked

No test suite exists. Verify steps use throwaway rule trees under `mktemp -d` (invented text only), `node --check`, `scripts/leak-scan` and `npm run validate:examples`.

### 1. `scripts/parity rules` with the expected-diff manifest · ✅ · [infra] · Opus 5.5 / high
**Files:** `scripts/parity`, `scripts/lib/parity.cjs`
**Do:** Write an executable Node script with a header comment in the `scripts/leak-scan` style (usage, inputs, output, exit codes 0 pass / 1 gate fail / 2 setup error). `rules --old <dir|git ref> --new <dir|git ref> [--manifest <yaml>]`: a git ref reads `skills/endurance-coach/` at that ref through `git show` / `git ls-tree`. Collect the non-blank lines of `SKILL.md`, `references/*.md` and `adapters/*.md` (a missing `adapters/` is fine). Trim each line and reduce every relative markdown link target `](a/b/c.md#x)` to `](c.md#x)`, then take the multiset difference. Manifest is YAML: `entries: [{old: <line>|null, new: <line>|null, reason: <text>}]`, matched against the normalized lines. Print `MAPPED`, `UNMAPPED old|new` and `UNUSED` rows with file:line. Exit 1 on any UNMAPPED or UNUSED row. Put the pure logic in `lib/parity.cjs` so task 2 can reuse it.
**Verify:** `node --check scripts/parity`. In `mktemp -d`, build two invented trees: a line moved across files with its link rewritten (no diff), one reworded line, one added line. With no manifest → exit 1, two UNMAPPED. With a manifest mapping both → exit 0. Add an extra unmatched entry → exit 1, UNUSED. `scripts/parity rules --old HEAD --new HEAD` → exit 0.
**Satisfies:** AC-01, AC-02
**Why this model:** new logic with no pattern to copy, and the normalization rules decide whether G-05 diffs show up.

### 2. `answers`, `gate` and `verify` with hash-stamped results · ✅ · [infra] · Sonnet 5.5 / medium
**Files:** `scripts/parity`, `scripts/lib/parity.cjs`
**Do:** `answers --dir <run dir>` parses `old.md` and `new.md`: blocks `## Q1` to `## Q5`, each with exactly the keys `session`, `intensity`, `fuel.before`, `fuel.during`, `fuel.after`, `fuel.log`, `shoe` as `- key: value` lines. It compares values literally after trimming, and reports each mismatch as `Q<n> <key>`. A missing block or key is a fail. `gate --old --new --manifest --dir` runs `rules` and `answers`, then writes `<dir>/result.md` with PASS/FAIL, the date, a `sha256` per rule tree (sorted relative path + content), plus `profile.yaml` and the active plan's `plan.yaml` (via `athlete-home.cjs`), in a fenced block that `verify` reads. `verify --dir` recomputes and exits 1 on FAIL, on any hash mismatch, or when the result is dated another day. Print paths and key names only, never file values.
**Verify:** with the task 1 temp trees plus a temp `ENDURANCE_COACH_HOME` (copy `examples/triathlete`): matching old.md/new.md → `gate` exit 0, `verify` exit 0. Change one `fuel.during` value → `answers` exit 1, naming `Q? fuel.during`. After a PASS, edit one line in a tree → `verify` exit 1.
**Satisfies:** AC-06, AC-07
**Why this model:** parsing and hashing that follow task 1's structure.

### 3. Fixed parity brief: snapshot, then two answer runs · ✅ · [infra] · Opus 5.5 / high
**Files:** `docs/parity-brief.md`
**Do:** Write the brief Arthur pastes into an interactive desktop session's general-purpose agent. Step 1: snapshot read-only into `~/.endurance-coach/parity/<date>/fixture.md` (Workout schedule rows from the previous Monday to the next run day, with title, Sport, Shoe and fuel lines; the Strava week; Oura readiness and sleep; Garmin, or `unavailable`). Step 2: two answer passes, each told to follow only one tree's files by path (OLD = `~/.claude/skills/endurance-coach/`, NEW = the plugin's `skills/endurance-coach/`) and to use only the fixture, no live tool. Fields get filled by copying from the fixture and the rules, with grams filled and rounded as the rules say. Step 3: write `old.md` and `new.md` in exactly task 2's block format, run `scripts/parity gate`, and stop with no Notion write. Name the 5 questions word for word. Use key paths and placeholders only, no athlete values (G-04 placeholder style).
**Verify:** `scripts/leak-scan` shows no `WORKTREE` / `INDEX` hit. Hand-make an invented `old.md`/`new.md` pair in `mktemp -d` that copies the brief's format literally → `scripts/parity answers --dir` parses it with exit 0.
**Satisfies:** AC-04, AC-05, AC-09 (part)
**Why this model:** the brief decides whether a model's answers are literal enough to compare, and it sits next to personal data.

### 4. Local switch manifest and first rules pass · ✅ · [infra] · Opus 5.5 / high
**Files:** `~/.endurance-coach/parity/switch-manifest.yaml` (local, never committed)
**Do:** Run `scripts/parity rules --old ~/.claude/skills/endurance-coach --new skills/endurance-coach`. Write one manifest entry per remaining diff, with a reason that cites its source: the old plan's step 5 list (notion.md Sport row, `<pantry product>` / `<grams>` and `~` examples, Fuel log `<session date>`, Shoe `added` pointer, oura.md token and script lines, the no-profile and Garmin-connected rules), the task 9 Legacy-labels cutoff decision, and Round 1 #15 for the Garmin MCP-server paragraph. Any diff that matches none of these: stop and mark ⛔ for Arthur, don't map it. Never copy manifest lines into the repo, a commit message or the plan.
**Verify:** `scripts/parity rules --old ~/.claude/skills/endurance-coach --new skills/endurance-coach --manifest ~/.endurance-coach/parity/switch-manifest.yaml` → exit 0. `git status --porcelain` shows no manifest file. `scripts/leak-scan` stays clean.
**Satisfies:** AC-03
**Why this model:** every entry is a G-05 judgement next to personal data.

### 5. Point the docs at the gate · ✅ · [infra] · Sonnet 5.5 / low
**Files:** `docs/architecture.md`, `docs/plans/2026-10-17-public-plugin-repo-split.md`, `CLAUDE.md`, `~/arthurbossuyt/wiki/projects/endurance-coach-data-layout.md`
**Do:** Add `scripts/parity` and `docs/parity-brief.md` to the architecture Layout table, and a line under Decisions to respect: "Rule-text edits re-run `scripts/parity`." Rewrite post-release step 5 of the old plan to run the brief and `scripts/parity gate` + `verify` on the same day before the `mv` and the install. Keep the expected-diff list as a pointer to the local manifest. In CLAUDE.md, extend the verbatim bullet with "checked by `scripts/parity rules`". In the vault § Parity check, replace "Run it with a general-purpose agent… Brief: the 2026-10-17 run" with the brief path and the commands, and keep the literal-compare and known-differences bullets.
**Verify:** `grep -n 'scripts/parity' docs/architecture.md CLAUDE.md docs/plans/2026-10-17-public-plugin-repo-split.md ~/arthurbossuyt/wiki/projects/endurance-coach-data-layout.md` → a hit in each. `npm run validate:examples` passes. `scripts/leak-scan` stays clean.
**Satisfies:** AC-08 (text), AC-09
**Why this model:** short doc edits that point at finished work.

## Post-release
Run with Arthur at /release, after merge. This is the switch, so it touches his live skill.
1. **Gate run:** do this after the "Keep hand-written fuel clauses" ticket has settled. Its rule change must be in both copies (AC-12 of the split plan) or in the manifest. Open an interactive desktop session, paste `docs/parity-brief.md` into a general-purpose agent, and let it write the fixture plus `old.md` and `new.md`. Then `scripts/parity gate` must PASS. (AC-04, AC-05, AC-06)
2. **Switch, same day:** `scripts/parity verify --dir ~/.endurance-coach/parity/<date>` exits 0. Then run split-plan post-release step 5: `mv` the old skill to `~/.claude/skills-archive/`, install the plugin user-wide, and confirm only one endurance-coach skill triggers. On FAIL nothing moves. (AC-07, AC-08)

## Review log
<!-- /peer-review appends one table per round -->

## Notes
<!-- deviations recorded during execution -->
- 2026-10-19 planning: branch cut as a worktree (`~/endurance-coach-parity-gate`) from `origin/main` @ bd4b7eb, because the shared `~/endurance-coach` checkout is used by other sessions and must not switch branches.
- 2026-10-20 task 1 (b9c50c7): `rules` prints file:line only, never line text (task 4 opens files at those positions). Each manifest entry maps one occurrence per side; reword entries need both sides. Manifest lines are normalized like tree lines. `--old/--new` accept a skill root or a checkout holding `skills/endurance-coach/`.
- 2026-10-20 leak-scan: the working-tree scan reports hits on the plan file (line 15 date in Critical decisions) per the task 1 report; unverified by me beyond hits on older commits. Pre-push hook may block a push until resolved; for /code-review.
- 2026-10-20 task 2 (cbdc09c): the plan doesn't define "active plan". Implemented as the only plan under `plans/`, else the last id (see usage header); revisit if wrong. `gate` writes result.md on FAIL too; result.md also stores old/new specs, home path and plan id so `verify` can recompute. Extra or unknown answer keys fail.
- task 3 (557a071): brief also snapshots each row's Target line (needed for `intensity`); question wording taken from the earlier parity run and SKILL.md; Q4 uses a fixed generic check-in reply; fuel lines are built from the rules, never copied from the page; `none` marks a non-applicable field.
- 2026-10-20 task 4: local manifest has 28 entries (rules gate exit 0, nothing in the repo). 13 map to the sources named in the task; 15 map adapter-split path/link-text rewrites and the new Adapters list in athlete-data.md, which AC-03 covers as "link-path rewrites". Arthur to eyeball at /code-review.
- 2026-10-20 task 5 (4355846): subagent report was empty; checked by hand (greps hit in all four files, validate:examples passes, gate against the local manifest passes). The vault file was edited in place, not committed.
- code-review fixes: `answers` fails on an empty value; the PASS stamp now also hashes old.md, new.md and fixture.md (gate needs fixture.md, verify flags any edit); plan dates reworded so the working-tree leak-scan is clean.
