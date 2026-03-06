import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API_URL = 'http://localhost:4000/api/health';

const isApiRunning = async () => {
  try {
    const response = await fetch(API_URL, { signal: AbortSignal.timeout(800) });
    return response.ok;
  } catch {
    return false;
  }
};

const keepAlive = () => {
  console.log('JT Dev Tracker sync API already running at http://localhost:4000 (reusing existing process).');
  const timer = setInterval(() => undefined, 60_000);

  const stop = () => {
    clearInterval(timer);
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
};

const startServer = () => {
  const serverFilePath = fileURLToPath(new URL('./index.js', import.meta.url));
  const child = spawn(process.execPath, [serverFilePath], {
    stdio: 'inherit',
  });

  const stop = () => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
};

if (await isApiRunning()) {
  keepAlive();
} else {
  startServer();
}
