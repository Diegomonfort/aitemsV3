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

  /**
   * Crea una nueva invitación para un inspector/agente por email
   */
  async createInvitation(email, role = 'agent') {
    return await api.post('/api/inmobiliarias/invitations', { email, role });
  },

  /**
   * Cancela una invitación pendiente por su ID
   */
  async cancelInvitation(invitationId) {
    return await api.delete(`/api/inmobiliarias/invitations/${invitationId}`);
  },

  /**
   * Valida un código o token de invitación de 6 caracteres
   */
  async validateInvitation(code) {
    return await api.get(`/api/inmobiliarias/invitations/validate/${encodeURIComponent(code)}`);
  },

  /**
   * Acepta una invitación y registra al nuevo inspector
   */
  async acceptInvitation(invitationData) {
    return await api.post('/api/inmobiliarias/invitations/accept', invitationData);
  },
};
