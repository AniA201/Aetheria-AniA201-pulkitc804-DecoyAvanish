import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";

function free(port) {
  return new Promise((resolve) => {
    const probe = createServer()
      .once("error", () => resolve(false))
      .once("listening", () => probe.close(() => resolve(true)))
      .listen(port, "127.0.0.1");
  });
}

async function apiPort(start) {
  for (let port = start; port < start + 20; port += 1) if (await free(port)) return port;
  throw new Error(`No free port between ${start} and ${start + 19}`);
}

const python = resolve("backend/.venv/bin/python");
const children = [];

function run(name, command, args, options = {}) {
  const child = spawn(command, args, { stdio: ["inherit", "pipe", "pipe"], ...options });
  const tag = `[${name}] `;
  child.on("error", (error) => {
    process.stderr.write(`${tag}could not start: ${error.message}\n`);
    stop(1);
  });
  const relay = (stream, out) =>
    stream.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line) out.write(tag + line + "\n");
    });
  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);
  child.on("exit", (code) => {
    process.stdout.write(`${tag}stopped${code === null ? "" : ` (exit ${code})`}\n`);
    stop(code ?? 0);
  });
  children.push(child);
}

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 300);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

if (!existsSync(python)) {
  console.error(
    "backend/.venv is missing. Create it once with:\n" +
      "  python3 -m venv backend/.venv && backend/.venv/bin/python -m pip install -r backend/requirements.txt",
  );
  process.exit(1);
}

const port = await apiPort(Number(process.env.API_PORT) || 8000);
console.log(`[api] http://127.0.0.1:${port} (the site reaches it through /api)`);
run("api", python, ["-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", String(port)], { cwd: "backend" });
run("web", resolve("node_modules/.bin/vite"), process.argv.slice(2), { env: { ...process.env, API_PORT: String(port) } });
