import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import logo from '../../assets/logo-color.png';
import { useAuth } from '../../context/AuthContext';
import { authStyles as styles } from './LoginScreen';

// Pantalla obligatoria para inspectores creados por la inmobiliaria con contraseña temporal.
// Se muestra en el primer inicio de sesión hasta que elijan su propia contraseña.
export default function ChangePasswordScreen({ email, onDone, onLogout }) {
  const { updatePassword, refreshProfile } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updatePassword(password);
      if (!res?.success) {
        setError(res?.error || 'No se pudo actualizar la contraseña.');
        return;
      }
      await refreshProfile?.();
      onDone?.();
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container} className="app-auth-screen">
      <div style={styles.scrollContent} className="app-auth-card no-scrollbar">
        <div style={styles.header}>
          <div style={styles.logoBox}>
            <img src={logo} alt="Aitems" style={styles.logoImg} />
          </div>
          <h1 style={styles.title}>Elegí tu contraseña</h1>
          <p style={styles.subtitle}>
            Entraste con una contraseña temporal. Creá una propia{email ? ` para ${email}` : ''} para continuar.
          </p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.groupedCard}>
            <div style={styles.groupedRow}>
              <Lock size={18} color="#94a3b8" style={styles.groupedIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 8)"
                style={styles.groupedInput}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
              </button>
            </div>

            <div style={styles.groupedDivider} />

            <div style={styles.groupedRow}>
              <ShieldCheck size={18} color="#94a3b8" style={styles.groupedIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir contraseña"
                style={styles.groupedInput}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ ...styles.primaryBtn, marginTop: 18, opacity: isLoading ? 0.75 : 1 }}
          >
            <span>{isLoading ? 'Guardando...' : 'Guardar y continuar'}</span>
            {!isLoading && <ArrowRight size={17} color="#ffffff" strokeWidth={2.4} />}
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              marginTop: 14,
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
