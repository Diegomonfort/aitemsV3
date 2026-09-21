import { supabase } from '../lib/supabase';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = String(rawUrl).trim().replace(/\/+$/, '');

// Función para obtener un token válido (refrescándolo si expiró)
async function getValidToken() {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Si el token expira en menos de 60 segundos o ya expiró, refrescarlo
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const isExpired = expiresAt && (expiresAt < Date.now() + 60000);

    if (isExpired) {
      console.log('[API] Token expirado o por expirar, renovando sesión...');
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session) {
        session = refreshData.session;
      }
    }

    return session?.access_token || null;
  } catch (err) {
    console.warn('[API] Error verificando sesión de Supabase:', err);
    return null;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  let token = await getValidToken();

  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !isFormData) {
    config.body = JSON.stringify(config.body);
  }

  try {
    let res = await fetch(url, config);

    // Si el backend responde 401 o 403, intentar refresh forzado y reintentar 1 vez
    if (res.status === 401 || res.status === 403) {
      console.warn(`[API] Solicitud a ${endpoint} respondió ${res.status}. Forzando refresh de token...`);
      try {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData?.session?.access_token) {
          const freshToken = refreshData.session.access_token;
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${freshToken}`,
          };
          res = await fetch(url, { ...config, headers: retryHeaders });
        }
      } catch (e) {
        console.warn('[API] Falló reintento con token renovado:', e);
      }
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Error HTTP ${res.status}`;
      console.warn(`[API ${options.method || 'GET'}] ${endpoint} falló (${res.status}):`, errorMsg);
      return { 
        success: false, 
        status: res.status, 
        error: errorMsg,
        ...(data && typeof data === 'object' ? data : {}),
      };
    }

    return { 
      success: data?.success !== undefined ? data.success : true, 
      ...(data && typeof data === 'object' ? data : {}),
      data: (data && typeof data === 'object' && data.data !== undefined) ? data.data : data 
    };
  } catch (error) {
    console.warn(`[API ${options.method || 'GET'}] ${endpoint} error de red:`, error.message);
    return { success: false, error: error.message };
  }
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};
