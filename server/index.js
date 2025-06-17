const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '../output');
const MAX_FILE_SIZE_MB = process.env.MAX_FILE_SIZE_MB || 500;

// Ensure upload and output directories exist
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

// Serve static files from output directory
app.use('/output', express.static(OUTPUT_DIR));

// Add CORS middleware
app.use(cors());

// Upload endpoint
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputFilename = `processed_${Date.now()}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  // Call Python processor
  exec(`python ../processor/main.py "${inputPath}" "${outputPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return res.status(500).json({ error: 'Processing failed' });
    }
    res.json({ outputPath: `/output/${outputFilename}` });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 