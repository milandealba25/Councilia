import { spawn, spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const devPorts = new Set([3000, 3001, 3002, 3003]);

function run(command, args) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

function normalize(value) {
  return value.toLowerCase().replaceAll("/", "\\");
}

function listeningPids() {
  if (process.platform !== "win32") return [];
  const result = run("netstat.exe", ["-ano", "-p", "tcp"]);
  if (result.status !== 0) return [];

  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const local = parts[1] ?? "";
    const pid = Number(parts.at(-1));
    const port = Number(local.match(/:(\d+)$/)?.[1]);
    if (devPorts.has(port) && Number.isInteger(pid)) {
      pids.add(pid);
    }
  }
  return [...pids];
}

function processInfo(pid) {
  const result = run("powershell.exe", [
    "-NoProfile",
    "-Command",
    [
      `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"`,
      "if ($p) {",
      "  [Console]::WriteLine($p.Name)",
      "  [Console]::WriteLine($p.CommandLine)",
      "}",
    ].join("; "),
  ]);
  if (result.status !== 0) return null;
  const [name = "", ...commandLine] = result.stdout.split(/\r?\n/);
  return {
    name: name.trim(),
    commandLine: commandLine.join(" ").trim(),
  };
}

function isProjectNextProcess(info) {
  if (!info) return false;
  const name = info.name.toLowerCase();
  const commandLine = normalize(info.commandLine);
  const project = normalize(cwd);
  return (
    name.includes("node") &&
    commandLine.includes(project) &&
    (commandLine.includes("next") || commandLine.includes("npm"))
  );
}

function stopStaleDevServers() {
  for (const pid of listeningPids()) {
    const info = processInfo(pid);
    if (!isProjectNextProcess(info)) continue;
    run("taskkill.exe", ["/PID", String(pid), "/T", "/F"]);
  }
}

async function cleanNextCache() {
  const target = path.resolve(cwd, ".next");
  if (path.dirname(target) !== cwd) {
    throw new Error(`Refusing to clean unexpected path: ${target}`);
  }
  await rm(target, {
    recursive: true,
    force: true,
    maxRetries: 12,
    retryDelay: 250,
  });
}

stopStaleDevServers();
await cleanNextCache();

const nextBin = path.join(cwd, "node_modules", ".bin", "next");
const command =
  process.platform === "win32"
    ? {
        bin: "cmd.exe",
        args: ["/d", "/c", `${nextBin}.cmd dev -p 3000`],
      }
    : { bin: nextBin, args: ["dev", "-p", "3000"] };
const child = spawn(command.bin, command.args, {
  cwd,
  stdio: "inherit",
  windowsHide: false,
});

let shuttingDown = false;

function stopChild() {
  if (!child.pid || shuttingDown) return;
  shuttingDown = true;
  if (process.platform === "win32") {
    run("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"]);
  } else {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  stopChild();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopChild();
  process.exit(143);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
