import React, { useState } from 'react';

function PlaySequenceProcessor({ selectedVideo, onTagsApproved }) {
  const [proposedTags, setProposedTags] = useState([]);

  const findClearSuccess = (tags) => {
    const sortedTags = [...tags].sort((a, b) => a.startFrame - b.startFrame);
    const sequences = [];
    
    sortedTags.forEach((startTag, startIndex) => {
      // Check for both home and away clearing sequences
      if (startTag.name.endsWith('_clearing')) {
        const team = startTag.name.split('_')[0]; // home or away
        
        for (let i = startIndex + 1; i < sortedTags.length; i++) {
          const currentTag = sortedTags[i];
          
          // If we find an attacking event by the same team, it's a successful clear
          if (currentTag.name === `${team}_attacking`) {
            sequences.push({
              name: 'clear_success',
              startFrame: startTag.frame,
              endFrame: currentTag.frame,
              team: team
            });
            break;
          }
          
          // If we find the other team's event first, break as this isn't a success
          if (currentTag.name.includes(team === 'home' ? 'away_' : 'home_')) {
            break;
          }
        }
      }
    });
    
    return sequences;
  };

  const findClearFail = (tags) => {
    const sortedTags = [...tags].sort((a, b) => a.startFrame - b.startFrame);
    const sequences = [];
    
    sortedTags.forEach((startTag, startIndex) => {
      if (startTag.name.endsWith('_clearing')) {
        const team = startTag.name.split('_')[0];
        const oppositeTeam = team === 'home' ? 'away' : 'home';
        
        for (let i = startIndex + 1; i < sortedTags.length; i++) {
          const currentTag = sortedTags[i];
          
          // If we find the opposite team clearing before an attacking event, it's a failed clear
          if (currentTag.name === `${oppositeTeam}_clearing`) {
            // Check that there's no attacking in between
            const hasAttacking = sortedTags
              .slice(startIndex + 1, i)
              .some(tag => tag.name.endsWith('_attacking'));
              
            if (!hasAttacking) {
              sequences.push({
                name: 'clear_fail',
                startFrame: startTag.frame,
                endFrame: currentTag.frame,
                team: team
              });
            }
            break;
          }
        }
      }
    });
    
    return sequences;
  };

  const findAttackSequences = (tags) => {
    const sortedTags = [...tags].sort((a, b) => a.startFrame - b.startFrame);
    const sequences = [];
    
    sortedTags.forEach((startTag, startIndex) => {
      if (startTag.name.endsWith('_attacking')) {
        const team = startTag.name.split('_')[0];
        const oppositeTeam = team === 'home' ? 'away' : 'home';
        
        for (let i = startIndex + 1; i < sortedTags.length; i++) {
          const currentTag = sortedTags[i];
          
          // If we find a score, it's a successful attack
          if (currentTag.name === `${team}_score`) {
            sequences.push({
              name: 'attack_success',
              startFrame: startTag.frame,
              endFrame: currentTag.frame,
              team: team
            });
            break;
          }
          
          // If we find the opposite team clearing, it's a failed attack
          if (currentTag.name === `${oppositeTeam}_clearing`) {
            sequences.push({
              name: 'attack_fail',
              startFrame: startTag.frame,
              endFrame: currentTag.frame,
              team: team
            });
            break;
          }
        }
      }
    });
    
    return sequences;
  };

  const processSequences = () => {
    if (!selectedVideo?.tags) return;

    const clearSuccesses = findClearSuccess(selectedVideo.tags);
    const clearFails = findClearFail(selectedVideo.tags);
    const attackSequences = findAttackSequences(selectedVideo.tags);

    const allSequences = [
      ...clearSuccesses,
      ...clearFails,
      ...attackSequences
    ];

    setProposedTags(allSequences);
  };

  const handleApproveProposedTags = async () => {
    if (!selectedVideo || proposedTags.length === 0) return;

    try {
      // Get existing metadata and add new tags
      const metadata = selectedVideo.metadata ? JSON.parse(selectedVideo.metadata) : {};
      const existingTags = metadata.tags || [];
      const updatedTags = [...existingTags, ...proposedTags];

      const response = await fetch(`http://localhost:5000/api/videos/${selectedVideo.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: JSON.stringify({ ...metadata, tags: updatedTags })
        }),
      });

      if (!response.ok) throw new Error('Failed to save tags');

      // Clear proposed tags
      setProposedTags([]);
      
      // Notify parent component
      onTagsApproved();
    } catch (error) {
      console.error('Error saving proposed tags:', error);
    }
  };

  return (
    <div>
      <button 
        className="process-button"
        onClick={processSequences}
      >
        Process Play Sequences
      </button>

      {proposedTags.length > 0 && (
        <div className="proposed-tags-container">
          <h2>Proposed Play Sequence Tags</h2>
          <textarea
            readOnly
            value={JSON.stringify(proposedTags, null, 2)}
            rows={10}
            className="proposed-tags-textarea"
          />
          <button 
            className="approve-button"
            onClick={handleApproveProposedTags}
          >
            Approve and Save Tags
          </button>
        </div>
      )}
    </div>
  );
}

export default PlaySequenceProcessor; 