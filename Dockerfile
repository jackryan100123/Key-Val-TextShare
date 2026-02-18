FROM node:20-alpine AS frontend-builder
WORKDIR /app/keyNotesFrontend

COPY keyNotesFrontend/package.json ./
RUN npm install

COPY keyNotesFrontend/ ./
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app

COPY Backend/package.json ./
RUN npm install --omit=dev

COPY Backend/ ./

COPY --from=frontend-builder /app/keyNotesFrontend/dist ./public

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
