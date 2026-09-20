"""Hermes Agentic Hub Backend API Bridge.

Exposes native Hermes Agent routers (Kanban, Cron, Skills, Profiles)
with full CORS support for the Hermes Agentic Hub web UI.
"""

import sys
import os
import secrets
import importlib.util
from typing import Optional
from pathlib import Path
from pydantic import BaseModel

# Load Hermes environment variables (.env) so LLM credentials and aux clients work
try:
    from dotenv import load_dotenv
    load_dotenv(Path.home() / ".hermes" / ".env")
except ImportError:
    pass

# Ensure hermes-agent root is in Python path
HERMES_AGENT_ROOT = os.environ.get(
    "HERMES_AGENT_ROOT",
    str(Path.home() / ".hermes" / "hermes-agent")
)
if HERMES_AGENT_ROOT not in sys.path:
    sys.path.insert(0, HERMES_AGENT_ROOT)

# Pin a dashboard session token BEFORE importing hermes web modules so that
# hermes_cli.web_server._SESSION_TOKEN resolves to this known value. The Kanban
# WebSocket (/events) authorizes upgrades with ?token=<_SESSION_TOKEN>; exposing
# this token to the SPA (via /api/ws-token) lets the browser open the stream.
_WS_SESSION_TOKEN = os.environ.setdefault(
    "HERMES_DASHBOARD_SESSION_TOKEN", secrets.token_urlsafe(32)
)

