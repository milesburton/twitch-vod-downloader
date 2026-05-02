import type Database from "sqlite3";
import { insertVideo } from "../db/helpers";
import type { Video } from "../shared/types";

export function saveVideoMetadata(db: Database, video: Video) {
	insertVideo(db, {
		id: video.id,
		file_path: video.file_path,
		created_at: new Date().toISOString(),
	});
}
