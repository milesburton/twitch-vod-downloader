import cron from 'node-cron';
import dotenv from 'dotenv';
import { processVideos, cleanTempDirectory, initializeDirectories } from './main-logic.js';
import { cleanupOldVideos } from './services/cleanup.js';
import { initDb } from './db/index.js';

dotenv.config();

const DOWNLOAD_SCHEDULE = process.env.DOWNLOAD_SCHEDULE || '0 0 * * *'; // Daily at midnight
const CLEANUP_SCHEDULE = process.env.CLEANUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM

async function runScheduledDownload() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🕐 Scheduled download check starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await cleanTempDirectory();
    await processVideos();
  } catch (error) {
    console.error('❌ Error in scheduled download:', error);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Scheduled download check completed');
  console.log('═══════════════════════════════════════════════════════════\n');
}

async function runScheduledCleanup() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧹 Scheduled cleanup starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const db = initDb();
  try {
    await cleanupOldVideos(db);
  } catch (error) {
    console.error('❌ Error in scheduled cleanup:', error);
  } finally {
    db.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Scheduled cleanup completed');
  console.log('═══════════════════════════════════════════════════════════\n');
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       🚀 Twitch VOD Downloader Scheduler Started        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('📅 Schedule Configuration:');
  console.log(`   • Download check: ${DOWNLOAD_SCHEDULE}`);
  console.log(`   • Cleanup:        ${CLEANUP_SCHEDULE}\n`);

  // Validate cron expressions
  if (!cron.validate(DOWNLOAD_SCHEDULE)) {
    console.error(`❌ Invalid DOWNLOAD_SCHEDULE cron expression: ${DOWNLOAD_SCHEDULE}`);
    process.exit(1);
  }
  if (!cron.validate(CLEANUP_SCHEDULE)) {
    console.error(`❌ Invalid CLEANUP_SCHEDULE cron expression: ${CLEANUP_SCHEDULE}`);
    process.exit(1);
  }

  // Initialize directories
  await initializeDirectories();

  // Schedule download check
  cron.schedule(DOWNLOAD_SCHEDULE, async () => {
    await runScheduledDownload();
  });

  // Schedule cleanup
  cron.schedule(CLEANUP_SCHEDULE, async () => {
    await runScheduledCleanup();
  });

  console.log('✅ Scheduler is running. Press Ctrl+C to stop.\n');

  // Run immediately on startup (optional)
  if (process.env.RUN_ON_STARTUP === 'true') {
    console.log('🏃 Running initial check on startup...\n');
    await runScheduledDownload();
  }

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Scheduler stopped by user');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Scheduler stopped');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Fatal error in scheduler:', error);
  process.exit(1);
});
