import { api } from './api';

export const propertyService = {
  /**
   * Obtiene las 3 propiedades más recientes manejadas por el usuario
   */
  async getRecentProperties() {
    return await api.get('/api/properties/recent');
  },

  /**
   * Obtiene la lista completa de propiedades accesibles para el usuario
   */
  async getProperties() {
    return await api.get('/api/properties');
  },

  /**
   * Obtiene el detalle de una propiedad específica junto con sus ambientes
   */
  async getPropertyById(id) {
    return await api.get(`/api/properties/${id}`);
  },

  /**
   * Crea una nueva propiedad en la base de datos
   */
  async createProperty(propertyData) {
    return await api.post('/api/properties/create', propertyData);
  },

  /**
   * Analiza un enlace (Mercado Libre, Infocasas, web de inmobiliaria) y extrae datos y ambientes con IA
   */
  async scrapePropertyPreview(url) {
    return await api.post('/api/scraper/preview', { url });
  },

  /**
   * Elimina una propiedad y sus ambientes asociados
   */
  async deleteProperty(id) {
    return await api.delete(`/api/properties/${id}`);
  },

  /**
   * Obtiene el plano arquitectónico vinculado a la propiedad
   */
  async getFloorPlan(propertyId) {
    return await api.get(`/api/properties/${propertyId}/floor-plan`);
  },

  /**
   * Guarda o actualiza el plano arquitectónico de una propiedad en la base de datos
   */
  async saveFloorPlan(propertyId, planPayload) {
    return await api.put(`/api/properties/${propertyId}/floor-plan`, planPayload);
  },

  /**
   * Obtiene la lista de colegas pertenecientes al equipo o inmobiliaria del usuario
   */
  async getColleagues() {
    return await api.get('/api/properties/colleagues');
  },

  /**
   * Actualiza la lista de usuarios (colegas) con quienes se comparte una propiedad
   */
  async shareProperty(propertyId, sharedUsers) {
    return await api.put(`/api/properties/${propertyId}/share`, {
      property_id: propertyId,
      shared_users: sharedUsers,
    });
  },

  /**
   * Actualiza campos parciales de una propiedad (typeSeguro, lessor, tenant, etc.)
   */
  async updateProperty(propertyId, updates) {
    return await api.put(`/api/properties/${propertyId}`, updates);
  },
};
