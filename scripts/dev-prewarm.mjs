import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const isWindows = process.platform === "win32";
const nextBin = isWindows ? "next.cmd" : "next";
const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : nextBin;
const commandArgs = isWindows
  ? ["/d", "/s", "/c", ["next.cmd", "dev", ...args].map(quoteCmdArg).join(" ")]
  : ["dev", ...args];

const child = spawn(command, commandArgs, {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
  shell: false,
});

let warmed = false;
let prewarmUrl = `http://localhost:${process.env.PORT ?? "3000"}/`;

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function quoteCmdArg(value) {
  if (!/[()\s"%^&|<>]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function updateUrl(output) {
  const match = stripAnsi(output).match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);
  if (match) {
    prewarmUrl = `${match[0]}/`;
  }
}

async function prewarm() {
  if (warmed) return;
  warmed = true;

  try {
    process.stdout.write(`\nPrewarming ${prewarmUrl}...\n`);
    const response = await fetch(prewarmUrl, {
      headers: { "User-Agent": "councilia-dev-prewarm" },
    });
    process.stdout.write(`Prewarmed / with ${response.status}.\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`Prewarm skipped: ${message}\n`);
  }
}

function handleOutput(stream, chunk) {
  const output = chunk.toString();
  stream.write(output);
  updateUrl(output);
  if (stripAnsi(output).includes("Ready in")) {
    void prewarm();
  }
}

child.stdout.on("data", (chunk) => handleOutput(process.stdout, chunk));
child.stderr.on("data", (chunk) => handleOutput(process.stderr, chunk));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}
