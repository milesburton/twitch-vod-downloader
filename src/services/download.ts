import { Database } from "https://deno.land/x/sqlite3@0.12.0/mod.ts";
import { saveVideoMetadata } from "./video-manager.js";
import { execWithLogs, formatDatePrefix, getDataPath, getTempFilePath } from "../shared/utils";
import { Video } from "../shared/types";
import { join } from "https://deno.land/std@0.210.0/path/mod.ts";

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

  // Fetch upload date from Twitch API
  let uploadDate: string | null = null;
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
      if (data.data && data.data.length > 0 && data.data[0].created_at) {
        uploadDate = data.data[0].created_at;
      }
    }
  } catch (e) {
    console.warn("Could not fetch upload date from Twitch API:", e);
  }

  let datePrefix: string;
  if (uploadDate) {
    datePrefix = formatDatePrefix(new Date(uploadDate));
  } else {
    datePrefix = formatDatePrefix(new Date());
  }
  const finalOutputFile = join(videoDir, `${datePrefix}_vod_${videoID}.mp4`);

  let tempFilePath: string | null = null;

  try {
    const temp = await getTempFilePath(
      `${datePrefix}_vod_${videoID}`,
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

    await Deno.rename(tempFilePath, finalOutputFile);

    const video: Video = {
      id: videoID,
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
        await Deno.stat(tempFilePath);
        await Deno.remove(tempFilePath);
      } catch (cleanupError) {
        if (!(cleanupError instanceof Deno.errors.NotFound)) {
          console.error("❌ Error cleaning up temporary file:", cleanupError);
        }
      }
    }
  }
}

export { downloadTwitchVideo };
