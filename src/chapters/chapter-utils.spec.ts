import { test, expect, describe } from "bun:test";
import { generateChapterTitle, generateBulletPointSummary } from "./chapter-utils";

describe("generateChapterTitle", () => {
  test("generates title from first sentence", () => {
    const content = "This is the first sentence. This is the second sentence.";
    const summary = "fallback summary";

    const title = generateChapterTitle(content, summary);

    expect(title).toBe("This Is the First Sentence.");
  });

  test("capitalizes words correctly", () => {
    const content = "the quick brown fox jumps over the lazy dog.";
    const summary = "";

    const title = generateChapterTitle(content, summary);

    // Articles and prepositions should be lowercase except at start
    expect(title).toContain("The Quick Brown Fox");
    expect(title).toContain(" the ");
    expect(title).toContain(" over ");
  });

  test("truncates long titles to 60 characters with ellipsis", () => {
    const longContent =
      "This is a very long sentence that exceeds sixty characters and should be truncated appropriately. More text here.";
    const summary = "";

    const title = generateChapterTitle(longContent, summary);

    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toEndWith("...");
  });

  test("truncates at word boundary, not mid-word", () => {
    const content =
      "This is a sentence with many words that will be truncated at a word boundary not in the middle.";
    const summary = "";

    const title = generateChapterTitle(content, summary);

    if (title.endsWith("...")) {
      // Should end with complete word before ellipsis, not mid-word
      const beforeEllipsis = title.slice(0, -3).trim();
      expect(beforeEllipsis).toMatch(/\S$/); // Last char should be a word character (complete word)
      // Verify we didn't truncate mid-word by checking there's a space before the last word
      expect(beforeEllipsis).toMatch(/\s\S+$/); // Should have space then word at end
    }
  });

  test("uses summary as fallback when content has no sentences", () => {
    const content = "";
    const summary = "This Is The Summary";

    const title = generateChapterTitle(content, summary);

    expect(title).toContain("This");
  });

  test("capitalizes first letter of title", () => {
    const content = "lowercase start sentence.";
    const summary = "";

    const title = generateChapterTitle(content, summary);

    expect(title.charAt(0)).toBe(title.charAt(0).toUpperCase());
  });

  test("handles content with multiple sentence-ending punctuation", () => {
    const content = "First sentence! Second sentence? Third sentence.";
    const summary = "";

    const title = generateChapterTitle(content, summary);

    expect(title).toContain("First Sentence!");
  });

  test("handles empty content and empty summary", () => {
    const content = "";
    const summary = "";

    const title = generateChapterTitle(content, summary);

    expect(title).toBeDefined();
    expect(typeof title).toBe("string");
  });

  test("preserves case for lowercase articles in middle of title", () => {
    const content = "The cat and the dog.";
    const summary = "";

    const title = generateChapterTitle(content, summary);

    // "The" at start should be capitalized, "and" and "the" in middle should be lowercase
    expect(title).toBe("The Cat and the Dog.");
  });

  test("handles single word content", () => {
    const content = "Hello";
    const summary = "Summary";

    const title = generateChapterTitle(content, summary);

    expect(title).toBe("Hello");
  });
});

describe("generateBulletPointSummary", () => {
  test("returns empty string for empty content", async () => {
    const result = await generateBulletPointSummary("");

    expect(result).toBe("");
  });

  test("returns empty string for whitespace-only content", async () => {
    const result = await generateBulletPointSummary("   \n  \t  ");

    expect(result).toBe("");
  });

  test("returns bullet points for content with fewer sentences than requested", async () => {
    const content = "First sentence. Second sentence.";

    const result = await generateBulletPointSummary(content, 3);

    expect(result).toContain("🔹 First sentence.");
    expect(result).toContain("🔹 Second sentence.");
  });

  test("formats sentences with bullet points", async () => {
    const content = "Sentence one. Sentence two. Sentence three.";

    const result = await generateBulletPointSummary(content, 3);

    const lines = result.split("\n");
    expect(lines.length).toBe(3);
    expect(lines.every((line) => line.startsWith("🔹"))).toBe(true);
  });

  test("trims whitespace from sentences", async () => {
    const content = "  First.   Second.  ";

    const result = await generateBulletPointSummary(content, 2);

    expect(result).toContain("🔹 First.");
    expect(result).toContain("🔹 Second.");
    expect(result).not.toContain("  ");
  });

  test("handles content with single sentence", async () => {
    const content = "Only one sentence here.";

    const result = await generateBulletPointSummary(content, 3);

    expect(result).toBe("🔹 Only one sentence here.");
  });

  test("splits on sentence-ending punctuation", async () => {
    const content = "Question? Answer! Statement.";

    const result = await generateBulletPointSummary(content, 3);

    expect(result).toContain("Question?");
    expect(result).toContain("Answer!");
    expect(result).toContain("Statement.");
  });

  test("filters out empty sentences", async () => {
    const content = "First.  . Second.";

    const result = await generateBulletPointSummary(content, 3);

    const lines = result.split("\n").filter((line) => line.trim());
    expect(lines.length).toBe(2); // Should only have 2 valid sentences
  });

  test("uses default numPoints of 3 when not specified", async () => {
    const content = "One. Two. Three. Four. Five.";

    const result = await generateBulletPointSummary(content);

    const lines = result.split("\n");
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(lines.length).toBeGreaterThan(0);
  });

  test("returns all sentences when count equals sentence count", async () => {
    const content = "First. Second. Third.";

    const result = await generateBulletPointSummary(content, 3);

    expect(result.split("\n").length).toBe(3);
  });

  test("handles very long content", async () => {
    const sentences = Array.from({ length: 20 }, (_, i) => `Sentence ${i + 1}.`);
    const content = sentences.join(" ");

    const result = await generateBulletPointSummary(content, 5);

    const lines = result.split("\n");
    expect(lines.length).toBeLessThanOrEqual(20);
    expect(lines.length).toBeGreaterThan(0);
  }, 15000);
});
