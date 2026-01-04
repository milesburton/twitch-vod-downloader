export function formatChunkNumber(
  chunkIndex: number,
  totalChunks: number,
): string {
  const paddingWidth = totalChunks.toString().length;
  return (chunkIndex + 1).toString().padStart(paddingWidth, "0");
}

export function isTextSimilar(
  text1: string,
  text2: string,
  threshold = 0.8,
): boolean {
  if (!text1 || !text2) return false;
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[.,!?;:]/g, "")
      .trim();
  const words1 = normalize(text1).split(/\s+/);
  const words2 = normalize(text2).split(/\s+/);
  const commonWords = words1.filter((word) => words2.includes(word));
  const similarity = commonWords.length / (words1.length + words2.length - commonWords.length);
  return similarity >= threshold;
}
