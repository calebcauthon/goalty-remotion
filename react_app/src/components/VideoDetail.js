import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import axios from 'axios';
import { Player } from '@remotion/player';
import VideoPlayer from './VideoPlayer';
import { JSONTree } from 'react-json-tree';
import './VideoDetail.css';
import { useHotkeys, hotkeyDescriptions } from './Hotkeys';

function VideoDetail() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [metadata, setMetadata] = useState('');
  const [saveButtonText, setSaveButtonText] = useState('Save Metadata');
  const playerRef = useRef(null);
  const [parsedMetadata, setParsedMetadata] = useState({});
  const [jsonError, setJsonError] = useState(null);
  const [hotkeyMode, setHotkeyMode] = useState(false);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/videos/${id}`);
        setVideo(response.data);
        setMetadata(JSON.stringify(response.data.metadata, null, 2));
        setParsedMetadata(response.data.metadata);
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
    try {
      setParsedMetadata(JSON.parse(e.target.value));
      setJsonError(null);
    } catch (error) {
      console.error('Invalid JSON:', error);
      setJsonError('Invalid JSON: ' + error.message);
    }
  };

  const handleSaveMetadata = async () => {
    if (jsonError) {
      alert('Cannot save invalid JSON. Please fix the errors and try again.');
      return;
    }

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

  const toggleHotkeyMode = () => {
    setHotkeyMode(!hotkeyMode);
  };

  const handleMetadataUpdate = useCallback((updatedMetadata) => {
    setMetadata(JSON.stringify(updatedMetadata, null, 2));
    setParsedMetadata(updatedMetadata);
  }, []);

  const { registerHotkey } = useHotkeys(
    hotkeyMode,
    { parsedMetadata, playerRef, onMetadataUpdate: handleMetadataUpdate },
    currentFrame
  );

  // Custom theme for JSONTree
  const theme = {
    scheme: 'monokai',
    author: 'wimer hazenberg (http://www.monokai.nl)',
    base00: '#272822',
    base01: '#383830',
    base02: '#49483e',
    base03: '#75715e',
    base04: '#a59f85',
    base05: '#f8f8f2',
    base06: '#f5f4f1',
    base07: '#f9f8f5',
    base08: '#f92672',
    base09: '#fd971f',
    base0A: '#f4bf75',
    base0B: '#a6e22e',
    base0C: '#a1efe4',
    base0D: '#66d9ef',
    base0E: '#ae81ff',
    base0F: '#cc6633'
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
          <div className={`hotkey-indicator ${hotkeyMode ? 'active' : ''}`}>
            Hotkey Mode: {hotkeyMode ? 'ON' : 'OFF'}
          </div>
          <button onClick={toggleHotkeyMode}>
            {hotkeyMode ? 'Disable Hotkey Mode' : 'Enable Hotkey Mode'}
          </button>
        </div>
        <div className="hotkey-instructions">
          <h3>Hotkeys:</h3>
          <ul>
            {Object.entries(hotkeyDescriptions).map(([key, description]) => (
              <li key={key}>'{key}': {description}</li>
            ))}
          </ul>
        </div>
        <div className="metadata-container">
          <h2>Metadata</h2>
          {jsonError && <div className="json-error">{jsonError}</div>}
          <div style={{ background: '#272822', padding: '10px', borderRadius: '5px' }}>
            <JSONTree
              data={parsedMetadata}
              theme={theme}
              invertTheme={false}
              shouldExpandNode={() => true}
            />
          </div>
          <textarea
            value={metadata}
            onChange={handleMetadataChange}
            rows={10}
            cols={50}
          />
          <button onClick={handleSaveMetadata} disabled={!!jsonError}>{saveButtonText}</button>
        </div>
      </div>
    </Layout>
  );
}

export default VideoDetail;
