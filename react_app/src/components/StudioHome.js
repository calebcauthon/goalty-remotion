import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import './StudioHome.css';

function StudioHome() {
  const [films, setFilms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFilms();
  }, []);

  const fetchFilms = async () => {
    try {
      const response = await fetch('/api/films');
      const data = await response.json();
      setFilms(data);
    } catch (error) {
      console.error('Error fetching films:', error);
    }
  };

  const createNewFilm = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/films', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Untitled Film' }),
      });
      const film = await response.json();
      navigate(`/studio/films/${film.id}`);
    } catch (error) {
      console.error('Error creating film:', error);
    }
  };

  return (
    <Layout>
      <div className="studio-home">
        <h1>Studio</h1>
        <button className="create-film-btn" onClick={createNewFilm}>
          Create New Film
        </button>
        <div className="films-list">
          {films.map((film) => (
            <div key={film.id} className="film-card" onClick={() => navigate(`/studio/films/${film.id}`)}>
              <h3>{film.name}</h3>
              <p>Created: {new Date(film.created_date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default StudioHome;
