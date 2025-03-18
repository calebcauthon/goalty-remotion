import { GlobalContext } from '../index';
import { useContext } from 'react';

export const useB2Service = () => {
  const { APIbaseUrl } = useContext(GlobalContext);

  /**
   * Get list of files in B2 storage
   * @returns {Promise<Array>} List of B2 files
   */
  const getB2Files = async () => {
    try {
      const response = await fetch(`${APIbaseUrl}/api/b2/files`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching B2 files:', error);
      throw error;
    }
  };

  return {
    getB2Files,
  };
}; 