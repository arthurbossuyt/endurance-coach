# endurance-coach

Claude Code plugin: an evidence-based endurance coach. Read [docs/architecture.md](docs/architecture.md) before changing anything, and the entries in [docs/_gotchas.md](docs/_gotchas.md) that apply.

- Athlete data (`~/.endurance-coach/`, `~/oura token.txt`) never enters the repo, a commit message, an example or your output. Refer to values by key path only.
- Before any push: `scripts/leak-scan` shows no `WORKTREE`, `INDEX`, `PATH` or `REF` hit; `npm run validate:examples` passes.
- Skill rule text moves verbatim (parity gate); never edit `~/.claude/skills/endurance-coach` from a branch.
- No tests beyond validation; Verify steps use the npm scripts, `actionlint`, `claude plugin validate .` and the stream-json init event for load checks (G-02).
