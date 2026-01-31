export function formatDatePrefix(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function filterVideoIDs(
  videoIDs: string[],
  criteria?: string,
  specificVODs?: string[] | string,
): string[] {
  if (!Array.isArray(videoIDs)) return [];
  if (videoIDs.length === 0) return [];

  if (specificVODs !== undefined && specificVODs !== "") {
    const vodList = Array.isArray(specificVODs) ? specificVODs : specificVODs
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (vodList.length > 0) {
      return vodList;
    }
  }

  if (!criteria?.trim()) {
    return [...videoIDs];
  }

  switch (criteria.toLowerCase().trim()) {
    case "latest":
      return [videoIDs[0]];
    case "first":
      return [videoIDs[videoIDs.length - 1]];
    default:
      return [...videoIDs];
  }
}
