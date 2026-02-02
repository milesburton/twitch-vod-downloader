import sqlite3 from "sqlite3";
import { Video, Transcript } from "../shared/types";
import { promises as fs } from "fs";
import path from "path";

export function createMockDatabase(): sqlite3.Database {
  const db = new sqlite3.Database(":memory:");
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        content TEXT NOT NULL,
        segments TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (video_id) REFERENCES videos(id)
      )
    `);
  });

  return db;
}

export async function closeMockDatabase(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function createMockVideo(overrides?: Partial<Video>): Video {
  return {
    id: "12345678",
    file_path: "/data/videos/2024-01-15_vod_12345678.mp4",
    created_at: new Date("2024-01-15T10:00:00Z").toISOString(),
    ...overrides,
  };
}

export function createMockTranscript(
  overrides?: Partial<Transcript>,
): Transcript {
  return {
    id: crypto.randomUUID(),
    video_id: "12345678",
    content: "This is a sample transcript content for testing purposes.",
    segments: JSON.stringify([
      { id: 0, start: 0, end: 5, text: "This is a sample" },
      { id: 1, start: 5, end: 10, text: "transcript content" },
      { id: 2, start: 10, end: 15, text: "for testing purposes." },
    ]),
    created_at: new Date("2024-01-15T11:00:00Z").toISOString(),
    ...overrides,
  };
}

interface MockFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

export function mockFetch(responses: Record<string, any>): typeof fetch {
  return async (
    url: string | URL | Request,
    _init?: RequestInit,
  ): Promise<MockFetchResponse> => {
    const urlString = typeof url === "string" ? url : url.toString();

    if (responses[urlString]) {
      const response = responses[urlString];
      return {
        ok: response.ok ?? true,
        status: response.status ?? 200,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
      } as MockFetchResponse;
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
      text: async () => "Not found",
    } as MockFetchResponse;
  };
}

interface MockSpawnResult {
  exitCode: number | Promise<number>;
  stdout?: ReadableStream<Uint8Array>;
  stderr?: ReadableStream<Uint8Array>;
}

/**
 * Creates a mock Bun.spawn function for testing external processes
 */
export function createMockSpawn(mockResults: Record<string, MockSpawnResult>) {
  return (cmd: string[]): MockSpawnResult => {
    const cmdKey = cmd[0]; // Use the first element (command name) as key

    if (mockResults[cmdKey]) {
      return mockResults[cmdKey];
    }

    // Default: return successful execution
    return {
      exitCode: 0,
    };
  };
}

// =============================================================================
// Temporary Directory Helpers
// =============================================================================

/**
 * Creates a temporary directory for file-based tests
 */
export async function createTempTestDir(prefix = "test"): Promise<string> {
  const tmpDir = path.join(
    process.cwd(),
    "data",
    "test-temp",
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  );
  await fs.mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

/**
 * Recursively removes a temporary test directory
 */
export async function cleanupTempTestDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup test directory ${dirPath}:`, error);
  }
}

/**
 * Creates a temporary file with content for testing
 */
export async function createTempFile(
  dirPath: string,
  filename: string,
  content: string,
): Promise<string> {
  const filePath = path.join(dirPath, filename);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Asserts that a file exists at the given path
 */
export async function assertFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Expected file to exist at ${filePath}`);
  }
}

/**
 * Asserts that a file does NOT exist at the given path
 */
export async function assertFileNotExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
    throw new Error(`Expected file to NOT exist at ${filePath}`);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error; // Re-throw if it's not a "file not found" error
    }
  }
}

/**
 * Reads and returns the contents of a file
 */
export async function readTestFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}

// =============================================================================
// Promise Helpers for Callback-based Functions
// =============================================================================

/**
 * Promisifies a database operation that uses callbacks
 */
export function promisifyDbOperation<T>(
  operation: (callback: (err: Error | null, result?: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    operation((err, result) => {
      if (err) reject(err);
      else resolve(result as T);
    });
  });
}

/**
 * Promisifies a database run operation (for INSERT, UPDATE, DELETE)
 */
export function promisifyDbRun(
  operation: (callback: (err: Error | null) => void) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    operation((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
