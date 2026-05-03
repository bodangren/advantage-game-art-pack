# Spec: Review App Hardening & UX Improvements

## Problem

The review app has open tech debt: FastAPI auth via `Depends(require_auth)` applies to all routes including POST actions (should allow path-level exemptions), and the UI lacks quality-of-life features for batch review workflows.

## Goals

- Fix auth middleware to support path-level exemptions (e.g., health check endpoint)
- Add batch approve/reject for reviewing multiple candidates at once
- Show candidate thumbnails in a grid layout for faster visual comparison
- Add keyboard shortcuts for approve (a), reject (r), and next (→) actions

## Non-Goals

- User role management (single API key auth is sufficient)
- Real-time WebSocket updates
- Mobile-responsive layout

## Acceptance Criteria

- [ ] Health check endpoint `/health` accessible without authentication
- [ ] Batch approve endpoint accepts list of candidate IDs
- [ ] Candidate list page shows thumbnail grid with 4-column layout
- [ ] Keyboard shortcuts work when candidate detail is focused
- [ ] Unit tests cover auth exemptions, batch operations, and shortcut handling
