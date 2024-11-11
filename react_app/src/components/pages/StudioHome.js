import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import './StudioHome.css';
import { GlobalContext } from '../../index';

function StudioHome() {
  const globalData = useContext(GlobalContext);
  const [films, setFilms] = useState([]);
  const [filmToDelete, setFilmToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFilms();
  }, []);

  const fetchFilms = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films`);
      const data = await response.json();
      setFilms(data);
    } catch (error) {
      console.error('Error fetching films:', error);
    }
  };

  const createNewFilm = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films`, {
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

  const handleDeleteClick = (e, film) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    setFilmToDelete(film);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${globalData.APIbaseUrl}/api/films/${filmToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setFilms(films.filter(film => film.id !== filmToDelete.id));
        setFilmToDelete(null);
      } else {
        console.error('Failed to delete film');
      }
    } catch (error) {
      console.error('Error deleting film:', error);
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
              <button 
                className="delete-film-btn"
                onClick={(e) => handleDeleteClick(e, film)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        {filmToDelete && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete "{filmToDelete.name}"?</p>
              <div className="modal-buttons">
                <button onClick={confirmDelete}>Yes, Delete</button>
                <button onClick={() => setFilmToDelete(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default StudioHome;
