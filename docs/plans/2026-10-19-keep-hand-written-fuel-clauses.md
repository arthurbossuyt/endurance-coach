# Keep hand-written fuel clauses when fuel lines are rewritten

**Ticket:** https://app.notion.com/p/3fb609f4daef81a7bca9f6ed377390c3 · **Branch:** `feat/keep-hand-written-fuel-clauses` · **Created:** 2026-10-19
**Recommended session:** Sonnet 5.5 · medium: three sequential tasks, each pinned to Opus; the orchestrator only dispatches and runs no judgement calls itself.

## TL;DR
The idempotent fuel write never says what "identical" means, so one dry run compared by substance (all pages unchanged) and the next word for word (3 rewrites that drop hand-written clauses). We define a fixed list of substance fields, keep every other clause verbatim, ask before any substantive rewrite of an existing line, and add a short-session exception for threshold and MP sessions so the matrix matches what the pages already say.

## Critical decisions
Settled in exploration. Do not relitigate.
- Fix the comparison, not the data: no plan.yaml `dated_extras` for clauses, no "free-text tail" parsing.
- **Substance fields** (the only things compared): grams or g/kg, g/h, gel count and gel timing, product, water amount, timing window ("2–3 h before"). Everything else on a fuel line is a **context clause**.
- Substance matches → the line stays as fetched, whatever its wording; the page counts as unchanged.
- Substance conflicts → change only the conflicting part, carry every non-conflicting clause over word for word.
- A context clause that contradicts the new substance is dropped and named in the report. Never drop a clause silently.
- Rewriting an **existing** fuel line for a substance conflict needs the athlete's yes (show old → new first). Writing fuel onto a page with none, and migrating legacy labels, stay automatic. This narrows today's locked-plan rule that fuel lines are written without asking.
- The 13 hand-written 🍞 Before clauses from the earlier parity dry run are covered by the same rule (they are context, so they are kept).
- Matrix exception: threshold and MP sessions with under about 60′ of quality work get **1 gel** with 150–200 ml water (threshold: before the first rep; MP: between rep 1 and rep 2), not the 30–60 / 40–60 g/h range.
- MP sessions do not take the ramp window's breakfast or its "Gel 15′ before": MP Before = the threshold Before plus the mini breakfast drill. Say so in notion.md § Ramp windows.
- Rule text changes are deliberate (G-05): every reworded rule goes on the expected-diff list below. Repo first; the live skill is changed only after merge (G-06).
- Never put athlete values in the repo: refer to sessions by `MM-DD` and to plan values by key path (the leak scan treats plan.yaml ISO dates as needles).

## Acceptance criteria
- AC-01: Given a session page whose fuel line has the same substance as the rules (grams or g/kg, g/h, gel count and timing, product, water amount, timing window) but different wording, when fuel is written or dry-run, then the line is left as is and the page counts as unchanged.
- AC-02: Given a fuel line with hand-written context clauses (e.g. 10-29 "this one runs about 65′", "note the stomach 0–10"; the 13 Before clauses from the earlier parity dry run), when its substance conflicts with the rules, then only the conflicting part changes and every non-conflicting clause is carried over word for word.
- AC-03: Given a context clause that contradicts the new substance value, when the line is rebuilt, then the clause is dropped and named in the report as dropped; no clause is ever dropped silently.
- AC-04: Given an existing fuel line whose substance conflicts with the rules, when the coach would rewrite it, then it shows old → new and writes only after the athlete's yes; writing fuel onto a page with none and migrating legacy labels stay automatic.
- AC-05: Given a threshold or MP session with under about 60′ of quality work, when fuel is built, then During is 1 gel (threshold: before the first rep; MP: between rep 1 and rep 2) with 150–200 ml water, not the 30–60 / 40–60 g/h range, and the 10-20 and 10-27 pages count as unchanged.
- AC-06: Given an MP session, when Before is built, then it is the threshold Before plus the mini breakfast drill and does not take the ramp window's breakfast or "Gel 15′ before"; notion.md § Ramp windows says so explicitly.
- AC-07: Given the changed rules, when a read-only dry run covers 10-20 through race day twice, then both runs give the same result, every context clause is kept, 10-26 to 11-01 shows 0 rewrites, and nothing is written to Notion.
- AC-08: Given the change, when it ships, then it lands in the repo first, is copied verbatim to the live skill (references/notion-schedule.md, nutrition-fueling.md, SKILL.md), and each reworded rule is on the parity expected-diff list.

## Tasks
Markers: ⬜ todo · 🔄 doing · ✅ done · ⛔ blocked

