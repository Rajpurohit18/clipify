import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import ClipCard from './components/ClipCard';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [clips, setClips] = useState([]);
  const [clipDuration, setClipDuration] = useState(60);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [audioExtractionMode, setAudioExtractionMode] = useState('clips');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const processVideo = useCallback(async (formData) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setClips([]);

      const response = await axios.post('http://localhost:3001/process', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      setClips(response.data.clips);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while processing the video');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (isBatchProcessing) {
      // Handle batch processing
    } else {
      const file = acceptedFiles[0];
      if (file) {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('clipDuration', clipDuration);
        formData.append('isAudioOnly', isAudioOnly);
        formData.append('audioExtractionMode', audioExtractionMode);
        processVideo(formData);
      }
    }
  }, [isBatchProcessing, clipDuration, isAudioOnly, processVideo, audioExtractionMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a']
    }
  });

  const handleDownloadAll = useCallback(async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const response = await fetch('http://localhost:3001/download-all');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      let chunks = [];

      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunkString = new TextDecoder().decode(value);
          const lines = chunkString.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.progress !== undefined) {
                setDownloadProgress(Math.round(data.progress * 100));
              }
            } catch (jsonError) {
              chunks.push(value);
            }
          }
        }
      };

      await readStream();

      const finalBlob = new Blob(chunks, { type: 'application/zip' });
      const url = window.URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clips_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadProgress(100);

    } catch (error) {
      console.error('Error downloading all clips:', error);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, []);

  const handleShare = async (clipPath) => {
    try {
      const response = await axios.post('http://localhost:3001/share', {
        clipPath
      });
      window.open(response.data.shareUrl, '_blank');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while sharing the clip');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold text-center mb-8">Clipify</h1>
                
                {/* Processing Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isAudioOnly}
                        onChange={(e) => setIsAudioOnly(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Audio Only</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isBatchProcessing}
                        onChange={(e) => setIsBatchProcessing(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Batch Process</span>
                    </label>
                  </div>

                  {/* Audio Extraction Mode Options - visible only if Audio Only is checked */}
                  {isAudioOnly && (
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="clips"
                          checked={audioExtractionMode === 'clips'}
                          onChange={() => setAudioExtractionMode('clips')}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Clipped Audio</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="full"
                          checked={audioExtractionMode === 'full'}
                          onChange={() => setAudioExtractionMode('full')}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Full Video Audio</span>
                      </label>
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      value={clipDuration}
                      onChange={(e) => setClipDuration(Number(e.target.value))}
                      className="form-input w-24"
                      placeholder="Duration (s)"
                      disabled={isAudioOnly && audioExtractionMode === 'full'}
                    />
                  </div>
                </div>

                {/* Drag and Drop */}
                <div
                  {...getRootProps()}
                  className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
                >
                  <input {...getInputProps()} />
                  <p>Drag and drop files here, or click to select files</p>
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-center mt-2">{progress}%</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Clips Grid */}
                {clips.length > 0 && (
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Generated Clips</h2>
                      <button
                        onClick={handleDownloadAll}
                        disabled={isDownloading || isProcessing}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isDownloading ? `Downloading (${downloadProgress}%)` : 'Download All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {clips.map((clip, index) => (
                        <ClipCard
                          key={index}
                          clip={clip}
                          onShare={handleShare}
                          isSelected={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 