import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, authService } from '../lib/supabase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const signingInRef = useRef(false);

  const clearAuthError = useCallback(() => setAuthError(''), []);

  // Cargar perfil completo del usuario y su inmobiliaria desde el backend
  const fetchUserProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setAgency(null);
      return;
    }

    try {
      // 1. Consultar endpoint protegido del backend
      const res = await api.get('/api/users/profile', { timeout: 7000 });

      if (res?.code === 'ACCOUNT_DELETED' || (res?.status === 403 && res?.code === 'ACCOUNT_DELETED') || res?.data?.user?.deleted === true) {
        const msg = res?.message || 'Esta cuenta ha sido eliminada permanentemente.';
        setAuthError(msg);
        await authService.signOut();
        setUser(null);
        setAgency(null);
        setSession(null);
        return { success: false, code: 'ACCOUNT_DELETED', error: msg };
      }

      if (res?.code === 'AGENT_PLAN_RESTRICTED' || (res?.status === 403 && res?.code === 'AGENT_PLAN_RESTRICTED')) {
        const msg = res?.message || 'Tu cuenta de inspector está inactiva porque la inmobiliaria superó el cupo de usuarios de su plan actual. Pedile al titular que amplíe el plan para recuperar el acceso.';
        setAuthError(msg);
        await authService.signOut();
        setUser(null);
        setAgency(null);
        setSession(null);
        return { success: false, code: 'AGENT_PLAN_RESTRICTED', error: msg };
      }

      if (res?.status === 401 || res?.status === 403) {
        setUser(null);
        setAgency(null);
        return { success: false, status: res.status, error: res.message || res.error };
      }

      if (res.success && res.data?.user) {
        const backendUser = {
          ...res.data.user,
          role: res.data.user.role || res.data.user.type || 'owner',
          type: res.data.user.type || res.data.user.role || 'owner',
        };
        setAuthError('');
        setUser(backendUser);
        if (res.data.agency) {
          setAgency(res.data.agency);
        } else {
          setAgency(null);
        }
        return { success: true, user: backendUser, agency: res.data.agency || null };
      } else {
        const { data: { session: liveSession } } = await supabase.auth.getSession();
        if (!liveSession?.user || liveSession.user.id !== sessionUser.id) {
          return { success: false };
        }
        // Fallback si el backend está reiniciando o en proceso
        const fallbackUser = {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Usuario',
          role: sessionUser.user_metadata?.role || sessionUser.user_metadata?.type || 'owner',
          type: sessionUser.user_metadata?.type || sessionUser.user_metadata?.role || 'owner',
          inmobiliaria_id: sessionUser.user_metadata?.inmobiliaria_id || null,
          country: sessionUser.user_metadata?.country || 'Uruguay',
          city: sessionUser.user_metadata?.city || 'Montevideo',
        };
        setUser(fallbackUser);
        setAgency(null);
        return { success: true, user: fallbackUser, agency: null };
      }
    } catch (err) {
      console.warn('Error sincronizando perfil con backend:', err);
      const { data: { session: liveSession } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
      if (!liveSession?.user || liveSession.user.id !== sessionUser.id) {
        return { success: false };
      }
      const fallbackUser = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Usuario',
        role: sessionUser.user_metadata?.role || sessionUser.user_metadata?.type || 'owner',
        type: sessionUser.user_metadata?.type || sessionUser.user_metadata?.role || 'owner',
        inmobiliaria_id: sessionUser.user_metadata?.inmobiliaria_id || null,
        country: sessionUser.user_metadata?.country || 'Uruguay',
        city: sessionUser.user_metadata?.city || 'Montevideo',
      };
      setUser(fallbackUser);
      setAgency(null);
      return { success: true, user: fallbackUser, agency: null };
    }
  }, []);

  // Inicializar sesión de Supabase y suscribirse a eventos
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(initialSession);
          if (initialSession?.user) {
            await fetchUserProfile(initialSession.user);
          } else {
            setUser(null);
            setAgency(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Listener reactivo a cambios de sesión de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (signingInRef.current) return;
        if (newSession?.user) {
          await fetchUserProfile(newSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAgency(null);
      }
    });

    const handleRestrictedEvent = async (e) => {
      if (!isMounted || signingInRef.current) return;
      const detail = e?.detail || {};
      const msg = detail.message || 'Tu cuenta de inspector está inactiva por el cupo del plan de tu inmobiliaria.';
      setAuthError(msg);
      await authService.signOut();
      setUser(null);
      setAgency(null);
      setSession(null);
    };
    window.addEventListener('aitems:auth-restricted', handleRestrictedEvent);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('aitems:auth-restricted', handleRestrictedEvent);
    };
  }, [fetchUserProfile]);

  // Métodos de autenticación limpios
  const signIn = async (email, password) => {
    signingInRef.current = true;
    try {
      setAuthError('');
      const result = await authService.signIn(email, password);
      if (result.success && result.data?.user) {
        const profileResult = await fetchUserProfile(result.data.user);
        if (profileResult && profileResult.success === false) {
          return profileResult;
        }
        return {
          ...result,
          user: profileResult?.user || result.data.user,
          agency: profileResult?.agency || null,
        };
      }
      return result;
    } finally {
      signingInRef.current = false;
    }
  };

  const signUp = async (email, password, metadata) => {
    const result = await authService.signUp(email, password, metadata);
    return result;
  };

  const signInWithGoogle = async () => {
    return await authService.signInWithGoogle();
  };

  const signOut = async () => {
    setIsLoading(true);
    await authService.signOut();
    setUser(null);
    setAgency(null);
    setSession(null);
    setIsLoading(false);
  };

  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  const verifyRecoveryOtp = async (email, token) => {
    return await authService.verifyRecoveryOtp(email, token);
  };

  const updatePassword = async (newPassword) => {
    return await authService.updatePassword(newPassword);
  };

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user);
      }
    } catch (err) {
      console.warn('Error refrescando perfil:', err);
    }
  }, [fetchUserProfile]);

  const verifySignupOtp = async (email, token) => {
    return await authService.verifySignupOtp(email, token);
  };

  const resendSignupOtp = async (email) => {
    return await authService.resendSignupOtp(email);
  };

  const isOwner = Boolean(user && (user.type === 'owner' || user.role === 'owner' || !user.type));
  const needsInmobiliaria = Boolean(isOwner && !user?.inmobiliaria_id && !agency?.id);

  const value = {
    user,
    setUser,
    agency,
    setAgency,
    session,
    isLoading,
    isAuthenticated: !!user,
    isOwner,
    needsInmobiliaria,
    authError,
    clearAuthError,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    verifyRecoveryOtp,
    updatePassword,
    verifySignupOtp,
    resendSignupOtp,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de acceso directo
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
