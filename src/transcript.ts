import { Database } from "https://deno.land/x/sqlite3@0.12.0/mod.ts";
import { exec, getDataPath } from "./utils.ts";
import { Video, WhisperOutput } from "./types.ts";
import { insertTranscript, deleteTranscriptByVideoId } from "./db/helpers.ts";
import { readJsonFile } from "./utils.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { ZodError } from "https://deno.land/x/zod@v3.22.4/mod.ts";

async function generateTranscript(db: Database, video: Video) {
  console.log(`🎙️ Generating transcript for video: ${video.id}`);

  const audioDir = getDataPath("audio");
  const transcriptsDir = getDataPath("transcripts");
  const audioFile = join(audioDir, `audio_${video.id}.wav`);
  const jsonFile = join(transcriptsDir, `transcript_${video.id}.json`);

  const maxAttempts = 3;
  const retryDelay = 5_000;

  // Check if directories exist, create if they don't
  try {
    await Deno.mkdir(audioDir, { recursive: true });
    await Deno.mkdir(transcriptsDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  // Check CUDA availability
  let useCuda = false;
  try {
    await exec(["nvidia-smi"]);
    console.log("✅ CUDA GPU detected");
    useCuda = true;
  } catch (error) {
    console.warn("⚠️ No CUDA GPU detected, falling back to CPU");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Convert the video file to audio
      console.log("Converting video to audio...");
      await exec([
        "ffmpeg",
        "-i", video.file_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        "-y",  // Overwrite output file if it exists
        audioFile
      ]);

      // Prepare Whisper command
      const whisperCmd = [
        "whisper",
        audioFile,
        "--model", "small",
        "--output_format", "json",
        "--output_dir", transcriptsDir
      ];

      // Add CUDA-specific arguments if available
      if (useCuda) {
        whisperCmd.push("--device", "cuda:0");
        // whisperCmd.push("--fp16", "true");
      }

      // Run Whisper
      console.log("Running Whisper transcription...");
      await exec(whisperCmd);

      // Check for the output file
      const autoGeneratedFile = join(transcriptsDir, `audio_${video.id}.json`);

      // Wait for the file to exist (with timeout)
      const maxWaitTime = 10000; // 10 seconds
      const startTime = Date.now();

      while (!(await fileExists(autoGeneratedFile))) {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error("Timeout waiting for Whisper output file");
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Rename with error handling
      try {
        await Deno.rename(autoGeneratedFile, jsonFile);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          throw new Error(`Whisper output file not found: ${autoGeneratedFile}`);
        }
        throw error;
      }

      // Read and parse the transcript
      const rawData = await readJsonFile(jsonFile);
      const transcriptData = WhisperOutput.parse(rawData);

      // Insert into database
      await insertTranscript(db, {
        id: crypto.randomUUID(),
        video_id: video.id,
        content: transcriptData.text,
        segments: JSON.stringify(transcriptData.segments),
        created_at: new Date().toISOString()
      });

      console.log(`✅ Transcript generated and saved for video: ${video.id}`);

      // Clean up audio file
      try {
        await Deno.remove(audioFile);
      } catch (error) {
        console.warn(`Warning: Could not remove temporary audio file: ${audioFile}`);
      }

      return;

    } catch (error) {
      console.error(`Attempt ${attempt} failed for video ${video.id}:`, error);

      if (error instanceof ZodError) {
        console.error("❌ Fatal ZodError: Data structure mismatch. Deleting database entries and aborting.");
        try {
          await deleteTranscriptByVideoId(db, video.id);
          console.log(`Deleted transcript entries for video ID: ${video.id}`);
        } catch (dbError) {
          console.error("Error deleting transcript entries:", dbError);
        }
        return;
      }

      if (attempt < maxAttempts) {
        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`❌ Failed to generate transcript after ${maxAttempts} attempts for video ${video.id}.`);
      }
    }
  }
}

// Helper function to check if a file exists
async function fileExists(filepath: string): Promise<boolean> {
  try {
    await Deno.stat(filepath);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

export { generateTranscript };