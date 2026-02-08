import Database from "sqlite3";
import { saveVideoMetadata } from "./video-manager.js";
import { execWithLogs, formatDateForFilename, getDataPath, getTempFilePath, sanitizeFilename } from "../shared/utils";
import { Video } from "../shared/types";
import { join } from "path";
import { promises as fs } from "fs";

async function attemptDownload(
  outputFile: string,
  videoUrl: string,
  attempt = 1,
): Promise<boolean> {
  const maxAttempts = 10;
  const retryDelay = 5_000;

  console.log(
    `📥 Downloading: ${videoUrl} (Attempt ${attempt}/${maxAttempts})`,
  );

  const command = [
    "yt-dlp",
    "-o",
    outputFile,
    "--concurrent-fragments",
    "16",
    "--buffer-size",
    "16M",
    "--downloader",
    "aria2c",
    "--downloader-args",
    "aria2c:'-x 32 -s 32 -k 2M --optimize-concurrent-downloads'",
    "--no-part",
    "--no-mtime",
    videoUrl,
    "--progress",
  ];

  const code = await execWithLogs(command);
  if (code === 0) return true;

  if (attempt < maxAttempts) {
    console.log(`Retry in ${retryDelay / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    return attemptDownload(outputFile, videoUrl, attempt + 1);
  }

  return false;
}

async function downloadTwitchVideo(
  db: Database,
  videoUrl: string,
): Promise<Video | null> {
  const videoID = videoUrl.split("/").pop();
  if (!videoID) {
    console.error("❌ Failed to extract video ID from URL");
    return null;
  }

  const videoDir = getDataPath("videos");

  // Fetch metadata from Twitch API
  let uploadDate: string | null = null;
  let videoTitle: string | null = null;
  let videoDuration: number | null = null;
  try {
    const apiUrl = `https://api.twitch.tv/helix/videos?id=${videoID}`;
    const clientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";
    const resp = await fetch(apiUrl, {
      headers: {
        "Client-Id": clientId,
        // If you have an OAuth token, add: 'Authorization': 'Bearer <token>'
      },
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.data && data.data.length > 0) {
        const videoData = data.data[0];
        if (videoData.created_at) {
          uploadDate = videoData.created_at;
        }
        if (videoData.title) {
          videoTitle = videoData.title;
        }
        if (videoData.duration) {
          // Duration is in format like "2h30m15s" - convert to seconds
          const durationStr = videoData.duration;
          const hours = durationStr.match(/(\d+)h/)?.[1] || 0;
          const minutes = durationStr.match(/(\d+)m/)?.[1] || 0;
          const seconds = durationStr.match(/(\d+)s/)?.[1] || 0;
          videoDuration = (Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds);
        }
      }
    }
  } catch (e) {
    console.warn("Could not fetch metadata from Twitch API:", e);
  }

  // Create filename in format: "Title - DD/MM/YYYY.mp4"
  const uploadDateObj = uploadDate ? new Date(uploadDate) : new Date();
  const dateStr = formatDateForFilename(uploadDateObj);
  const titlePart = videoTitle ? videoTitle : `VOD_${videoID}`;
  const baseFilename = `${titlePart} - ${dateStr}.mp4`;
  const finalOutputFile = join(videoDir, sanitizeFilename(baseFilename));

  let tempFilePath: string | null = null;

  try {
    const temp = await getTempFilePath(
      `${titlePart}_${videoID}`,
      ".mp4.part",
    );
    tempFilePath = temp;

    const success = await attemptDownload(temp, videoUrl);
    if (!success) {
      console.error(
        `❌ Failed to download video after multiple attempts: ${videoUrl}`,
      );
      return null;
    }

    await fs.rename(tempFilePath, finalOutputFile);

    const video: Video = {
      id: videoID,
      title: videoTitle || undefined,
      duration: videoDuration || undefined,
      file_path: finalOutputFile,
      created_at: uploadDate ? new Date(uploadDate).toISOString() : new Date().toISOString(),
    };

    saveVideoMetadata(db, video);
    return video;
  } catch (error) {
    console.error("❌ Error during download or file handling:", error);
    return null;
  } finally {
    if (tempFilePath) {
      try {
        await fs.stat(tempFilePath);
        await fs.rm(tempFilePath, { force: true });
      } catch (cleanupError: any) {
        if (cleanupError.code !== "ENOENT") {
          console.error("❌ Error cleaning up temporary file:", cleanupError);
        }
      }
    }
  }
}

export { downloadTwitchVideo };
