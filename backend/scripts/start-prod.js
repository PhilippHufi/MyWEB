import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
process.chdir(backendDir);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

function databasePath() {
  const url = process.env.DATABASE_URL || 'file:/data/prod.db';
  if (!url.startsWith('file:')) return null;
  return url.slice('file:'.length);
}

function backupDatabase() {
  const dbPath = databasePath();
  if (!dbPath) return;

  const resolvedDb = path.resolve(dbPath);
  const dataDir = path.dirname(resolvedDb);
  const backupDir = path.join(dataDir, 'backups');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  if (!fs.existsSync(resolvedDb)) {
    console.log(`[startup] No existing database at ${resolvedDb}; starting with migrations.`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const suffix of ['', '-wal', '-shm']) {
    const source = `${resolvedDb}${suffix}`;
    if (fs.existsSync(source)) {
      const target = path.join(backupDir, `${path.basename(resolvedDb)}-${stamp}${suffix || '.bak'}`);
      fs.copyFileSync(source, target);
      console.log(`[startup] Backed up ${source} to ${target}`);
    }
  }

  const backups = fs.readdirSync(backupDir)
    .filter((name) => name.startsWith(path.basename(resolvedDb)))
    .map((name) => ({ name, time: fs.statSync(path.join(backupDir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const old of backups.slice(60)) {
    fs.rmSync(path.join(backupDir, old.name), { force: true });
  }
}

backupDatabase();
run('npx', ['prisma', 'migrate', 'deploy']);
run('node', ['prisma/seed.js']);
if (process.env.STARTUP_CHECK_ONLY === '1') process.exit(0);
run('node', ['src/server.js']);
