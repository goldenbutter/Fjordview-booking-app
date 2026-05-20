# Codex S03 - Protocol Onboarding

> **Session:** Codex S03 protocol/onboarding  
> **Agent:** Codex  
> **Start date:** 2026-05-16  
> **Continuation note:** Follow-up verification and branch cleanup continued on 2026-05-17. Per protocol, this report lives in the start-date folder.  
> **Initial branch:** `codex/protocol-pointer`  
> **Context bucket:** Green during the original 2026-05-16 work; Yellow during the 2026-05-17 follow-up.

## Session Timeline

| Time (CEST) | Commit / State | Work |
|---|---|---|
| 2026-05-16 21:36 | uncommitted on `codex/protocol-pointer` | Read `_docs/AGENT-PROTOCOL.md`, ADR 0001, ADR 0003, active handoff, and latest report before changing files. |
| 2026-05-16 21:36-21:45 | uncommitted on `codex/protocol-pointer` | Created the Codex read-first pointer and project-local `.codex/` documentation. |
| 2026-05-16 later | `7512c8e` by Claude S02 | `.codex/README.md` and ADR 0004 were swept into a Claude-owned commit. This was a protocol-boundary slip already noted in Opus audit/report files; the files themselves were kept because the content is useful and avoids duplicate re-commits. |
| 2026-05-17 18:10-18:17 | no file commit | Verified obsolete Codex branches against `origin/main`, then deleted only Codex-owned obsolete branches locally/remotely. |
| 2026-05-17 18:20 | uncommitted report | Added this retrospective S03 report so the Codex protocol/onboarding work is traceable by session id. |

## Work Slice: Codex Protocol Pointer

Artifacts created by Codex S03:

- `AGENTS.md`
- `.codex/README.md`
- `_docs/adr/0004-codex-project-local-onboarding.md`

Purpose:

- Make future Codex sessions discover the multi-agent coordination protocol automatically from the project root.
- Mirror the Claude project-local setup with a `.codex/` directory for Codex-only hooks, scratch, local state, and helper config.
- Record the Codex onboarding/config convention as ADR 0004 because it is architecture/process-level documentation, not application code.

Important classification:

- No application code changed.
- No runtime behavior changed.
- No database schema changed.
- This was process/config/architecture documentation only.

## Verification

Original 2026-05-16 checks:

- Read back `AGENTS.md`.
- Read back `.codex/README.md`.
- Confirmed the initially-created agent report was misplaced for an architecture/process-only change and removed it.
- Moved the durable decision record into `_docs/adr/0004-codex-project-local-onboarding.md`.

Follow-up 2026-05-17 checks:

- Confirmed `_docs/agent-reports/2026-05-16/codex-protocol-pointer.md` does not exist.
- Confirmed `AGENTS.md` still exists locally and is ignored by `.gitignore`.
- Confirmed `.codex/README.md` and `_docs/adr/0004-codex-project-local-onboarding.md` are tracked in Git history.
- Confirmed current normal working tree was clean before adding this retrospective report.

## Branch Hygiene Cleanup

On 2026-05-17, Codex S03 cross-verified Opus's cleanup recommendation against fresh `origin/main`:

- `codex/supabase-foundation` was an ancestor of `origin/main`.
- `codex/protocol-pointer` was an ancestor of `origin/main`.
- `codex/review-2-fixes` was already missing locally and remotely after `git fetch --prune`.

After human approval, Codex S03 deleted only Codex-owned obsolete branches:

- Local `codex/supabase-foundation`
- Local `codex/protocol-pointer`
- Remote `origin/codex/supabase-foundation`

Claude/Opus branches were not touched.

## End State

- `AGENTS.md` remains local-only because it is ignored by `.gitignore`.
- `.codex/README.md` and `_docs/adr/0004-codex-project-local-onboarding.md` are present and tracked.
- No Codex obsolete branches remain locally or on origin.
- This report exists to make the S03 work discoverable later without changing the historical S04/S05/S06 reports.
