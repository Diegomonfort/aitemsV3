import { api } from './api';
import { supabase } from '../lib/supabase';

export const propertyService = {
  /**
   * Obtiene las 3 propiedades más recientes manejadas por el usuario
   */
  async getRecentProperties() {
    return await api.get('/api/properties/recent');
  },

  /**
   * Obtiene la lista de propiedades con soporte de paginación inteligente, búsqueda y filtros
   */
  async getProperties(params = {}) {
    const cleanParams = {};
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    return await api.get(`/api/properties${query ? `?${query}` : ''}`);
  },

  /**
   * Obtiene todas las propiedades utilizables (sin bloqueadas ni borradas) en una respuesta liviana,
   * pensada para selectores y modales de acciones rápidas
   */
  async getAllQuick() {
    return await api.get('/api/properties/all-quick');
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

  /**
   * Crea lote de ítems para una propiedad y ambiente (fotos o bulk)
   */
  async createItemsBatch(propertyId, payload) {
    return await api.post(`/api/properties/${propertyId}/items/batch`, payload);
  },

  /**
   * Crear un ítem individual vía backend (registra log de actividad)
   */
  async createItem(itemData) {
    try {
      const res = await api.post('/api/voice/item/confirm', itemData);
      if (res && res.success) return res;
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase directo para createItem:', err);
    }

    try {
      const payload = {
        name: itemData.name?.trim(),
        quantity: Math.max(1, parseInt(itemData.quantity, 10) || 1),
        status: itemData.status || null,
        details: itemData.description || itemData.details || null,
        cat_id: itemData.cat_id || null,
        property_id: itemData.property_id || null,
      };
      if (itemData.user_id) payload.user_id = itemData.user_id;

      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { success: true, item: data, data };
    } catch (err) {
      console.error('[propertyService] Error en fallback createItem:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Actualizar un ítem (producto) vía backend (registra log de actividad)
   */
  async updateItem(itemId, itemData) {
    try {
      const res = await api.put(`/api/properties/items/${itemId}`, itemData);
      if (res && res.success) return res;
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase directo para updateItem:', err);
    }

    try {
      const updatePayload = {
        name: itemData.name?.trim(),
        quantity: Math.max(1, parseInt(itemData.quantity, 10) || 1),
        status: itemData.status || null,
        details: itemData.description || itemData.details || null,
      };
      if (itemData.cat_id) updatePayload.cat_id = itemData.cat_id;

      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, item: data, data };
    } catch (err) {
      console.error('[propertyService] Error actualizando ítem:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Eliminar un ítem (producto) vía backend (registra log de actividad)
   */
  async deleteItem(itemId) {
    try {
      const res = await api.delete(`/api/properties/items/${itemId}`);
      if (res && res.success) return res;
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase directo para deleteItem:', err);
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[propertyService] Error eliminando ítem:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Crear un ambiente (categoría) en una propiedad vía backend (registra log)
   */
  async createCategory({ propertyId, name, type = 'habitacion' }) {
    try {
      const res = await api.post(`/api/properties/${propertyId}/categories`, { name, type });
      if (res && res.success) return res;
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase para createCategory:', err);
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name, type, property_id: propertyId })
        .select()
        .single();

      if (error) throw error;
      return { success: true, category: data, data };
    } catch (err) {
      console.error('[propertyService] Error creando categoría:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Crear múltiples ambientes (categorías) en lote vía backend (registra log)
   */
  async createCategoriesBatch(propertyId, ambients) {
    try {
      const res = await api.post(`/api/properties/${propertyId}/categories/batch`, { ambients });
      if (res && res.success) return res;
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase para createCategoriesBatch:', err);
    }

    try {
      const rows = ambients.map(a => ({
        name: typeof a === 'string' ? a : a.name,
        type: typeof a === 'string' ? 'habitacion' : (a.type || 'habitacion'),
        property_id: propertyId,
      }));

      const { data, error } = await supabase
        .from('categories')
        .insert(rows)
        .select();

      if (error) throw error;
      return { success: true, categories: data || [], data };
    } catch (err) {
      console.error('[propertyService] Error en createCategoriesBatch:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Eliminar un ambiente (categoría) de una propiedad vía backend (registra log)
   */
  async deleteCategory(propertyId, categoryId, categoryName) {
    try {
      let res = null;
      if (categoryId) {
        res = await api.delete(`/api/properties/${propertyId}/categories/${categoryId}`);
      }
      if (!res || !res.success) {
        res = await api.delete(`/api/properties/${propertyId}/categories/batch`, {
          categoryIds: categoryId ? [categoryId] : [],
          names: categoryName ? [categoryName] : [],
        });
      }
      if (res && res.success) return res;
      console.warn('[propertyService] Backend deleteCategory falló:', res?.error || res?.message);
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase para deleteCategory:', err);
    }

    try {
      if (categoryId) {
        await supabase.from('products').delete().eq('cat_id', categoryId);
        const { error } = await supabase.from('categories').delete().eq('id', categoryId);
        if (error) throw error;
      } else if (propertyId && categoryName) {
        const { data: cats } = await supabase
          .from('categories')
          .select('id')
          .eq('property_id', propertyId)
          .ilike('name', categoryName.trim());
        if (cats && cats.length > 0) {
          const ids = cats.map(c => c.id);
          await supabase.from('products').delete().in('cat_id', ids);
          await supabase.from('categories').delete().in('id', ids);
        }
      }
      return { success: true };
    } catch (error) {
      console.error('[propertyService] Error eliminando categoría:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar un ambiente (categoría) de una propiedad (nombre, tipo)
   */
  async updateCategory(propertyId, categoryId, data) {
    try {
      let res = null;
      if (propertyId && categoryId) {
        res = await api.put(`/api/properties/${propertyId}/categories/${categoryId}`, data);
      } else if (categoryId) {
        res = await api.put(`/api/properties/categories/${categoryId}`, data);
      }
      if (res && res.success) return res;
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase para updateCategory:', err);
    }

    try {
      if (categoryId) {
        const updatePayload = {};
        if (data.name) updatePayload.name = data.name.trim();
        if (data.type) updatePayload.type = data.type;

        const { data: updated, error } = await supabase
          .from('categories')
          .update(updatePayload)
          .eq('id', categoryId)
          .select()
          .single();

        if (error) throw error;
        return { success: true, category: updated, data: updated };
      }
      return { success: false, error: 'No categoryId provided' };
    } catch (error) {
      console.error('[propertyService] Error actualizando categoría:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtiene historial de auditoría / logs de la propiedad
   */
  async getPropertyLogs(propertyId, { limit = 20, offset = 0, page = 1, entityType = null } = {}) {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (offset !== undefined && offset !== null) params.append('offset', offset);
      if (page) params.append('page', page);
      if (entityType && entityType !== 'all') params.append('entityType', entityType);

      const res = await api.get(`/api/properties/${propertyId}/logs?${params.toString()}`);
      if (res && res.success) return res;
    } catch (err) {
      console.warn('[propertyService] Error en backend para getPropertyLogs, intentando Supabase directo:', err);
    }

    try {
      const parsedLimit = parseInt(limit, 10) || 20;
      const effectiveOffset = page
        ? (Math.max(parseInt(page, 10) || 1, 1) - 1) * parsedLimit
        : Math.max(parseInt(offset, 10) || 0, 0);

      let query = supabase
        .from('property_logs')
        .select('*', { count: 'exact' })
        .eq('property_id', propertyId);

      if (entityType && entityType !== 'all') {
        query = query.eq('entity_type', entityType);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(effectiveOffset, effectiveOffset + parsedLimit - 1);

      if (error) throw error;
      const total = count || 0;
      const logs = data || [];
      return {
        success: true,
        logs,
        total,
        hasMore: effectiveOffset + logs.length < total,
        page: page || Math.floor(effectiveOffset / parsedLimit) + 1,
        limit: parsedLimit,
      };
    } catch (sbErr) {
      console.error('[propertyService] Error en supabase directo para getPropertyLogs:', sbErr);
      return { success: false, logs: [], total: 0, hasMore: false };
    }
  },

  /**
   * Reordenar categorías/ambientes de una propiedad
   * @param {string} propertyId
   * @param {Array<string>} orderedCategoryIds - Array ordenado de IDs de categorías
   */
  async reorderCategories(propertyId, orderedCategoryIds) {
    if (!propertyId || !Array.isArray(orderedCategoryIds) || orderedCategoryIds.length === 0) {
      return { success: false, message: 'Datos insuficientes para reordenar' };
    }

    try {
      const res = await api.put(`/api/properties/${propertyId}/categories/reorder`, {
        orderedCategoryIds,
      });
      if (res && res.success) return res;
      console.warn('[propertyService] Backend reorderCategories falló:', res?.error || res?.message);
    } catch (err) {
      console.warn('[propertyService] Fallback a Supabase para reorderCategories:', err);
    }

    // Fallback a Supabase directo
    try {
      const now = new Date().toISOString();
      const updates = orderedCategoryIds.map((id, index) =>
        supabase
          .from('categories')
          .update({ position: index, updated_at: now })
          .eq('id', id)
          .eq('property_id', propertyId)
      );

      await Promise.all(updates);
      await supabase.from('properties').update({ updated_at: now }).eq('id', propertyId);

      return { success: true };
    } catch (error) {
      console.error('[propertyService] Error en fallback Supabase reorderCategories:', error);
      return { success: false, error: error.message };
    }
  },
};
