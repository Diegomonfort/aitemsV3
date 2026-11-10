import React, { useState } from 'react';
import { Building2, Check, X, Loader2, AlertCircle } from 'lucide-react';
import BottomSheet from './BottomSheet';

/**
 * PendingInvitationSheet — Invitación in-app para unirse a otra inmobiliaria como inspector.
 * Se muestra cuando el owner de una inmobiliaria invitó a un email que ya tenía cuenta.
 * Muestra una invitación a la vez (la primera de la lista).
 *
 * @param {boolean} isOpen
 * @param {Array} invitations - [{ id, inmobiliaria_name, inmobiliaria_logo, inviter_name }]
 * @param {function} onAccept - async (invitation) => { success, message }
 * @param {function} onReject - async (invitation) => { success, message }
 * @param {function} onLater - "Ahora no": cierra sin responder
 */
export default function PendingInvitationSheet({ isOpen, invitations = [], onAccept, onReject, onLater }) {
  const [busyAction, setBusyAction] = useState(''); // '' | 'accept' | 'reject'
  const [error, setError] = useState('');

  const invitation = invitations[0];
  if (!invitation) return null;

  const inmoName = invitation.inmobiliaria_name || 'una inmobiliaria';
  const isBusy = Boolean(busyAction);

  const run = async (action) => {
    if (isBusy) return;
    setError('');
    setBusyAction(action);
    try {
      const res = action === 'accept' ? await onAccept?.(invitation) : await onReject?.(invitation);
      if (res && res.success === false) {
        setError(res.message || res.error || 'No se pudo completar la acción. Reintentá.');
      }
    } catch (err) {
      setError(err?.message || 'No se pudo completar la acción. Reintentá.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => { if (!isBusy) onLater?.(); }}
      title="Invitación"
    >
      <div style={styles.wrap}>
        <div style={styles.logoBox}>
          {invitation.inmobiliaria_logo ? (
            <img src={invitation.inmobiliaria_logo} alt={inmoName} style={styles.logoImg} />
          ) : (
            <Building2 size={30} color="#64748b" strokeWidth={1.8} />
          )}
        </div>

        <h3 style={styles.title}>{inmoName}</h3>
        <p style={styles.text}>
          {invitation.inviter_name ? <strong>{invitation.inviter_name}</strong> : 'La inmobiliaria'} te invitó a sumarte como inspector de <strong>{inmoName}</strong>.
        </p>
        <p style={styles.note}>
          Si aceptás, tu cuenta pasa a ser de inspector de esta inmobiliaria y todo lo que creaste (propiedades, ítems, fotos y PDFs) se mueve con vos.
        </p>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          style={{ ...styles.primaryBtn, opacity: isBusy ? 0.75 : 1 }}
          disabled={isBusy}
          onClick={() => run('accept')}
        >
          {busyAction === 'accept' ? (
            <>
              <Loader2 size={16} color="#ffffff" className="app-spin-anim" />
              <span>Uniéndote...</span>
            </>
          ) : (
            <>
              <Check size={16} color="#ffffff" strokeWidth={2.5} />
              <span>Aceptar</span>
            </>
          )}
        </button>

        <button
          type="button"
          style={{ ...styles.rejectBtn, opacity: isBusy ? 0.6 : 1 }}
          disabled={isBusy}
          onClick={() => run('reject')}
        >
          {busyAction === 'reject' ? (
            <Loader2 size={15} color="#dc2626" className="app-spin-anim" />
          ) : (
            <X size={15} color="#dc2626" strokeWidth={2.4} />
          )}
          <span>Rechazar</span>
        </button>

        <button
          type="button"
          style={styles.laterBtn}
          disabled={isBusy}
          onClick={() => onLater?.()}
        >
          Ahora no
        </button>
      </div>
    </BottomSheet>
  );
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '10px',
    padding: '4px 4px 8px',
  },
  logoBox: {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  title: {
    fontSize: '19px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  text: {
    fontSize: '14px',
    color: '#334155',
    lineHeight: 1.5,
    margin: 0,
  },
  note: {
    fontSize: '12.5px',
    color: '#64748b',
    lineHeight: 1.5,
    margin: '0 0 6px 0',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px 12px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '10px 12px',
    color: '#b91c1c',
    fontSize: '12.5px',
    lineHeight: 1.45,
  },
  primaryBtn: {
    width: '100%',
    height: '50px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  rejectBtn: {
    width: '100%',
    height: '44px',
    borderRadius: '12px',
    border: '1px solid #fecaca',
    backgroundColor: '#fff5f5',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  laterBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '13.5px',
    fontWeight: '600',
    padding: '8px 14px',
    cursor: 'pointer',
  },
};

