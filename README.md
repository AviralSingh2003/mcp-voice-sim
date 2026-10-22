# mcp-voice-sim

A framework-free browser kit for building **simulated voice-assistant experiences on MCP** — for example a
simulated Alexa+ device that talks to your self-hosted MCP server.

Official Alexa+ add-on tooling is partner-only, so anyone building an MCP server for an Alexa+-style
experience needs their own host to demo it. This kit gives you the four pieces that host needs, in one import:

| Module | What it does |
|---|---|
| `connectMcp(url, { recorder })` | Direct browser MCP client over **Streamable HTTP** (official TS SDK v2) that records every JSON-RPC frame, including the `initialize` handshake |
| `createVoice({ onTranscript })` | Web Speech loop (recognition + synthesis) that degrades cleanly, plus `attachTypedInput` for a typed fallback |
| `renderApp` / `renderToolCard` | A minimal **MCP Apps host**: reads a `ui://` resource, renders it in a sandboxed iframe, and speaks the MCP Apps postMessage protocol through the official `AppBridge` (connected before the document loads, so `ui/initialize` is never missed) |
| `mountInspector(el, recorder)` | A live JSON-RPC inspector panel, so judges and developers can see a genuine MCP session |

Plus **`dist/card-runtime.js`**, a view-side runtime that lets an MCP App card be a single self-contained
HTML file: inline the script, then call `window.McpCard.onData(({ data }) => render(data))`. It reports its
size after every render so the host iframe never clips.

## Quick start

You need **Node.js 22+** (Vitest and jsdom require 22.12 or newer), and **Python 3.11+** to run the example server.

```bash
git clone https://github.com/AviralSingh2003/mcp-voice-sim.git
cd mcp-voice-sim
npm install
npm run build      # -> dist/mcp-voice-sim.js (ESM) and dist/card-runtime.js (IIFE)
npm test           # Vitest
```

Then try it against the example server ([Example](#example) below), or in a full app ([Used by Saathi](#used-by-saathi)).

Use the ESM bundle directly from a page — no framework, no build step in the consuming app:

```html
<script type="module">
  import { FrameRecorder, connectMcp, mountInspector, renderToolCard, createVoice } from "./mcp-voice-sim.js";

  const recorder = new FrameRecorder();
  mountInspector(document.querySelector("#inspector"), recorder);

  const { client, callTool } = await connectMcp("http://127.0.0.1:3001/mcp", { recorder });
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t._meta?.ui?.resourceUri);
  const result = await client.callTool({ name: tool.name, arguments: {} });
  await renderToolCard({ container: document.querySelector("#cards"), client,
                         uri: tool._meta.ui.resourceUri, toolInput: {}, toolResult: result });

  const voice = createVoice({ onTranscript: (text) => console.log("heard:", text) });
  voice.speak("Hello from your MCP server");
</script>
```

`node vendor.mjs <dir>` copies the built bundles into another project and records the version.

## Example

`examples/` has a tiny Python MCP server with one MCP Apps tool and a page that uses the kit:

```bash
# terminal 1: the MCP server
pip install "mcp>=2.1"
python examples/demo_server.py             # http://127.0.0.1:3001/mcp

# terminal 2: the page
npm run build
cp dist/*.js examples/                     # Windows PowerShell: Copy-Item dist\*.js examples\
python -m http.server 5173 --directory examples
# open http://127.0.0.1:5173/
```

## Used by Saathi

[**Saathi**](https://github.com/AviralSingh2003/saathi), an Alexa+ hackathon project, builds its elder and
family pages on this kit. Saathi keeps a built copy of the bundles in `web/vendor/`, so **Saathi runs without
this repo**. You only need both when you change the kit and want Saathi to pick up the new build. Clone them
side by side:

```bash
git clone https://github.com/AviralSingh2003/saathi.git
git clone https://github.com/AviralSingh2003/mcp-voice-sim.git

cd mcp-voice-sim
npm install && npm run build && npm test
npm run vendor -- ../saathi/web/vendor     # copies both bundles and writes VERSION (this repo's commit)

cd ../saathi
./demo.sh                                  # Windows: .\demo.ps1 (Python 3.11+)
# open http://127.0.0.1:8080/ and the MCP inspector panel to see the kit at work
```

## Server requirements for browser clients

Your MCP server must allow the page's origin (CORS), **expose the `Mcp-Session-Id` header**, and validate the
`Origin` header (the Streamable HTTP spec requires it to prevent DNS rebinding). With the MCP Python SDK:
`TransportSecuritySettings(allowed_origins=[...])` plus Starlette's `CORSMiddleware(expose_headers=["Mcp-Session-Id"])`
— see `examples/demo_server.py`.

## Notes

- Speech recognition is reliable only in Chrome and Edge, and Chrome sends audio to Google's speech service.
  Always offer typed input.
- Built with `@modelcontextprotocol/client` 2.x and `@modelcontextprotocol/ext-apps` 2.x.
- First used in [Saathi](https://github.com/AviralSingh2003/saathi), an Alexa+ hackathon project.

MIT licensed. See [LICENSE](LICENSE).
