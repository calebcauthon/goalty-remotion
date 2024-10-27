import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from 'axios';
import './Videos.css';

function Videos() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/videos');
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Processing...');
    try {
      const response = await axios.get(`http://localhost:5000/api/download?url=${encodeURIComponent(url)}`);
      setMessage(`Video added successfully! ID: ${response.data.video_id}`);
      setUrl('');
      fetchVideos(); // Refresh the video list after adding a new video
    } catch (error) {
      setMessage('Error adding video. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleVideoClick = (id) => {
    navigate(`/videos/${id}`);
  };

  return (
    <Layout>
      <div className="videos-container">
        <h1>Add YouTube Video</h1>
        <form onSubmit={handleSubmit} className="video-form">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter YouTube URL"
            className="video-input"
          />
          <button type="submit" className="video-submit">Submit</button>
        </form>
        {message && <p className="message">{message}</p>}

        <h2>Video List</h2>
        <table className="video-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Size</th>
              <th>Filepath</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} onClick={() => handleVideoClick(video.id)} className="clickable-row">
                <td>{video.id}</td>
                <td>{video.title}</td>
                <td>{(video.size / 1024 / 1024).toFixed(2)} MB</td>
                <td>{video.filepath}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default Videos;
