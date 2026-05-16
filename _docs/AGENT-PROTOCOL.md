# Agent Protocol — Coordination for multi-agent work on this repo

> **Audience:** any agent (Claude, Codex, OPUS, Sonnet, future) or human collaborator working on this repository.
> **Status:** authoritative. Conflicts with anything else (CLAUDE.md, AGENTS.md, READMEs) are resolved in this file's favour.
> **Read this first** before starting any session.

This codebase is worked on by multiple agents and the human owner (Bithun). To avoid duplicate work, silent rewrites, and merge collisions, every agent follows the same protocol.

---

## 1. Branch hygiene

| Author | Branch prefix | Example |
|---|---|---|
| Codex | `codex/` | `codex/stripe-integration` |
| Claude (any flavour: Opus, Sonnet, Haiku, future) | `claude/` | `claude/admin-write-paths` |
| Human directly | `bithun/` or any descriptive prefix | `bithun/hotfix-payment-bug` |

Rules:
- `main` is stable. **Never** commit directly to `main`.
- One branch per logical slice. Don't bundle unrelated changes.
- Branch from the latest `main` (run `git pull` first).
- After your PR merges, delete the branch (local + remote).
- If a previous agent's branch is still open and unmerged, **do not** rebase or rewrite it. Either wait for it to merge, or coordinate with the human.

---

## 2. Session summary — `_docs/agent-reports/`

Every session that produces commits MUST produce a session summary.

**Filename:** `YYYY-MM-DD-<agent>-<session-id>-<short-title>.md`

Examples:
- `2026-05-16-opus-s01-execution-summary.md`
- `2026-05-16-codex-phase-1.md`
- `2026-05-17-claude-s02-stripe-wiring.md`

**Contents (recommended structure):**
- **Metadata header** — session id, agent name + version, date, active time window, branch, token budget if relevant
- **Session timeline at a glance** — table of commits with absolute timestamps (use the project's local timezone, e.g. `Europe/Oslo` CEST = UTC+2 in summer)
- **One entry per work slice** — append-only. Never overwrite earlier entries.
- **Each entry** cites: time window, specific commit hashes, files touched, decisions made with rationale, verification evidence (lint/build/test results), what was deferred and why
- **End-state** — branch state, acceptance-criteria score (if applicable), pending items

**Important:** the session summary is the agent's own work log. It is NOT for messages to other agents. Messages between agents go in `agent-handoffs/`.

---

## 3. Agent handoffs — `_docs/agent-handoffs/`

When you finish a session and the next session (you or someone else) needs context to continue, write a handoff note.

**Filename:** `YYYY-MM-DD-<from-agent>-<from-session>-to-<to-agent>-<topic>.md`

Examples:
- `2026-05-16-opus-s01-to-codex-stripe-and-emails.md`
- `2026-05-17-codex-s02-to-claude-room-crud-review-request.md`
- `2026-05-18-claude-s03-to-next-pickup-deferred-items.md`

When the recipient is unspecified (any future agent can pick it up), use `to-next-agent`.

**Required frontmatter (YAML at the top of the file):**

```yaml
---
from: <agent type + session id>      # e.g. "opus (S01)" or "codex (phase 5)"
to: <recipient>                      # e.g. "codex", "claude", "next-agent", "human"
date: <ISO 8601 with timezone>       # e.g. "2026-05-16T20:45:00+02:00"
topic: <one-line subject>
status: open | acknowledged | completed | superseded
branch_at_handoff: <git branch name where the work was last committed>
read_first:                          # ordered list of docs the recipient must read
  - _docs/AGENT-PROTOCOL.md
  - _docs/agent-reports/<latest-summary>.md
---
```

**Body sections (recommended):**

- **Context** — one paragraph: what state is the repo in, what was just finished
- **Goal** — what the recipient should accomplish
- **Boundaries** — what the recipient should NOT change
- **Pre-work** — anything the recipient must do before coding (env vars, accounts, keys, migrations)
- **Verification gate** — how the recipient confirms success (lint clean, build clean, smoke test passes, etc.)
- **Open questions** — anything the recipient should surface to the human before deciding

**Status lifecycle:**

| Status | Set by | When |
|---|---|---|
| `open` | Sender | When handoff is written |
| `acknowledged` | Recipient | When they pick up the work (add `date_acknowledged:` field) |
| `completed` | Recipient | When work is done (add `date_completed:` + `final_commit:` fields) |
| `superseded` | Anyone | If the handoff is obsolete (link to its replacement in a `superseded_by:` field) |

**Discovering scope changes mid-work:** don't silently rewrite an open handoff. Either:
- Add a comment section at the bottom of the file marked `## Scope amendment <date>` (preserves the original)
- Or close the handoff as `superseded` and write a new one with `supersedes:` pointing back

---

## 4. Boundary respect

- **Always read the latest entry in `_docs/agent-reports/` before starting.** Spend 5 minutes reading; save 5 hours of rework.
- **Don't redo work documented in a previous summary** unless you have a specific reason and have surfaced it to the human first.
- **If you disagree with a previous agent's approach**, write your concern as a comment in the open handoff (or a new handoff back to the human). Do not silently rewrite.
- **Don't touch another agent's open branch** unless you've coordinated with them or the human.
- **Don't delete files in `_docs/`** without explicit instruction. They are the project's institutional memory.

---

## 5. Commit, PR, merge

- Commit messages: short imperative subject (e.g. `feat: wire Stripe Checkout`). No body unless meaningful. **Never** add Co-Authored-By lines referencing AI tools — the human author is the only attributed author.
- PRs: pull from `main` before opening (`git pull origin main --rebase`). PR title matches the topic in your branch name. PR body links to the relevant session summary entry.
- Merge: squash if many small WIP commits; otherwise normal merge.
- Delete branch after merge (local + remote).

---

## 6. Hand-off in practice — minimal example

After finishing a session:

1. Write the session summary in `_docs/agent-reports/`.
2. If the next agent (or human) needs to continue, write a handoff in `_docs/agent-handoffs/`.
3. Commit both, push the branch, open the PR.
4. In the PR description, link to the summary entry and the handoff.

The human (or the next agent) reads:
1. `_docs/AGENT-PROTOCOL.md` (this file — once, to remember the rules)
2. The newest handoff addressed to them
3. The session summary entry it references

Then they start work.

---

## 7. Telling agents to follow this protocol

When the human spawns a new agent session in this repo, the kickoff prompt should include:

> Read `_docs/AGENT-PROTOCOL.md` first. Then read the most recent handoff addressed to you (or `to-next-agent`) in `_docs/agent-handoffs/`. Follow the protocol throughout your session — branch naming, session summary, handoffs.

If the agent uses persistent memory (Claude does, via `~/.claude/memory/`), it should remember this convention for future sessions on the same repo.

---

## 8. Why this exists

Single-agent work doesn't need this. Multi-agent work without this gets expensive fast:

- Two agents fix the same bug differently. Merge conflict, time wasted reconciling.
- One agent rewrites a previous agent's work without understanding why it was that way. Regressions.
- Nobody knows what state the repo is in. Reviewing a PR requires reading the entire git history first.

With this protocol, every agent's session is self-contained, auditable, and resumable by anyone.
