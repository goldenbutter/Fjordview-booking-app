# Agent handoffs

Inter-agent communication. Each file in this folder is a directed message:
**from** one agent session **to** another (or to "next-agent" when the recipient is unspecified).

See [`../AGENT-PROTOCOL.md`](../AGENT-PROTOCOL.md) section 3 for the file format, frontmatter convention, and status lifecycle.

**Important:** session summaries (each agent's own work log) live in [`../agent-reports/`](../agent-reports/), not here.

## Quick rules

- Filename: `YYYY-MM-DD-<from-agent>-<from-session>-to-<to-agent>-<topic>.md`
- Required YAML frontmatter (see protocol §3)
- Status lifecycle: `open` → `acknowledged` → `completed` (or `superseded`)
- Never silently rewrite an open handoff; either amend at the bottom or write a follow-up
