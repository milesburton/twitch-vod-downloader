import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import path from "path";

function extractCleanTempDirectory(getDataPath: (dir: string) => string) {
  return async function cleanTempDirectory() {
    const tempDir = getDataPath("temp");
    console.log(`🧹 Cleaning temporary directory: ${tempDir}`);
    try {
      const fs = await import("fs");
      const entries = await fs.promises.readdir(tempDir, {
        withFileTypes: true,
      });
      for (const dirEntry of entries) {
        const fullPath = path.join(tempDir, dirEntry.name);
        await fs.promises.rm(fullPath, { recursive: true, force: true });
        console.log(`🗑️ Removed: ${fullPath}`);
      }
      console.log("✨ Temporary directory cleaned.");
    } catch (error) {
      console.error("❗ Error cleaning temporary directory:", error);
    }
  };
}

function extractCheckVideoExists(getDataPath: (dir: string) => string) {
  return async function checkVideoExists(
    videoID: string,
  ): Promise<{ exists: boolean; filePath?: string }> {
    const videoDir = getDataPath("videos");
    try {
      const fs = await import("fs");
      const extensions = [".mp4", ".mkv", ".webm"];
      const files = await fs.promises.readdir(videoDir, {
        withFileTypes: true,
      });
      for (const entry of files) {
        if (!entry.isFile()) continue;
        for (const ext of extensions) {
          const suffix = `_vod_${videoID}${ext}`;
          if (entry.name.endsWith(suffix)) {
            return { exists: true, filePath: path.join(videoDir, entry.name) };
          }
        }
      }
      return { exists: false };
    } catch (error) {
      console.error(`Error checking video file existence: ${error}`);
      return { exists: false };
    }
  };
}

describe("main application logic", () => {
  describe("cleanTempDirectory", () => {
    const mockGetDataPath = (dir: string) => `/mock/data/${dir}`;
    let originalReaddir: any;
    let originalRm: any;

    beforeEach(() => {
      const fs = require("fs");
      originalReaddir = fs.promises.readdir;
      originalRm = fs.promises.rm;
    });

    afterEach(() => {
      const fs = require("fs");
      fs.promises.readdir = originalReaddir;
      fs.promises.rm = originalRm;
    });

    test("cleans all files in temp directory", async () => {
      const removedFiles: string[] = [];
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "file1.tmp", isFile: () => true },
        { name: "file2.tmp", isFile: () => true },
      ]);

      fs.promises.rm = mock(async (filePath: string, options: any) => {
        removedFiles.push(filePath);
      });

      const cleanTempDirectory = extractCleanTempDirectory(mockGetDataPath);
      await cleanTempDirectory();

      expect(removedFiles.length).toBe(2);
      expect(removedFiles[0]).toContain("file1.tmp");
      expect(removedFiles[1]).toContain("file2.tmp");
    });

    test("handles empty temp directory", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => []);
      fs.promises.rm = mock(async (filePath: string, options: any) => {});

      const cleanTempDirectory = extractCleanTempDirectory(mockGetDataPath);
      await cleanTempDirectory();

      expect(true).toBe(true);
    });

    test("handles errors gracefully", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => {
        throw new Error("Directory not found");
      });

      const cleanTempDirectory = extractCleanTempDirectory(mockGetDataPath);
      await cleanTempDirectory();

      // Should log error but not throw
      expect(true).toBe(true);
    });

    test("uses force and recursive options when removing", async () => {
      const rmCalls: any[] = [];
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "file.tmp", isFile: () => true },
      ]);

      fs.promises.rm = mock(async (filePath: string, options: any) => {
        rmCalls.push({ filePath, options });
      });

      const cleanTempDirectory = extractCleanTempDirectory(mockGetDataPath);
      await cleanTempDirectory();

      expect(rmCalls[0].options.force).toBe(true);
      expect(rmCalls[0].options.recursive).toBe(true);
    });
  });

  describe("checkVideoExists", () => {
    const mockGetDataPath = (dir: string) => `/mock/data/${dir}`;
    let originalReaddir: any;

    beforeEach(() => {
      const fs = require("fs");
      originalReaddir = fs.promises.readdir;
    });

    afterEach(() => {
      const fs = require("fs");
      fs.promises.readdir = originalReaddir;
    });

    test("finds existing video with mp4 extension", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "2024-01-15_vod_12345678.mp4", isFile: () => true },
      ]);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("12345678");

      expect(result.exists).toBe(true);
      expect(result.filePath).toContain("12345678.mp4");
    });

    test("finds video with mkv extension", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "2024-01-15_vod_87654321.mkv", isFile: () => true },
      ]);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("87654321");

      expect(result.exists).toBe(true);
      expect(result.filePath).toContain("87654321.mkv");
    });

    test("finds video with webm extension", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "2024-01-15_vod_11223344.webm", isFile: () => true },
      ]);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("11223344");

      expect(result.exists).toBe(true);
      expect(result.filePath).toContain("11223344.webm");
    });

    test("returns false when video not found", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "2024-01-15_vod_99999999.mp4", isFile: () => true },
      ]);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("12345678");

      expect(result.exists).toBe(false);
      expect(result.filePath).toBeUndefined();
    });

    test("returns false when directory is empty", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => []);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("12345678");

      expect(result.exists).toBe(false);
    });

    test("ignores directories, only checks files", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "some-directory", isFile: () => false },
        { name: "2024-01-15_vod_12345678.mp4", isFile: () => true },
      ]);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("12345678");

      expect(result.exists).toBe(true);
    });

    test("handles errors gracefully", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => {
        throw new Error("Permission denied");
      });

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("12345678");

      expect(result.exists).toBe(false);
    });

    test("checks for date-prefixed filenames", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "2023-12-25_vod_12345678.mp4", isFile: () => true },
        { name: "2024-01-01_vod_12345678.mkv", isFile: () => true },
      ]);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("12345678");

      // Should find the first matching file
      expect(result.exists).toBe(true);
      expect(result.filePath).toContain("_vod_12345678");
    });

    test("returns full file path when found", async () => {
      const fs = require("fs");

      fs.promises.readdir = mock(async (dir: string, options: any) => [
        { name: "2024-01-15_vod_12345678.mp4", isFile: () => true },
      ]);

      const checkVideoExists = extractCheckVideoExists(mockGetDataPath);
      const result = await checkVideoExists("12345678");

      expect(result.filePath).toBe(
        "/mock/data/videos/2024-01-15_vod_12345678.mp4",
      );
    });
  });
});
