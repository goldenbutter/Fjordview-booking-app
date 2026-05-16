# Opus S01 audit of Opus S02 — bug-audit-and-fixes slice

> **Reviewer:** Opus S01 (reopened briefly at Bithun's request after S02 closed)
> **Reviewed:** S02's branch `claude/s02-bug-audit-and-fixes` (7 commits ahead of `claude/supabase-and-admin-wiring`)
> **Date:** 2026-05-16, after 23:30 CEST
> **Reviewer context bucket:** 🟠 Orange — focused verification only, no deep code review

## Verdict

**Approve.** S02's work is high-quality, protocol-compliant, and the fixes are real. Recommend Bithun PR + merge S01 + S02 in that order, or do a combined PR of S02 (which already contains S01's commits as ancestors).

## Protocol compliance — passes 6 / 6 checks

| Check | Result | Evidence |
|---|---|---|
| Branch follows `claude/<topic>` convention | ✅ | `claude/s02-bug-audit-and-fixes` |
| Scope deviation documented | ✅ | `3664503` — explicit scope-amendment commit before any fixes |
| S01→S02 handoff archived correctly | ✅ | Moved to `archive/2026-05-16/` |
| Follow-up handoff written for S03 | ✅ | `active/opus-s02-to-next-agent-deferred-items.md` |
| Session summary follows template | ✅ | `opus-s02-bug-audit-and-fixes.md` — metadata, timeline with commits, fixed/audited split, verification, end-state |
| Bootstrap checklist in S02→S03 handoff includes branch-verification reminder | ✅ | Inherits S01's "verify branch" warning — closes the loop on that lesson |

## Fix-by-fix spot-check (7 fixes claimed, 7 verified on disk)

| # | Fix claimed | Verified | Notes |
|---|---|---|---|
| 1 | `bookingStatusTone` + `paymentStatusTone` + `humanizeEnum` centralised | ✅ | `src/lib/utils.ts:55-79` defines all three + `BadgeTone` export. Six consumer files updated. |
| 2 | Dashboard `arrivals/departures` filters fixed, two new cards | ✅ | Commit `8cb81b4`; admin/page.tsx now uses `=== today` and renders both lists |
| 3 | Cancellation deadline computed in property timezone + check-in time | ✅ | `queries.ts:871` — `hoursUntilCheckInForProperty` + `timeZoneOffsetMinutes` use `Intl.DateTimeFormat` correctly |
| 4 | Public booking form pre-fill cleared + submit gate added | ✅ | Commit `cc12710`; `booking-flow.tsx` |
| 5 | Photo fallback for empty `room.photoUrls` | ✅ | Same commit; falls back to slate placeholder with icon |
| 6 | `getBookingDetail` accepts UUID OR booking-ref; invoice routes routed through it | ✅ | `isUuid` + `UUID_REGEX` in `api-validation.ts:7-9`; centralised in `getBookingDetail` |
| 7 | Manual unpaid booking no longer over-counts `guests.totalSpent` | ✅ | `createBooking` now increments by `paidAmount` not `totalPrice`; `createAdminBooking` simplified to a thin wrapper |

## Things S02 deliberately deferred — agree with all of them

S02's "audited and left as-is" list is accurate. All six original deferred items (Stripe, Resend, Room CRUD, Cron bodies, multi-tenant test, auth-aware scoping) remain S03's queue. The race-condition mitigation in `createBooking` is fine as-is. `autoAssignRoom` returning null leaves room_id null — acceptable for prototype.

## Bonus follow-ups S02 surfaced — concur, none are urgent

S02 explicitly flagged three things in their handoff that are not §19 acceptance criteria but worth tracking:

1. Manual booking server doesn't validate `paidAmount <= totalPrice` — trusted form, low impact, add a Zod refinement when convenient
2. `autoAssignRoom` silently nulls room_id when fully booked — admin must reassign; worth a UI warning at manual-booking time
3. Dashboard missing "this week mini-calendar" and "revenue this month vs last month" per §13 — nice-to-have polish

None of these block merging.

## Build + lint

- `npm run lint` — clean (verified)
- `npm run build` — S02 reports 25 routes, same as S01 end-state — consistent

## Notable observations

1. **S02 picked up the two Codex untracked files** (`.codex/README.md`, `_docs/adr/0004-codex-project-local-onboarding.md`) and committed them on the s02 branch. S01 had deliberately left them untracked so Codex could commit them on their own branch. **S02's commit takes attribution credit for Codex's content.** This is the same protocol-boundary issue S01 caught in itself at the very end — it has now happened a second time. Worth surfacing as a process improvement for S03: *if Codex left files untracked in the working tree, leave them untracked, don't commit them on your branch.* Mention this in S02→S03 handoff or as a small protocol §4 addition.

2. **Branch stacking is now two layers deep:** `main` ← `claude/supabase-and-admin-wiring` ← `claude/s02-bug-audit-and-fixes`. S02 explicitly flagged this in their handoff. Recommend merging S01 first (then S02 against the new main), or combined PR of S02 (since S01 is its ancestor). Don't let it grow to three layers.

3. **The S02→S03 handoff bootstrap checklist correctly inherits S01's "verify branch" lesson.** Good propagation of past mistakes. The "don't commit other agents' untracked files" lesson from observation #1 should be added similarly.

## Recommended next moves for Bithun

1. **PR + merge.** Either:
   - PR `claude/supabase-and-admin-wiring` → main first, then PR `claude/s02-bug-audit-and-fixes` (rebased onto new main) → main, OR
   - One combined PR of `claude/s02-bug-audit-and-fixes` (contains S01 + S02 commits) → main
   
   The combined-PR path is faster but loses the clean S01 / S02 separation in main's history. The two-PR path preserves history but requires a rebase.

2. **Optional protocol tweak.** Add to AGENT-PROTOCOL.md §4 ("Boundary respect"): *if another agent left files untracked in the working tree, leave them untracked. They are that agent's work to commit on their own branch.* This catches the issue described in observation #1.

3. **Spawn S03 via the one-liner** when ready: `Read _docs/agent-handoffs/active/opus-s02-to-next-agent-deferred-items.md and follow it.` Provide Stripe test keys ahead of time if you want Item 1 unblocked.

## Audit close

This audit added no commits to feature code. It is a docs-only review and lands as a single commit on `claude/s02-bug-audit-and-fixes` (S02's branch — S01 is otherwise dormant). No protocol violation since the audit is by request, not unsolicited intervention into S02's branch.
