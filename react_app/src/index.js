import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from 'components/pages/App';

// Create a new context
export const GlobalContext = React.createContext();

// Define your global variables/state
const globalState = {
  // Read API base URL from environment variables with fallback
  APIbaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
  anotherVariable: 42,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GlobalContext.Provider value={globalState}>
      <App />
    </GlobalContext.Provider>
  </React.StrictMode>
);
