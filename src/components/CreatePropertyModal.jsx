import React, { useState, useEffect, useRef } from 'react';
import { 
  Link as LinkIcon, 
  ChevronRight, 
  Edit3, 
  Camera, 
  Building, 
  ArrowLeft, 
  Home, 
  Sofa, 
  UtensilsCrossed, 
  BedDouble, 
  Bath, 
  Car, 
  Sun, 
  Dumbbell, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Info, 
  Globe, 
  X, 
  Check, 
  Loader2, 
  Upload,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import logoAnda from '../assets/logoAnda.webp';
import logoSancor from '../assets/logoSancor.webp';
import { propertyService } from '../services/propertyService';

export default function CreatePropertyModal({
  isOpen,
  onClose,
  onSubmit,
  agency,
  onOpenAgencyEdit,
}) {
  const [creationMode, setCreationMode] = useState(null); // null | 'link' | 'manual'
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    tipo: 'apto',
    numeroApto: '',
    image: null,
    seguro: '',
  });

  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedAmbients, setScrapedAmbients] = useState(null);
  const [scrapedImageUrl, setScrapedImageUrl] = useState(null);
  const [wasScraped, setWasScraped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    address: '',
    numeroApto: '',
  });

  // Bloquear el scroll de fondo cuando el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;

    document.documentElement.classList.add('app-modal-open');
    document.body.classList.add('app-modal-open');

    const scrollContainers = document.querySelectorAll('main, .app-detail-main, .app-main-content, .app-container');
    const prevStyles = [];
    scrollContainers.forEach(el => {
      prevStyles.push({
        el,
        overflow: el.style.overflow,
        overflowY: el.style.overflowY,
        touchAction: el.style.touchAction
      });
      el.style.overflow = 'hidden';
      el.style.overflowY = 'hidden';
      el.style.touchAction = 'none';
    });

    return () => {
      document.documentElement.classList.remove('app-modal-open');
      document.body.classList.remove('app-modal-open');
      prevStyles.forEach(({ el, overflow, overflowY, touchAction }) => {
        el.style.overflow = overflow;
        el.style.overflowY = overflowY;
        el.style.touchAction = touchAction;
      });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setCreationMode(null);
    setFormData({
      name: '',
      address: '',
      tipo: 'apto',
      numeroApto: '',
      image: null,
      seguro: '',
    });
    setScrapeUrl('');
    setScrapeError('');
    setScrapedAmbients(null);
    setScrapedImageUrl(null);
    setWasScraped(false);
    setFieldErrors({ name: '', address: '', numeroApto: '' });
    setIsSubmitting(false);
    setIsScraping(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNumeroAptoChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, numeroApto: val }));
    if (fieldErrors.numeroApto) {
      setFieldErrors(prev => ({ ...prev, numeroApto: '' }));
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Scraping Handler ─────────────────────────
  const handleScrape = async () => {
    if (!scrapeUrl.trim() || isScraping) return;

    setIsScraping(true);
    setScrapeError('');
    setScrapedAmbients(null);
    setScrapedImageUrl(null);
    setWasScraped(false);
    setFieldErrors({ name: '', address: '', numeroApto: '' });

    try {
      const result = await propertyService.scrapePropertyPreview(scrapeUrl.trim());

      if (result?.success && result?.data?.success) {
        const aiData = result.data.data || result.data;
        const { property, ambients } = aiData;

        setFormData(prev => ({
          ...prev,
          name: property?.name || prev.name,
          address: property?.location || prev.address,
          tipo: property?.type || prev.tipo,
          numeroApto: property?.apartment_number || prev.numeroApto,
        }));

        if (property?.image_url) {
          setScrapedImageUrl(property.image_url);
        }

        if (ambients && ambients.length > 0) {
          const formattedAmbients = ambients.map(a => ({
            ...a,
            name: a.name ? a.name.charAt(0).toUpperCase() + a.name.slice(1) : ''
          }));
          setScrapedAmbients(formattedAmbients);
        } else {
          setScrapedAmbients([]);
        }

        setWasScraped(true);
      } else {
        const errorMsg = result?.message || result?.data?.message || 'No se pudo analizar el enlace ingresado.';
        setScrapeError(errorMsg);
      }
    } catch (err) {
      console.error('Error al scrapear:', err);
      setScrapeError(err.message || 'Error al conectar con el servidor para analizar el enlace.');
    } finally {
      setIsScraping(false);
    }
  };

  // Ambientes handlers
  const handleUpdateAmbient = (index, newName, newType) => {
    setScrapedAmbients(prev => {
      const copy = [...(prev || [])];
      copy[index] = { name: newName, type: newType };
      return copy;
    });
  };

  const handleDeleteAmbient = (index) => {
    setScrapedAmbients(prev => (prev || []).filter((_, i) => i !== index));
  };

  const handleAddAmbient = () => {
    setScrapedAmbients(prev => [...(prev || []), { name: '', type: 'habitacion' }]);
  };

  const getAmbientIcon = (type) => {
    const norm = (type || '').toLowerCase();
    switch (norm) {
      case 'living': return Sofa;
      case 'comedor': return UtensilsCrossed;
      case 'cocina': return UtensilsCrossed;
      case 'habitacion': return BedDouble;
      case 'baño': return Bath;
      case 'terraza': case 'patio': return Sun;
      case 'garaje': return Car;
      case 'gimnasio': return Dumbbell;
      default: return Home;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = { name: '', address: '', numeroApto: '' };
    let hasError = false;

    if (!formData.name.trim()) {
      errors.name = 'Falta ingresar el nombre de la propiedad';
      hasError = true;
    }
    if (!formData.address.trim()) {
      errors.address = 'Falta ingresar la dirección';
      hasError = true;
    }
    if (formData.tipo === 'apto' && !formData.numeroApto.trim()) {
      errors.numeroApto = 'Falta ingresar el número de apartamento';
      hasError = true;
    }

    setFieldErrors(errors);
    if (hasError) return;

    setIsSubmitting(true);
    try {
      const finalImage = formData.image || scrapedImageUrl || null;
      const finalAmbients = (scrapedAmbients || []).filter(a => a.name && a.name.trim().length > 0);

      const payload = {
        name: formData.name.trim(),
        location: formData.address.trim(),
        address: formData.address.trim(),
        type: formData.tipo,
        apartment_number: formData.tipo === 'apto' ? formData.numeroApto.trim() : null,
        image_url: finalImage,
        typeSeguro: formData.seguro || null,
        ambients: finalAmbients,
        rooms: finalAmbients.map(a => a.name),
      };

      if (onSubmit) {
        await onSubmit(payload);
      }
      handleClose();
    } catch (err) {
      console.error('Error al crear propiedad:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-modal-backdrop" style={styles.modalBackdrop} onClick={handleClose}>
      <div className="app-modal-sheet" style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHandle} />

        <div style={styles.modalTopRow}>
          <div>
            <h4 style={styles.modalTitle}>
              {creationMode === null && 'Nueva Propiedad'}
              {creationMode === 'link' && 'Importar desde Portal o Inmobiliaria'}
              {creationMode === 'manual' && 'Crear Propiedad Manualmente'}
            </h4>
            <p style={styles.modalSubtitle}>
              {creationMode === null && 'Selecciona el método de creación'}
              {creationMode === 'link' && (wasScraped ? 'Revisa la información antes de guardar' : 'Pega la URL de la publicación para analizar')}
              {creationMode === 'manual' && 'Ingresa los datos para registrar la propiedad'}
            </p>
          </div>
          <button 
            type="button" 
            style={styles.modalCloseBtn}
            onClick={handleClose}
            disabled={isSubmitting || isScraping}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>

        <div className="app-modal-content-body no-scrollbar" style={styles.modalContentScroll}>
          {/* =========================================================================
              PASO 0: SELECCIÓN DE MODO DE CREACIÓN
              ========================================================================= */}
          {creationMode === null ? (
            <div style={styles.modeSelectionWrap}>
              {/* Opción A: Importar con Link */}
              <div 
                style={styles.modeCardAi}
                onClick={() => setCreationMode('link')}
              >
                <div style={styles.betaBadge}>
                  <Sparkles size={10} strokeWidth={2.8} />
                  <span>BETA</span>
                </div>
                <div style={styles.modeIconWrapAi}>
                  <LinkIcon size={20} color="#4f46e5" />
                </div>
                <div style={styles.modeBody}>
                  <h5 style={styles.modeTitle}>Importar desde Portal o Inmobiliaria</h5>
                  <p style={styles.modeDesc}>
                    Pega la URL del aviso de tu inmobiliaria o portales como <b>Infocasas</b> o <b>Mercado Libre</b> para autocompletar datos y ambientes con IA.
                  </p>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* Opción B: Manual */}
              <div 
                style={styles.modeCardManual}
                onClick={() => setCreationMode('manual')}
              >
                <div style={styles.modeIconWrapManual}>
                  <Edit3 size={20} color="#0f172a" />
                </div>
                <div style={styles.modeBody}>
                  <h5 style={styles.modeTitle}>Creación Manual</h5>
                  <p style={styles.modeDesc}>
                    Ingresa el nombre, dirección, fotos y detalles de la propiedad desde cero y sin ambientes ficticios.
                  </p>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              <div style={styles.modeFooter}>
                <button 
                  type="button" 
                  style={styles.cancelLinkBtn}
                  onClick={handleClose}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================================
                PASO 1: FORMULARIO (LINK O MANUAL)
                ========================================================================= */
            <form onSubmit={handleSubmit} style={styles.formStack}>
              <div style={styles.backLinkRow}>
                <button 
                  type="button" 
                  style={styles.backBtn}
                  onClick={() => {
                    setCreationMode(null);
                    setWasScraped(false);
                    setScrapedAmbients(null);
                    setScrapedImageUrl(null);
                  }}
                  disabled={isSubmitting || isScraping}
                >
                  <ArrowLeft size={14} />
                  <span>Volver a opciones</span>
                </button>
              </div>

              {/* Sección Scraper solo en modo Link */}
              {creationMode === 'link' && (
                <div style={styles.scrapeSection}>
                  <label style={styles.label}>Enlace de la publicación *</label>
                  <div style={styles.scrapeInputRow}>
                    <div style={styles.scrapeInputWrap}>
                      <LinkIcon size={16} color="#94a3b8" />
                      <input 
                        type="url" 
                        value={scrapeUrl}
                        onChange={(e) => {
                          setScrapeUrl(e.target.value);
                          setScrapeError('');
                        }}
                        placeholder="https://mercadolibre.com.uy/... o tuweb.com/..."
                        style={styles.scrapeInputField}
                        disabled={isScraping}
                        autoFocus
                      />
                    </div>
                    <button 
                      type="button" 
                      style={{
                        ...styles.scrapeActionBtn,
                        opacity: (!scrapeUrl.trim() || isScraping) ? 0.6 : 1,
                        cursor: (!scrapeUrl.trim() || isScraping) ? 'not-allowed' : 'pointer'
                      }}
                      onClick={handleScrape}
                      disabled={!scrapeUrl.trim() || isScraping}
                    >
                      {isScraping ? (
                        <>
                          <Loader2 size={14} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Analizando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} color="#ffffff" />
                          <span>Analizar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mensaje de Error de Scraping */}
                  {scrapeError && (
                    <div style={styles.scrapeErrorBox}>
                      <div style={styles.scrapeErrorHeader}>
                        <AlertTriangle size={15} color="#ef4444" />
                        <span style={styles.scrapeErrorTitle}>Enlace no soportado o error al analizar</span>
                      </div>
                      <p style={styles.scrapeErrorText}>{scrapeError}</p>

                      <div style={styles.portalsListWrap}>
                        <span style={styles.portalsLabel}>Portales permitidos:</span>
                        <div style={styles.portalsTagsRow}>
                          {['Mercado Libre', 'Infocasas', 'Gallito', 'Veocasas', 'Casas en el Este'].map((p) => (
                            <span key={p} style={styles.portalTag}>{p}</span>
                          ))}
                        </div>
                      </div>

                      {onOpenAgencyEdit && (
                        <button 
                          type="button"
                          style={styles.configInmoBtn}
                          onClick={() => {
                            handleClose();
                            onOpenAgencyEdit();
                          }}
                        >
                          <Globe size={13} color="#4f46e5" />
                          <span>Configurar sitio web de mi inmobiliaria</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Banner de Éxito al Scrapear */}
                  {wasScraped && (
                    <div style={styles.scrapeSuccessBanner}>
                      <Check size={16} color="#16a34a" strokeWidth={2.5} />
                      <span>¡Datos importados con éxito! Revisa la información y los ambientes a continuación.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Si está en modo link y AÚN no analizó, no mostrar el resto de campos */}
              {creationMode === 'link' && !wasScraped ? (
                <div style={{ marginTop: '8px' }}>
                  <p style={styles.scrapeTipText}>
                    💡 Puedes pegar enlaces de avisos de <b>Mercado Libre</b>, <b>Infocasas</b> o el sitio web oficial de tu inmobiliaria.
                  </p>
                </div>
              ) : (
                /* Formulario de Campos */
                <>
                  {/* Foto de Portada */}
                  <div style={styles.inputStack}>
                    <label style={styles.label}>Foto de portada</label>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      onChange={handleImageFileChange} 
                      style={{ display: 'none' }} 
                    />

                    {(formData.image || scrapedImageUrl) ? (
                      <div style={styles.imagePreviewWrapper}>
                        <img 
                          src={formData.image || scrapedImageUrl} 
                          alt="Foto propiedad" 
                          style={styles.imagePreviewImg} 
                        />
                        <button 
                          type="button" 
                          style={styles.changeImageBtn}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera size={13} color="#ffffff" />
                          <span>Cambiar foto</span>
                        </button>
                      </div>
                    ) : (
                      <div 
                        style={styles.uploadDropzone}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div style={styles.uploadIconCircle}>
                          <Camera size={20} color="#4f46e5" strokeWidth={2.2} />
                        </div>
                        <div>
                          <span style={styles.uploadTitle}>Subir o tomar foto de portada</span>
                          <span style={styles.uploadSub}>Elegí de tu galería o tomá una con la cámara</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nombre */}
                  <div style={styles.inputStack}>
                    <label style={styles.label}>Nombre o Identificador *</label>
                    <input 
                      type="text"
                      name="name"
                      placeholder="Ej: Torre Aquarela, Apto 4B, Casa Pilar..."
                      value={formData.name}
                      onChange={handleInputChange}
                      style={{
                        ...styles.inputField,
                        ...(fieldErrors.name ? styles.inputFieldError : {})
                      }}
                      required
                    />
                    {fieldErrors.name && <span style={styles.errorText}>{fieldErrors.name}</span>}
                  </div>

                  {/* Dirección */}
                  <div style={styles.inputStack}>
                    <label style={styles.label}>Dirección *</label>
                    <input 
                      type="text"
                      name="address"
                      placeholder="Ej: Parada 18, Rambla Batlle Pacheco, Punta del Este"
                      value={formData.address}
                      onChange={handleInputChange}
                      style={{
                        ...styles.inputField,
                        ...(fieldErrors.address ? styles.inputFieldError : {})
                      }}
                      required
                    />
                    {fieldErrors.address && <span style={styles.errorText}>{fieldErrors.address}</span>}
                  </div>

                  {/* Tipo y Número de Apto en Fila */}
                  <div style={styles.formRow}>
                    <div style={{ ...styles.inputStack, flex: 1 }}>
                      <label style={styles.label}>Tipo de Propiedad *</label>
                      <select 
                        name="tipo"
                        value={formData.tipo}
                        onChange={handleInputChange}
                        style={styles.selectField}
                      >
                        <option value="apto">Apartamento</option>
                        <option value="house">Casa</option>
                        <option value="local">Local Comercial</option>
                      </select>
                    </div>

                    {formData.tipo === 'apto' && (
                      <div style={{ ...styles.inputStack, flex: 1 }}>
                        <label style={styles.label}>Número de Apto *</label>
                        <input 
                          type="text"
                          name="numeroApto"
                          placeholder="Ej: 301, 12A..."
                          value={formData.numeroApto}
                          onChange={handleNumeroAptoChange}
                          style={{
                            ...styles.inputField,
                            ...(fieldErrors.numeroApto ? styles.inputFieldError : {})
                          }}
                          required
                        />
                        {fieldErrors.numeroApto && <span style={styles.errorText}>{fieldErrors.numeroApto}</span>}
                      </div>
                    )}
                  </div>

                  {/* Sección de Ambientes */}
                  <div style={styles.ambientsSection}>
                    <div style={styles.ambientsHeader}>
                      <div>
                        <h5 style={styles.ambientsTitle}>
                          Ambientes {scrapedAmbients ? `(${scrapedAmbients.length})` : '(0)'}
                        </h5>
                        <p style={styles.ambientsSubtitle}>
                          {creationMode === 'link' 
                            ? 'Revisa los ambientes detectados por IA. Edita nombres, tipos o elimina.'
                            : 'Agrega los ambientes reales de la propiedad o déjala vacía para relevar luego.'}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        style={styles.addAmbientBtn}
                        onClick={handleAddAmbient}
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Agregar</span>
                      </button>
                    </div>

                    {scrapedAmbients && scrapedAmbients.length > 0 ? (
                      <div style={styles.ambientsList}>
                        {scrapedAmbients.map((amb, idx) => {
                          const IconComp = getAmbientIcon(amb.type);
                          return (
                            <div key={idx} style={styles.ambientRow}>
                              <div style={styles.ambientIconBox}>
                                <IconComp size={15} color="#4f46e5" />
                              </div>
                              <input 
                                type="text"
                                value={amb.name}
                                onChange={(e) => handleUpdateAmbient(idx, e.target.value, amb.type)}
                                placeholder="Nombre del ambiente"
                                style={styles.ambientInput}
                                required
                              />
                              <select 
                                value={amb.type}
                                onChange={(e) => handleUpdateAmbient(idx, amb.name, e.target.value)}
                                style={styles.ambientSelect}
                              >
                                <option value="living">Living</option>
                                <option value="comedor">Comedor</option>
                                <option value="cocina">Cocina</option>
                                <option value="habitacion">Dormitorio</option>
                                <option value="baño">Baño</option>
                                <option value="terraza">Terraza</option>
                                <option value="patio">Patio</option>
                                <option value="garaje">Garaje</option>
                                <option value="gimnasio">Gimnasio</option>
                                <option value="otro">Otro</option>
                              </select>
                              <button 
                                type="button" 
                                style={styles.ambientDelBtn}
                                onClick={() => handleDeleteAmbient(idx)}
                                title="Eliminar ambiente"
                              >
                                <Trash2 size={14} color="#ef4444" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={styles.noAmbientsBox}>
                        <span>Propiedad limpia sin ambientes automáticos.</span>
                      </div>
                    )}
                  </div>

                  {/* Selector de Aseguradora */}
                  <div style={styles.inputStack}>
                    <label style={styles.label}>Garantía / Aseguradora (Opcional)</label>
                    <div style={styles.seguroGrid}>
                      <button 
                        type="button" 
                        style={{
                          ...styles.seguroCard,
                          ...(formData.seguro === 'anda' ? styles.seguroCardSelected : {})
                        }}
                        onClick={() => setFormData(prev => ({ ...prev, seguro: prev.seguro === 'anda' ? '' : 'anda' }))}
                      >
                        <div style={styles.seguroLogoWrap}>
                          <img src={logoAnda} alt="ANDA" style={styles.seguroLogoImg} />
                        </div>
                        <span style={styles.seguroName}>Garantía ANDA</span>
                        {formData.seguro === 'anda' && (
                          <span style={styles.seguroCheckBadge}>
                            <Check size={11} color="#ffffff" strokeWidth={3} />
                          </span>
                        )}
                      </button>

                      <button 
                        type="button" 
                        style={{
                          ...styles.seguroCard,
                          ...(formData.seguro === 'sancor' ? styles.seguroCardSelected : {})
                        }}
                        onClick={() => setFormData(prev => ({ ...prev, seguro: prev.seguro === 'sancor' ? '' : 'sancor' }))}
                      >
                        <div style={styles.seguroLogoWrap}>
                          <img src={logoSancor} alt="Sancor" style={styles.seguroLogoImg} />
                        </div>
                        <span style={styles.seguroName}>Sancor Seguros</span>
                        {formData.seguro === 'sancor' && (
                          <span style={styles.seguroCheckBadge}>
                            <Check size={11} color="#ffffff" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Botón Guardar */}
                  <button 
                    type="submit" 
                    style={{
                      ...styles.submitBtn,
                      opacity: isSubmitting ? 0.75 : 1,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer'
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Creando propiedad...</span>
                      </>
                    ) : (
                      <>
                        <span>Crear propiedad</span>
                        <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    zIndex: 200,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '14px 20px 24px 20px',
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  },
  modalHandle: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: '#cbd5e1',
    margin: '0 auto 12px auto',
  },
  modalTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  modalSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalContentScroll: {
    maxHeight: 'calc(88vh - 75px)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: '20px',
    paddingRight: '2px',
  },

  /* Paso 0: Selección de Modo */
  modeSelectionWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '6px',
    paddingBottom: '10px',
  },
  modeCardAi: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 14px',
    borderRadius: '16px',
    backgroundColor: '#f8fafc',
    border: '1.5px solid #e0e7ff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.04)',
  },
  betaBadge: {
    position: 'absolute',
    top: '10px',
    right: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 7px',
    borderRadius: '10px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '9.5px',
    fontWeight: '800',
    letterSpacing: '0.4px',
  },
  modeIconWrapAi: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modeCardManual: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 14px',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
  },
  modeIconWrapManual: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modeBody: {
    flex: 1,
    minWidth: 0,
  },
  modeTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 3px 0',
  },
  modeDesc: {
    fontSize: '11.5px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.35',
  },
  modeFooter: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '6px',
  },
  cancelLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '6px 12px',
  },

  /* Paso 1: Formulario */
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  backLinkRow: {
    marginBottom: '-4px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '4px 0',
  },
  scrapeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  scrapeInputRow: {
    display: 'flex',
    gap: '8px',
  },
  scrapeInputWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 10px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
  },
  scrapeInputField: {
    flex: 1,
    padding: '9px 0',
    border: 'none',
    outline: 'none',
    fontSize: '12.5px',
    color: '#0f172a',
    backgroundColor: 'transparent',
  },
  scrapeActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '0 14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)',
  },
  scrapeErrorBox: {
    marginTop: '6px',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  scrapeErrorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  scrapeErrorTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#ef4444',
  },
  scrapeErrorText: {
    fontSize: '11.5px',
    color: '#b91c1c',
    margin: 0,
    lineHeight: '1.3',
  },
  portalsListWrap: {
    marginTop: '2px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  portalsLabel: {
    fontSize: '10.5px',
    fontWeight: '700',
    color: '#64748b',
  },
  portalsTagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  portalTag: {
    fontSize: '10.5px',
    fontWeight: '600',
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #e2e8f0',
    padding: '1px 6px',
    borderRadius: '6px',
  },
  configInmoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid #c7d2fe',
    backgroundColor: '#ffffff',
    color: '#4f46e5',
    fontSize: '11.5px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '4px',
  },
  scrapeSuccessBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '4px',
  },
  scrapeTipText: {
    fontSize: '11.5px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4',
    textAlign: 'center',
  },

  /* Campos comunes */
  inputStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
  },
  inputField: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '13.5px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
  },
  inputFieldError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff1f2',
  },
  errorText: {
    fontSize: '11px',
    color: '#ef4444',
    fontWeight: '600',
  },
  formRow: {
    display: 'flex',
    gap: '10px',
  },
  selectField: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },

  /* Foto */
  imagePreviewWrapper: {
    position: 'relative',
    width: '100%',
    height: '140px',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  imagePreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(4px)',
    border: 'none',
    color: '#ffffff',
    fontSize: '11.5px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  uploadDropzone: {
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  uploadIconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadTitle: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadSub: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
  },

  /* Ambientes */
  ambientsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  ambientsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  ambientsTitle: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  ambientsSubtitle: {
    fontSize: '11px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.3',
  },
  addAmbientBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '11.5px',
    fontWeight: '700',
    cursor: 'pointer',
    flexShrink: 0,
  },
  ambientsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '4px',
  },
  ambientRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    padding: '6px 8px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  ambientIconBox: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ambientInput: {
    flex: 1,
    minWidth: 0,
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    color: '#0f172a',
    outline: 'none',
  },
  ambientSelect: {
    width: '100px',
    padding: '6px 4px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#f8fafc',
    outline: 'none',
    cursor: 'pointer',
  },
  ambientDelBtn: {
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderRadius: '6px',
    flexShrink: 0,
  },
  noAmbientsBox: {
    padding: '12px',
    textAlign: 'center',
    fontSize: '11.5px',
    color: '#94a3b8',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
  },

  /* Aseguradora */
  seguroGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  seguroCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 10px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  seguroCardSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  seguroLogoWrap: {
    width: '70px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seguroLogoImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  seguroName: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  seguroCheckBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: 'none',
    color: '#ffffff',
    fontSize: '13.5px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)',
  },
};
