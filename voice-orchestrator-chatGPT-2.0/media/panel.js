const vscode = acquireVsCodeApi();
const logEl = document.getElementById("log");

function log(msg) {
  logEl.textContent += "\n" + msg;
  logEl.scrollTop = logEl.scrollHeight;
}

let mediaRecorder;
let chunks = [];

document.getElementById("startVoice").onclick = () => {
  vscode.postMessage({ type: "startVoice" });
};


document.getElementById("status").onclick = () => {
  vscode.postMessage({ type: "status" });
};

window.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg.type === "log") log(msg.message);
  if (msg.type === "state") log(`Task: ${msg.job || "none"}`);
});
