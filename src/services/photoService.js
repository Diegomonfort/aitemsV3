import { api } from './api';

export const photoService = {
  /**
   * Analizar hasta 5 fotos con IA para extraer ítems de inventario
   * @param {Object} payload - { photo_ids?: string[], photos?: any[], property_id?: string, room?: string, category_id?: string }
   */
  async analyzePhotos(payload) {
    // El análisis con IA puede tardar más que el timeout por defecto (12s)
    return await api.post('/api/photos/analyze', payload, { timeout: 120000 });
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
   * Qué fotos de la propiedad ya fueron analizadas y qué ítems salieron de cada una
   * @param {string} propertyId
   * @returns data = { [image_id]: { analyzed, items: [{ id, name, quantity, status, details, structure }] } }
   */
  async getPhotosAnalysis(propertyId) {
    return await api.get(`/api/photos/analysis?property_id=${encodeURIComponent(propertyId)}`, { timeout: 30000 });
  },

  /**
   * Subir una foto a la propiedad (devuelve data.id y data.url de la foto guardada)
   * @param {FormData} formData - photo, property_id, room/category_id, method
   */
  async uploadPhoto(formData) {
    return await api.post('/api/photos', formData, { timeout: 60000 });
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
