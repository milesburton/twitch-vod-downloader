import { z } from "zod";

export interface Video {
  id: string;
  title?: string;
  duration?: number;
  file_path: string;
  created_at: string;
}

export interface Transcript {
  id: string;
  video_id: string;
  content: string;
  segments: string;
  created_at: string;
}

export type YouTubeUploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface YouTubeUpload {
  id: string;
  video_id: string;
  youtube_video_id: string | null;
  youtube_playlist_id: string | null;
  upload_status: YouTubeUploadStatus;
  upload_attempts: number;
  error_message: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export const WhisperOutput = z.object({
  text: z.string(),
  segments: z.array(
    z.object({
      id: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
    }),
  ),
});

export type WhisperOutput = z.infer<typeof WhisperOutput>;

export type VideoRow = [string, string, string];
export type TranscriptRow = [string, string, string, string, string];
export type YouTubeUploadRow = [string, string, string | null, string | null, string, number, string | null, string | null, string, string];

export type VideoParams = Record<keyof Video, string>;
export type TranscriptParams = Record<keyof Transcript, string>;
export type YouTubeUploadParams = Record<keyof YouTubeUpload, string | number | null>;

export interface TranscriptContent {
  content: string;
}

export interface ProcessedChapter extends RawChapter {
  summary: string;
  title: string;
}

export interface RawChapter {
  start_time: number;
  end_time: number;
  content: string;
}
