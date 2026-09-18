import React, { useState } from 'react';
import { Building2, Globe, MapPin, Camera, X, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import logo from '../../assets/logo-color.png';
import { agencyService } from '../../services/agencyService';

export default function CreateInmobiliariaScreen({ initialData, onCompleteInmobiliaria, onSkip }) {
  const [agencyName, setAgencyName] = useState(initialData?.agencyName || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [country, setCountry] = useState(initialData?.country || 'Uruguay');
  const [city, setCity] = useState(initialData?.city || 'Montevideo');
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

    if (!agencyName.trim()) {
      setError('Por favor ingresá el nombre de tu inmobiliaria.');
      return;
    }

    setIsLoading(true);
    try {
      const locationText = [city.trim(), country].filter(Boolean).join(', ');
      const formattedWebsite = website.trim() 
        ? (website.startsWith('http') ? website : `https://${website.replace(/^https?:\/\//, '')}`) 
        : '';

      const res = await agencyService.createAgency({
        name: agencyName.trim(),
        country,
        city: city.trim(),
        website_url: formattedWebsite,
        logo: logoPreview,
      });

      if (res?.success && res.inmobiliaria) {
        onCompleteInmobiliaria({
          id: res.inmobiliaria.id,
          name: res.inmobiliaria.name,
          location: locationText,
          website: formattedWebsite,
          logo: logoPreview,
          country,
          city: city.trim(),
        });
      } else {
        onCompleteInmobiliaria({
          name: agencyName.trim(),
          location: locationText,
          website: formattedWebsite,
          logo: logoPreview,
          country,
          city: city.trim(),
        });
      }
    } catch (err) {
      console.warn('Error al crear inmobiliaria en backend:', err);
      const locationText = [city.trim(), country].filter(Boolean).join(', ');
      onCompleteInmobiliaria({
        name: agencyName.trim(),
        location: locationText,
        website: website.trim(),
        logo: logoPreview,
        country,
        city: city.trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLater = () => {
    const fallbackName = agencyName.trim() || initialData?.agencyName || 'Mi Inmobiliaria';
    const locationText = [city.trim(), country].filter(Boolean).join(', ');
    if (onSkip) {
      onSkip();
    } else {
      onCompleteInmobiliaria({
        name: fallbackName,
        location: locationText || 'Montevideo, Uruguay',
        website: website.trim(),
        logo: logoPreview,
        country,
        city: city.trim(),
      });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.scrollContent} className="no-scrollbar">
        {/* Cabecera Limpia sin badges */}
        <div style={styles.headerBox}>
          <div style={styles.logoWrapper}>
            <img src={logo} alt="Aitems" style={styles.logoImg} />
          </div>

          <h1 style={styles.title}>Tu Inmobiliaria</h1>
          <p style={styles.subtitle}>
            Configurá los datos que identificarán a tu empresa en relevamientos y reportes PDF
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
          {/* Uploader de Logo Moderno tipo Avatar */}
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

          {/* Grouped Card con los datos */}
          <div style={styles.groupedCard}>
            {/* Fila: Nombre */}
            <div style={styles.groupedRow}>
              <Building2 size={18} color="#94a3b8" style={styles.groupedIcon} />
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Nombre de la inmobiliaria *"
                style={styles.groupedInput}
                autoFocus
              />
            </div>

            <div style={styles.groupedDivider} />

            {/* Fila: Ubicación combinada (País + Ciudad) */}
            <div style={styles.groupedRow}>
              <MapPin size={18} color="#94a3b8" style={styles.groupedIcon} />
              <div style={styles.locationWrap}>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
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
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ciudad o zona"
                  style={styles.microInput}
                />
              </div>
            </div>

            <div style={styles.groupedDivider} />

            {/* Fila: Sitio Web */}
            <div style={styles.groupedRow}>
              <Globe size={18} color="#94a3b8" style={styles.groupedIcon} />
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Sitio web o Instagram (opcional)"
                style={styles.groupedInput}
                autoCapitalize="none"
              />
            </div>
          </div>

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.primaryBtn,
              opacity: isLoading ? 0.75 : 1,
            }}
          >
            <span>{isLoading ? 'Guardando...' : 'Comenzar a usar Aitems'}</span>
            {!isLoading && <ArrowRight size={17} color="#ffffff" strokeWidth={2.4} />}
          </button>

          {/* Botón Omitir / Configurar después */}
          <button
            type="button"
            onClick={handleSkipLater}
            style={styles.skipBtn}
          >
            Configurar más tarde
          </button>
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
  },

  /* HEADER */
  headerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '24px',
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
    gap: '20px',
    width: '100%',
  },

  /* AVATAR / LOGO UPLOADER */
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
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
  groupedDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    marginLeft: '44px',
  },

  /* UBICACIÓN INLINE */
  locationWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  microSelect: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    fontWeight: '600',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  locationDot: {
    color: '#94a3b8',
    fontSize: '13px',
  },
  microInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
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

  /* BOTÓN OMITIR */
  skipBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 0',
    textAlign: 'center',
    transition: 'color 0.15s ease',
  },
};
