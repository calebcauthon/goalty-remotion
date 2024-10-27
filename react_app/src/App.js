import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Videos from './components/Videos';
import VideoDetail from './components/VideoDetail';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/videos/:id" element={<VideoDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
