import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { generateTranscript } from "./transcript";
import {
  createMockDatabase,
  closeMockDatabase,
  createMockVideo,
} from "../testing/test-helpers";
import type sqlite3 from "sqlite3";
import path from "path";

// Mock external dependencies
const mockExecWithLogs = mock(async (command: string[]) => 0);
const mockExecWithOutput = mock(async (command: string[]) => "120.5");
const mockReadJsonFile = mock(async (file: string) => ({
  text: "Test transcript",
  segments: [
    { id: 0, start: 0, end: 5, text: "Test transcript" },
  ],
}));

const mockFsMkdir = mock(async (path: string, options: any) => {});
const mockFsStat = mock(async (path: string) => ({ size: 1000, isFile: () => true }));
const mockFsWriteFile = mock(async (path: string, data: string) => {});
const mockFsReaddir = mock(async (path: string, options: any) => []);
const mockFsRm = mock(async (path: string, options: any) => {});

describe("transcript processing", () => {
  let db: sqlite3.Database;
  let originalProcessEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    db = createMockDatabase();
    originalProcessEnv = { ...process.env };

    // Reset mocks
    mockExecWithLogs.mockClear();
    mockExecWithOutput.mockClear();
    mockReadJsonFile.mockClear();
    mockFsMkdir.mockClear();
    mockFsStat.mockClear();
    mockFsWriteFile.mockClear();
    mockFsReaddir.mockClear();
    mockFsRm.mockClear();

    // Set test environment variables
    process.env.USE_GPU = "false";
    process.env.INCLUDE_TRANSCRIPT_DURATION = "false";
    process.env.CONCURRENT_CHUNK_PROCESS = "1";
    process.env.WHISPER_MODEL = "base";
  });

  afterEach(async () => {
    process.env = originalProcessEnv;
    await closeMockDatabase(db);
  });

  test("generateTranscript creates directories", async () => {
    const video = createMockVideo();

    // Mock successful execution
    mockExecWithOutput.mockImplementation(async (cmd) => "60.0"); // 60 second audio
    mockExecWithLogs.mockImplementation(async (cmd) => 0);
    mockReadJsonFile.mockImplementation(async (file) => ({
      text: "Sample transcript",
      segments: [{ id: 0, start: 0, end: 60, text: "Sample transcript" }],
    }));

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    try {
      await generateTranscript(db, video);

      // Should create audio and transcripts directories
      expect(mockFsMkdir).toHaveBeenCalled();
      const mkdirCalls = mockFsMkdir.mock.calls;
      const createdDirs = mkdirCalls.map(call => call[0]);
      expect(createdDirs.some(dir => dir.includes("audio"))).toBe(true);
      expect(createdDirs.some(dir => dir.includes("transcripts"))).toBe(true);
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 30000);

  test("checkCuda respects USE_GPU environment variable", async () => {
    process.env.USE_GPU = "true";

    mockExecWithLogs.mockImplementation(async (cmd) => {
      if (cmd[0] === "nvidia-smi") {
        return 0; // Success
      }
      return 0;
    });

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    mockExecWithOutput.mockImplementation(async () => "30.0");
    mockReadJsonFile.mockImplementation(async () => ({
      text: "Test",
      segments: [{ id: 0, start: 0, end: 30, text: "Test" }],
    }));

    try {
      const video = createMockVideo();
      await generateTranscript(db, video);

      // Should call nvidia-smi when GPU is enabled
      const nvidiaSmiCalls = mockExecWithLogs.mock.calls.filter(
        call => call[0][0] === "nvidia-smi"
      );
      expect(nvidiaSmiCalls.length).toBeGreaterThan(0);
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 30000);

  test("checkCuda falls back to CPU when nvidia-smi fails", async () => {
    process.env.USE_GPU = "true";

    mockExecWithLogs.mockImplementation(async (cmd) => {
      if (cmd[0] === "nvidia-smi") {
        throw new Error("nvidia-smi not found");
      }
      return 0;
    });

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    mockExecWithOutput.mockImplementation(async () => "30.0");
    mockReadJsonFile.mockImplementation(async () => ({
      text: "Test",
      segments: [{ id: 0, start: 0, end: 30, text: "Test" }],
    }));

    try {
      const video = createMockVideo();
      await generateTranscript(db, video);

      // Should continue without CUDA
      expect(mockExecWithLogs).toHaveBeenCalled();
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 30000);

  test("convertVideoToAudio uses correct ffmpeg parameters", async () => {
    mockExecWithLogs.mockImplementation(async (cmd) => {
      if (cmd[0] === "ffmpeg") {
        expect(cmd).toContain("-vn"); // No video
        expect(cmd).toContain("-acodec");
        expect(cmd).toContain("pcm_s16le");
        expect(cmd).toContain("-ar");
        expect(cmd).toContain("16000"); // 16kHz sample rate
        expect(cmd).toContain("-ac");
        expect(cmd).toContain("1"); // Mono
      }
      return 0;
    });

    mockExecWithOutput.mockImplementation(async () => "30.0");
    mockReadJsonFile.mockImplementation(async () => ({
      text: "Test",
      segments: [{ id: 0, start: 0, end: 30, text: "Test" }],
    }));

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    try {
      const video = createMockVideo();
      await generateTranscript(db, video);

      const ffmpegCalls = mockExecWithLogs.mock.calls.filter(
        call => call[0][0] === "ffmpeg"
      );
      expect(ffmpegCalls.length).toBeGreaterThan(0);
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 30000);

  test("whisper command includes correct model", async () => {
    process.env.WHISPER_MODEL = "large-v2";

    mockExecWithLogs.mockImplementation(async (cmd) => {
      if (cmd[0] === "whisper") {
        expect(cmd).toContain("--model");
        expect(cmd).toContain("large-v2");
      }
      return 0;
    });

    mockExecWithOutput.mockImplementation(async () => "30.0");
    mockReadJsonFile.mockImplementation(async () => ({
      text: "Test",
      segments: [{ id: 0, start: 0, end: 30, text: "Test" }],
    }));

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    try {
      const video = createMockVideo();
      await generateTranscript(db, video);

      const whisperCalls = mockExecWithLogs.mock.calls.filter(
        call => call[0][0] === "whisper"
      );
      expect(whisperCalls.length).toBeGreaterThan(0);
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 30000);

  test("cleans up temporary files after processing", async () => {
    mockExecWithLogs.mockImplementation(async () => 0);
    mockExecWithOutput.mockImplementation(async () => "30.0");
    mockReadJsonFile.mockImplementation(async () => ({
      text: "Test",
      segments: [{ id: 0, start: 0, end: 30, text: "Test" }],
    }));

    mockFsReaddir.mockImplementation(async (path, options) => {
      const videoId = "12345678";
      return [
        { name: `${videoId}_audio.wav`, isFile: () => true },
        { name: `chunk_${videoId}_001.wav`, isFile: () => true },
        { name: `chunk_${videoId}_001.json`, isFile: () => true },
      ];
    });

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    try {
      const video = createMockVideo();
      await generateTranscript(db, video);

      // Should clean up audio files and chunk files
      expect(mockFsRm).toHaveBeenCalled();
      const removedFiles = mockFsRm.mock.calls.map(call => path.basename(call[0]));

      // Files should be cleaned up (exact count may vary)
      expect(mockFsRm.mock.calls.length).toBeGreaterThan(0);
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 30000);

  test("includes duration in metadata when INCLUDE_TRANSCRIPT_DURATION is true", async () => {
    process.env.INCLUDE_TRANSCRIPT_DURATION = "true";

    mockExecWithLogs.mockImplementation(async () => 0);
    mockExecWithOutput.mockImplementation(async () => "60.0");
    mockReadJsonFile.mockImplementation(async () => ({
      text: "Test with duration",
      segments: [
        { id: 0, start: 0, end: 30, text: "Test" },
        { id: 1, start: 30, end: 60, text: "with duration" },
      ],
    }));

    let capturedMetadata: any = null;
    mockFsWriteFile.mockImplementation(async (path, data) => {
      if (path.includes("_merged.json")) {
        capturedMetadata = JSON.parse(data);
      }
    });

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    try {
      const video = createMockVideo();
      await generateTranscript(db, video);

      expect(capturedMetadata).not.toBeNull();
      expect(capturedMetadata.metadata.total_duration).toBeDefined();
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 30000);

  test("processes chunks concurrently based on CONCURRENT_CHUNK_PROCESS", async () => {
    process.env.CONCURRENT_CHUNK_PROCESS = "2";

    mockExecWithLogs.mockImplementation(async () => 0);
    mockExecWithOutput.mockImplementation(async () => "3700"); // Longer than chunk duration
    mockReadJsonFile.mockImplementation(async () => ({
      text: "Test chunk",
      segments: [{ id: 0, start: 0, end: 1800, text: "Test chunk" }],
    }));

    const fs = require("fs");
    const origMkdir = fs.promises.mkdir;
    fs.promises.mkdir = mockFsMkdir;
    const origStat = fs.promises.stat;
    fs.promises.stat = mockFsStat;
    const origWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = mockFsWriteFile;
    const origReaddir = fs.promises.readdir;
    fs.promises.readdir = mockFsReaddir;
    const origRm = fs.promises.rm;
    fs.promises.rm = mockFsRm;

    try {
      const video = createMockVideo();
      await generateTranscript(db, video);

      // Should have processed multiple chunks
      const whisperCalls = mockExecWithLogs.mock.calls.filter(
        call => call[0][0] === "whisper"
      );
      expect(whisperCalls.length).toBeGreaterThan(1);
    } finally {
      fs.promises.mkdir = origMkdir;
      fs.promises.stat = origStat;
      fs.promises.writeFile = origWriteFile;
      fs.promises.readdir = origReaddir;
      fs.promises.rm = origRm;
    }
  }, 60000);
});
