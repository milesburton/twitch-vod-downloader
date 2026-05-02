# Twitch VOD Downloader

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI and GHCR](https://github.com/milesburton/twitch-vod-downloader/actions/workflows/ci-ghcr.yml/badge.svg?branch=main)](https://github.com/milesburton/twitch-vod-downloader/actions/workflows/ci-ghcr.yml)
[![Base Devcontainer Image](https://github.com/milesburton/twitch-vod-downloader/actions/workflows/base-image.yml/badge.svg?branch=main)](https://github.com/milesburton/twitch-vod-downloader/actions/workflows/base-image.yml)
[![Coverage Gate](https://img.shields.io/badge/coverage%20gate-lines%2099.75%25%20%7C%20funcs%2097.85%25-brightgreen)](#quality-gates)
[![GHCR Image](https://img.shields.io/badge/GHCR-image-blue?logo=docker)](https://github.com/milesburton/twitch-vod-downloader/pkgs/container/twitch-vod-downloader)
[![GitHub Release](https://img.shields.io/github/v/release/milesburton/twitch-vod-downloader?sort=semver)](https://github.com/milesburton/twitch-vod-downloader/releases)
[![Last Commit](https://img.shields.io/github/last-commit/milesburton/twitch-vod-downloader)](https://github.com/milesburton/twitch-vod-downloader/commits/main)
[![Bun](https://img.shields.io/badge/Bun-1.3.13-blueviolet?logo=bun)](https://bun.sh)
[![Biome](https://img.shields.io/badge/Biome-2.4.14-green?logo=biome)](https://biomejs.dev)

Twitch VOD ingestion pipeline with optional transcription and chapter generation. The project downloads VODs, stores metadata in SQLite, and can generate searchable transcripts and YouTube-friendly chapter descriptions.

## Overview

Core capabilities:
- Download VOD metadata and media from Twitch
- Generate Whisper transcripts (optional)
- Segment transcripts into chapters with summaries (optional)
- Store/query metadata in SQLite

Primary runtime commands:
```bash
bun run src/main.ts
bun run src/main.ts list
bun run src/main.ts list-transcripts
bun run src/chapters/chapter-processor.ts <video_id>
```

## Configuration

Set environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `CHANNEL_NAME` | required | Twitch channel to process |
| `FILTER_CRITERIA` | `""` | `latest`, `first`, or empty for all |
| `SPECIFIC_VODS` | `""` | Comma-separated VOD IDs (overrides filter) |
| `ENABLE_TRANSCRIPTS` | `false` | Enable Whisper transcription |
| `USE_GPU` | `true` | Use CUDA acceleration when available |
| `WHISPER_MODEL` | `large-v2` | Whisper model size |
| `CONCURRENT_CHUNK_PROCESS` | `1` | Parallel transcription chunks |
| `INCLUDE_TRANSCRIPT_DURATION` | `false` | Include duration metadata in transcript output |

Typical examples:
```bash
FILTER_CRITERIA=latest bun run src/main.ts
SPECIFIC_VODS=12345678,87654321 bun run src/main.ts
```

## Runtime and Data

Storage locations:
- `data/videos/` downloaded VODs
- `data/transcripts/` transcript JSON
- `data/youtube-descriptions/` chapter description text files
- `data/db/sqlite.db` metadata database

Quick database inspection:
```bash
sqlite3 data/db/sqlite.db "SELECT * FROM videos ORDER BY created_at DESC;"
```

## Development

Recommended dev workflow uses the provided Dev Container. Docker Compose can be used as an alternative local runtime.

Key commands:
```bash
bun install
bun test
bun test --watch
bun run coverage:check
bun run hooks:install
```

## Quality Gates

Quality is enforced both locally and in CI:
- Linting: Biome
- Tests: Bun test suite
- Coverage gate (Bun LCOV + checker script)

Current minimum enforced thresholds:
- Lines: 99.75%
- Functions: 97.85%

Hook policy:
- `pre-commit` runs staged lint + coverage gate
- `commit-msg` enforces Conventional Commits

## Technology

- Runtime: Bun
- Language: TypeScript
- Database: SQLite3
- Transcription: Whisper
- Chaptering: TensorFlow.js + Universal Sentence Encoder
- Tooling: Biome, GitHub Actions, Dev Containers

## Operational Notes

- Respect Twitch API usage policies and rate limits.
- Disk consumption can grow quickly with long VODs and transcript artifacts.
- Whisper model choice impacts accuracy, speed, and compute requirements.

## License

MIT. See [LICENSE](LICENSE).
