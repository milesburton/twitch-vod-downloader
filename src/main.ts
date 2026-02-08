import dotenv from "dotenv";
import { getDataPath } from "./shared/utils.js";
import fs from "fs";
import { cleanTempDirectory, processVideos, initializeDirectories } from "./main-logic.js";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  await initializeDirectories();

  if (args[0] === "list") {
    // List all downloaded videos
    const videoDir = getDataPath("videos");
    try {
      const files = await fs.promises.readdir(videoDir);
      if (files.length === 0) {
        console.log("No videos found.");
      } else {
        console.log("Downloaded videos:");
        files.forEach(f => console.log("- ", f));
      }
    } catch (err) {
      console.error("Error reading videos directory:", err);
    }
    return;
  }
  if (args[0] === "list-transcripts") {
    // List all transcript files
    const transcriptDir = getDataPath("transcripts");
    try {
      const files = await fs.promises.readdir(transcriptDir);
      if (files.length === 0) {
        console.log("No transcripts found.");
      } else {
        console.log("Transcript files:");
        files.forEach(f => console.log("- ", f));
      }
    } catch (err) {
      console.error("Error reading transcripts directory:", err);
    }
    return;
  }

  console.log("🎬 Starting Twitch VOD Downloader");
  await cleanTempDirectory();
  await processVideos();
}

main();
