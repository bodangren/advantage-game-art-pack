# Plan: Review App Hardening & UX Improvements

- [ ] Write tests for health check endpoint accessible without auth header
- [ ] Implement path-level auth exemption using BaseHTTPMiddleware with allowlist
- [ ] Write tests for batch approve endpoint (accepts list of candidate IDs, returns count)
- [ ] Implement `POST /candidates/batch-approve` and `POST /candidates/batch-reject` endpoints
- [ ] Write tests for thumbnail grid rendering (verify 4-column CSS class presence)
- [ ] Update candidate list template to use CSS grid with thumbnail images
- [ ] Write tests for keyboard shortcut registration (keydown event handlers)
- [ ] Add JavaScript keyboard shortcut handler for approve/reject/next actions
- [ ] Update candidate detail template with shortcut hint overlay
- [ ] Run full test suite and verify `python3 -m compileall src`
