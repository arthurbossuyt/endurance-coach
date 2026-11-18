# Re-decide recovery source of truth: Oura vs Garmin readiness

**Ticket:** https://app.notion.com/p/3f9609f4daef814e8479f7ede0e5929a · **Branch:** `feat/recovery-source-blend` · **Created:** 2026-11-17
**Recommended session:** Sonnet 5.5 · medium: three sequential tasks with every product question already settled; the session only dispatches and checks.

## TL;DR
No source switch. Oura keeps the go/no-go call; Garmin Training Readiness becomes a load-recovery clock that gates intensity only; the disagreement flag fires only when the two sit on opposite sides of 70. The load metric stays Strava `relative_effort` until the dated `load_switch.switch_date` is set, then moves to Garmin load. Rule text only, in the three files that state the recovery rule, checked with `scripts/parity rules` and a cold read-only replay.

## Critical decisions
Settled in exploration (evidence in the Notion ticket, never in the repo). Do not relitigate.
- **Roles:** Oura reads physiology (HRV, resting HR, temperature) and decides train / don't train, with the existing bands (`adapters/oura.md:13`, `adapters/garmin.md:36`). Garmin Training Readiness is mostly a watch-load recovery clock: when its score is low because of the recovery factor (`recovery_time_hours`, `acute_load`) when a load factor is its lowest factor, it is saying "recent load", not "unrecovered body".
- **Intensity gate:** when Oura is ≥70 and Garmin `recovery_time_hours` > 24, or Garmin score <70 whatever its driver (widened from <60 at /code-review, confirmed by Arthur at /code-review): easy aerobic work is fine, no quality session (threshold, MP, intervals, race-pace); the answer names load / recovery time as Garmin's driver and says when the clock clears (morning `recovery_time_hours` from the reading's timestamp).
- **Planned quality session inside the gate:** suggest swapping it for easy running or moving it. On a locked plan nothing moves without the athlete's explicit yes (`adapters/notion.md:11`).
- **Flag:** only when Oura and Garmin land on opposite sides of 70; show both numbers and the driver of the lower score. Same side of 70 (for example normal vs prime): no flag. Oura <70: Oura's caution / back-off call stands whatever Garmin says.
- **Garmin unavailable (AC-06):** means the `garmin` MCP is connected but errors. Then Oura-only as today, plus one line that the intensity gate was not checked. A Garmin that was never connected stays silent (`adapters/garmin.md:5` unchanged).
- **Load metric:** Strava `relative_effort` until profile.yaml `load_switch.switch_date` is set (once, after the first race past the watch switch date, after a yes; code-review fix, a new plan never switches it back); after it, Garmin acute/chronic load (`get_training_status`), switched together with the post-race zone update. The "4 weeks of recorded data" criterion and every "decided in the follow-up ticket" line go.
- **Disagreement days are not stored.** Both APIs return history. RPE/feel logging belongs to the feedback-loop ticket (child e).
- **Generic text.** The rule is for any athlete with both sources. No athlete scores, dates or device names in skill text or this plan (G-08, G-10); refer to values by key path.
- **Ships before the race.** Rule text only; locked plan sessions are untouched.

## Acceptance criteria
- AC-01: Given Oura readiness ≥70 and Garmin Training Readiness <70 because of its recovery factor (HRV factor still high), when Arthur asks "what should I do today", then the go/no-go follows Oura, easy aerobic work is allowed, no quality session (threshold, MP, intervals) is recommended, Garmin's driver (load / recovery time) is named and the answer says when the recovery clock clears.
- AC-02: Given Garmin recovery_time_hours > 24 (or Garmin score <70) on a day with a planned quality session, when asked, then the coach suggests swapping it for easy running or moving it, and moves nothing in the locked plan without an explicit yes.
- AC-03: Given Oura and Garmin land on the same side of 70 (e.g. normal vs prime), when asked, then no disagreement flag is shown.
- AC-04: Given Oura and Garmin land on opposite sides of 70, when asked, then the answer flags it with both numbers and the driver of the lower score.
- AC-05: Given Oura <70, when asked, then Oura's caution / back-off call stands whatever Garmin says.
- AC-06: Given the Garmin MCP is unavailable, when asked, then behaviour is Oura-only as today and the answer says the intensity gate was not checked.
- AC-07: Given adapters/garmin.md after the change, when read, then Strava relative_effort stays the load metric until profile.yaml load_switch.switch_date is set (once, after the first race past the watch switch date, after a yes, together with the post-race zone update; never reverted by a new plan), after which Garmin acute/chronic load takes over; the "4 weeks of recorded data" criterion and the "decided in the follow-up ticket" lines are replaced.
- AC-08: Given the change, when garmin.md, SKILL.md and athlete-data.md are read, then the recovery rule reads the same in all three, scripts/parity rules shows only the diffs on the plan's expected-diff list, and leak-scan passes (no athlete scores or dates in committed files).
- AC-09: Given the PR is merged, when Arthur pulls ~/endurance-coach and updates the plugin before the race (plan.yaml race.race_date), then the installed plugin's garmin.md contains the new rule.

