# endurance-coach

Claude Code plugin: an evidence-based endurance coach. Read [docs/architecture.md](docs/architecture.md) before changing anything, and the entries in [docs/_gotchas.md](docs/_gotchas.md) that apply.

- Athlete data (`~/.endurance-coach/`, tokens in its `secrets/` included) never enters the repo, a commit message, an example or your output. Refer to values by key path only.
- Before any push: the pre-push hook is on (`git config core.hooksPath .githooks`, once per clone) and `npm run validate:examples` passes. The hook runs `scripts/leak-scan --revs` on the pushed commits and blocks on any hit; never bypass it with `--no-verify`. Never push `archive/*` branches (pre-squash history; a full `scripts/leak-scan` hits on them by design).
- Skill rule text moves verbatim (parity gate); never edit `~/.claude/skills/endurance-coach` from a branch.
- No tests beyond validation; Verify steps use the npm scripts, `actionlint`, `claude plugin validate .` and the stream-json init event for load checks (G-02).
