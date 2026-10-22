"""A tiny MCP server for trying mcp-voice-sim: one plain tool and one MCP Apps tool.

    pip install "mcp>=2.1"
    python examples/demo_server.py      # serves http://127.0.0.1:3001/mcp
"""

from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import uvicorn
from pydantic import BaseModel
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount

from mcp.server import MCPServer
from mcp.server.apps import Apps
from mcp.server.transport_security import TransportSecuritySettings

ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]
RUNTIME = Path(__file__).resolve().parents[1] / "dist" / "card-runtime.js"

CARD = """<!doctype html><html><body style="margin:0;font:20px system-ui">
<div id="out" style="padding:16px;border:2px solid #ccc;border-radius:12px">Loading…</div>
<script>/*CARD_RUNTIME*/</script>
<script>
  window.McpCard.onData(({ data }) => {
    document.getElementById("out").textContent = "It is " + data.time + " on the server.";
  });
</script></body></html>"""


class Clock(BaseModel):
    time: str


apps = Apps()


@apps.tool(resource_uri="ui://demo/clock", description="The server's current time, shown as a card.")
def server_time() -> Clock:
    return Clock(time=datetime.now().strftime("%H:%M:%S"))


runtime = RUNTIME.read_text(encoding="utf-8") if RUNTIME.exists() else "console.error('run npm run build')"
apps.add_html_resource("ui://demo/clock", CARD.replace("/*CARD_RUNTIME*/", runtime.replace("</script", "<\\/script")))
mcp = MCPServer("mcp-voice-sim-demo", extensions=[apps])


@mcp.tool(description="Echo a message back.")
def echo(message: str) -> str:
    return message


@asynccontextmanager
async def lifespan(_app):
    async with mcp.session_manager.run():
        yield


app = Starlette(
    routes=[Mount("/", app=mcp.streamable_http_app(
        transport_security=TransportSecuritySettings(allowed_hosts=["127.0.0.1:*", "localhost:*"],
                                                     allowed_origins=ORIGINS)))],
    middleware=[Middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST", "DELETE"],
                           allow_headers=["*"], expose_headers=["Mcp-Session-Id"])],
    lifespan=lifespan,
)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3001)
