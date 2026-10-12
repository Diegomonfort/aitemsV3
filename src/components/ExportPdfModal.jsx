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
  ArrowRight,
  Eye,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';
import aitemsLogo from '../assets/logo-color.png';
import logoAnda from '../assets/logoAnda.webp';
import logoSancor from '../assets/logoSancor.webp';
import { pdfService } from '../services/pdfService';
import { propertyService } from '../services/propertyService';
import { supabase } from '../lib/supabase';
import BottomSheet from './BottomSheet';
import MobilePdfCanvasViewer from './MobilePdfCanvasViewer';

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
  initialStep,
  initialPdfData,
}) {
  // Pasos: 'actions' | 'config' | 'generating' | 'viewer' | 'error'
  const [step, setStep] = useState('config');
  const [pdfData, setPdfData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCheckingPdf, setIsCheckingPdf] = useState(false);

  // 1. Logo
  const [includeLogo, setIncludeLogo] = useState(true);
  
  // 2. Fecha (Última actualización vs Personalizada)
  const extractDate = (prop) => {
    const raw = prop?.updatedAt || prop?.updated_at || prop?.lastUpdated;
    if (raw && typeof raw === 'string' && raw.includes('T')) {
      return raw.split('T')[0];
    }
    if (raw && typeof raw === 'string') return raw;
    return new Date().toISOString().split('T')[0];
  };

  const [lastUpdateDate, setLastUpdateDate] = useState(() => extractDate(property));
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

  // 6. Orden de los ambientes (categories.position)
  const [showRoomOrder, setShowRoomOrder] = useState(false);
  const [orderedRooms, setOrderedRooms] = useState([]);

  // Sincronizar estado al abrir o cuando cambia de propiedad
  useEffect(() => {
    if (!isOpen || !property) return;

    setShowRoomOrder(false);
    setErrorMessage('');
    setCopiedLink(false);
    setIsDownloading(false);

    const currentInsurance = getInitialInsurance(property);
    setSelectedInsurance(currentInsurance);

    setTenantName(property.tenant || '');
    setLandlordName(property.lessor || '');
    const hasSigs = !!(property.tenant?.trim() || property.lessor?.trim());
    setIncludeSignatures(hasSigs);

    const basePropDate = extractDate(property);
    setLastUpdateDate(basePropDate);
    setCustomDate(basePropDate);
    setDateOption('updated');
    setIncludeLogo(true);

    const localHasPlan = !!(property?.floorPlan?.shapes?.length || property?.floorPlan || property?.shapes?.length);
    setHasFloorPlan(localHasPlan);
    setIncludeFloorPlan(localHasPlan);

    // Cargar ambientes ordenados de la propiedad (categories.position)
    const baseAmbientes = Array.isArray(property?.ambientes) && property.ambientes.length > 0
      ? property.ambientes
      : Array.isArray(property?.categories) && property.categories.length > 0
      ? property.categories
      : [];

    const sortedBase = [...baseAmbientes].sort((a, b) => {
      const posA = a.position !== undefined && a.position !== null ? Number(a.position) : 999;
      const posB = b.position !== undefined && b.position !== null ? Number(b.position) : 999;
      return posA - posB;
    });
    setOrderedRooms(sortedBase);

    // Traer los ambientes actualizados desde categories para asegurar posiciones y IDs reales
    if (property?.id) {
      supabase
        .from('categories')
        .select('*')
        .eq('property_id', property.id)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
        .then(({ data: cats, error }) => {
          if (!error && Array.isArray(cats) && cats.length > 0) {
            const enriched = cats.map((cat, idx) => {
              const match = sortedBase.find((b) => b.id === cat.id || b.name === cat.name);
              return {
                ...cat,
                position: cat.position !== undefined && cat.position !== null ? cat.position : idx,
                itemsCount: match?.itemsCount ?? (match?.items ? match.items.length : undefined),
              };
            });
            setOrderedRooms(enriched);
          }
        })
        .catch(() => {});
    }

    // Detección inicial de PDF existente en el objeto local
    const localExistingPdf = initialPdfData || property.pdf || (property.pdf_url ? {
      id: property.pdf_id,
      pdf_id: property.pdf_id,
      pdf_url: property.pdf_url,
      updated_at: property.updated_at || property.updatedAt,
    } : null);

    if (initialStep) {
      setStep(initialStep);
    } else if (localExistingPdf?.pdf_url) {
      setStep('actions');
    } else {
      setStep('config');
    }

    setPdfData(localExistingPdf || null);

    // Consulta remota siempre fresca para verificar si ya existe PDF o si cambió
    if (property?.id) {
      setIsCheckingPdf(true);
      pdfService.getPropertyPdf(property.id)
        .then((res) => {
          if (res && res.hasPdf && res.pdf?.pdf_url) {
            setPdfData(res.pdf);
            if (property) {
              property.pdf = res.pdf;
              property.hasPdf = true;
            }
            if (!initialStep) {
              setStep('actions');
            }
          }
        })
        .catch((err) => console.warn('[ExportPdfModal] Error consultando PDF fresco:', err))
        .finally(() => setIsCheckingPdf(false));

      // Consultar la última modificación real registrada en el historial (property_logs), excluyendo la generación de PDFs
      propertyService
        .getPropertyLogs(property.id, { limit: 10 })
        .then((res) => {
          if (res?.success && Array.isArray(res.logs) && res.logs.length > 0) {
            const topLog = res.logs.find((l) => l.entity_type !== 'pdf') || res.logs[0];
            if (topLog?.created_at) {
              const logDate = topLog.created_at.split('T')[0];
              if (logDate && logDate >= basePropDate) {
                setLastUpdateDate(logDate);
                setCustomDate(logDate);
              }
            }
          }
        })
        .catch(() => {});

      propertyService.getFloorPlan(property.id)
        .then(res => {
          const shapes = res?.floorPlan?.shapes || res?.plan?.shapes || res?.data?.shapes || res?.shapes;
          const exists = Array.isArray(shapes) && shapes.length > 0;
          setHasFloorPlan(exists);
          setIncludeFloorPlan(exists);
        })
        .catch(() => {});
    }
  }, [isOpen, property?.id]);

  if (!isOpen || !property) return null;

  const toggleInsurance = (id) => {
    setSelectedInsurance(prev => (prev === id ? null : id));
  };

  const formatShortDate = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('T')[0].split('-');
    if (parts.length < 3) return isoStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Reordenar ambientes y persistir en la base de datos (campo position)
  const persistRoomOrder = async (roomsToPersist) => {
    if (!property?.id || !Array.isArray(roomsToPersist) || roomsToPersist.length === 0) return;
    try {
      const ids = roomsToPersist.map((r) => r.id).filter(Boolean);
      if (ids.length > 0) {
        await propertyService.reorderCategories(property.id, ids);
      }
      if (onUpdateProperty) {
        onUpdateProperty(property.id, {
          ambientes: roomsToPersist,
          rooms: roomsToPersist.map((r) => r.name),
        });
      }
      property.ambientes = roomsToPersist;
      property.rooms = roomsToPersist.map((r) => r.name);
    } catch (err) {
      console.error('Error al persistir orden de ambientes:', err);
    }
  };

  const handleMoveRoom = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedRooms.length) return;

    const updated = [...orderedRooms];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reindexed = updated.map((r, i) => ({ ...r, position: i }));
    setOrderedRooms(reindexed);
    persistRoomOrder(reindexed);
  };

  // Acción de generación de PDF en backend
  const handleGeneratePdf = async () => {
    try {
      setStep('generating');
      setErrorMessage('');

      // Asegurar que el orden de ambientes esté guardado en base de datos antes de llamar al backend
      if (orderedRooms.length > 0) {
        const ids = orderedRooms.map((r) => r.id).filter(Boolean);
        if (ids.length > 0) {
          await propertyService.reorderCategories(property.id, ids);
        }
        if (onUpdateProperty) {
          onUpdateProperty(property.id, {
            ambientes: orderedRooms,
            rooms: orderedRooms.map((r) => r.name),
          });
        }
        property.ambientes = orderedRooms;
        property.rooms = orderedRooms.map((r) => r.name);
      }

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
        customDate: dateOption === 'custom' ? customDate : (lastUpdateDate || null),
        showLogo: includeLogo,
        includePlano: hasFloorPlan ? includeFloorPlan : false,
        typeSeguro: effectiveInsurance || 'none',
      };

      // Llamada al backend
      const result = await pdfService.generatePropertyPdf(property.id, targetUserId, options);

      if (!result.success || !result.pdf_id) {
        throw new Error(result.message || 'Error al procesar el archivo PDF');
      }

      const freshPdf = {
        id: result.pdf_id,
        pdf_id: result.pdf_id,
        pdf_url: result.pdf_url,
        updated_at: new Date().toISOString(),
      };

      // Actualizar estado en vivo en memoria de App.jsx cuando la generación tiene éxito
      if (onUpdateProperty) {
        onUpdateProperty(property.id, {
          typeSeguro: effectiveInsurance,
          lessor: cleanLessor || null,
          tenant: cleanTenant || null,
          pdf: freshPdf,
          hasPdf: true,
          ambientes: orderedRooms,
          rooms: orderedRooms.map((r) => r.name),
        });
      }
      property.typeSeguro = effectiveInsurance;
      property.lessor = cleanLessor || null;
      property.tenant = cleanTenant || null;
      property.pdf = freshPdf;
      property.hasPdf = true;

      setPdfData(freshPdf);
      setStep('actions');
      toast.success('Documento PDF generado exitosamente');
    } catch (err) {
      console.error('Error generando PDF:', err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado al generar el PDF.');
      setStep('error');
    }
  };

  // Acciones en la pantalla de opciones / éxito
  const getPdfViewerUrl = () => {
    if (!pdfData?.pdf_id && !pdfData?.id) return '';
    const id = pdfData.pdf_id || pdfData.id;
    const origin = window.location.origin;
    return `${origin}/pdf/${id}`;
  };

  const handleDownload = async () => {
    if (!pdfData?.pdf_url) return;
    try {
      setIsDownloading(true);
      await pdfService.downloadPdfFile(pdfData.pdf_url, property.name || 'inventario');
      toast.success('Descarga iniciada');
    } catch (err) {
      toast.error('Error descargando el PDF. Podés copiar el link para compartirlo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    const url = getPdfViewerUrl() || pdfData?.pdf_url;
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
    const url = getPdfViewerUrl() || pdfData?.pdf_url;
    const propName = property.name || 'Propiedad';
    const message = `Inventario Propiedad: *${propName}*\n\nVer PDF: ${url}`;
    const encoded = encodeURIComponent(message);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const waUrl = isMobile ? `whatsapp://send?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenExternal = () => {
    if (pdfData?.pdf_url) {
      window.open(pdfData.pdf_url, '_blank');
    }
  };

  const selectedInsuranceObj = INSURANCE_OPTIONS.find(o => o.id === selectedInsurance);
  const hasExistingPdf = Boolean(pdfData?.pdf_url);

  // Título y subtítulo dinámico según paso
  let sheetTitle = 'Exportar Inventario';
  let sheetSubtitle = property.name;

  if (step === 'actions') {
    sheetTitle = 'Inventario Oficial (PDF)';
    sheetSubtitle = `${property.name} — Documento listo para consultar`;
  } else if (step === 'viewer') {
    sheetTitle = 'Visor de Inventario';
    sheetSubtitle = property.name;
  } else if (step === 'config') {
    sheetTitle = hasExistingPdf ? 'Rehacer Inventario (PDF)' : 'Exportar Inventario (PDF)';
    sheetSubtitle = hasExistingPdf ? 'Modificá opciones y generá una nueva versión' : property.name;
  } else if (step === 'generating') {
    sheetTitle = 'Generando documento';
    sheetSubtitle = 'Renderizando versión oficial';
  } else if (step === 'error') {
    sheetTitle = 'Error al exportar';
    sheetSubtitle = 'Ocurrió un problema';
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={step === 'generating' ? () => {} : onClose}
      title={sheetTitle}
      subtitle={sheetSubtitle}
      size="full"
      className={step === 'viewer' ? 'bs-sheet-viewer' : ''}
      bodyClassName={step === 'viewer' ? 'bs-body-viewer' : ''}
      showBackButton={step === 'viewer' || (step === 'config' && hasExistingPdf)}
      onBack={() => setStep('actions')}
      backLabel="Volver a opciones"
    >
      <div 
        className="export-pdf-body no-scrollbar" 
        style={{
          ...styles.body,
          ...(step === 'viewer' ? styles.viewerBodyWrapper : {}),
        }}
      >

        {/* ── PASO 1: ACCIONES DISPONIBLES CUANDO YA EXISTE PDF (O TRAS GENERARLO) ── */}
        {step === 'actions' && pdfData && (
          <div style={styles.actionsContainer}>
            
            {/* Tarjeta de estado del documento */}
            <div style={styles.documentStatusCard}>
              <div style={styles.docStatusTop}>
                <div style={styles.docStatusBadge}>
                  <FileCheck size={14} color="#16a34a" strokeWidth={2.5} />
                  <span>Documento oficial disponible</span>
                </div>
                {pdfData.updated_at && (
                  <span style={styles.docStatusDate}>
                    {formatShortDate(pdfData.updated_at)}
                  </span>
                )}
              </div>

              {selectedInsuranceObj && (
                <div style={styles.insurancePillRow}>
                  <img 
                    src={selectedInsuranceObj.logo} 
                    alt={selectedInsuranceObj.name} 
                    style={{ height: 16, objectFit: 'contain' }} 
                  />
                  <span style={styles.insurancePillText}>
                    Formato oficial {selectedInsuranceObj.label}
                  </span>
                </div>
              )}
            </div>

            {/* Listado de 5 opciones principales adaptadas a mobile */}
            <div style={styles.actionsList}>
              
              {/* 1. VER INVENTARIO OFICIAL */}
              <button 
                type="button"
                onClick={() => setStep('viewer')}
                style={styles.actionBtn}
              >
                <div style={{ ...styles.actionIconBox, backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <Eye size={20} strokeWidth={2.3} />
                </div>
                <div style={styles.actionTextBox}>
                  <strong style={styles.actionTitle}>Ver inventario oficial</strong>
                  <span style={styles.actionDesc}>Visualizar el documento completo en el visor interactivo</span>
                </div>
                <ArrowRight size={16} color="#94a3b8" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </button>

              {/* 2. DESCARGAR PDF */}
              <button 
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                style={styles.actionBtn}
              >
                <div style={{ ...styles.actionIconBox, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  {isDownloading ? (
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Download size={20} strokeWidth={2.3} />
                  )}
                </div>
                <div style={styles.actionTextBox}>
                  <strong style={styles.actionTitle}>Descargar archivo PDF</strong>
                  <span style={styles.actionDesc}>Guardar copia del documento en tu dispositivo</span>
                </div>
                <ArrowRight size={16} color="#94a3b8" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </button>

              {/* 3. COPIAR LINK PÚBLICO */}
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
                  color: copiedLink ? '#16a34a' : '#0f172a'
                }}>
                  {copiedLink ? (
                    <Check size={20} strokeWidth={3} />
                  ) : (
                    <Copy size={20} strokeWidth={2.2} />
                  )}
                </div>
                <div style={styles.actionTextBox}>
                  <strong style={{ 
                    ...styles.actionTitle, 
                    color: copiedLink ? '#16a34a' : '#0f172a' 
                  }}>
                    {copiedLink ? '¡Enlace copiado!' : 'Copiar enlace de acceso'}
                  </strong>
                  <span style={{ 
                    ...styles.actionDesc, 
                    color: copiedLink ? '#15803d' : '#64748b' 
                  }}>
                    {copiedLink ? 'Enlace copiado al portapapeles' : 'Compartir enlace para visualización directa'}
                  </span>
                </div>
                <ArrowRight size={16} color={copiedLink ? '#16a34a' : '#94a3b8'} style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </button>

              {/* 4. ENVIAR POR WHATSAPP */}
              <button 
                type="button"
                onClick={handleWhatsApp}
                style={styles.actionBtn}
              >
                <div style={{ ...styles.actionIconBox, backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <MessageCircle size={20} strokeWidth={2.3} />
                </div>
                <div style={styles.actionTextBox}>
                  <strong style={styles.actionTitle}>Enviar por WhatsApp</strong>
                  <span style={styles.actionDesc}>Compartir con propietarios o inquilinos</span>
                </div>
                <ArrowRight size={16} color="#94a3b8" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </button>

              {/* 5. VOLVER A GENERAR (REHACER) */}
              <button 
                type="button"
                onClick={() => setStep('config')}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: '#fffdf5',
                  borderColor: '#fef08a'
                }}
              >
                <div style={{ ...styles.actionIconBox, backgroundColor: '#fef9c3', color: '#ca8a04' }}>
                  <RotateCcw size={19} strokeWidth={2.3} />
                </div>
                <div style={styles.actionTextBox}>
                  <strong style={styles.actionTitle}>Volver a generar / Rehacer</strong>
                  <span style={styles.actionDesc}>Modificar opciones y crear una nueva versión del acta</span>
                </div>
                <ArrowRight size={16} color="#ca8a04" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </button>

            </div>

            {/* Botón de cierre inferior */}
            <div style={{ marginTop: 10 }}>
              <button 
                type="button" 
                onClick={onClose}
                style={styles.doneBtn}
              >
                Cerrar
              </button>
            </div>

          </div>
        )}

        {/* ── PASO 2: VISOR INTERACTIVO EN MOBILE (CANVAS RETINA AUTO-FIT) ── */}
        {step === 'viewer' && pdfData && (
          <MobilePdfCanvasViewer
            pdfUrl={pdfData.pdf_url}
            propertyName={property.name}
            onDownload={handleDownload}
            onWhatsApp={handleWhatsApp}
            onCopyLink={handleCopyLink}
            onOpenExternal={handleOpenExternal}
            copiedLink={copiedLink}
            isDownloading={isDownloading}
          />
        )}

        {/* ── PASO 3: CONFIGURACIÓN DE PARÁMETROS PARA GENERAR O REHACER ── */}
        {step === 'config' && (
          <div style={styles.formContainer}>

            {/* Aviso si ya existe PDF */}
            {hasExistingPdf && (
              <div style={styles.reGenerateNotice}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RotateCcw size={16} color="#854d0e" />
                  <strong style={{ fontSize: 13, color: '#854d0e' }}>
                    Rehacer inventario
                  </strong>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#a16207', lineHeight: 1.4 }}>
                  Al generar, se sobrescribirá el PDF anterior con los nuevos datos que configures aquí.
                </p>
              </div>
            )}
            
            {/* 1. SECCIÓN: SEGURO DE ALQUILER */}
            <div style={styles.fieldCard}>
              <div style={styles.fieldHeaderBetween}>
                <div style={styles.fieldHeader}>
                  <div style={styles.iconCircle}>
                    <Shield size={16} color="#0f172a" />
                  </div>
                  <div>
                    <span style={styles.fieldLabel}>Seguro de alquiler</span>
                    <span style={styles.fieldSubLabel}>Elegí una garantía o desmarcala para inventario estándar</span>
                  </div>
                </div>
                <span style={{
                  ...styles.statusBadgeSmall,
                  backgroundColor: selectedInsurance ? '#0f172a' : '#f1f5f9',
                  color: selectedInsurance ? '#ffffff' : '#64748b',
                }}>
                  {selectedInsurance ? (selectedInsurance === 'anda' ? 'ANDA' : 'Sancor') : 'Estándar'}
                </span>
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
                          <Check size={11} strokeWidth={3.5} color="#ffffff" />
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
                        fontWeight: isSelected ? '700' : '600',
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

            {/* 2. SECCIÓN: ORDEN DE LOS AMBIENTES (NUEVO - como en Desktop 3) */}
            <div style={styles.fieldCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={styles.iconCircle}>
                    <ArrowUpDown size={16} color="#0f172a" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={styles.fieldLabel}>Orden de los ambientes</span>
                      {orderedRooms.length > 0 && (
                        <span style={styles.roomsCountBadge}>
                          {orderedRooms.length}
                        </span>
                      )}
                    </div>
                    <span style={styles.fieldSubLabel}>
                      {showRoomOrder
                        ? 'Usá las flechas para ordenar qué ambientes van primero'
                        : 'Personalizar qué ambientes aparecen primero en el PDF'}
                    </span>
                  </div>
                </div>

                <label style={styles.switchContainer} title="Mostrar / ocultar reordenador de ambientes">
                  <input 
                    type="checkbox" 
                    checked={showRoomOrder} 
                    onChange={(e) => setShowRoomOrder(e.target.checked)}
                    style={styles.hiddenCheckbox}
                  />
                  <span style={{
                    ...styles.switchTrack,
                    backgroundColor: showRoomOrder ? '#0f172a' : '#e2e8f0'
                  }}>
                    <span style={{
                      ...styles.switchThumb,
                      transform: showRoomOrder ? 'translateX(16px)' : 'translateX(0px)'
                    }} />
                  </span>
                </label>
              </div>

              {/* Si está colapsado, mostrar un resumen visual rápido del orden actual */}
              {!showRoomOrder && orderedRooms.length > 0 && (
                <div style={styles.roomsSummaryBox}>
                  <div style={styles.roomsPillList}>
                    {orderedRooms.slice(0, 5).map((r, i) => (
                      <span key={r.id || i} style={styles.roomsSummaryPill}>
                        <span style={{ color: '#94a3b8', marginRight: 4, fontWeight: 700 }}>{i + 1}</span>
                        {r.name}
                      </span>
                    ))}
                    {orderedRooms.length > 5 && (
                      <span style={styles.roomsSummaryMore}>
                        +{orderedRooms.length - 5} más
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Si está expandido, mostrar lista interactiva con flechas de ordenación */}
              {showRoomOrder && (
                <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  {orderedRooms.length === 0 ? (
                    <div style={styles.emptyRoomsBox}>
                      No se encontraron ambientes registrados en esta propiedad
                    </div>
                  ) : (
                    <div style={styles.roomsListContainer}>
                      {orderedRooms.map((room, idx) => (
                        <div
                          key={room.id || `room-${idx}-${room.name}`}
                          style={styles.roomRow}
                        >
                          <div style={styles.roomPositionPill}>
                            {idx + 1}
                          </div>

                          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={styles.roomNameText}>{room.name}</span>
                            {room.itemsCount !== undefined && room.itemsCount !== null && (
                              <span style={styles.roomItemsBadge}>
                                {room.itemsCount} {room.itemsCount === 1 ? 'ítem' : 'ítems'}
                              </span>
                            )}
                          </div>

                          <div style={styles.roomOrderButtons}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveRoom(idx, -1)}
                              title="Subir de posición"
                              style={{
                                ...styles.orderArrowBtn,
                                ...(idx === 0 ? styles.orderArrowBtnDisabled : {})
                              }}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === orderedRooms.length - 1}
                              onClick={() => handleMoveRoom(idx, 1)}
                              title="Bajar de posición"
                              style={{
                                ...styles.orderArrowBtn,
                                ...(idx === orderedRooms.length - 1 ? styles.orderArrowBtnDisabled : {})
                              }}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. SECCIÓN: OPCIONES DE DOCUMENTO (Agrupadas limpiamente estilo tarjeta) */}
            <div style={styles.settingsGroupCard}>

              {/* Fecha del documento */}
              <div style={styles.settingsGroupItem}>
                <div style={styles.rowLeft}>
                  <div style={styles.iconCircle}>
                    <Calendar size={16} color="#0f172a" />
                  </div>
                  <div>
                    <span style={styles.fieldLabel}>Fecha del documento</span>
                    <span style={styles.fieldSubLabel}>Encabezado oficial del reporte</span>
                  </div>
                </div>

                <div style={{ width: '100%', marginTop: 8 }}>
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
                      style={{ ...styles.dateInput, marginTop: 6 }}
                    />
                  )}
                </div>
              </div>

              <div style={styles.settingsGroupDivider} />

              {/* Incluir Logo */}
              <div style={styles.settingsGroupRow}>
                <div style={styles.rowLeft}>
                  <div style={styles.iconCircle}>
                    <ImageIcon size={16} color="#0f172a" />
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

              {/* Plano de Distribución (si tiene) */}
              {hasFloorPlan && (
                <>
                  <div style={styles.settingsGroupDivider} />
                  <div style={styles.settingsGroupRow}>
                    <div style={styles.rowLeft}>
                      <div style={styles.iconCircle}>
                        <Layers size={16} color="#0f172a" />
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
                </>
              )}

              <div style={styles.settingsGroupDivider} />

              {/* Incluir Firmas */}
              <div style={{ ...styles.settingsGroupItem, paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={styles.rowLeft}>
                    <div style={styles.iconCircle}>
                      <UserCheck size={16} color="#0f172a" />
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

            </div>

            {/* 4. BOTÓN PRINCIPAL */}
            <div style={{ marginTop: 6, marginBottom: 8 }}>
              <button 
                type="button" 
                onClick={handleGeneratePdf}
                style={{
                  ...styles.generateBtn,
                  backgroundColor: hasExistingPdf ? '#0f172a' : '#4f46e5',
                }}
              >
                {hasExistingPdf ? (
                  <>
                    <RotateCcw size={18} />
                    <span>Re-generar PDF Oficial</span>
                  </>
                ) : (
                  <>
                    <FileCheck size={18} />
                    <span>Generar PDF de Inventario</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* ── PASO 4: ESTADO DE CARGA ── */}
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

        {/* ── PASO 5: ESTADO DE ERROR ── */}
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
  viewerBodyWrapper: {
    height: '100%',
    flex: 1,
    overflow: 'hidden',
    touchAction: 'pan-x pan-y',
    padding: 0,
    margin: 0,
    gap: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  // ACCIONES / PASO INVENTARIO EXISTENTE
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  documentStatusCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  docStatusTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docStatusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#16a34a',
  },
  docStatusDate: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '500',
  },
  insurancePillRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    paddingTop: '6px',
    borderTop: '1px solid #edf2f7',
  },
  insurancePillText: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  actionIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTextBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  actionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
  },
  actionDesc: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: 1.3,
  },
  doneBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // VISOR INTERACTIVO
  viewerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    height: '100%',
    minHeight: '520px',
  },
  viewerHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 2px',
  },
  viewerBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    padding: '3px 7px',
    borderRadius: '6px',
  },
  viewerPropName: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '140px',
  },
  viewerActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#0f172a',
    fontWeight: '500',
  },
  iframeWrapper: {
    flex: 1,
    minHeight: '420px',
    height: 'calc(75vh - 120px)',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  viewerFooterBar: {
    marginTop: '4px',
  },
  openExternalFullBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // FORMULARIO DE CONFIGURACIÓN
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    boxSizing: 'border-box',
  },
  reGenerateNotice: {
    backgroundColor: '#fefce8',
    border: '1px solid #fef08a',
    borderRadius: '12px',
    padding: '10px 12px',
    marginBottom: '2px',
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
  fieldHeaderBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statusBadgeSmall: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '8px',
    letterSpacing: '0.2px',
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
  roomsCountBadge: {
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2px 7px',
    borderRadius: '10px',
  },
  roomsSummaryBox: {
    padding: '8px 10px',
    backgroundColor: '#f8fafc',
    borderRadius: '9px',
    border: '1px solid #f1f5f9',
    marginTop: '4px',
  },
  roomsPillList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  roomsSummaryPill: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '2px 8px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  roomsSummaryMore: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    padding: '2px 4px',
  },
  emptyRoomsBox: {
    padding: '14px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
  },
  roomsListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '260px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingRight: '2px',
    marginTop: '6px',
  },
  roomRow: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '9px',
    padding: '7px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    userSelect: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  roomPositionPill: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roomNameText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roomItemsBadge: {
    fontSize: '11px',
    color: '#64748b',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '1px 6px',
    flexShrink: 0,
  },
  roomOrderButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
  },
  orderArrowBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    touchAction: 'manipulation',
  },
  orderArrowBtnDisabled: {
    opacity: 0.25,
    cursor: 'not-allowed',
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    color: '#94a3b8',
  },
  settingsGroupCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'hidden',
  },
  settingsGroupItem: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
  },
  settingsGroupRow: {
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  settingsGroupDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    width: '100%',
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
