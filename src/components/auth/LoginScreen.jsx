import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Globe,
  ChevronDown,
  UserPlus,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Check,
  Loader2,
} from 'lucide-react';
import logo from '../../assets/logo-color.png';
import { authService, supabase } from '../../lib/supabase';
import { getCountries, getStates, getCities } from '../../data/locationData';
import { api } from '../../services/api';
import { agencyService } from '../../services/agencyService';

export default function LoginScreen({ onLogin, onRegisterSuccess, initialMode = 'login' }) {
  // Modo activo: 'login' | 'register' | 'forgot'
  const [activeMode, setActiveMode] = useState(initialMode);

  // Campos Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Campos Recuperación de Contraseña (Flujo OTP)
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify' | 'new-password' | 'success'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Campos Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountry, setRegCountry] = useState('');
  const [regState, setRegState] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Modo de registro: 'owner' (Titular) | 'invited' (Inspector con Código)
  const [regType, setRegType] = useState('owner');

  // Campos para Registro con Código de Invitación (Inspector)
  const [inviteCode, setInviteCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [validatedInvite, setValidatedInvite] = useState(null);
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [invitedName, setInvitedName] = useState('');
  const [invitedPassword, setInvitedPassword] = useState('');
  const [invitedConfirmPassword, setInvitedConfirmPassword] = useState('');
  const [showInvitedPassword, setShowInvitedPassword] = useState(false);
  const [showInvitedConfirmPassword, setShowInvitedConfirmPassword] = useState(false);

  // Opciones de ubicación dependientes
  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);

  // Verificación de email tras registro (Flujo OTP)
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupResendCooldown, setSignupResendCooldown] = useState(0);

  // Estados generales
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Temporizador para reenvío de código de confirmación de registro
  useEffect(() => {
    if (signupResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setSignupResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [signupResendCooldown]);

  // INICIO DE SESIÓN REAL CON SUPABASE
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email) {
      setError('Ingresá tu correo electrónico.');
      return;
    }
    if (!password) {
      setError('Ingresá tu contraseña.');
      return;
    }

    setIsLoading(true);
    const result = await authService.signIn(email, password);
    setIsLoading(false);

    // Si fallan las credenciales, BLOQUEA y muestra el error
    if (!result.success) {
      console.warn('Login fallido:', result.error);
      const isUnconfirmed = result.error && (
        result.error.toLowerCase().includes('not confirmed') ||
        result.error.toLowerCase().includes('no fue confirmado')
      );
      if (isUnconfirmed) {
        setRegisteredEmail(email);
        setSignupOtp('');
        setSignupResendCooldown(60);
        setIsRegisteredSuccess(true);
        setError('');
        setInfoMessage('Tu cuenta aún no está confirmada. Enviamos un código de 6 dígitos a tu correo para activarla.');
        authService.resendSignupOtp(email).catch(console.warn);
        return;
      }
      setError(result.error || 'Credenciales incorrectas. Verificá tu correo y contraseña.');
      return;
    }

    const sessionUser = result.data?.user;
    if (!sessionUser) {
      setError('No se pudo verificar la sesión de usuario.');
      return;
    }

    // Verificar si el usuario es un agente restringido por Plan Free
    try {
      const profileRes = await api.get('/api/users/profile');
      if (profileRes?.code === 'AGENT_PLAN_RESTRICTED' || (profileRes?.status === 403 && profileRes?.code === 'AGENT_PLAN_RESTRICTED')) {
        await authService.signOut();
        setError(profileRes.message || 'Tu cuenta de inspector está vinculada a una inmobiliaria con Plan Free. El acceso para inspectores está suspendido hasta que el titular actualice su suscripción.');
        return;
      }
    } catch (e) {
      console.warn('Aviso verificando perfil en login:', e);
    }

    // Buscar nombre y datos en la tabla users de Supabase si existe
    let dbUser = null;
    try {
      const { data } = await supabase
        .from('users')
        .select('name, type, inmobiliaria_id, country, state, city')
        .eq('id', sessionUser.id)
        .maybeSingle();
      if (data) {
        dbUser = data;
      }
    } catch (err) {
      console.warn('No se pudo obtener datos de tabla users:', err);
    }

    // Solo si Supabase autorizó con éxito, ingresa a la app
    onLogin({
      id: sessionUser.id,
      email: sessionUser.email || email,
      name: dbUser?.name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Usuario',
      role: dbUser?.type || sessionUser.user_metadata?.role || sessionUser.user_metadata?.type || 'owner',
      type: dbUser?.type || sessionUser.user_metadata?.type || sessionUser.user_metadata?.role || 'owner',
      inmobiliaria_id: dbUser?.inmobiliaria_id || null,
      country: dbUser?.country || sessionUser.user_metadata?.country || 'Uruguay',
      state: dbUser?.state || sessionUser.user_metadata?.state || '',
      city: dbUser?.city || sessionUser.user_metadata?.city || 'Montevideo',
    });
  };

  const handleCountryChange = (e) => {
    const country = e.target.value;
    setRegCountry(country);
    const states = getStates(country);
    setAvailableStates(states);
    setRegState('');
    setAvailableCities([]);
    setRegCity('');
  };

  const handleStateChange = (e) => {
    const state = e.target.value;
    setRegState(state);
    const cities = getCities(regCountry, state);
    setAvailableCities(cities);
    setRegCity('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const email = regEmail.trim();
    const name = regName.trim();
    const password = regPassword;
    const confirmPassword = regConfirmPassword;

    if (!name) {
      setError('Ingresá tu nombre.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Ingresá un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Crear en Supabase Auth
      const result = await authService.signUp(email, password, {
        name,
        role: 'owner',
        type: 'owner',
      });

      if (!result.success) {
        setIsLoading(false);
        setError(result.error);
        return;
      }

      // 2. Sincronizar en backend
      const userId = result.data?.user?.id;
      if (userId) {
        try {
          await api.post('/api/users/create', {
            user_id: userId,
            email,
            name,
            type: 'owner',
          });
        } catch (apiErr) {
          console.warn('Aviso sincronizando en backend:', apiErr);
        }
      }

      setIsLoading(false);
      setRegisteredEmail(email);
      setSignupOtp('');
      setSignupResendCooldown(60);
      setIsRegisteredSuccess(true);
      setError('');
      setInfoMessage(`Enviamos un código numérico de 6 dígitos a ${email}.`);
    } catch (err) {
      setIsLoading(false);
      console.error('Error durante registro:', err);
      setError('Ocurrió un error inesperado al registrarte. Reintentá en instantes.');
    }
  };

  // ─── VALIDAR CÓDIGO DE INVITACIÓN (INSPECTOR) ───
  const handleValidateInviteCode = async (codeToTest) => {
    const code = (codeToTest !== undefined ? codeToTest : inviteCode).trim().toUpperCase();
    if (!code || code.length < 6) {
      setInviteCodeError('El código debe tener 6 caracteres.');
      return;
    }

    setIsValidatingCode(true);
    setInviteCodeError('');
    try {
      const res = await agencyService.validateInvitation(code);
      if (res && res.success && res.valid && res.invitation) {
        setValidatedInvite(res.invitation);
        setInviteCodeError('');
      } else {
        setValidatedInvite(null);
        setInviteCodeError(res?.message || 'Código de invitación inválido o expirado.');
      }
    } catch (err) {
      console.error('Error validando código:', err);
      setValidatedInvite(null);
      const msg = err.response?.data?.message || err.message || 'Código no encontrado o expirado';
      setInviteCodeError(msg);
    } finally {
      setIsValidatingCode(false);
    }
  };

  // ─── COMPLETAR REGISTRO DE INSPECTOR VÍA CÓDIGO ───
  const handleAcceptInviteSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!validatedInvite) {
      setError('Primero debés validar un código de invitación válido.');
      return;
    }

    const name = invitedName.trim();
    const password = invitedPassword;
    const confirmPassword = invitedConfirmPassword;

    if (!name) {
      setError('Por favor ingresá tu nombre y apellido.');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanCode = (validatedInvite.token || inviteCode).trim().toUpperCase();
      const acceptRes = await agencyService.acceptInvitation({
        token: cleanCode,
        email: validatedInvite.email,
        password,
        name,
      });

      if (!acceptRes || !acceptRes.success) {
        throw new Error(acceptRes?.message || 'Error al aceptar la invitación.');
      }

      // Iniciar sesión automáticamente
      const loginRes = await authService.signIn(validatedInvite.email, password);
      if (!loginRes.success) {
        setIsLoading(false);
        setActiveMode('login');
        setLoginEmail(validatedInvite.email);
        setInfoMessage('¡Cuenta creada con éxito! Por favor iniciá sesión.');
        return;
      }

      const sessionUser = loginRes.data?.user;
      setIsLoading(false);

      // Ingresar directamente a la app como agente
      onLogin({
        id: sessionUser?.id || acceptRes.user?.id,
        email: validatedInvite.email,
        name: name,
        role: 'agent',
        type: 'agent',
        inmobiliaria_id: validatedInvite.inmobiliaria_id,
        country: validatedInvite.inmobiliaria?.country || 'Uruguay',
        city: validatedInvite.inmobiliaria?.city || 'Montevideo',
      });
    } catch (err) {
      setIsLoading(false);
      console.error('Error completando registro de agente:', err);
      const msg = err.response?.data?.message || err.message || 'Error al completar el registro.';
      setError(msg);
    }
  };

  // Verificar código OTP de confirmación de cuenta (Signup)
  const handleVerifySignupOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');

    const code = signupOtp.trim().replace(/\s+/g, '');
    if (!code || code.length < 6) {
      setError('Por favor ingresá el código de 6 dígitos que recibiste.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.verifySignupOtp(registeredEmail.trim(), code);

      if (!result.success) {
        setError(result.error || 'El código ingresado es incorrecto o ha expirado.');
        return;
      }

      const sessionUser = result.data?.user;
      if (sessionUser) {
        // Consultar datos reales de la base de datos (por si es un agente invitado)
        let dbUser = null;
        try {
          const { data } = await supabase
            .from('users')
            .select('name, type, inmobiliaria_id, country, state, city')
            .eq('id', sessionUser.id)
            .maybeSingle();
          if (data) dbUser = data;
        } catch (dbErr) {
          console.warn('Error consultando usuario tras OTP:', dbErr);
        }

        const role = dbUser?.type || sessionUser.user_metadata?.role || sessionUser.user_metadata?.type || 'owner';
        const inmoId = dbUser?.inmobiliaria_id || null;

        // Ingresar automáticamente
        onLogin({
          id: sessionUser.id,
          email: sessionUser.email || registeredEmail,
          name: dbUser?.name || regName || sessionUser.user_metadata?.name || registeredEmail.split('@')[0] || 'Usuario',
          role: role,
          type: role,
          inmobiliaria_id: inmoId,
          country: dbUser?.country || 'Uruguay',
          city: dbUser?.city || 'Montevideo',
        });
      } else {
        setIsRegisteredSuccess(false);
        setActiveMode('login');
        setLoginEmail(registeredEmail);
        setInfoMessage('¡Cuenta activada con éxito! Ya podés iniciar sesión.');
      }
    } catch (err) {
      console.error('Error verificando OTP:', err);
      setError('Error inesperado al verificar el código. Por favor reintentá.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código OTP de registro
  const handleResendSignupCode = async () => {
    if (signupResendCooldown > 0 || isLoading) return;
    setError('');
    setInfoMessage('');
    setIsLoading(true);
    const result = await authService.resendSignupOtp(registeredEmail.trim());
    setIsLoading(false);

    if (result.success) {
      setSignupResendCooldown(60);
      setInfoMessage('Se ha enviado un nuevo código a tu correo.');
    } else {
      setError(result.error || 'No se pudo reenviar el código.');
    }
  };

  // Temporizador para reenvío de código OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Listener para capturar enlace mágico / evento PASSWORD_RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setActiveMode('forgot');
        setForgotStep('new-password');
        if (session?.user?.email) {
          setRecoveryEmail(session.user.email);
        }
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // 1. Iniciar flujo de recuperación
  const handleStartForgotPassword = () => {
    setError('');
    setInfoMessage('');
    setRecoveryEmail(loginEmail.trim() || '');
    setRecoveryOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotStep('request');
    setActiveMode('forgot');
  };

  // 2. Enviar código de 6 dígitos al correo
  const handleSendRecoveryCode = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');

    const email = recoveryEmail.trim();
    if (!email) {
      setError('Por favor ingresá tu correo electrónico.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresá un formato de correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    const result = await authService.resetPassword(email);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'No se pudo enviar el código. Verificá tu correo.');
      return;
    }

    setForgotStep('verify');
    setResendCooldown(60);
    setInfoMessage(`Enviamos un código numérico de 6 dígitos a ${email}. Revisá tu bandeja de entrada o spam.`);
  };

  // 3. Verificar código OTP de 6 dígitos
  const handleVerifyRecoveryOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');

    const code = recoveryOtp.trim().replace(/\s+/g, '');
    if (!code || code.length < 6) {
      setError('Por favor ingresá el código de 6 dígitos que recibiste.');
      return;
    }

    setIsLoading(true);
    const result = await authService.verifyRecoveryOtp(recoveryEmail.trim(), code);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'El código ingresado es incorrecto o ha expirado.');
      return;
    }

    setForgotStep('new-password');
    setInfoMessage('¡Código verificado con éxito! Ahora podés crear tu nueva contraseña.');
  };

  // 4. Guardar nueva contraseña
  const handleSaveNewPassword = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    const result = await authService.updatePassword(newPassword);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'No se pudo actualizar la contraseña. Reintentá.');
      return;
    }

    setForgotStep('success');
    setLoginEmail(recoveryEmail.trim());
    setLoginPassword('');
  };

  // Reenviar código OTP
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError('');
    setInfoMessage('');
    setIsLoading(true);
    const result = await authService.resetPassword(recoveryEmail.trim());
    setIsLoading(false);

    if (result.success) {
      setResendCooldown(60);
      setInfoMessage('Se ha enviado un nuevo código a tu correo.');
    } else {
      setError(result.error || 'No se pudo reenviar el código.');
    }
  };

  return (
    <div style={styles.container} className="app-auth-screen">
      <div style={styles.scrollContent} className="app-auth-card no-scrollbar">
        {isRegisteredSuccess ? (
          <form onSubmit={handleVerifySignupOtp} style={{ textAlign: 'center', padding: '16px 8px 12px' }}>
            <div
              style={{
                width: 68,
                height: 68,
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                border: '1.5px solid #c7d2fe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#4f46e5',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.12)',
              }}
            >
              <KeyRound size={32} strokeWidth={2.2} />
            </div>

            <h2 style={{ fontSize: 21, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Activa tu Cuenta
            </h2>

            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>
              Ingresá el código numérico de 6 dígitos enviado a:<br />
              <strong style={{ color: '#0f172a' }}>{registeredEmail}</strong>
            </p>

            {/* Error / Info */}
            {error && (
              <div style={{ ...styles.errorAlert, marginBottom: 14 }}>
                <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            {infoMessage && (
              <div style={{ ...styles.infoAlert, marginBottom: 14 }}>
                <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                <span>{infoMessage}</span>
              </div>
            )}

            <div style={styles.groupedCard}>
              <div style={{ ...styles.groupedRow, justifyContent: 'center' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  style={{
                    ...styles.groupedInput,
                    textAlign: 'center',
                    fontSize: '24px',
                    letterSpacing: '8px',
                    fontWeight: '700',
                    color: '#0f172a',
                    fontFamily: 'monospace',
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || signupOtp.trim().length < 6}
              style={{
                ...styles.primaryBtn,
                opacity: (isLoading || signupOtp.trim().length < 6) ? 0.65 : 1,
                gap: 8,
                marginTop: 8,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} color="#ffffff" className="app-spin-anim" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Check size={18} color="#ffffff" strokeWidth={2.4} />
                  <span>Activar cuenta y entrar</span>
                </>
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 14 }}>
              <button
                type="button"
                onClick={handleResendSignupCode}
                disabled={signupResendCooldown > 0 || isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: signupResendCooldown > 0 ? '#94a3b8' : '#4f46e5',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: signupResendCooldown > 0 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 0',
                }}
              >
                <RefreshCw size={14} className={isLoading ? 'app-spin-anim' : ''} />
                <span>{signupResendCooldown > 0 ? `Reenviar en ${signupResendCooldown}s` : 'Reenviar código'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsRegisteredSuccess(false);
                setActiveMode('login');
                setError('');
                setInfoMessage('');
              }}
              style={{ ...styles.textBackBtn, marginTop: 12 }}
            >
              <ArrowLeft size={16} />
              <span>Volver al inicio de sesión</span>
            </button>
          </form>
        ) : (
          <>
            {/* Cabecera limpia y profesional */}
            <div style={styles.header}>
              <div style={styles.logoBox}>
                <img src={logo} alt="Aitems" style={styles.logoImg} />
              </div>

              <h1 style={styles.title}>
                {activeMode === 'login'
                  ? 'Bienvenido a Aitems'
                  : activeMode === 'register'
                  ? 'Crear Cuenta'
                  : forgotStep === 'request'
                  ? 'Recuperar contraseña'
                  : forgotStep === 'verify'
                  ? 'Código de seguridad'
                  : forgotStep === 'new-password'
                  ? 'Nueva contraseña'
                  : 'Listo'}
              </h1>
              <p style={styles.subtitle}>
                {activeMode === 'login'
                  ? 'Iniciá sesión para gestionar tus propiedades e inventarios'
                  : activeMode === 'register'
                  ? 'Únete a la plataforma líder en gestión de inventarios Inmobiliarios'
                  : forgotStep === 'request'
                  ? 'Ingresá tu correo para recibir un código de recuperación'
                  : forgotStep === 'verify'
                  ? 'Ingresá el código de 6 dígitos que enviamos a tu correo'
                  : forgotStep === 'new-password'
                  ? 'Creá una nueva clave segura para tu cuenta'
                  : 'Tu clave ha sido modificada correctamente'}
              </p>
            </div>

            {/* Control Segmentado (solo en login/register) */}
            {activeMode !== 'forgot' && (
              <div style={styles.segmentedControl}>
                <button
                  type="button"
                  style={{
                    ...styles.segmentedBtn,
                    ...(activeMode === 'login' ? styles.segmentedBtnActive : {})
                  }}
                  onClick={() => {
                    setActiveMode('login');
                    setError('');
                    setInfoMessage('');
                  }}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.segmentedBtn,
                    ...(activeMode === 'register' ? styles.segmentedBtnActive : {})
                  }}
                  onClick={() => {
                    setActiveMode('register');
                    setError('');
                    setInfoMessage('');
                  }}
                >
                  Crear cuenta
                </button>
              </div>
            )}

            {/* Mensajes de Alerta / Éxito */}
            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div style={styles.infoAlert}>
                <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* ============ FORMULARIO LOGIN ============ */}
            {activeMode === 'login' && (
              <form onSubmit={handleLoginSubmit} style={styles.form}>
                <div style={styles.groupedCard}>
                  <div style={styles.groupedRow}>
                    <Mail size={18} color="#94a3b8" style={styles.groupedIcon} />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Correo electrónico"
                      style={styles.groupedInput}
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </div>

                  <div style={styles.groupedDivider} />

                  <div style={styles.groupedRow}>
                    <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Contraseña"
                      style={styles.groupedInput}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={styles.eyeBtn}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                    </button>
                  </div>
                </div>

                <div style={styles.forgotRow}>
                  <button
                    type="button"
                    onClick={handleStartForgotPassword}
                    style={styles.forgotBtn}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    ...styles.primaryBtn,
                    opacity: isLoading ? 0.75 : 1
                  }}
                >
                  <span>{isLoading ? 'Ingresando...' : 'Ingresar'}</span>
                  {!isLoading && <ArrowRight size={17} color="#ffffff" strokeWidth={2.4} />}
                </button>
              </form>
            )}

            {/* ============ FORMULARIO REGISTRO ============ */}
            {activeMode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Selector secundario: Titular vs Invitado */}
                <div style={{
                  display: 'flex',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '3px',
                  gap: '4px',
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRegType('owner');
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      height: '36px',
                      borderRadius: '9px',
                      border: 'none',
                      backgroundColor: regType === 'owner' ? '#ffffff' : 'transparent',
                      color: regType === 'owner' ? '#0f172a' : '#64748b',
                      fontWeight: regType === 'owner' ? '700' : '600',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      boxShadow: regType === 'owner' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Soy Titular
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegType('invited');
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      height: '36px',
                      borderRadius: '9px',
                      border: 'none',
                      backgroundColor: regType === 'invited' ? '#ffffff' : 'transparent',
                      color: regType === 'invited' ? '#0f172a' : '#64748b',
                      fontWeight: regType === 'invited' ? '700' : '600',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      boxShadow: regType === 'invited' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Tengo Invitación
                  </button>
                </div>

                {/* FLUJO 1: TITULAR (CREACIÓN DE INMOBILIARIA) */}
                {regType === 'owner' && (
                  <form onSubmit={handleRegisterSubmit} style={styles.form}>
                    <div style={styles.groupedCard}>
                      {/* Nombre */}
                      <div style={styles.groupedRow}>
                        <User size={18} color="#94a3b8" style={styles.groupedIcon} />
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Tu nombre y apellido *"
                          style={styles.groupedInput}
                          required
                          autoFocus
                        />
                      </div>

                      <div style={styles.groupedDivider} />

                      {/* Email */}
                      <div style={styles.groupedRow}>
                        <Mail size={18} color="#94a3b8" style={styles.groupedIcon} />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="tu@email.com (Email *)"
                          style={styles.groupedInput}
                          autoCapitalize="none"
                          required
                        />
                      </div>

                      <div style={styles.groupedDivider} />

                      {/* Contraseña */}
                      <div style={styles.groupedRow}>
                        <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres (Contraseña *)"
                          style={styles.groupedInput}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          style={styles.eyeBtn}
                          tabIndex={-1}
                        >
                          {showRegPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                        </button>
                      </div>

                      <div style={styles.groupedDivider} />

                      {/* Confirmar Contraseña */}
                      <div style={styles.groupedRow}>
                        <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repite contraseña (Confirmar *)"
                          style={styles.groupedInput}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          style={styles.eyeBtn}
                          tabIndex={-1}
                        >
                          {showRegConfirmPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        ...styles.primaryBtn,
                        opacity: isLoading ? 0.75 : 1,
                        gap: 8,
                      }}
                    >
                      <UserPlus size={18} color="#ffffff" strokeWidth={2.4} />
                      <span>{isLoading ? 'Registrando...' : 'Registrarme como Administrador'}</span>
                    </button>
                  </form>
                )}

                {/* FLUJO 2: INSPECTOR CON CÓDIGO DE INVITACIÓN */}
                {regType === 'invited' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {!validatedInvite ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.45, margin: '2px 0 6px 0' }}>
                          Ingresá el código alfanumérico de <strong>6 dígitos</strong> que te compartió el administrador de tu inmobiliaria.
                        </p>

                        <div style={styles.groupedCard}>
                          <div style={styles.groupedRow}>
                            <KeyRound size={18} color="#4f46e5" style={styles.groupedIcon} />
                            <input
                              type="text"
                              value={inviteCode}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                                setInviteCode(val);
                                setInviteCodeError('');
                                if (val.length === 6) {
                                  handleValidateInviteCode(val);
                                }
                              }}
                              placeholder="CÓDIGO (EJ: K7P9X2)"
                              style={{
                                ...styles.groupedInput,
                                fontFamily: 'monospace',
                                fontWeight: '800',
                                letterSpacing: '4px',
                                fontSize: '15px',
                              }}
                              maxLength={6}
                              autoFocus
                            />
                          </div>
                        </div>

                        {inviteCodeError && (
                          <div style={{ ...styles.errorAlert, margin: '4px 0' }}>
                            <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span>{inviteCodeError}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleValidateInviteCode()}
                          disabled={isValidatingCode || inviteCode.trim().length !== 6}
                          style={{
                            ...styles.primaryBtn,
                            opacity: isValidatingCode || inviteCode.trim().length !== 6 ? 0.6 : 1,
                            marginTop: 4,
                          }}
                        >
                          {isValidatingCode ? (
                            <>
                              <Loader2 size={18} className="spinner" />
                              <span>Verificando código...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={18} />
                              <span>Continuar con mi Código</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleAcceptInviteSubmit} style={styles.form}>
                        {/* Tarjeta de Invitación Verificada */}
                        <div style={{
                          backgroundColor: '#ecfdf5',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              ✓ Invitación Verificada
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setValidatedInvite(null);
                                setInviteCode('');
                                setInviteCodeError('');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#059669',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: 0,
                              }}
                            >
                              Cambiar código
                            </button>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#064e3b' }}>
                            {validatedInvite.inmobiliaria_name || 'Inmobiliaria'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#047857' }}>
                            Inspector: <strong>{validatedInvite.email}</strong>
                          </span>
                        </div>

                        {/* Campos de Nombre y Clave para el Agente */}
                        <div style={styles.groupedCard}>
                          {/* Nombre */}
                          <div style={styles.groupedRow}>
                            <User size={18} color="#94a3b8" style={styles.groupedIcon} />
                            <input
                              type="text"
                              value={invitedName}
                              onChange={(e) => setInvitedName(e.target.value)}
                              placeholder="Tu nombre y apellido *"
                              style={styles.groupedInput}
                              required
                              autoFocus
                            />
                          </div>

                          <div style={styles.groupedDivider} />

                          {/* Email bloqueado */}
                          <div style={styles.groupedRow}>
                            <Mail size={18} color="#94a3b8" style={styles.groupedIcon} />
                            <input
                              type="email"
                              value={validatedInvite.email}
                              disabled
                              style={{
                                ...styles.groupedInput,
                                color: '#64748b',
                                backgroundColor: 'transparent',
                              }}
                            />
                          </div>

                          <div style={styles.groupedDivider} />

                          {/* Contraseña */}
                          <div style={styles.groupedRow}>
                            <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                            <input
                              type={showInvitedPassword ? 'text' : 'password'}
                              value={invitedPassword}
                              onChange={(e) => setInvitedPassword(e.target.value)}
                              placeholder="Mínimo 6 caracteres (Contraseña *)"
                              style={styles.groupedInput}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowInvitedPassword(!showInvitedPassword)}
                              style={styles.eyeBtn}
                              tabIndex={-1}
                            >
                              {showInvitedPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                            </button>
                          </div>

                          <div style={styles.groupedDivider} />

                          {/* Confirmar Contraseña */}
                          <div style={styles.groupedRow}>
                            <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                            <input
                              type={showInvitedConfirmPassword ? 'text' : 'password'}
                              value={invitedConfirmPassword}
                              onChange={(e) => setInvitedConfirmPassword(e.target.value)}
                              placeholder="Repite contraseña (Confirmar *)"
                              style={styles.groupedInput}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowInvitedConfirmPassword(!showInvitedConfirmPassword)}
                              style={styles.eyeBtn}
                              tabIndex={-1}
                            >
                              {showInvitedConfirmPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          style={{
                            ...styles.primaryBtn,
                            opacity: isLoading ? 0.75 : 1,
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 size={18} className="spinner" />
                              <span>Creando cuenta...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
                              <span>Completar Registro e Ingresar</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============ FLUJO RECUPERAR CONTRASEÑA (OTP 6 DÍGITOS) ============ */}
            {activeMode === 'forgot' && (
              <div style={{ animation: 'appFadeIn 0.2s ease-out' }}>
                {/* Paso 1: Solicitar código con Email */}
                {forgotStep === 'request' && (
                  <form onSubmit={handleSendRecoveryCode} style={styles.form}>
                    <div style={styles.groupedCard}>
                      <div style={styles.groupedRow}>
                        <Mail size={18} color="#94a3b8" style={styles.groupedIcon} />
                        <input
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="Tu correo registrado"
                          style={styles.groupedInput}
                          autoCapitalize="none"
                          autoComplete="email"
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        ...styles.primaryBtn,
                        opacity: isLoading ? 0.75 : 1,
                        gap: 8,
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} color="#ffffff" className="app-spin-anim" />
                          <span>Enviando código...</span>
                        </>
                      ) : (
                        <>
                          <span>Enviar código de recuperación</span>
                          <ArrowRight size={17} color="#ffffff" strokeWidth={2.4} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('login');
                        setError('');
                        setInfoMessage('');
                      }}
                      style={styles.textBackBtn}
                    >
                      <ArrowLeft size={16} />
                      <span>Volver al inicio de sesión</span>
                    </button>
                  </form>
                )}

                {/* Paso 2: Ingresar código OTP de 6 dígitos */}
                {forgotStep === 'verify' && (
                  <form onSubmit={handleVerifyRecoveryOtp} style={styles.form}>
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: '12px 14px',
                      marginBottom: 8,
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.45 }}>
                        Ingresá el código numérico de 6 dígitos enviado a: <br />
                        <strong style={{ color: '#0f172a' }}>{recoveryEmail}</strong>
                      </p>
                    </div>

                    <div style={styles.groupedCard}>
                      <div style={{ ...styles.groupedRow, justifyContent: 'center' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={recoveryOtp}
                          onChange={(e) => setRecoveryOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="••••••"
                          style={{
                            ...styles.groupedInput,
                            textAlign: 'center',
                            fontSize: '24px',
                            letterSpacing: '8px',
                            fontWeight: '700',
                            color: '#0f172a',
                            fontFamily: 'monospace',
                          }}
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || recoveryOtp.trim().length < 6}
                      style={{
                        ...styles.primaryBtn,
                        opacity: (isLoading || recoveryOtp.trim().length < 6) ? 0.65 : 1,
                        gap: 8,
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} color="#ffffff" className="app-spin-anim" />
                          <span>Verificando...</span>
                        </>
                      ) : (
                        <>
                          <Check size={18} color="#ffffff" strokeWidth={2.4} />
                          <span>Verificar código</span>
                        </>
                      )}
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0 || isLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: resendCooldown > 0 ? '#94a3b8' : '#4f46e5',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: resendCooldown > 0 ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 0',
                        }}
                      >
                        <RefreshCw size={14} className={isLoading ? 'app-spin-anim' : ''} />
                        <span>{resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep('request');
                          setError('');
                          setInfoMessage('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '6px 0',
                        }}
                      >
                        Cambiar correo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('login');
                        setError('');
                        setInfoMessage('');
                      }}
                      style={styles.textBackBtn}
                    >
                      <ArrowLeft size={16} />
                      <span>Volver al inicio de sesión</span>
                    </button>
                  </form>
                )}

                {/* Paso 3: Crear nueva contraseña */}
                {forgotStep === 'new-password' && (
                  <form onSubmit={handleSaveNewPassword} style={styles.form}>
                    <div style={styles.groupedCard}>
                      <div style={styles.groupedRow}>
                        <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nueva contraseña (mínimo 6)"
                          style={styles.groupedInput}
                          autoComplete="new-password"
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={styles.eyeBtn}
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                        </button>
                      </div>

                      <div style={styles.groupedDivider} />

                      <div style={styles.groupedRow}>
                        <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Confirmar nueva contraseña"
                          style={styles.groupedInput}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          style={styles.eyeBtn}
                          tabIndex={-1}
                        >
                          {showConfirmNewPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        ...styles.primaryBtn,
                        opacity: isLoading ? 0.75 : 1,
                        gap: 8,
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} color="#ffffff" className="app-spin-anim" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check size={18} color="#ffffff" strokeWidth={2.4} />
                          <span>Guardar nueva contraseña</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Paso 4: Éxito */}
                {forgotStep === 'success' && (
                  <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                    <div
                      style={{
                        width: 68,
                        height: 68,
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        border: '1.5px solid #a7f3d0',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: '#059669',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.15)',
                      }}
                    >
                      <CheckCircle2 size={36} strokeWidth={2.4} />
                    </div>

                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                      ¡Contraseña actualizada!
                    </h2>
                    <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
                      Tu contraseña ha sido restablecida con éxito. Ya podés iniciar sesión con tu nueva clave.
                    </p>

                    <button
                      type="button"
                      style={styles.primaryBtn}
                      onClick={() => {
                        setActiveMode('login');
                        setForgotStep('request');
                        setError('');
                        setInfoMessage('Ingresá con tu nueva contraseña.');
                      }}
                    >
                      <span>Iniciar sesión ahora</span>
                      <ArrowRight size={17} color="#ffffff" strokeWidth={2.4} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <span>Al continuar, aceptás los Términos de Servicio y Privacidad de Aitems.</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  scrollContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '36px 24px 24px 24px',
    maxWidth: '440px',
    width: '100%',
    margin: '0 auto',
  },

  /* HEADER LIMPIO Y PROFESIONAL */
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '24px',
    paddingTop: '8px',
  },
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  logoImg: {
    height: '38px',
    width: 'auto',
    objectFit: 'contain',
  },
  title: {
    fontSize: '23px',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.4px',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '13.5px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.45',
    maxWidth: '300px',
  },

  /* CONTROL SEGMENTADO */
  segmentedControl: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '14px',
    padding: '4px',
    gap: '4px',
    marginBottom: '20px',
  },
  segmentedBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: '11px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'center',
  },
  segmentedBtnActive: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontWeight: '700',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
  },

  /* ALERTAS */
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    color: '#b91c1c',
    fontSize: '12px',
    fontWeight: '500',
    padding: '10px 12px',
    borderRadius: '12px',
    marginBottom: '14px',
  },
  infoAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #d1fae5',
    color: '#047857',
    fontSize: '12px',
    fontWeight: '500',
    padding: '10px 12px',
    borderRadius: '12px',
    marginBottom: '14px',
  },

  /* FORMULARIOS Y GROUPED CARD */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    width: '100%',
  },
  groupedCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  groupedRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    height: '48px',
  },
  groupedIcon: {
    marginRight: '12px',
    flexShrink: 0,
  },
  groupedInput: {
    flex: 1,
    height: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    minWidth: 0,
  },
  groupedDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    marginLeft: '44px',
  },
  eyeBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  microSelect: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  mobileSelect: {
    flex: 1,
    height: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    cursor: 'pointer',
    appearance: 'none',
  },
  locationDot: {
    color: '#94a3b8',
    fontSize: '12px',
  },
  microInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13px',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
  },

  forgotRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '-4px',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '11.5px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '2px 0',
  },

  /* BOTÓN CTA PRINCIPAL */
  primaryBtn: {
    width: '100%',
    height: '52px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '-0.2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.16)',
    marginTop: '2px',
    transition: 'all 0.15s ease',
  },

  /* DIVISOR */
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '18px 0 14px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },

  /* BOTÓN GOOGLE */
  googleBtn: {
    width: '100%',
    height: '48px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
    transition: 'all 0.15s ease',
  },
  googleBtnText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },

  /* TÉRMINOS / FOOTER */
  footer: {
    marginTop: 'auto',
    paddingTop: '20px',
    textAlign: 'center',
    fontSize: '10.5px',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  textBackBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '14px 0 4px 0',
    cursor: 'pointer',
    width: '100%',
    transition: 'color 0.15s ease',
  },
};
