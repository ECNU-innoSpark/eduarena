import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const forwardedArgs = process.argv.slice(2);
const isWindows = process.platform === "win32";

const npmCommand = isWindows ? "npm.cmd" : "npm";
const nodeCommand = process.execPath;
const nodeModulesDir = path.join(__dirname, "node_modules");
const defaultApiPort = Number(process.env.API_PORT || "5174");

function spawnInProject(command, args, options = {}) {
  return spawn(command, args, {
    cwd: __dirname,
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

function canListen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = process.getBuiltinModule("node:net").createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function pickApiPort() {
  for (let port = defaultApiPort; port <= defaultApiPort + 20; port += 1) {
    if (await canListen(port)) {
      return port;
    }
  }

  throw new Error(`No available API port found in range ${defaultApiPort}-${defaultApiPort + 20}.`);
}

function waitForExit(child, name) {
  return new Promise((resolve, reject) => {
    child.on("error", (error) => {
      reject(new Error(`${name} failed to start: ${error.message}`));
    });
    child.on("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function ensureDependencies() {
  if (existsSync(nodeModulesDir)) return;

  const install = spawnInProject(npmCommand, ["install"]);
  const { code, signal } = await waitForExit(install, "npm install");
  if (code !== 0) {
    throw new Error(`npm install exited with code ${code ?? "null"}${signal ? ` (signal: ${signal})` : ""}`);
  }
}

async function main() {
  await ensureDependencies();

  const apiPort = await pickApiPort();
  const sharedEnv = {
    ...process.env,
    API_PORT: String(apiPort),
  };

  if (apiPort !== defaultApiPort) {
    console.error(`API port ${defaultApiPort} is in use; using ${apiPort} instead.`);
  }

  const server = spawnInProject(nodeCommand, ["server.js"], { env: sharedEnv });
  const devServer = spawnInProject(npmCommand, ["run", "dev", "--", ...forwardedArgs], { env: sharedEnv });

  let shuttingDown = false;
  let resolved = false;

  const terminate = (child) => {
    if (!child || child.killed) return;
    child.kill("SIGTERM");
  };

  const shutdown = (reason, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;

    if (reason) {
      console.error(reason);
    }

    terminate(devServer);
    terminate(server);

    setTimeout(() => {
      terminate(devServer);
      terminate(server);
      process.exit(exitCode);
    }, 100).unref();
  };

  process.on("SIGINT", () => shutdown("", 0));
  process.on("SIGTERM", () => shutdown("", 0));

  const settle = (name, result) => {
    if (resolved) return;
    resolved = true;

    const exitCode = result.code ?? 0;
    if (exitCode !== 0) {
      shutdown(`${name} exited with code ${exitCode}`, exitCode);
      return;
    }

    if (result.signal) {
      shutdown(`${name} exited due to signal ${result.signal}`, 1);
      return;
    }

    shutdown("", 0);
  };

  waitForExit(server, "API server")
    .then((result) => settle("API server", result))
    .catch((error) => shutdown(error.message, 1));

  waitForExit(devServer, "vite dev server")
    .then((result) => settle("vite dev server", result))
    .catch((error) => shutdown(error.message, 1));

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
