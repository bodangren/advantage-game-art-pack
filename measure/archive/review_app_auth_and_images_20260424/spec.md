# Spec: Review App Authentication and Image Serving

## Overview

The review queue FastAPI app serves server-rendered HTML but has two critical gaps: (1) no authentication — any user can approve/reject candidates, and (2) no image file serving — preview placeholders show "Preview" text instead of actual rendered images. This track addresses both.

## Functional Requirements

1. Add authentication middleware (API key or basic auth) to the review app
2. Serve static image files from the render output directory
3. Update templates to display actual rendered images instead of placeholder text
4. Add a seed/fixtures loading endpoint for new deployments
5. Protect approve/reject actions behind authentication

## Non-Functional Requirements

- Authentication must be simple (single shared key for local dev use)
- Static file serving must handle PNG files efficiently
- Must not break existing template rendering

## Acceptance Criteria

- [ ] Review app requires authentication for all routes
- [ ] Image previews show actual rendered PNGs
- [ ] Approve/reject actions require authentication
- [ ] Seed endpoint loads fixtures on demand
- [ ] Existing review app tests pass
- [ ] New tests verify auth enforcement and image serving

## Out of Scope

- Multi-user authentication with roles
- Image thumbnail generation
- Review app frontend rewrite
