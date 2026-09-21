import React, { useState, useEffect } from 'react';
import { toast } from '../context/ToastContext';
import { 
  X, 
  Calendar, 
  Shield, 
  UserCheck, 
  Image as ImageIcon,
  Download,
  Copy,
  MessageCircle,
  Check,
  Loader2,
  AlertCircle,
  FileCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import aitemsLogo from '../assets/logo-color.png';
import logoAnda from '../assets/logoAnda.webp';
import logoSancor from '../assets/logoSancor.webp';
import { pdfService } from '../services/pdfService';
import { propertyService } from '../services/propertyService';
import BottomSheet from './BottomSheet';

const INSURANCE_OPTIONS = [
  { id: 'anda', name: 'ANDA', logo: logoAnda, label: 'Garantía ANDA' },
  { id: 'sancor', name: 'Sancor', logo: logoSancor, label: 'Sancor Seguros' },
];

export default function ExportPdfModal({
  isOpen,
  onClose,
  property,
  userId,
  logo = aitemsLogo,
  onUpdateProperty,
}) {
  // Pasos: 'config' | 'generating' | 'success' | 'error'
  const [step, setStep] = useState('config');
  const [pdfData, setPdfData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 1. Logo
  const [includeLogo, setIncludeLogo] = useState(true);
  
  // 2. Fecha (Última actualización vs Personalizada)
  const lastUpdateDate = property?.updatedAt 
    ? (typeof property.updatedAt === 'string' && property.updatedAt.includes('T') 
        ? property.updatedAt.split('T')[0] 
        : property.updatedAt)
    : (property?.updated_at
        ? (typeof property.updated_at === 'string' && property.updated_at.includes('T')
            ? property.updated_at.split('T')[0]
            : property.updated_at)
        : (property?.lastUpdated || new Date().toISOString().split('T')[0]));

  const [dateOption, setDateOption] = useState('updated'); // 'updated' | 'custom'
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);

  // 3. Seguro — pre-seleccionar según property.typeSeguro
  const getInitialInsurance = (prop) => {
    const ts = (prop?.typeSeguro || prop?.type_seguro || '').toString().trim().toLowerCase();
    if (ts === 'anda' || ts === 'sancor') return ts;
    return null;
  };

  const [selectedInsurance, setSelectedInsurance] = useState(() => getInitialInsurance(property));

  // 4. Firmas: Arrendador y Arrendatario
  const [includeSignatures, setIncludeSignatures] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [landlordName, setLandlordName] = useState('');

  // 5. Plano de distribución
  const [hasFloorPlan, setHasFloorPlan] = useState(() => {
    return !!(property?.floorPlan?.shapes?.length || property?.floorPlan || property?.shapes?.length);
  });
  const [includeFloorPlan, setIncludeFloorPlan] = useState(true);

  // Sincronizar estado al abrir o cuando cambia de propiedad
  useEffect(() => {
    if (isOpen && property) {
      setStep('config');
      setPdfData(null);
      setErrorMessage('');
      setCopiedLink(false);
      setIsDownloading(false);

      const currentInsurance = getInitialInsurance(property);
      setSelectedInsurance(currentInsurance);

      setTenantName(property.tenant || '');
      setLandlordName(property.lessor || '');
      const hasSigs = !!(property.tenant?.trim() || property.lessor?.trim());
      setIncludeSignatures(hasSigs);

      setDateOption('updated');
      setIncludeLogo(true);

      const localHasPlan = !!(property?.floorPlan?.shapes?.length || property?.floorPlan || property?.shapes?.length);
      setHasFloorPlan(localHasPlan);
      setIncludeFloorPlan(true);

      if (property?.id) {
        propertyService.getFloorPlan(property.id)
          .then(res => {
            const shapes = res?.floorPlan?.shapes || res?.plan?.shapes || res?.data?.shapes;
            const exists = Array.isArray(shapes) && shapes.length > 0;
            setHasFloorPlan(exists);
            setIncludeFloorPlan(exists);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, property?.id]);

  if (!isOpen || !property) return null;

  const toggleInsurance = (id) => {
    setSelectedInsurance(prev => (prev === id ? null : id));
  };

  const formatShortDate = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length < 3) return isoStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Acción de generación de PDF en backend
  const handleGeneratePdf = async () => {
    try {
      setStep('generating');
      setErrorMessage('');

      const effectiveInsurance = selectedInsurance || null;
      const cleanLessor = includeSignatures ? landlordName.trim() : '';
      const cleanTenant = includeSignatures ? tenantName.trim() : '';

      // Obtener el ID de usuario
      const targetUserId = userId || property.user_id || property.userId;
      if (!targetUserId) {
        throw new Error('No se pudo determinar el usuario para generar el documento.');
      }

      // Parámetros de exportación
      const options = {
        lessor: cleanLessor,
        tenant: cleanTenant,
        customDate: dateOption === 'custom' ? customDate : null,
        showLogo: includeLogo,
        includePlano: hasFloorPlan ? includeFloorPlan : false,
        typeSeguro: effectiveInsurance || 'none',
      };

      // Llamada al backend
      const result = await pdfService.generatePropertyPdf(property.id, targetUserId, options);

      if (!result.success || !result.pdf_id) {
        throw new Error(result.message || 'Error al procesar el archivo PDF');
      }

      // Actualizar estado en vivo en memoria de App.jsx cuando la generación tiene éxito
      if (onUpdateProperty) {
        onUpdateProperty(property.id, {
          typeSeguro: effectiveInsurance,
          lessor: cleanLessor || null,
          tenant: cleanTenant || null,
        });
      }
      property.typeSeguro = effectiveInsurance;
      property.lessor = cleanLessor || null;
      property.tenant = cleanTenant || null;

      setPdfData(result);
      setStep('success');
    } catch (err) {
      console.error('Error generando PDF:', err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado al generar el PDF.');
      setStep('error');
    }
  };

  // Acciones en la pantalla de éxito
  const getPdfViewerUrl = () => {
    if (!pdfData?.pdf_id) return '';
    const origin = window.location.origin;
    return `${origin}/pdf/${pdfData.pdf_id}`;
  };

  const handleDownload = async () => {
    if (!pdfData?.pdf_url) return;
    try {
      setIsDownloading(true);
      await pdfService.downloadPdfFile(pdfData.pdf_url, property.name || 'inventario');
    } catch (err) {
      toast.error('Error descargando el PDF. Podés copiar el link para compartirlo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    const url = getPdfViewerUrl();
    if (!url) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedLink(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Error copiando link:', e);
    }
  };

  const handleWhatsApp = () => {
    const url = getPdfViewerUrl();
    const propName = property.name || 'Propiedad';
    const message = `Inventario Propiedad: *${propName}*\n\nVer PDF: ${url}`;
    const encoded = encodeURIComponent(message);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const waUrl = isMobile ? `whatsapp://send?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Bloquear el scroll del fondo mientras el modal esté abierto


  const selectedInsuranceObj = INSURANCE_OPTIONS.find(o => o.id === selectedInsurance);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={step === 'generating' ? () => {} : onClose}
      title={step === 'success' ? 'Inventario listo' : 'Exportar Inventario'}
      subtitle={property.name}
      size="full"
    >
        {/* CONTENIDO SEGÚN PASO */}
        <div className="export-pdf-body no-scrollbar" style={styles.body}>

          {/* 1. PASO DE CONFIGURACIÓN */}
          {step === 'config' && (
            <div style={styles.formContainer}>
              
              {/* Seguro de Alquiler (ANDA / Sancor) */}
              <div style={styles.fieldCard}>
                <div style={styles.fieldHeader}>
                  <div style={styles.iconCircle}>
                    <Shield size={15} color="#0f172a" />
                  </div>
                  <div>
                    <span style={styles.fieldLabel}>Seguro de alquiler</span>
                    <span style={styles.fieldSubLabel}>Elegí una garantía o desmarcala para inventario estándar</span>
                  </div>
                </div>

                <div style={styles.insuranceRow}>
                  {INSURANCE_OPTIONS.map((opt) => {
                    const isSelected = selectedInsurance === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleInsurance(opt.id)}
                        style={{
                          ...styles.insuranceCard,
                          ...(isSelected ? styles.insuranceCardActive : styles.insuranceCardInactive)
                        }}
                      >
                        {isSelected && (
                          <div style={styles.cardCheckCircle}>
                            <Check size={10} strokeWidth={3.5} color="#ffffff" />
                          </div>
                        )}
                        
                        <div style={styles.logoWrap}>
                          <img 
                            src={opt.logo} 
                            alt={opt.name} 
                            style={styles.insuranceImg}
                          />
                        </div>

                        <span style={{
                          ...styles.cardLabel,
                          color: isSelected ? '#0f172a' : '#64748b',
                          fontWeight: isSelected ? '700' : '500',
                        }}>
                          {opt.label}
                        </span>

                        <div style={{
                          ...styles.statusPill,
                          backgroundColor: isSelected ? '#0f172a' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#64748b',
                        }}>
                          {isSelected ? 'Seleccionado' : 'Tocar para elegir'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Incluir Logo */}
              <div style={styles.rowCard}>
                <div style={styles.rowLeft}>
                  <div style={styles.iconCircle}>
                    <ImageIcon size={15} color="#0f172a" />
                  </div>
                  <div>
                    <span style={styles.fieldLabel}>Incluir logo</span>
                    <span style={styles.fieldSubLabel}>Muestra el logo de la inmobiliaria o de Aitems</span>
                  </div>
                </div>
                <label style={styles.switchContainer}>
                  <input 
                    type="checkbox" 
                    checked={includeLogo} 
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    style={styles.hiddenCheckbox}
                  />
                  <span style={{
                    ...styles.switchTrack,
                    backgroundColor: includeLogo ? '#0f172a' : '#e2e8f0'
                  }}>
                    <span style={{
                      ...styles.switchThumb,
                      transform: includeLogo ? 'translateX(16px)' : 'translateX(0px)'
                    }} />
                  </span>
                </label>
              </div>

              {/* Fecha */}
              <div style={styles.fieldCard}>
                <div style={styles.fieldHeader}>
                  <div style={styles.iconCircle}>
                    <Calendar size={15} color="#0f172a" />
                  </div>
                  <div>
                    <span style={styles.fieldLabel}>Fecha del documento</span>
                    <span style={styles.fieldSubLabel}>Fecha en el encabezado oficial</span>
                  </div>
                </div>

                <select 
                  value={dateOption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDateOption(val);
                    if (val === 'updated') {
                      setCustomDate(lastUpdateDate);
                    }
                  }}
                  style={styles.selectInput}
                >
                  <option value="updated">Última actualización ({formatShortDate(lastUpdateDate)})</option>
                  <option value="custom">Elegir otra fecha...</option>
                </select>

                {dateOption === 'custom' && (
                  <input 
                    type="date" 
                    value={customDate} 
                    onChange={(e) => setCustomDate(e.target.value)}
                    style={styles.dateInput}
                  />
                )}
              </div>

              {/* Firmas en el documento */}
              <div style={styles.fieldCard}>
                <div style={{ ...styles.rowCard, border: 'none', padding: 0, marginBottom: includeSignatures ? 8 : 0 }}>
                  <div style={styles.rowLeft}>
                    <div style={styles.iconCircle}>
                      <UserCheck size={15} color="#0f172a" />
                    </div>
                    <div>
                      <span style={styles.fieldLabel}>Incluir firmas</span>
                      <span style={styles.fieldSubLabel}>Arrendatario y arrendador al pie del documento</span>
                    </div>
                  </div>
                  <label style={styles.switchContainer}>
                    <input 
                      type="checkbox" 
                      checked={includeSignatures} 
                      onChange={(e) => setIncludeSignatures(e.target.checked)}
                      style={styles.hiddenCheckbox}
                    />
                    <span style={{
                      ...styles.switchTrack,
                      backgroundColor: includeSignatures ? '#0f172a' : '#e2e8f0'
                    }}>
                      <span style={{
                        ...styles.switchThumb,
                        transform: includeSignatures ? 'translateX(16px)' : 'translateX(0px)'
                      }} />
                    </span>
                  </label>
                </div>

                {includeSignatures && (
                  <div style={styles.signaturesContainer}>
                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>Arrendador / Propietario</label>
                      <input 
                        type="text" 
                        placeholder="Nombre completo..." 
                        value={landlordName} 
                        onChange={(e) => setLandlordName(e.target.value)}
                        style={styles.textInput}
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>Arrendatario / Inquilino</label>
                      <input 
                        type="text" 
                        placeholder="Nombre completo..." 
                        value={tenantName} 
                        onChange={(e) => setTenantName(e.target.value)}
                        style={styles.textInput}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Plano de Distribución (si tiene) */}
              {hasFloorPlan && (
                <div style={styles.rowCard}>
                  <div style={styles.rowLeft}>
                    <div style={styles.iconCircle}>
                      <Layers size={15} color="#0f172a" />
                    </div>
                    <div>
                      <span style={styles.fieldLabel}>Plano de distribución</span>
                      <span style={styles.fieldSubLabel}>Incluir plano y código QR en el PDF</span>
                    </div>
                  </div>
                  <label style={styles.switchContainer}>
                    <input 
                      type="checkbox" 
                      checked={includeFloorPlan} 
                      onChange={(e) => setIncludeFloorPlan(e.target.checked)}
                      style={styles.hiddenCheckbox}
                    />
                    <span style={{
                      ...styles.switchTrack,
                      backgroundColor: includeFloorPlan ? '#0f172a' : '#e2e8f0'
                    }}>
                      <span style={{
                        ...styles.switchThumb,
                        transform: includeFloorPlan ? 'translateX(16px)' : 'translateX(0px)'
                      }} />
                    </span>
                  </label>
                </div>
              )}

              {/* Botón Principal Generar */}
              <button 
                type="button" 
                onClick={handleGeneratePdf}
                style={styles.generateBtn}
              >
                <FileCheck size={17} />
                <span>Generar PDF</span>
              </button>

            </div>
          )}

          {/* 2. ESTADO DE CARGA */}
          {step === 'generating' && (
            <div style={styles.loadingBox}>
              <div style={styles.spinnerCircle}>
                <Loader2 size={32} color="#0f172a" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <h4 style={styles.loadingTitle}>Generando documento...</h4>
              <p style={styles.loadingSub}>
                Renderizando el PDF oficial con Puppeteer. Un momento por favor.
              </p>
            </div>
          )}

          {/* 3. ESTADO DE ÉXITO (DESCARGAR, COPIAR LINK, MANDAR POR WHATSAPP) */}
          {step === 'success' && pdfData && (
            <div style={styles.successContainer}>
              
              {selectedInsuranceObj && (
                <div style={styles.badgeRow}>
                  <img 
                    src={selectedInsuranceObj.logo} 
                    alt={selectedInsuranceObj.name} 
                    style={{ height: 18, objectFit: 'contain' }} 
                  />
                  <span style={styles.insurancePillText}>
                    Formato oficial {selectedInsuranceObj.label}
                  </span>
                </div>
              )}

              {/* 3 Acciones principales */}
              <div style={styles.actionsList}>
                
                {/* 1. DESCARGAR PDF */}
                <button 
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={styles.actionBtn}
                >
                  <div style={styles.actionIconBox}>
                    {isDownloading ? (
                      <Loader2 size={18} color="#0f172a" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Download size={18} color="#0f172a" />
                    )}
                  </div>
                  <div style={styles.actionTextBox}>
                    <strong style={styles.actionTitle}>Descargar PDF</strong>
                    <span style={styles.actionDesc}>Guardar archivo en tu dispositivo</span>
                  </div>
                  <ArrowRight size={15} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                </button>

                {/* 2. COPIAR LINK */}
                <button 
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    ...styles.actionBtn,
                    borderColor: copiedLink ? '#16a34a' : '#e2e8f0',
                    backgroundColor: copiedLink ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <div style={{ 
                    ...styles.actionIconBox, 
                    backgroundColor: copiedLink ? '#dcfce7' : '#f8fafc',
                  }}>
                    {copiedLink ? (
                      <Check size={18} color="#16a34a" strokeWidth={3} />
                    ) : (
                      <Copy size={18} color="#0f172a" />
                    )}
                  </div>
                  <div style={styles.actionTextBox}>
                    <strong style={{ 
                      ...styles.actionTitle, 
                      color: copiedLink ? '#16a34a' : '#0f172a' 
                    }}>
                      {copiedLink ? '¡Link copiado!' : 'Copiar link'}
                    </strong>
                    <span style={{ 
                      ...styles.actionDesc, 
                      color: copiedLink ? '#15803d' : '#64748b' 
                    }}>
                      {copiedLink ? 'Enlace copiado al portapapeles' : 'Compartir enlace web'}
                    </span>
                  </div>
                  <ArrowRight size={15} color={copiedLink ? '#16a34a' : '#94a3b8'} style={{ marginLeft: 'auto' }} />
                </button>

                {/* 3. MANDAR POR WHATSAPP */}
                <button 
                  type="button"
                  onClick={handleWhatsApp}
                  style={styles.actionBtn}
                >
                  <div style={{ ...styles.actionIconBox, backgroundColor: '#ecfdf5' }}>
                    <MessageCircle size={18} color="#10b981" />
                  </div>
                  <div style={styles.actionTextBox}>
                    <strong style={styles.actionTitle}>Enviar por WhatsApp</strong>
                    <span style={styles.actionDesc}>Compartir por mensaje</span>
                  </div>
                  <ArrowRight size={15} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                </button>

              </div>

              {/* Botón de cierre */}
              <div style={{ marginTop: 6 }}>
                <button 
                  type="button" 
                  onClick={onClose}
                  style={styles.doneBtn}
                >
                  Listo
                </button>
              </div>

            </div>
          )}

          {/* 4. ESTADO DE ERROR */}
          {step === 'error' && (
            <div style={styles.errorBox}>
              <div style={styles.errorIconCircle}>
                <AlertCircle size={26} color="#dc2626" />
              </div>
              <h4 style={styles.errorTitle}>No se pudo generar el PDF</h4>
              <p style={styles.errorDesc}>{errorMessage}</p>
              <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setStep('config')}
                  style={styles.retryBtn}
                >
                  Reintentar
                </button>
                <button 
                  type="button" 
                  onClick={onClose}
                  style={styles.cancelBtn}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        </div>
    </BottomSheet>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100%',
    maxHeight: '100dvh',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 9999,
    padding: 0,
    margin: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  sheet: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: '480px',
    borderRadius: '24px 24px 0 0',
    overflow: 'hidden',
    boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.22)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '92vh',
    padding: 0,
    margin: 0,
    boxSizing: 'border-box',
  },
  header: {
    padding: '16px 14px 12px 14px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#ffffff',
    flexShrink: 0,
    boxSizing: 'border-box',
    width: '100%',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '320px',
  },
  closeBtn: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  body: {
    padding: '8px 12px 28px 12px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxSizing: 'border-box',
    width: '100%',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    boxSizing: 'border-box',
  },
  rowCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px 12px',
    boxSizing: 'border-box',
    width: '100%',
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fieldCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxSizing: 'border-box',
    width: '100%',
  },
  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    display: 'block',
  },
  fieldSubLabel: {
    fontSize: '11px',
    color: '#64748b',
    display: 'block',
    marginTop: '1px',
  },
  insuranceRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '4px',
    width: '100%',
    boxSizing: 'border-box',
  },
  insuranceCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 6px',
    borderRadius: '11px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    userSelect: 'none',
    boxSizing: 'border-box',
  },
  insuranceCardActive: {
    backgroundColor: '#f8fafc',
    border: '2px solid #0f172a',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
  },
  insuranceCardInactive: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    opacity: 0.75,
  },
  cardCheckCircle: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  logoWrap: {
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insuranceImg: {
    maxHeight: '22px',
    maxWidth: '90px',
    objectFit: 'contain',
  },
  cardLabel: {
    fontSize: '12px',
    textAlign: 'center',
  },
  statusPill: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 7px',
    borderRadius: '14px',
  },
  selectInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '7px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    color: '#0f172a',
    outline: 'none',
  },
  dateInput: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '7px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    color: '#0f172a',
    outline: 'none',
  },
  switchContainer: {
    position: 'relative',
    display: 'inline-block',
    width: '36px',
    height: '20px',
    cursor: 'pointer',
  },
  hiddenCheckbox: {
    opacity: 0,
    width: 0,
    height: 0,
    position: 'absolute',
  },
  switchTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '20px',
    transition: '0.2s',
  },
  switchThumb: {
    position: 'absolute',
    content: '""',
    height: '14px',
    width: '14px',
    left: '3px',
    bottom: '3px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: '0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
  },
  signaturesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '6px',
    borderTop: '1px dashed #e2e8f0',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  inputLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
  },
  textInput: {
    padding: '7px 10px',
    borderRadius: '7px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    color: '#0f172a',
    outline: 'none',
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '10px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.12)',
    transition: 'all 0.18s',
  },
  // ESTADO DE CARGA
  loadingBox: {
    padding: '30px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  spinnerCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  loadingTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  loadingSub: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.4,
    maxWidth: '280px',
  },
  // ESTADO DE ÉXITO
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingTop: '2px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    alignSelf: 'flex-start',
  },
  insurancePillText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '2px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '11px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  actionIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '9px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTextBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  actionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
  },
  actionDesc: {
    fontSize: '11px',
    color: '#64748b',
  },
  doneBtn: {
    width: '100%',
    padding: '11px',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '9px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // ESTADO DE ERROR
  errorBox: {
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  errorIconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  errorTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#991b1b',
    margin: '0 0 4px 0',
  },
  errorDesc: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  retryBtn: {
    flex: 1,
    padding: '9px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    padding: '9px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};
