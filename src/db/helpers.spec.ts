import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import {
  insertVideo,
  getVideoById,
  getAllVideos,
  insertTranscript,
  getTranscriptByVideoId,
  searchTranscripts,
  deleteTranscriptByVideoId,
  deleteVideoById,
  getVideoByIdAsync,
  getAllVideosAsync,
  insertVideoAsync,
  getTranscriptByVideoIdAsync,
  insertTranscriptAsync,
  deleteTranscriptByVideoIdAsync,
  deleteVideoByIdAsync,
} from "./helpers";
import {
  createMockDatabase,
  closeMockDatabase,
  createMockVideo,
  createMockTranscript,
} from "../testing/test-helpers";
import type sqlite3 from "sqlite3";

describe("Database Helpers - Callback-based", () => {
  let db: sqlite3.Database;

  beforeEach(() => {
    db = createMockDatabase();
  });

  afterEach(async () => {
    await closeMockDatabase(db);
  });

  describe("insertVideo", () => {
    test("inserts a video into the database", (done) => {
      const video = createMockVideo();

      insertVideo(db, video, (err) => {
        expect(err).toBeNull();

        getVideoById(db, video.id, (getErr, result) => {
          expect(getErr).toBeNull();
          expect(result).not.toBeNull();
          expect(result?.id).toBe(video.id);
          expect(result?.file_path).toBe(video.file_path);
          done();
        });
      });
    });

    test("allows inserting multiple videos", (done) => {
      const video1 = createMockVideo({ id: "video1" });
      const video2 = createMockVideo({ id: "video2" });

      insertVideo(db, video1, (err1) => {
        expect(err1).toBeNull();

        insertVideo(db, video2, (err2) => {
          expect(err2).toBeNull();

          getAllVideos(db, (getErr, videos) => {
            expect(getErr).toBeNull();
            expect(videos).toHaveLength(2);
            done();
          });
        });
      });
    });
  });

  describe("getVideoById", () => {
    test("returns null for non-existent video", (done) => {
      getVideoById(db, "nonexistent", (err, video) => {
        expect(err).toBeNull();
        expect(video).toBeNull();
        done();
      });
    });

    test("retrieves existing video by ID", (done) => {
      const video = createMockVideo();

      insertVideo(db, video, () => {
        getVideoById(db, video.id, (err, result) => {
          expect(err).toBeNull();
          expect(result).not.toBeNull();
          expect(result?.id).toBe(video.id);
          done();
        });
      });
    });
  });

  describe("getAllVideos", () => {
    test("returns empty array when no videos exist", (done) => {
      getAllVideos(db, (err, videos) => {
        expect(err).toBeNull();
        expect(videos).toEqual([]);
        done();
      });
    });

    test("returns all videos ordered by created_at DESC", (done) => {
      const video1 = createMockVideo({
        id: "1",
        created_at: "2024-01-01T00:00:00Z",
      });
      const video2 = createMockVideo({
        id: "2",
        created_at: "2024-01-02T00:00:00Z",
      });

      insertVideo(db, video1, () => {
        insertVideo(db, video2, () => {
          getAllVideos(db, (err, videos) => {
            expect(err).toBeNull();
            expect(videos).toHaveLength(2);
            expect(videos[0].id).toBe("2"); // Most recent first
            expect(videos[1].id).toBe("1");
            done();
          });
        });
      });
    });
  });

  describe("insertTranscript", () => {
    test("inserts a transcript into the database", (done) => {
      const video = createMockVideo();
      const transcript = createMockTranscript({ video_id: video.id });

      insertVideo(db, video, () => {
        insertTranscript(db, transcript, (err) => {
          expect(err).toBeNull();

          getTranscriptByVideoId(db, video.id, (getErr, result) => {
            expect(getErr).toBeNull();
            expect(result).not.toBeNull();
            expect(result?.video_id).toBe(video.id);
            expect(result?.content).toBe(transcript.content);
            done();
          });
        });
      });
    });
  });

  describe("getTranscriptByVideoId", () => {
    test("returns null for video without transcript", (done) => {
      getTranscriptByVideoId(db, "nonexistent", (err, transcript) => {
        expect(err).toBeNull();
        expect(transcript).toBeNull();
        done();
      });
    });

    test("retrieves existing transcript", (done) => {
      const video = createMockVideo();
      const transcript = createMockTranscript({ video_id: video.id });

      insertVideo(db, video, () => {
        insertTranscript(db, transcript, () => {
          getTranscriptByVideoId(db, video.id, (err, result) => {
            expect(err).toBeNull();
            expect(result?.content).toBe(transcript.content);
            done();
          });
        });
      });
    });
  });

  describe("searchTranscripts", () => {
    test("returns empty array when no matches found", (done) => {
      searchTranscripts(db, "nonexistent search term", (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual([]);
        done();
      });
    });

    test("finds transcripts containing search query", (done) => {
      const video = createMockVideo();
      const transcript = createMockTranscript({
        video_id: video.id,
        content: "This is a test transcript with specific keywords",
      });

      insertVideo(db, video, () => {
        insertTranscript(db, transcript, () => {
          searchTranscripts(db, "specific keywords", (err, results) => {
            expect(err).toBeNull();
            expect(results).toHaveLength(1);
            expect(results[0].content).toContain("specific keywords");
            done();
          });
        });
      });
    });

    test("search is case-insensitive (SQLite default)", (done) => {
      const video = createMockVideo();
      const transcript = createMockTranscript({
        video_id: video.id,
        content: "Contains UPPERCASE words",
      });

      insertVideo(db, video, () => {
        insertTranscript(db, transcript, () => {
          searchTranscripts(db, "uppercase", (err, results) => {
            expect(err).toBeNull();
            expect(results).toHaveLength(1);
            done();
          });
        });
      });
    });
  });

  describe("deleteTranscriptByVideoId", () => {
    test("deletes transcript for given video ID", (done) => {
      const video = createMockVideo();
      const transcript = createMockTranscript({ video_id: video.id });

      insertVideo(db, video, () => {
        insertTranscript(db, transcript, () => {
          deleteTranscriptByVideoId(db, video.id, (err) => {
            expect(err).toBeNull();

            getTranscriptByVideoId(db, video.id, (getErr, result) => {
              expect(getErr).toBeNull();
              expect(result).toBeNull();
              done();
            });
          });
        });
      });
    });

    test("does not error when deleting non-existent transcript", (done) => {
      deleteTranscriptByVideoId(db, "nonexistent", (err) => {
        expect(err).toBeNull();
        done();
      });
    });
  });

  describe("deleteVideoById", () => {
    test("deletes video by ID", (done) => {
      const video = createMockVideo();

      insertVideo(db, video, () => {
        deleteVideoById(db, video.id, (err) => {
          expect(err).toBeNull();

          getVideoById(db, video.id, (getErr, result) => {
            expect(getErr).toBeNull();
            expect(result).toBeNull();
            done();
          });
        });
      });
    });

    test("does not error when deleting non-existent video", (done) => {
      deleteVideoById(db, "nonexistent", (err) => {
        expect(err).toBeNull();
        done();
      });
    });
  });
});

