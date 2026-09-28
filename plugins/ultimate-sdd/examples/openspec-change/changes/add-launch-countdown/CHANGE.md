---
id: CHANGE-1
title: Show a live countdown to net on each launch row
slug: add-launch-countdown
status: proposed
reqs: []
deltas: [launches]
skip_specs: false
retire_capabilities: false
created: 2026-08-16
updated: 2026-08-16
---

# CHANGE-1 — Show a live countdown to net on each launch row

## Why

Visitors can read `net` but still do the mental math. A countdown makes "how soon?" a glance, not a calculation.

## What Changes

Each list row gains a live countdown to `net`. Existing name / net / rocket / mission stay. Filters are unchanged.

## Capabilities

### New Capabilities

- *(none — same domain)*

### Modified Capabilities

- `launches`: Upcoming List grows a countdown; new requirement Launch Countdown

## Impact

List row UI only. No new LL2 params. No detail-page change.

## Out of scope

- Detail page countdown — later CHANGE
- User-selected timezone — keep existing display tz
- Push notifications at T-0

## Approach

Client-side timer from the `net` ISO timestamp already on the row. No extra request.