### 1. Substance comparison in the idempotent write · ✅ · [backend] · Opus 5.5 / high
**Files:** `skills/endurance-coach/adapters/notion.md`, `skills/endurance-coach/SKILL.md`
**Do:**
- notion.md § Idempotent write: in step 2/3, define the substance fields and context clauses (Critical decisions), replace "A target line identical to the line already there" with "same substance", and spell out the conflict path: rebuild only the conflicting part, carry non-conflicting clauses verbatim, drop and name a contradicting clause. Keep the `old_str` mechanics (whole line, copied exactly) unchanged.
- notion.md § Idempotent write Safety + § Locked plan (`notion.md:11`): a substance rewrite of an existing fuel line is shown old → new and waits for the athlete's yes; new fuel on an empty page and legacy migration stay automatic.
- SKILL.md "Fuel my upcoming sessions" steps 3–4 and § When fuel shows up (locked-plan sentence): same rule; the finish count adds "needs your yes" (old → new per line) and "clauses dropped" (named).
- Edit only these sentences; leave all other rule text byte-identical (G-05). List every changed sentence in the plan's Notes for the expected-diff list.
**Verify:** `npm run validate:examples` | manual: `git diff` touches only the sentences above; `grep -n "identical" skills/endurance-coach/adapters/notion.md` no longer names the comparison; `git diff | grep '^+' | grep '~'` is empty.
**Satisfies:** AC-01, AC-02, AC-03, AC-04
**Why this model:** G-05 applies, and the wording must be tight enough that two dry runs agree.

### 2. Short-session matrix exception and MP Before · ✅ · [backend] · Opus 5.5 / high
**Files:** `skills/endurance-coach/references/nutrition-fueling.md`, `skills/endurance-coach/adapters/notion.md`
**Do:**
- nutrition-fueling.md § Session fueling matrix: on the Threshold and MP rows' During, add the exception (under about 60′ of quality work: 1 gel with 150–200 ml water; threshold before the first rep, MP between rep 1 and rep 2). Keep the g/h ranges for longer sessions. The MP row keeps "test the race gel at MP".
- notion.md § Ramp windows Scope bullet (`notion.md:119`): state that MP sessions take the threshold Before plus the mini breakfast drill and not a window's `breakfast` (so no "Gel 15′ before").
- No `~` in the new text; write "about 60′". Add the changed sentences to the plan's Notes.
**Verify:** `npm run validate:examples` | manual: `git diff` shows only these two edits; the matrix table still renders (same column count on every row).
**Satisfies:** AC-05, AC-06
**Why this model:** coaching rule change under G-05; must not loosen the over-fuel guardrail.

### 3. Read-only dry run, twice · ✅ · [backend] · Opus 5.5 / high
**Files:** none in the repo. Results go to `~/.endurance-coach/parity/` (athlete data; never in the repo).
**Do:**
- Apply the branch's rules (tasks 1–2) to every Workout schedule page from 10-20 through race day: query, `notion-fetch` each page, build target lines, classify each page written / updated / unchanged / needs your yes / skipped, list kept and dropped clauses. **No Notion write call.**
- Run it a second time from scratch and diff the two results.
- Record in the plan's Notes only counts and `MM-DD` dates (no athlete values).
**Verify:** manual: both runs identical; 10-26 to 11-01 has 0 rewrites; 10-20 and 10-27 unchanged; every context clause on 10-28, 10-29, 10-31 and the 13 Before pages kept; no Notion write in the tool log; `scripts/leak-scan` shows no WORKTREE/INDEX hit.
**Satisfies:** AC-01, AC-02, AC-05, AC-07
**Why this model:** judgement over 50+ pages; a second model tier would make the run-twice check meaningless.

## Expected diffs for the parity gate
Sentence-level, file:line on this branch: see the task 1 and task 2 lines in § Notes (plus the round 1 fixes in § Review log). The parity gate maps these instead of failing on them.
- notion.md § Locked plan: fuel rewrite of an existing line needs a yes.
- notion.md § Idempotent write: substance comparison, clause carry-over, dropped-clause report.
- notion.md § Ramp windows: MP Before.
- nutrition-fueling.md: Threshold and MP rows, short-session exception.
- SKILL.md: When fuel shows up (locked-plan sentence); Fuel my upcoming sessions steps 3–4.

## Post-release
Run with Arthur at /release, after merge to main.
1. **Copy to the live skill:** apply the same sentence edits to `~/.claude/skills/endurance-coach/references/notion-schedule.md`, `references/nutrition-fueling.md` and `SKILL.md`. The live files use different link paths (`notion-schedule.md` instead of `adapters/notion.md`), so apply the changed sentences, never whole files. Then diff the changed sections repo vs live: only the known link-path differences remain. (AC-08)
2. **Hand the expected diffs to the parity-gate ticket** ("Make the coach parity check a repeatable scripted gate"), so its gate starts from the fixed rule. (AC-08)

