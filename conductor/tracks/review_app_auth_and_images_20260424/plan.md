# Plan: Review App Authentication and Image Serving

## Phase 1: Authentication Middleware

- [ ] Task: Add auth to review app
    - [ ] Write tests for auth middleware (reject unauthenticated, allow authenticated)
    - [ ] Implement API key or basic auth middleware
    - [ ] Apply middleware to all review app routes
    - [ ] Protect approve/reject actions

## Phase 2: Static Image Serving

- [ ] Task: Serve rendered images
    - [ ] Write tests for static file serving (PNG content-type, 404 for missing)
    - [ ] Configure Fastify static file mount for render output directory
    - [ ] Update Jinja2 templates to display actual images
    - [ ] Remove placeholder "Preview" text

## Phase 3: Seed Endpoint

- [ ] Task: Add fixture loading
    - [ ] Write tests for seed endpoint (loads fixtures, returns count)
    - [ ] Implement POST /admin/seed endpoint
    - [ ] Document seed data format

## Phase 4: Verification

- [ ] Task: Full suite validation
    - [ ] Run `python3 -m unittest discover -s tests -v` — all tests pass
    - [ ] Run `python3 -m compileall src` — clean compilation
    - [ ] Manual verification: review app shows images and requires auth
