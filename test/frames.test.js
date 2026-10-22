import { describe, expect, it, vi } from "vitest";
import { FrameRecorder, summarize } from "../src/frames.js";

describe("summarize", () => {
  it("labels requests with method and tool name", () => {
    expect(summarize({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "recall" } })).toBe(
      "tools/call recall",
    );
  });
  it("labels notifications", () => {
    expect(summarize({ jsonrpc: "2.0", method: "notifications/initialized" })).toBe(
      "notifications/initialized (notification)",
    );
  });
  it("labels results and errors", () => {
    expect(summarize({ jsonrpc: "2.0", id: 1, result: {} })).toBe("result #1");
    expect(summarize({ jsonrpc: "2.0", id: 2, error: { message: "nope" } })).toBe("error #2: nope");
  });
});

describe("FrameRecorder", () => {
  it("records frames and notifies subscribers", () => {
    const recorder = new FrameRecorder();
    const listener = vi.fn();
    recorder.subscribe(listener);
    const frame = recorder.record("out", { jsonrpc: "2.0", id: 1, method: "initialize" });
    expect(frame.direction).toBe("out");
    expect(frame.source).toBe("browser");
    expect(recorder.frames).toHaveLength(1);
    expect(listener).toHaveBeenCalledWith(frame);
  });

  it("caps the buffer at the limit", () => {
    const recorder = new FrameRecorder({ limit: 2 });
    recorder.record("out", { id: 1, method: "a" });
    recorder.record("out", { id: 2, method: "b" });
    recorder.record("out", { id: 3, method: "c" });
    expect(recorder.frames.map((f) => f.message.id)).toEqual([2, 3]);
  });

  it("unsubscribes", () => {
    const recorder = new FrameRecorder();
    const listener = vi.fn();
    const off = recorder.subscribe(listener);
    off();
    recorder.record("in", { id: 1, result: {} });
    expect(listener).not.toHaveBeenCalled();
  });
});
