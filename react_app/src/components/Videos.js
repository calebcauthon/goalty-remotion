import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import axios from 'axios';
import { GlobalContext } from '../index';
import './Videos.css';
import Modal from 'react-modal';

function Videos() {
  const globalData = useContext(GlobalContext);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [videos, setVideos] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    title: '',
    size: 0,
    filepath: '',
    metadata: {
      tags: []
    }
  });
  const [metadataError, setMetadataError] = useState('');
  const [metadataText, setMetadataText] = useState(JSON.stringify(manualEntry.metadata, null, 2));
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${globalData.APIbaseUrl}/api/videos`);
      
      const videos = response.data;
      videos.forEach(video => {
        video.metadata = JSON.parse(video.metadata);
      });

      setVideos(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Processing...');
    try {
      const response = await axios.get(`${globalData.APIbaseUrl}/api/download?url=${encodeURIComponent(url)}`);
      setMessage(`Video added successfully! ID: ${response.data.video_id}`);
      setUrl('');
      fetchVideos();
    } catch (error) {
      setMessage('Error adding video. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleVideoClick = (id) => {
    navigate(`/videos/${id}`);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await axios.delete(`${globalData.APIbaseUrl}/api/videos/${id}`);
        setMessage('Video deleted successfully');
        fetchVideos();
      } catch (error) {
        setMessage('Error deleting video');
        console.error('Error:', error);
      }
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    setMessage('Uploading...');
    try {
      const response = await axios.post(
        `${globalData.APIbaseUrl}/api/upload-file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setMessage(`Video uploaded successfully! ID: ${response.data.video_id}`);
      setSelectedFile(null);
      fetchVideos();
    } catch (error) {
      setMessage('Error uploading video. Please try again.');
      console.error('Error:', error);
    }
  };

  const validateAndParseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return false;
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    const parsedMetadata = validateAndParseJSON(metadataText);
    if (!parsedMetadata) {
      setMetadataError('Invalid JSON format');
      return;
    }
    
    try {
      const response = await axios.post(`${globalData.APIbaseUrl}/api/videos/manual`, {
        ...manualEntry,
        metadata: parsedMetadata
      });
      setMessage('Video added manually successfully!');
      setIsModalOpen(false);
      setMetadataError('');
      setManualEntry({
        title: '',
        size: 0,
        filepath: '',
        metadata: {
          tags: []
        }
      });
      setMetadataText(JSON.stringify({tags: []}, null, 2));
      fetchVideos();
    } catch (error) {
      setMessage('Error adding video manually');
      console.error('Error:', error);
    }
  };

  return (
    <Layout>
      <div className="videos-container">
        <h1>Add Video</h1>
        
        <form onSubmit={handleSubmit} className="video-form">
          <h3>From YouTube URL</h3>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter YouTube URL"
            className="video-input"
          />
          <button type="submit" className="video-submit">Submit</button>
        </form>

        <form onSubmit={handleFileUpload} className="video-form">
          <h3>Upload Local Video</h3>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            accept=".mp4,.mov,.avi,.mkv"
            className="video-input"
          />
          <button type="submit" className="video-submit">Upload</button>
        </form>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="video-submit"
          style={{marginTop: '20px'}}
        >
          Manually Add Video
        </button>

        <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          className="modal"
          overlayClassName="overlay"
        >
          <h2>Manually Add Video</h2>
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label>Title:</label>
              <input
                type="text"
                value={manualEntry.title}
                onChange={(e) => setManualEntry({...manualEntry, title: e.target.value})}
                className="video-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Size (bytes):</label>
              <input
                type="number"
                value={manualEntry.size}
                onChange={(e) => setManualEntry({...manualEntry, size: parseInt(e.target.value)})}
                className="video-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Filepath/URL:</label>
              <input
                type="text"
                value={manualEntry.filepath}
                onChange={(e) => setManualEntry({...manualEntry, filepath: e.target.value})}
                className="video-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label>
                Metadata (JSON):
                <span className={`validation-status ${metadataError ? 'invalid' : 'valid'}`}>
                  {metadataError ? '❌ Invalid JSON' : '✓ Valid JSON'}
                </span>
              </label>
              <textarea
                value={metadataText}
                onChange={(e) => {
                  setMetadataText(e.target.value);
                  const parsed = validateAndParseJSON(e.target.value);
                  if (parsed) {
                    setManualEntry({...manualEntry, metadata: parsed});
                    setMetadataError('');
                  } else {
                    setMetadataError('Invalid JSON format');
                  }
                }}
                className="video-input metadata-textarea"
                rows={10}
                spellCheck="false"
              />
            </div>
            
            <div className="button-group">
              <button type="submit" className="video-submit" disabled={!!metadataError}>Add Video</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="video-submit">Cancel</button>
            </div>
          </form>
        </Modal>

        {message && <p className="message">{message}</p>}

        <h2>Video List</h2>
        <table className="video-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Size</th>
              <th>Filepath</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} onClick={() => handleVideoClick(video.id)} className="clickable-row">
                <td>{video.id}</td>
                <td className="video-title">{video.title}</td>
                <td>{(video.size / 1024 / 1024).toFixed(2)} MB</td>
                <td>{video.filepath}</td>
                <td>{video.metadata?.tags?.length || 0}</td>
                <td>
                  <button 
                    onClick={(e) => handleDelete(video.id, e)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default Videos;
