import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'forensics.db'));

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_names TEXT,
    duration_sec INTEGER,
    sentiment_score INTEGER,
    risk_score INTEGER,
    compliance_score INTEGER,
    summary TEXT,
    full_result_json TEXT
  );

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
    role TEXT DEFAULT 'user',
    is_verified INTEGER DEFAULT 0,
    department_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );
`);

export interface CallRecord {
  id: string;
  created_at: string;
  file_names: string;
  duration_sec: number;
  sentiment_score: number;
  risk_score: number;
  compliance_score: number;
  summary: string;
  full_result_json: string;
}

export const insertCall = db.prepare(`
  INSERT INTO calls (
    id, file_names, duration_sec, sentiment_score, risk_score, compliance_score, summary, full_result_json
  ) VALUES (
    @id, @file_names, @duration_sec, @sentiment_score, @risk_score, @compliance_score, @summary, @full_result_json
  )
`);

export const getCalls = db.prepare(`
  SELECT id, created_at, file_names, duration_sec, sentiment_score, risk_score, compliance_score, summary 
  FROM calls 
  ORDER BY created_at DESC
`);

export const getCallById = db.prepare(`
  SELECT * FROM calls WHERE id = ?
`);

export interface UserRecord {
  id: string;
  username: string;
  password?: string;
  is_verified: number;
  created_at: string;
}

export const insertUser = db.prepare(`
  INSERT INTO users (id, username, password, is_verified)
  VALUES (@id, @username, @password, @is_verified)
`);

export const getUserByUsername = db.prepare(`
  SELECT * FROM users WHERE username = ?
`);

export const getUserById = db.prepare(`
  SELECT id, username, is_verified, created_at FROM users WHERE id = ?
`);

export const getAllUsers = db.prepare(`
  SELECT id, username, is_verified, created_at FROM users ORDER BY created_at DESC
`);

export const verifyUser = db.prepare(`
  UPDATE users SET is_verified = 1 WHERE id = ?
`);

export const deleteUser = db.prepare(`
  DELETE FROM users WHERE id = ?
`);

export default db;
