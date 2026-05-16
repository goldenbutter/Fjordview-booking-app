# Agent Protocol — Coordination for multi-agent work on this repo

> **Audience:** any agent (Claude, Codex, OPUS, Sonnet, future) or human collaborator working on this repository.
> **Status:** authoritative. Conflicts with anything else (CLAUDE.md, AGENTS.md, READMEs) are resolved in this file's favour.
> **Read this first** before starting any session.
> **Architectural rationale** for each rule below lives in [`adr/`](adr/) — see [`0001`](adr/0001-multi-agent-coordination-protocol.md) for why this protocol exists, [`0002`](adr/0002-folder-structure-for-reports-and-handoffs.md) for the folder layout, [`0003`](adr/0003-context-budget-self-management.md) for the context-budget rules.

This codebase is worked on by multiple agents and the human owner (Bithun). To avoid duplicate work, silent rewrites, merge collisions, and context-budget cliffs, every agent follows the same protocol.

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

## 2. Session summaries — `_docs/agent-reports/<YYYY-MM-DD>/`

Every session that produces commits MUST produce a session summary.

**Folder structure:** one folder per calendar date (the day the session ran, in the project's local time, `Europe/Oslo`).

**Filename inside the folder:** `<agent>-<session-id>-<short-title>.md` — no date prefix needed; the folder already encodes it.

Examples:
- `_docs/agent-reports/2026-05-16/opus-s01-execution-summary.md`
- `_docs/agent-reports/2026-05-16/codex-phase-1.md`
- `_docs/agent-reports/2026-05-17/claude-s02-stripe-wiring.md`

If a session spans midnight, the summary lives in the **start-date** folder. Add a note at the top if the work continued into the next day.

**Contents (recommended structure):**
- **Metadata header** — session id, agent name + version, date, active time window with absolute timestamps (`Europe/Oslo` CEST), branch, token-budget bucket if relevant (see §5)
- **Session timeline at a glance** — table of commits with absolute timestamps
- **One entry per work slice** — append-only. Never overwrite earlier entries.
- **Each entry** cites: time window, specific commit hashes, files touched, decisions made with rationale, verification evidence (lint/build/test results), what was deferred and why
- **End-state** — branch state, acceptance-criteria score (if applicable), pending items

**Important:** the session summary is the agent's own work log. It is NOT for messages to other agents. Messages between agents go in `agent-handoffs/`.

---

## 3. Agent handoffs — `_docs/agent-handoffs/{active, archive/<YYYY-MM-DD>}/`

When you finish a session and the next session (you or someone else) needs context to continue, write a handoff note.

### Folder structure

```
_docs/agent-handoffs/
├── README.md
├── active/                          ← open handoffs waiting for an agent to pick up
│   ├── opus-s01-to-codex-stripe-and-emails.md
│   └── codex-s02-to-claude-review-request.md
└── archive/                         ← completed / superseded handoffs, filed by COMPLETION date
    ├── 2026-05-16/
    │   └── opus-s01-to-next-agent-deferred-items.md
    └── 2026-05-18/
        └── opus-s01-to-codex-stripe-and-emails.md   ← was opened 16th, completed 18th
```

### Filename

`<from-agent>-<from-session>-to-<to-agent>-<topic>.md` — no date prefix (the folder location encodes the active/completion-date status).

If recipient is unspecified, use `to-next-agent`.

### Lifecycle

1. **Open** — sender creates the handoff in `active/` with `status: open`. File stays in `active/` indefinitely until picked up.
2. **Acknowledged** — recipient changes `status: acknowledged` + adds `date_acknowledged:` field. File still in `active/`.
3. **Completed** — recipient changes `status: completed` + adds `date_completed:` + `final_commit:`. **Move the file to `archive/<date_completed>/`.** No rename — just relocation.
4. **Superseded** — anyone marks `status: superseded` + adds `superseded_by: <path-to-replacement>`. Move to `archive/<date>/`.

The user can glance at `_docs/agent-handoffs/active/` at any time and instantly see what's open. No date-scanning.

### Frontmatter (required YAML at the top)

```yaml
---
from: <agent type + session id>      # e.g. "opus (S01)" or "codex (phase 5)"
to: <recipient>                      # e.g. "codex", "claude", "next-agent", "human"
date: <ISO 8601 with timezone>       # e.g. "2026-05-16T20:45:00+02:00" — when it was OPENED
topic: <one-line subject>
status: open                         # open | acknowledged | completed | superseded
branch_at_handoff: <git branch name where the work was last committed>
read_first:                          # ordered list of docs the recipient must read
  - _docs/AGENT-PROTOCOL.md
  - _docs/agent-reports/<YYYY-MM-DD>/<latest-summary>.md
# These are added by the recipient as the handoff progresses:
# date_acknowledged: <ISO 8601>
# date_completed:    <ISO 8601>
# final_commit:      <hash>
# superseded_by:     <relative-path-to-new-handoff>
---
```

### Body sections (recommended)

- **Context** — one paragraph: what state is the repo in, what was just finished
- **Goal** — what the recipient should accomplish
- **Boundaries** — what the recipient should NOT change
- **Pre-work** — anything the recipient must do before coding (env vars, accounts, keys, migrations)
- **Verification gate** — how the recipient confirms success (lint clean, build clean, smoke test passes, etc.)
- **Open questions** — anything the recipient should surface to the human before deciding

### Mid-work scope changes

Don't silently rewrite an open handoff. Either:
- Add a comment section at the bottom of the file marked `## Scope amendment <date>` (preserves the original intent above)
- Or close the handoff as `superseded` and write a new one with `supersedes:` pointing back

---

## 4. Boundary respect

- **Always read the latest entry in `_docs/agent-reports/`** (descend into the newest date folder) **before starting.** Spend 5 minutes reading; save 5 hours of rework.
- **Always check `_docs/agent-handoffs/active/`** for any handoff addressed to you or `to-next-agent`.
- **Don't redo work documented in a previous summary** unless you have a specific reason and have surfaced it to the human first.
- **If you disagree with a previous agent's approach**, write your concern as a comment in the open handoff (or a new handoff back to the human). Do not silently rewrite.
- **Don't touch another agent's open branch** unless you've coordinated with them or the human.
- **Don't delete files in `_docs/`** without explicit instruction. They are the project's institutional memory.

---

## 5. Context budget self-management

Every agent has a finite context window. Running out of it mid-slice produces ugly handoffs and lost work. Every agent monitors its own usage and acts proactively.

### Context buckets (use percentage of YOUR model's context window)

| Bucket | % of context used | Behaviour |
|---|---|---|
| 🟢 **Green** | 0 – 50% | Normal work. Take on new slices. |
| 🟡 **Yellow** | 50 – 70% | Finish the current slice cleanly. Don't take on new unrelated work. Start mentally sketching what would go into a handoff if needed. |
| 🟠 **Orange** | 70 – 90% | Stop accepting new work. Complete the current sub-task to a clean stopping point. **Write a handoff to `_docs/agent-handoffs/active/` listing everything not yet done.** Tell the human "context budget is approaching limit — handoff is filed at `<path>`, ready to spawn fresh agent." |
| 🔴 **Red** | 90 – 100% | Stop immediately. Don't start anything new. Write a minimal handoff with current state + what's left, even if rough. Go idle. |

### Reference window sizes (as of 2026-05-16)

| Agent | Approx. window | Yellow threshold | Orange threshold | Red threshold |
|---|---:|---:|---:|---:|
| Claude (Opus 4.7 / Sonnet 4.6) via Claude Code | 1 000 000 tokens | 500k | 700k | 900k |
| Codex CLI | 250 000 tokens | 125k | 175k | 225k |

These numbers shift as models evolve. Use percentage of your actual context, not absolute tokens.

### Reporting context in chat

After each meaningful tool-use round, end your chat reply with a one-line footer:

```
> Context: 🟢 ~35% used · 650k tokens remaining (Opus 4.7, 1M window)
```

The emoji shows the bucket. The percentage is a self-estimate (you don't have exact telemetry — estimate based on conversation length + tool output size). The remaining tokens help the human decide whether to keep going or spawn fresh.

If you cross into Orange or Red mid-response, surface it at the top of the response too — not just the footer.

### Proactive handoff at Orange threshold

When you cross into Orange:

1. Finish the current sub-task to a coherent stopping point (don't abandon mid-edit).
2. Run lint + build if you changed source code, so the handoff doesn't ship broken state.
3. Commit current work with a descriptive message.
4. Write a handoff in `_docs/agent-handoffs/active/` with:
   - `from:` you
   - `to: next-agent`
   - The pending items in priority order
   - Pre-work the next agent needs
5. Tell the human in chat: "I've crossed into the Orange context bucket. I've committed at `<hash>` and filed a handoff at `<path>`. Spawn a fresh agent when ready — they should follow the protocol and pick up the handoff."
6. Go idle. Don't take on more work in this session.

The principle: **the moment context becomes the bottleneck, the cheapest move is to stop and hand off cleanly. Squeezing 5% more output out of a 90%-full session reliably produces sloppy work and broken handoffs.**

---

## 6. Commit, PR, merge

- Commit messages: short imperative subject (e.g. `feat: wire Stripe Checkout`). No body unless meaningful. **Never** add Co-Authored-By lines referencing AI tools — the human author is the only attributed author.
- PRs: pull from `main` before opening (`git pull origin main --rebase`). PR title matches the topic in your branch name. PR body links to the relevant session summary entry.
- Merge: squash if many small WIP commits; otherwise normal merge.
- Delete branch after merge (local + remote).

---

## 7. Hand-off in practice — minimal example

After finishing a session:

1. Write the session summary in `_docs/agent-reports/<today>/<your-file>.md`.
2. If the next agent (or human) needs to continue, write a handoff in `_docs/agent-handoffs/active/`.
3. Commit both, push the branch, open the PR.
4. In the PR description, link to the summary entry and the handoff.

The human (or the next agent) reads:
1. `_docs/AGENT-PROTOCOL.md` (this file — once, to remember the rules)
2. The newest handoff in `_docs/agent-handoffs/active/` addressed to them
3. The session summary entry it references

Then they start work.

When they finish a handoff, they MOVE its file from `active/` to `archive/<today>/` (no rename).

---

## 8. Telling agents to follow this protocol

When the human spawns a new agent session in this repo, the kickoff prompt should include:

> Read `_docs/AGENT-PROTOCOL.md` first. Then look at `_docs/agent-handoffs/active/` for any handoff addressed to you or `to-next-agent`. Then read the latest entry in `_docs/agent-reports/<latest-date>/`. Follow the protocol throughout your session — branch naming, session summary, handoffs, context-budget self-management.

If the agent uses persistent memory (Claude does, via `~/.claude/memory/`), it should remember this convention for future sessions on the same repo.

---

## 9. Why this exists

Single-agent work doesn't need this. Multi-agent work without this gets expensive fast:

- Two agents fix the same bug differently. Merge conflict, time wasted reconciling.
- One agent rewrites a previous agent's work without understanding why it was that way. Regressions.
- An agent burns through its context budget unaware, produces a low-quality final commit, leaves no handoff for the next session.
- Nobody knows what state the repo is in. Reviewing a PR requires reading the entire git history first.

With this protocol, every agent's session is self-contained, auditable, resumable by anyone, and bounded by its own context limits before things get sloppy.
