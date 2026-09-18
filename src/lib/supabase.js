import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nvjlmslqwdktwkycdchx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52amxtc2xxd2RrdHdreWNkY2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc3MDQwMTQsImV4cCI6MjAzMzI4MDAxNH0.lDIkPCzdX4YIM6QTGs7IpVKVyW3TIIIDdWgixWvf7Tc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Mensajes de error en español amigable
function getFriendlyAuthError(errorMessage) {
  if (!errorMessage) return 'Ocurrió un error inesperado. Por favor, reintentá.';
  const msg = errorMessage.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Correo o contraseña incorrectos. Verificá tus datos.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Tu correo aún no fue confirmado. Revisá tu casilla de correo o spam.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Ya existe una cuenta con este correo electrónico.';
  }
  if (msg.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Demasiados intentos. Aguardá unos instantes antes de volver a intentar.';
  }
  if (msg.includes('network')) {
    return 'Error de conexión. Comprobá tu acceso a internet.';
  }

  return errorMessage;
}

export const authService = {
  // Iniciar sesión con email y contraseña
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error.message) };
    }
  },

  // Registro de nuevo usuario
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error.message) };
    }
  },

  // Inicio de sesión con Google OAuth
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error.message) };
    }
  },

  // Cerrar sesión
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error.message) };
    }
  },

  // Recuperar contraseña
  async resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error.message) };
    }
  },

  // Obtener sesión actual
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { success: true, session };
    } catch (error) {
      return { success: false, session: null };
    }
  },

  // Obtener usuario actual
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { success: true, user };
    } catch (error) {
      return { success: false, user: null };
    }
  },
};
