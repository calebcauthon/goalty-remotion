import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from './Layout';
import './ViewFilm.css';

function ViewFilm() {
  const [film, setFilm] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    fetchFilm();
  }, [id]);

  const fetchFilm = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/films/${id}`);
      const data = await response.json();
      setFilm(data);
    } catch (error) {
      console.error('Error fetching film:', error);
    }
  };

  if (!film) {
    return <Layout>Loading...</Layout>;
  }

  return (
    <Layout>
      <div className="view-film">
        <h1>{film.name}</h1>
        {/* Add more film editing UI components here */}
      </div>
    </Layout>
  );
}

export default ViewFilm;