## Review log
<!-- /peer-review appends one table per round -->
### Round 1 · 2026-10-20 · leads: self (/code-review), opus, haiku (fable failed to start: usage credits)
| # | Lead | Sev | Finding | Verdict | Why / commit |
|---|---|---|---|---|---|
| 1 | self, opus, haiku | High | MP Before cell says "breakfast drill (see long runs)" (gel 15′ before); "mini breakfast drill" undefined | ✅ | 41c8a34: MP Before = threshold Before, no gel 15′ before, no window breakfast; 'mini' dropped |
| 2 | self, opus, haiku | High/Med | "under about 60′ of quality work" ambiguous (session vs rep time), decides 11-10 | ✅ | 41c8a34: means total session length (Arthur) |
| 3 | opus, haiku | High/Med | Ramp windows Scope bullet lacks short-MP carve-out | ✅ | 088db21 |
| 4 | self, opus, haiku | Med | g/kg daily-intake remarks vs substance field | ✅ | 088db21 |
| 5 | opus | Med | "Water only." vs `No carbs` read as conflict | ✅ | 088db21 |
| 6 | opus | Low | same-substance legacy-label line never migrated | ✅ | 088db21 |
| 7 | haiku | High | duplicate-label removal drops clauses silently | ✅ | 088db21 |
| 8 | haiku | Med | SKILL.md yes-clause reads as locked-plan only | ✅ | 088db21 |
| 9 | self | Low | Expected diffs section still a stub | ✅ | filled (pointer to Notes) |
| 10 | opus | Med | yes needed even after approving the session rewrite itself | ❌ | settled in Critical decisions (rewrite of an existing line needs the yes) |
| 11 | opus, haiku | High/Med | task 3 ✅ though the identical-runs check failed | ✅ | dry run re-run twice after the fixes (rules at 41c8a34): runs identical (48 pages: unchanged 46, needs your yes 1 (12-01), skipped 1 (10-21), dropped 0); 10-26 to 11-01 0 rewrites; 10-20 and 10-27 unchanged; 0 Notion writes; leak-scan 0 hits |
| 12 | haiku | Low | no gel timing for a one-rep MP; "one" vs "1" gel | ❌ | the plan's wording fixes "between rep 1 and rep 2"; number words are the same number under "same numbers" |


Round 1: 8 fixed · 3 rejected · 0 ticketed · validate:examples pass.

## Notes
<!-- deviations recorded during execution -->
- Task 1 (b096caa), changed sentences for the expected-diff list: notion.md:11 (§ Locked plan exception), :90 (§ Idempotent write step 2, substance fields and context clauses defined), :95-97 (step 3 new_str bullet plus same-substance and conflict sub-bullets), :100 ("identical" becomes new_str equals old_str), :108 (Safety: substance rewrite needs a yes); SKILL.md:60 (When fuel shows up), :70 (step 3), :71 (step 4 count adds "needs your yes" and "clauses dropped").
- Task 1 deviations (choices the plan left open): a legacy-label line whose substance conflicts gets its label migrated now, text unchanged, and only the substance change waits for the yes; a line waiting for a yes is written as fetched in the same call, so the page's other entries still land.
- Task 2 (19b3873), changed sentences for the expected-diff list: nutrition-fueling.md:57 (Threshold During, short-session exception), :58 (MP During, short-session exception; also replaces "the date's gel interval" for those sessions), notion.md:123 (§ Ramp windows Scope bullet: MP takes threshold Before plus mini breakfast drill, never a window's `breakfast`).
- Task 2 deviations: ranges written with a hyphen to match the file's style. Open, not fixed (outside the plan's scope): the matrix MP Before cell still says "plus the breakfast drill (see long runs)", and the long-run drill ends with a gel 15′ before the start, which clashes with the new notion.md sentence; "mini breakfast drill" is not defined anywhere in the repo. Needs a decision at /code-review or /peer-review.
- Task 3 (accepted by Arthur: runs differ only on the 4 pages edited in Notion between them): two read-only dry runs over 48 pages (10-20 to race day). Run 1: unchanged 47, needs your yes 1 (12-01), dropped 0. Run 2: unchanged 46, needs your yes 1 (12-01), skipped 1 (10-21, Football has no matrix row), dropped 0. 0 Notion writes; leak-scan 0 hits on `--revs main..HEAD`. The runs differ only on 4 pages edited in Notion between them (10-21, 10-23, 10-24, 10-25), so the "both runs identical" check is not met yet. Results in `~/.endurance-coach/parity/` (outside the repo).
- Task 3 findings for review: (a) "under about 60′ of quality work" is ambiguous (session length vs rep time); it decides 11-10 (unchanged vs needs your yes); (b) matrix MP Before cell vs notion.md Ramp windows sentence (see task 2) decides 10-27 and 12-01 Before; (c) 12-01 During timing conflicts with the MP exception (needs your yes); (d) daily-intake g/kg remarks in Before lines (11-14, 11-21) were treated as context, not substance.
- Round 1 changed sentences (for the expected-diff list): notion.md:62 (Before row: window breakfast excludes MP), :90 (g/kg = session's own amount, `Water only`/`No carbs` = 0 g), :96 (legacy label mapped), :99 (removed duplicate's clauses named), :123 (MP short-session carve-out; 'mini' dropped); SKILL.md:60 (yes applies on every plan); nutrition-fueling.md:57-58 ('Session under about 60′ in total'; MP Before = threshold Before, no gel 15′ before, no window breakfast).
