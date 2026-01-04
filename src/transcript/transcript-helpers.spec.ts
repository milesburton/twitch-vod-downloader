import { formatChunkNumber, isTextSimilar } from "./transcript-helpers";
import { test } from "../testing/test-helpers";

test("formatChunkNumber pads based on total chunks", () => {
  const total = 123; // padding width 3
  const a = formatChunkNumber(0, total);
  const b = formatChunkNumber(9, total);
  const c = formatChunkNumber(122, total);
  if (a !== "001" || b !== "010" || c !== "123") {
    throw new Error(`Unexpected results: ${a}, ${b}, ${c}`);
  }
});

test("isTextSimilar detects overlap above threshold", () => {
  const prev = "hello world this is a test";
  const cur = "world this is";
  if (!isTextSimilar(cur, prev, 0.3)) {
    throw new Error("Expected similarity above 0.3");
  }
});

test("isTextSimilar is false when texts differ", () => {
  const a = "alpha beta gamma";
  const b = "delta epsilon zeta";
  if (isTextSimilar(a, b, 0.3)) {
    throw new Error("Expected dissimilar texts");
  }
});

test("isTextSimilar returns false for empty inputs", () => {
  if (isTextSimilar("", "nonempty", 0.8)) {
    throw new Error("Expected false when text1 is empty");
  }
  if (isTextSimilar("nonempty", "", 0.8)) {
    throw new Error("Expected false when text2 is empty");
  }
});
