# Codex S01 - OPUS Review #1 Fixes

## Session Metadata

- Session ID: `S01`
- Agent: Codex
- Date: 2026-05-16

## Source

Review file: `_docs/review/guesthub-review-1.md`

## Fixed

- BUG-1: Admin calendar now renders real seed bookings by room/date overlap and
  filters out `cancelled` / `no_show`; it no longer paints placeholder bookings
  across the grid.
- BUG-2: Public booking date inputs now display Norwegian `dd.MM.yyyy` text while
  preserving ISO `yyyy-MM-dd` values for API calls.
- BUG-3: Guest count badge now uses singular/plural English copy.
- UI-1: Hero image is configurable via `property.heroImageUrl` and the image
  block is not rendered when that value is absent.

## Verification

- `npm run lint`
- `npm run build`
- Browser/API spot checks for `/admin/calendar`, `/book/fjordview`,
  `/api/admin/calendar`, and booking availability.
