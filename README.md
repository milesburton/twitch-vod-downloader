# 🎬 Twitch VOD Downloader

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Bun](https://img.shields.io/badge/Bun-1.2.0-blueviolet?logo=bun)
![Biome](https://img.shields.io/badge/Biome-2.3.13-green?logo=biome)
![Test Coverage](https://img.shields.io/badge/coverage-90.08%25-brightgreen)
![Tests](https://img.shields.io/badge/tests-155%20passing-brightgreen)

**Fully automated Twitch VOD archiving with YouTube backup, AI transcripts, and intelligent chapter generation.**

A complete archival solution that automatically downloads Twitch VODs, uploads them to YouTube for permanent storage, generates searchable transcripts using OpenAI Whisper, and creates intelligent chapter markers with TensorFlow. Runs hands-free via Docker scheduler with automatic disk space management.

**Perfect for:**
- 📼 Archiving your own streams to YouTube automatically
- 🎙️ Creating searchable transcripts of long VODs
- 🔍 Finding specific moments in streams via text search
- 💾 Managing storage with automatic cleanup
- ⏰ Set-and-forget operation with nightly automation

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Setup

1. **Clone and open in VS Code:**
   ```bash
   git clone https://github.com/milesburton/twitch-vod-downloader.git
   cd twitch-vod-downloader
   code .
   ```

2. **Reopen in Container:**
   - VS Code will prompt "Reopen in Container" - click it
   - Or: `Ctrl/Cmd+Shift+P` → `Dev Containers: Reopen in Container`

3. **Configure environment:**
   Copy `.env.template` to `.env` and customize:
   ```bash
   cp .env.template .env
   ```

   **Basic configuration** (required):
   ```env
   CHANNEL_NAME=your_twitch_channel   # Required: Twitch channel to archive
   FILTER_CRITERIA=                   # Optional: 'latest', 'first', or empty for all
   ```

   **Advanced features** (optional but recommended):
   ```env
   # YouTube Upload - Automatically archive to YouTube
   ENABLE_YOUTUBE_UPLOAD=false
   # See "YouTube Upload Setup" section for credentials
   # YOUTUBE_CLIENT_ID=...
   # YOUTUBE_CLIENT_SECRET=...
   # YOUTUBE_REFRESH_TOKEN=...

   # Video Cleanup - Automatically delete old local files (enabled by default)
   ENABLE_VIDEO_CLEANUP=true
   VIDEO_RETENTION_DAYS=30           # Keep videos 30 days after YouTube upload

   # Transcription - AI-powered transcripts with Whisper
   ENABLE_TRANSCRIPTS=false          # Resource intensive, enable if needed
   USE_GPU=true                      # Faster with GPU
   ```

4. **Choose your operation mode:**

   **Option A: Fully Automated (Recommended)**
   ```bash
   # Start the scheduler - runs nightly automatically
   docker compose up -d twitch-scheduler

   # View logs
   docker compose logs -f twitch-scheduler
   ```
   ✅ Checks for new videos every night at midnight
   ✅ Uploads to YouTube automatically (if configured)
   ✅ Cleans up old files automatically
   ✅ Zero maintenance required

   **Option B: Manual One-Time Execution**
   ```bash
   # Download videos once, right now
   bun run src/main.ts
   ```
   ✅ Good for testing or one-off downloads
   ✅ Full control over when it runs
   ❌ Requires manual execution each time

## 🌟 Features

### 📥 Automated VOD Archiving
- ✅ Nightly checks for new Twitch VODs (configurable schedule)
- ✅ Downloads using yt-dlp with intelligent retry logic
- ✅ Handles network failures and partial downloads
- ✅ Stores videos with date-prefixed filenames for easy sorting
- ✅ Fetches complete metadata from Twitch API

### ☁️ YouTube Backup & Upload
- ✅ **Automatic upload to YouTube** after successful download
- ✅ Configurable privacy settings (private, unlisted, public)
- ✅ Automatic playlist organization
- ✅ Smart retry logic with exponential backoff
- ✅ Quota management and error handling
- ✅ Complete upload status tracking in database
- ✅ **Zero manual intervention** - runs fully automated

### 🗄️ Intelligent Storage Management
- ✅ **Automatic cleanup** of old local files (enabled by default)
- ✅ Configurable retention period (30 days default)
- ✅ Safety checks - only deletes after successful YouTube upload
- ✅ Immediate cleanup mode for maximum space efficiency
- ✅ Preserves database records for historical tracking
- ✅ Prevents disk space exhaustion

### 🎙️ AI-Powered Transcription (Optional)
- ✅ OpenAI Whisper for accurate speech-to-text
- ✅ Handles multi-hour videos via intelligent chunking
- ✅ GPU-accelerated when available (10x faster)
- ✅ Full-text search across all transcripts
- ✅ Timestamped segments for precise navigation

### 📑 Smart Chapter Generation (Optional)
- ✅ TensorFlow Universal Sentence Encoder for content analysis
- ✅ Automatic segmentation into logical chapters
- ✅ AI-generated titles and summaries
- ✅ YouTube-compatible chapter descriptions
- ✅ Exports ready for video description

### 💾 Database & Search
- ✅ SQLite database for all metadata
- ✅ Full-text search across transcripts
- ✅ Query videos by date, ID, or custom criteria
- ✅ Track upload status and retry attempts
- ✅ Complete audit trail of all operations

### 🤖 Fully Automated Operation
- ✅ **Docker scheduler runs 24/7** in background
- ✅ Checks for new videos at midnight (configurable)
- ✅ Cleanup runs at 2 AM (configurable)
- ✅ Auto-restart on failure or system reboot
- ✅ Comprehensive logging for monitoring
- ✅ **Zero maintenance required** after setup

---

## 📊 How It Works (Automated Flow)

```
NIGHTLY AT MIDNIGHT (Scheduler)
│
├─ Check Twitch API for new VODs
│  └─ Found 2 new videos
│
├─ Download VOD #1 (2.5 GB, 3 hours)
│  ├─ Retry on failure (up to 10 attempts)
│  └─ Success: Saved to data/videos/
│
├─ Upload VOD #1 to YouTube
│  ├─ Privacy: Unlisted
│  ├─ Add to playlist: "Twitch Archive"
│  └─ Success: Mark as uploaded in DB
│
├─ Generate Transcript (if enabled)
│  ├─ Extract audio with FFmpeg
│  ├─ Process with Whisper AI
│  └─ Save searchable transcript
│
├─ Repeat for VOD #2...
│
└─ Done! Sleep until midnight tomorrow.

NIGHTLY AT 2 AM (Cleanup)
│
├─ Scan all local video files
│
├─ Check upload status in database
│
├─ Identify videos > 30 days old
│  └─ Found 5 videos to clean up
│
├─ Verify each is uploaded to YouTube
│
├─ Delete old local files
│  └─ Freed 12.5 GB disk space
│
└─ Done! Sleep until 2 AM tomorrow.
```

## Usage Examples

### Download latest VOD:
```bash
FILTER_CRITERIA=latest bun run src/main.ts
```

### Download specific VODs:
```bash
SPECIFIC_VODS=12345678,87654321 bun run src/main.ts
```

### List downloaded content:
```bash
bun run src/main.ts list            # List all downloaded videos
bun run src/main.ts list-transcripts # List all transcript files
```

### Process chapters for a video:
```bash
bun run src/chapters/chapter-processor.ts <video_id>
```

### Query the database:
```bash
sqlite3 data/db/sqlite.db "SELECT * FROM videos ORDER BY created_at DESC;"
```

## 📺 YouTube Upload Setup - Complete Guide

This feature allows the system to automatically upload downloaded VODs to your YouTube channel. The scheduler service handles everything - it checks for new videos nightly, downloads them, and uploads them to YouTube without any manual intervention.

### What You'll Need

To enable automatic YouTube uploads, you need 3 things from Google Cloud:

1. **Client ID** - Identifies your application
2. **Client Secret** - Secret key for your application
3. **Refresh Token** - Allows the app to upload videos on your behalf without manual login

**Estimated setup time:** 10-15 minutes (one-time setup)

---

### Step 1: Create a Google Cloud Project

**Why:** Google requires all apps using YouTube API to be registered in Google Cloud Console.

1. **Go to** [Google Cloud Console](https://console.cloud.google.com/)

2. **Create a new project:**
   - Click the project dropdown at the top (next to "Google Cloud")
   - Click "NEW PROJECT"
   - **Project name:** `Twitch VOD Uploader` (or any name you prefer)
   - **Organization:** Leave as "No organization" (unless you have one)
   - Click **"CREATE"**
   - Wait 10-20 seconds for project creation

3. **Select your new project:**
   - Click the project dropdown again
   - Select your newly created project

---

### Step 2: Enable YouTube Data API v3

**Why:** This API allows your app to upload videos to YouTube.

1. **Navigate to API Library:**
   - In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or use the search bar at the top and search for "API Library"

2. **Search for YouTube API:**
   - In the API Library search box, type: `YouTube Data API v3`
   - Click on **"YouTube Data API v3"** from the results

3. **Enable the API:**
   - Click the blue **"ENABLE"** button
   - Wait a few seconds for it to enable
   - You'll see a dashboard with quota information

**⚠️ Important:** The free tier has a daily quota of 10,000 units. Each video upload costs 1,600 units, allowing ~6 uploads per day.

---

### Step 3: Configure OAuth Consent Screen

**Why:** Google requires this to show users what permissions your app needs.

1. **Navigate to OAuth consent screen:**
   - Left sidebar → **"APIs & Services"** → **"OAuth consent screen"**

2. **Choose User Type:**
   - Select **"External"** (recommended)
   - Click **"CREATE"**

3. **Fill in App Information:**
   - **App name:** `Twitch VOD Uploader`
   - **User support email:** Your email address
   - **App logo:** (Optional - can skip)
   - **Developer contact information:** Your email address
   - Click **"SAVE AND CONTINUE"**

4. **Scopes:**
   - Click **"ADD OR REMOVE SCOPES"**
   - In the filter box, search for: `youtube.upload`
   - Check the box for: **`https://www.googleapis.com/auth/youtube.upload`**
   - Click **"UPDATE"**
   - Click **"SAVE AND CONTINUE"**

5. **Test users:**
   - Click **"ADD USERS"**
   - Enter your Google account email (the one that owns the YouTube channel)
   - Click **"ADD"**
   - Click **"SAVE AND CONTINUE"**

6. **Summary:**
   - Review and click **"BACK TO DASHBOARD"**

---

### Step 4: Create OAuth 2.0 Credentials

**Why:** These credentials identify your application to Google's servers.

1. **Navigate to Credentials:**
   - Left sidebar → **"APIs & Services"** → **"Credentials"**

2. **Create OAuth Client ID:**
   - Click **"+ CREATE CREDENTIALS"** at the top
   - Select **"OAuth client ID"**

3. **Configure OAuth client:**
   - **Application type:** Select **"Desktop app"**
   - **Name:** `Twitch VOD Desktop Client` (or any name)
   - Click **"CREATE"**

4. **Save your credentials:**
   - A popup appears with your **Client ID** and **Client Secret**
   - **⚠️ IMPORTANT:** Copy both values immediately:
     - Click the copy icon next to **"Your Client ID"**
     - Paste it somewhere safe (text file, password manager)
     - Click the copy icon next to **"Your Client Secret"**
     - Paste it somewhere safe
   - Click **"OK"** to close the popup

**✅ You now have your Client ID and Client Secret!**

---

### Step 5: Generate Refresh Token

**Why:** The refresh token allows the app to upload videos on your behalf without requiring manual login each time.

We'll use Google's OAuth 2.0 Playground (easiest method):

1. **Go to** [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)

2. **Configure to use your credentials:**
   - Click the **⚙️ gear icon** in the top-right corner
   - Check the box: **"Use your own OAuth credentials"**
   - **OAuth Client ID:** Paste your Client ID from Step 4
   - **OAuth Client secret:** Paste your Client Secret from Step 4
   - Click **"Close"** (the X in top-right of settings)

3. **Select YouTube API scope:**
   - On the left side, find **"YouTube Data API v3"**
   - Click to expand it
   - Check the box: **`https://www.googleapis.com/auth/youtube.upload`**
   - Scroll down and click the blue **"Authorize APIs"** button

4. **Authorize access:**
   - Select your Google account (the one with the YouTube channel)
   - You'll see a warning: **"Google hasn't verified this app"**
     - Click **"Advanced"** at the bottom
     - Click **"Go to Twitch VOD Uploader (unsafe)"**
   - Review the permissions: "Upload videos to YouTube"
   - Click **"Continue"**

5. **Exchange authorization code:**
   - You'll be redirected back to the playground
   - In **"Step 2"**, click the blue button: **"Exchange authorization code for tokens"**
   - Wait a few seconds

6. **Copy the refresh token:**
   - In the response on the right, find **`"refresh_token"`**
   - Copy the entire value (long string starting with `1//`)
   - **⚠️ CRITICAL:** Save this token securely - you can't retrieve it again!

**✅ You now have your Refresh Token!**

---

### Step 6: Create YouTube Playlist (Optional but Recommended)

**Why:** Organizes all uploaded VODs into a dedicated playlist for easy access.

1. **Go to** [YouTube Studio](https://studio.youtube.com/)

2. **Create a new playlist:**
   - Left sidebar → **"Playlists"**
   - Click **"NEW PLAYLIST"** (blue button)
   - **Name:** `Twitch VODs Archive` (or any name)
   - **Visibility:**
     - **Unlisted** (recommended) - Only people with the link can see
     - **Private** - Only you can see
     - **Public** - Anyone can find and watch
   - Click **"CREATE"**

3. **Get the Playlist ID:**
   - Click on your newly created playlist
   - Look at the URL in your browser:
     ```
     https://studio.youtube.com/playlist/PLxxx.../edit
                                     ^^^^^^^^
                                  This is your Playlist ID
     ```
   - Copy the part after `/playlist/` and before `/edit`
   - Example: `PLaBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890`

**✅ You now have your Playlist ID!**

---

### Step 7: Configure the Application

**Add all credentials to your `.env` file:**

Edit the `.env` file in your project root:

```env
# Enable YouTube uploads
ENABLE_YOUTUBE_UPLOAD=true

# Paste your credentials from Google Cloud (Step 4)
YOUTUBE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXy

# Paste your refresh token from OAuth Playground (Step 5)
YOUTUBE_REFRESH_TOKEN=1//0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ

# Paste your playlist ID from YouTube (Step 6) - optional
YOUTUBE_PLAYLIST_ID=PLaBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890

# Privacy setting for uploaded videos
YOUTUBE_VIDEO_PRIVACY=unlisted  # Options: private, unlisted, public

# Maximum retry attempts for failed uploads
YOUTUBE_MAX_UPLOAD_ATTEMPTS=3
```

**⚠️ Security Note:** Never commit your `.env` file to git! It's already in `.gitignore`.

---

### Step 8: Test the Setup (One-Time Manual Test)

Before enabling the automated scheduler, test that everything works:

```bash
# Download the latest video and upload to YouTube
FILTER_CRITERIA=latest bun run src/main.ts
```

**What happens:**
1. Downloads the latest VOD from Twitch
2. Saves it to `data/videos/`
3. Automatically uploads to YouTube
4. Adds it to your playlist (if configured)
5. Shows upload progress in the console

**Expected output:**
```
⬇️  Downloaded video: 2685567931
⬆️  Uploading 2685567931 to YouTube (attempt 1/3)...
📤 Uploading to YouTube with privacy: unlisted
✅ Successfully uploaded 2685567931 to YouTube: dQw4w9WgXcQ
📋 Added to playlist: PLxxx...
```

**If it works:** ✅ Setup complete! Proceed to Step 9.

**If it fails:** See [Troubleshooting](#troubleshooting) section below.

---

### Step 9: Enable Automated Daily Uploads

Now that YouTube upload works, enable the automated scheduler to run nightly:

```bash
# Start the scheduler service (runs in background)
docker compose up -d twitch-scheduler

# View logs to confirm it's running
docker compose logs -f twitch-scheduler
```

**What the scheduler does automatically:**
- ✅ Checks for new VODs every night at midnight (configurable)
- ✅ Downloads any new videos
- ✅ Uploads them to YouTube with your configured settings
- ✅ Adds them to your playlist
- ✅ Cleans up old local files after 30 days (configurable)
- ✅ Retries failed uploads automatically
- ✅ Runs continuously - no manual intervention needed

**Expected output from scheduler:**
```
╔═══════════════════════════════════════════════════════════╗
║       🚀 Twitch VOD Downloader Scheduler Started        ║
╚═══════════════════════════════════════════════════════════╝

📅 Schedule Configuration:
   • Download check: 0 0 * * * (daily at midnight)
   • Cleanup:        0 2 * * * (daily at 2 AM)

✅ Scheduler is running. Press Ctrl+C to stop.
```

**To stop the scheduler:**
```bash
docker compose down twitch-scheduler
```

---

### Understanding YouTube API Quotas

**Free tier limits:**
- **Daily quota:** 10,000 units (resets at midnight Pacific Time)
- **Upload cost:** 1,600 units per video
- **Max uploads per day:** ~6 videos

**What happens when quota is exceeded:**
- Upload fails with "quotaExceeded" error
- Error is logged to database
- Upload automatically retries the next day
- No data loss - video remains in local storage

**To check your quota usage:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **Dashboard**
4. Click **"YouTube Data API v3"**
5. View quota usage graph

**Need more quota?** You can request a quota increase in Google Cloud Console, though it's rarely needed for personal archiving.

## 🤖 Automatic Nightly Scheduler

The scheduler service runs as a Docker container that operates 24/7, automatically handling all video downloads, YouTube uploads, and cleanup without any manual intervention.

### What the Scheduler Does

**Every Night at Midnight (default):**
1. ✅ Connects to Twitch API to check for new VODs
2. ✅ Downloads any new videos not already in your archive
3. ✅ Automatically uploads each video to YouTube (if enabled)
4. ✅ Adds videos to your specified playlist
5. ✅ Logs all activity to console and database
6. ✅ Handles errors and retries failures automatically

**Every Night at 2 AM (default):**
1. ✅ Scans local video files
2. ✅ Identifies videos older than retention period (30 days by default)
3. ✅ Verifies they were successfully uploaded to YouTube
4. ✅ Deletes old local files to free disk space
5. ✅ Preserves database records for historical tracking

**All times are configurable** - see [Custom Schedule](#custom-schedule) below.

---

### Starting the Scheduler (One Command)

```bash
# Start the scheduler in the background
docker compose up -d twitch-scheduler
```

**That's it!** The scheduler is now running and will:
- ✅ Check for videos every night at midnight
- ✅ Clean up old files every night at 2 AM
- ✅ Upload to YouTube automatically (if configured)
- ✅ Restart automatically if it crashes
- ✅ Resume operation after system reboots (with Docker Desktop set to start on boot)

---

### Monitoring the Scheduler

**View live logs:**
```bash
docker compose logs -f twitch-scheduler
```

**View last 50 lines:**
```bash
docker compose logs --tail=50 twitch-scheduler
```

**Check if it's running:**
```bash
docker compose ps
```

**Expected output when running:**
```
NAME                    STATUS              PORTS
twitch-vod-scheduler    Up 2 hours
```

---

### Custom Schedule

You can customize when the scheduler runs by editing `.env`:

```env
# Download check (default: daily at midnight)
DOWNLOAD_SCHEDULE=0 0 * * *

# Cleanup check (default: daily at 2 AM)
CLEANUP_SCHEDULE=0 2 * * *

# Run immediately when scheduler starts (useful for testing)
RUN_ON_STARTUP=false
```

**Cron Expression Format:** `minute hour day month weekday`

**Common Examples:**

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 6 hours | `0 */6 * * *` | Good for active streamers (4 checks/day) |
| Twice daily | `0 0,12 * * *` | Midnight and noon |
| Every 4 hours | `0 */4 * * *` | Frequent checks (6 times/day) |
| Daily at 3 AM | `0 3 * * *` | Single daily check |
| Weekly on Sunday | `0 0 * * 0` | Once per week |
| Every 30 minutes | `*/30 * * * *` | Very frequent (not recommended - uses quota) |

**⚠️ Important:** More frequent checks mean more API calls. YouTube quota is limited to ~6 uploads per day.

**Testing your schedule:** Use [crontab.guru](https://crontab.guru/) to validate cron expressions.

---

### Stopping the Scheduler

```bash
# Stop the scheduler
docker compose down twitch-scheduler

# Or stop all services
docker compose down
```

The scheduler gracefully shuts down and can be restarted anytime without data loss.

---

### Scheduler Operation Modes

**Mode 1: Fully Automated (Recommended)**
- YouTube upload: ✅ Enabled
- Video cleanup: ✅ Enabled
- Scheduler: ✅ Running
- **Result:** Hands-free operation. Videos automatically archive to YouTube and local storage is managed.

**Mode 2: Download Only**
- YouTube upload: ❌ Disabled
- Video cleanup: ❌ Disabled
- Scheduler: ✅ Running
- **Result:** Videos download nightly but stay local. Manual cleanup needed.

**Mode 3: Manual Operation**
- Scheduler: ❌ Stopped
- **Result:** Run `bun run src/main.ts` manually whenever you want to download videos.

## 🗑️ Automatic Video Cleanup

The cleanup system automatically manages your disk space by deleting old local video files after they've been safely uploaded to YouTube. **Cleanup runs automatically via the scheduler** - no manual intervention needed.

### Why Cleanup is Important

Without cleanup:
- ❌ Disk fills up with archived videos
- ❌ Eventually runs out of space
- ❌ Downloads fail when disk is full

With cleanup enabled:
- ✅ Local videos deleted after 30 days (configurable)
- ✅ YouTube serves as permanent archive
- ✅ Disk space managed automatically
- ✅ Never runs out of space

**Default: Cleanup is ENABLED** - Recommended for all setups.

---

### How It Works

**Automatic Operation (via Scheduler):**
1. Scheduler runs cleanup check daily at 2 AM (configurable)
2. Scans all video files in `data/videos/`
3. Checks each video's upload status in database
4. Identifies videos meeting cleanup criteria
5. Safely deletes old files
6. Logs cleanup operations

**Safety Checks:**
- ✅ Only deletes videos **successfully uploaded to YouTube**
- ✅ Verifies upload status in database before deletion
- ✅ Never deletes if upload failed or is pending
- ✅ Preserves database records for historical tracking
- ✅ Logs all deletions for audit trail

---

### Configuration Options

Edit `.env` to control cleanup behavior:

```env
# Enable/disable automatic cleanup (default: true - recommended)
ENABLE_VIDEO_CLEANUP=true

# How long to keep videos after YouTube upload (default: 30 days)
VIDEO_RETENTION_DAYS=30

# Delete immediately after upload vs. retention-based (default: false)
CLEANUP_AFTER_UPLOAD=false

# When cleanup runs (default: daily at 2 AM)
CLEANUP_SCHEDULE=0 2 * * *
```

---

### Cleanup Modes

**Mode 1: Retention-Based (Recommended)**
```env
CLEANUP_AFTER_UPLOAD=false
VIDEO_RETENTION_DAYS=30
```

**How it works:**
- Videos kept locally for 30 days after YouTube upload
- Provides local backup during retention period
- Deleted automatically after 30 days
- Balance between safety and disk management

**Best for:**
- Users who want a local backup window
- Protecting against accidental YouTube deletions
- Reviewing videos before permanent deletion

**Example timeline:**
- Day 1: Video downloaded and uploaded to YouTube
- Day 1-30: Video exists both locally and on YouTube
- Day 31: Local file automatically deleted (YouTube copy remains)

---

**Mode 2: Immediate Cleanup**
```env
CLEANUP_AFTER_UPLOAD=true
VIDEO_RETENTION_DAYS=30  # Ignored in this mode
```

**How it works:**
- Video deleted immediately after successful YouTube upload
- No local backup period
- Maximum disk space efficiency
- YouTube is the only copy

**Best for:**
- Limited disk space
- Trusting YouTube as primary storage
- High-volume channels with frequent uploads

**Example timeline:**
- Video downloaded → uploaded to YouTube → local file deleted (within minutes)

---

### Disk Space Management

**Check current disk usage:**
```bash
# Inside the container
ncdu /workspace/data/videos

# Or use the alias
disk
```

**Estimate storage needs:**
- Average VOD size: ~2-4 GB for 1080p60, 2-4 hours
- Daily streamer (1 VOD/day): ~60-120 GB/month
- With 30-day retention: ~60-120 GB needed
- With immediate cleanup: ~5-10 GB needed (temporary)

**If disk is nearly full:**
```bash
# Manually trigger cleanup (deletes videos older than retention period)
bun run src/scheduler.ts
# Cleanup runs automatically on schedule

# Or reduce retention period
VIDEO_RETENTION_DAYS=7  # Keep only 1 week
```

---

### Monitoring Cleanup Operations

**View cleanup logs:**
```bash
docker compose logs -f twitch-scheduler | grep "cleanup\|🗑️\|🧹"
```

**Expected output:**
```
🧹 Checking for videos older than 30 days (before 2026-01-06)...
🗑️  Deleted: 2026-01-01_vod_123456789.mp4 (uploaded to YouTube: dQw4w9WgXcQ)
🗑️  Deleted: 2026-01-02_vod_987654321.mp4 (uploaded to YouTube: xVn7wg9WcR)
✅ Cleaned up 2 old video(s)
⏭️  Skipped 5 video(s) (not uploaded to YouTube or file missing)
```

**Check cleanup history in database:**
```bash
sqlite3 data/db/sqlite.db "
  SELECT v.id, v.created_at, yu.uploaded_at,
         CASE WHEN EXISTS(SELECT 1 FROM videos WHERE file_path LIKE '%' || v.id || '%')
         THEN 'Local file exists' ELSE 'Cleaned up' END as status
  FROM videos v
  LEFT JOIN youtube_uploads yu ON v.id = yu.video_id
  WHERE yu.upload_status = 'completed'
  ORDER BY v.created_at DESC
  LIMIT 20;
"
```

---

### Cleanup Safety Features

**What gets deleted:**
- ✅ Videos successfully uploaded to YouTube (`upload_status = 'completed'`)
- ✅ Videos older than `VIDEO_RETENTION_DAYS`
- ✅ Local `.mp4` files only (database records preserved)

**What NEVER gets deleted:**
- ❌ Videos not yet uploaded to YouTube
- ❌ Videos with failed uploads
- ❌ Videos with pending uploads
- ❌ Videos within retention period
- ❌ Database records (kept forever for history)

**Rollback:** If you accidentally enabled cleanup too early, videos remain on YouTube. Local files cannot be recovered after deletion.

---

### Disabling Cleanup

If you prefer to manage cleanup manually:

```env
ENABLE_VIDEO_CLEANUP=false
```

**Then manually delete old files when needed:**
```bash
# List videos sorted by date
ls -lh data/videos/

# Delete specific video
rm data/videos/2026-01-01_vod_123456789.mp4

# Delete videos older than 30 days
find data/videos -name "*.mp4" -mtime +30 -delete
```

## Alternative Setup (Docker Compose)

If you prefer not to use VS Code Dev Containers:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/milesburton/twitch-vod-downloader.git
   cd twitch-vod-downloader
   ```

2. **Create `.env` file** (see configuration above)

3. **Build and run:**
   ```bash
   docker compose up --build        # Run in foreground
   docker compose up -d --build     # Run in background
   docker compose logs -f           # View logs
   docker compose down              # Stop container
   ```

## Project Structure

```
├── data
│   ├── audio            # Extracted audio files (.wav)
│   ├── db               # SQLite database (sqlite.db)
│   ├── temp             # Temporary processing files
│   ├── videos           # Downloaded videos (.mp4)
│   └── transcripts      # Generated transcripts
├── src
│   ├── db/              # Database operations
│   │   ├── index.ts     # Initialization
│   │   ├── helpers.ts   # CRUD operations
│   │   └── youtube-helpers.ts  # YouTube upload tracking
│   ├── services/        # Core services
│   │   ├── download.ts  # VOD download logic
│   │   ├── scraper.ts   # Twitch API integration
│   │   ├── youtube.ts   # YouTube upload service
│   │   ├── cleanup.ts   # Video retention & cleanup
│   │   └── video-manager.ts
│   ├── transcript/      # Transcription
│   │   ├── transcript.ts
│   │   └── transcript-helpers.ts
│   ├── chapters/        # Chapter processing
│   │   ├── chapter-processor.ts
│   │   └── chapter-utils.ts
│   ├── shared/          # Utilities
│   │   ├── utils.ts
│   │   ├── types.ts
│   │   └── pure/utils-pure.ts
│   ├── main.ts          # Entry point (one-time execution)
│   ├── main-logic.ts    # Core processing logic
│   └── scheduler.ts     # Automated scheduling service
├── .devcontainer/       # Dev container config
├── docker-compose.yml
└── README.md
```

## Development

### Run Tests
```bash
bun test                # Run all tests
bun test --coverage     # With coverage report
bun test --watch        # Watch mode
```

**Status:** 155 tests passing ✅ | **Coverage:** 90.08% ✅

### Database Schema

**videos:**
- `id` (PRIMARY KEY)
- `file_path`
- `created_at`

**transcripts:**
- `id` (PRIMARY KEY)
- `video_id` (FOREIGN KEY)
- `content` (full transcript text)
- `segments` (JSON array with timestamps)
- `created_at`

**chapters:**
- `id` (PRIMARY KEY)
- `video_id` (FOREIGN KEY)
- `start_time`, `end_time` (seconds)
- `title`, `summary`, `content`
- `created_at`

**youtube_uploads:**
- `id` (PRIMARY KEY)
- `video_id` (FOREIGN KEY)
- `youtube_video_id` (YouTube's assigned ID)
- `youtube_playlist_id` (Playlist where added)
- `upload_status` (pending, uploading, completed, failed)
- `upload_attempts` (retry counter)
- `error_message` (last error if failed)
- `uploaded_at`, `created_at`, `updated_at`

## Environment Variables

### Core Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `CHANNEL_NAME` | *required* | Twitch channel to download from |
| `FILTER_CRITERIA` | `""` | `latest`, `first`, or empty for all |
| `SPECIFIC_VODS` | `""` | Comma-separated VOD IDs (overrides filter) |

### Transcription
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_TRANSCRIPTS` | `false` | Enable Whisper transcription |
| `USE_GPU` | `true` | Use CUDA GPU for Whisper |
| `WHISPER_MODEL` | `large-v2` | Model size (affects accuracy/speed) |
| `CONCURRENT_CHUNK_PROCESS` | `1` | Parallel chunks for transcription |
| `INCLUDE_TRANSCRIPT_DURATION` | `false` | Add duration to transcript metadata |

### YouTube Upload
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_YOUTUBE_UPLOAD` | `false` | Automatically upload to YouTube after download |
| `YOUTUBE_CLIENT_ID` | *required* | OAuth 2.0 Client ID from Google Cloud |
| `YOUTUBE_CLIENT_SECRET` | *required* | OAuth 2.0 Client Secret |
| `YOUTUBE_REFRESH_TOKEN` | *required* | OAuth 2.0 Refresh Token |
| `YOUTUBE_PLAYLIST_ID` | `""` | YouTube playlist ID to add videos to |
| `YOUTUBE_VIDEO_PRIVACY` | `unlisted` | Privacy: `private`, `unlisted`, or `public` |
| `YOUTUBE_MAX_UPLOAD_ATTEMPTS` | `3` | Max retry attempts for failed uploads |

### Video Cleanup
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_VIDEO_CLEANUP` | `false` | Enable automatic cleanup of old videos |
| `VIDEO_RETENTION_DAYS` | `30` | Days to keep videos after YouTube upload |
| `CLEANUP_AFTER_UPLOAD` | `false` | Delete immediately after successful upload |

### Scheduler
| Variable | Default | Description |
|----------|---------|-------------|
| `DOWNLOAD_SCHEDULE` | `0 0 * * *` | Cron expression for download checks (daily at midnight) |
| `CLEANUP_SCHEDULE` | `0 2 * * *` | Cron expression for cleanup checks (daily at 2 AM) |
| `RUN_ON_STARTUP` | `false` | Run download check immediately when scheduler starts |

## Tech Stack

- **Runtime:** Bun (fast JavaScript runtime)
- **Database:** SQLite3
- **Transcription:** OpenAI Whisper
- **ML:** TensorFlow.js + Universal Sentence Encoder
- **Media:** FFmpeg, yt-dlp
- **Dev Environment:** Docker + NVIDIA CUDA support

## Contributing

This project uses:
- **Bun** for fast execution and testing
- **Biome** for linting and formatting
- **TypeScript** for type safety

Pull requests welcome!

## Important Notes

- **Twitch API:** Adhere to Twitch's API usage guidelines and rate limits
- **Storage:** Downloading VODs and generating transcripts can consume significant disk space. Use cleanup features to manage storage automatically.
- **Whisper Model:** Different model sizes offer different accuracy/speed tradeoffs (`tiny`, `base`, `small`, `medium`, `large`, `large-v2`)
- **YouTube API Quota:** Free tier allows ~6 video uploads per day (10,000 units daily, 1,600 per upload)
- **GPU Recommended:** Transcription and chapter processing are significantly faster with GPU acceleration

## 🔧 Troubleshooting

### YouTube Upload Issues

#### "Invalid grant" or "Invalid credentials" errors

**Problem:** Authentication fails when trying to upload.

**Solutions:**
1. **Check your credentials in `.env`:**
   ```bash
   # Verify all three are present and correct
   YOUTUBE_CLIENT_ID=should-end-with-.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=should-start-with-GOCSPX-
   YOUTUBE_REFRESH_TOKEN=should-start-with-1//
   ```

2. **Regenerate refresh token:**
   - Your refresh token may have expired (rare but possible)
   - Go back to [OAuth Playground](https://developers.google.com/oauthplayground/)
   - Follow Step 5 from "YouTube Upload Setup" again
   - Replace `YOUTUBE_REFRESH_TOKEN` in `.env` with new token

3. **Verify OAuth consent screen:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Check that your email is listed in "Test users"
   - Ensure YouTube Data API v3 scope is enabled

---

#### "Quota exceeded" errors

**Problem:** Upload fails with "quotaExceeded" error.

**Understanding quotas:**
- Free tier: 10,000 units/day
- Each upload: 1,600 units
- Maximum: ~6 uploads per day
- Resets: Midnight Pacific Time (UTC-8)

**What happens:**
- ✅ Error logged to database
- ✅ Video remains in local storage
- ✅ Upload automatically retries the next day
- ✅ No data loss

**Solutions:**
1. **Wait until tomorrow** - quota resets at midnight PT
2. **Check quota usage:**
   - [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → YouTube Data API v3 → Quotas
3. **Request quota increase:**
   - In Google Cloud Console, click "Request quota increase"
   - Explain your use case (personal archiving)
   - Usually approved within 1-2 days for legitimate uses

---

#### "The OAuth client was not found" error

**Problem:** OAuth Playground shows this error.

**Solutions:**
1. Verify you're using the **Desktop app** credentials (not Web app)
2. In OAuth Playground settings, ensure you pasted:
   - Correct Client ID
   - Correct Client Secret
3. Try creating new OAuth credentials in Google Cloud Console

---

#### Videos upload but aren't added to playlist

**Problem:** Video uploads successfully but doesn't appear in playlist.

**Solutions:**
1. **Verify playlist ID:**
   ```bash
   # Should look like: PLaBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
   YOUTUBE_PLAYLIST_ID=PLxxx...
   ```
   - Go to YouTube Studio → Playlists
   - Click your playlist
   - Copy ID from URL: `studio.youtube.com/playlist/PLxxx.../edit`

2. **Check playlist visibility:**
   - Playlist must exist and be owned by the account you authorized
   - Can be Private, Unlisted, or Public - all work

3. **Non-critical failure:**
   - Video still uploads successfully
   - Only playlist addition fails
   - Check logs for specific error message

---

#### "Access not configured" error

**Problem:** YouTube Data API not enabled.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **Library**
4. Search: "YouTube Data API v3"
5. Click **"ENABLE"**

---

### OAuth / Authentication Issues

#### "Google hasn't verified this app" warning

**This is normal!** When authorizing your own app:

1. Click **"Advanced"**
2. Click **"Go to [Your App Name] (unsafe)"**
3. This is safe - you created the app
4. Google shows this for all unverified personal apps

**To remove warning (optional):**
- Complete OAuth verification process (takes weeks)
- Not necessary for personal use

---

#### Refresh token doesn't work after regeneration

**Problem:** Generated new refresh token but still fails.

**Solutions:**
1. **Revoke old tokens:**
   - [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   - Find your app
   - Click "Remove access"
2. **Generate fresh token:**
   - Clear browser cache
   - Go to OAuth Playground
   - Complete full authorization flow again

---

### Scheduler Not Running

**Check if service is running:**
```bash
docker compose ps
```

**View logs for errors:**
```bash
docker compose logs -f twitch-scheduler
```

**Restart the scheduler:**
```bash
docker compose restart twitch-scheduler
```

### Storage Issues

**Check disk usage:**
```bash
# Inside container
ncdu /workspace/data

# Or use the alias
disk
```

**Manually trigger cleanup:**
```bash
# In container
bun run src/scheduler.ts
# Cleanup runs on schedule (default: 2 AM)
```

### Database Queries

**Check upload status:**
```bash
sqlite3 data/db/sqlite.db "SELECT video_id, upload_status, upload_attempts, error_message FROM youtube_uploads;"
```

**Find failed uploads:**
```bash
sqlite3 data/db/sqlite.db "SELECT * FROM youtube_uploads WHERE upload_status = 'failed';"
```

**Videos pending cleanup:**
```bash
sqlite3 data/db/sqlite.db "SELECT v.id, v.created_at, yu.uploaded_at FROM videos v INNER JOIN youtube_uploads yu ON v.id = yu.video_id WHERE yu.upload_status = 'completed' AND datetime(v.created_at) < datetime('now', '-30 days');"
```

## 📋 Quick Reference

### Essential Commands

```bash
# Start automated scheduler (recommended)
docker compose up -d twitch-scheduler
docker compose logs -f twitch-scheduler

# Stop scheduler
docker compose down twitch-scheduler

# One-time manual download
bun run src/main.ts

# List downloaded videos
bun run src/main.ts list

# Check database
sqlite3 data/db/sqlite.db "SELECT * FROM videos ORDER BY created_at DESC;"

# Check YouTube upload status
sqlite3 data/db/sqlite.db "SELECT video_id, upload_status, youtube_video_id FROM youtube_uploads;"

# View disk usage
ncdu data/videos/
```

### Configuration Quick Reference

**Minimal setup** (downloads only):
```env
CHANNEL_NAME=your_channel_name
```

**Recommended setup** (with YouTube + cleanup):
```env
CHANNEL_NAME=your_channel_name
ENABLE_YOUTUBE_UPLOAD=true
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_secret
YOUTUBE_REFRESH_TOKEN=your_token
YOUTUBE_PLAYLIST_ID=your_playlist_id
ENABLE_VIDEO_CLEANUP=true
VIDEO_RETENTION_DAYS=30
```

**Schedule configuration**:
```env
DOWNLOAD_SCHEDULE=0 0 * * *  # Midnight daily
CLEANUP_SCHEDULE=0 2 * * *   # 2 AM daily
```

### Typical Workflows

**Workflow 1: Fully Automated YouTube Archive**
1. Complete YouTube setup (10-15 min one-time)
2. Start scheduler: `docker compose up -d twitch-scheduler`
3. Done! Videos automatically archive to YouTube nightly

**Workflow 2: Local Archive Only**
1. Set `ENABLE_YOUTUBE_UPLOAD=false`
2. Set `ENABLE_VIDEO_CLEANUP=false`
3. Start scheduler for automatic downloads
4. Manage storage manually

**Workflow 3: Manual Operation**
1. Don't start scheduler
2. Run `bun run src/main.ts` when you want to download
3. Full control over timing

---

## 🎯 Summary

**What this tool does:**
- ✅ Automatically downloads Twitch VODs on a schedule
- ✅ Uploads them to YouTube for permanent archiving
- ✅ Manages disk space by cleaning up old local files
- ✅ Generates AI transcripts for searchable content
- ✅ Creates chapter markers for better navigation
- ✅ Runs 24/7 with zero maintenance

**Perfect for:**
- Streamers who want automatic YouTube backup
- Content creators archiving old streams
- Researchers analyzing stream content
- Anyone managing large VOD libraries

**After setup:**
- No manual downloads needed
- No disk space management needed
- No YouTube uploads needed
- Everything runs automatically
- Just monitor logs occasionally

**YouTube API costs:**
- Free tier: ~6 uploads per day
- No credit card required for free tier
- Costs $0 for typical personal use

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
