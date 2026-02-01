FROM nvidia/cuda:12.1.0-base-ubuntu22.04 AS base-deps

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    fish \
    ffmpeg \
    git \
    python3 \
    python3-pip \
    sqlite3 \
    shellcheck \
    ruby \
    sudo \
    vim \
    ssh \
    tree \
    ca-certificates \
    nodejs \
    npm \
    htop \
    ncdu \
    jq \
    lnav \
    && gem install lolcat \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://raw.githubusercontent.com/filebrowser/get/master/get.sh | bash

FROM base-deps AS python-tools

RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

RUN pip3 install --no-cache-dir --upgrade "git+https://github.com/openai/whisper.git@v20231117"

RUN pip install --no-cache-dir --upgrade yt-dlp

FROM python-tools AS runtime

RUN useradd -m -s /usr/bin/fish bun

RUN mkdir -p /workspace /workspaces /home/bun/.config/fish /home/bun/.bun /home/bun/.local/share/fish \
    && chown -R bun:bun /workspace /workspaces /home/bun

USER bun
WORKDIR /home/bun

ENV BUN_INSTALL=/home/bun/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}
RUN curl -fsSL https://bun.sh/install | bash

RUN echo '# Environment setup' > ~/.config/fish/config.fish && \
    echo 'set -gx BUN_INSTALL "$HOME/.bun"' >> ~/.config/fish/config.fish && \
    echo 'fish_add_path $BUN_INSTALL/bin' >> ~/.config/fish/config.fish && \
    echo 'set -gx PATH $BUN_INSTALL/bin $PATH' >> ~/.config/fish/config.fish && \
    echo '' >> ~/.config/fish/config.fish && \
    echo 'if status is-interactive' >> ~/.config/fish/config.fish && \
    echo '  echo ""' >> ~/.config/fish/config.fish && \
    echo '  echo "-------------------------------------------------" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "Welcome to the Twitch VOD Downloader Dev Container!" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "-------------------------------------------------" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "Available aliases:" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "  - download: Run VOD downloader" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "  - tests: Run tests | test:coverage: Run with coverage" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "  - db: Open SQLite database | db-videos: List videos" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "  - disk: Check disk usage | browse: File browser info" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "-------------------------------------------------" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo "File browser available at http://localhost:8080" | lolcat' >> ~/.config/fish/config.fish && \
    echo '  echo ""' >> ~/.config/fish/config.fish && \
    echo 'end' >> ~/.config/fish/config.fish && \
    echo '' >> ~/.config/fish/config.fish && \
    echo '# Application aliases' >> ~/.config/fish/config.fish && \
    echo 'alias download="bun run src/main.ts"' >> ~/.config/fish/config.fish && \
    echo 'alias process-chapters="bun run src/chapters/chapter-processor.ts"' >> ~/.config/fish/config.fish && \
    echo '' >> ~/.config/fish/config.fish && \
    echo '# Testing aliases' >> ~/.config/fish/config.fish && \
    echo 'alias tests="bun test"' >> ~/.config/fish/config.fish && \
    echo 'alias test:coverage="bun test --coverage"' >> ~/.config/fish/config.fish && \
    echo 'alias test:watch="bun test --watch"' >> ~/.config/fish/config.fish && \
    echo '' >> ~/.config/fish/config.fish && \
    echo '# Database aliases' >> ~/.config/fish/config.fish && \
    echo 'alias db="sqlite3 /workspace/data/db/sqlite.db"' >> ~/.config/fish/config.fish && \
    echo 'alias db-videos="sqlite3 /workspace/data/db/sqlite.db \"SELECT * FROM videos ORDER BY created_at DESC;\""' >> ~/.config/fish/config.fish && \
    echo 'alias db-transcripts="sqlite3 /workspace/data/db/sqlite.db \"SELECT video_id, LENGTH(content) as content_length, created_at FROM transcripts;\""' >> ~/.config/fish/config.fish && \
    echo '' >> ~/.config/fish/config.fish && \
    echo '# Debugging and utility aliases' >> ~/.config/fish/config.fish && \
    echo 'alias disk="ncdu /workspace/data"' >> ~/.config/fish/config.fish && \
    echo 'alias browse="echo \"File browser available at http://localhost:8080\""' >> ~/.config/fish/config.fish

SHELL ["/usr/bin/fish", "-c"]

RUN bun --version && \
    python3 --version && \
    whisper --help

WORKDIR /workspace