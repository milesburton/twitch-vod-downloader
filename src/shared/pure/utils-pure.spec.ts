import { filterVideoIDs, formatDatePrefix } from "./utils-pure";
import { test } from "../../testing/test-helpers";

test("formatDatePrefix returns YYYY-MM-DD", () => {
  const d = new Date("2026-01-03T12:34:56Z");
  const s = formatDatePrefix(d);
  if (s !== "2026-01-03") {
    throw new Error(`Expected 2026-01-03, got ${s}`);
  }
});

test("filterVideoIDs is pure and returns copies", () => {
  const ids = ["a", "b", "c"];
  const out = filterVideoIDs(ids);
  if (out === ids) {
    throw new Error("Expected a copy, not same reference");
  }
  if (out.length !== ids.length || out.join(",") !== ids.join(",")) {
    throw new Error("Expected identical contents");
  }
});

test("filterVideoIDs criteria latest/first and specificVODs", () => {
  const ids = ["3", "2", "1"];
  const latest = filterVideoIDs(ids, "latest");
  const first = filterVideoIDs(ids, "first");
  const specificArr = filterVideoIDs(ids, undefined, ["9", "8"]);
  const specificStr = filterVideoIDs(ids, undefined, "7, 6");
  if (latest.join(",") !== "3") throw new Error("Expected latest = 3");
  if (first.join(",") !== "1") throw new Error("Expected first = 1");
  if (specificArr.join(",") !== "9,8") throw new Error("Expected 9,8");
  if (specificStr.join(",") !== "7,6") throw new Error("Expected 7,6");
});

test("filterVideoIDs handles non-array and empty array", () => {
  const notArray = filterVideoIDs(undefined as unknown as string[]);
  const empty = filterVideoIDs([]);
  if (notArray.length !== 0) throw new Error("Expected [] for non-array");
  if (empty.length !== 0) throw new Error("Expected [] for empty array");
});

test("filterVideoIDs default branch when unknown criteria", () => {
  const ids = ["a", "b"];
  const out = filterVideoIDs(ids, "unknown");
  if (out.join(",") !== "a,b") throw new Error("Expected copy for default");
});

test("filterVideoIDs treats empty/whitespace criteria as no filter", () => {
  const ids = ["x", "y"];
  const outEmpty = filterVideoIDs(ids, "");
  const outSpaces = filterVideoIDs(ids, "   ");
  if (outEmpty.join(",") !== "x,y") {
    throw new Error("Expected copy for empty criteria");
  }
  if (outSpaces.join(",") !== "x,y") {
    throw new Error("Expected copy for spaces criteria");
  }
});
