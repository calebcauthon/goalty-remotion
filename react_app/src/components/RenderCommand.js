import React from 'react';

export const RenderCommand = ({ tags, outputFileName, ...otherProps }) => {
  const propsJson = JSON.stringify({ tags, ...otherProps });
  const command = `npx remotion render Root out/${outputFileName || 'video.mp4'} --props='${propsJson}'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
  };

  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ 
        fontFamily: 'Courier New', 
        backgroundColor: '#f5f5f5', 
        padding: '15px',
        borderRadius: '4px',
        marginBottom: '10px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        {command}
      </div>
      <button 
        onClick={copyToClipboard}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Copy to Clipboard
      </button>
    </div>
  );
};
