import Database from "sqlite3";
import { execWithLogs, execWithOutput, getDataPath, readJsonFile } from "../shared/utils";
import { Video, WhisperOutput } from "../shared/types";
import { deleteTranscriptByVideoId, insertTranscript } from "../db/helpers";
import { join } from "path";
import { ZodError } from "zod";
import { formatChunkNumber, isTextSimilar } from "./transcript-helpers.js";
import { promises as fs } from "fs";

const USE_GPU = String(process.env.USE_GPU).toLowerCase() === "true";
const INCLUDE_TRANSCRIPT_DURATION =
  String(process.env.INCLUDE_TRANSCRIPT_DURATION).toLowerCase() === "true";
const CONCURRENT_CHUNK_PROCESS = process.env.CONCURRENT_CHUNK_PROCESS || "2";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "base";
const CHUNK_DURATION = 1_800;
const OVERLAP_DURATION = 30;

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 5_000,
  maxDelay: 30_000,
};

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config = RETRY_CONFIG,
): Promise<T> {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === config.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt - 1),
        config.maxDelay,
      );

      console.warn(
        `⚠️ ${operationName} failed (attempt ${attempt}/${config.maxAttempts}). ` +
          `Retrying in ${delay / 1000} seconds...`,
      );
      console.error(error);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed after ${config.maxAttempts} attempts`);
}

async function processChunksInPairs(
  chunkFiles: Array<{ path: string; totalChunks: number }>,
  transcriptsDir: string,
  useCuda: boolean,
  videoId: string,
) {
  const transcriptions: WhisperOutput[] = new Array(chunkFiles.length);
  const CONCURRENT_CHUNKS = Math.max(1, +CONCURRENT_CHUNK_PROCESS);

  for (let i = 0; i < chunkFiles.length; i += CONCURRENT_CHUNKS) {
    const chunkPromises = [];
    const batchEnd = Math.min(i + CONCURRENT_CHUNKS, chunkFiles.length);

    for (let j = 0; j < CONCURRENT_CHUNKS && i + j < chunkFiles.length; j++) {
      const chunkIndex = i + j;
      const { path: chunkFile, totalChunks } = chunkFiles[chunkIndex];
      const formattedChunkNum = formatChunkNumber(
        chunkIndex,
        chunkFiles.length,
      );

      console.log(`Starting chunk ${formattedChunkNum}/${chunkFiles.length}`);

      const promise = withRetry(
        () =>
          transcribeChunk(
            chunkFile,
            transcriptsDir,
            useCuda,
            chunkIndex,
            videoId,
            totalChunks,
          ),
        `Chunk ${formattedChunkNum} transcription`,
        { ...RETRY_CONFIG, maxAttempts: 2 },
      ).then((result) => {
        transcriptions[chunkIndex] = result;
        console.log(
          `✓ Completed chunk ${formattedChunkNum}/${chunkFiles.length}`,
        );
      });

      chunkPromises.push(promise);
    }

    const batchStart = formatChunkNumber(i, chunkFiles.length);
    const batchEndFormatted = formatChunkNumber(
      batchEnd - 1,
      chunkFiles.length,
    );

    await Promise.all(chunkPromises);
    console.log(
      `\nCompleted chunks ${batchStart}-${batchEndFormatted} of ${chunkFiles.length}\n`,
    );
  }

  return transcriptions;
}

async function generateTranscript(db: Database, video: Video) {
  console.log(`🎙️ Generating transcript for video: ${video.id}`);

  const audioDir = getDataPath("audio");
  const transcriptsDir = getDataPath("transcripts");
  const audioFile = join(audioDir, `${video.id}_audio.wav`);

  await prepareDirectories(audioDir, transcriptsDir);
  const useCuda = await checkCuda();

  try {
    await withRetry(async () => {
      await convertVideoToAudio(video.file_path, audioFile);

      const chunkFiles = await splitAudioIntoChunks(
        audioFile,
        audioDir,
        CHUNK_DURATION,
        OVERLAP_DURATION,
        video.id,
      );

      console.log(`\nStarting transcription of ${chunkFiles.length} chunks...`);

      const transcriptions = await processChunksInPairs(
        chunkFiles,
        transcriptsDir,
        useCuda,
        video.id,
      );

      const mergedTranscript = await mergeTranscriptions(
        transcriptions,
        OVERLAP_DURATION,
        transcriptsDir,
        video.id,
      );

      await insertTranscript(db, {
        id: crypto.randomUUID(),
        video_id: video.id,
        content: mergedTranscript.text,
        segments: JSON.stringify(mergedTranscript.segments),
        created_at: new Date().toISOString(),
      });

      console.log(`✅ Transcript generated and saved for video: ${video.id}`);
    }, "Full transcription process");
  } catch (error) {
    await handleError(db, video.id, error as Error);
  } finally {
    await cleanupFiles(audioDir, video.id);
  }
}

async function prepareDirectories(audioDir: string, transcriptsDir: string) {
  await Promise.all([
    fs.mkdir(audioDir, { recursive: true }).catch(ignoreExistsError),
    fs.mkdir(transcriptsDir, { recursive: true }).catch(ignoreExistsError),
  ]);
}

async function checkCuda(): Promise<boolean> {
  try {
    if (USE_GPU) {
      await execWithLogs(["nvidia-smi"]);
      console.log("✅ CUDA GPU detected");
      return true;
    }
    console.log("ℹ️ GPU usage disabled by configuration");
    return false;
  } catch {
    console.warn("⚠️ No CUDA GPU detected, falling back to CPU");
    return false;
  }
}

async function convertVideoToAudio(videoPath: string, audioFile: string) {
  console.log("Converting video to audio...");
  try {
    await execWithLogs([
      "ffmpeg",
      "-y",
      "-i",
      videoPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-threads",
      "4",
      "-loglevel",
      "info",
      audioFile,
      "-progress",
      "vidToAudio.log",
    ]);

    const fileInfo = await fs.stat(audioFile);
    if (fileInfo.size === 0) {
      throw new Error("Generated audio file is empty");
    }
  } catch (error) {
    console.error(`Error converting video to audio: ${error}`);
    throw error;
  }
}

async function splitAudioIntoChunks(
  audioFile: string,
  outputDir: string,
  chunkDuration: number,
  overlap: number,
  videoId: string,
) {
  console.log("=== Starting Audio Chunking Process ===");
  console.log(`Input file: ${audioFile}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Chunk duration: ${chunkDuration}s, Overlap: ${overlap}s`);
  console.log(`Video ID: ${videoId}`);

  const { duration } = await getAudioDuration(audioFile);
  console.log(`Total audio duration: ${duration}s`);

  const effectiveChunkDuration = chunkDuration - overlap;
  const expectedChunks = Math.ceil(duration / effectiveChunkDuration);
  const chunkFiles = [];

  for (
    let start = 0, index = 0;
    start < duration;
    start += effectiveChunkDuration, index++
  ) {
    const chunkFile = join(
      outputDir,
      `chunk_${videoId}_${formatChunkNumber(index, expectedChunks)}.wav`,
    );
    console.log(`\n--- Processing Chunk ${index + 1}/${expectedChunks} ---`);
    console.log(`Output file: ${chunkFile}`);

    try {
      await execWithLogs([
        "ffmpeg",
        "-i",
        audioFile,
        "-ss",
        `${start}`,
        "-t",
        `${chunkDuration}`,
        "-acodec",
        "copy",
        "-y",
        chunkFile,
        "-loglevel",
        "error",
      ]);

      const chunkStats = await fs.stat(chunkFile);
      console.log(
        `✓ Chunk ${index} created successfully: ${chunkStats.size} bytes`,
      );
      chunkFiles.push({
        path: chunkFile,
        totalChunks: expectedChunks,
      });
    } catch (error) {
      console.error(`❌ Error creating chunk ${index}:`, error);
      throw error;
    }
  }

  return chunkFiles;
}

async function getAudioDuration(
  audioFile: string,
): Promise<{ duration: number }> {
  try {
    console.log("Getting duration for:", audioFile);

    const output = await execWithOutput([
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioFile,
    ]);

    console.log("Raw ffprobe output:", output);
    const duration = parseFloat(String(output).trim());

    if (isNaN(duration)) {
      throw new Error(`Invalid duration value: ${output}`);
    }

    console.log("Final parsed duration:", duration);

    if (duration <= 0) {
      throw new Error(
        `Invalid duration: ${duration}. File may be corrupted or empty.`,
      );
    }

    return { duration };
  } catch (error) {
    console.error("Error getting audio duration:", error);
    try {
      const stats = await fs.stat(audioFile);
      console.log("File stats:", {
        exists: true,
        size: stats.size,
        isFile: stats.isFile,
      });
    } catch (statError) {
      console.error("File stat error:", statError);
    }
    throw error;
  }
}

async function mergeTranscriptions(
  transcriptions: WhisperOutput[],
  overlap: number,
  transcriptsDir: string,
  videoId: string,
) {
  const combinedSegments: WhisperOutput["segments"] = [];
  let timeOffset = 0;

  for (let i = 0; i < transcriptions.length; i++) {
    const currentChunk = transcriptions[i];
    let currentSegments = currentChunk.segments ? [...currentChunk.segments] : [];

    if (i > 0) {
      const overlapStart = timeOffset - overlap;
      const overlapEnd = timeOffset;

      currentSegments = currentSegments.filter((segment) => {
        const isInOverlap = segment.start < overlap && segment.end > 0;
        if (!isInOverlap) return true;

        type Segment = WhisperOutput["segments"][number];
        const prevText = combinedSegments
          .filter((s: Segment) => s.end > overlapStart && s.start < overlapEnd)
          .map((s: Segment) => s.text)
          .join(" ");

        return !isTextSimilar(segment.text, prevText);
      });
    }

    currentSegments = currentSegments.map((segment) => ({
      ...segment,
      start: segment.start + timeOffset - (i > 0 ? overlap : 0),
      end: segment.end + timeOffset - (i > 0 ? overlap : 0),
    }));

    combinedSegments.push(...currentSegments);

    const lastSegment = currentSegments[currentSegments.length - 1];
    if (lastSegment) {
      timeOffset = lastSegment.end + overlap;
    }
  }

  const combinedText = combinedSegments
    .map((segment: WhisperOutput["segments"][number]) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const baseMetadata = {
    timestamp: new Date().toISOString(),
    num_segments: combinedSegments.length,
    video_id: videoId,
  } as Record<string, unknown>;

  if (INCLUDE_TRANSCRIPT_DURATION) {
    baseMetadata.total_duration = combinedSegments[combinedSegments.length - 1]?.end || 0;
  }

  const mergedOutput = {
    text: combinedText,
    segments: combinedSegments,
    metadata: baseMetadata,
  };

  const mergedJsonPath = join(transcriptsDir, `${videoId}_merged.json`);
  await fs.writeFile(
    mergedJsonPath,
    JSON.stringify(mergedOutput, null, 2),
    "utf-8",
  );
  console.log(`✓ Merged transcript JSON saved to: ${mergedJsonPath}`);

  return mergedOutput;
}

async function transcribeChunk(
  chunkFile: string,
  transcriptsDir: string,
  useCuda: boolean,
  index: number,
  videoId: string,
  totalChunks: number,
) {
  const chunkJsonFile = join(
    transcriptsDir,
    `chunk_${videoId}_${formatChunkNumber(index, totalChunks)}.json`,
  );

  console.log("Configuration:");
  console.log(`- Input file: ${chunkFile}`);
  console.log(`- Output JSON: ${chunkJsonFile}`);
  console.log(`- Using CUDA: ${useCuda}`);

  await withRetry(async () => {
    const whisperCmd = [
      "whisper",
      chunkFile,
      "--model",
      WHISPER_MODEL,
      "--output_format",
      "json",
      "--output_dir",
      transcriptsDir,
      "--beam_size",
      "5",
    ];

    if (useCuda) {
      whisperCmd.push("--device", "cuda:0");
    }

    await execWithLogs(whisperCmd);
  }, `Whisper execution for chunk ${index}`);

  return await withRetry(async () => {
    const rawData = await readJsonFile(chunkJsonFile);
    return WhisperOutput.parse(rawData);
  }, `Parse output for chunk ${index}`);
}

async function handleError(db: Database, videoId: string, error: Error) {
  console.error(`Error for video ${videoId}:`, error);

  if (error instanceof ZodError) {
    console.error(
      "❌ Fatal ZodError: Data structure mismatch. Cleaning up database.",
    );
    try {
      await deleteTranscriptByVideoId(db, videoId);
      console.log(`Deleted transcript entries for video ID: ${videoId}`);
    } catch (dbError) {
      console.error("Error deleting transcript entries:", dbError);
    }
  }

  throw error;
}

async function cleanupFiles(directory: string, videoId: string) {
  const transcriptsDir = getDataPath("transcripts");

  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.isFile() &&
      (entry.name === `${videoId}_audio.wav` ||
        entry.name.startsWith(`chunk_${videoId}_`))
    ) {
      await fs.rm(join(directory, entry.name), { force: true }).catch(() =>
        console.warn(`Could not remove file: ${entry.name}`)
      );
    }
  }

  const transcriptEntries = await fs.readdir(transcriptsDir, { withFileTypes: true });
  for (const entry of transcriptEntries) {
    if (
      entry.isFile() &&
      entry.name.startsWith(`chunk_${videoId}_`) &&
      entry.name.endsWith(".json")
    ) {
      await fs.rm(join(transcriptsDir, entry.name), { force: true }).catch(() =>
        console.warn(`Could not remove file: ${entry.name}`)
      );
    }
  }
}

function ignoreExistsError(error: any) {
  if (error.code !== "EEXIST") {
    throw error;
  }
}

export { generateTranscript };
