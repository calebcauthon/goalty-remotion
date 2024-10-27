import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import { Player } from '@remotion/player';
import { AbsoluteFill, Video, Sequence } from 'remotion';
import './ViewFilm.css';

// Updated VideoPlayer component using Remotion Video
const VideoPlayer = ({ selectedVideos, videos }) => {
  return (
    <AbsoluteFill>
      {Array.from(selectedVideos).map((videoId, index) => {
        const video = videos.find(v => v.id === videoId);
        if (!video) return null;
        
        // Calculate grid position
        const columns = Math.min(selectedVideos.size, 2); // Max 2 videos per row
        const width = 100 / columns;
        const row = Math.floor(index / columns);
        const col = index % columns;
        
        return (
          <Sequence key={videoId} from={0}>
            <div
              style={{
                position: 'absolute',
                left: `${col * width}%`,
                top: `${row * 50}%`,
                width: `${width}%`,
                height: '50%',
                padding: '10px'
              }}
            >
              <p className="video-name">{video.name}</p>
              <Video
                src={`http://localhost:5000/downloads/${video.filepath.split('/').pop()}`}
                style={{
                  width: '100%',
                  height: '90%'
                }}
              />
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

function ViewFilm() {
  const [film, setFilm] = useState(null);
  const [videos, setVideos] = useState([]);
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedVideos, setSelectedVideos] = useState(new Set());

  useEffect(() => {
    fetchFilm();
    fetchVideos();
  }, [id]);

  // Add this effect to initialize selected videos when videos are loaded
  useEffect(() => {
    if (videos.length > 0) {
      setSelectedVideos(new Set(videos.map(video => video.id)));
    }
  }, [videos]);

  const fetchFilm = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}`);
      const data = await response.json();
      setFilm(data);
    } catch (error) {
      console.error('Error fetching film:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/videos/with-tags');
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleSaveTitle = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedName }),
      });
      
      if (response.ok) {
        setFilm({ ...film, name: editedName });
        setIsEditing(false);
      } else {
        console.error('Failed to update film name');
      }
    } catch (error) {
      console.error('Error updating film name:', error);
    }
  };

  const handleVideoToggle = (videoId) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  if (!film) {
    return <Layout>Loading...</Layout>;
  }

  return (
    <Layout>
      <div className="view-film">
        <div className="film-title">
          {isEditing ? (
            <div className="edit-title">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
              />
              <span 
                className="save-icon"
                onClick={handleSaveTitle}
                title="Save"
              >
                💾
              </span>
            </div>
          ) : (
            <h1>
              {film.name}
              <span 
                className="edit-icon"
                onClick={() => {
                  setIsEditing(true);
                  setEditedName(film.name);
                }}
                title="Edit"
              >
                ✏️
              </span>
            </h1>
          )}
        </div>
        
        <div className="video-player">
          {selectedVideos.size > 0 ? (
            <Player
              component={VideoPlayer}
              inputProps={{
                selectedVideos,
                videos
              }}
              durationInFrames={30 * 60} // 30 fps * 60 seconds
              compositionWidth={1280}
              compositionHeight={720}
              fps={30}
              controls
              loop
              style={{
                width: '100%',
                aspectRatio: '16/9'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: 360,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}>
              Please select a video
            </div>
          )}
        </div>

        <div className="video-table-container">
          <h2>Videos</h2>
          <table className="video-table">
            <thead>
              <tr>
                <th>Show</th>
                <th>Video Name</th>
                <th>Number of Tags</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedVideos.has(video.id)}
                      onChange={() => handleVideoToggle(video.id)}
                    />
                  </td>
                  <td>{video.name}</td>
                  <td>{video.tags.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tags-table-container">
          <h2>All Tags</h2>
          <table className="tags-table">
            <thead>
              <tr>
                <th>Video Name</th>
                <th>Tag Name</th>
                <th>Frame</th>
              </tr>
            </thead>
            <tbody>
              {videos
                .filter(video => selectedVideos.has(video.id))
                .flatMap((video) =>
                  video.tags.map((tag, index) => (
                    <tr key={`${video.id}-${index}`}>
                      <td>{video.name}</td>
                      <td>{tag.name}</td>
                      <td>{tag.frame}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default ViewFilm;
