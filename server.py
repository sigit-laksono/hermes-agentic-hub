"""Hermes Agentic Hub Backend API Bridge.

Exposes native Hermes Agent routers (Kanban, Cron, Skills, Profiles)
with full CORS support for the Hermes Agentic Hub web UI.
"""

import sys
import os
import importlib.util
from pathlib import Path

# Ensure hermes-agent root is in Python path
HERMES_AGENT_ROOT = "/home/ubuntu/.hermes/hermes-agent"
if HERMES_AGENT_ROOT not in sys.path:
    sys.path.insert(0, HERMES_AGENT_ROOT)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9120)
