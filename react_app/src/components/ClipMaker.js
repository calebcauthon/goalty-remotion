import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import './ClipMaker.css';

function ClipMaker() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [proposedTags, setProposedTags] = useState([]);

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

  const handleVideoSelect = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    setSelectedVideo(video);
  };

  const processClips = () => {
    console.log('Processing clips for', selectedVideo.name);
    if (!selectedVideo?.tags) return;

    console.log('Selected video tags:', selectedVideo.tags);
    // Sort tags by frame
    const sortedTags = [...selectedVideo.tags].sort((a, b) => a.startFrame - b.startFrame);
    const newTags = [];
    console.log('Sorted tags:', sortedTags);
    
    let currentPossession = null;

    sortedTags.forEach((tag) => {
      if (tag.name === 'home_possession') {
        currentPossession = tag;
      } else if (tag.name === 'home_turnover') {
        currentPossession = null;
      } else if (tag.name === 'home_score' && currentPossession) {
        // Create a new scoring possession tag
        newTags.push({
          name: 'scoring_possession',
          startFrame: currentPossession.frame,
          endFrame: tag.frame
        });
        currentPossession = null;
      }
    });

    setProposedTags(newTags);
    if (newTags.length > 0) {
      console.log('Proposed tags:', newTags);
    } else {
      console.log('No new tags proposed');
    }
  };

  const handleApproveProposedTags = async () => {
    if (!selectedVideo || proposedTags.length === 0) return;

    try {
      // Get existing metadata and add new tags
      const metadata = selectedVideo.metadata ? JSON.parse(selectedVideo.metadata) : {};
      const existingTags = metadata.tags || [];
      const updatedTags = [...existingTags, ...proposedTags];

      const response = await fetch(`http://localhost:5000/api/videos/${selectedVideo.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: JSON.stringify({ ...metadata, tags: updatedTags })
        }),
      });

      if (!response.ok) throw new Error('Failed to save tags');

      // Refresh video data
      await fetchVideos();
      
      // Update the selected video with fresh data
      const updatedVideos = await (await fetch('http://localhost:5000/api/videos/with-tags')).json();
      const refreshedVideo = updatedVideos.find(v => v.id === selectedVideo.id);
      setSelectedVideo(refreshedVideo);
      
      // Clear proposed tags
      setProposedTags([]);
    } catch (error) {
      console.error('Error saving proposed tags:', error);
    }
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
      await fetchVideos();
      
      // Update the selected video with fresh data
      const updatedVideos = await (await fetch('http://localhost:5000/api/videos/with-tags')).json();
      const refreshedVideo = updatedVideos.find(v => v.id === selectedVideo.id);
      setSelectedVideo(refreshedVideo);
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
              <button 
                className="process-button"
                onClick={processClips}
              >
                Process Scoring Possessions
              </button>
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
                  {selectedVideo.tags.map((tag, index) => (
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

            {proposedTags.length > 0 && (
              <div className="proposed-tags-container">
                <h2>Proposed Scoring Possession Tags</h2>
                <textarea
                  readOnly
                  value={JSON.stringify(proposedTags, null, 2)}
                  rows={10}
                  className="proposed-tags-textarea"
                />
                <button 
                  className="approve-button"
                  onClick={handleApproveProposedTags}
                >
                  Approve and Save Tags
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default ClipMaker;
