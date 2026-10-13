import React, { useState, useEffect } from 'react';
import { toast } from '../context/ToastContext';
import { 
  Download,
  Copy,
  MessageCircle,
  Check,
  Loader2,
  AlertCircle,
  FileCheck,
  Eye,
  RotateCcw,
  ChevronUp,
  ChevronDown,
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

  // 6. Orden de los ambientes (categories.position) y paneles desplegables
  const [showRoomOrder, setShowRoomOrder] = useState(false);
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [orderedRooms, setOrderedRooms] = useState([]);

  // Sincronizar estado al abrir o cuando cambia de propiedad
  useEffect(() => {
    if (!isOpen || !property) return;

    setShowRoomOrder(false);
    setShowDatePanel(false);
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

  const getPublicWebUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location?.origin : '';
    // En Capacitor iOS/Android el origin es 'capacitor://localhost' o 'http://localhost'
    if (!origin || origin.includes('localhost') || origin.includes('capacitor')) {
      return 'https://aitemsapp.com';
    }
    return origin;
  };

  // Acciones en la pantalla de opciones / éxito
  const getPdfViewerUrl = () => {
    const id = pdfData?.pdf_id || pdfData?.id || property?.pdf?.id || property?.pdf_id;
    if (!id) return '';
    return `${getPublicWebUrl()}/pdf/${id}`;
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
  const roomsCount = orderedRooms.length;
  const dateLabel = formatShortDate(dateOption === 'custom' ? customDate : lastUpdateDate);

  // Título y subtítulo según paso
  let sheetTitle = 'Exportar PDF';
  let sheetSubtitle = property.name;

  if (step === 'actions') {
    sheetTitle = 'PDF del inventario';
  } else if (step === 'viewer') {
    sheetTitle = 'Visor de inventario';
  } else if (step === 'config') {
    sheetTitle = hasExistingPdf ? 'Rehacer PDF' : 'Exportar PDF';
  } else if (step === 'generating') {
    sheetTitle = 'Generando PDF';
  } else if (step === 'error') {
    sheetTitle = 'Error al exportar';
    sheetSubtitle = 'Ocurrió un problema';
  }

  const insuranceHint = selectedInsuranceObj
    ? `El PDF usará el formato oficial de ${selectedInsuranceObj.name}.`
    : 'Formato estándar, sin garantía de alquiler.';

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={step === 'generating' ? () => {} : onClose}
      title={sheetTitle}
      subtitle={sheetSubtitle}
      size="full"
      className={step === 'viewer' ? 'bs-sheet-export bs-sheet-viewer' : 'bs-sheet-export'}
      bodyClassName={step === 'viewer' ? 'bs-body-viewer' : ''}
      showBackButton={step === 'viewer' || (step === 'config' && hasExistingPdf)}
      onBack={() => setStep('actions')}
      backLabel="Volver"
    >
      <div
        className="export-pdf-body no-scrollbar"
        style={{
          ...styles.body,
          ...(step === 'viewer' ? styles.viewerBodyWrapper : {}),
          ...(step === 'config' ? styles.configBody : {}),
        }}
      >

        {/* ── PASO 1: PDF LISTO — ACCIONES ── */}
        {step === 'actions' && pdfData && (
          <div style={styles.actionsContainer}>

            <div style={styles.readyHero}>
              <div style={styles.readyIcon}>
                <FileCheck size={26} color="#16a34a" strokeWidth={2.2} />
              </div>
              <div style={styles.readyTitle}>Tu PDF está listo</div>
              <div style={styles.readyMeta}>
                {pdfData.updated_at ? `Generado el ${formatShortDate(pdfData.updated_at)}` : 'Documento oficial del inventario'}
                {selectedInsuranceObj ? ` · ${selectedInsuranceObj.name}` : ''}
              </div>
            </div>

            <button type="button" onClick={() => setStep('viewer')} style={styles.primaryBtn}>
              <Eye size={19} strokeWidth={2.2} />
              <span>Ver PDF</span>
            </button>

            <div style={styles.tileGrid}>
              <button type="button" onClick={handleDownload} disabled={isDownloading} style={styles.tile}>
                <div style={{ ...styles.tileIcon, backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  {isDownloading ? (
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Download size={20} strokeWidth={2.2} />
                  )}
                </div>
                <span style={styles.tileLabel}>Descargar</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  ...styles.tile,
                  borderColor: copiedLink ? '#86efac' : '#e8ecf1',
                  backgroundColor: copiedLink ? '#f0fdf4' : '#ffffff',
                }}
              >
                <div style={{
                  ...styles.tileIcon,
                  backgroundColor: copiedLink ? '#dcfce7' : '#f1f5f9',
                  color: copiedLink ? '#16a34a' : '#0f172a',
                }}>
                  {copiedLink ? <Check size={20} strokeWidth={3} /> : <Copy size={20} strokeWidth={2.2} />}
                </div>
                <span style={{ ...styles.tileLabel, color: copiedLink ? '#16a34a' : '#0f172a' }}>
                  {copiedLink ? '¡Copiado!' : 'Copiar link'}
                </span>
              </button>

              <button type="button" onClick={handleWhatsApp} style={styles.tile}>
                <div style={{ ...styles.tileIcon, backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <MessageCircle size={20} strokeWidth={2.2} />
                </div>
                <span style={styles.tileLabel}>WhatsApp</span>
              </button>
            </div>

            <button type="button" onClick={() => setStep('config')} style={styles.linkBtn}>
              <RotateCcw size={15} strokeWidth={2.3} />
              <span>Rehacer PDF con otros datos</span>
            </button>

          </div>
        )}

        {/* ── PASO 2: VISOR INTERACTIVO ── */}
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

        {/* ── PASO 3: CONFIGURACIÓN ── */}
        {step === 'config' && (
          <>
            <div style={styles.configScroll}>

              {/* 1. Tipo de documento (seguro) */}
              <SectionLabel>Tipo de documento</SectionLabel>
              <div style={styles.segmented}>
                {[{ id: null, name: 'Estándar' }, ...INSURANCE_OPTIONS].map((opt) => {
                  const isSelected = selectedInsurance === opt.id;
                  return (
                    <button
                      key={opt.id || 'none'}
                      type="button"
                      onClick={() => setSelectedInsurance(opt.id)}
                      style={{
                        ...styles.segment,
                        ...(isSelected ? styles.segmentActive : {}),
                      }}
                    >
                      {opt.logo ? (
                        <img
                          src={opt.logo}
                          alt={opt.name}
                          style={{ ...styles.segmentLogo, opacity: isSelected ? 1 : 0.5 }}
                        />
                      ) : (
                        <span style={{ ...styles.segmentText, color: isSelected ? '#0f172a' : '#64748b' }}>
                          {opt.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p style={styles.hintText}>{insuranceHint}</p>

              {/* 2. Qué incluir */}
              <SectionLabel>Incluir en el PDF</SectionLabel>
              <div style={styles.listGroup}>
                <div style={styles.listRow}>
                  <span style={styles.rowTitle}>Logo</span>
                  <Toggle checked={includeLogo} onChange={setIncludeLogo} label="Incluir logo" />
                </div>

                {hasFloorPlan && (
                  <div style={{ ...styles.listRow, ...styles.listRowDivider }}>
                    <div style={styles.rowTextBox}>
                      <span style={styles.rowTitle}>Plano de distribución</span>
                      <span style={styles.rowHint}>Con código QR</span>
                    </div>
                    <Toggle checked={includeFloorPlan} onChange={setIncludeFloorPlan} label="Incluir plano" />
                  </div>
                )}

                <div style={{ ...styles.listRow, ...styles.listRowDivider }}>
                  <span style={styles.rowTitle}>Firmas</span>
                  <Toggle checked={includeSignatures} onChange={setIncludeSignatures} label="Incluir firmas" />
                </div>

                {includeSignatures && (
                  <div style={styles.expandBox}>
                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>Propietario / Arrendador</label>
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={landlordName}
                        onChange={(e) => setLandlordName(e.target.value)}
                        style={styles.textInput}
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>Inquilino / Arrendatario</label>
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        style={styles.textInput}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Personalizar */}
              <SectionLabel>Personalizar</SectionLabel>
              <div style={styles.listGroup}>
                {/* Fecha */}
                <button
                  type="button"
                  onClick={() => setShowDatePanel((v) => !v)}
                  style={styles.listRowBtn}
                >
                  <span style={styles.rowTitle}>Fecha del documento</span>
                  <span style={styles.rowValue}>
                    <span>{dateLabel}</span>
                    {showDatePanel ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                  </span>
                </button>

                {showDatePanel && (
                  <div style={styles.expandBox}>
                    <button
                      type="button"
                      onClick={() => { setDateOption('updated'); setCustomDate(lastUpdateDate); }}
                      style={styles.radioRow}
                    >
                      <span style={{ ...styles.radioDot, ...(dateOption === 'updated' ? styles.radioDotActive : {}) }}>
                        {dateOption === 'updated' && <span style={styles.radioDotInner} />}
                      </span>
                      <span style={styles.radioText}>Última actualización ({formatShortDate(lastUpdateDate)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateOption('custom')}
                      style={styles.radioRow}
                    >
                      <span style={{ ...styles.radioDot, ...(dateOption === 'custom' ? styles.radioDotActive : {}) }}>
                        {dateOption === 'custom' && <span style={styles.radioDotInner} />}
                      </span>
                      <span style={styles.radioText}>Elegir otra fecha</span>
                    </button>
                    {dateOption === 'custom' && (
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        style={styles.dateInput}
                      />
                    )}
                  </div>
                )}

                {/* Orden de ambientes */}
                <button
                  type="button"
                  onClick={() => setShowRoomOrder((v) => !v)}
                  style={{ ...styles.listRowBtn, ...styles.listRowDivider }}
                >
                  <span style={styles.rowTitle}>Orden de ambientes</span>
                  <span style={styles.rowValue}>
                    <span>{roomsCount} {roomsCount === 1 ? 'ambiente' : 'ambientes'}</span>
                    {showRoomOrder ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                  </span>
                </button>

                {showRoomOrder && (
                  <div style={styles.expandBox}>
                    {roomsCount === 0 ? (
                      <div style={styles.emptyRoomsBox}>Esta propiedad todavía no tiene ambientes</div>
                    ) : (
                      <>
                        <p style={{ ...styles.hintText, margin: '0 0 8px 0' }}>
                          Usá las flechas para elegir qué ambiente va primero.
                        </p>
                        <div style={styles.roomsListContainer}>
                          {orderedRooms.map((room, idx) => (
                            <div key={room.id || `room-${idx}-${room.name}`} style={styles.roomRow}>
                              <span style={styles.roomPositionPill}>{idx + 1}</span>
                              <span style={styles.roomNameText}>{room.name}</span>
                              <div style={styles.roomOrderButtons}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveRoom(idx, -1)}
                                  aria-label="Subir"
                                  style={{ ...styles.orderArrowBtn, ...(idx === 0 ? styles.orderArrowBtnDisabled : {}) }}
                                >
                                  <ChevronUp size={18} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === roomsCount - 1}
                                  onClick={() => handleMoveRoom(idx, 1)}
                                  aria-label="Bajar"
                                  style={{ ...styles.orderArrowBtn, ...(idx === roomsCount - 1 ? styles.orderArrowBtnDisabled : {}) }}
                                >
                                  <ChevronDown size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Pie fijo con la acción principal */}
            <div style={styles.stickyFooter}>
              <button type="button" onClick={handleGeneratePdf} style={styles.primaryBtn}>
                <FileCheck size={19} strokeWidth={2.2} />
                <span>{hasExistingPdf ? 'Generar nuevo PDF' : 'Generar PDF'}</span>
              </button>
              {hasExistingPdf && (
                <p style={styles.footerNote}>Reemplazará el PDF anterior</p>
              )}
            </div>
          </>
        )}

        {/* ── PASO 4: GENERANDO ── */}
        {step === 'generating' && (
          <div style={styles.loadingBox}>
            <div style={styles.spinnerCircle}>
              <Loader2 size={32} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h4 style={styles.loadingTitle}>Generando tu PDF…</h4>
            <p style={styles.loadingSub}>Esto puede tardar unos segundos. No cierres la app.</p>
          </div>
        )}

        {/* ── PASO 5: ERROR ── */}
        {step === 'error' && (
          <div style={styles.errorBox}>
            <div style={styles.errorIconCircle}>
              <AlertCircle size={26} color="#dc2626" />
            </div>
            <h4 style={styles.errorTitle}>No se pudo generar el PDF</h4>
            <p style={styles.errorDesc}>{errorMessage}</p>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
              <button type="button" onClick={() => setStep('config')} style={styles.retryBtn}>
                Reintentar
              </button>
              <button type="button" onClick={onClose} style={styles.cancelBtn}>
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </BottomSheet>
  );
}

// ── Componentes auxiliares ──────────────────────────────────────────────

function SectionLabel({ children }) {
  return <div style={styles.sectionLabel}>{children}</div>;
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        ...styles.switchTrack,
        backgroundColor: checked ? '#4f46e5' : '#d7dde5',
      }}
    >
      <span
        style={{
          ...styles.switchThumb,
          transform: checked ? 'translateX(19px)' : 'translateX(0px)',
        }}
      />
    </button>
  );
}

const styles = {
  body: {
    padding: '4px 0 calc(16px + env(safe-area-inset-bottom, 0px)) 0',
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
  // El cuerpo de configuración no scrollea: scrollea el área interna y el botón queda fijo abajo
  configBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    padding: 0,
    gap: 0,
  },
  configScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y',
    padding: '0 0 16px 0',
  },
  stickyFooter: {
    flexShrink: 0,
    padding: '12px 0 calc(12px + env(safe-area-inset-bottom, 0px)) 0',
    borderTop: '1px solid #eef1f5',
    backgroundColor: '#ffffff',
  },
  footerNote: {
    margin: '8px 0 0 0',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
  },

  // BOTÓN PRINCIPAL
  primaryBtn: {
    width: '100%',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(79, 70, 229, 0.28)',
  },

  // PASO: PDF LISTO
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    paddingTop: '4px',
  },
  readyHero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '12px 0 4px 0',
  },
  readyIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  readyTitle: {
    fontSize: '19px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  readyMeta: {
    marginTop: '4px',
    fontSize: '13px',
    color: '#64748b',
  },
  tileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 6px',
    backgroundColor: '#ffffff',
    border: '1px solid #e8ecf1',
    borderRadius: '16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  tileIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
  },
  linkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },

  // CONFIGURACIÓN
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    margin: '18px 4px 8px 4px',
  },
  hintText: {
    margin: '8px 4px 0 4px',
    fontSize: '12.5px',
    color: '#64748b',
    lineHeight: 1.4,
  },
  segmented: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '4px',
    padding: '4px',
    backgroundColor: '#f1f5f9',
    borderRadius: '14px',
  },
  segment: {
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: '1.5px solid transparent',
    borderRadius: '11px',
    cursor: 'pointer',
    padding: '0 6px',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    borderColor: '#4f46e5',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
  },
  segmentLogo: {
    maxHeight: '22px',
    maxWidth: '84px',
    objectFit: 'contain',
  },
  segmentText: {
    fontSize: '14px',
    fontWeight: '700',
  },
  listGroup: {
    backgroundColor: '#ffffff',
    border: '1px solid #e8ecf1',
    borderRadius: '16px',
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box',
  },
  listRow: {
    minHeight: '54px',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    boxSizing: 'border-box',
  },
  listRowBtn: {
    width: '100%',
    minHeight: '54px',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  listRowDivider: {
    borderTop: '1px solid #f1f5f9',
  },
  rowTextBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  rowTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#0f172a',
  },
  rowHint: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  rowValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 0,
  },
  expandBox: {
    padding: '4px 14px 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#ffffff',
  },
  radioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  radioDot: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  radioDotActive: {
    borderColor: '#4f46e5',
  },
  radioDotInner: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
  },
  radioText: {
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: '500',
  },
  dateInput: {
    width: '100%',
    height: '44px',
    padding: '0 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '15px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  textInput: {
    height: '44px',
    padding: '0 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },

  // Orden de ambientes
  emptyRoomsBox: {
    padding: '14px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px dashed #cbd5e1',
  },
  roomsListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '280px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  roomRow: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '6px 6px 6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    userSelect: 'none',
  },
  roomPositionPill: {
    width: '24px',
    height: '24px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roomNameText: {
    flex: 1,
    minWidth: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roomOrderButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
  },
  orderArrowBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
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
    opacity: 0.3,
    cursor: 'not-allowed',
  },

  // Interruptor tipo iOS
  switchTrack: {
    position: 'relative',
    width: '48px',
    height: '29px',
    borderRadius: '29px',
    border: 'none',
    padding: 0,
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  switchThumb: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    height: '25px',
    width: '25px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },

  // ESTADO DE CARGA
  loadingBox: {
    padding: '48px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  spinnerCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  loadingTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  loadingSub: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.4,
    maxWidth: '280px',
  },

  // ESTADO DE ERROR
  errorBox: {
    padding: '32px 14px 20px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  errorIconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  errorTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#991b1b',
    margin: '0 0 6px 0',
  },
  errorDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 14px 0',
    lineHeight: 1.4,
  },
  retryBtn: {
    flex: 1,
    height: '48px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    height: '48px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
};
