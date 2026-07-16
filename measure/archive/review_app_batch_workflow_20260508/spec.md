# Spec: Review App Batch Approve/Reject Workflow

## Goal
Enable batch operations in the FastAPI review app so users can select multiple candidates and approve or reject them in one action.

## Acceptance Criteria
- [ ] Checkbox selection on review queue list page
- [ ] "Approve Selected" and "Reject Selected" bulk actions
- [ ] Confirmation modal showing count of affected items
- [ ] Keyboard shortcuts: Shift+click range select, Ctrl+A select all on page
- [ ] Batch action result summary (success count, failure count, reasons)

## Out of Scope
- Undo batch actions
- Bulk edit of scores or notes
