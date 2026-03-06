import express from 'express';
import cors from 'cors';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dataFilePath = path.join(dataDir, 'projects.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const ensureDataFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFilePath);
  } catch {
    const initialPayload = { updatedAt: Date.now(), projects: [] };
    await fs.writeFile(dataFilePath, JSON.stringify(initialPayload, null, 2), 'utf8');
  }
};

const readPayload = async () => {
  await ensureDataFile();
  const content = await fs.readFile(dataFilePath, 'utf8');
  return JSON.parse(content);
};

const writePayload = async (projects) => {
  const payload = {
    updatedAt: Date.now(),
    projects,
  };
  await fs.writeFile(dataFilePath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
};

app.get('/api/health', async (_, response) => {
  await ensureDataFile();
  response.json({ ok: true });
});

app.get('/api/projects', async (_, response) => {
  try {
    const payload = await readPayload();
    response.json(payload);
  } catch {
    response.status(500).json({ message: 'Failed to read project data.' });
  }
});

app.put('/api/projects', async (request, response) => {
  try {
    const projects = request.body?.projects;
    if (!Array.isArray(projects)) {
      response.status(400).json({ message: 'Invalid payload. Expected { projects: Project[] }.' });
      return;
    }
    const payload = await writePayload(projects);
    response.json(payload);
  } catch {
    response.status(500).json({ message: 'Failed to save project data.' });
  }
});

app.listen(port, async () => {
  await ensureDataFile();
  console.log(`JT Dev Tracker sync API running at http://localhost:${port}`);
});
