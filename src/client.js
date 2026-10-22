// A direct browser MCP client over Streamable HTTP that records every
// JSON-RPC frame it sends and receives.
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

/**
 * Wrap a transport so outgoing and incoming JSON-RPC messages are recorded.
 * Incoming messages are captured by intercepting the `onmessage` property,
 * which the SDK Client assigns during connect(), so the initialize response
 * is recorded too.
 */
export function instrumentTransport(transport, recorder, source = "browser") {
  if (!recorder) return transport;
  const originalSend = transport.send.bind(transport);
  transport.send = async (message, options) => {
    recorder.record("out", message, source);
    return originalSend(message, options);
  };

  let handler;
  const wrapped = (message, extra) => {
    recorder.record("in", message, source);
    return handler?.(message, extra);
  };
  Object.defineProperty(transport, "onmessage", {
    configurable: true,
    enumerable: true,
    get: () => (handler ? wrapped : undefined),
    set: (fn) => {
      handler = fn;
    },
  });
  return transport;
}

/**
 * Connect to an MCP server over Streamable HTTP.
 * @returns {Promise<{client, transport, callTool, close}>}
 */
export async function connectMcp(url, { recorder, clientInfo, source = "browser" } = {}) {
  const transport = instrumentTransport(
    new StreamableHTTPClientTransport(new URL(url)),
    recorder,
    source,
  );
  const client = new Client(clientInfo ?? { name: "mcp-voice-sim", version: "0.1.0" });
  await client.connect(transport);

  /** Call a tool and return its structured content (or parsed text). Throws on isError. */
  async function callTool(name, args = {}) {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) {
      const text = result.content?.map((c) => c.text).filter(Boolean).join(" ") || "Tool error";
      throw new Error(text);
    }
    if (result.structuredContent) return result.structuredContent;
    const text = result.content?.find((c) => c.type === "text")?.text;
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return text;
    }
  }

  async function close() {
    try {
      await transport.terminateSession?.();
    } catch {
      /* server may already be gone */
    }
    await client.close();
  }

  return { client, transport, callTool, close };
}
