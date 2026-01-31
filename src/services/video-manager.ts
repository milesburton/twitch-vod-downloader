import Database from "sqlite3";
import { Video } from "../shared/types";
import { insertVideo } from "../db/helpers";

export function saveVideoMetadata(db: Database, video: Video) {
  insertVideo(db, {
    id: video.id,
    file_path: video.file_path,
    created_at: new Date().toISOString(),
  });
}
