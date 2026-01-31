import sqlite3 from "sqlite3";
import {
  Transcript,
  Video,
} from "../shared/types.js";

// Helper functions for transforming DB rows
const transformVideo = (row) => ({
  id: row.id,
  file_path: row.file_path,
  created_at: row.created_at,
});
const transformTranscript = (row) => ({
  id: row.id,
  video_id: row.video_id,
  content: row.content,
  segments: row.segments,
  created_at: row.created_at,
});

const transformVideo = ([id, file_path, created_at]: VideoRow): Video => ({
  id,
  file_path,
  created_at,
});

const transformTranscript = ([
  id,
  video_id,
  content,
  segments,
  created_at,
]: TranscriptRow): Transcript => ({
  id,
  video_id,
  content,
  segments,
  created_at,
});

export function insertVideo(db, video, cb) {
  db.run(
    `INSERT INTO videos (id, file_path, created_at) VALUES (?, ?, ?)`,
    [video.id, video.file_path, video.created_at],
    cb
  );
}

export function getVideoById(db, id, cb) {
  db.get(
    `SELECT * FROM videos WHERE id = ?`,
    [id],
    (err, row) => cb(err, row ? transformVideo(row) : null)
  );
}

export function getAllVideos(db, cb) {
  db.all(
    `SELECT * FROM videos ORDER BY created_at DESC`,
    [],
    (err, rows) => cb(err, rows ? rows.map(transformVideo) : [])
  );
}

export function insertTranscript(db, transcript, cb) {
  db.run(
    `INSERT INTO transcripts (id, video_id, content, segments, created_at) VALUES (?, ?, ?, ?, ?)`,
    [transcript.id, transcript.video_id, transcript.content, transcript.segments, transcript.created_at],
    cb
  );
}

export function getTranscriptByVideoId(db, videoId, cb) {
  db.get(
    `SELECT * FROM transcripts WHERE video_id = ?`,
    [videoId],
    (err, row) => cb(err, row ? transformTranscript(row) : null)
  );
}

export function searchTranscripts(db, searchQuery, cb) {
  db.all(
    `SELECT * FROM transcripts WHERE content LIKE ?`,
    [`%${searchQuery}%`],
    (err, rows) => cb(err, rows ? rows.map(transformTranscript) : [])
  );
}

export function deleteTranscriptByVideoId(db, videoId, cb) {
  db.run(`DELETE FROM transcripts WHERE video_id = ?`, [videoId], cb);
}

export function deleteVideoById(db, videoId, cb) {
  db.run(`DELETE FROM videos WHERE id = ?`, [videoId], cb);
}
}

export function getVideoById(db: Database, id: string): Video | null {
  return getSingleRow<VideoRow, Video>(
    db,
    "SELECT * FROM videos WHERE id = :id",
    { id },
    transformVideo,
  );
}

export function getAllVideos(db: Database): Video[] {
  return getRows<VideoRow, Video>(
    db,
    "SELECT * FROM videos ORDER BY created_at DESC",
    {},
    transformVideo,
  );
}

export function insertTranscript(db: Database, transcript: Transcript) {
  const params: TranscriptParams = {
    id: transcript.id,
    video_id: transcript.video_id,
    content: transcript.content,
    segments: transcript.segments,
    created_at: transcript.created_at,
  };

  executeQuery(
    db,
    `INSERT INTO transcripts (id, video_id, content, segments, created_at)
     VALUES (:id, :video_id, :content, :segments, :created_at)`,
    params,
  );
}

export function getTranscriptByVideoId(
  db: Database,
  videoId: string,
): Transcript | null {
  return getSingleRow<TranscriptRow, Transcript>(
    db,
    "SELECT * FROM transcripts WHERE video_id = :video_id",
    { video_id: videoId },
    transformTranscript,
  );
}

export function searchTranscripts(
  db: Database,
  searchQuery: string,
): Transcript[] {
  return getRows<TranscriptRow, Transcript>(
    db,
    "SELECT * FROM transcripts WHERE content LIKE :search",
    { search: `%${searchQuery}%` },
    transformTranscript,
  );
}

export function deleteTranscriptByVideoId(db: Database, videoId: string) {
  db.run("DELETE FROM transcripts WHERE video_id = ?", [videoId]);
}

export function deleteVideoById(db: Database, videoId: string) {
  db.run("DELETE FROM videos WHERE id = ?", [videoId]);
}
