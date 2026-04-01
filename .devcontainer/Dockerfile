ARG BASE_IMAGE=ghcr.io/milesburton/twitch-vod-downloader-base:main
FROM ${BASE_IMAGE}

ENV BUN_INSTALL=/home/bun/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}

# Set up fish for the bun user
USER bun
WORKDIR /home/bun

# Update Fish config for Bun
RUN echo '# Environment setup' > /home/bun/.config/fish/config.fish && \
    echo 'set -gx BUN_INSTALL "$HOME/.bun"' >> /home/bun/.config/fish/config.fish && \
    echo 'fish_add_path $BUN_INSTALL/bin' >> /home/bun/.config/fish/config.fish && \
    echo 'set -gx PATH $BUN_INSTALL/bin $PATH' >> /home/bun/.config/fish/config.fish && \
    echo '' >> /home/bun/.config/fish/config.fish && \
    echo 'if status is-interactive' >> /home/bun/.config/fish/config.fish && \
    echo '  echo ""' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "-------------------------------------------------" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "Welcome to the Twitch VOD Downloader Dev Container!" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "-------------------------------------------------" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "Available aliases:" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "  - download: Run VOD downloader" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "  - test: Run tests | test:coverage: Run with coverage" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "  - db: Open SQLite database | db-videos: List videos" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "  - disk: Check disk usage | browse: File browser info" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "-------------------------------------------------" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "File browser available at http://localhost:8080" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo ""' >> /home/bun/.config/fish/config.fish && \
    echo 'end' >> /home/bun/.config/fish/config.fish && \
    echo '' >> /home/bun/.config/fish/config.fish && \
    echo '# Application aliases' >> /home/bun/.config/fish/config.fish && \
    echo 'alias download="bun run /workspaces/twitch-vod-downloader/src/main.ts"' >> /home/bun/.config/fish/config.fish && \
    echo 'alias process-chapters="bun run /workspaces/twitch-vod-downloader/src/chapters/chapter-processor.ts"' >> /home/bun/.config/fish/config.fish && \
    echo '' >> /home/bun/.config/fish/config.fish && \
    echo '# Testing aliases' >> /home/bun/.config/fish/config.fish && \
    echo 'alias test="bun test"' >> /home/bun/.config/fish/config.fish && \
    echo 'alias test:coverage="bun test --coverage"' >> /home/bun/.config/fish/config.fish && \
    echo 'alias test:watch="bun test --watch"' >> /home/bun/.config/fish/config.fish && \
    echo '' >> /home/bun/.config/fish/config.fish && \
    echo '# Database aliases' >> /home/bun/.config/fish/config.fish && \
    echo 'alias db="sqlite3 /workspaces/twitch-vod-downloader/data/db/sqlite.db"' >> /home/bun/.config/fish/config.fish && \
    echo 'alias db-videos="sqlite3 /workspaces/twitch-vod-downloader/data/db/sqlite.db \"SELECT * FROM videos ORDER BY created_at DESC;\""' >> /home/bun/.config/fish/config.fish && \
    echo 'alias db-transcripts="sqlite3 /workspaces/twitch-vod-downloader/data/db/sqlite.db \"SELECT video_id, LENGTH(content) as content_length, created_at FROM transcripts;\""' >> /home/bun/.config/fish/config.fish && \
    echo '' >> /home/bun/.config/fish/config.fish && \
    echo '# Debugging and utility aliases' >> /home/bun/.config/fish/config.fish && \
    echo 'alias disk="ncdu /workspaces/twitch-vod-downloader/data"' >> /home/bun/.config/fish/config.fish && \
    echo 'alias browse="echo \"File browser available at http://localhost:8080\""' >> /home/bun/.config/fish/config.fish

# Set Fish as the shell
SHELL ["/usr/bin/fish", "-c"]

# Verify installations (optional, but good to have)
RUN $BUN_INSTALL/bin/bun --version && \
    python3 --version && \
    whisper --help

# Ensure workspace directory exists and is owned by bun
USER root
RUN mkdir -p /workspace && chown -R bun:bun /workspace
USER bun
WORKDIR /workspace