import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
let cleanUrl = String(rawUrl).trim().replace(/\/+$/, '');

// En Android (emulador nativo), localhost apunta al propio teléfono.
// La PC anfitriona donde corre el backend se accede mediante 10.0.2.2.
if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
  if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
    cleanUrl = cleanUrl.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2');
  }
}

const API_BASE_URL = cleanUrl;
console.log('[API] Backend base URL:', API_BASE_URL);

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

  let controller = null;
  let timeoutId = null;
  const config = {
    ...options,
    headers,
  };

  if (!config.signal) {
    controller = new AbortController();
    config.signal = controller.signal;
    const timeoutMs = options.timeout || 60000;
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

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
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};
