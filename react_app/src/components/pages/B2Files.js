import React, { useState, useEffect, useContext } from 'react';
import { useB2Service } from 'services/b2Service';
import { Link } from 'react-router-dom';
import { GlobalContext } from '../../index';
import Layout from './Layout';
import './B2Files.css';

// Simple fuzzy search function
const fuzzySearch = (searchTerm, str) => {
  const term = searchTerm.toLowerCase();
  const string = str.toLowerCase();
  
  // If empty search term, return true (matches everything)
  if (!term || term === '') return true;
  
  let searchTermIndex = 0;
  
  // Look for the search term characters in order, but they don't have to be consecutive
  for (let i = 0; i < string.length; i++) {
    if (string[i] === term[searchTermIndex]) {
      searchTermIndex++;
    }
    
    // If we've matched all characters in the search term
    if (searchTermIndex === term.length) {
      return true;
    }
  }
  
  return false;
};

function B2Files() {
  const [files, setFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingVideo, setAddingVideo] = useState({});
  const [addedVideos, setAddedVideos] = useState({});
  const b2Service = useB2Service();
  const { APIbaseUrl } = useContext(GlobalContext);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const filesData = await b2Service.getB2Files();
        setAllFiles(filesData);
        setFiles(filesData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch B2 files: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // Filter files when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFiles(allFiles);
    } else {
      const filtered = allFiles.filter(file => 
        fuzzySearch(searchTerm, file.fileName)
      );
      setFiles(filtered);
    }
  }, [searchTerm, allFiles]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('URL copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const addAsVideo = async (file) => {
    setAddingVideo({...addingVideo, [file.fileId]: true});
    
    try {
      const response = await fetch(`${APIbaseUrl}/api/videos/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: file.fileName,
          size: file.size,
          filepath: file.downloadUrl,
          metadata: {
            source: 'b2',
            b2FileId: file.fileId,
            uploadTimestamp: file.uploadTimestamp,
            video_type: 'mp4',
            tags: []
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      setAddedVideos({
        ...addedVideos, 
        [file.fileId]: {
          videoId: result.video_id,
          title: file.fileName
        }
      });
    } catch (err) {
      alert(`Failed to add video: ${err.message}`);
      console.error('Error adding video:', err);
    } finally {
      setAddingVideo({...addingVideo, [file.fileId]: false});
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const content = (
    <>
      <h1 className="b2-files-title">B2 Storage Files</h1>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="error-message">
          {error}
        </div>
      ) : (
        <>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search files..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="files-info">
            <p>
              Showing <span className="files-count">{files.length}</span> 
              {allFiles.length !== files.length && 
                ` of ${allFiles.length}`
              } files
            </p>
          </div>
          
          <div className="table-container">
            <table className="files-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-files-message">
                      {allFiles.length === 0 
                        ? "No files found in B2 storage" 
                        : "No files match your search criteria"}
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.fileId}>
                      <td>{file.fileName}</td>
                      <td>{formatSize(file.size)}</td>
                      <td>{formatDate(file.uploadTimestamp)}</td>
                      <td className="action-buttons">
                        <a 
                          className="action-button download-button"
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                        <button 
                          className="action-button copy-button"
                          onClick={() => copyToClipboard(file.downloadUrl)}
                        >
                          Copy URL
                        </button>
                        {addedVideos[file.fileId] ? (
                          <div className="video-added-message">
                            <span>✓ Added as video</span>
                            <Link 
                              to={`/videos/${addedVideos[file.fileId].videoId}`}
                              className="action-button view-video-button"
                            >
                              View Video
                            </Link>
                          </div>
                        ) : (
                          <button 
                            className="action-button add-video-button"
                            onClick={() => addAsVideo(file)}
                            disabled={addingVideo[file.fileId]}
                          >
                            {addingVideo[file.fileId] ? 'Adding...' : 'Add as Video'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );

  return (
    <Layout>
      <div className="b2-files-container">
        {content}
      </div>
    </Layout>
  );
}

export default B2Files; 