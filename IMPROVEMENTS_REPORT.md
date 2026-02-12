# Clipify Improvement Report

This document captures high-impact improvements identified during a repository-wide review.

## 1) Correctness & Runtime Bugs

1. **`ClipCard` action handlers can crash at runtime**  
   `ClipCard` calls `onRename` and `onDelete`, but `App` only passes `onShare`. Clicking edit/delete will call `undefined` as a function.  
   **Improve:** pass handler props from `App` (or make `ClipCard` buttons conditional when handlers are absent).

2. **Thumbnail fetch effect can loop and refetch excessively**  
   The `useEffect` depends on `thumbnailUrl` while also setting `thumbnailUrl`, which can trigger repeated fetches/object URL churn.  
   **Improve:** remove `thumbnailUrl` from dependencies; track/revoke previous URL with a ref.

3. **`/download-all` mixes ZIP bytes and JSON progress in one stream**  
   The endpoint writes JSON lines to the same response used for ZIP bytes, which corrupts binary downloads and forces fragile parsing on the client.  
   **Improve:** return pure ZIP stream; provide progress via SSE/WebSocket or a separate status endpoint.

4. **Rename endpoint path resolution is inconsistent**  
   Delete uses `path.join(__dirname, '..', clipPath)` but rename uses `path.join(__dirname, clipPath)`, which points to different roots and may break rename.  
   **Improve:** normalize all file path joins against one validated base directory.

## 2) Security Improvements

1. **Path traversal risk in file operations**  
   Endpoints accept `clipPath` from clients and join it directly with server paths. Attackers may attempt `../` traversal.  
   **Improve:** resolve absolute path, verify it stays under allowed root (`output`), reject otherwise.

2. **Unsanitized upload filename policy**  
   Multer stores files using `file.originalname`, causing possible collisions and unsafe names.  
   **Improve:** generate unique filenames (UUID + extension) and keep original name as metadata only.

3. **Overly permissive CORS defaults**  
   `app.use(cors())` permits all origins by default.  
   **Improve:** restrict to configured frontend origins and methods.

## 3) Portability & Environment Reliability

1. **Hardcoded Windows FFmpeg paths**  
   Server and processor both hardcode `C:\ffmpeg\...`, which breaks Linux/macOS and most container environments.  
   **Improve:** read `FFMPEG_PATH`/`FFPROBE_PATH` env vars, default to `ffmpeg`/`ffprobe` on PATH.

2. **Docker setup is inconsistent with runtime config**  
   Compose maps `5000:5000`, but server listens on `3001`; compose also builds `./server` and `./processor` contexts where Dockerfiles are missing.  
   **Improve:** align ports and add service Dockerfiles (or use a single root Dockerfile consistently).

3. **Dependency split is inconsistent**  
   `server/index.js` imports `archiver` and `ytdl-core`, but `server/package.json` does not declare them, so isolated server installs fail.  
   **Improve:** move all server runtime deps into `server/package.json` (or remove nested package model).

## 4) Maintainability & DX

1. **Large monolithic server file**  
   `server/index.js` contains upload, processing, merge, share, thumbnail, and zip logic in one file.  
   **Improve:** split into routes/controllers/services and centralize validation/error handling.

2. **Missing automated quality gates**  
   No lint/typecheck/test flow is enforced for server/processor, and frontend tests are not wired to CI.  
   **Improve:** add ESLint + Prettier for JS, ruff/black for Python, and basic API/unit tests in CI.

3. **README has stale/formatting issues**  
   README ends with malformed `MIT ---`, and setup guidance emphasizes Windows-only FFmpeg despite Docker/Linux workflow references.  
   **Improve:** normalize setup docs per environment and add troubleshooting matrix.

## Suggested execution order

1. **Stabilize runtime bugs first** (`ClipCard` handlers, thumbnail effect, download-all streaming).
2. **Apply path/file safety guardrails** (path normalization, filename strategy, input validation).
3. **Fix environment parity** (FFmpeg env vars, compose/docker alignment, dependency declarations).
4. **Refactor for maintainability** (modular backend, tests, linting, CI).
