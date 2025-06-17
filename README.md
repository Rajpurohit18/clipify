# Clipify

Clipify is a full-stack web application that allows users to upload video files and extract audio or create video clips based on a specified duration. It provides a simple interface for generating both full audio extractions and segmented audio/video clips.

---

## 🎯 Features

- Upload video files (.mp4, .avi, .mov, etc.) or audio files (.mp3, .wav, .ogg, etc.).
- **Audio Extraction Modes:** Choose between extracting the full audio from a video or generating multiple clipped audio segments.
- **Video Clipping:** Generate multiple video clips from an uploaded video based on a specified duration.
- Real-time upload progress indicator during file processing.
- Real-time download progress indicator when zipping and downloading all generated clips.
- Clean, modern UI built with React and Tailwind CSS.
- Robust backend API using Node.js and Express.
- Efficient video and audio processing powered by Python and FFmpeg.
- Local file storage with automatic cleanup of old processed files.

---

## 🛠️ Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express
- **Processor:** Python, FFmpeg, yt-dlp
- **File Storage:** Local (static folders)

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

### 0. FFmpeg Installation (Windows)
For the video processing to work, FFmpeg must be installed and accessible via your system's PATH. Follow these steps to install it on Windows:

1.  **Download FFmpeg:**
    *   Go to the official FFmpeg builds page: [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
    *   Download the latest `ffmpeg-release-essentials.zip` (or similar latest build).

2.  **Extract and Place FFmpeg:**
    *   Extract the downloaded `.zip` file.
    *   Create a new folder named `ffmpeg` directly under your `C:` drive (e.g., `C:\ffmpeg`).
    *   Copy the contents of the `bin` folder (from the extracted FFmpeg zip, it should contain `ffmpeg.exe`, `ffprobe.exe`, `ffplay.exe`) into `C:\ffmpeg`.

3.  **Add FFmpeg to System PATH:**
    *   Search for "Environment Variables" in the Windows Start menu and select "Edit the system environment variables."
    *   In the System Properties window, click the "Environment Variables..." button.
    *   Under the "System variables" section, find and select the `Path` variable, then click "Edit...".
    *   Click "New" and add `C:\ffmpeg` to the list.
    *   Click "OK" on all open windows to save the changes.

4.  **Verify Installation:**
    *   Open a **new** Command Prompt or PowerShell window (it must be a new one for changes to take effect).
    *   Type `ffmpeg -version` and press Enter.
    *   You should see FFmpeg version information. If you see `'ffmpeg' is not recognized...`, double-check the previous steps.

### 1. Clone the repository
```bash
git clone <repo-url> && cd clipify
```

### 2. Install Dependencies
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

### 3. Run Locally
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

### 4. Docker (Optional)
```bash
docker-compose up --build
```

---

## 🚀 Usage
1.  Open the frontend in your browser (`http://localhost:3000`).
2.  Drag and drop your video file into the designated area.
3.  Choose your processing options:
    *   **Clip Duration:** Specify the length of individual video/audio clips (in seconds). This option is disabled when "Full Video Audio" is selected.
    *   **Audio Only:** Check this to extract audio instead of video.
        *   **Clipped Audio:** Generates multiple audio clips based on the `Clip Duration`.
        *   **Full Video Audio:** Extracts the entire audio from the video as a single MP3 file.
4.  Click "Process" to start the upload and processing. Monitor the progress bar.
5.  Once processing is complete, your generated clips will appear below. You can download individual clips or click "Download All" to get a zip archive of all clips from the latest process.

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