import React, { useState } from 'react';
import Layout from './Layout';
import axios from 'axios';
import './Videos.css';

function Videos() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Processing...');
    try {
      const response = await axios.get(`http://localhost:5000/api/download?url=${encodeURIComponent(url)}`);
      setMessage(`Video added successfully! ID: ${response}`);
      setUrl('');
    } catch (error) {
      setMessage('Error adding video. Please try again.');
      console.error('Error:', error);
    }
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
      </div>
    </Layout>
  );
}

export default Videos;
