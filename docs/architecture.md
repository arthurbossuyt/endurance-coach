# Architecture

How the endurance-coach plugin is laid out and how to extend it. Built on branch `feat/public-plugin-repo-split`; plan and decisions: [docs/plans/2026-10-17-public-plugin-repo-split.md](plans/2026-10-17-public-plugin-repo-split.md). Traps: [docs/_gotchas.md](_gotchas.md).

## Layout

| Path | What |
|---|---|
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | The repo root is the plugin. The marketplace lists it with `source: "./"`. |
| `skills/endurance-coach/SKILL.md` | Operating manual: workflows, when to pull data, fuel rules. |
| `skills/endurance-coach/references/` | Generic coaching knowledge, plus `athlete-data.md` (where athlete data lives, the no-profile rule, the fueling profile rules, the adapter list). |
| `skills/endurance-coach/adapters/` | One file per data source or output: `strava.md`, `garmin.md`, `oura.md`, `notion.md`. |
| `skills/endurance-coach/scripts/oura` | Oura v2 CLI. Run by path (G-03). Token: `$OURA_TOKEN_FILE`, else `<home>/secrets/oura`. |
| `schemas/` | JSON Schemas v0 (draft 2020-12) for `profile`, `plan`, `session-log`. |
| `examples/triathlete/` | Fictional athlete home; CI validates it. |
| `scripts/validate.mjs` | `npm run validate:examples` (CI) and `npm run validate:local` (local only, reads `$ENDURANCE_COACH_HOME` or `~/.endurance-coach`). Errors print key paths, never values. |
| `scripts/leak-scan`, `scripts/leak-scan.allow` | Local-only leak scan of all history (or, with `--revs`, the given commits) against the real athlete home. Header comment documents every needle. |
| `scripts/parity`, `docs/parity-brief.md` | Scripted parity gate (`rules`, `gate`, `verify`) and the fixed brief for the question runs. Manifest and results live in `~/.endurance-coach/parity/`, never in the repo. |
| `.githooks/pre-push` | Opt-in hook (`git config core.hooksPath .githooks`): leak-scans the commits a push sends, blocks on any hit, refuses `archive/*` branches, skips without a profile. |
| `scripts/lib/athlete-home.cjs` | Shared home resolution, plan discovery and YAML loading for both scripts. |
| `.github/workflows/` | `validate.yml` (examples, Oura script on Linux) and `gitleaks.yml`. Actions pinned to SHAs. |

## Athlete data

Never in the repo. It lives in `<home>` = `$ENDURANCE_COACH_HOME` or `~/.endurance-coach/`: `profile.yaml` (stable facts), `plans/<id>/plan.yaml` (block rules, `id` must equal the folder name), optional `session-log.yaml`, and `secrets/`. Skill text names values by key path (`profile.yaml weight.value`), never by value. With no `profile.yaml`, the coach answers generically and calls no data source.

## Extending

- **New adapter:** add `adapters/<name>.md`, link it from `athlete-data.md` § Adapters, and say when it is used only if connected (see `garmin.md`). No `.mcp.json` ships.
- **New profile or plan key the skill reads:** add it to the schema (required only if every athlete must have it), add an invented value to `examples/triathlete/`, then run `npm run validate:examples` and `npm run validate:local`.
- **Leak-scan hit on generic text:** confirm the value is skill vocabulary, then `scripts/leak-scan --pin <key path>` and add the printed line to `leak-scan.allow`. Never pin a personal value.
- **Before any push:** the pre-push hook must be on; it blocks on any `leak-scan` hit in the pushed commits, index or worktree. A full `scripts/leak-scan` in a clone with the local `archive/*` branches hits on their pre-squash history; scan a fresh clone of the remote instead.

## Decisions to respect

- Rule text moves verbatim (G-05). Deliberate rewording goes on the plan's expected-diff list.
- Rule-text edits re-run `scripts/parity`.
- Arthur's live skill is a separate frozen copy until the parity gate passes (G-06).
- Schemas are v0 and fit Arthur plus the example athlete; a minimal profile for new athletes is onboarding work (child b).
- The Notion write pattern is Arthur's workflow, moved unchanged; generalising outputs is child (d).
