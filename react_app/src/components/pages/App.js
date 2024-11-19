import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from 'components/pages/Home';
import Videos from 'components/pages/Videos';
import VideoDetail from 'components/pages/VideoDetail';
import StudioHome from 'components/pages/StudioHome';
import ViewFilm from 'components/pages/ViewFilm';
import ClipMaker from 'components/pages/ClipMaker';
import HotkeyConfig from 'components/pages/HotkeyConfig';
import ViewHotkeyGroup from 'components/pages/ViewHotkeyGroup';
import StatsReports from 'components/pages/StatsReports';
import 'components/pages/App.css';

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
        <Route path="/stats" element={<StatsReports />} />
      </Routes>
    </Router>
  );
}

export default App;
