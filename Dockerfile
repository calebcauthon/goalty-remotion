FROM node:20-bookworm

# Install Chrome dependencies
RUN apt-get update
RUN apt install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libcups2

# Copy everything from your project to the Docker image. Adjust if needed.
COPY react_app/package.json ./
COPY react_app/src ./src
COPY react_app/render.mjs ./render.mjs
# If you have a public folder:
#COPY public ./public

# Install the right package manager and dependencies - see below for Yarn/PNPM
RUN npm i

# Install Chrome
RUN npx remotion browser ensure

# Run your application