from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(title="Hermes Agentic Hub API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SpecifyPayload(BaseModel):
    author: Optional[str] = "dashboard"

class DecomposePayload(BaseModel):
    author: Optional[str] = "dashboard"

class CreateSessionPayload(BaseModel):
    title: Optional[str] = "New Chat"
    profile: Optional[str] = "default"

class ImportBoardJsonPayload(BaseModel):
    slug: str
    name: Optional[str] = None
    description: Optional[str] = None
    tasks: Optional[list[dict]] = None
    links: Optional[list[dict]] = None

@app.post("/api/plugins/kanban/tasks/{task_id}/specify")
def specify_task_route(task_id: str, payload: Optional[SpecifyPayload] = None, board: Optional[str] = None):
    """Enrich and specify task requirements with acceptance criteria using auxiliary LLM."""
    from hermes_cli import kanban_db
    from hermes_cli import kanban_db_connect as kbc
    from hermes_cli import kanban_specify
    from fastapi import HTTPException

    author = payload.author if payload and payload.author else "dashboard"
    with kbc.connect(board=board) as conn:
        task = kanban_db.get_task(conn, task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        prev_status = task.status
        # Ensure task is in triage so kanban_specify accepts it
        if prev_status != "triage":
            with kanban_db.write_txn(conn):
                conn.execute("UPDATE tasks SET status = 'triage' WHERE id = ?", (task_id,))

    target_board = board or kanban_db.DEFAULT_BOARD
    with kanban_db.scoped_current_board(target_board):
        outcome = kanban_specify.specify_task(task_id, author=author)

    if not outcome.ok and prev_status != "triage":
        with kbc.connect(board=board) as conn:
            with kanban_db.write_txn(conn):
                conn.execute("UPDATE tasks SET status = ? WHERE id = ?", (prev_status, task_id))

    return {
        "ok": bool(outcome.ok),
        "task_id": outcome.task_id,
        "reason": outcome.reason,
        "new_title": outcome.new_title
    }

@app.post("/api/plugins/kanban/tasks/{task_id}/decompose")
def decompose_task_route(task_id: str, payload: Optional[DecomposePayload] = None, board: Optional[str] = None):
    """Decompose large task into graph of child sub-tasks using auxiliary LLM."""
    from hermes_cli import kanban_db
    from hermes_cli import kanban_db_connect as kbc
    from hermes_cli import kanban_decompose
    from fastapi import HTTPException

    author = payload.author if payload and payload.author else "dashboard"
    with kbc.connect(board=board) as conn:
        task = kanban_db.get_task(conn, task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        prev_status = task.status
        if prev_status != "triage":
            with kanban_db.write_txn(conn):
                conn.execute("UPDATE tasks SET status = 'triage' WHERE id = ?", (task_id,))

    target_board = board or kanban_db.DEFAULT_BOARD
    with kanban_db.scoped_current_board(target_board):
        outcome = kanban_decompose.decompose_task(task_id, author=author)

    if not outcome.ok and prev_status != "triage":
        with kbc.connect(board=board) as conn:
            with kanban_db.write_txn(conn):
                conn.execute("UPDATE tasks SET status = ? WHERE id = ?", (prev_status, task_id))

    return {
        "ok": bool(outcome.ok),
        "task_id": outcome.task_id,
        "reason": outcome.reason,
        "fanout": bool(outcome.fanout),
        "child_ids": outcome.child_ids or [],
        "new_title": outcome.new_title
    }

@app.get("/api/plugins/kanban/links")
def get_task_links_route(task_id: Optional[str] = None, board: Optional[str] = None):
    """Retrieve dependency links and decomposed sub-tasks for a specific task or all links on the board."""
    import json
    from hermes_cli import kanban_db
    from hermes_cli import kanban_db_connect as kbc
    from fastapi import HTTPException

    with kbc.connect(board=board) as conn:
        if task_id:
            task = kanban_db.get_task(conn, task_id)
            if not task:
                raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
            ctx = kanban_db.task_graph_context(conn, task_id)
            parents = ctx.get("parents", [])
            children = ctx.get("children", [])

            # Detect decomposed subtasks from task_events (decomposed event records child_ids)
            decomposed_ev = conn.execute(
                "SELECT payload FROM task_events WHERE task_id = ? AND kind = 'decomposed' ORDER BY id DESC LIMIT 1",
                (task_id,)
            ).fetchone()
            subtask_ids: list[str] = []
            if decomposed_ev and decomposed_ev["payload"]:
                try:
                    payload_data = json.loads(decomposed_ev["payload"])
                    subtask_ids = payload_data.get("child_ids") or []
                except Exception:
                    subtask_ids = []

            # Also check children where task_id is parent in task_links
            for c in children:
                if c["id"] not in subtask_ids:
                    subtask_ids.append(c["id"])

            subtasks = []
            if subtask_ids:
                placeholders = ",".join("?" for _ in subtask_ids)
                s_rows = conn.execute(
                    f"SELECT id, title, status, assignee FROM tasks WHERE id IN ({placeholders})",
                    tuple(subtask_ids)
                ).fetchall()
                row_map = {r["id"]: r for r in s_rows}
                for sid in subtask_ids:
                    if sid in row_map:
                        r = row_map[sid]
                        subtasks.append({
                            "id": r["id"],
                            "title": r["title"],
                            "status": r["status"],
                            "assignee": r["assignee"]
                        })

            # Check if any blocker parent (excluding decomposed subtasks) is not done
            subtask_id_set = set(subtask_ids)
            true_blockers = [p for p in parents if p["id"] not in subtask_id_set]
            blocked_by_active = any(p["status"] not in ("done", "archived") for p in true_blockers)

            return {
                "task_id": task_id,
                "parents": parents,
                "children": children,
                "subtasks": subtasks,
                "blocked_by_active": blocked_by_active
            }
        else:
            rows = conn.execute("SELECT parent_id, child_id FROM task_links").fetchall()
            return {
                "links": [{"parent_id": r["parent_id"], "child_id": r["child_id"]} for r in rows]
            }

# 1. Mount Kanban Dashboard Plugin API (/api/plugins/kanban)
kanban_api_path = Path(HERMES_AGENT_ROOT) / "plugins/kanban/dashboard/plugin_api.py"
spec = importlib.util.spec_from_file_location("kanban_plugin_api", kanban_api_path)
if spec and spec.loader:
    kanban_mod = importlib.util.module_from_spec(spec)
    sys.modules["kanban_plugin_api"] = kanban_mod
    spec.loader.exec_module(kanban_mod)
    app.include_router(kanban_mod.router, prefix="/api/plugins/kanban")

# 2. Mount Cron Router (/api/cron)
try:
    from hermes_cli.web_routers import cron
    app.include_router(cron.router)
except Exception as e:
    print(f"Warning: Failed to load cron router: {e}")

# 3. Mount Skills Router (/api/skills)
try:
    from hermes_cli.web_routers import skills
    app.include_router(skills.router)
except Exception as e:
    print(f"Warning: Failed to load skills router: {e}")

# 4. Mount Profiles Router (/api/profiles)
try:
    from hermes_cli.web_routers import profiles
    app.include_router(profiles.router)
except Exception as e:
    print(f"Warning: Failed to load profiles router: {e}")

# 5. Enable and Mount Sessions Routers (/api/sessions)
try:
    import hermes_cli.web_server as ws_module
    ws_module._DASHBOARD_EMBEDDED_CHAT_ENABLED = True
    from hermes_cli.web_routers import sessions
    from hermes_cli.web_server_sessions import _open_session_db_for_profile
    from hermes_cli import profiles as profiles_mod

    @app.get("/api/sessions")
    def list_all_sessions(
        limit: int = 50,
        offset: int = 0,
        order: str = "recent",
        profile: Optional[str] = None
    ):
        """List chat sessions across all profiles or for a specific profile."""
        target_profiles = []
        if profile and profile.lower() != "all":
            target_profiles = [profile]
        else:
            try:
                target_profiles = profiles_mod.list_profile_names()
            except Exception:
                target_profiles = ["default"]

        all_sessions = []
        for p in target_profiles:
            p_arg = p if p != "default" else None
            try:
                db = _open_session_db_for_profile(p_arg, read_only=True)
                rows = db.list_sessions_rich(limit=limit)
                for r in rows:
                    p_name = r.get("profile_name") or p
                    all_sessions.append({
                        "id": r.get("id"),
                        "title": r.get("title") or r.get("preview") or "Untitled Chat",
                        "model": r.get("model") or "hermes-agent",
                        "profile_name": p_name,
                        "profile": p_name,
                        "started_at": r.get("started_at") or r.get("created_at"),
                        "last_active": r.get("last_active") or r.get("last_activity_at") or r.get("started_at"),
                        "message_count": r.get("message_count") or 0,
                        "is_active": True,
                        "preview": r.get("preview") or ""
                    })
                db.close()
            except Exception:
                pass

        all_sessions.sort(key=lambda s: s.get("last_active") or 0, reverse=True)
        paged = all_sessions[offset:offset + limit]
        return {"sessions": paged, "total": len(all_sessions)}

    app.include_router(sessions.list_router)
    app.include_router(sessions.search_router)
    app.include_router(sessions.manage_router)
except Exception as e:
    print(f"Warning: Failed to load sessions router: {e}")

# 6. Mount Chat & Terminal WebSocket Router (/api/ws, /api/console, /api/pty, /api/pub, /api/events)
try:
    from hermes_cli.web_routers import chat_ws
    app.include_router(chat_ws.router)

    # Alias /api/chat/ws for direct dashboard interactive chat connection
    @app.websocket("/api/chat/ws")
    async def chat_ws_alias(ws: WebSocket):
        await chat_ws.gateway_ws(ws)
except Exception as e:
    print(f"Warning: Failed to load chat_ws router: {e}")

@app.post("/api/sessions")
def create_session_route(payload: Optional[CreateSessionPayload] = None):
    """Create a new chat session in Hermes state.db."""
    import time
    import uuid
    from hermes_cli.web_server_sessions import _open_session_db_for_profile

    title = payload.title if payload and payload.title else "New Chat"
    profile = payload.profile if payload and payload.profile else "default"
    sid = f"{time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    try:
        db = _open_session_db_for_profile(profile, read_only=False)
    except Exception:
        # Fallback to default profile if profile folder does not exist on disk yet
        profile = "default"
        db = _open_session_db_for_profile(profile, read_only=False)
    try:
        res = db.create_session(session_id=sid, source="dashboard", profile_name=profile)
        actual_id = res or sid
        if title:
            try:
                db.set_session_title(actual_id, title)
            except Exception:
                pass
        return {
            "ok": True,
            "session_id": actual_id,
            "id": actual_id,
            "title": title,
            "profile": profile,
            "started_at": time.time()
        }
    finally:
        db.close()

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "hermes-agentic-hub-bridge"}


@app.get("/api/plugins/kanban/boards/{slug}/export-json")
def export_board_json(slug: str):
    """Export complete board state (metadata, tasks, links) as JSON."""
    import time
    from dataclasses import asdict
    from hermes_cli import kanban_db
    from hermes_cli import kanban_db_connect as kbc
    from fastapi import HTTPException

    if slug != kanban_db.DEFAULT_BOARD and not kanban_db.board_exists(slug):
        raise HTTPException(status_code=404, detail=f"Board {slug!r} does not exist")

    meta = kanban_db.read_board_metadata(slug)
    with kbc.connect(board=slug) as conn:
        tasks = kanban_db.list_tasks(conn, include_archived=True)
        task_dicts = [asdict(t) for t in tasks]
        link_rows = conn.execute("SELECT parent_id, child_id FROM task_links").fetchall()
        links = [{"parent_id": r["parent_id"], "child_id": r["child_id"]} for r in link_rows]

    return {
        "format": "hermes-kanban-json",
        "version": 1,
        "exported_at": int(time.time()),
        "board": meta,
        "tasks": task_dicts,
        "links": links
    }


@app.post("/api/plugins/kanban/boards/import-json")
def import_board_json(payload: ImportBoardJsonPayload):
    """Import a board from JSON payload as a new or updated board."""
    import time
    from hermes_cli import kanban_db
    from hermes_cli import kanban_db_connect as kbc
    from fastapi import HTTPException

    slug = kanban_db._normalize_board_slug(payload.slug)
    if not slug:
        raise HTTPException(status_code=400, detail="Invalid board slug")

    if kanban_db.board_exists(slug) and slug != kanban_db.DEFAULT_BOARD:
        meta = kanban_db.write_board_metadata(
            slug,
            name=payload.name,
            description=payload.description
        )
    else:
        meta = kanban_db.create_board(
            slug,
            name=payload.name or slug,
            description=payload.description or ""
        )

    imported_tasks_count = 0
    if payload.tasks:
        with kbc.connect(board=slug) as conn:
            kanban_db.init_db(board=slug)
            for t in payload.tasks:
                title = t.get("title")
                if not title:
                    continue
                body = t.get("body")
                status = t.get("status", "todo")
                priority = t.get("priority", 0)
                assignee = t.get("assignee")
                try:
                    is_triage = (status in ("triage", "backlog"))
                    init_stat = "blocked" if status == "blocked" else "running"
                    tid = kanban_db.create_task(
                        conn,
                        title=title,
                        body=body,
                        assignee=assignee,
                        priority=priority,
                        triage=is_triage,
                        initial_status=init_stat
                    )
                    target_st = "ready" if status in ("todo", "ready") else ("review" if status in ("in_review", "review") else ("done" if status == "done" else None))
                    if target_st:
                        with kanban_db.write_txn(conn):
                            conn.execute("UPDATE tasks SET status = ? WHERE id = ?", (target_st, tid))
                    imported_tasks_count += 1
                except Exception as e:
                    print(f"Failed to import task {title}: {e}")

            if payload.links:
                with kanban_db.write_txn(conn):
                    for l in payload.links:
                        p_id = l.get("parent_id")
                        c_id = l.get("child_id")
                        if p_id and c_id:
                            conn.execute(
                                "INSERT OR IGNORE INTO task_links (parent_id, child_id) VALUES (?, ?)",
                                (p_id, c_id)
                            )

    return {
        "ok": True,
        "board": meta,
        "imported_tasks": imported_tasks_count
    }


@app.post("/api/plugins/kanban/tasks/{task_id}/run")
def run_task(task_id: str, board: Optional[str] = None, assignee: Optional[str] = None):
    """Explicitly trigger an agent worker run for a specific task."""
    import time
    import json
    from hermes_cli import kanban_db
    from hermes_cli import kanban_db_connect as kbc
    from hermes_cli import kanban_db_dispatch as kbd
    from fastapi import HTTPException

    with kbc.connect(board=board) as conn:
        task = kanban_db.get_task(conn, task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        # If assignee specified, reassign to it; otherwise ensure task has an assignee
        if assignee and assignee != task.assignee:
            kanban_db.assign_task(conn, task_id, assignee)
        elif not task.assignee:
            kanban_db.assign_task(conn, task_id, "sa-aws")

        # If task is not in ready or running status, set it to ready
        if task.status not in ("ready", "running"):
            with kanban_db.write_txn(conn):
                conn.execute(
                    "UPDATE tasks SET status = 'ready', updated_at = ? WHERE id = ?",
                    (int(time.time()), task_id),
                )
                conn.execute(
                    "INSERT INTO task_events (task_id, kind, payload, created_at) VALUES (?, 'status', ?, ?)",
                    (task_id, json.dumps({"from": task.status, "to": "ready"}), int(time.time())),
                )

        # Run dispatch pass to spawn worker
        res = kbd.dispatch_once(conn, board=board)
        updated = kanban_db.get_task(conn, task_id)

        spawned = res.spawned if hasattr(res, "spawned") else []
        is_spawned = any(s[0] == task_id for s in spawned)

        return {
            "ok": True,
            "task_id": task_id,
            "status": updated.status if updated else "running",
            "is_spawned": is_spawned,
            "assignee": updated.assignee if updated else task.assignee,
            "spawned_workers": spawned,
            "reclaimed": getattr(res, "reclaimed", 0),
            "promoted": getattr(res, "promoted", 0),
        }


@app.get("/api/ws-token")
def ws_token():
    """Expose the dashboard session token so the SPA can authenticate the
    Kanban /events WebSocket upgrade (?token=...). The token is pinned at
    process start via HERMES_DASHBOARD_SESSION_TOKEN."""
    # Prefer the value the hermes web layer actually resolved (handles any
    # in-process override); fall back to the token we pinned above.
    try:
        from hermes_cli.web_server import _SESSION_TOKEN as resolved
        token = resolved or _WS_SESSION_TOKEN
    except Exception:
        token = _WS_SESSION_TOKEN
    return {"token": token}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9120)
