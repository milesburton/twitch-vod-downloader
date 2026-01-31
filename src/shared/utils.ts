
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getProjectRoot(): string {
  return path.resolve(__dirname, "../..");
}

export function getDataPath(subdir: string): string {
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
  prefix = "temp",
  suffix = "",
): Promise<string> {
  const tempDir = getDataPath("temp");
  await ensureDirExists(tempDir);
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const tempFileName = `${prefix}_${uniqueId}${suffix}`;
  return path.join(tempDir, tempFileName);
}

export function formatDatePrefix(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  for await (const chunk of proc.stdout) {
    output += chunk.toString();
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
  if (specificVODs !== undefined) {
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
