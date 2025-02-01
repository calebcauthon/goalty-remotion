export const filmService = {
  async fetchFilm(APIbaseUrl, id) {
    const response = await fetch(`${APIbaseUrl}/api/films/${id}`);
    const data = await response.json();
    if (data.data && typeof data.data === 'string') {
      data.data = JSON.parse(data.data);
    }
    return data;
  },

  async updateFilmName(APIbaseUrl, id, name) {
    const response = await fetch(`${APIbaseUrl}/api/films/${id}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return response.ok;
  },

  async updateFilmData(APIbaseUrl, id, data) {
    const response = await fetch(`${APIbaseUrl}/api/films/${id}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.ok;
  },

  async fetchVideos(APIbaseUrl) {
    const response = await fetch(`${APIbaseUrl}/api/videos/with-tags`);
    return response.json();
  },

  async checkRenderStatus(APIbaseUrl, filename) {
    const response = await fetch(`${APIbaseUrl}/api/check-render/${filename}`);
    return response.json();
  },

  async refreshB2Files(APIbaseUrl, filenames) {
    const response = await fetch(`${APIbaseUrl}/api/check-b2-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    });
    return response.json();
  }
}; 