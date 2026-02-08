
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getProjectRoot(): string {
  if (process.env.TEST_PROJECT_ROOT) {
    return process.env.TEST_PROJECT_ROOT;
  }
  return path.resolve(__dirname, "../..");
}

export function getDataPath(subdir: string): string {
  if (process.env.DATA_ROOT) {
    return path.join(process.env.DATA_ROOT, subdir);
  }
  return path.join(getProjectRoot(), "data", subdir);
}

export async function ensureDirExists(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
}

export async function getTempFilePath(
  prefix?: string,
  suffix?: string,
): Promise<string> {
  const safePrefix = prefix || "temp";
  const safeSuffix = suffix || "";
  const tempDir = getDataPath("temp");
  await ensureDirExists(tempDir);
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const tempFileName = `${safePrefix}_${uniqueId}${safeSuffix}`;
  return path.join(tempDir, tempFileName);
}

export function formatDatePrefix(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateForFilename(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function sanitizeFilename(filename: string): string {
  // Replace invalid characters with underscores
  // Invalid chars: / \ : * ? " < > |
  return filename
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 200); // Limit length to avoid filesystem issues
}

export async function readJsonFile<T>(file: string): Promise<T | []> {
  try {
    const data = await fs.promises.readFile(file, "utf8");
    return JSON.parse(data) as T;
  } catch {
    return [];
  }
}

export async function execWithLogs(command: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
    });
    proc.stdout.pipeTo(new WritableStream({
      write(chunk) {
        process.stdout.write(chunk);
      }
    }));
    proc.stderr.pipeTo(new WritableStream({
      write(chunk) {
        process.stderr.write(chunk);
      }
    }));
    proc.exited.then(code => resolve(code)).catch(reject);
  });
}

export async function execWithOutput(command: string[]): Promise<string> {
  const proc = Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
  });
  let output = "";
  const decoder = new TextDecoder();
  for await (const chunk of proc.stdout) {
    output += decoder.decode(chunk);
  }
  return output.trim();
}

export function filterVideoIDs(
  videoIDs: string[],
  criteria?: string,
  specificVODs?: string[] | string,
): string[] {
  if (!Array.isArray(videoIDs)) {
    console.error("❌ videoIDs must be an array");
    return [];
  }
  if (videoIDs.length === 0) {
    console.log("ℹ️ Empty video ID array provided");
    return [];
  }
  if (specificVODs !== undefined && specificVODs !== "") {
    console.log("🎯 Using specific VODs filter");
    const vodList = Array.isArray(specificVODs) ? specificVODs : specificVODs
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (vodList.length === 0) {
      console.log("⚠️ No valid VOD IDs provided in specificVODs");
      return [];
    }
    return vodList;
  }
  if (!criteria?.trim()) {
    console.log("ℹ️ No filtering criteria - processing all videos");
    return [...videoIDs];
  }
  console.log(`🔍 Applying filter criteria: ${criteria}`);
  switch (criteria.toLowerCase().trim()) {
    case "latest":
      return [videoIDs[0]];
    case "first":
      return [videoIDs[videoIDs.length - 1]];
    default:
      console.log(
        `⚠️ Unknown filter criteria: "${criteria}", processing all videos`,
      );
      return [...videoIDs];
  }
}
