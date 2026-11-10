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
   * Crea una nueva invitación para un inspector/agente por email.
   * Si el email ya tiene cuenta, el backend responde EMAIL_HAS_ACCOUNT y hay que reenviar con
   * confirmExisting=true para dejarle una invitación in-app (sin email).
   */
  async createInvitation(email, role = 'agent', name = '', confirmExisting = false) {
    return await api.post('/api/inmobiliarias/invitations', {
      email,
      role,
      name,
      ...(confirmExisting ? { confirm_existing: true } : {}),
    });
  },

  /**
   * Invitaciones in-app pendientes dirigidas al usuario autenticado
   */
  async getMyInvitations() {
    return await api.get('/api/inmobiliarias/my-invitations');
  },

  /**
   * Acepta una invitación in-app: pasa a ser inspector de esa inmobiliaria
   */
  async acceptMyInvitation(invitationId) {
    return await api.post(`/api/inmobiliarias/my-invitations/${invitationId}/accept`);
  },

  /**
   * Rechaza una invitación in-app
   */
  async rejectMyInvitation(invitationId) {
    return await api.post(`/api/inmobiliarias/my-invitations/${invitationId}/reject`);
  },

  /**
   * Genera una nueva contraseña temporal para un inspector del equipo.
   */
  async resetAgentPassword(agentId) {
    return await api.post(`/api/inmobiliarias/agents/${agentId}/reset-password`);
  },

  /**
   * Cancela una invitación pendiente por su ID
   */
  async cancelInvitation(invitationId) {
    return await api.delete(`/api/inmobiliarias/invitations/${invitationId}`);
  },

  /**
   * Reenvía el email de una invitación pendiente
   */
  async resendInvitation(invitationId) {
    return await api.post(`/api/inmobiliarias/invitations/${invitationId}/resend`);
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
