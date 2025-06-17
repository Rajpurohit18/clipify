const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const archiver = require('archiver');
const ytdl = require('ytdl-core');
const os = require('os');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the project-root/output and project-root/uploads directories
app.use(express.static(path.join(__dirname, '..', 'output')));
app.use(express.static(path.join(__dirname, '..', 'uploads')));

// Configure multer for file uploads - save to project-root/uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // Save initial uploads to the new uploads directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Helper function to get video duration
async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = "C:\\ffmpeg\\ffmpeg.exe";
    const ffprobePath = "C:\\ffmpeg\\ffprobe.exe";

    const ffprobe = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath
    ]);

    let duration = '';
    ffprobe.stdout.on('data', (data) => {
      duration += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(duration));
      } else {
        reject(new Error('Failed to get video duration'));
      }
    });
  });
}

// Process video endpoint
app.post('/process', upload.single('video'), async (req, res) => {
  try {
    // Extract parameters from req.body (from FormData)
    const { clipDuration: rawClipDuration, isAudioOnly, trimStart, trimEnd, videoUrl, outputFolderName } = req.body;

    // Ensure clipDuration is a number and has a default
    const clipDuration = typeof rawClipDuration !== 'undefined' && rawClipDuration !== ''
        ? parseInt(rawClipDuration) : 60; // Default to 60 if not provided or empty

    const audioExtractionMode = req.body.audioExtractionMode || 'clips'; // 'clips' or 'full'

    let inputPath;
    let finalOutputDir;

    // Define the base output directory at the project root
    const baseProjectOutputDir = path.join(__dirname, '..', 'output');
    fs.mkdirSync(baseProjectOutputDir, { recursive: true });

    let dirName;
    if (outputFolderName) {
      dirName = outputFolderName.replace(/[^a-zA-Z0-9-_. ]/g, '_'); // Sanitize folder name
      finalOutputDir = path.join(baseProjectOutputDir, dirName);
    } else {
      // Find the next process-X folder number
      const existingDirs = fs.readdirSync(baseProjectOutputDir, { withFileTypes: true })
                              .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('process-'))
                              .map(dirent => dirent.name);

      let nextProcessNumber = 1;
      if (existingDirs.length > 0) {
        const numbers = existingDirs.map(name => parseInt(name.split('-')[1])).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          nextProcessNumber = Math.max(...numbers) + 1;
        }
      }
      dirName = `process-${nextProcessNumber}`;
      finalOutputDir = path.join(baseProjectOutputDir, dirName);
    }
    fs.mkdirSync(finalOutputDir, { recursive: true });

    if (req.file) {
      // For file uploads, the file is in a temporary multer folder.
      // Move it to the finalOutputDir and use that path as input.
      const tempInputPath = req.file.path;
      const originalFileName = req.file.originalname;
      inputPath = path.join(finalOutputDir, originalFileName);
      fs.renameSync(tempInputPath, inputPath); // Move the file

    } else if (videoUrl) {
      // For YouTube URL, download directly to the finalOutputDir with a simple name
      inputPath = path.join(finalOutputDir, `downloaded_video.mp4`);
      
      const videoInfo = await ytdl.getInfo(videoUrl);
      const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highest' });
      
      await new Promise((resolve, reject) => {
        ytdl(videoUrl, { format: videoFormat })
          .pipe(fs.createWriteStream(inputPath))
          .on('finish', resolve)
          .on('error', reject);
      });
    } else {
      return res.status(400).json({ error: 'No video file or URL provided' });
    }

    // Get video duration
    const duration = await getVideoDuration(inputPath);
    const start = trimStart ? parseFloat(trimStart) : 0;
    const end = trimEnd ? parseFloat(trimEnd) : duration;

    // Log current input and output directories
    console.log(`Processing video. Input: ${inputPath}, Final Output Directory: ${finalOutputDir}`);

    // Process video
    const ffmpegPath = "C:\\ffmpeg\\ffmpeg.exe";

    const pythonArgs = [
      'processor/main.py',
      inputPath,
      finalOutputDir,
      String(clipDuration), // Ensure it's a string for the command line
    ];

    if (isAudioOnly === 'true') {
      pythonArgs.push('--audio-only');
      if (audioExtractionMode === 'full') {
        pythonArgs.push('--full-audio'); // New argument for full audio extraction
      }
    }
    if (start > 0) { 
      pythonArgs.push(`--start=${start}`);
    }
    if (end < duration) { 
      pythonArgs.push(`--end=${end}`);
    }
    if (ffmpegPath) { 
      pythonArgs.push(`--ffmpeg_path=${ffmpegPath}`);
    }

    console.log('Python Arguments:', pythonArgs); // NEW LOG

    const pythonProcess = spawn('python', pythonArgs);

    let errorOutput = '';

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python Stderr: ${data.toString()}`); // Log stderr in real-time
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}. Error: ${errorOutput}`);
        return res.status(500).json({ error: `Processing failed: ${errorOutput}` });
      }

      // --- CRUCIAL STEP: Rename output clips to simple names after a short delay ---
      setTimeout(() => {
        const clips = [];
        if (isAudioOnly === 'true' && audioExtractionMode === 'full') {
          const fullAudioPath = path.join(finalOutputDir, 'full_audio.mp3');
          if (fs.existsSync(fullAudioPath)) {
            const relativePath = path.basename(finalOutputDir) + '/' + 'full_audio.mp3';
            clips.push({ name: 'full_audio.mp3', path: relativePath });
            console.log(`Found full audio file: ${fullAudioPath}`);
          } else {
            console.warn(`Full audio file not found at: ${fullAudioPath}.`);
          }
        } else {
          const generatedFiles = fs.readdirSync(finalOutputDir)
            .filter(file => file.endsWith('.mp4') || file.endsWith('.mp3'));

          for (let i = 0; i < generatedFiles.length; i++) {
            const oldPath = path.join(finalOutputDir, generatedFiles[i]);
            let newFileName = `clip_${i + 1}.${isAudioOnly === 'true' ? 'mp3' : 'mp4'}`;
            const newPath = path.join(finalOutputDir, newFileName);

            try {
              if (fs.existsSync(oldPath)) {
                  fs.renameSync(oldPath, newPath);
              } else {
                  console.warn(`Source file not found for rename: ${oldPath}. Skipping.`);
                  const relativePath = path.basename(finalOutputDir) + '/' + generatedFiles[i];
                  clips.push({ name: generatedFiles[i], path: relativePath });
                  continue;
              }

              const relativePath = path.basename(path.dirname(newPath)) + '/' + path.basename(newPath);
              clips.push({
                name: newFileName,
                path: relativePath
              });
              console.log(`Renamed: ${oldPath} to ${newPath}`);
            } catch (renameError) {
              console.error(`Error renaming file ${oldPath} to ${newPath}:`, renameError);
              const relativePath = path.basename(path.dirname(oldPath)) + '/' + path.basename(oldPath);
              clips.push({
                name: generatedFiles[i],
                path: relativePath
              });
            }
          }
        }

        console.log('Final Generated Clips (server side, after renaming):', clips); // Log final clips
        res.json({ clips });
      }, 1000); // Add a 1-second delay to allow file handles to be released
    });
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Merge clips endpoint
app.post('/merge', async (req, res) => {
  try {
    const { clipPaths } = req.body;
    
    const baseProjectOutputDir = path.join(__dirname, '..', 'output');
    fs.mkdirSync(baseProjectOutputDir, { recursive: true });

    // Find the next process-X folder number for merged clips
    const existingDirs = fs.readdirSync(baseProjectOutputDir, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('process-'))
                            .map(dirent => dirent.name);
    let nextProcessNumber = 1;
    if (existingDirs.length > 0) {
      const numbers = existingDirs.map(name => parseInt(name.split('-')[1])).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        nextProcessNumber = Math.max(...numbers) + 1;
      }
    }
    const mergeOutputDirName = `process-${nextProcessNumber}`;
    const mergeOutputDir = path.join(baseProjectOutputDir, mergeOutputDirName);
    fs.mkdirSync(mergeOutputDir, { recursive: true });

    // Create a file list for FFmpeg
    const fileList = path.join(mergeOutputDir, 'filelist.txt');
    const clipContents = clipPaths
      .map(clipPath => `file '${path.join(__dirname, '..', clipPath)}'`)
      .join('\n');
    fs.writeFileSync(fileList, clipContents);

    // Merge clips using FFmpeg
    const ffmpegPath = "C:\\ffmpeg\\ffmpeg.exe";
    const outputPath = path.join(mergeOutputDir, 'merged.mp4');
    const ffmpeg = spawn(ffmpegPath, [
      '-f', 'concat',
      '-safe', '0',
      '-i', fileList,
      '-c', 'copy',
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Failed to merge clips' });
      }

      res.json({
        mergedClip: {
          name: 'merged.mp4',
          path: path.join(mergeOutputDirName, 'merged.mp4').replace(/\\/g, '/')
        }
      });
    });
  } catch (error) {
    console.error('Error merging clips:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete clip endpoint
app.delete('/clips/:clipPath', (req, res) => {
  try {
    const clipPath = decodeURIComponent(req.params.clipPath);
    // Construct full path relative to the project root
    const fullPath = path.join(__dirname, '..', clipPath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      // After deleting the clip, check if its parent directory is empty and delete it if so
      const parentDir = path.dirname(fullPath);
      if (fs.readdirSync(parentDir).length === 0) {
        fs.rmdirSync(parentDir); // Delete empty directory
      }
      res.json({ message: 'Clip deleted successfully' });
    } else {
      res.status(404).json({ error: 'Clip not found' });
    }
  } catch (error) {
    console.error('Error deleting clip:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename clip endpoint
app.put('/clips/:clipPath', (req, res) => {
  try {
    const clipPath = decodeURIComponent(req.params.clipPath);
    const { newName } = req.body;
    const fullPath = path.join(__dirname, clipPath);
    const newPath = path.join(path.dirname(fullPath), newName);
    
    if (fs.existsSync(fullPath)) {
      fs.renameSync(fullPath, newPath);
      res.json({
        clip: {
          name: newName,
          path: path.join(path.basename(path.dirname(clipPath)), newName).replace(/\\/g, '/')
        }
      });
    } else {
      res.status(404).json({ error: 'Clip not found' });
    }
  } catch (error) {
    console.error('Error renaming clip:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download all clips endpoint
app.get('/download-all', (req, res) => {
  try {
    const timestamp = Date.now();
    const baseProjectOutputDir = path.join(__dirname, '..', 'output');
    fs.mkdirSync(baseProjectOutputDir, { recursive: true });

    const zipPath = path.join(baseProjectOutputDir, `clips_${timestamp}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Set headers for streamed download
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="clips_${timestamp}.zip"`,
      'Transfer-Encoding': 'chunked'
    });

    // Pipe archive data to the response directly
    archive.pipe(res);

    output.on('close', () => {
      console.log('Archiver finished and output stream closed.');
      // The response is already being handled by archive.pipe(res)
      // No need for res.download here, as we are streaming.
      fs.unlink(zipPath, (err) => {
        if (err) console.error('Error deleting temporary zip file:', err);
      });
    });

    archive.on('progress', (progress) => {
      const percent = progress.entries.processed / progress.entries.total;
      res.write(JSON.stringify({ progress: percent }) + '\n'); // Send progress updates
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      // Ensure response is ended if an error occurs
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error zipping files' });
      }
    });

    // Helper function to recursively get all files
    const walkSync = (dir, filelist = []) => {
      fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          filelist = walkSync(filePath, filelist);
        } else {
          if (file.endsWith('.mp4') || file.endsWith('.mp3')) {
            filelist.push(filePath);
          }
        }
      });
      return filelist;
    };

    // Find the latest process-X folder
    const existingProcessDirs = fs.readdirSync(baseProjectOutputDir, { withFileTypes: true })
                                .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('process-'))
                                .map(dirent => dirent.name);

    let latestProcessDir = null;
    if (existingProcessDirs.length > 0) {
      existingProcessDirs.sort((a, b) => {
        const numA = parseInt(a.split('-')[1]);
        const numB = parseInt(b.split('-')[1]);
        return numB - numA; // Sort descending to get the largest number first
      });
      latestProcessDir = existingProcessDirs[0];
    }

    let allClips = [];
    if (latestProcessDir) {
      const latestDirPath = path.join(baseProjectOutputDir, latestProcessDir);
      allClips = walkSync(latestDirPath); // Only get files from the latest process directory
    }

    console.log('Files found for archiving:', allClips);

    if (allClips.length === 0) {
      console.log('No clips found to archive.');
      archive.finalize();
      return;
    }

    allClips.forEach(filePath => {
      const relativePathInZip = path.relative(baseProjectOutputDir, filePath);
      console.log(`Adding ${filePath} to archive as ${relativePathInZip}`);
      archive.file(filePath, { name: relativePathInZip });
    });

    archive.finalize();
  } catch (error) {
    console.error('Error creating zip file (top level catch):', error);
    res.status(500).json({ error: error.message });
  }
});

// Share clip endpoint (example implementation)
app.post('/share', (req, res) => {
  try {
    const { clipPath } = req.body;
    // Here you would implement your sharing logic
    // For example, upload to a cloud storage service and get a shareable URL
    const shareUrl = `https://example.com/share/${path.basename(clipPath)}`;
    res.json({ shareUrl });
  } catch (error) {
    console.error('Error sharing clip:', error);
    res.status(500).json({ error: error.message });
  }
});

// Thumbnail generation endpoint
app.get('/thumbnail/:clipPath(*)', (req, res) => {
  try {
    const clipPath = decodeURIComponent(req.params.clipPath);
    const fullPath = path.join(__dirname, '..', clipPath);
    const thumbnailPath = path.join(os.tmpdir(), `thumbnail_${Date.now()}.jpg`);
    const ffmpegPath = "C:\\ffmpeg\\ffmpeg.exe"; // Ensure this path is correct

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Clip not found for thumbnail generation' });
    }

    const ffmpeg = spawn(ffmpegPath, [
      '-i', fullPath,
      '-ss', '00:00:01', // Capture at 1 second mark
      '-vframes', '1',
      '-vf', 'scale=-1:150', // Scale to 150px height, maintain aspect ratio
      thumbnailPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error(`FFmpeg thumbnail generation failed with code ${code}`);
        return res.status(500).json({ error: 'Failed to generate thumbnail' });
      }

      // Send the thumbnail and then delete it
      res.sendFile(thumbnailPath, (err) => {
        if (err) {
          console.error('Error sending thumbnail:', err);
        }
        fs.unlink(thumbnailPath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting thumbnail:', unlinkErr);
        });
      });
    });

    ffmpeg.on('error', (err) => {
      console.error('FFmpeg spawn error:', err);
      res.status(500).json({ error: 'Failed to spawn FFmpeg for thumbnail generation' });
    });

  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 