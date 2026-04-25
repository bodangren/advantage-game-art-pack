# Review Queue Foundation - Implementation Notes

## Tech Stack Decision

**Stack**: FastAPI + SQLite + Server-rendered HTML (Jinja2)

**Rationale**:
- FastAPI: Modern, fast, self-documenting, native OpenAPI support
- SQLite: Zero-config, single-file, perfect for local dev and lightweight deployment
- Server-rendered HTML: Simple, fast page loads for image-heavy review workflow, no client-side complexity

**Dependencies added**:
- fastapi
- uvicorn[standard]
- jinja2
- aiosqlite (for async SQLite operations)

## Data Model

### Candidate Table
Stores reviewable items (primitives or compiled assets).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| candidate_type | TEXT NOT NULL | 'primitive' or 'compiled_asset' |
| family | TEXT NOT NULL | Asset family name |
| source_brief | TEXT | Source prompt/brief JSON |
| source_manifest | TEXT | Source manifest JSON |
| source_program | TEXT | Source program path/name |
| candidate_group_id | TEXT | Group ID for variants |
| variant_id | TEXT | Variant identifier |
| attempt_count | INTEGER | Generation attempt number |
| rendered_files | TEXT | JSON array of file paths |
| critic_scores | TEXT | JSON object of critic scores |
| nearest_references | TEXT | JSON array of reference IDs |
| status | TEXT NOT NULL | 'pending', 'approved', 'rejected', 'needs_variant', 'promoted' |
| confidence | REAL | Overall confidence score 0-1 |
| theme | TEXT | Theme tag |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### Decision Table
Audit trail for review actions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| candidate_id | TEXT NOT NULL | FK to Candidate |
| action | TEXT NOT NULL | 'approve', 'reject', 'request_variant', 'promote', 'mark_gold' |
| reason | TEXT | Optional reason/note |
| created_at | TEXT | ISO timestamp |

### Indexes
- `idx_candidate_type_status` on (candidate_type, status)
- `idx_candidate_family` on (family)
- `idx_candidate_confidence` on (confidence)
- `idx_decision_candidate` on (candidate_id)