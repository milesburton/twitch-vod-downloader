import sqlite3 from "sqlite3";
import { randomUUID } from "crypto";
import { YouTubeUpload, YouTubeUploadStatus, Video } from "../shared/types.js";

// Helper function for transforming DB rows
const transformYouTubeUpload = (row: any): YouTubeUpload => ({
  id: row.id,
  video_id: row.video_id,
  youtube_video_id: row.youtube_video_id,
  youtube_playlist_id: row.youtube_playlist_id,
  upload_status: row.upload_status as YouTubeUploadStatus,
  upload_attempts: row.upload_attempts,
  error_message: row.error_message,
  uploaded_at: row.uploaded_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// ============================================================================
// Callback-based functions
// ============================================================================

export function createYouTubeUpload(
  db: sqlite3.Database,
  videoId: string,
  cb?: (err: Error | null, uploadId?: string) => void
) {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO youtube_uploads (id, video_id, youtube_video_id, youtube_playlist_id, upload_status, upload_attempts, error_message, uploaded_at, created_at, updated_at)
     VALUES (?, ?, NULL, NULL, 'pending', 0, NULL, NULL, ?, ?)`,
    [id, videoId, now, now],
    (err) => {
      if (cb) cb(err, err ? undefined : id);
    }
  );
}

export function getYouTubeUploadByVideoId(
  db: sqlite3.Database,
  videoId: string,
  cb: (err: Error | null, upload: YouTubeUpload | null) => void
) {
  db.get(
    `SELECT * FROM youtube_uploads WHERE video_id = ? ORDER BY created_at DESC LIMIT 1`,
    [videoId],
    (err, row) => cb(err, row ? transformYouTubeUpload(row) : null)
  );
}

export function getYouTubeUploadById(
  db: sqlite3.Database,
  uploadId: string,
  cb: (err: Error | null, upload: YouTubeUpload | null) => void
) {
  db.get(
    `SELECT * FROM youtube_uploads WHERE id = ?`,
    [uploadId],
    (err, row) => cb(err, row ? transformYouTubeUpload(row) : null)
  );
}

export function updateUploadStatus(
  db: sqlite3.Database,
  uploadId: string,
  status: YouTubeUploadStatus,
  cb?: (err: Error | null) => void
) {
  const now = new Date().toISOString();
  db.run(
    `UPDATE youtube_uploads SET upload_status = ?, updated_at = ? WHERE id = ?`,
    [status, now, uploadId],
    cb
  );
}

export function updateUploadSuccess(
  db: sqlite3.Database,
  uploadId: string,
  youtubeVideoId: string,
  youtubePlaylistId: string | null,
  cb?: (err: Error | null) => void
) {
  const now = new Date().toISOString();
  db.run(
    `UPDATE youtube_uploads
     SET upload_status = 'completed',
         youtube_video_id = ?,
         youtube_playlist_id = ?,
         uploaded_at = ?,
         updated_at = ?
     WHERE id = ?`,
    [youtubeVideoId, youtubePlaylistId, now, now, uploadId],
    cb
  );
}

export function updateUploadFailure(
  db: sqlite3.Database,
  uploadId: string,
  errorMessage: string,
  cb?: (err: Error | null) => void
) {
  const now = new Date().toISOString();
  db.run(
    `UPDATE youtube_uploads
     SET upload_status = 'failed',
         error_message = ?,
         upload_attempts = upload_attempts + 1,
         updated_at = ?
     WHERE id = ?`,
    [errorMessage, now, uploadId],
    cb
  );
}

export function getPendingUploads(
  db: sqlite3.Database,
  maxAttempts: number,
  cb: (err: Error | null, videos: Video[]) => void
) {
  db.all(
    `SELECT v.* FROM videos v
     LEFT JOIN youtube_uploads yu ON v.id = yu.video_id
     WHERE yu.id IS NULL
        OR (yu.upload_status = 'failed' AND yu.upload_attempts < ?)
     ORDER BY v.created_at ASC`,
    [maxAttempts],
    (err, rows) => cb(err, rows ? rows.map((row: any) => ({
      id: row.id,
      file_path: row.file_path,
      created_at: row.created_at,
    })) : [])
  );
}

export function incrementUploadAttempts(
  db: sqlite3.Database,
  uploadId: string,
  cb?: (err: Error | null) => void
) {
  const now = new Date().toISOString();
  db.run(
    `UPDATE youtube_uploads
     SET upload_attempts = upload_attempts + 1,
         updated_at = ?
     WHERE id = ?`,
    [now, uploadId],
    cb
  );
}

// ============================================================================
// Promise-based wrappers for async/await usage
// ============================================================================

export function createYouTubeUploadAsync(
  db: sqlite3.Database,
  videoId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    createYouTubeUpload(db, videoId, (err, uploadId) => {
      if (err) reject(err);
      else resolve(uploadId!);
    });
  });
}

export function getYouTubeUploadByVideoIdAsync(
  db: sqlite3.Database,
  videoId: string
): Promise<YouTubeUpload | null> {
  return new Promise((resolve, reject) => {
    getYouTubeUploadByVideoId(db, videoId, (err, upload) => {
      if (err) reject(err);
      else resolve(upload);
    });
  });
}

export function getYouTubeUploadByIdAsync(
  db: sqlite3.Database,
  uploadId: string
): Promise<YouTubeUpload | null> {
  return new Promise((resolve, reject) => {
    getYouTubeUploadById(db, uploadId, (err, upload) => {
      if (err) reject(err);
      else resolve(upload);
    });
  });
}

export function updateUploadStatusAsync(
  db: sqlite3.Database,
  uploadId: string,
  status: YouTubeUploadStatus
): Promise<void> {
  return new Promise((resolve, reject) => {
    updateUploadStatus(db, uploadId, status, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function updateUploadSuccessAsync(
  db: sqlite3.Database,
  uploadId: string,
  youtubeVideoId: string,
  youtubePlaylistId: string | null
): Promise<void> {
  return new Promise((resolve, reject) => {
    updateUploadSuccess(db, uploadId, youtubeVideoId, youtubePlaylistId, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function updateUploadFailureAsync(
  db: sqlite3.Database,
  uploadId: string,
  errorMessage: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    updateUploadFailure(db, uploadId, errorMessage, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function getPendingUploadsAsync(
  db: sqlite3.Database,
  maxAttempts: number
): Promise<Video[]> {
  return new Promise((resolve, reject) => {
    getPendingUploads(db, maxAttempts, (err, videos) => {
      if (err) reject(err);
      else resolve(videos);
    });
  });
}

export function incrementUploadAttemptsAsync(
  db: sqlite3.Database,
  uploadId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    incrementUploadAttempts(db, uploadId, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
