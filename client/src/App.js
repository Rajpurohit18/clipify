import React, { useState } from 'react';

function App() {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      const data = await response.json();
      setVideoUrl(data.outputPath);
    } catch (error) {
      setError('Error uploading or processing video.');
      console.error('Error uploading video:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Clipify</h1>
      <input type="file" accept="video/mp4" onChange={handleFileUpload} />
      {loading && <p>Processing video, please wait...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {videoUrl && (
        <video controls width="100%" src={videoUrl} />
      )}
    </div>
  );
}

export default App; 