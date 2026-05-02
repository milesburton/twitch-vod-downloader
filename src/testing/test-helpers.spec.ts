import { describe, expect, spyOn, test } from "bun:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
	assertFileExists,
	assertFileNotExists,
	cleanupTempTestDir,
	closeMockDatabase,
	createMockDatabase,
	createMockSpawn,
	createMockTranscript,
	createMockVideo,
	createTempFile,
	createTempTestDir,
	mockFetch,
	promisifyDbOperation,
	promisifyDbRun,
	readTestFile,
} from "./test-helpers";

describe("testing/test-helpers", () => {
	test("createMockDatabase creates expected tables", async () => {
		const db = createMockDatabase();
		const tables = await new Promise<Array<{ name: string }>>(
			(resolve, reject) => {
				db.all(
					"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
					(err, rows: Array<{ name: string }>) => {
						if (err) return reject(err);
						resolve(rows);
					},
				);
			},
		);
		expect(tables.map((t) => t.name)).toEqual(["transcripts", "videos"]);
		await closeMockDatabase(db);
	});

	test("closeMockDatabase rejects on already-closed database", async () => {
		const db = createMockDatabase();
		await closeMockDatabase(db);
		await expect(closeMockDatabase(db)).rejects.toBeDefined();
	});

	test("createMockVideo and createMockTranscript apply overrides", () => {
		const video = createMockVideo({
			id: "video-1",
			file_path: "/tmp/video.mp4",
		});
		expect(video.id).toBe("video-1");
		expect(video.file_path).toBe("/tmp/video.mp4");

		const transcript = createMockTranscript({
			video_id: video.id,
			content: "override content",
		});
		expect(transcript.video_id).toBe("video-1");
		expect(transcript.content).toBe("override content");
	});

	test("mockFetch returns configured and default responses", async () => {
		const fetchMock = mockFetch({
			"https://api.example.com/ok": {
				ok: true,
				status: 201,
				data: { value: 123 },
			},
		});

		const configured = await fetchMock("https://api.example.com/ok");
		expect(configured.ok).toBe(true);
		expect(configured.status).toBe(201);
		expect(await configured.json()).toEqual({ value: 123 });

		const fallback = await fetchMock(
			new URL("https://api.example.com/missing"),
		);
		expect(fallback.ok).toBe(false);
		expect(fallback.status).toBe(404);
		expect(await fallback.text()).toBe("Not found");
	});

	test("createMockSpawn returns configured or default responses", () => {
		const spawnMock = createMockSpawn({
			echo: {
				exitCode: 2,
			},
		});

		expect(spawnMock(["echo"]).exitCode).toBe(2);
		expect(spawnMock(["other"]).exitCode).toBe(0);
	});

	test("temp dir and file helpers create/read/cleanup resources", async () => {
		const dir = await createTempTestDir("helpers");
		const file = await createTempFile(dir, "sample.txt", "hello");

		await assertFileExists(file);
		expect(await readTestFile(file)).toBe("hello");

		await cleanupTempTestDir(dir);
		await expect(fs.access(dir)).rejects.toBeDefined();
	});

	test("cleanupTempTestDir swallows rm errors", async () => {
		const warnSpy = spyOn(console, "warn").mockImplementation(() => undefined);
		await expect(cleanupTempTestDir("\0bad-path")).resolves.toBeUndefined();
		expect(warnSpy).toHaveBeenCalledTimes(1);
		warnSpy.mockRestore();
	});

	test("assertFileExists and assertFileNotExists behavior", async () => {
		const dir = await createTempTestDir("assertions");
		const existing = path.join(dir, "exists.txt");
		await fs.writeFile(existing, "ok", "utf8");

		await expect(assertFileExists(existing)).resolves.toBeUndefined();
		await expect(
			assertFileExists(path.join(dir, "missing.txt")),
		).rejects.toThrow("Expected file to exist");

		await expect(
			assertFileNotExists(path.join(dir, "missing.txt")),
		).resolves.toBeUndefined();
		await expect(assertFileNotExists(existing)).rejects.toThrow(
			"Expected file to NOT exist",
		);

		await cleanupTempTestDir(dir);
	});

	test("promisifyDbOperation and promisifyDbRun resolve and reject", async () => {
		await expect(
			promisifyDbOperation<string>((cb) => cb(null, "ok")),
		).resolves.toBe("ok");
		await expect(
			promisifyDbOperation<string>((cb) => cb(new Error("boom"))),
		).rejects.toThrow("boom");

		await expect(promisifyDbRun((cb) => cb(null))).resolves.toBeUndefined();
		await expect(
			promisifyDbRun((cb) => cb(new Error("run failed"))),
		).rejects.toThrow("run failed");
	});
});
