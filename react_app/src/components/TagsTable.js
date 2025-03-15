import React from 'react';
import './TagsTable.css';

export const TagsTable = ({
  videos,
  selectedVideos,
  tagFilter,
  setTagFilter,
  onAddClip,
  onAddAllVisibleTags,
  onAddAllClips,
  includedClips
}) => {
  return (
    <div className="tags-table-container">
      <h2>All Tags</h2>
      <div className="tags-filter-controls">
        <input
          type="text"
          placeholder="Filter tags..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        />
        <button 
          onClick={onAddAllVisibleTags}
          className="add-clip-button"
        >
          Add Filtered Tags
        </button>
        <button 
          onClick={onAddAllClips}
          className="add-clip-button"
        >
          Add All Tags
        </button>
      </div>
      <table className="tags-table">
        <thead>
          <tr>
            <th>Actions</th>
            <th>Video Name</th>
            <th>Tag Name</th>
            <th>Frame</th>
            <th>Frame Range</th>
          </tr>
        </thead>
        <tbody>
          {videos
            .filter(video => selectedVideos.has(video.id))
            .flatMap((video) =>
              video.tags
                .filter(tag => tag.startFrame && tag.endFrame)
                .filter(tag => 
                  tagFilter.toLowerCase().split(',').every(term => 
                    tag.name.toLowerCase().includes(term.trim()) ||
                    video.name.toLowerCase().includes(term.trim())
                  )
                )
                .map((tag, index) => {
                  const tagKey = `${video.id}-${tag.name}-${tag.frame}-${tag.startFrame}-${tag.endFrame}`;
                  
                  return (
                    <tr key={`${video.id}-${index}`}>
                      <td>
                        <button
                          onClick={() => onAddClip(
                            video.id,
                            tag.name,
                            tag.frame,
                            video.name,
                            video.filepath,
                            tag.startFrame,
                            tag.endFrame
                          )}
                          className="add-clip-button"
                        >
                          Add
                        </button>
                      </td>
                      <td>{video.name}</td>
                      <td>{tag.name}</td>
                      <td>{tag.frame}</td>
                      <td>{`${tag.startFrame}-${tag.endFrame}`}</td>
                    </tr>
                  );
                })
            )}
        </tbody>
      </table>
    </div>
  );
}; 