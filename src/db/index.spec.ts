import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fsSync, { promises as fs } from "node:fs";
import path from "node:path";
import { initDb } from "./index";

interface SqliteTableRow {
	name: string;
}

interface SqliteColumnRow {
	name: string;
	pk: number;
}

describe("initDb", () => {
	const testDbPath = path.join(process.cwd(), "data", "db", "sqlite.db");

	afterEach(async () => {
		// Clean up test database if it exists
		try {
			await fs.unlink(testDbPath);
		} catch {
			// Ignore if file doesn't exist
		}
	});

	test("creates and initializes database", () => {
		const db = initDb();

		expect(db).toBeDefined();
		expect(typeof db).toBe("object");

		// Verify tables were created by running a simple query
		return new Promise<void>((resolve, reject) => {
			db.all(
				"SELECT name FROM sqlite_master WHERE type='table'",
				(err, tables: SqliteTableRow[]) => {
					if (err) return reject(err);

					const tableNames = tables.map((t) => t.name);
					expect(tableNames).toContain("videos");
					expect(tableNames).toContain("transcripts");
					expect(tableNames).toContain("chapters");

					db.close((closeErr) => {
						if (closeErr) return reject(closeErr);
						resolve();
					});
				},
			);
		});
	});

	test("continues when mkdirSync throws EEXIST", async () => {
		await fs.mkdir(path.dirname(testDbPath), { recursive: true });
		const mkdirSpy = spyOn(fsSync, "mkdirSync").mockImplementationOnce(() => {
			throw Object.assign(new Error("exists"), { code: "EEXIST" });
		});

		const db = initDb();

		await new Promise<void>((resolve, reject) => {
			db.close((err) => {
				if (err) return reject(err);
				resolve();
			});
		});

		mkdirSpy.mockRestore();
	});

	test("throws when mkdirSync fails with non-EEXIST error", () => {
		const mkdirSpy = spyOn(fsSync, "mkdirSync").mockImplementationOnce(() => {
			throw Object.assign(new Error("permission denied"), { code: "EACCES" });
		});

		expect(() => initDb()).toThrow("permission denied");
		mkdirSpy.mockRestore();
	});

	test("creates database file in correct location", async () => {
		const db = initDb();

		// Wait a moment for the database file to be created
		await new Promise((resolve) => setTimeout(resolve, 100));

		const stats = await fs.stat(testDbPath);
		expect(stats.isFile()).toBe(true);

		await new Promise<void>((resolve, reject) => {
			db.close((err) => {
				if (err) return reject(err);
				resolve();
			});
		});
	});

	test("video table has correct schema", () => {
		const db = initDb();

		return new Promise<void>((resolve, reject) => {
			db.all("PRAGMA table_info(videos)", (err, columns: SqliteColumnRow[]) => {
				if (err) return reject(err);

				const columnNames = columns.map((c) => c.name);
				expect(columnNames).toContain("id");
				expect(columnNames).toContain("file_path");
				expect(columnNames).toContain("created_at");

				// Check primary key
				const idColumn = columns.find((c) => c.name === "id");
				expect(idColumn.pk).toBe(1);

				db.close((closeErr) => {
					if (closeErr) return reject(closeErr);
					resolve();
				});
			});
		});
	});

	test("transcripts table has correct schema", () => {
		const db = initDb();

		return new Promise<void>((resolve, reject) => {
			db.all(
				"PRAGMA table_info(transcripts)",
				(err, columns: SqliteColumnRow[]) => {
					if (err) return reject(err);

					const columnNames = columns.map((c) => c.name);
					expect(columnNames).toContain("id");
					expect(columnNames).toContain("video_id");
					expect(columnNames).toContain("content");
					expect(columnNames).toContain("segments");
					expect(columnNames).toContain("created_at");

					db.close((closeErr) => {
						if (closeErr) return reject(closeErr);
						resolve();
					});
				},
			);
		});
	});

	test("chapters table has correct schema", () => {
		const db = initDb();

		return new Promise<void>((resolve, reject) => {
			db.all(
				"PRAGMA table_info(chapters)",
				(err, columns: SqliteColumnRow[]) => {
					if (err) return reject(err);

					const columnNames = columns.map((c) => c.name);
					expect(columnNames).toContain("id");
					expect(columnNames).toContain("video_id");
					expect(columnNames).toContain("start_time");
					expect(columnNames).toContain("end_time");
					expect(columnNames).toContain("content");
					expect(columnNames).toContain("summary");
					expect(columnNames).toContain("title");
					expect(columnNames).toContain("created_at");

					db.close((closeErr) => {
						if (closeErr) return reject(closeErr);
						resolve();
					});
				},
			);
		});
	});
});
