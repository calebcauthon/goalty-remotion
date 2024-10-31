import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import './ClipMaker.css';
import ScoringPossessionProcessor from './processing/ScoringPossessionProcessor';

function ClipMaker() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/videos/with-tags');
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const refreshVideoData = async () => {
    await fetchVideos();
    if (selectedVideo) {
      const updatedVideos = await (await fetch('http://localhost:5000/api/videos/with-tags')).json();
      const refreshedVideo = updatedVideos.find(v => v.id === selectedVideo.id);
      setSelectedVideo(refreshedVideo);
    }
  };

  const handleVideoSelect = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    setSelectedVideo(video);
  };

  const handleDeleteTag = async (tagToDelete) => {
    if (!selectedVideo) return;
    
    try {
      // Get existing metadata
      const metadata = selectedVideo.metadata ? JSON.parse(selectedVideo.metadata) : {};
      const existingTags = metadata.tags || [];
      
      // Find the index of the first matching tag
      const tagIndex = existingTags.findIndex(tag => 
        tag.name === tagToDelete.name && 
        tag.frame === tagToDelete.frame &&
        tag.startFrame === tagToDelete.startFrame &&
        tag.endFrame === tagToDelete.endFrame
      );

      if (tagIndex === -1) return; // Tag not found

      // Create new array with the tag removed
      const updatedTags = [
        ...existingTags.slice(0, tagIndex),
        ...existingTags.slice(tagIndex + 1)
      ];

      const response = await fetch(`http://localhost:5000/api/videos/${selectedVideo.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: JSON.stringify({ ...metadata, tags: updatedTags })
        }),
      });

      if (!response.ok) throw new Error('Failed to delete tag');

      // Refresh video data
      await refreshVideoData();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  return (
    <Layout>
      <div className="clipmaker-container">
        <h1>Clip Maker</h1>
        
        {/* Video Selection */}
        <div className="video-selection">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => handleVideoSelect(parseInt(e.target.value))}
            value={selectedVideo?.id || ''}
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.name} ({video.tags.length} tags)
              </option>
            ))}
          </select>
        </div>

        {/* Tags Table */}
        {selectedVideo && (
          <>
            <div className="tags-table-container">
              <h2>Tags for {selectedVideo.name}</h2>
              <ScoringPossessionProcessor 
                selectedVideo={selectedVideo}
                onTagsApproved={refreshVideoData}
                startTagName="home_possession"
                endTagName="home_score"
                excludeTagName="home_turnover"
                outputTagName="scoring_possession"
                buttonText="Process Scoring Possessions"
              />
              <table className="tags-table">
                <thead>
                  <tr>
                    <th>Tag Name</th>
                    <th>Frame Range</th>
                    <th>Time Range</th>
                    <th>Frame</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selectedVideo.tags]
                    .sort((a, b) => (a.frame || 0) - (b.frame || 0))
                    .map((tag, index) => (
                    <tr key={index}>
                      <td>{tag.name}</td>
                      <td>{tag.startFrame}-{tag.endFrame}</td>
                      <td>
                        {tag.startFrame ? `${(tag.startFrame / 30).toFixed(2)}s` : ''}-
                        {tag.endFrame ? `${(tag.endFrame / 30).toFixed(2)}s` : ''}
                      </td>
                      <td>{tag.frame}</td>
                      <td>{tag.frame ? `${(tag.frame / 30).toFixed(2)}s` : ''}</td>
                      <td>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteTag(tag)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ClipMaker;
