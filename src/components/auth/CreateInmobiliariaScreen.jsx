import React, { useState } from 'react';
import { Building2, Globe, MapPin, Camera, X, ArrowRight, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import logo from '../../assets/logo-color.png';
import { agencyService } from '../../services/agencyService';
import { getCountries, getStates, getCities } from '../../data/locationData';

export default function CreateInmobiliariaScreen({ initialData, onCompleteInmobiliaria }) {
  const initialCountry = initialData?.country || 'Uruguay';
  const initialStates = getStates(initialCountry);
  const initialState = initialData?.state && initialStates.includes(initialData.state)
    ? initialData.state
    : (initialStates[0] || '');
  const initialCities = getCities(initialCountry, initialState);
  const initialCity = initialData?.city && initialCities.includes(initialData.city)
    ? initialData.city
    : (initialCities[0] || '');

  const [agencyName, setAgencyName] = useState(initialData?.agencyName || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [country, setCountry] = useState(initialCountry);
  const [availableStates, setAvailableStates] = useState(initialStates);
  const [state, setState] = useState(initialState);
  const [availableCities, setAvailableCities] = useState(initialCities);
  const [city, setCity] = useState(initialCity);
  const [logoPreview, setLogoPreview] = useState(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setCountry(newCountry);
    const states = getStates(newCountry);
    setAvailableStates(states);
    const firstState = states[0] || '';
    setState(firstState);
    const cities = getCities(newCountry, firstState);
    setAvailableCities(cities);
    setCity(cities[0] || '');
  };

  const handleStateChange = (e) => {
    const newState = e.target.value;
    setState(newState);
    const cities = getCities(country, newState);
    setAvailableCities(cities);
    setCity(cities[0] || '');
  };

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

    if (!country) {
      setError('Por favor seleccioná el país.');
      return;
    }

    if (!state) {
      setError('Por favor seleccioná el departamento o provincia.');
      return;
    }

    if (!city || !city.trim()) {
      setError('Por favor seleccioná la ciudad.');
      return;
    }

    setIsLoading(true);
    try {
      const locationText = [city.trim(), state, country].filter(Boolean).join(', ');
      const formattedWebsite = website.trim() 
        ? (website.startsWith('http') ? website : `https://${website.replace(/^https?:\/\//, '')}`) 
        : '';

      const res = await agencyService.createAgency({
        name: trimmedName,
        country,
        state,
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
          state,
          city: city.trim(),
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
        {/* Cabecera Limpia */}
        <div style={styles.headerBox}>
          <div style={styles.logoWrapper}>
            <img src={logo} alt="Aitems" style={styles.logoImg} />
          </div>

          <h1 style={styles.title}>Tu Inmobiliaria</h1>
          <p style={styles.subtitle}>
            Configurá los datos oficiales de tu empresa para identificar tus relevamientos e informes PDF
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

            <div style={styles.groupedDivider} />

            {/* Fila 2: País */}
            <div style={styles.groupedRow}>
              <Globe size={18} color="#94a3b8" style={styles.groupedIcon} />
              <select
                value={country}
                onChange={handleCountryChange}
                style={styles.mobileSelect}
                required
              >
                {getCountries().map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={16} color="#94a3b8" style={{ marginRight: 6, pointerEvents: 'none', flexShrink: 0 }} />
            </div>

            <div style={styles.groupedDivider} />

            {/* Fila 3: Departamento / Provincia */}
            <div style={styles.groupedRow}>
              <MapPin size={18} color="#94a3b8" style={styles.groupedIcon} />
              <select
                value={state}
                onChange={handleStateChange}
                style={styles.mobileSelect}
                required
              >
                {availableStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <ChevronDown size={16} color="#94a3b8" style={{ marginRight: 6, pointerEvents: 'none', flexShrink: 0 }} />
            </div>

            <div style={styles.groupedDivider} />

            {/* Fila 4: Ciudad */}
            <div style={styles.groupedRow}>
              <MapPin size={18} color="#94a3b8" style={styles.groupedIcon} />
              {availableCities.length > 0 ? (
                <>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={styles.mobileSelect}
                    required
                  >
                    {availableCities.map((ct) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} color="#94a3b8" style={{ marginRight: 6, pointerEvents: 'none', flexShrink: 0 }} />
                </>
              ) : (
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ciudad o localidad *"
                  style={styles.groupedInput}
                  required
                />
              )}
            </div>

            <div style={styles.groupedDivider} />

            {/* Fila 5: Sitio Web (Opcional) */}
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
