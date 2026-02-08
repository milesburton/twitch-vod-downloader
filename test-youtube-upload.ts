import dotenv from 'dotenv';
import { initDb, getVideoByIdAsync } from './src/db/index.js';
import { uploadToYouTube } from './src/services/youtube.js';

dotenv.config();

async function testUpload() {
  console.log('🧪 Testing YouTube Upload\n');

  // Check credentials
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_REFRESH_TOKEN) {
    console.error('❌ YouTube credentials not configured in .env');
    process.exit(1);
  }

  console.log('✅ YouTube credentials found');
  console.log(`   Client ID: ${process.env.YOUTUBE_CLIENT_ID.substring(0, 20)}...`);
  console.log(`   Playlist ID: ${process.env.YOUTUBE_PLAYLIST_ID || '(not set)'}`);
  console.log(`   Privacy: ${process.env.YOUTUBE_VIDEO_PRIVACY || 'unlisted'}\n`);

  // Get a video from the database
  const db = initDb();
  const videoId = '2685567931'; // Latest video

  console.log(`📹 Looking up video: ${videoId}`);
  const video = await getVideoByIdAsync(db, videoId);

  if (!video) {
    console.error(`❌ Video ${videoId} not found in database`);
    db.close();
    process.exit(1);
  }

  console.log(`✅ Found video: ${video.file_path}\n`);

  // Test upload
  console.log('⬆️  Starting YouTube upload test...\n');
  try {
    await uploadToYouTube(db, video);
    console.log('\n✅ Upload test completed successfully!');
  } catch (error) {
    console.error('\n❌ Upload test failed:', error);
  } finally {
    db.close();
  }
}

testUpload();
