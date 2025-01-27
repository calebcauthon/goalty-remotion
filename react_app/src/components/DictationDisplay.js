import React, { useState, useEffect } from 'react';

export function DictationDisplay({ 
  isListening, 
  transcript, 
  analysis, 
  isProcessing, 
  currentFrame, 
  setNotes,
  updateMetadata,
  instructions
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [myNotes, setMyNotes] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [parsedAnalysis, setParsedAnalysis] = useState(null);

  useEffect(() => {
    console.log('inside DictationDisplay instructions', instructions);
  }, [instructions]);

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
          There are {Array.from(instructions).length} instructions to follow:
          {Array.from(instructions).length > 0 && (
            <div className="dictation-instructions">
              <h4>Instructions:</h4>
              <ul>
                {Array.from(instructions).map((instruction, index) => (
                  <li key={index}>{instruction.name} <br /><pre>{instruction.text}</pre></li>
                ))}
              </ul>
            </div>
          )}

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

const styles = `
.dictation-instructions {
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.dictation-instructions h4 {
  margin: 0 0 8px 0;
  color: #444;
}

.dictation-instructions ul {
  margin: 0;
  padding-left: 20px;
}

.dictation-instructions li {
  margin: 4px 0;
  color: #666;
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet); 