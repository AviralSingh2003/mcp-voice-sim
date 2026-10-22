// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { FrameRecorder } from "../src/frames.js";
import { mountInspector } from "../src/inspector.js";
import { instrumentTransport } from "../src/client.js";

describe("mountInspector", () => {
  it("renders existing and new frames, newest first", () => {
    const recorder = new FrameRecorder();
    recorder.record("out", { jsonrpc: "2.0", id: 1, method: "initialize" });
    const panel = document.createElement("div");
    mountInspector(panel, recorder);
    recorder.record("in", { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-11-25" } }, "host agent");

    const items = panel.querySelectorAll("details.frame");
    expect(items).toHaveLength(2);
    expect(items[0].querySelector("summary").textContent).toContain("[host agent] result #1");
    expect(items[1].querySelector("summary").textContent).toContain("→ [browser] initialize");
    expect(items[0].querySelector("pre").textContent).toContain("2025-11-25");
  });
});

describe("instrumentTransport", () => {
  it("records outgoing sends and incoming messages delivered via onmessage", async () => {
    const recorder = new FrameRecorder();
    const sent = [];
    const transport = { send: async (m) => sent.push(m), onmessage: undefined };
    instrumentTransport(transport, recorder);

    const received = [];
    transport.onmessage = (m) => received.push(m); // what the SDK Client does on connect
    await transport.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    transport.onmessage({ jsonrpc: "2.0", id: 1, result: { tools: [] } });

    expect(sent).toHaveLength(1);
    expect(received).toHaveLength(1);
    expect(recorder.frames.map((f) => f.direction)).toEqual(["out", "in"]);
  });
});