## Tasks
Markers: ⬜ todo · 🔄 doing · ✅ done · ⛔ blocked

### 1. Unblock the push: example HR zones collide with the real profile · ✅ · [infra] · Sonnet 5.5 / medium · parallel-safe
**Files:** `examples/triathlete/profile.yaml`, `scripts/leak-scan.allow` (only if the pin is generic)
**Do:**
- Found while planning: `scripts/leak-scan --revs origin/main..HEAD` hits on `examples/triathlete/profile.yaml` lines 15, 42, 43 (key paths `profile.zones.hr.z2.max`, `z3.max`, `z4.min`) because the athlete's real HR zones were re-paced and now equal three fictional values. Pre-existing on main; the pre-push hook would block this branch.
- Change those fictional numbers (and the adjoining bounds, so the example zones stay contiguous and ordered) to values that hit nothing. Never read out or write the real values; rerun the scan to confirm.
- The scan also reports `allowlist pin changed: profile.zones.hr.method`. Look at the key's value in the real profile without printing it: if it is generic method vocabulary, re-pin with `scripts/leak-scan --pin profile.zones.hr.method` and replace its line in `leak-scan.allow`; if it is personal, remove the pin and change the example's wording so it no longer matches.
**Verify:** `scripts/leak-scan --revs origin/main..HEAD` reports 0 hits and no pin warning; `npm run validate:examples` passes.
**Satisfies:** AC-08
**Why this model:** mechanical, but it touches the leak guard, so it must follow the pin rules in docs/architecture.md exactly.

### 2. Rewrite the recovery rule in all three files · ✅ · [backend] · Opus 5.5 / high
**Files:** `skills/endurance-coach/adapters/garmin.md`, `skills/endurance-coach/SKILL.md`, `skills/endurance-coach/references/athlete-data.md`
**Do:**
- garmin.md § Interpreting Garmin numbers (`:20`): replace "Training Readiness is the second opinion" with the roles and the factor reading from Critical decisions (recovery factor low + HRV/sleep fine = load, not physiology).
- garmin.md: add an **Intensity gate** subsection after § Oura vs Garmin disagreement flag, with the gate, the planned-quality-session rule (suggest, locked plan needs a yes, link notion.md) and the unavailable rule from Critical decisions.
- garmin.md § Oura vs Garmin disagreement flag (`:34-39`): keep the band line (`:36`); flag only across the 70 line, both numbers plus the lower score's driver; same side of 70 = no flag; Oura <70 stands. Delete `:39` ("follow-up ticket re-decides").
- garmin.md § Source of truth by phase (`:29-31`): "Recovery second opinion" row becomes the intensity gate (Garmin Training Readiness / recovery time, plus Body Battery, HRV status, sleep as context); Load row per Critical decisions. § Garmin load switch criteria (`:53-56`): race-date criterion, no "4 weeks", no "follow-up ticket". Check `:14` and `:21` still read true and leave them byte-identical if they do.
- SKILL.md `:46-47` and athlete-data.md `:22`: same rule in one or two sentences each (Oura decides go/no-go, Garmin recovery clock gates intensity, flag only across 70), pointing to garmin.md for detail. Edit only these sentences; all other rule text stays byte-identical (G-05). No `~`. List every changed line as `file:line` in this plan's Notes for the expected-diff list.
**Verify:** `npm run validate:examples` | manual: `git diff --stat` shows only the three files; `git grep -n -i -E "follow-up ticket|4 weeks|band apart" -- skills/` returns nothing; `git grep -n "70" -- skills/endurance-coach/SKILL.md skills/endurance-coach/references/athlete-data.md skills/endurance-coach/adapters/garmin.md` shows the same threshold wording in all three.
**Satisfies:** AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07
**Why this model:** G-05 and the three-file rule pattern (G-07) apply; the gate wording must be tight enough that a cold reader makes the same call every time.

