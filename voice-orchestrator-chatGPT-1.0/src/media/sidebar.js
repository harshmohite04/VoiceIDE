(function () {
  const vscode = acquireVsCodeApi();
  const wakePhrase = "hey code";
  let listening = false;
  let primed = false;
  let recognition;
  const toggleBtn = document.getElementById("toggle");
  const logBox = document.getElementById("log");

  const log = (m) => {
    logBox.innerText = m + "\n" + logBox.innerText;
  };

  function startListening() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      log("⚠️ SpeechRecognition not available. Whisper integration required.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase().trim();
        if (!event.results[i].isFinal) continue;

        if (!primed) {
          if (text.includes(wakePhrase)) {
            primed = true;
            vscode.postMessage({ type: "wake-heard" });
            log("🎤 Wake word detected.");
          }
          continue;
        }

        const finalText = text.replace(wakePhrase, "").trim();
        if (finalText) {
          vscode.postMessage({ type: "stt-text", text: finalText });
          log("✅ Recognized: " + finalText);
        }
        primed = false;
      }
    };

    recognition.onend = () => {
      if (listening) recognition.start();
    };

    recognition.start();
    listening = true;
    toggleBtn.innerText = "Stop";
    log("🎙️ Listening… say: \"hey code ...\"");
  }

  function stopListening() {
    listening = false;
    try { recognition && recognition.stop(); } catch {}
    toggleBtn.innerText = "Start";
    log("⏹️ Stopped listening.");
  }

  toggleBtn.addEventListener("click", () => {
  vscode.postMessage({ type: "toggle" });
});


  window.addEventListener("message", (ev) => {
    const msg = ev.data || {};
    if (msg.type === "pause") stopListening();
    if (msg.type === "resume") startListening();
  });
})();
