import React, { useState, useContext } from 'react';
import { GlobalContext } from '../index';

export const CloudRenderButton = ({ 
  selectedVideos, 
  videos, 
  selectedTags, 
  outputFileName,
  compositionName,
  onRenderStart,
  renderStatus,
  settings
}) => {
  const globalData = useContext(GlobalContext);
  const [isRendering, setIsRendering] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [showFilenameOverlay, setShowFilenameOverlay] = useState(false);
  const [editedFileName, setEditedFileName] = useState(outputFileName);

  const getTimestampedFilename = (filename) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nameWithoutExt = filename.replace(/\.mp4$/, '');
    return `${nameWithoutExt}_${timestamp}.mp4`;
  };

  const videosWithoutMetadata = videos.map(video => {
    const { videoWithoutMetadata, metadata } = (() => {
      const { metadata, tags: videoTags, ...rest } = video;
      return { videoWithoutMetadata: rest, metadata };
    })();

    const other = ((metadata) => {
      const { extracted_yt_info, ...otherMetadata } = metadata;
      return otherMetadata;
    })(JSON.parse(metadata));

    videoWithoutMetadata.metadata = other;
    return videoWithoutMetadata;
  });

  const filteredVideosWithoutMetadata = videosWithoutMetadata.filter(video => 
    Array.from(selectedVideos).includes(video.id)
  );

  const handleCloudRender = async () => {
    const payload = {
      videos: videos.filter(video => selectedVideos.has(video.id)).map(video => video.filepath.split('/').pop()),
      props: {
        selectedVideos: Array.from(selectedVideos),
        videos: filteredVideosWithoutMetadata,
        selectedTags: Array.from(selectedTags),
        useStaticFile: true,
        composition_name: compositionName,
        settings: settings
      },
      output_file_name: editedFileName,
      composition_name: compositionName
    };

    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/cloud-render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Cloud render initiated successfully');
        setDownloadUrl(data.download_url);
        setIsRendering(false);
        onRenderStart(editedFileName);
      } else {
        console.error('Failed to initiate cloud render');
        setIsRendering(false);
      }
    } catch (error) {
      console.error('Error initiating cloud render:', error);
      setIsRendering(false);
    }
  };

  const getButtonText = () => {
    switch (renderStatus) {
      case 'rendering':
        return 'Rendering...';
      case 'completed':
        return 'Render Complete!';
      default:
        return 'Render in Cloud';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => {
          setShowFilenameOverlay(true);
        }} 
        className="cloud-render-button"
        disabled={isRendering}
        style={{
          opacity: renderStatus === 'rendering' ? 0.7 : 1,
          cursor: renderStatus === 'rendering' ? 'not-allowed' : 'pointer'
        }}
      >
        {getButtonText()}
      </button>

      {showFilenameOverlay && (
        <div style={{
          top: '100%',
          left: 0,
          backgroundColor: 'white',
          padding: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          marginTop: '5px',
          zIndex: 1000
        }}>
          <input
            type="text"
            value={editedFileName}
            onChange={(e) => setEditedFileName(e.target.value)}
            style={{ marginRight: '10px' }}
          />
          <button 
            onClick={() => {
              setIsRendering(true);
              handleCloudRender();
              setShowFilenameOverlay(false);
            }}
          >
            Confirm
          </button>
          <button 
            onClick={() => {
              setShowFilenameOverlay(false);
              setEditedFileName(outputFileName);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default CloudRenderButton;