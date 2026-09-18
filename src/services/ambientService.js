import { api } from './api';

export const ambientService = {
  /**
   * Obtiene los ambientes de una propiedad
   */
  async getAmbientsByProperty(propertyId) {
    return await api.get(`/api/ambients?property_id=${propertyId}`);
  },

  /**
   * Crea un nuevo ambiente para una propiedad
   */
  async createAmbient(data) {
    return await api.post('/api/ambients/create', data);
  },

  /**
   * Obtiene los items de un ambiente
   */
  async getItemsByAmbient(ambientId) {
    return await api.get(`/api/items?ambient_id=${ambientId}`);
  },
};
