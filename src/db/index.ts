import sqlite3 from "sqlite3";
import path from "path";
import { getDataPath } from "../shared/utils.js";

const { Database } = sqlite3;

export function initDb() {
  const dbPath = getDataPath("db");
  const dbFile = path.join(dbPath, "sqlite.db");
  const db = new Database(dbFile);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      file_path TEXT,
      created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      video_id TEXT REFERENCES videos(id),
      content TEXT,
      segments TEXT,
      created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      video_id TEXT REFERENCES videos(id),
      start_time INTEGER,
      end_time INTEGER,
      content TEXT,
      summary TEXT,
      title TEXT,
      created_at TEXT
    )`);
  });
  return db;
}

export * from "./helpers.js";
