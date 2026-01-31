import sqlite3 from "sqlite3";
import {
  Transcript,
  Video,
} from "../shared/types.js";

// Helper functions for transforming DB rows
const transformVideo = (row: any): Video => ({
  id: row.id,
  file_path: row.file_path,
  created_at: row.created_at,
});

const transformTranscript = (row: any): Transcript => ({
  id: row.id,
  video_id: row.video_id,
  content: row.content,
  segments: row.segments,
  created_at: row.created_at,
});

export function insertVideo(db: sqlite3.Database, video: Video, cb?: (err: Error | null) => void) {
  db.run(
    `INSERT INTO videos (id, file_path, created_at) VALUES (?, ?, ?)`,
    [video.id, video.file_path, video.created_at],
    cb
  );
}

export function getVideoById(db: sqlite3.Database, id: string, cb: (err: Error | null, video: Video | null) => void) {
  db.get(
    `SELECT * FROM videos WHERE id = ?`,
    [id],
    (err, row) => cb(err, row ? transformVideo(row) : null)
  );
}

export function getAllVideos(db: sqlite3.Database, cb: (err: Error | null, videos: Video[]) => void) {
  db.all(
    `SELECT * FROM videos ORDER BY created_at DESC`,
    [],
    (err, rows) => cb(err, rows ? rows.map(transformVideo) : [])
  );
}

export function insertTranscript(db: sqlite3.Database, transcript: Transcript, cb?: (err: Error | null) => void) {
  db.run(
    `INSERT INTO transcripts (id, video_id, content, segments, created_at) VALUES (?, ?, ?, ?, ?)`,
    [transcript.id, transcript.video_id, transcript.content, transcript.segments, transcript.created_at],
    cb
  );
}

export function getTranscriptByVideoId(db: sqlite3.Database, videoId: string, cb: (err: Error | null, transcript: Transcript | null) => void) {
  db.get(
    `SELECT * FROM transcripts WHERE video_id = ?`,
    [videoId],
    (err, row) => cb(err, row ? transformTranscript(row) : null)
  );
}

export function searchTranscripts(db: sqlite3.Database, searchQuery: string, cb: (err: Error | null, transcripts: Transcript[]) => void) {
  db.all(
    `SELECT * FROM transcripts WHERE content LIKE ?`,
    [`%${searchQuery}%`],
    (err, rows) => cb(err, rows ? rows.map(transformTranscript) : [])
  );
}

export function deleteTranscriptByVideoId(db: sqlite3.Database, videoId: string, cb?: (err: Error | null) => void) {
  db.run(`DELETE FROM transcripts WHERE video_id = ?`, [videoId], cb);
}

export function deleteVideoById(db: sqlite3.Database, videoId: string, cb?: (err: Error | null) => void) {
  db.run(`DELETE FROM videos WHERE id = ?`, [videoId], cb);
}
