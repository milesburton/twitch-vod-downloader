import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import {
  getProjectRoot,
  getDataPath,
  ensureDirExists,
  getTempFilePath,
  readJsonFile,
  execWithOutput,
  filterVideoIDs,
} from "./utils";
import {
  createTempTestDir,
  cleanupTempTestDir,
  createTempFile,
  assertFileExists,
  assertFileNotExists,
} from "../testing/test-helpers";
import path from "path";
import { promises as fs } from "fs";

describe("getProjectRoot", () => {
  beforeEach(() => {
    delete process.env.TEST_PROJECT_ROOT;
    delete process.env.DATA_ROOT;
  });

  afterEach(() => {
    delete process.env.TEST_PROJECT_ROOT;
    delete process.env.DATA_ROOT;
  });

  test("returns a valid path", () => {
    const root = getProjectRoot();
    expect(root).toBeDefined();
    expect(typeof root).toBe("string");
    expect(root.length).toBeGreaterThan(0);
  });

  test("returns an absolute path", () => {
    const root = getProjectRoot();
    expect(path.isAbsolute(root)).toBe(true);
  });
});

describe("getDataPath", () => {
  beforeEach(() => {
    delete process.env.TEST_PROJECT_ROOT;
    delete process.env.DATA_ROOT;
  });

  afterEach(() => {
    delete process.env.TEST_PROJECT_ROOT;
    delete process.env.DATA_ROOT;
  });

  test("returns path with data subdirectory", () => {
    const dataPath = getDataPath("videos");
    expect(dataPath).toContain("data");
    expect(dataPath).toContain("videos");
  });

  test("handles different subdirectory names", () => {
    const subdirs = ["videos", "audio", "transcripts", "temp", "db"];
    for (const subdir of subdirs) {
      const dataPath = getDataPath(subdir);
      expect(dataPath).toContain(subdir);
    }
  });
});

describe("ensureDirExists", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempTestDir("ensure-dir");
  });

  afterEach(async () => {
    await cleanupTempTestDir(testDir);
  });

  test("creates a new directory", async () => {
    const newDir = path.join(testDir, "new-directory");
    await assertFileNotExists(newDir);

    await ensureDirExists(newDir);

    await assertFileExists(newDir);
    const stats = await fs.stat(newDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test("creates nested directories", async () => {
    const nestedDir = path.join(testDir, "level1", "level2", "level3");

    await ensureDirExists(nestedDir);

    await assertFileExists(nestedDir);
  });

  test("does not throw if directory already exists", async () => {
    const existingDir = path.join(testDir, "existing");
    await fs.mkdir(existingDir);

    await expect(ensureDirExists(existingDir)).resolves.toBeUndefined();
  });

  test("throws on invalid path with permission issues", async () => {
    // This test is platform-specific and may not work in all environments
    // Skipping for now as it depends on file system permissions
  });
});

describe("getTempFilePath", () => {
  beforeEach(() => {
    delete process.env.TEST_PROJECT_ROOT;
    delete process.env.DATA_ROOT;
  });

  afterEach(() => {
    delete process.env.TEST_PROJECT_ROOT;
    delete process.env.DATA_ROOT;
  });

  test("includes provided prefix", async () => {
    const tempPath = await getTempFilePath("test-prefix");
    expect(path.basename(tempPath)).toContain("test-prefix");
  });

  test("includes provided suffix", async () => {
    const tempPath = await getTempFilePath("test", ".txt");
    expect(tempPath).toEndWith(".txt");
  });

  test("creates temp directory if it doesn't exist", async () => {
    const tempPath = await getTempFilePath();
    const tempDir = path.dirname(tempPath);

    const stats = await fs.stat(tempDir);
    expect(stats.isDirectory()).toBe(true);
  });
});

describe("readJsonFile", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempTestDir("read-json");
  });

  afterEach(async () => {
    await cleanupTempTestDir(testDir);
  });

  test("reads and parses valid JSON file", async () => {
    const jsonData = { name: "test", value: 123, nested: { key: "value" } };
    const filePath = await createTempFile(
      testDir,
      "valid.json",
      JSON.stringify(jsonData)
    );

    const result = await readJsonFile(filePath);
    expect(result).toEqual(jsonData);
  });

  test("returns empty array for non-existent file", async () => {
    const nonExistentPath = path.join(testDir, "does-not-exist.json");

    const result = await readJsonFile(nonExistentPath);
    expect(result).toEqual([]);
  });

  test("returns empty array for invalid JSON", async () => {
    const filePath = await createTempFile(
      testDir,
      "invalid.json",
      "{ this is not valid JSON }"
    );

    const result = await readJsonFile(filePath);
    expect(result).toEqual([]);
  });

  test("returns empty array for empty file", async () => {
    const filePath = await createTempFile(testDir, "empty.json", "");

    const result = await readJsonFile(filePath);
    expect(result).toEqual([]);
  });

  test("handles JSON arrays", async () => {
    const jsonArray = [1, 2, 3, { key: "value" }];
    const filePath = await createTempFile(
      testDir,
      "array.json",
      JSON.stringify(jsonArray)
    );

    const result = await readJsonFile(filePath);
    expect(result).toEqual(jsonArray);
  });
});

