import { google } from 'googleapis';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { Video } from '../shared/types.js';
import {
  createYouTubeUploadAsync,
  getYouTubeUploadByVideoIdAsync,
  updateUploadStatusAsync,
  updateUploadSuccessAsync,
  updateUploadFailureAsync,
} from '../db/youtube-helpers.js';

/**
 * Initialize OAuth2 client for YouTube API
 */
function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob' // For manual token generation
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

/**
 * Upload a video file to YouTube with retry logic
 */
export async function uploadToYouTube(
  db: sqlite3.Database,
  video: Video
): Promise<void> {
  const maxAttempts = parseInt(process.env.YOUTUBE_MAX_UPLOAD_ATTEMPTS || '3');

  // Get or create upload record
  let upload = await getYouTubeUploadByVideoIdAsync(db, video.id);
  if (!upload) {
    const uploadId = await createYouTubeUploadAsync(db, video.id);
    upload = await getYouTubeUploadByVideoIdAsync(db, video.id);
    if (!upload) {
      console.error(`❌ Failed to create upload record for ${video.id}`);
      return;
    }
  }

  // Check if already uploaded successfully
  if (upload.upload_status === 'completed') {
    console.log(`✅ Video ${video.id} already uploaded to YouTube: ${upload.youtube_video_id}`);
    return;
  }

  // Check if max attempts reached
  if (upload.upload_attempts >= maxAttempts) {
    console.log(`❌ Max upload attempts (${maxAttempts}) reached for ${video.id}`);
    return;
  }

  // Check if file exists
  if (!fs.existsSync(video.file_path)) {
    const errorMsg = 'Video file not found';
    console.error(`❌ ${errorMsg}: ${video.file_path}`);
    await updateUploadFailureAsync(db, upload.id, errorMsg);
    return;
  }

  console.log(`⬆️  Uploading ${video.id} to YouTube (attempt ${upload.upload_attempts + 1}/${maxAttempts})...`);

  try {
    // Update status to uploading
    await updateUploadStatusAsync(db, upload.id, 'uploading');

    // Perform the actual upload
    const { youtubeVideoId, playlistId } = await performYouTubeUpload(video);

    // Update success
    await updateUploadSuccessAsync(db, upload.id, youtubeVideoId, playlistId);

    console.log(`✅ Successfully uploaded ${video.id} to YouTube: ${youtubeVideoId}`);
    if (playlistId) {
      console.log(`📋 Added to playlist: ${playlistId}`);
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`❌ YouTube upload failed for ${video.id}:`, errorMessage);

    // Update failure
    await updateUploadFailureAsync(db, upload.id, errorMessage);

    // Check if this was a permanent error
    if (isPermanentError(error)) {
      console.error(`🚫 Permanent error detected. Will not retry.`);
    } else {
      console.log(`🔄 Will retry on next run (${upload.upload_attempts + 1}/${maxAttempts} attempts so far)`);
    }
  }
}

/**
 * Perform the actual upload to YouTube API
 */
async function performYouTubeUpload(video: Video): Promise<{
  youtubeVideoId: string;
  playlistId: string | null;
}> {
  const auth = getAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  // Extract video date from file path or use created_at
  const videoDate = video.created_at.split('T')[0];
  const videoTitle = `Twitch VOD ${video.id} - ${videoDate}`;
  const videoDescription = `Automatically uploaded Twitch VOD\nOriginal ID: ${video.id}\nDate: ${video.created_at}`;

  const privacyStatus = process.env.YOUTUBE_VIDEO_PRIVACY || 'unlisted';

  console.log(`📤 Uploading to YouTube with privacy: ${privacyStatus}`);

  // Upload video
  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: videoTitle,
        description: videoDescription,
        tags: ['twitch', 'vod', 'automated', 'archive'],
        categoryId: '20', // Gaming category
      },
      status: {
        privacyStatus: privacyStatus as 'private' | 'unlisted' | 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(video.file_path),
    },
  });

  const youtubeVideoId = res.data.id;
  if (!youtubeVideoId) {
    throw new Error('YouTube API did not return a video ID');
  }

  // Add to playlist if configured
  let playlistId: string | null = null;
  if (process.env.YOUTUBE_PLAYLIST_ID) {
    playlistId = process.env.YOUTUBE_PLAYLIST_ID;
    try {
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: youtubeVideoId,
            },
          },
        },
      });
      console.log(`📋 Added to playlist: ${playlistId}`);
    } catch (error: any) {
      console.warn(`⚠️  Failed to add to playlist: ${error.message}`);
      // Don't fail the entire upload if playlist addition fails
    }
  }

  return { youtubeVideoId, playlistId };
}

/**
 * Check if an error is permanent (shouldn't retry)
 */
function isPermanentError(error: any): boolean {
  const errorMessage = error.message || String(error);

  // Authentication errors
  if (errorMessage.includes('invalid_grant') ||
      errorMessage.includes('invalid_client') ||
      errorMessage.includes('unauthorized')) {
    return true;
  }

  // File not found
  if (errorMessage.includes('ENOENT') ||
      errorMessage.includes('file not found')) {
    return true;
  }

  // Invalid video format
  if (errorMessage.includes('invalidVideoFormat') ||
      errorMessage.includes('unsupportedFormat')) {
    return true;
  }

  // Quota exceeded is temporary (resets daily)
  if (errorMessage.includes('quotaExceeded')) {
    return false;
  }

  // Network errors are temporary
  if (errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND')) {
    return false;
  }

  // Default to temporary (will retry)
  return false;
}
