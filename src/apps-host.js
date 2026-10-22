// A minimal MCP Apps host: renders a `ui://` resource in a sandboxed iframe and
// talks to it over the MCP Apps postMessage protocol using the official AppBridge.
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

export const APP_MIME_TYPE = "text/html;profile=mcp-app";

/** Read a ui:// resource through an MCP client and return its HTML. */
export async function fetchAppHtml(client, uri) {
  const result = await client.readResource({ uri });
  const content = result.contents?.[0];
  if (!content || typeof content.text !== "string") {
    throw new Error(`Resource ${uri} has no HTML text`);
  }
  if (content.mimeType && !content.mimeType.startsWith("text/html")) {
    throw new Error(`Resource ${uri} is ${content.mimeType}, expected ${APP_MIME_TYPE}`);
  }
  return content.text;
}

/** Normalise a structured tool result into a CallToolResult for the view. */
export function toCallToolResult(result) {
  if (result && Array.isArray(result.content)) return result;
  return {
    content: [{ type: "text", text: JSON.stringify(result ?? {}) }],
    structuredContent: result ?? {},
  };
}

/**
 * Render an MCP App.
 * The bridge is connected BEFORE the document loads, so the view's
 * ui/initialize request is never missed.
 */
export async function renderApp({
  container,
  html,
  client = null,
  toolInput = {},
  toolResult,
  title = "MCP App",
  hostInfo = { name: "mcp-voice-sim", version: "0.1.0" },
  minHeight = 120,
}) {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("title", title);
  frame.className = "mcp-app-frame";
  frame.style.width = "100%";
  frame.style.border = "0";
  frame.style.height = `${minHeight}px`; // replaced by the view's size-changed notifications
  container.appendChild(frame);

  const bridge = new AppBridge(client, hostInfo, { openLinks: {}, logging: {} });
  bridge.onsizechange = ({ height }) => {
    if (height) frame.style.height = `${Math.ceil(height)}px`;
  };
  bridge.oninitialized = async () => {
    await bridge.sendToolInput({ arguments: toolInput });
    if (toolResult !== undefined) await bridge.sendToolResult(toCallToolResult(toolResult));
  };
  await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow));
  frame.srcdoc = html;

  return {
    frame,
    bridge,
    async update(result) {
      await bridge.sendToolResult(toCallToolResult(result));
    },
    dispose() {
      bridge.close?.();
      frame.remove();
    },
  };
}

/** Convenience: fetch the resource and render it in one call. */
export async function renderToolCard({ container, client, uri, toolInput, toolResult, title }) {
  const html = await fetchAppHtml(client, uri);
  return renderApp({ container, html, client, toolInput, toolResult, title: title ?? uri });
}
