import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT) || 4000;
const dbHost = process.env.DB_HOST?.trim() || '127.0.0.1';
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER?.trim() || 'root';
const dbPassword = process.env.DB_PASSWORD ?? 'Blusmak1';
const dbName = process.env.DB_NAME?.trim() || 'jtdevtracker';
const dbTable = process.env.DB_TABLE?.trim() || 'jtdevtracker1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';
let pool;

const parseJsonPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const ensureSqlIdentifier = (value, name) => {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Invalid ${name}. Use letters, numbers, or underscore only.`);
  }
  return value;
};

const escapeIdentifier = (value) => {
  return `\`${value.replaceAll('`', '``')}\``;
};

const safeDbName = ensureSqlIdentifier(dbName, 'DB_NAME');
const safeTableName = ensureSqlIdentifier(dbTable, 'DB_TABLE');
const escapedDbName = escapeIdentifier(safeDbName);
const escapedTableName = escapeIdentifier(safeTableName);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const ensureStorage = async () => {
  const bootstrapConnection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
  });

  await bootstrapConnection.query(
    `CREATE DATABASE IF NOT EXISTS ${escapedDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await bootstrapConnection.end();

  pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: safeDbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${escapedTableName} (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      updated_at BIGINT NOT NULL,
      projects_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    `
      INSERT INTO ${escapedTableName} (id, updated_at, projects_json)
      VALUES (1, ?, JSON_ARRAY())
      ON DUPLICATE KEY UPDATE id = id
    `,
    [Date.now()],
  );
};

const readPayload = async () => {
  const [rows] = await pool.query(`
    SELECT updated_at AS updatedAt, projects_json AS projects
    FROM ${escapedTableName}
    WHERE id = 1
    LIMIT 1
  `);

  if (!Array.isArray(rows) || rows.length === 0) {
    return { updatedAt: Date.now(), projects: [] };
  }

  const row = rows[0];
  return {
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : Date.now(),
    projects: parseJsonPayload(row.projects),
  };
};

const writePayload = async (projects) => {
  const payload = {
    updatedAt: Date.now(),
    projects,
  };

  await pool.query(
    `
      UPDATE ${escapedTableName}
      SET updated_at = ?, projects_json = CAST(? AS JSON)
      WHERE id = 1
    `,
    [payload.updatedAt, JSON.stringify(projects)],
  );

  return payload;
};

const runDbTest = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT updated_at AS updatedAt FROM ${escapedTableName} WHERE id = 1 LIMIT 1`,
    );

    const currentUpdatedAt =
      Array.isArray(rows) && rows[0] && typeof rows[0].updatedAt === 'number'
        ? rows[0].updatedAt
        : Date.now();

    const nextUpdatedAt = currentUpdatedAt + 1;
    const [updateResult] = await connection.query(
      `UPDATE ${escapedTableName} SET updated_at = ? WHERE id = 1`,
      [nextUpdatedAt],
    );

    await connection.rollback();

    return {
      readOk: true,
      writeOk: updateResult?.affectedRows === 1,
      testedAt: Date.now(),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

app.get('/api/health', async (_, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true, storage: 'mysql' });
  } catch {
    response.status(500).json({ ok: false, storage: 'mysql' });
  }
});

app.get('/api/projects', async (_, response) => {
  try {
    const payload = await readPayload();
    response.json(payload);
  } catch {
    response.status(500).json({ message: 'Failed to read project data.' });
  }
});

app.get('/api/db-test', async (_, response) => {
  try {
    const result = await runDbTest();
    response.json({ ok: result.readOk && result.writeOk, ...result });
  } catch {
    response.status(500).json({
      ok: false,
      readOk: false,
      writeOk: false,
      message: 'Database test failed.',
    });
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

if (isProduction) {
  app.use(express.static(clientDistPath));
  app.use((request, response, next) => {
    if (request.path.startsWith('/api')) {
      next();
      return;
    }
    response.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const startServer = async () => {
  await ensureStorage();
  app.listen(port, '0.0.0.0', () => {
    console.log(`JT Dev Tracker running at http://localhost:${port}`);
    console.log(`MySQL: ${dbUser}@${dbHost}:${dbPort}/${safeDbName} table ${safeTableName}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start JT Dev Tracker API with MySQL storage.');
  console.error(error);
  process.exit(1);
});
