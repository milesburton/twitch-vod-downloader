import sqlite3 from "sqlite3";
import path from "path";
import { getDataPath } from "../shared/utils.js";

const { Database } = sqlite3;

export function initDb() {
  const dbPath = getDataPath("db");
  const dbFile = path.join(dbPath, "sqlite.db");
  const db = new Database(dbFile);

  db.serialize(() => {
    // Check if table exists first to determine if we need migration
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='videos'`, (err, row) => {
      if (!err && row) {
        // Table exists, check if we need to add new columns (migration)
        db.all(`PRAGMA table_info(videos)`, (err, columns: any[]) => {
          if (!err && columns) {
            const hasTitle = columns.some((col: any) => col.name === 'title');
            const hasDuration = columns.some((col: any) => col.name === 'duration');

            if (!hasTitle) {
              db.run(`ALTER TABLE videos ADD COLUMN title TEXT`);
            }
            if (!hasDuration) {
              db.run(`ALTER TABLE videos ADD COLUMN duration INTEGER`);
            }
          }
        });
      }
    });

    // Create table with all columns (for new databases)
    db.run(`CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT,
      duration INTEGER,
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
    db.run(`CREATE TABLE IF NOT EXISTS youtube_uploads (
      id TEXT PRIMARY KEY,
      video_id TEXT REFERENCES videos(id),
      youtube_video_id TEXT,
      youtube_playlist_id TEXT,
      upload_status TEXT,
      upload_attempts INTEGER DEFAULT 0,
      error_message TEXT,
      uploaded_at TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_youtube_uploads_video_id
      ON youtube_uploads(video_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_youtube_uploads_status
      ON youtube_uploads(upload_status)`);
  });
  return db;
}

export * from "./helpers.js";
export * from "./youtube-helpers.js";
