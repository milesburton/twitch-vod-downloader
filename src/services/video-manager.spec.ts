import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { saveVideoMetadata } from "./video-manager";
import {
  createMockDatabase,
  closeMockDatabase,
  createMockVideo,
} from "../testing/test-helpers";
import { getVideoById } from "../db/helpers";
import type sqlite3 from "sqlite3";

describe("saveVideoMetadata", () => {
  let db: sqlite3.Database;

  beforeEach(() => {
    db = createMockDatabase();
  });

  afterEach(async () => {
    await closeMockDatabase(db);
  });

  test("saves video metadata to database", (done) => {
    const video = createMockVideo({
      id: "test123",
      file_path: "/data/videos/2024-01-15_vod_test123.mp4",
    });

    saveVideoMetadata(db, video);

    // Give it a moment to save (callback-based)
    setTimeout(() => {
      getVideoById(db, "test123", (err, result) => {
        expect(err).toBeNull();
        expect(result).not.toBeNull();
        expect(result?.id).toBe("test123");
        expect(result?.file_path).toBe("/data/videos/2024-01-15_vod_test123.mp4");
        expect(result?.created_at).toBeDefined();
        done();
      });
    }, 100);
  });

  test("creates new timestamp when saving", (done) => {
    const video = createMockVideo({
      id: "timestamp-test",
      created_at: "2020-01-01T00:00:00Z", // Old timestamp
    });

    const beforeSave = new Date();
    saveVideoMetadata(db, video);

    setTimeout(() => {
      getVideoById(db, "timestamp-test", (err, result) => {
        expect(err).toBeNull();
        expect(result).not.toBeNull();

        // Should have created a new timestamp, not use the old one
        const savedTimestamp = new Date(result!.created_at);
        expect(savedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
        expect(result?.created_at).not.toBe("2020-01-01T00:00:00Z");
        done();
      });
    }, 100);
  });

  test("saves multiple videos sequentially", (done) => {
    const video1 = createMockVideo({ id: "video1", file_path: "/path/video1.mp4" });
    const video2 = createMockVideo({ id: "video2", file_path: "/path/video2.mp4" });

    saveVideoMetadata(db, video1);
    saveVideoMetadata(db, video2);

    setTimeout(() => {
      getVideoById(db, "video1", (err1, result1) => {
        expect(err1).toBeNull();
        expect(result1?.id).toBe("video1");

        getVideoById(db, "video2", (err2, result2) => {
          expect(err2).toBeNull();
          expect(result2?.id).toBe("video2");
          done();
        });
      });
    }, 100);
  });

  test("preserves file_path from input video", (done) => {
    const customPath = "/custom/path/to/video_12345.mp4";
    const video = createMockVideo({
      id: "pathtest",
      file_path: customPath,
    });

    saveVideoMetadata(db, video);

    setTimeout(() => {
      getVideoById(db, "pathtest", (err, result) => {
        expect(err).toBeNull();
        expect(result?.file_path).toBe(customPath);
        done();
      });
    }, 100);
  });
});
