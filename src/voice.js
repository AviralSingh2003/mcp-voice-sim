// Web Speech voice loop with graceful degradation.
// SpeechRecognition is only reliable in Chrome/Edge (and Chrome sends audio to
// Google's speech service), so callers should always offer typed input too.

export function createVoice({ lang = "en-US", rate = 0.95, onTranscript, onState } = {}, win = globalThis) {
  const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;
  const synth = win.speechSynthesis;
  const canListen = typeof Recognition === "function";
  const canSpeak = Boolean(synth) && typeof win.SpeechSynthesisUtterance === "function";

  let recognition = null;
  let listening = false;

  function setState(state, detail) {
    onState?.(state, detail);
  }

  function listen() {
    if (!canListen || listening) return false;
    recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscript?.(transcript);
    };
    recognition.onerror = (event) => setState("error", event.error);
    recognition.onend = () => {
      listening = false;
      setState("idle");
    };
    recognition.start();
    listening = true;
    setState("listening");
    return true;
  }

  function stop() {
    if (recognition && listening) recognition.stop();
  }

  function speak(text) {
    if (!canSpeak || !text) return Promise.resolve(false);
    return new Promise((resolve) => {
      synth.cancel();
      const utterance = new win.SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      setState("speaking");
      synth.speak(utterance);
    });
  }

  return {
    canListen,
    canSpeak,
    listen,
    stop,
    speak,
    get listening() {
      return listening;
    },
  };
}

/** Wire a <form> with a text input as the typed fallback. */
export function attachTypedInput(form, input, onSubmit) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    onSubmit(text);
  });
}