### 3. Parity manifest, parity rules and leak scan · ✅ · [infra] · Sonnet 5.5 / medium
**Files:** `~/.endurance-coach/parity/2026-11-17-recovery-blend-manifest.yaml` (outside the repo, never committed), this plan's § Expected diffs and § Notes
**Do:**
- Write the manifest in the format of the `scripts/parity` header (`entries:` with `old` / `new` / `reason`), one entry per changed line from task 2's Notes; reason cites this plan file. Added lines use `old: null`, removed lines `new: null`.
- Run `scripts/parity rules --old origin/main --new HEAD --manifest <that file>` until it exits 0 (fix the manifest, never the rule text).
- Run `scripts/leak-scan --revs origin/main..HEAD` (G-09: `origin/main`, not `main`) and `npm run validate:examples`.
- Fill § Expected diffs for the parity gate with one bullet per changed section (no line text that quotes athlete values; there should be none).
**Verify:** `scripts/parity rules --old origin/main --new HEAD --manifest ~/.endurance-coach/parity/2026-11-17-recovery-blend-manifest.yaml` exits 0 with no UNMAPPED row and no unused entry; `scripts/leak-scan --revs origin/main..HEAD` reports 0 hits; `npm run validate:examples` passes.
**Satisfies:** AC-08
**Why this model:** mechanical mapping against an existing script whose header documents the format.

### 4. Cold read-only replay of five scenarios · ✅ · [backend] · Sonnet 5.5 / medium
**Files:** none in the repo. Results go to `~/.endurance-coach/parity/2026-11-17-recovery-blend-replay.md` (athlete data; never in the repo).
**Do:**
- Pull, once, Oura readiness (`skills/endurance-coach/scripts/oura readiness`) and Garmin `get_morning_training_readiness` for the days since `watch_switch.switch_date`. Pick five scenarios: (a) Oura ≥70, Garmin <60 on the recovery factor; (b) Oura ≥70, Garmin 60–69; (c) same side of 70, different band; (d) Oura <70, Garmin ≥70; (e) scenario (a) with Garmin marked as erroring. Write the snapshot to the results file.
- For each scenario, answer "what should I do today" using only the branch's three rule files and the snapshot, as a fresh reader (one subagent per scenario, given only those files and that day's numbers). No Notion, Strava or Garmin write call; no plan change.
- Check each answer against AC-01 to AC-06; record pass/fail per AC in the results file and only scenario letters and pass/fail in this plan's Notes (no scores or dates, G-08/G-10).
**Verify:** manual: every scenario's answer matches its ACs (a: AC-01, AC-02 if a quality session is planned; b and d: AC-04 / AC-05; c: AC-03; e: AC-06); no write call in the tool log; `scripts/leak-scan --revs origin/main..HEAD` still 0 hits.
**Satisfies:** AC-01, AC-02, AC-03, AC-04, AC-05, AC-06
**Why this model:** the point is that a mid-tier reader applies the text unaided; using Opus here would hide ambiguous wording.

## Expected diffs for the parity gate
<!-- task 3 fills this: one bullet per changed section -->
- `adapters/garmin.md` recovery bullet (Training Readiness): reworded from second opinion to recovery clock for recent watch load (1 line).
- `adapters/garmin.md` source table: "Recovery second opinion" row renamed "Intensity gate"; Load row now switches to Garmin acute/chronic load from the dated `load_switch.switch_date` (2 lines).
- `adapters/garmin.md` disagreement rules: flag only on opposite sides of 70, name the driver, Oura <70 stands (3 lines replaced).
- `adapters/garmin.md` new `### Intensity gate` subsection (heading and 5 bullets added; blank lines are not diffs).
- `adapters/garmin.md` load switch criteria: a one-off dated switch in profile.yaml `load_switch.switch_date` (after the first race past the watch switch date, written after a yes, never reverted by a new plan) instead of 4 weeks of data / follow-up ticket (3 lines; code-review fix 1).
- `adapters/garmin.md` Intensity gate after code review: trigger is Oura ≥70 with Garmin `score` <70 or `recovery_time_hours` > 24; driver = lowest factor; clock-already-clear wording; new Missing fields bullet. Interpreting bullet names the two load factors (code-review fixes 4-7).
- `adapters/oura.md` prime band: "unless the Garmin intensity gate applies" (1 line; code-review fix 2).
- `references/athlete-data.md` § Failure handling: new **Garmin unavailable** paragraph (1 line; code-review fix 3).
- `SKILL.md` recovery and workflow bullets: Garmin as intensity gate, gate-not-checked line when Garmin errors (2 lines).
- `references/athlete-data.md` default workflow line: gate wording plus link to the Intensity gate section (1 line).
- Peer review round 1 rule changes: gate applies only after the watch switch (source table row, "When it applies", SKILL.md recovery bullet); load switch offered at the first check-in after any past race date on or after the watch switch date (active plan, `past_races`, other plan folders); Oura unavailable bullet; Oura <70 bullet and flag driver/example wording; driver = lowest factor percent with tie rule; clock-0 wording; multi-day clock rescheduling; oura.md normal band carve-out; the two Garmin-unavailable paragraphs in athlete-data.md merged into one.
- The old garmin.md lines 40-54 only move (to 48-62), byte-identical, so they are not diffs.

