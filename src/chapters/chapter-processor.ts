import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import {
  generateBulletPointSummary,
  generateChapterTitle,
  segmentTranscript,
} from "./chapter-utils.js";
import { getDataPath, ensureDirExists } from "../shared/utils.js";
import { type ProcessedChapter, TranscriptContent } from "../shared/types.js";

const { Database } = sqlite3;

function formatSecondsToTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${
      minutes
        .toString()
        .padStart(2, "0")
    }:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${
    remainingSeconds
      .toString()
      .padStart(2, "0")
  }`;
}

function generateYouTubeChapterDescription(
  processedChapters: ProcessedChapter[],
): string {
  const MAX_DESCRIPTION_LENGTH = 5000;
  const MAX_BULLET_LENGTH = 80;
  const MAX_BULLETS_PER_CHAPTER = 3;
  const TRUNCATION_INDICATOR = "... (selected representative chapters)";

  const processChapter = (chapter: ProcessedChapter) => {
    const timestamp = formatSecondsToTimestamp(chapter.start_time);
    const bullets = chapter.summary
      .replace(/🔹/g, "-")
      .split(/\n/)
      .filter((line: string) => line.trim() !== "")
      .map((line: string) => line.trim())
      .map((line: string) =>
        line.length > MAX_BULLET_LENGTH ? line.substring(0, MAX_BULLET_LENGTH) + "..." : line
      )
      .slice(0, MAX_BULLETS_PER_CHAPTER)
      .map((line: string) => `* ${line}`);
    return `${timestamp} ${chapter.title}\n${bullets.join("\n")}`;
  };

  const selectRepresentativeChapters = (chapters: ProcessedChapter[]) => {
    if (chapters.length <= 5) return chapters;
    const selectedChapters = [chapters[0], chapters[chapters.length - 1]];
    const intermediateCount = Math.min(
      Math.floor((chapters.length - 2) * 0.4),
      8,
    );
    for (let i = 1; i <= intermediateCount; i++) {
      const index = Math.floor(
        (i * (chapters.length - 1)) / (intermediateCount + 1),
      );
      selectedChapters.push(chapters[index]);
    }
    return selectedChapters.sort((a, b) => a.start_time - b.start_time);
  };

  const representativeChapters = selectRepresentativeChapters(processedChapters);
  let fullDescription = "🕒 Chapters:\n\n";
  let addedChapters = 0;
  for (const chapter of representativeChapters) {
    const chapterText = processChapter(chapter);
    const potentialDescription = fullDescription +
      (fullDescription.endsWith("\n\n") ? "" : "\n\n") +
      chapterText;
    if (potentialDescription.length > MAX_DESCRIPTION_LENGTH) {
      if (addedChapters > 0) {
        fullDescription += TRUNCATION_INDICATOR;
        break;
      }
    }
    fullDescription += (addedChapters > 0 ? "\n\n" : "") + chapterText;
    addedChapters++;
  }
  fullDescription += "\n\nNote: Timestamps are approximate and based on the original transcript.";
  return fullDescription;
}

const dbPath = getDataPath("db");
const dbFile = path.join(dbPath, "sqlite.db");
const db = new Database(dbFile);

export async function processTranscript(videoId: string): Promise<void> {
  try {
    console.log("🔍 Fetching transcript for video:", videoId);
    let shouldInsertChapters = false;
    const existingChaptersStmt = db.prepare(
      "SELECT COUNT(*) as count FROM chapters WHERE video_id = ?",
    );
    const existingChaptersResult = existingChaptersStmt.get(videoId) as {
      count: number;
    };
    if (existingChaptersResult.count === 0) {
      shouldInsertChapters = true;
    }
    const stmt = db.prepare(
      "SELECT content FROM transcripts WHERE video_id = ?",
    );
    const transcriptRow = stmt.get(videoId) as TranscriptContent | undefined;
    if (!transcriptRow) {
      console.error("🚨 No transcript found for video:", videoId);
      return;
    }
    console.log("✂️ Segmenting transcript...");
    const chapters = segmentTranscript(transcriptRow.content);
    console.log("📝 Generating summaries and titles...");
    const processedChapters: ProcessedChapter[] = await Promise.all(
      chapters.map(async (chapter, i) => {
        try {
          const summary = await generateBulletPointSummary(chapter.content);
          const title = generateChapterTitle(
            chapter.content,
            chapter.content.substring(0, 100),
          );
          return { ...chapter, summary, title };
        } catch (error) {
          console.error("Error processing chapter:", error);
          return {
            ...chapter,
            summary: chapter.content.substring(0, 200) + "...",
            title: `Chapter ${i + 1}`,
          };
        }
      }),
    );
    if (shouldInsertChapters) {
      console.log("💾 Storing chapters in database...");
      const insertStmt = db.prepare(
        `
				INSERT INTO chapters (
					id,
					video_id,
					start_time,
					end_time,
					content,
					summary,
					title,
					created_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
			`,
      );
      db.transaction(() => {
        for (const chapter of processedChapters) {
          insertStmt.run(
            crypto.randomUUID(),
            videoId,
            chapter.start_time,
            chapter.end_time,
            chapter.content,
            chapter.summary,
            chapter.title,
          );
        }
      })();
      console.log(
        `✅ Chapters inserted into database! 🎉 Found ${processedChapters.length} chapters`,
      );
    } else {
      console.log(`📊 Found ${processedChapters.length} existing chapters`);
    }
    const youtubeChapterDescription = generateYouTubeChapterDescription(processedChapters);
    const youtubeDescPath = getDataPath("youtube-descriptions");
    await ensureDirExists(youtubeDescPath);
    const descriptionFilePath = path.join(
      youtubeDescPath,
      `${videoId}_chapters.txt`,
    );
    try {
      await fs.promises.unlink(descriptionFilePath);
      console.log(
        `🗑️ Removed existing chapter description file: ${descriptionFilePath}`,
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    await fs.promises.writeFile(descriptionFilePath, youtubeChapterDescription, "utf8");
    console.log(
      `📄 YouTube chapter description saved to: ${descriptionFilePath}`,
    );
    console.log("📜 Chapter Details:");
    processedChapters.forEach((chapter, index) => {
      const cleanSummary = chapter.summary
        .replace(/🔹/g, "-")
        .replace(/\n/g, " ")
        .trim();
      console.log(
        `\nChapter ${index + 1} (${chapter.start_time}s - ${chapter.end_time}s):`,
      );
      console.log(`Title: ${chapter.title}`);
      console.log(`Summary: ${cleanSummary}`);
    });
  } catch (error) {
    console.error("Error processing transcript:", error);
    throw error;
  } finally {
    db.close();
  }
}

if (import.meta.url === process.argv[1] || import.meta.main) {
  (async () => {
    try {
      const videoId = process.argv[2];
      if (!videoId) {
        console.error("No videoId provided as argument.");
        process.exit(1);
      }
      await processTranscript(videoId);
    } catch (error) {
      console.error("Failed to process transcript:", error);
      process.exit(1);
    }
  })();
}
