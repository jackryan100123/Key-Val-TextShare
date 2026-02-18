# ============================================
# Stage 1: Build the frontend (React + Vite)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/keyNotesFrontend

# Install dependencies (use package-lock if present for reproducible builds)
COPY keyNotesFrontend/package.json keyNotesFrontend/package-lock.json* ./
RUN npm ci

# Copy frontend source
COPY keyNotesFrontend/ ./

# Build with same-origin API (empty = use current host). Override at build time if needed.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ============================================
# Stage 2: Production image (backend + static frontend)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install backend dependencies only (no devDependencies)
COPY Backend/package.json Backend/package-lock.json* ./
RUN npm ci --omit=dev

# Copy backend source
COPY Backend/ ./

# Copy built frontend from stage 1 into Backend's "public" folder (server serves it)
COPY --from=frontend-builder /app/keyNotesFrontend/dist ./public

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]
