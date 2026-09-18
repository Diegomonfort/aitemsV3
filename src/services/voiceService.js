import { api } from './api';

export const voiceService = {
  /**
   * Procesa audio de voz para ambientes (Whisper + AmbientAgent) sin guardarlo en BD
   * @param {FormData} formData - Debe contener 'audio', 'user_id', 'property_id'
   */
  async processVoiceAmbient(formData) {
    return await api.post('/api/voice/ambient/process', formData);
  },

  /**
   * Confirma y crea los ambientes seleccionados en la base de datos (tabla categories)
   * @param {Object} payload - { user_id, property_id, ambients: [{ name, type }], transcription, duration }
   */
  async confirmVoiceAmbients(payload) {
    return await api.post('/api/voice/ambient/confirm', payload);
  },

  /**
   * Procesa audio de voz para ítems de inventario (Whisper + ItemAgent) sin guardarlo en BD
   * @param {FormData} formData - Debe contener 'audio', 'user_id', 'property_id', 'category_id'
   */
  async processVoiceItem(formData) {
    return await api.post('/api/voice/item/process', formData);
  },

  /**
   * Confirma y crea los ítems seleccionados en la base de datos (tabla products)
   * @param {Object} payload - { user_id, property_id, category_id, items: [...], transcription, duration }
   */
  async confirmVoiceItems(payload) {
    return await api.post('/api/voice/item/confirm', payload);
  },

  /**
   * Obtiene las transcripciones previas del usuario
   */
  async getUserTranscriptions(userId, page = 1) {
    return await api.get(`/api/voice/transcriptions/${userId}?page=${page}`);
  }
};
