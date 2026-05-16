# .claude/ — Claude Code project-local configuration

This folder holds **Claude Code's** project-local files (`settings.json`, hooks, agent definitions, scratch notes specific to Claude's sessions on this repo).

Everything in this folder **except this README** is gitignored — those files are per-developer / per-installation state, not part of the shared codebase.

## What goes here

- `settings.json` — Claude Code project settings (model, permissions, etc.)
- `settings.local.json` — per-user overrides
- `hooks/` — Claude-specific shell hooks (e.g. pre-tool-use, post-tool-use)
- Anything else Claude Code or future Claude sessions want to persist locally

## What doesn't go here

- **Cross-agent rules** — those live in [`../_docs/AGENT-PROTOCOL.md`](../_docs/AGENT-PROTOCOL.md). This folder is Claude-only; the protocol applies to all agents.
- **Session summaries** — those live in [`../_docs/agent-reports/<date>/`](../_docs/agent-reports/). Tracked in git.
- **Inter-agent handoffs** — those live in [`../_docs/agent-handoffs/`](../_docs/agent-handoffs/). Tracked in git.
- **Architecture decisions** — those live in [`../_docs/adr/`](../_docs/adr/). Tracked in git.

## Symmetric folder for Codex

Codex sessions can use a parallel `.codex/` folder at the project root for their own project-local config. Both follow the same gitignore pattern (everything ignored except a README).
