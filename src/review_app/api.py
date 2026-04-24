"""Review app FastAPI application."""

from __future__ import annotations

import json
import os
from typing import Optional
from urllib.parse import urlencode

from fastapi import Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.staticfiles import StaticFiles

from review_app.auth import require_auth, AuthMiddleware, init_auth_config
from review_app.db import Database, init_db

app = FastAPI(title="Review Queue", version="0.1.0")

init_auth_config()
app.add_middleware(AuthMiddleware)

templates = Jinja2Templates(directory="templates")

DATABASE_PATH = os.environ.get("REVIEW_DB", "review_queue.db")
STATIC_ROOT = os.environ.get("REVIEW_APP_STATIC_ROOT", "outputs")


def get_db() -> Database:
    """Get database connection."""
    db = Database(DATABASE_PATH)
    return db


@app.on_event("startup")
def on_startup() -> None:
    """Initialize database on startup."""
    if not os.path.exists(DATABASE_PATH):
        init_db(DATABASE_PATH)

    if os.path.isdir(STATIC_ROOT):
        app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")


@app.get("/", response_class=RedirectResponse)
def root(request: Request) -> RedirectResponse:
    """Redirect root to queue page."""
    return RedirectResponse(url="/queue")


@app.get("/queue", response_class=HTMLResponse)
def queue_page(
    request: Request,
    user: str = Depends(require_auth),
    candidate_type: Optional[str] = None,
    family: Optional[str] = None,
    status: Optional[str] = None,
    theme: Optional[str] = None,
    min_confidence: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "DESC",
) -> HTMLResponse:
    """Display the review queue with filtering."""
    db = get_db()
    try:
        candidates = db.list_candidates(
            candidate_type=candidate_type,
            family=family,
            status=status,
            theme=theme,
            min_confidence=min_confidence,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        query_params = {}
        if candidate_type:
            query_params["candidate_type"] = candidate_type
        if family:
            query_params["family"] = family
        if status:
            query_params["status"] = status
        if theme:
            query_params["theme"] = theme
        if min_confidence is not None:
            query_params["min_confidence"] = str(min_confidence)
        query_params["sort_by"] = sort_by
        query_params["sort_order"] = sort_order

        return templates.TemplateResponse(
            "queue.html",
            {
                "request": request,
                "candidates": candidates,
                "filters": {
                    "candidate_type": candidate_type,
                    "family": family,
                    "status": status,
                    "theme": theme,
                    "min_confidence": min_confidence,
                    "sort_by": sort_by,
                    "sort_order": sort_order,
                },
                "query_string": urlencode(query_params) if query_params else "",
            },
        )
    finally:
        db.close()


@app.get("/candidate/{candidate_id}", response_class=HTMLResponse)
def candidate_detail(request: Request, candidate_id: str, user: str = Depends(require_auth)) -> HTMLResponse:
    """Display candidate detail with audit history."""
    db = get_db()
    try:
        candidate = db.get_candidate_history(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        parsed_files = _parse_json_field(candidate.get("rendered_files", "[]")) or []
        parsed_scores = _parse_json_field(candidate.get("critic_scores", "{}"))
        parsed_references = _parse_json_field(
            candidate.get("nearest_references", "[]")
        ) or []
        parsed_brief = _parse_json_field(candidate.get("source_brief"))
        parsed_manifest = _parse_json_field(candidate.get("source_manifest"))

        candidate["rendered_files"] = parsed_files

        return templates.TemplateResponse(
            "candidate_detail.html",
            {
                "request": request,
                "candidate": candidate,
                "rendered_files": parsed_files,
                "critic_scores": parsed_scores,
                "nearest_references": parsed_references,
                "source_brief": parsed_brief,
                "source_manifest": parsed_manifest,
            },
        )
    finally:
        db.close()


@app.post("/candidate/{candidate_id}/action")
def candidate_action(
    candidate_id: str,
    user: str = Depends(require_auth),
    action: str = Form(...),
    reason: Optional[str] = Form(None),
) -> RedirectResponse:
    """Record a review action on a candidate."""
    valid_actions = {"approve", "reject", "request_variant", "promote", "mark_gold"}
    if action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action: {action}")

    db = get_db()
    try:
        candidate = db.get_candidate(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        db.record_decision(candidate_id, action, reason)
        return RedirectResponse(url=f"/candidate/{candidate_id}", status_code=303)
    finally:
        db.close()


@app.get("/api/candidates")
def api_list_candidates(
    user: str = Depends(require_auth),
    candidate_type: Optional[str] = None,
    family: Optional[str] = None,
    status: Optional[str] = None,
    theme: Optional[str] = None,
    min_confidence: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "DESC",
) -> dict:
    """JSON API for candidate listing."""
    db = get_db()
    try:
        candidates = db.list_candidates(
            candidate_type=candidate_type,
            family=family,
            status=status,
            theme=theme,
            min_confidence=min_confidence,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        for c in candidates:
            c["rendered_files"] = _parse_json_field(c.get("rendered_files", "[]")) or []

        return {
            "candidates": candidates,
            "filters": {
                "candidate_type": candidate_type,
                "family": family,
                "status": status,
                "theme": theme,
                "min_confidence": min_confidence,
                "sort_by": sort_by,
                "sort_order": sort_order,
            },
        }
    finally:
        db.close()


@app.get("/api/candidates/{candidate_id}")
def api_candidate_detail(candidate_id: str, user: str = Depends(require_auth)) -> dict:
    """JSON API for candidate detail."""
    db = get_db()
    try:
        candidate = db.get_candidate_history(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return candidate
    finally:
        db.close()


@app.post("/admin/seed")
def seed_endpoint(user: str = Depends(require_auth)) -> dict:
    """Load seed fixtures into the database."""
    from review_app.fixtures import seed_demo_candidates

    db = get_db()
    try:
        seed_demo_candidates(db)
        return {"status": "ok", "message": "Seed data loaded"}
    finally:
        db.close()


def _parse_json_field(value: Optional[str]) -> Optional[dict]:
    """Parse a JSON string field."""
    if value is None:
        return None
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return None


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)