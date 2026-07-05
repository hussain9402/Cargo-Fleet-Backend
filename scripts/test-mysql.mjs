import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

const envPath = path.join(process.cwd(), '.env');
const env = loadEnv(envPath);

const user = env.MYSQL_USER || 'root';
const password = env.MYSQL_PASSWORD ?? '';
const database = env.MYSQL_DATABASE || 'cargo_fleet';
const port = Number(env.MYSQL_PORT || 3306);
const hosts = [...new Set([env.MYSQL_HOST || 'localhost', '127.0.0.1', 'localhost'])];

console.log(`Testing MySQL as ${user} on database ${database} (password length: ${password.length})`);

for (const host of hosts) {
  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });
    await connection.query('SELECT 1');
    await connection.end();
    console.log(`OK: connected via ${host}:${port}`);
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL: ${host}:${port} -> ${message}`);
  }
}

process.exit(1);
