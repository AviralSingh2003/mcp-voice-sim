// A live JSON-RPC inspector panel bound to a FrameRecorder.

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? String(iso) : date.toTimeString().slice(0, 8); // local time
}

export function renderFrame(doc, frame) {
  const item = doc.createElement("details");
  item.className = `frame frame-${frame.direction}`;
  const summary = doc.createElement("summary");
  const arrow = frame.direction === "out" ? "→" : "←";
  summary.textContent = `${formatTime(frame.ts)} ${arrow} [${frame.source}] ${frame.summary}`;
  const body = doc.createElement("pre");
  body.textContent = JSON.stringify(frame.message, null, 2);
  item.append(summary, body);
  return item;
}

/**
 * Mount an inspector into `element`. Existing frames are rendered, new ones
 * stream in. Returns an unsubscribe function.
 */
export function mountInspector(element, recorder, { newestFirst = true } = {}) {
  const doc = element.ownerDocument;
  element.classList.add("mcp-inspector");
  const add = (frame) => {
    const node = renderFrame(doc, frame);
    if (newestFirst) element.prepend(node);
    else element.append(node);
  };
  for (const frame of recorder.frames) add(frame);
  return recorder.subscribe(add);
}
