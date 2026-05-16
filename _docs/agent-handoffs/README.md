# Agent handoffs

Inter-agent communication. Each file in this folder is a directed message: **from** one agent session **to** another (or to "next-agent" when the recipient is unspecified).

See [`../AGENT-PROTOCOL.md`](../AGENT-PROTOCOL.md) §3 for the full convention.

## Folder layout

```
agent-handoffs/
├── README.md           ← this file
├── active/             ← open handoffs waiting to be picked up
└── archive/
    └── YYYY-MM-DD/     ← handoffs filed here when COMPLETED or SUPERSEDED (folder = completion date)
```

## Quick rules

- New handoffs go in `active/`. Filename: `<from-agent>-<from-session>-to-<to-agent>-<topic>.md` — **no date prefix** (folder location encodes status).
- Required YAML frontmatter (see protocol §3) — at minimum: `from`, `to`, `date`, `topic`, `status`, `branch_at_handoff`, `read_first`.
- Lifecycle: `open` → `acknowledged` → `completed`. When `completed`, MOVE the file from `active/` to `archive/<today>/`. Don't rename.
- If superseded: same — move to `archive/<today>/` with `status: superseded` and `superseded_by:` pointing at the replacement.
- Never silently rewrite an open handoff; either amend at the bottom with `## Scope amendment <date>` or supersede it.

## Looking for what's open right now?

Read everything in [`active/`](active/). That's the entire active workload at a glance.

## Looking for what was finished on a particular day?

Look in `archive/<that-date>/`.

**Important:** session summaries (each agent's own work log) live in [`../agent-reports/<date>/`](../agent-reports/), not here. Handoffs are for messages between agents; summaries are for self-documentation.
