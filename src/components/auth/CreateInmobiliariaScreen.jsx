import React, { useState } from 'react';
import { Building2, Camera, X, ArrowRight, AlertCircle, Loader2, LogOut } from 'lucide-react';
import logo from '../../assets/logo-color.png';
import { agencyService } from '../../services/agencyService';

// Alta simplificada de la inmobiliaria: solo nombre (obligatorio) y logo (opcional).
// Ubicación y sitio web se pueden completar después desde Ajustes; si el registro trajo
// país/departamento/ciudad se envían tal cual, y si no el backend aplica sus valores por defecto.
export default function CreateInmobiliariaScreen({ initialData, onCompleteInmobiliaria, onLogout }) {
  const [agencyName, setAgencyName] = useState(initialData?.agencyName || '');
  const [logoPreview, setLogoPreview] = useState(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (e) => {
    e.stopPropagation();
    setLogoPreview(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const trimmedName = agencyName.trim();
    if (!trimmedName) {
      setError('Por favor ingresá el nombre de tu inmobiliaria.');
      return;
    }

    const country = initialData?.country || undefined;
    const state = initialData?.state || undefined;
    const city = initialData?.city?.trim() || undefined;

    setIsLoading(true);
    try {
      const res = await agencyService.createAgency({
        name: trimmedName,
        country,
        state,
        city,
        logo: logoPreview,
      });

      if (res?.success && res.inmobiliaria) {
        const created = res.inmobiliaria;
        const locationText = [created.city, created.state, created.country].filter(Boolean).join(', ');
        onCompleteInmobiliaria({
          id: created.id,
          name: created.name,
          location: locationText,
          website: created.website_url || '',
          logo: created.logo || logoPreview,
          country: created.country,
          state: created.state,
          city: created.city,
        });
      } else {
        setError(res?.message || 'No se pudo crear la inmobiliaria.');
      }
    } catch (err) {
      console.error('Error al crear inmobiliaria en backend:', err);
      setError(err?.response?.data?.message || err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container} className="app-auth-screen">
      <div style={styles.scrollContent} className="app-auth-card no-scrollbar">
        {/* Botón superior de Cerrar Sesión */}
        {onLogout && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: 4 }}>
            <button
              type="button"
              onClick={onLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} color="#64748b" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {/* Cabecera Limpia */}
        <div style={styles.headerBox}>
          <div style={styles.logoWrapper}>
            <img src={logo} alt="Aitems" style={styles.logoImg} />
          </div>

          <h1 style={styles.title}>Tu Inmobiliaria</h1>
          <p style={styles.subtitle}>
            Poné el nombre y el logo de tu inmobiliaria para identificar tus relevamientos e informes PDF
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Uploader de Logo Moderno tipo Avatar (Opcional) */}
          <div style={styles.avatarSection}>
            <div style={styles.avatarWrapper}>
              {logoPreview ? (
                <div style={styles.avatarPreviewBox}>
                  <img src={logoPreview} alt="Logo" style={styles.avatarImg} />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={styles.avatarRemoveBtn}
                    title="Quitar logo"
                  >
                    <X size={13} color="#ffffff" strokeWidth={2.4} />
                  </button>
                </div>
              ) : (
                <label htmlFor="agency-avatar-upload" style={styles.avatarEmptyBox}>
                  <input
                    type="file"
                    id="agency-avatar-upload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoFile}
                  />
                  <Camera size={22} color="#64748b" strokeWidth={1.8} />
                </label>
              )}
            </div>
            <label htmlFor="agency-avatar-upload" style={styles.avatarLabel}>
              {logoPreview ? 'Cambiar logo' : 'Subir logo comercial'}
            </label>
            <span style={styles.avatarHint}>Opcional • PNG, JPG hasta 5MB</span>
          </div>

          {/* Grouped Card con los datos de la Inmobiliaria */}
          <div style={styles.groupedCard}>
            {/* Fila 1: Nombre */}
            <div style={styles.groupedRow}>
              <Building2 size={18} color="#94a3b8" style={styles.groupedIcon} />
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Nombre de la inmobiliaria *"
                style={styles.groupedInput}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Botón Principal - Única acción obligatoria para continuar */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.primaryBtn,
              opacity: isLoading ? 0.75 : 1,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="app-spin-anim" />
                <span>Creando inmobiliaria...</span>
              </>
            ) : (
              <>
                <span>Comenzar a usar Aitems</span>
                <ArrowRight size={17} color="#ffffff" strokeWidth={2.4} />
              </>
            )}
          </button>

          {/* Botón secundario para cerrar sesión y cambiar de cuenta */}
          {onLogout && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                onClick={onLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LogOut size={14} color="#dc2626" />
                <span>Cerrar sesión y usar otra cuenta</span>
              </button>
            </div>
          )}
        </form>
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
    boxSizing: 'border-box',
    justifyContent: 'center',
  },

  /* HEADER */
  headerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '22px',
  },
  logoWrapper: {
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    height: '34px',
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
    maxWidth: '310px',
  },

  /* ALERTA */
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
    marginBottom: '16px',
  },

  /* FORMULARIO */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    width: '100%',
  },

  /* AVATAR / LOGO UPLOADER */
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '2px',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarEmptyBox: {
    width: '74px',
    height: '74px',
    borderRadius: '20px',
    backgroundColor: '#f8fafc',
    border: '1.5px dashed #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  avatarPreviewBox: {
    position: 'relative',
    width: '74px',
    height: '74px',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarRemoveBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  avatarLabel: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#0f172a',
    cursor: 'pointer',
    marginTop: '2px',
  },
  avatarHint: {
    fontSize: '11px',
    color: '#94a3b8',
  },

  /* GROUPED CARD */
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
    height: '50px',
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
  groupedDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    marginLeft: '44px',
  },

  /* BOTÓN CTA */
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
    marginTop: '4px',
    transition: 'all 0.15s ease',
  },
};
