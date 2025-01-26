import React, { useState, useEffect } from 'react';

export function DictationDisplay({ 
  isListening, 
  transcript, 
  analysis, 
  isProcessing, 
  currentFrame, 
  setNotes,
  updateMetadata
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [myNotes, setMyNotes] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [parsedAnalysis, setParsedAnalysis] = useState(null);

  useEffect(() => {
    console.log(' DictationDisplay 🎤 Notes:', myNotes);
    setNotes(myNotes);
  }, [myNotes]);

  // Validate JSON when analysis updates
  useEffect(() => {
    if (analysis) {
      try {
        const parsed = JSON.parse(analysis);
        setParsedAnalysis(parsed);
        setJsonError(null);
      } catch (error) {
        console.error('Invalid JSON in analysis:', error);
        setJsonError(`Invalid JSON: ${error.message}`);
        setParsedAnalysis(null);
      }
    }
  }, [analysis]);

  const handleSaveTags = () => {
    if (!parsedAnalysis) return;

    updateMetadata(prevMetadata => {
      const newMetadata = { ...prevMetadata };
      if (!newMetadata.tags) {
        newMetadata.tags = [];
      }

      // Add each analysis item as a tag
      parsedAnalysis.forEach(item => {
        newMetadata.tags.push({
          ...item,
          timestamp: new Date().toISOString()
        });
      });

      return newMetadata;
    });
  };

  return (
    <div className="dictation-container">
      <div className="dictation-header" onClick={() => setExpanded(!expanded)}>
        <h3>Dictation {expanded ? '▼' : '▶'} {isListening && '🎤'}</h3>
      </div>
      {expanded && (
        <div className="dictation-content">
          {isListening && <div style={{ color: '#ff4444' }}>🎤 Recording...</div>}
          
          <textarea
            value={myNotes}
            onChange={(e) => setMyNotes(e.target.value)}
            placeholder="Enter notes here and press 'k' after dictation to analyze..."
            className="notes-input"
            rows={4}
          />

          {transcript && (
            <div className="transcript-box">
              <strong>Dictation:</strong>
              <div>{transcript}</div>
            </div>
          )}

          {isProcessing && <div>Processing...</div>}

          {jsonError && (
            <div className="error-box">
              {jsonError}
            </div>
          )}

          {parsedAnalysis && (
            <div className="analysis-box">
              <div className="analysis-header">
                <strong>Analysis:</strong>
                <button 
                  onClick={handleSaveTags}
                  className="save-tags-button"
                  disabled={!parsedAnalysis}
                >
                  Approve and save tags
                </button>
              </div>
              <pre>{JSON.stringify(parsedAnalysis, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 