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

  async checkRenderStatus(APIbaseUrl, filename, film, onStatusUpdate) {
    const response = await fetch(`${APIbaseUrl}/api/check-render/${filename}`);
    const data = await response.json();
    
    if (data.status === 'completed') {
      const existingRenders = film.data.renders || [];
      const newRender = {
        filename: data.filename,
        b2_url: data.b2_url,
        timestamp: data.timestamp,
        file_id: data.file_id,
        size: data.size,
        status: 'completed'
      };

      await this.updateFilmData(APIbaseUrl, film.id, {
        ...film.data,
        renders: [...existingRenders, newRender]
      });

      onStatusUpdate({
        status: 'completed',
        film: {
          ...film,
          data: {
            ...film.data,
            renders: [...existingRenders, newRender]
          }
        }
      });

      return true;
    }
    return false;
  },

  async refreshB2Files(APIbaseUrl, filenames) {
    const response = await fetch(`${APIbaseUrl}/api/check-b2-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    });
    return response.json();
  },

  async saveTemplate(APIbaseUrl, id, film, template) {
    const success = await this.updateFilmData(APIbaseUrl, id, {
      ...film.data,
      template
    });
    
    if (success) {
      return {
        ...film,
        data: {
          ...film.data,
          template
        }
      };
    }
    return null;
  },

  async saveClips(APIbaseUrl, id, film, newClips) {
    const success = await this.updateFilmData(APIbaseUrl, id, {
      ...film.data,
      clips: newClips
    });
    
    if (success) {
      return {
        ...film,
        data: {
          ...film.data,
          clips: newClips
        }
      };
    }
    return null;
  },
}; 