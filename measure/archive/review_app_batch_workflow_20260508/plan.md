# Plan: Review App Batch Approve/Reject Workflow

## Phase 1: Backend API (TDD)
- [ ] Write tests for POST /api/candidates/batch-approve and /batch-reject
- [ ] Implement batch endpoints with transaction safety
- [ ] Return result summary with success/failure per ID

## Phase 2: Selection UI (TDD)
- [ ] Write tests for candidate checkbox and select-all behavior
- [ ] Add checkbox to each candidate row
- [ ] Implement select-all and shift+click range selection in JS

## Phase 3: Bulk Actions (TDD)
- [ ] Write tests for batch action toolbar
- [ ] Implement floating toolbar with approve/reject buttons and count
- [ ] Add confirmation modal with item count

## Phase 4: Result Feedback (TDD)
- [ ] Write tests for result toast/summary display
- [ ] Implement toast notification with success/failure counts
- [ ] Refresh review queue after batch action

## Phase 5: Integration & Verification
- [ ] End-to-end test: select 3 candidates → batch approve → verify state
- [ ] Update tracks.md and commit
