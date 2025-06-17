import React, { useState, useEffect } from 'react';
import { FaShare, FaTrash, FaEdit, FaSpinner } from 'react-icons/fa';

function ClipCard({ clip, onRename, onDelete, onShare }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newClipName, setNewClipName] = useState(clip.name);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(true);

  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        setLoadingThumbnail(true);
        const response = await fetch(`http://localhost:3001/thumbnail/${encodeURIComponent(clip.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          setThumbnailUrl(URL.createObjectURL(blob));
        } else {
          console.error('Failed to fetch thumbnail');
        }
      } catch (error) {
        console.error('Error fetching thumbnail:', error);
      } finally {
        setLoadingThumbnail(false);
      }
    };

    fetchThumbnail();

    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [clip.path, thumbnailUrl]);

  const handleNameChange = () => {
    if (newClipName.trim() !== '' && newClipName !== clip.name) {
      onRename(clip.path, newClipName);
    }
    setIsEditingName(false);
  };

  return (
    <div className="border rounded-lg p-4">
      {loadingThumbnail ? (
        <div className="w-full h-32 flex items-center justify-center bg-gray-200 rounded-lg mb-2">
          <FaSpinner className="animate-spin text-gray-500 text-3xl" />
        </div>
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Clip Thumbnail"
          className="w-full rounded-lg mb-2 cursor-pointer"
          onClick={() => {
            // Optionally, play video on thumbnail click
            const videoElement = document.getElementById(`video-${clip.path}`);
            if (videoElement) videoElement.play();
          }}
        />
      ) : (
        <video
          id={`video-${clip.path}`}
          src={`http://localhost:3001/${clip.path}`}
          controls
          className="w-full rounded-lg mb-2"
        />
      )}
      <div className="flex justify-between items-center">
        {isEditingName ? (
          <input
            type="text"
            value={newClipName}
            onChange={(e) => setNewClipName(e.target.value)}
            onBlur={handleNameChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNameChange();
              }
            }}
            className="form-input flex-1 mr-2"
            autoFocus
          />
        ) : (
          <span className="flex-1 mr-2" onClick={() => setIsEditingName(true)}>{clip.name}</span>
        )}
        <div className="flex space-x-2">
          <button
            onClick={() => onShare(clip.path)}
            className="text-blue-600 hover:text-blue-800"
          >
            <FaShare />
          </button>
          <button
            onClick={() => setIsEditingName(true)}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => onDelete(clip.path)}
            className="text-red-600 hover:text-red-800"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClipCard; 