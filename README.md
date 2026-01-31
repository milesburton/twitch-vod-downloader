# 🎬 Twitch VOD Downloader

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Bun](https://img.shields.io/badge/Bun-1.2.0-blueviolet?logo=bun)
![Test Coverage](https://img.shields.io/badge/coverage-75.91%25-green)

**Archive Twitch VODs with AI-powered transcripts and chapters.**

This tool downloads Twitch VODs, generates searchable transcripts using OpenAI Whisper, and creates intelligent chapter markers using TensorFlow. All metadata is stored in SQLite for easy querying and management.

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
   Create `.env` in the project root:
   ```env
   CHANNEL_NAME=your_twitch_channel
   FILTER_CRITERIA=latest          # or 'first', or leave empty for all
   SPECIFIC_VODS=                  # comma-separated VOD IDs (optional)
   ENABLE_TRANSCRIPTS=false        # set to 'true' to enable Whisper
   USE_GPU=true                    # set to 'false' for CPU-only
   WHISPER_MODEL=large-v2          # tiny, base, small, medium, large, large-v2
   CONCURRENT_CHUNK_PROCESS=1      # parallel transcript chunks
   ```

4. **Run:**
   ```bash
   bun run src/main.ts
   ```

## What It Does

### 1. Download VODs
- Fetches videos from any Twitch channel
- Supports retry logic for reliability
- Organizes with date-prefixed filenames: `YYYY-MM-DD_vod_<id>.mp4`

### 2. Generate Transcripts (Optional)
- Converts video to audio (WAV format)
- Processes with OpenAI Whisper for accuracy
- Handles long videos via chunking with overlap
- GPU-accelerated when available

### 3. Create Chapters (Optional)
- Uses TensorFlow Universal Sentence Encoder
- Segments content into logical chapters
- Generates titles and summaries
- Exports YouTube-compatible chapter descriptions

### 4. Store & Search
- SQLite database for all metadata
- Search transcripts by content
- Query videos by date, ID, or other criteria

## Usage Examples

### Download latest VOD:
```bash
FILTER_CRITERIA=latest bun run src/main.ts
```

### Download specific VODs:
```bash
SPECIFIC_VODS=12345678,87654321 bun run src/main.ts
```

### Process chapters for a video:
```bash
bun run src/chapters/chapter-processor.ts <video_id>
```

### Query the database:
```bash
sqlite3 data/db/sqlite.db "SELECT * FROM videos ORDER BY created_at DESC;"
```

## Project Structure

```
data/
├── videos/       # Downloaded MP4 files
├── audio/        # Extracted WAV files (temporary)
├── transcripts/  # JSON transcript files
├── db/          # SQLite database
└── temp/        # Temporary processing files

src/
├── main.ts                  # Entry point
├── services/
│   ├── download.ts         # VOD downloading
│   ├── scraper.ts          # Twitch API interaction
│   └── video-manager.ts    # Metadata management
├── transcript/
│   └── transcript.ts       # Whisper integration
├── chapters/
│   ├── chapter-processor.ts # Chapter generation
│   └── chapter-utils.ts     # TensorFlow utilities
├── db/
│   ├── index.ts            # Database initialization
│   └── helpers.ts          # CRUD operations
└── shared/
    ├── utils.ts            # Common utilities
    └── types.ts            # TypeScript definitions
```

## Development

### Run Tests
```bash
bun test                # Run all tests
bun test --coverage     # With coverage report
bun test --watch        # Watch mode
```

Current: **75.91% coverage** with 84+ tests

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
- `id`, `video_id`, `start_time`, `end_time`
- `content`, `summary`, `title`
- `created_at`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHANNEL_NAME` | - | **Required.** Twitch channel to download from |
| `FILTER_CRITERIA` | `""` | `latest`, `first`, or empty for all |
| `SPECIFIC_VODS` | `""` | Comma-separated VOD IDs (overrides filter) |
| `ENABLE_TRANSCRIPTS` | `false` | Enable Whisper transcription |
| `USE_GPU` | `true` | Use CUDA GPU for Whisper |
| `WHISPER_MODEL` | `large-v2` | Model size (affects accuracy/speed) |
| `CONCURRENT_CHUNK_PROCESS` | `1` | Parallel chunks for transcription |
| `INCLUDE_TRANSCRIPT_DURATION` | `false` | Add duration to transcript metadata |

## Tech Stack

- **Runtime:** Bun (fast JavaScript runtime)
- **Database:** SQLite3
- **Transcription:** OpenAI Whisper
- **ML:** TensorFlow.js + Universal Sentence Encoder
- **Media:** FFmpeg, yt-dlp
- **Dev Environment:** Docker + NVIDIA CUDA support

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

This project uses:
- **Bun** for fast execution and testing
- **Biome** for linting and formatting
- **TypeScript** for type safety

Pull requests welcome!
