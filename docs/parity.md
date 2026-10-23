# Parity gate

Checks that two copies of the endurance-coach skill give the same coach before Arthur's live copy is replaced by this plugin. Plan: [docs/plans/2026-10-19-coach-parity-scripted-gate.md](plans/2026-10-19-coach-parity-scripted-gate.md). Usage and exit codes are in the header of `scripts/parity` (0 pass, 1 gate fail, 2 setup error); logic is in `scripts/lib/parity.cjs`.

## What it checks
- `rules --old <dir|git ref> --new <dir|git ref> [--manifest <yaml>]`: the multiset of non-blank lines of `SKILL.md`, `references/*.md`, `adapters/*.md`, with relative link targets reduced to the file name. Every diff line must be matched by a manifest entry; an unmatched line or an unused entry fails. Rows print `file:line` only, never line text.
- `answers --dir <run dir>`: `old.md` vs `new.md`, blocks `## Q1`..`## Q5`, seven keys each (`session`, `intensity`, `fuel.before|during|after|log`, `shoe`), compared literally after trimming. Empty values and missing keys fail; continuation lines under a key are part of its value.
- `gate ... --dir <run dir> [--plan <id>]` runs both and writes `result.md`; `verify --dir <run dir>` re-hashes it and fails if anything changed or the result is from another day. The stamp covers both rule trees, `old.md`, `new.md`, `fixture.md`, the manifest, `profile.yaml` and one `plan.yaml` (`--plan`, else the only plan, else the last id).

## Where things live
- Manifest, fixture, answers and results: `~/.endurance-coach/parity/` (never in the repo; old-only lines can quote pantry products).
- The fixed brief for the question runs: [docs/parity-brief.md](parity-brief.md). It runs in an interactive desktop session (headless `claude -p` can't reach Notion or Strava, see G-02), snapshots data once, then runs each pass in its own fresh subagent on the fixture only.

## Extending
- A deliberate rule-text change: add a manifest entry with a reason citing its source, then re-run `scripts/parity rules`. Never add manifest lines to the repo.
- Changing the answer format: update `ANSWER_KEYS` in `scripts/lib/parity.cjs` and the brief together.
- Out of scope so far: a CI rule-change gate, and the 51-page fuel-target rebuild.
