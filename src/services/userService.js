import { api } from './api';
import { supabase } from '../lib/supabase';

export const userService = {
  /**
   * Obtiene el perfil completo del usuario autenticado
   */
  async getUserProfile() {
    return await api.get('/api/users/profile');
  },

  /**
   * Actualiza los datos del perfil (nombre, país, estado, ciudad)
   */
  async updateUserProfile(userId, updateData) {
    const endpoint = userId ? `/api/users/update/${userId}` : '/api/users/update';
    const response = await api.put(endpoint, updateData);

    // Si el nombre cambió, sincronizar también en Supabase Auth metadata
    if (updateData?.name) {
      try {
        await supabase.auth.updateUser({
          data: { name: updateData.name }
        });
      } catch (err) {
        console.warn('[userService] Aviso actualizando auth metadata:', err);
      }
    }

    return response;
  },

  /**
   * Elimina definitivamente la cuenta del usuario y sus datos asociados (Requisito Apple Store)
   */
  async deleteAccount(userId) {
    const endpoint = userId ? `/api/users/delete/${userId}` : '/api/users/delete';
    return await api.delete(endpoint);
  }
};

