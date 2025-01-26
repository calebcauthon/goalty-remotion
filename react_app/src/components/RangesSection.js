import React from 'react';

export function RangesSection({ 
  rangesExpanded, 
  setRangesExpanded, 
  ranges, 
  playerRef, 
  breakRange,
  enforceRangeById 
}) {
  return (
    <div className="ranges-container">
      <div className="ranges-header" onClick={() => setRangesExpanded(!rangesExpanded)}>
        <h3>Ranges {rangesExpanded ? '▼' : '▶'}</h3>
      </div>
      {rangesExpanded && (
        <div className="ranges-content">
          {ranges.length > 0 ? (
            <table className="ranges-table">
              <thead>
                <tr>
                  <th>Start Frame</th>
                  <th>End Frame</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ranges.map((range) => (
                  <tr key={range.id} className={range.active ? 'active-range' : ''}>
                    <td>{range.min}</td>
                    <td>{range.max}</td>
                    <td>{range.max - range.min} frames</td>
                    <td>{range.active ? '🟢' : '⚪'}</td>
                    <td>
                      {range.active ? (
                        <button
                          onClick={breakRange}
                          className="delete-range-button"
                          title="Clear range"
                        >
                          🔓
                        </button>
                      ) : (
                        <button
                          onClick={() => enforceRangeById(range)}
                          className="enforce-range-button"
                          title="Enforce this range"
                        >
                          🔒
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No ranges marked yet. Use 'm' to mark frames.</p>
          )}
        </div>
      )}
    </div>
  );
} 