import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Videos from './components/Videos';
import VideoDetail from './components/VideoDetail';
import StudioHome from './components/StudioHome';
import ViewFilm from './components/ViewFilm';
import ClipMaker from './components/pages/ClipMaker';
import HotkeyConfig from './components/HotkeyConfig';
import ViewHotkeyGroup from './components/ViewHotkeyGroup';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/videos/:id" element={<VideoDetail />} />
        <Route path="/studio" element={<StudioHome />} />
        <Route path="/studio/films/:id" element={<ViewFilm />} />
        <Route path="/clipmaker" element={<ClipMaker />} />
        <Route path="/hotkeys" element={<HotkeyConfig />} />
        <Route path="/hotkeys/:id" element={<ViewHotkeyGroup />} />
      </Routes>
    </Router>
  );
}

export default App;
