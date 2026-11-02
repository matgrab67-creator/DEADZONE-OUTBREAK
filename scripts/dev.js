import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const processes = [];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of processes) child.kill();
  process.exitCode = code;
}
for (const args of [
  ['server/index.js'],
  ['node_modules/vite/bin/vite.js', '--configLoader', 'native', '--host', '0.0.0.0'],
]) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
  processes.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!closing) stop(code || 0);
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