describe("execWithOutput", () => {
  test("executes command and returns output", async () => {
    const output = await execWithOutput(["echo", "hello world"]);
    expect(output).toBe("hello world");
  });

  test("trims whitespace from output", async () => {
    const output = await execWithOutput(["echo", "  test  "]);
    expect(output).toBe("test");
  });

  test("handles commands with multiple arguments", async () => {
    const output = await execWithOutput(["echo", "-n", "test"]);
    expect(output).toBe("test");
  });

  test("returns empty string for commands with no output", async () => {
    const output = await execWithOutput(["true"]);
    expect(output).toBe("");
  });
});

describe("filterVideoIDs", () => {
  const testVideoIDs = ["id1", "id2", "id3", "id4", "id5"];

  test("returns empty array for non-array input", () => {
    const result = filterVideoIDs("not-an-array" as any);
    expect(result).toEqual([]);
  });

  test("returns empty array for empty array input", () => {
    const result = filterVideoIDs([]);
    expect(result).toEqual([]);
  });

  test("returns all videos when no criteria provided", () => {
    const result = filterVideoIDs(testVideoIDs);
    expect(result).toEqual(testVideoIDs);
    expect(result).not.toBe(testVideoIDs); // Returns a copy
  });

  test("returns specific VODs when provided as array", () => {
    const specificVODs = ["id2", "id4"];
    const result = filterVideoIDs(testVideoIDs, undefined, specificVODs);
    expect(result).toEqual(specificVODs);
  });

  test("returns specific VODs when provided as comma-separated string", () => {
    const result = filterVideoIDs(testVideoIDs, undefined, "id1,id3,id5");
    expect(result).toEqual(["id1", "id3", "id5"]);
  });

  test("trims whitespace from specific VODs string", () => {
    const result = filterVideoIDs(testVideoIDs, undefined, " id1 , id2 , id3 ");
    expect(result).toEqual(["id1", "id2", "id3"]);
  });

  test("filters out empty strings from specific VODs", () => {
    const result = filterVideoIDs(testVideoIDs, undefined, "id1,,id2,  ,id3");
    expect(result).toEqual(["id1", "id2", "id3"]);
  });

  test("returns empty array for empty specific VODs string after filtering", () => {
    const result = filterVideoIDs(testVideoIDs, undefined, "  ,  ,  ");
    expect(result).toEqual([]);
  });

  test("ignores criteria when specific VODs are provided", () => {
    const result = filterVideoIDs(testVideoIDs, "latest", ["id3", "id4"]);
    expect(result).toEqual(["id3", "id4"]);
  });

  test("falls through to criteria when specificVODs is empty string", () => {
    const result = filterVideoIDs(testVideoIDs, "latest", "");
    expect(result).toEqual(["id1"]);
  });

  test("returns latest video with 'latest' criteria", () => {
    const result = filterVideoIDs(testVideoIDs, "latest");
    expect(result).toEqual(["id1"]);
  });

  test("returns first video with 'first' criteria", () => {
    const result = filterVideoIDs(testVideoIDs, "first");
    expect(result).toEqual(["id5"]);
  });

  test("handles case-insensitive criteria", () => {
    expect(filterVideoIDs(testVideoIDs, "LATEST")).toEqual(["id1"]);
    expect(filterVideoIDs(testVideoIDs, "FiRsT")).toEqual(["id5"]);
  });

  test("trims whitespace from criteria", () => {
    const result = filterVideoIDs(testVideoIDs, "  latest  ");
    expect(result).toEqual(["id1"]);
  });

  test("returns all videos for unknown criteria", () => {
    const result = filterVideoIDs(testVideoIDs, "unknown");
    expect(result).toEqual(testVideoIDs);
  });

  test("returns copy of array, not original reference", () => {
    const result = filterVideoIDs(testVideoIDs, "");
    expect(result).toEqual(testVideoIDs);
    expect(result).not.toBe(testVideoIDs);

    result.push("modified");
    expect(testVideoIDs).not.toContain("modified");
  });
});
