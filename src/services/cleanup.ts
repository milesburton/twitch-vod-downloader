import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { getAllVideosAsync } from '../db/helpers.js';
import { getYouTubeUploadByVideoIdAsync } from '../db/youtube-helpers.js';
import { Video, YouTubeUpload } from '../shared/types.js';

/**
 * Clean up old videos based on retention policy
 */
export async function cleanupOldVideos(db: sqlite3.Database): Promise<void> {
  if (process.env.ENABLE_VIDEO_CLEANUP !== 'true') {
    console.log('🔇 Video cleanup is disabled');
    return;
  }

  const retentionDays = parseInt(process.env.VIDEO_RETENTION_DAYS || '30');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`🧹 Checking for videos older than ${retentionDays} days (before ${cutoffDate.toISOString().split('T')[0]})...`);

  const allVideos = await getAllVideosAsync(db);
  let deletedCount = 0;
  let skippedCount = 0;

  for (const video of allVideos) {
    const videoDate = new Date(video.created_at);

    if (videoDate < cutoffDate) {
      const wasDeleted = await cleanupVideoFile(db, video);
      if (wasDeleted) {
        deletedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  if (deletedCount > 0) {
    console.log(`✅ Cleaned up ${deletedCount} old video(s)`);
  }
  if (skippedCount > 0) {
    console.log(`⏭️  Skipped ${skippedCount} video(s) (not uploaded to YouTube or file missing)`);
  }
  if (deletedCount === 0 && skippedCount === 0) {
    console.log(`✨ No videos to clean up`);
  }
}

/**
 * Clean up a single video file
 * Returns true if deleted, false if skipped
 */
export async function cleanupVideoFile(
  db: sqlite3.Database,
  video: Video
): Promise<boolean> {
  // Check if video was uploaded to YouTube
  const upload = await getYouTubeUploadByVideoIdAsync(db, video.id);
  if (!upload || upload.upload_status !== 'completed') {
    console.log(`⚠️  Skipping cleanup for ${video.id} - not uploaded to YouTube`);
    return false;
  }

  // Check if file exists
  if (!fs.existsSync(video.file_path)) {
    console.log(`ℹ️  File already deleted: ${video.file_path}`);
    return false;
  }

  try {
    // Delete the file
    await fs.promises.unlink(video.file_path);
    console.log(`🗑️  Deleted: ${path.basename(video.file_path)} (uploaded to YouTube: ${upload.youtube_video_id})`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to delete ${video.file_path}:`, error.message);
    return false;
  }
}

/**
 * Check if a video should be cleaned up based on retention policy
 */
export function shouldCleanupVideo(
  video: Video,
  upload: YouTubeUpload | null,
  retentionDays: number
): boolean {
  // Only cleanup if uploaded to YouTube
  if (!upload || upload.upload_status !== 'completed') {
    return false;
  }

  // Check if older than retention period
  const videoDate = new Date(video.created_at);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return videoDate < cutoffDate;
}

/**
 * Get disk usage statistics for video directory
 */
export async function getVideoDirectoryStats(videosPath: string): Promise<{
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeGB: number;
}> {
  let totalFiles = 0;
  let totalSizeBytes = 0;

  try {
    const files = await fs.promises.readdir(videosPath);

    for (const file of files) {
      if (file.endsWith('.mp4') || file.endsWith('.mp4.part')) {
        const filePath = path.join(videosPath, file);
        try {
          const stats = await fs.promises.stat(filePath);
          totalFiles++;
          totalSizeBytes += stats.size;
        } catch (error) {
          // File might have been deleted, skip
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Failed to read video directory:`, error.message);
  }

  const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);

  return {
    totalFiles,
    totalSizeBytes,
    totalSizeGB,
  };
}
