import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import './ClipMaker.css';

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

  const handleVideoSelect = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    setSelectedVideo(video);
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
          <div className="tags-table-container">
            <h2>Tags for {selectedVideo.name}</h2>
            <table className="tags-table">
              <thead>
                <tr>
                  <th>Tag Name</th>
                  <th>Frame Range</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedVideo.tags.map((tag, index) => (
                  <tr key={index}>
                    <td>{tag.name}</td>
                    <td>{tag.startFrame}-{tag.endFrame}</td>
                    <td>
                      <button onClick={() => console.log('Create clip from tag:', tag)}>
                        Create Clip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ClipMaker;