## Post-release
Run with Arthur at /release, after merge to main.
0. **Squash the branch's commits before push** so no pushed commit carries the colliding example values (pre-push hook scans every pushed commit). Arthur's go-ahead needed.
1. **Update the installed plugin:** `git -C ~/endurance-coach switch main && git -C ~/endurance-coach pull --ff-only`, then update `endurance-coach@endurance-coach-marketplace`. Read the installed plugin's `adapters/garmin.md` (path from the plugin cache) and confirm the Intensity gate subsection is there. Must happen before plan.yaml `race.race_date`. (AC-09)
2. **Close the ticket:** Notion Status `Done`, Notes + merge commit.

## Review log
<!-- /peer-review appends one table per round -->
### Round 1 · peer review · leads: self (/code-review high), sonnet, haiku (fable failed to start: usage credits, re-dispatched on haiku)
| # | Lead | Sev | Finding | Verdict | Why / commit |
|---|---|---|---|---|---|
| 1 | self | High | load switch tied to the active plan's race date, reverts on a new plan, ignores the watch | ✅ | d2d1264: dated `load_switch.switch_date` |
| 2 | self | Med | oura.md prime band = green light for quality, contradicts the gate | ✅ | d2d1264 |
| 3 | self | Med | gate links a Garmin-unavailable rule that does not exist | ✅ | wrong premise: the paragraph existed; d2d1264 added a duplicate, merged in fabe8e0 |
| 4 | self | Med | "recovery factor" conflates two fields | ✅ | d2d1264 |
| 5 | self | Med | flag fires but quality call unstated | ✅ | d2d1264: gate trigger widened to score <70 (Arthur confirmed) |
| 6 | self | Low | gate on a clock that already cleared | ✅ | d2d1264, wording fixed again in fabe8e0 |
| 7 | self | Low | missing readiness fields | ✅ | d2d1264 |
| 8 | self | Low | example power zones off-Coggan | ✅ | d2d1264: FTP 198 W, zones recomputed |
| 9 | sonnet, haiku | High | gate runs before the watch switch on rest-only device data | ✅ | fabe8e0: gate needs `watch_switch.switch_date` |
| 10 | sonnet | High | load-switch trigger has no race source once a new plan replaces the old | ✅ | fabe8e0: active plan, `past_races` or other plan folders |
| 11 | sonnet, haiku | Med | two "Garmin unavailable" paragraphs | ✅ | fabe8e0: merged into the original |
| 12 | sonnet, haiku | Med | Oura unavailable undecided | ✅ | fabe8e0 |
| 13 | sonnet | Med | no driver source when Oura is lower | ✅ | fabe8e0 |
| 14 | sonnet | Med | flag example "back off" vs caution band | ✅ | fabe8e0: band placeholder |
| 15 | sonnet, haiku | Med | multi-day clock / target day for a moved session | ✅ | fabe8e0; no easy-run cap (easy session as planned) |
| 16 | sonnet, haiku | Med | "HRV and sleep fine" has no threshold, no tie rule | ✅ | fabe8e0: keyed on the lowest factor, ties name both |
| 17 | haiku | Med | score <70 with clock 0 says "clock is clear" while blocking | ✅ | fabe8e0 |
| 18 | haiku | High | oura.md normal band has no gate carve-out | ✅ | fabe8e0 |
| 19 | haiku | Med | Oura <70 with Garmin test firing: no quality call | ✅ | fabe8e0 |
| 20 | sonnet, haiku | Low | plan TL;DR / Expected diffs still describe the race-date switch | ✅ | fabe8e0 |
| 21 | sonnet | Low | ISO confirmation date in Critical decisions (G-10) | ✅ | fabe8e0; the Created header date is the plans' convention |
| 22 | sonnet | Med | replay verified rule text that later changed | ✅ | replay re-run on fabe8e0: 8/8 scenarios pass (results in the parity folder) |
| 23 | sonnet, haiku | Med | readiness factor key names invented, never checked | ❌ | `recovery_factor_percent` and `training_load_factor_percent` are the live `get_morning_training_readiness` keys (pulled at /explore) |
| 24 | sonnet | Low | `load_switch.switch_date` required inside an optional object | ❌ | mirrors `watch_switch`; object absent = not switched, the rule writes all three fields |
| 25 | sonnet, haiku | High | `--revs origin/main..HEAD` hits in early commits | ❌ | known; Post-release step 0 squash. Main's example values are labelled fictional, not a disclosure |
| 26 | haiku | Med | load switch needs only `watch_switch` though `owned` may be false | ❌ | the watch switch rule sets `owned: true` in the same yes |

