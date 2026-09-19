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

# Ensure hermes-agent root is in Python path
HERMES_AGENT_ROOT = "/home/ubuntu/.hermes/hermes-agent"
if HERMES_AGENT_ROOT not in sys.path:
    sys.path.insert(0, HERMES_AGENT_ROOT)

# Pin a dashboard session token BEFORE importing hermes web modules so that
# hermes_cli.web_server._SESSION_TOKEN resolves to this known value. The Kanban
# WebSocket (/events) authorizes upgrades with ?token=<_SESSION_TOKEN>; exposing
# this token to the SPA (via /api/ws-token) lets the browser open the stream.
_WS_SESSION_TOKEN = os.environ.setdefault(
    "HERMES_DASHBOARD_SESSION_TOKEN", secrets.token_urlsafe(32)
)

from fastapi import FastAPI
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

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "hermes-agentic-hub-bridge"}


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
