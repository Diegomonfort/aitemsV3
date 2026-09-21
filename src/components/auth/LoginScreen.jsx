import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Phone, MapPin, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import logo from '../../assets/logo-color.png';
import { authService, supabase } from '../../lib/supabase';

export default function LoginScreen({ onLogin, onRegisterSuccess, initialMode = 'login' }) {
  // Modo activo: 'login' | 'register'
  const [activeMode, setActiveMode] = useState(initialMode);

  // Campos Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Campos Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCountry, setRegCountry] = useState('Uruguay');
  const [regCity, setRegCity] = useState('Montevideo');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Estados generales
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      setError(result.error || 'Credenciales incorrectas. Verificá tu correo y contraseña.');
      return;
    }

    const sessionUser = result.data?.user;
    if (!sessionUser) {
      setError('No se pudo verificar la sesión de usuario.');
      return;
    }

    // Buscar nombre real en la tabla users de Supabase si existe
    let realName = sessionUser.user_metadata?.name || '';
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('name, type')
        .eq('id', sessionUser.id)
        .maybeSingle();
      if (dbUser?.name) {
        realName = dbUser.name;
      }
    } catch (err) {
      console.warn('No se pudo obtener datos de tabla users:', err);
    }

    // Solo si Supabase autorizó con éxito, ingresa a la app
    onLogin({
      id: sessionUser.id,
      email: sessionUser.email || email,
      name: realName || sessionUser.email?.split('@')[0] || 'Usuario',
      role: sessionUser.user_metadata?.role || 'owner',
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!regName.trim()) {
      setError('Ingresá tu nombre completo.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Ingresá tu correo electrónico.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setError('Ingresá un correo electrónico válido.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    const result = await authService.signUp(regEmail.trim(), regPassword, {
      name: regName.trim(),
      country: regCountry,
      city: regCity,
      role: 'owner',
    });
    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const sessionUser = result.data?.user;
    if (onRegisterSuccess) {
      onRegisterSuccess({
        id: sessionUser?.id,
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        country: regCountry,
        city: regCity,
        role: 'owner',
      });
    } else {
      onLogin({
        id: sessionUser?.id,
        name: regName.trim(),
        email: regEmail.trim(),
        role: 'owner',
      });
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setInfoMessage('');
    setIsLoading(true);
    const result = await authService.signInWithGoogle();
    if (!result.success) {
      setIsLoading(false);
      setError(result.error);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfoMessage('');
    if (!loginEmail.trim()) {
      setError('Escribí tu correo electrónico en el campo arriba para enviarte el enlace de recuperación.');
      return;
    }
    const result = await authService.resetPassword(loginEmail.trim());
    if (result.success) {
      setInfoMessage('Te enviamos las instrucciones de recuperación a tu correo electrónico.');
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent} className="no-scrollbar">
        {/* Cabecera limpia y profesional */}
        <div style={styles.header}>
          <div style={styles.logoBox}>
            <img src={logo} alt="Aitems" style={styles.logoImg} />
          </div>

          <h1 style={styles.title}>
            {activeMode === 'login' ? 'Bienvenido a Aitems' : 'Creá tu cuenta'}
          </h1>
          <p style={styles.subtitle}>
            {activeMode === 'login'
              ? 'Iniciá sesión para gestionar tus propiedades e inventarios'
              : 'Comenzá a gestionar tus relevamientos e inventarios'}
          </p>
        </div>

        {/* Control Segmentado (Iniciar sesión / Crear cuenta) */}
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
                onClick={handleForgotPassword}
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
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            <div style={styles.groupedCard}>
              <div style={styles.groupedRow}>
                <User size={18} color="#94a3b8" style={styles.groupedIcon} />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nombre y apellido"
                  style={styles.groupedInput}
                />
              </div>

              <div style={styles.groupedDivider} />

              <div style={styles.groupedRow}>
                <Mail size={18} color="#94a3b8" style={styles.groupedIcon} />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  style={styles.groupedInput}
                  autoCapitalize="none"
                />
              </div>

              <div style={styles.groupedDivider} />

              <div style={styles.groupedRow}>
                <Phone size={18} color="#94a3b8" style={styles.groupedIcon} />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Teléfono (opcional)"
                  style={styles.groupedInput}
                />
              </div>

              <div style={styles.groupedDivider} />

              <div style={styles.groupedRow}>
                <MapPin size={18} color="#94a3b8" style={styles.groupedIcon} />
                <div style={styles.locationWrap}>
                  <select
                    value={regCountry}
                    onChange={(e) => setRegCountry(e.target.value)}
                    style={styles.microSelect}
                  >
                    <option value="Uruguay">Uruguay</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Chile">Chile</option>
                    <option value="Brasil">Brasil</option>
                    <option value="Paraguay">Paraguay</option>
                    <option value="México">México</option>
                    <option value="Colombia">Colombia</option>
                  </select>
                  <span style={styles.locationDot}>•</span>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Ciudad"
                    style={styles.microInput}
                  />
                </div>
              </div>

              <div style={styles.groupedDivider} />

              <div style={styles.groupedRow}>
                <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  style={styles.groupedInput}
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.primaryBtn,
                opacity: isLoading ? 0.75 : 1
              }}
            >
              <span>{isLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}</span>
              {!isLoading && <ArrowRight size={17} color="#ffffff" strokeWidth={2.4} />}
            </button>
          </form>
        )}

        {/* Separador */}
        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>o continuar con</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Botón Google */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          style={styles.googleBtn}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span style={styles.googleBtnText}>Google</span>
        </button>

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
};
