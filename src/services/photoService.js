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
   * Consultar si el plan permite analizar fotos con IA (Free: no · Starter: 2 propiedades · Pro: ilimitado)
   * @param {string} [propertyId]
   */
  async getAiAccess(propertyId) {
    const qs = propertyId ? `?property_id=${encodeURIComponent(propertyId)}` : '';
    return await api.get(`/api/photos/ai-access${qs}`);
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