describe("Database Helpers - Async/Await", () => {
  let db: sqlite3.Database;

  beforeEach(() => {
    db = createMockDatabase();
  });

  afterEach(async () => {
    await closeMockDatabase(db);
  });

  describe("insertVideoAsync", () => {
    test("inserts a video and returns promise", async () => {
      const video = createMockVideo();

      await insertVideoAsync(db, video);

      const result = await getVideoByIdAsync(db, video.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(video.id);
    });
  });

  describe("getVideoByIdAsync", () => {
    test("returns null for non-existent video", async () => {
      const result = await getVideoByIdAsync(db, "nonexistent");
      expect(result).toBeNull();
    });

    test("retrieves existing video", async () => {
      const video = createMockVideo();
      await insertVideoAsync(db, video);

      const result = await getVideoByIdAsync(db, video.id);
      expect(result?.id).toBe(video.id);
    });
  });

  describe("getAllVideosAsync", () => {
    test("returns empty array when no videos", async () => {
      const videos = await getAllVideosAsync(db);
      expect(videos).toEqual([]);
    });

    test("returns all videos", async () => {
      await insertVideoAsync(db, createMockVideo({ id: "1" }));
      await insertVideoAsync(db, createMockVideo({ id: "2" }));

      const videos = await getAllVideosAsync(db);
      expect(videos).toHaveLength(2);
    });
  });

  describe("insertTranscriptAsync", () => {
    test("inserts a transcript", async () => {
      const video = createMockVideo();
      const transcript = createMockTranscript({ video_id: video.id });

      await insertVideoAsync(db, video);
      await insertTranscriptAsync(db, transcript);

      const result = await getTranscriptByVideoIdAsync(db, video.id);
      expect(result?.content).toBe(transcript.content);
    });
  });

  describe("getTranscriptByVideoIdAsync", () => {
    test("returns null for non-existent transcript", async () => {
      const result = await getTranscriptByVideoIdAsync(db, "nonexistent");
      expect(result).toBeNull();
    });

    test("retrieves existing transcript", async () => {
      const video = createMockVideo();
      const transcript = createMockTranscript({ video_id: video.id });

      await insertVideoAsync(db, video);
      await insertTranscriptAsync(db, transcript);

      const result = await getTranscriptByVideoIdAsync(db, video.id);
      expect(result?.video_id).toBe(video.id);
    });
  });

  describe("deleteTranscriptByVideoIdAsync", () => {
    test("deletes transcript", async () => {
      const video = createMockVideo();
      const transcript = createMockTranscript({ video_id: video.id });

      await insertVideoAsync(db, video);
      await insertTranscriptAsync(db, transcript);
      await deleteTranscriptByVideoIdAsync(db, video.id);

      const result = await getTranscriptByVideoIdAsync(db, video.id);
      expect(result).toBeNull();
    });
  });

  describe("deleteVideoByIdAsync", () => {
    test("deletes video", async () => {
      const video = createMockVideo();

      await insertVideoAsync(db, video);
      await deleteVideoByIdAsync(db, video.id);

      const result = await getVideoByIdAsync(db, video.id);
      expect(result).toBeNull();
    });
  });
});
