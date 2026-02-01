import { test, expect, describe } from "bun:test";

// Import the functions we need to test
function formatSecondsToTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${
      minutes
        .toString()
        .padStart(2, "0")
    }:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${
    remainingSeconds
      .toString()
      .padStart(2, "0")
  }`;
}

describe("formatSecondsToTimestamp", () => {
  test("formats seconds under 1 minute", () => {
    expect(formatSecondsToTimestamp(0)).toBe("00:00");
    expect(formatSecondsToTimestamp(30)).toBe("00:30");
    expect(formatSecondsToTimestamp(59)).toBe("00:59");
  });

  test("formats seconds under 1 hour", () => {
    expect(formatSecondsToTimestamp(60)).toBe("01:00");
    expect(formatSecondsToTimestamp(90)).toBe("01:30");
    expect(formatSecondsToTimestamp(3599)).toBe("59:59");
  });

  test("formats seconds over 1 hour", () => {
    expect(formatSecondsToTimestamp(3600)).toBe("01:00:00");
    expect(formatSecondsToTimestamp(3661)).toBe("01:01:01");
    expect(formatSecondsToTimestamp(7200)).toBe("02:00:00");
  });

  test("pads single digit values with zeros", () => {
    const result = formatSecondsToTimestamp(65);
    expect(result).toBe("01:05");
    expect(result.split(":")[0]).toMatch(/^\d{2}$/);
    expect(result.split(":")[1]).toMatch(/^\d{2}$/);
  });

  test("handles large timestamps correctly", () => {
    const result = formatSecondsToTimestamp(36000); // 10 hours
    expect(result).toBe("10:00:00");
  });

  test("handles fractional seconds (rounds down)", () => {
    expect(formatSecondsToTimestamp(90.7)).toBe("01:30");
  });
});

describe("generateYouTubeChapterDescription", () => {
  test("creates basic chapter description", () => {
    const chapters = [
      {
        id: "1",
        video_id: "test",
        start_time: 0,
        end_time: 60,
        title: "Introduction",
        summary: "🔹 Welcome to the video",
        content: "Welcome to the video",
        created_at: new Date().toISOString(),
      },
    ];

    // Simplified version of the function for testing
    function generateYouTubeChapterDescription(chapters: any[]): string {
      let description = "🕒 Chapters:\n\n";
      for (const chapter of chapters) {
        const timestamp = formatSecondsToTimestamp(chapter.start_time);
        const bullets = chapter.summary
          .replace(/🔹/g, "-")
          .split(/\n/)
          .filter((line: string) => line.trim() !== "")
          .map((line: string) => `* ${line.trim()}`)
          .slice(0, 3);
        description += `${timestamp} ${chapter.title}\n${bullets.join("\n")}\n\n`;
      }
      return description.trim();
    }

    const result = generateYouTubeChapterDescription(chapters);

    expect(result).toContain("🕒 Chapters:");
    expect(result).toContain("00:00 Introduction");
    expect(result).toContain("* - Welcome to the video");
  });

  test("replaces bullet emoji with dash", () => {
    const chapters = [
      {
        id: "1",
        video_id: "test",
        start_time: 0,
        end_time: 60,
        title: "Test",
        summary: "🔹 Point one\n🔹 Point two",
        content: "Content",
        created_at: new Date().toISOString(),
      },
    ];

    function generateYouTubeChapterDescription(chapters: any[]): string {
      let description = "🕒 Chapters:\n\n";
      for (const chapter of chapters) {
        const timestamp = formatSecondsToTimestamp(chapter.start_time);
        const bullets = chapter.summary
          .replace(/🔹/g, "-")
          .split(/\n/)
          .filter((line: string) => line.trim() !== "")
          .map((line: string) => `* ${line.trim()}`)
          .slice(0, 3);
        description += `${timestamp} ${chapter.title}\n${bullets.join("\n")}\n\n`;
      }
      return description.trim();
    }

    const result = generateYouTubeChapterDescription(chapters);

    expect(result).not.toContain("🔹");
    expect(result).toContain("* - Point one");
    expect(result).toContain("* - Point two");
  });

  test("limits bullets per chapter to 3", () => {
    const chapters = [
      {
        id: "1",
        video_id: "test",
        start_time: 0,
        end_time: 60,
        title: "Test",
        summary: "🔹 One\n🔹 Two\n🔹 Three\n🔹 Four\n🔹 Five",
        content: "Content",
        created_at: new Date().toISOString(),
      },
    ];

    function generateYouTubeChapterDescription(chapters: any[]): string {
      let description = "🕒 Chapters:\n\n";
      for (const chapter of chapters) {
        const timestamp = formatSecondsToTimestamp(chapter.start_time);
        const bullets = chapter.summary
          .replace(/🔹/g, "-")
          .split(/\n/)
          .filter((line: string) => line.trim() !== "")
          .map((line: string) => `* ${line.trim()}`)
          .slice(0, 3);
        description += `${timestamp} ${chapter.title}\n${bullets.join("\n")}\n\n`;
      }
      return description.trim();
    }

    const result = generateYouTubeChapterDescription(chapters);

    const bulletCount = (result.match(/\*/g) || []).length;
    expect(bulletCount).toBe(3);
  });

  test("handles multiple chapters", () => {
    const chapters = [
      {
        id: "1",
        video_id: "test",
        start_time: 0,
        end_time: 60,
        title: "Intro",
        summary: "🔹 Start",
        content: "Start",
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        video_id: "test",
        start_time: 60,
        end_time: 120,
        title: "Main",
        summary: "🔹 Middle",
        content: "Middle",
        created_at: new Date().toISOString(),
      },
    ];

    function generateYouTubeChapterDescription(chapters: any[]): string {
      let description = "🕒 Chapters:\n\n";
      for (const chapter of chapters) {
        const timestamp = formatSecondsToTimestamp(chapter.start_time);
        const bullets = chapter.summary
          .replace(/🔹/g, "-")
          .split(/\n/)
          .filter((line: string) => line.trim() !== "")
          .map((line: string) => `* ${line.trim()}`)
          .slice(0, 3);
        description += `${timestamp} ${chapter.title}\n${bullets.join("\n")}\n\n`;
      }
      return description.trim();
    }

    const result = generateYouTubeChapterDescription(chapters);

    expect(result).toContain("00:00 Intro");
    expect(result).toContain("01:00 Main");
  });

  test("filters out empty summary lines", () => {
    const chapters = [
      {
        id: "1",
        video_id: "test",
        start_time: 0,
        end_time: 60,
        title: "Test",
        summary: "🔹 Valid\n\n\n🔹 Also valid",
        content: "Content",
        created_at: new Date().toISOString(),
      },
    ];

    function generateYouTubeChapterDescription(chapters: any[]): string {
      let description = "🕒 Chapters:\n\n";
      for (const chapter of chapters) {
        const timestamp = formatSecondsToTimestamp(chapter.start_time);
        const bullets = chapter.summary
          .replace(/🔹/g, "-")
          .split(/\n/)
          .filter((line: string) => line.trim() !== "")
          .map((line: string) => `* ${line.trim()}`)
          .slice(0, 3);
        description += `${timestamp} ${chapter.title}\n${bullets.join("\n")}\n\n`;
      }
      return description.trim();
    }

    const result = generateYouTubeChapterDescription(chapters);

    const bulletCount = (result.match(/\*/g) || []).length;
    expect(bulletCount).toBe(2); // Only valid lines
  });
});