Replay r2 open ambiguities (none blocking, for a next round): "flagged day" means gate-test day; clock ending late today; driver when both sources have factors, whether sleep/stress history count as body, label vs percent; Oura-unavailable vs the gate's Oura ≥70 condition; HTTP-style Garmin errors vs the re-auth advice; "Strava + Oura" vs "Oura-only" when Garmin is down; hedging quality when the gate was not checked; flag before the watch switch; Oura 60-69 with planned quality.
Parity rules PASS (24 entries), validate:examples and validate:local pass, worktree leak-scan clean.
Round 1: 22 fixed · 4 rejected · 0 ticketed · validate pass.

## Notes
<!-- deviations recorded during execution -->
- Task 1: the pin `profile.zones.hr.method` was personal, so it was removed from `scripts/leak-scan.allow`, not re-pinned. INDEX and WORKTREE scan clean. In `--revs origin/main..HEAD`, only early commits still hit, because the scan reads each commit's whole tree: 61e7fcf (`profile.zones.hr.z2.max`, `z3.max`, `z4.min`) and d0e9b66 (`profile.zones.power.z3.min`). History is not rewritten; squash is Arthur's call at /release (Post-release step 0). In tasks 3, 4 and Finish, hits in those known early commits are expected; any other hit is ⛔.
- Task 2 changed lines (old -> new): garmin.md:20, 30, 31, 37, 38, 39 rewritten in place; garmin.md:40-47 added (Intensity gate subsection); garmin.md:55->63 and 56->64 rewritten (load switch criteria); old garmin.md:40-54 moved to :48-62 byte-identical; SKILL.md:46, 47 rewritten; athlete-data.md:22 rewritten. Deviations: "recovery factor" defined at garmin.md:20 as recovery time plus acute load; the flag example uses <score> placeholders instead of numbers; SKILL.md:47 also states the gate-not-checked line for a connected-but-erroring Garmin.
- Task 4 replay (results in the parity folder under athlete data): scenarios a-e all pass: a AC-01 and AC-02, b/d AC-04, c AC-03, d AC-05, e AC-06. a and e used a synthetic planned quality session; e simulated the Garmin error. Rule-text ambiguities readers hit, none blocking, left for /code-review or a follow-up: (1) flag example says "back off" where a 60-69 score maps to caution; (2) no fallback for naming the driver when Oura is the lower score and gives no contributors; (3) whether sleep history counts as a driver; (4) "a day after the clock clears" is ambiguous, and multi-day clocks and an easy-run cap are unspecified; (5) when the flag fires but the gate does not, planned quality is not stated as allowed; (6) no hedge stated for planned quality when Garmin errors; (7) error vs no-data not distinguished, and garmin-mcp-auth advice can read as conflicting with the not-connected silence; (8) whether acute_load in the readiness payload falls under the load-metric rule.
- /code-review (high) fixes, 8 findings: (1) load switch is now a one-off dated profile key `load_switch.switch_date` (optional in `schemas/profile.schema.json`, null in the example) instead of "the active plan's race date has passed", which reverted on a new plan and ignored the watch; (2) oura.md prime band defers to the gate; (3) athlete-data.md § Failure handling gains the Garmin-unavailable rule the gate links to; (4) the two load factors are named fields; (5) gate trigger widened (confirmed by Arthur, now in Critical decisions) from "score <60 with recovery factor lowest" to "score <70", so every flagged day with Oura on top is gated and no flagged day is left without a quality call; (6) clock-already-clear wording; (7) missing readiness fields never count as 0; (8) example power zones: the main values collided with real HR bounds, so the example FTP moved to 198 W with zones recomputed as 7-zone Coggan. Parity manifest regenerated (23 entries, PASS); previous manifest kept as `.bak-task3`.
