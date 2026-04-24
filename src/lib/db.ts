import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production' || process.env.K_SERVICE || process.env.PORT === '3000';
const dbPath = isProduction 
  ? path.join('/tmp', 'database.sqlite')
  : path.join(process.cwd(), 'database.sqlite');

console.log(`[DB] Using database at: ${dbPath} (Production: ${isProduction})`);
let db: Database.Database;

try {
  db = new Database(dbPath);
} catch (err) {
  console.error(`[DB] Failed to initialize database at ${dbPath}:`, err);
  // Fallback to in-memory if disk is unavailable, though volatile
  console.log(`[DB] Falling back to in-memory database`);
  db = new Database(':memory:');
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_verified INTEGER DEFAULT 0,
    department_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    file_names TEXT NOT NULL,
    duration_sec REAL,
    sentiment_score REAL,
    risk_score REAL,
    compliance_score REAL,
    summary TEXT,
    full_result_json TEXT,
    created_by TEXT,
    department_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id),
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export default db;
