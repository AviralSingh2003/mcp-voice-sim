// View-side runtime for MCP App cards. Bundled as an IIFE so a card can be a
// single self-contained HTML file: inline this script, then call
// `window.McpCard.onData(({ input, data, result }) => render(data))`.
import { App } from "@modelcontextprotocol/ext-apps";

const listeners = [];
const state = { input: null, result: null };

function dataFrom(result) {
  if (!result) return null;
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((c) => c.type === "text")?.text;
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text ?? null;
  }
}

function reportSize() {
  // ResizeObserver-based autoResize can miss a render that happens in the same
  // frame as the first measurement, so report explicitly after every render.
  requestAnimationFrame(() => {
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    app.sendSizeChanged({ height }).catch(() => {});
  });
}

function emit() {
  const payload = { input: state.input, result: state.result, data: dataFrom(state.result) };
  for (const listener of listeners) listener(payload);
  reportSize();
}

const app = new App({ name: "mcp-voice-sim-card", version: "0.1.0" }, {}, { autoResize: true });
app.ontoolinput = (params) => {
  state.input = params?.arguments ?? {};
};
app.ontoolresult = (result) => {
  state.result = result;
  emit();
};

window.McpCard = {
  app,
  onData(listener) {
    listeners.push(listener);
    if (state.result) {
      listener({ input: state.input, result: state.result, data: dataFrom(state.result) });
      reportSize();
    }
  },
  reportSize,
};

app.connect().catch((error) => {
  // Not inside an MCP Apps host: render nothing rather than throwing.
  console.warn("McpCard: no host", error);
});
