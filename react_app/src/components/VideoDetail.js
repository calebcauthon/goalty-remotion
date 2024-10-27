import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import axios from 'axios';
import './VideoDetail.css';

function VideoDetail() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/videos/${id}`);
        setVideo(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video details:', error);
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [id]);

  if (loading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (!video) {
    return <Layout><div>Video not found</div></Layout>;
  }

  return (
    <Layout>
      <div className="video-detail-container">
        <h1>{video.title}</h1>
        <div className="video-info">
          <p><strong>ID:</strong> {video.id}</p>
          <p><strong>Size:</strong> {(video.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Filepath:</strong> {video.filepath}</p>
        </div>
        {/* Add more details and functionality here */}
      </div>
    </Layout>
  );
}

export default VideoDetail;
