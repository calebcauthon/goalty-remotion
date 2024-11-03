import React from 'react';

function CloudRenderButton({ selectedVideos, videos, selectedTags, outputFileName }) {
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
    const payload = {
      videos: videos.filter(video => selectedVideos.has(video.id)).map(video => video.filepath.split('/').pop()),
      props: {
        selectedVideos: Array.from(selectedVideos),
        videos: filteredVideosWithoutMetadata,
        selectedTags: Array.from(selectedTags),
        useStaticFile: true
      },
      output_file_name: outputFileName,
    };

    try {
      const response = await fetch('http://localhost:5000/api/cloud-render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('Cloud render initiated successfully');
      } else {
        console.error('Failed to initiate cloud render');
      }
    } catch (error) {
      console.error('Error initiating cloud render:', error);
    }
  };

  return (
    <button onClick={handleCloudRender} className="cloud-render-button">
      Cloud Render
    </button>
  );
}

export default CloudRenderButton; 