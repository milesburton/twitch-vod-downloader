FROM nvidia/cuda:12.1.0-base-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV BUN_INSTALL=/home/bun/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}

# Install dependencies
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
    && gem install lolcat \
    && pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 \
    && pip3 install --no-cache-dir --upgrade "git+https://github.com/openai/whisper.git@v20231117" \
    && pip install --no-cache-dir --upgrade yt-dlp \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash


# Create user and set up directories
RUN useradd -m -s /usr/bin/fish bun \
    && mkdir -p /workspace \
    && chown -R bun:bun /workspace


# Add support for other users that may be set in devcontainer.json
RUN mkdir -p /workspaces && chown -R bun:bun /workspaces


# Set up fish for the bun user
USER bun
WORKDIR /home/bun

# Ensure Fish config directory exists
RUN mkdir -p /home/bun/.config/fish

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
    echo '  echo "  - download: Runs the VOD downloader script." | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "  - process-chapters: Processes chapters for a specific VOD." | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "  - test: Run all tests." | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "-------------------------------------------------" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo ""' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "To run the downloader, type: download" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "To process chapters, type: process-chapters <video_id>" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo "To run tests, type: test" | lolcat' >> /home/bun/.config/fish/config.fish && \
    echo '  echo ""' >> /home/bun/.config/fish/config.fish && \
    echo 'end' >> /home/bun/.config/fish/config.fish && \
    echo '' >> /home/bun/.config/fish/config.fish && \
    echo 'alias download="bun run src/main.ts"' >> /home/bun/.config/fish/config.fish && \
    echo 'alias process-chapters="bun run src/chapters/chapter-processor.ts"' >> /home/bun/.config/fish/config.fish && \
    echo 'alias test="bun test"' >> /home/bun/.config/fish/config.fish

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