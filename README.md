# 🎬 Twitch VOD Downloader

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Bun](https://img.shields.io/badge/Bun-1.2.0-blueviolet?logo=bun)
![Biome](https://img.shields.io/badge/Biome-2.3.13-green?logo=biome)
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
   WHISPER_MODEL=large-v2          # model size (affects accuracy/speed)
   CONCURRENT_CHUNK_PROCESS=1      # parallel chunks for transcription
   INCLUDE_TRANSCRIPT_DURATION=false
   ```

4. **Run the downloader:**
   ```bash
   bun run src/main.ts
   ```

## Features

### 1. Download VODs
- Fetches video metadata from Twitch API
- Downloads using yt-dlp with retry logic
- Stores videos with date-prefixed filenames

### 2. Generate Transcripts
- OpenAI Whisper AI transcription
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
│   │   └── helpers.ts   # CRUD operations
│   ├── services/        # Core services
│   │   ├── download.ts  # VOD download logic
│   │   ├── scraper.ts   # Twitch API integration
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
│   └── main.ts          # Entry point
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
- `id` (PRIMARY KEY)
- `video_id` (FOREIGN KEY)
- `start_time`, `end_time` (seconds)
- `title`, `summary`, `content`
- `created_at`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHANNEL_NAME` | *required* | Twitch channel to download from |
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

## Contributing

This project uses:
- **Bun** for fast execution and testing
- **Biome** for linting and formatting
- **TypeScript** for type safety

Install Git hooks locally:

```bash
bun install
bun run hooks:install
```

Configured hooks enforce:
- **pre-commit:** Biome checks on staged files + test suite
- **commit-msg:** Conventional Commits via Commitlint

Pull requests welcome!

## Important Notes

- **Twitch API:** Adhere to Twitch's API usage guidelines and rate limits
- **Storage:** Downloading VODs and generating transcripts can consume significant disk space
- **Whisper Model:** Different model sizes offer different accuracy/speed tradeoffs (`tiny`, `base`, `small`, `medium`, `large`, `large-v2`)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
