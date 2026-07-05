import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

declare global {
  // eslint-disable-next-line no-var
  var __cargoPool: mysql.Pool | undefined;
}

export function generateId() {
  return randomUUID();
}

function env(name: string, fallback = '') {
  return (process.env[name] ?? fallback).trim();
}

function getPoolConfig(): string | mysql.PoolOptions {
  // Prefer individual MYSQL_* vars when host is set (avoids MYSQL_URL override mistakes)
  if (env('MYSQL_HOST') || env('MYSQL_USER') || env('MYSQL_DATABASE')) {
    return {
      host: env('MYSQL_HOST', 'localhost'),
      port: Number(env('MYSQL_PORT', '3306')),
      user: env('MYSQL_USER', 'root'),
      password: env('MYSQL_PASSWORD'),
      database: env('MYSQL_DATABASE', 'cargo_fleet'),
      waitForConnections: true,
      connectionLimit: 10,
    };
  }

  const mysqlUrl = env('MYSQL_URL');
  if (mysqlUrl) {
    return mysqlUrl;
  }

  return {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'cargo_fleet',
    waitForConnections: true,
    connectionLimit: 10,
  };
}

function getConfigKey() {
  const config = getPoolConfig();
  return typeof config === 'string' ? config : JSON.stringify(config);
}

let lastPoolConfigKey: string | undefined;

function getPool() {
  const configKey = getConfigKey();

  if (globalThis.__cargoPool && lastPoolConfigKey !== configKey) {
    resetPool();
  }

  if (!globalThis.__cargoPool) {
    globalThis.__cargoPool = mysql.createPool(getPoolConfig());
    lastPoolConfigKey = configKey;
  }

  return globalThis.__cargoPool;
}

export function resetPool() {
  if (globalThis.__cargoPool) {
    void globalThis.__cargoPool.end();
    globalThis.__cargoPool = undefined;
  }
  lastPoolConfigKey = undefined;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T;
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] ?? null;
}

export { getPool as pool };
