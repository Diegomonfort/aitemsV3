import React, { useState } from 'react';
import { Mail, CheckCircle, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '../../assets/logo-color.png';

export default function VerifyEmailScreen({ email, onContinue, onNavigateLogin }) {
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleResend = () => {
    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      setResendStatus('Correo de verificación reenviado con éxito.');
    }, 600);
  };

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent} className="no-scrollbar">
        {/* Cabecera con Logo */}
        <div style={styles.logoWrapper}>
          <img src={logo} alt="Aitems" style={styles.logoImg} />
        </div>

        {/* Tarjeta Central */}
        <div style={styles.card}>
          <div style={styles.iconCircle}>
            <Mail size={36} color="#ffffff" strokeWidth={2.2} />
          </div>

          <h1 style={styles.title}>Verificá tu Email</h1>
          <p style={styles.subtitle}>
            Te enviamos un enlace de activación a:
          </p>
          <div style={styles.emailBadge}>
            <span>{email || 'tucorreo@inmobiliaria.com'}</span>
          </div>

          <p style={styles.instructions}>
            Hacé clic en el enlace del correo para confirmar tu cuenta. Si no lo ves en tu bandeja de entrada, revisá la carpeta de correo no deseado (Spam).
          </p>

          {resendStatus && (
            <div style={styles.resendAlert}>
              <CheckCircle size={15} color="#10b981" />
              <span>{resendStatus}</span>
            </div>
          )}

          {/* Botón Principal para avanzar al Onboarding de Inmobiliaria */}
          <button
            type="button"
            onClick={onContinue}
            style={styles.primaryBtn}
          >
            <span>Continuar a configurar Inmobiliaria</span>
            <ArrowRight size={18} color="#ffffff" strokeWidth={2.4} />
          </button>

          {/* Botón secundario: Reenviar */}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            style={styles.secondaryBtn}
          >
            <RefreshCw size={15} color="#475569" className={isResending ? 'spin-anim' : ''} />
            <span>{isResending ? 'Reenviando...' : 'Reenviar correo de verificación'}</span>
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footerBox}>
          <button
            type="button"
            onClick={onNavigateLogin}
            style={styles.backBtn}
          >
            <ArrowLeft size={16} color="#4f46e5" strokeWidth={2.4} />
            <span>Volver a Iniciar sesión</span>
          </button>
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
    padding: '36px 24px 28px 24px',
    maxWidth: '440px',
    width: '100%',
    margin: '0 auto',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoWrapper: {
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
  card: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '16px 8px',
  },
  iconCircle: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.3px',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '13.5px',
    color: '#64748b',
    margin: 0,
  },
  emailBadge: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    marginTop: '8px',
    marginBottom: '16px',
    wordBreak: 'break-all',
  },
  instructions: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
    maxWidth: '320px',
  },
  resendAlert: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #d1fae5',
    color: '#047857',
    fontSize: '12px',
    fontWeight: '600',
    padding: '8px 12px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '16px',
  },
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
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)',
    marginBottom: '10px',
    transition: 'all 0.15s ease',
  },
  secondaryBtn: {
    width: '100%',
    height: '46px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  footerBox: {
    paddingTop: '20px',
    marginTop: 'auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
};
