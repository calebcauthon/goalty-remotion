import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from 'components/pages/Layout';
import axios from 'axios';
import { GlobalContext } from '../../index';
import './Videos.css';
import Modal from 'react-modal';
import { FaTrash } from 'react-icons/fa';

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
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
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

  const handleYoutubeExtract = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(
        `${globalData.APIbaseUrl}/api/extract-youtube?url=${encodeURIComponent(youtubeUrl)}`
      );
      
      setManualEntry({
        title: response.data.title,
        size: response.data.size,
        filepath: youtubeUrl,
        metadata: response.data.metadata
      });
      setMetadataText(JSON.stringify(response.data.metadata, null, 2));
      
      setIsYoutubeModalOpen(false);
      setYoutubeUrl('');
      
    } catch (error) {
      setMessage('Error extracting YouTube info. Please try again.');
      console.error('Error:', error);
    }
  };

  const backblazify = (title) => {
    const sanitized = title
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace non-alphanumeric with underscore
      .replace(/__+/g, '_'); // Replace multiple underscores with single

    return `f005.backblazeb2.com/file/remotion-videos/${sanitized}.mp4`;
  };

  return (
    <Layout>
      <div className="videos-container">
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
            <button 
              type="button"
              onClick={() => setIsYoutubeModalOpen(true)}
              className="video-submit"
              style={{marginBottom: '20px', width: '100%'}}
            >
              Extract from YouTube URL
            </button>
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
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={manualEntry.filepath}
                  onChange={(e) => setManualEntry({...manualEntry, filepath: e.target.value})}
                  className="video-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setManualEntry({
                    ...manualEntry,
                    filepath: backblazify(manualEntry.title)
                  })}
                  className="video-submit"
                  style={{ flexShrink: 0 }}
                >
                  Backblazify
                </button>
              </div>
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

        <Modal
          isOpen={isYoutubeModalOpen}
          onRequestClose={() => setIsYoutubeModalOpen(false)}
          className="modal"
          overlayClassName="overlay"
        >
          <h2>Extract YouTube Info</h2>
          <form onSubmit={handleYoutubeExtract}>
            <div className="form-group">
              <label>YouTube URL:</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Enter YouTube URL"
                className="video-input"
                required
              />
            </div>
            <div className="button-group">
              <button type="submit" className="video-submit">Extract Info</button>
              <button 
                type="button" 
                onClick={() => setIsYoutubeModalOpen(false)} 
                className="video-submit"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {message && <p className="message">{message}</p>}

        <h2>Video List</h2>
        <table className="video-table">
          <tbody>
            {videos.map((video) => (
              <React.Fragment key={video.id}>
                <tr className="main-row" onClick={() => handleVideoClick(video.id)}>
                  <td className="video-title">{video.title}</td>
                  <td className="actions-cell">
                    <button 
                      onClick={(e) => handleDelete(video.id, e)}
                      className="delete-button"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
                <tr className="metadata-row" onClick={() => handleVideoClick(video.id)}>
                  <td colSpan="2">
                    {video.filepath} • {(video.size / 1024 / 1024).toFixed(2)} MB • {video.metadata?.tags?.length || 0} tags
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default Videos;
