import { test } from "../testing/test-helpers.ts";
import { getDataPath } from "./utils.ts";

test("getDataPath resolves to top-level data", () => {
  const videosPath = getDataPath("videos");
  const usesSrcData = videosPath.includes("/src/data") || videosPath.includes("\\src\\data");
  if (usesSrcData) throw new Error("getDataPath incorrectly resolves to src/data");
  const containsTopLevel = videosPath.includes("/data/videos") ||
    videosPath.includes("\\data\\videos");
  if (!containsTopLevel) throw new Error("getDataPath must include data/videos");
});
