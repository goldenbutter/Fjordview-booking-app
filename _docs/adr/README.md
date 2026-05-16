# Architecture Decision Records (ADRs)

This folder captures **why** we made significant architectural choices on this project. Each ADR is a short, dated, numbered, immutable record of a decision.

## What goes here

- Choices about **how we work** that span multiple sessions and agents (e.g. the multi-agent coordination protocol, branch naming, folder structures)
- Choices about **technical architecture** that constrain future work (e.g. "we use Drizzle, not Prisma", "we don't fork the codebase per client")
- Choices that **reverse a previous decision** (write a new ADR that supersedes the old one — don't edit the old one)

## What doesn't go here

- **Session summaries** — those live in [`../agent-reports/<date>/`](../agent-reports/). One per session, append-only, project-level execution log.
- **Inter-agent messages** — those live in [`../agent-handoffs/`](../agent-handoffs/). Directed messages from one agent to the next, with active/archive lifecycle.
- **Day-to-day code decisions** — small choices made within one session that are obvious from the code or covered by the commit message. Don't ADR every refactor.

## File naming

`NNNN-short-title.md` where `NNNN` is a 4-digit sequential number starting at `0001`.

- `0001-multi-agent-coordination-protocol.md`
- `0002-folder-structure-for-reports-and-handoffs.md`
- `0003-context-budget-self-management.md`

Numbers are never reused or renumbered. If an ADR is superseded, mark its `status: superseded` and link to the new one.

## Frontmatter + structure

Every ADR has the following YAML frontmatter and section template. Keep each ADR readable in under 2 minutes.

```yaml
---
id: NNNN
title: <short title>
status: proposed | accepted | deprecated | superseded
date: <ISO 8601 date>
deciders: <who decided — humans + agent sessions involved>
supersedes: <list of ADR numbers, if any>
superseded_by: <ADR number, if this one was replaced>
---
```

```markdown
## Context
One paragraph: what problem are we solving? What forces are at play?

## Decision
What did we choose? State it clearly in one paragraph or a short list.

## Consequences
- Positive consequence 1
- Positive consequence 2
- Negative trade-off accepted
- Negative trade-off accepted

## Alternatives considered
- **Alternative A** — why rejected
- **Alternative B** — why rejected

## Notes (optional)
Anything that would help a future reader understand the context (e.g. specific incident that triggered the decision, links to PRs, related ADRs).
```

## Why ADRs at all

Six months from now, nobody will remember why we use `claude/` and `codex/` branch prefixes, or why handoffs split into `active/` + `archive/`, or why we monitor context at 50/70/90% thresholds. Without ADRs the rationale dies with the agent session that decided it. With ADRs, anyone — human or agent — can read the file and reconstruct the reasoning in minutes.

ADRs are an industry-standard pattern; for background see Michael Nygard's original 2011 post on the idea, or any team's `docs/adr/` folder you can find on GitHub.
