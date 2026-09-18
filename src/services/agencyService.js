import { api } from './api';

export const agencyService = {
  /**
   * Obtiene la información de la inmobiliaria asociada al usuario autenticado
   */
  async getAgencyInfo() {
    return await api.get('/api/inmobiliarias/info');
  },

  /**
   * Crea una nueva inmobiliaria y la vincula al usuario actual
   */
  async createAgency(agencyData) {
    return await api.post('/api/inmobiliarias/create', agencyData);
  },

  /**
   * Actualiza datos de la inmobiliaria
   */
  async updateAgency(agencyId, agencyData) {
    return await api.put(`/api/inmobiliarias/${agencyId}`, agencyData);
  },
};
