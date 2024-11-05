import React, { useState, useContext } from 'react';
import { GlobalContext } from '../index';

export const CloudRenderButton = ({ 
  selectedVideos, 
  videos, 
  selectedTags, 
  outputFileName,
  onRenderStart,
  renderStatus 
}) => {
  const globalData = useContext(GlobalContext);
  const [isRendering, setIsRendering] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

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
      const { tags: metadataTags, extracted_yt_info, ...otherMetadata } = metadata;
      return otherMetadata;
    })(JSON.parse(metadata));

    videoWithoutMetadata.metadata = other;
    return videoWithoutMetadata;
  });

  const filteredVideosWithoutMetadata = videosWithoutMetadata.filter(video => 
    Array.from(selectedVideos).includes(video.id)
  );

  const handleCloudRender = async () => {
    const timestampedFilename = getTimestampedFilename(outputFileName);
    
    const payload = {
      videos: videos.filter(video => selectedVideos.has(video.id)).map(video => video.filepath.split('/').pop()),
      props: {
        selectedVideos: Array.from(selectedVideos),
        videos: filteredVideosWithoutMetadata,
        selectedTags: Array.from(selectedTags),
        useStaticFile: true
      },
      output_file_name: timestampedFilename,
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
        onRenderStart(timestampedFilename);
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
    <div>
      <button 
        onClick={() => {
          setIsRendering(true);
          handleCloudRender();
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
    </div>
  );
};

export default CloudRenderButton;