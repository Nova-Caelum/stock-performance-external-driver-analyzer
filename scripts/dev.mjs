// Runs the API server (tsx watch) and the Vite dev server together; stops both when either exits.
import { spawn } from "node:child_process";

const commands = [
  ["tsx", "watch", "server/index.ts"],
  ["vite"],
];

const children = commands.map(([bin, ...args]) =>
  spawn(`node_modules/.bin/${bin}`, args, { stdio: "inherit" }),
);

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}

for (const child of children) child.once("exit", (code) => stop(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
