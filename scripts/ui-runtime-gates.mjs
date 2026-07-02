import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outputDir = join(root, "output", "ui-runtime-gates");
const runtimeDataDir = join(outputDir, "runtime-data", String(Date.now()));
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const apiUrl = process.env.UI_RUNTIME_API_URL ?? "http://127.0.0.1:3000/health";
const webUrl = process.env.UI_RUNTIME_WEB_URL ?? "http://127.0.0.1:5173/login";

mkdirSync(outputDir, { recursive: true });
mkdirSync(runtimeDataDir, { recursive: true });

function npmArgs(args) {
  return process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd", ...args] : args;
}

function spawnService(name, args, extraEnv = {}) {
  const child = spawn(npmCommand, npmArgs(args), {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    windowsHide: true,
    detached: process.platform !== "win32"
  });
  child.stdout.pipe(createWriteStream(join(outputDir, `${name}.out.log`), { flags: "a" }));
  child.stderr.pipe(createWriteStream(join(outputDir, `${name}.err.log`), { flags: "a" }));
  return child;
}

async function waitForUrl(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = "";
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

function runNpmScript(script) {
  execFileSync(npmCommand, npmArgs(["run", script]), {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
}

function stopProcessTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // best effort cleanup
    }
  }
}

const api = spawnService("api", ["--workspace", "@eprocurement/api", "run", "dev"], {
  APP_ENV: "test",
  APP_DATA_DIR: runtimeDataDir,
  DISABLE_MOCK_AUTH: "false"
});
const web = spawnService("web", ["--workspace", "@eprocurement/web", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"]);

try {
  await Promise.all([waitForUrl(apiUrl), waitForUrl(webUrl)]);
  runNpmScript("ui:smoke");
  runNpmScript("ui:visual");
  runNpmScript("ui:role-flow");
  console.log("UI runtime gates passed.");
} finally {
  stopProcessTree(api);
  stopProcessTree(web);
}
