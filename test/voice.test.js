import { describe, expect, it, vi } from "vitest";
import { createVoice } from "../src/voice.js";

describe("createVoice", () => {
  it("degrades when the Web Speech API is missing", async () => {
    const voice = createVoice({}, {});
    expect(voice.canListen).toBe(false);
    expect(voice.canSpeak).toBe(false);
    expect(voice.listen()).toBe(false);
    await expect(voice.speak("hello")).resolves.toBe(false);
  });

  it("delivers a transcript from SpeechRecognition", () => {
    let instance;
    class FakeRecognition {
      constructor() {
        instance = this;
      }
      start() {}
      stop() {
        this.onend?.();
      }
    }
    const onTranscript = vi.fn();
    const voice = createVoice({ onTranscript }, { webkitSpeechRecognition: FakeRecognition });
    expect(voice.canListen).toBe(true);
    expect(voice.listen()).toBe(true);
    expect(voice.listening).toBe(true);
    instance.onresult({ results: [[{ transcript: " remind me at 2 " }]] });
    expect(onTranscript).toHaveBeenCalledWith("remind me at 2");
    voice.stop();
    expect(voice.listening).toBe(false);
  });

  it("speaks with speechSynthesis and resolves on end", async () => {
    const synth = { cancel: vi.fn(), speak: vi.fn((u) => u.onend()) };
    class Utterance {
      constructor(text) {
        this.text = text;
      }
    }
    const voice = createVoice({ lang: "en-IN" }, { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
    await expect(voice.speak("Good morning")).resolves.toBe(true);
    expect(synth.speak.mock.calls[0][0].lang).toBe("en-IN");
  });
});
