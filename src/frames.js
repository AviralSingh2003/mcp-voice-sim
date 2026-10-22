// FrameRecorder: an in-memory, subscribable log of JSON-RPC frames.
// Used to show judges/developers a genuine MCP session in an inspector panel.

export function summarize(message) {
  if (!message || typeof message !== "object") return String(message);
  if (typeof message.method === "string") {
    const name = message.params?.name ? ` ${message.params.name}` : "";
    return message.id !== undefined ? `${message.method}${name}` : `${message.method} (notification)`;
  }
  if ("result" in message) return `result #${message.id}`;
  if ("error" in message) return `error #${message.id}: ${message.error?.message ?? ""}`.trim();
  return "frame";
}

export class FrameRecorder {
  constructor({ limit = 200 } = {}) {
    this.limit = limit;
    this.frames = [];
    this.listeners = new Set();
  }

  /**
   * @param {"out"|"in"} direction  out = sent by this side, in = received
   * @param {object} message        the JSON-RPC message (or a host-provided description)
   * @param {string} source         who produced it, e.g. "browser" or "host agent"
   */
  record(direction, message, source = "browser") {
    const frame = {
      ts: new Date().toISOString(),
      direction,
      source,
      message,
      summary: summarize(message),
    };
    this.frames.push(frame);
    if (this.frames.length > this.limit) this.frames.shift();
    for (const listener of this.listeners) listener(frame);
    return frame;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear() {
    this.frames = [];
  }
}
