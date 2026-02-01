import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { downloadTwitchVideo } from "./download";
import {
  createMockDatabase,
  closeMockDatabase,
} from "../testing/test-helpers";
import { getVideoById } from "../db/helpers";
import type sqlite3 from "sqlite3";
import path from "path";

// Mock modules
const mockExecWithLogs = mock(async (command: string[]) => 0);
const mockGetTempFilePath = mock(async (prefix: string, suffix: string) =>
  `/tmp/test_${prefix}${suffix}`
);
const mockRename = mock(async (oldPath: string, newPath: string) => {});
const mockStat = mock(async (path: string) => ({ isFile: () => true }));
const mockRm = mock(async (path: string, options: any) => {});

// Mock imports
await mock.module("../shared/utils", () => ({
  execWithLogs: mockExecWithLogs,
  getTempFilePath: mockGetTempFilePath,
  formatDatePrefix: (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  },
  getDataPath: (subdir: string) => `/data/${subdir}`,
}));

describe("downloadTwitchVideo", () => {
  let db: sqlite3.Database;
  let originalFetch: typeof global.fetch;
  let originalFsRename: any;
  let originalFsStat: any;
  let originalFsRm: any;

  beforeEach(() => {
    db = createMockDatabase();
    originalFetch = global.fetch;

    // Mock fs operations
    const fs = require("fs");
    originalFsRename = fs.promises.rename;
    originalFsStat = fs.promises.stat;
    originalFsRm = fs.promises.rm;

    fs.promises.rename = mockRename;
    fs.promises.stat = mockStat;
    fs.promises.rm = mockRm;

    // Reset mocks
    mockExecWithLogs.mockClear();
    mockGetTempFilePath.mockClear();
    mockRename.mockClear();
    mockStat.mockClear();
    mockRm.mockClear();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    const fs = require("fs");
    fs.promises.rename = originalFsRename;
    fs.promises.stat = originalFsStat;
    fs.promises.rm = originalFsRm;
    await closeMockDatabase(db);
  });

  test("downloads video successfully with upload date from API", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";
    const uploadDate = "2024-01-15T10:30:00Z";

    global.fetch = async (url: string | URL | Request) => {
      if (url.toString().includes("helix/videos")) {
        return new Response(
          JSON.stringify({
            data: [{ created_at: uploadDate }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(null, { status: 404 });
    };

    mockExecWithLogs.mockImplementation(async () => 0);
    mockGetTempFilePath.mockImplementation(async (prefix, suffix) =>
      `/tmp/${prefix}${suffix}`
    );

    const result = await downloadTwitchVideo(db, videoUrl);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("12345678");
    expect(result?.file_path).toBe("/data/videos/2024-01-15_vod_12345678.mp4");
    expect(mockExecWithLogs).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledTimes(1);
  });

  test("downloads video with current date when API fails", async () => {
    const videoUrl = "https://www.twitch.tv/videos/87654321";

    global.fetch = async () => {
      return new Response(null, { status: 500 });
    };

    mockExecWithLogs.mockImplementation(async () => 0);

    const result = await downloadTwitchVideo(db, videoUrl);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("87654321");
    expect(result?.file_path).toContain("_vod_87654321.mp4");
    expect(path.basename(result?.file_path || "")).toMatch(/^\d{4}-\d{2}-\d{2}_vod_87654321\.mp4$/);
  });

  test("returns null when video ID cannot be extracted", async () => {
    const invalidUrl = "https://www.twitch.tv/invalid/";

    const result = await downloadTwitchVideo(db, invalidUrl);

    expect(result).toBeNull();
    expect(mockExecWithLogs).not.toHaveBeenCalled();
  });

  test("retries download on failure and succeeds", async () => {
    const videoUrl = "https://www.twitch.tv/videos/11223344";

    global.fetch = async () => new Response(null, { status: 404 });

    let attemptCount = 0;
    mockExecWithLogs.mockImplementation(async () => {
      attemptCount++;
      return attemptCount < 3 ? 1 : 0; // Fail twice, succeed on third
    });

    const result = await downloadTwitchVideo(db, videoUrl);

    expect(result).not.toBeNull();
    expect(attemptCount).toBe(3);
  }, 20000); // Longer timeout for retries

  test("returns null after max retry attempts", async () => {
    const videoUrl = "https://www.twitch.tv/videos/99999999";

    global.fetch = async () => new Response(null, { status: 404 });
    mockExecWithLogs.mockImplementation(async () => 1); // Always fail

    const result = await downloadTwitchVideo(db, videoUrl);

    expect(result).toBeNull();
    expect(mockExecWithLogs).toHaveBeenCalledTimes(10); // Max attempts
  }, 60000); // Very long timeout for 10 retries

  test("cleans up temp file on success", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";

    global.fetch = async () => new Response(null, { status: 404 });
    mockExecWithLogs.mockImplementation(async () => 0);

    await downloadTwitchVideo(db, videoUrl);

    expect(mockRm).toHaveBeenCalled();
    const rmCall = mockRm.mock.calls[0];
    expect(rmCall[0]).toContain(".mp4.part");
    expect(rmCall[1]).toEqual({ force: true });
  });

  test("cleans up temp file on download failure", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";

    global.fetch = async () => new Response(null, { status: 404 });
    mockExecWithLogs.mockImplementation(async () => 1); // Always fail

    await downloadTwitchVideo(db, videoUrl);

    expect(mockRm).toHaveBeenCalled();
  }, 60000);

  test("handles cleanup error when temp file doesn't exist", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";

    global.fetch = async () => new Response(null, { status: 404 });
    mockExecWithLogs.mockImplementation(async () => 0);

    mockStat.mockImplementation(async () => {
      const error: any = new Error("ENOENT");
      error.code = "ENOENT";
      throw error;
    });

    const result = await downloadTwitchVideo(db, videoUrl);

    expect(result).not.toBeNull(); // Should still succeed
    expect(mockRm).not.toHaveBeenCalled(); // Shouldn't try to remove if stat fails
  });

  test("saves video metadata to database", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";

    global.fetch = async () => new Response(null, { status: 404 });
    mockExecWithLogs.mockImplementation(async () => 0);

    await downloadTwitchVideo(db, videoUrl);

    await new Promise(resolve => setTimeout(resolve, 200));

    getVideoById(db, "12345678", (err, video) => {
      expect(err).toBeNull();
      expect(video).not.toBeNull();
      expect(video?.id).toBe("12345678");
    });
  });

  test("constructs correct yt-dlp command", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";

    global.fetch = async () => new Response(null, { status: 404 });
    mockExecWithLogs.mockImplementation(async () => 0);

    await downloadTwitchVideo(db, videoUrl);

    expect(mockExecWithLogs).toHaveBeenCalledTimes(1);
    const command = mockExecWithLogs.mock.calls[0][0];

    expect(command[0]).toBe("yt-dlp");
    expect(command).toContain("--concurrent-fragments");
    expect(command).toContain("16");
    expect(command).toContain("--buffer-size");
    expect(command).toContain("16M");
    expect(command).toContain("--downloader");
    expect(command).toContain("aria2c");
    expect(command).toContain("--no-part");
    expect(command).toContain("--no-mtime");
    expect(command).toContain(videoUrl);
    expect(command).toContain("--progress");
  });

  test("fetches video metadata from Twitch API with correct headers", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";
    let capturedHeaders: Headers | undefined;

    global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      if (url.toString().includes("helix/videos")) {
        capturedHeaders = new Headers(init?.headers);
        return new Response(
          JSON.stringify({ data: [{ created_at: "2024-01-15T10:30:00Z" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(null, { status: 404 });
    };

    mockExecWithLogs.mockImplementation(async () => 0);

    await downloadTwitchVideo(db, videoUrl);

    expect(capturedHeaders?.get("Client-Id")).toBe("kimne78kx3ncx6brgo4mv6wki5h1ko");
  });

  test("handles API response with no data", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";

    global.fetch = async (url: string | URL | Request) => {
      if (url.toString().includes("helix/videos")) {
        return new Response(
          JSON.stringify({ data: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(null, { status: 404 });
    };

    mockExecWithLogs.mockImplementation(async () => 0);

    const result = await downloadTwitchVideo(db, videoUrl);

    expect(result).not.toBeNull();
    // Should use current date as fallback
    expect(result?.file_path).toMatch(/\d{4}-\d{2}-\d{2}_vod_12345678\.mp4/);
  });

  test("handles rename error gracefully", async () => {
    const videoUrl = "https://www.twitch.tv/videos/12345678";

    global.fetch = async () => new Response(null, { status: 404 });
    mockExecWithLogs.mockImplementation(async () => 0);
    mockRename.mockImplementation(async () => {
      throw new Error("Permission denied");
    });

    const result = await downloadTwitchVideo(db, videoUrl);

    expect(result).toBeNull(); // Should fail gracefully
  });
});
