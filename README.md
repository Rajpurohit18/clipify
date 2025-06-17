# Clipify

Clipify is a full-stack web application that allows users to upload long-form videos (YouTube, Twitch, etc.) and automatically generates short, shareable reels using advanced AI techniques like speaker detection, speech transcription, and keyword-based clipping.

---

## 🎯 Features

- Upload long-form videos and generate short reels automatically
- Speaker detection and speech transcription (OpenAI Whisper)
- Keyword-based excitement and intensity detection
- Automatic video clipping and subtitle overlay
- Watermark and trending audio support (optional)
- Clean, modern UI (React + Tailwind CSS)
- Backend API (Node.js + Express)
- Video processing (Python + FFmpeg)
- Local file storage with automatic cleanup

---

## 🛠️ Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express
- **Processor:** Python, FFmpeg, OpenAI Whisper
- **File Storage:** Local (static folders)
- **Containerization:** Docker, docker-compose

---

## 📦 Directory Structure

```
clipify/
  client/         # React frontend
  server/         # Node.js backend API
  processor/      # Python video processing logic
  uploads/        # Temporary video uploads
  output/         # Processed reels
  Dockerfile      # Dockerfile for backend/processor
  docker-compose.yml
  README.md
```

---

## ⚙️ Setup & Run Instructions

### 1. Clone the repository
```bash
git clone <repo-url> && cd clipify
```

### 2. Environment Variables
- Copy `.env.example` to `.env` in `server/` and fill in required values.

### 3. Install Dependencies
- **Frontend:**
  ```bash
  cd client && npm install
  ```
- **Backend:**
  ```bash
  cd ../server && npm install
  ```
- **Processor:**
  ```bash
  cd ../processor && pip install -r requirements.txt
  ```

### 4. Run Locally
- **Frontend:**
  ```bash
  cd client && npm start
  ```
- **Backend:**
  ```bash
  cd server && npm start
  ```
- **Processor:**
  (Runs automatically when called by backend)

### 5. Docker (Optional)
```bash
docker-compose up --build
```

---

## 🚀 Usage
1. Open the frontend in your browser.
2. Upload a video file (max 500MB, .mp4).
3. Wait for processing (AI will transcribe, analyze, and clip).
4. Download or preview your short reel with subtitles and watermark.

---

## 🧹 Automatic Cleanup
- Uploaded and processed files older than 24 hours are deleted automatically by the backend.

---

## 🔥 Bonus Features
- Trending audio snippets API (mock/real)
- Watermark overlay ("@clipify")

---

## 📝 License
MIT 