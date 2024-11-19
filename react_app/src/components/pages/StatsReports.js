import React, { useState, useEffect, useContext } from 'react';
import Layout from 'components/pages/Layout';
import { GlobalContext } from '../../index';
import TagCount from 'components/stats/TagCount';
import './StatsReports.css';

function StatsReports() {
  const globalData = useContext(GlobalContext);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/videos/with-tags`);
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
      <div className="stats-container">
        <h1>Stats & Reports</h1>
        
        <div className="video-selection">
          <h2>Select a Video</h2>
          <select 
            onChange={(e) => handleVideoSelect(parseInt(e.target.value))}
            value={selectedVideo?.id || ''}
          >
            <option value="">Choose a video...</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.name}
              </option>
            ))}
          </select>
        </div>

        {selectedVideo && (
          <div className="stats-panel">
            <h2>Statistics for {selectedVideo.name}</h2>
            <TagCount video={selectedVideo} />
          </div>
        )}
      </div>
    </Layout>
  );
}

export default StatsReports; 