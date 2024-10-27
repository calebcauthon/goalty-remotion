import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import axios from 'axios';
import { Player } from '@remotion/player';
import VideoPlayer from './VideoPlayer';
import './VideoDetail.css';

function VideoDetail() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [metadata, setMetadata] = useState('');
  const [saveButtonText, setSaveButtonText] = useState('Save Metadata');
  const playerRef = useRef(null);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/videos/${id}`);
        setVideo(response.data);
        setMetadata(JSON.stringify(response.data.metadata, null, 2));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video details:', error);
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [id]);

  const handleFrameUpdate = useCallback((frame) => {
    setCurrentFrame(frame);
  }, []);

  const handleMetadataChange = (e) => {
    setMetadata(e.target.value);
  };

  const handleSaveMetadata = async () => {
    setSaveButtonText('Saving...');
    try {
      await axios.post(`http://localhost:5000/api/videos/${id}/metadata`, { metadata });
      setSaveButtonText('Saved ✅');
      setTimeout(() => {
        setSaveButtonText('Save Metadata');
      }, 2000);
    } catch (error) {
      console.error('Error saving metadata:', error);
      setSaveButtonText('Error Saving');
      setTimeout(() => {
        setSaveButtonText('Save Metadata');
      }, 2000);
    }
  };

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
        <div className="video-player">
          <Player
            ref={playerRef}
            component={VideoPlayer}
            inputProps={{
              src: `http://localhost:5000/downloads/${video.filepath.split('/').pop()}`,
              onFrameUpdate: handleFrameUpdate
            }}
            durationInFrames={30 * 60}
            compositionWidth={640}
            compositionHeight={360}
            fps={30}
            controls
            renderLoading={() => <div>Loading...</div>}
          />
        </div>
        <div className="video-info">
          <p><strong>ID:</strong> {video.id}</p>
          <p><strong>Size:</strong> {(video.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Filepath:</strong> {video.filepath}</p>
          <p><strong>Current Frame:</strong> {currentFrame}</p>
        </div>
        <div className="metadata-container">
          <h2>Metadata</h2>
          <textarea
            value={metadata}
            onChange={handleMetadataChange}
            rows={10}
            cols={50}
          />
          <button onClick={handleSaveMetadata}>{saveButtonText}</button>
        </div>
      </div>
    </Layout>
  );
}

export default VideoDetail;
