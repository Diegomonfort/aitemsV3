import { api } from './api';

export const photoService = {
  /**
   * Analizar hasta 5 fotos con IA para extraer ítems de inventario
   * @param {Object} payload - { photo_ids?: string[], photos?: any[], property_id?: string, room?: string, category_id?: string }
   */
  async analyzePhotos(payload) {
    return await api.post('/api/photos/analyze', payload);
  },

  /**
   * Mover fotos a otro ambiente / categoría
   * @param {Object} payload - { ids: string[], room: string, category_id?: string, property_id?: string }
   */
  async updatePhotosCategory(payload) {
    return await api.patch('/api/photos', payload);
  },

  /**
   * Eliminar fotos por lotes
   * @param {Object} payload - { ids: string[] }
   */
  async deletePhotos(payload) {
    return await api.delete('/api/photos', { body: payload });
  }
};
