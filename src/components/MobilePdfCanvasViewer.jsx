import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  MessageCircle,
  FileCheck,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';

if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export default function MobilePdfCanvasViewer({
  pdfUrl,
  propertyName = 'Inventario',
  onDownload,
  onWhatsApp,
  onCopyLink,
  onOpenExternal,
  copiedLink = false,
  isDownloading = false
}) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1); // 1 = ajuste al ancho de pantalla
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);

  const containerRef = useRef(null);
  const canvasRefs = useRef({});
  const activeRenderTasks = useRef({});
  const prevScaleRef = useRef(1);

  // Mouse drag panning state (para pruebas en simulator / desktop)
  const isMouseDown = useRef(false);
  const mouseDragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Touch pinch-to-zoom state
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);

  // Cargar documento PDF
  useEffect(() => {
    if (!pdfUrl) {
      setError('URL del documento no disponible');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[MobilePdfCanvasViewer] Error cargando PDF con pdfjs:', err);
        if (!isMounted) return;
        setError(err.message || 'No se pudo procesar el documento');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      loadingTask.destroy?.();
    };
  }, [pdfUrl]);

  // Cancelar renders activos al desmontar
  useEffect(() => {
    return () => {
      Object.values(activeRenderTasks.current).forEach((task) => {
        try {
          task?.cancel();
        } catch (e) {
          // ignore
        }
      });
      activeRenderTasks.current = {};
    };
  }, []);

  // Renderizar páginas en canvas con resolución Retina nítida y cancelación segura
  const renderPages = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return;

    // Ancho del contenedor restando margen seguro
    const containerWidth = Math.max(containerRef.current.clientWidth - 28, 280);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5); // Escala Retina para nitidez absoluta

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      try {
        // Cancelar render previo si aún sigue ejecutándose en este canvas
        if (activeRenderTasks.current[pageNum]) {
          try {
            activeRenderTasks.current[pageNum].cancel();
          } catch (e) {
            // ignore
          }
        }

        const page = await pdfDoc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const baseScale = containerWidth / unscaledViewport.width;
        const finalScale = baseScale * scale;
        const viewport = page.getViewport({ scale: finalScale });

        const canvas = canvasRefs.current[pageNum];
        if (!canvas) continue;

        const context = canvas.getContext('2d', { alpha: false });
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        };

        const renderTask = page.render(renderContext);
        activeRenderTasks.current[pageNum] = renderTask;

        await renderTask.promise;
        delete activeRenderTasks.current[pageNum];
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn(`[MobilePdfCanvasViewer] Error renderizando pág ${pageNum}:`, e);
        }
      }
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    renderPages();
  }, [renderPages]);

  // Redimensionar al rotar dispositivo
  useEffect(() => {
    const handleResize = () => {
      renderPages();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPages]);

  // Manejo de centrado inicial al entrar en modo zoom (SOLO una vez al pasar de 1 a >1)
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    if (prevScaleRef.current === 1 && scale > 1) {
      // Zoom inicial: centrar suavemente en el documento
      requestAnimationFrame(() => {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll > 0) {
          container.scrollLeft = Math.round(maxScroll / 2);
        }
      });
    } else if (scale === 1) {
      // Restablecer posición horizontal a 0
      container.scrollLeft = 0;
    }
    prevScaleRef.current = scale;
  }, [scale]);

  // Rastrear página actual al hacer scroll vertical
  const handleScroll = (e) => {
    const el = e.target;
    const pageElements = Object.entries(canvasRefs.current);
    for (const [num, canvas] of pageElements) {
      if (!canvas) continue;
      const rect = canvas.getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();
      if (rect.top >= parentRect.top - 120 && rect.top <= parentRect.top + 280) {
        setCurrentPage(Number(num));
        break;
      }
    }
  };

  // Controles de zoom
  const handleZoomIn = () => {
    setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.8));
  };

  const handleResetZoom = () => {
    setScale(1);
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  };

  // Pinch-to-zoom para 2 dedos en pantallas táctiles
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDist.current = dist;
      pinchStartScale.current = scale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDist.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartDist.current;
      const targetScale = Math.min(Math.max(pinchStartScale.current * factor, 0.8), 2.5);
      setScale(Number(targetScale.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDist.current = 0;
  };

  // Panning con mouse (para probar en simulador / desktop arrastrando el cursor)
  const handleMouseDown = (e) => {
    if (scale > 1 && e.button === 0) {
      isMouseDown.current = true;
      mouseDragStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current?.scrollLeft || 0,
        scrollTop: containerRef.current?.scrollTop || 0,
      };
    }
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown.current || scale <= 1) return;
    const dx = e.clientX - mouseDragStart.current.x;
    const dy = e.clientY - mouseDragStart.current.y;
    if (containerRef.current) {
      containerRef.current.scrollLeft = mouseDragStart.current.scrollLeft - dx;
      containerRef.current.scrollTop = mouseDragStart.current.scrollTop - dy;
    }
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  const handleExternalClick = () => {
    if (onOpenExternal) {
      onOpenExternal();
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div style={viewerStyles.wrapper}>
      {/* ── BARRA SUPERIOR: PERFECTAMENTE BALANCEADA Y CENTRADA ── */}
      <div style={viewerStyles.topToolbar}>
        <div style={viewerStyles.toolbarSideLeft}>
          <div style={viewerStyles.statusPill}>
            <FileCheck size={13} color="#16a34a" strokeWidth={2.5} />
            <span>Oficial</span>
          </div>
        </div>

        {numPages > 0 && (
          <div style={viewerStyles.pagePill}>
            <span>Pág. {currentPage} de {numPages}</span>
          </div>
        )}

        <div style={viewerStyles.toolbarSideRight}>
          {scale !== 1 ? (
            <button 
              type="button" 
              onClick={handleResetZoom}
              style={viewerStyles.resetZoomBtn}
              title="Ajustar al 100%"
            >
              <RotateCcw size={12} color="#4338ca" />
              <span>Ajustar</span>
            </button>
          ) : (
            <div style={{ width: 68 }} />
          )}
        </div>
      </div>

      {/* ── ÁREA DE DOCUMENTO: SCROLL Y PANEO 2D LIBRE SIN CORTES ── */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          ...viewerStyles.scrollArea,
          cursor: scale > 1 ? (isMouseDown.current ? 'grabbing' : 'grab') : 'default',
        }}
        className="no-scrollbar pdf-viewer-scroll"
      >
        {loading && (
          <div style={viewerStyles.centerState}>
            <div style={viewerStyles.loaderCircle}>
              <Loader2 size={30} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h4 style={viewerStyles.loadingTitle}>Cargando inventario...</h4>
            <p style={viewerStyles.loadingSubtitle}>
              Renderizando páginas en alta resolución
            </p>
          </div>
        )}

        {error && (
          <div style={viewerStyles.centerState}>
            <div style={viewerStyles.errorCircle}>
              <AlertCircle size={32} color="#dc2626" />
            </div>
            <h4 style={viewerStyles.errorTitle}>
              No se pudo previsualizar el documento
            </h4>
            <p style={viewerStyles.errorSubtitle}>
              {error}
            </p>
            <button 
              type="button"
              onClick={handleExternalClick}
              style={viewerStyles.fallbackBtn}
            >
              <ExternalLink size={15} />
              <span>Abrir en visor del sistema</span>
            </button>
          </div>
        )}

        {!loading && !error && (
          <div 
            style={{
              ...viewerStyles.pagesFeed,
              // ALINEACIÓN CLAVE: cuando está con zoom (>1), alinear a la izquierda (flex-start)
              // para que la coordenada X=0 comience en el margen izquierdo sin desbordar al espacio negativo.
              alignItems: scale > 1 ? 'flex-start' : 'center',
              padding: scale > 1 ? '16px 16px 140px 16px' : '16px 16px 140px 16px',
            }}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} style={viewerStyles.pageWrapper}>
                <canvas
                  ref={(el) => {
                    canvasRefs.current[pageNum] = el;
                  }}
                  style={viewerStyles.canvas}
                />
                <div style={viewerStyles.pageFooterInfo}>
                  <span>Página {pageNum} de {numPages}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CÁPSULA DE ZOOM FLOTANTE (ELEVADA LIMPIAMENTE SOBRE LA BARRA INFERIOR) ── */}
      {!loading && !error && (
        <div style={viewerStyles.floatingZoomPill}>
          <button 
            type="button" 
            onClick={handleZoomOut} 
            disabled={scale <= 0.8}
            style={{
              ...viewerStyles.zoomCircleBtn,
              opacity: scale <= 0.8 ? 0.35 : 1,
            }}
            title="Alejar"
          >
            <ZoomOut size={15} color="#0f172a" strokeWidth={2.4} />
          </button>

          <button 
            type="button" 
            onClick={handleResetZoom}
            style={viewerStyles.zoomPercentBtn}
            title="Restablecer al 100%"
          >
            <span>{Math.round(scale * 100)}%</span>
          </button>

          <button 
            type="button" 
            onClick={handleZoomIn} 
            disabled={scale >= 2.5}
            style={{
              ...viewerStyles.zoomCircleBtn,
              opacity: scale >= 2.5 ? 0.35 : 1,
            }}
            title="Acercar"
          >
            <ZoomIn size={15} color="#0f172a" strokeWidth={2.4} />
          </button>
        </div>
      )}

      {/* ── BARRA INFERIOR DE ACCIONES (FLUIDA, AL BORDE DE PANTALLA Y SIN CORTES) ── */}
      {!loading && !error && (
        <div style={viewerStyles.bottomActionBar}>
          {/* Grupo izquierdo: 3 botones circulares idénticos y elegantes */}
          <div style={viewerStyles.leftShareGroup}>
            {/* WhatsApp */}
            {onWhatsApp && (
              <button 
                type="button" 
                onClick={onWhatsApp} 
                style={viewerStyles.whatsAppCircleBtn}
                title="Compartir por WhatsApp"
              >
                <MessageCircle size={18} color="#ffffff" strokeWidth={2.4} />
              </button>
            )}

            {/* Copiar enlace con feedback instantáneo */}
            {onCopyLink && (
              <button 
                type="button" 
                onClick={onCopyLink} 
                style={{
                  ...viewerStyles.actionCircleBtn,
                  backgroundColor: copiedLink ? '#dcfce7' : '#ffffff',
                  borderColor: copiedLink ? '#86efac' : '#cbd5e1',
                }}
                title={copiedLink ? 'Link copiado' : 'Copiar enlace'}
              >
                {copiedLink ? (
                  <Check size={18} color="#16a34a" strokeWidth={2.8} />
                ) : (
                  <Copy size={17} color="#334155" strokeWidth={2.2} />
                )}
              </button>
            )}

            {/* Abrir en Safari / pantalla externa */}
            <button 
              type="button"
              onClick={handleExternalClick}
              style={viewerStyles.actionCircleBtn}
              title="Abrir en Safari o navegador externo"
            >
              <ExternalLink size={17} color="#334155" strokeWidth={2.2} />
            </button>
          </div>

          {/* Grupo derecho: Descargar PDF destacado */}
          {onDownload && (
            <button 
              type="button" 
              onClick={onDownload} 
              disabled={isDownloading}
              style={viewerStyles.primaryDownloadBtn}
              title="Descargar archivo PDF"
            >
              {isDownloading ? (
                <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={16} color="#ffffff" strokeWidth={2.4} />
              )}
              <span>Descargar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const viewerStyles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    width: '100%',
    minHeight: 0,
    backgroundColor: '#f8fafc',
    position: 'relative',
    overflow: 'hidden',
  },
  topToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
    zIndex: 10,
    boxSizing: 'border-box',
    width: '100%',
  },
  toolbarSideLeft: {
    width: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  toolbarSideRight: {
    width: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 9px',
    borderRadius: '6px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#15803d',
    whiteSpace: 'nowrap',
  },
  pagePill: {
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: '4px 14px',
    borderRadius: '10px',
    whiteSpace: 'nowrap',
  },
  resetZoomBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#4338ca',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-x pan-y',
    overscrollBehavior: 'contain',
    position: 'relative',
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '70px 20px',
    textAlign: 'center',
    width: '100%',
  },
  loaderCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  loadingTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  loadingSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  errorCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#991b1b',
    margin: '0 0 4px 0',
  },
  errorSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    maxWidth: '260px',
    margin: '0 0 14px 0',
    lineHeight: 1.4,
  },
  fallbackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
  },
  pagesFeed: {
    display: 'flex',
    flexDirection: 'column',
    width: 'max-content',
    minWidth: '100%',
    boxSizing: 'border-box',
  },
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    marginBottom: '16px',
    width: '100%',
  },
  canvas: {
    borderRadius: '8px',
    boxShadow: '0 4px 18px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
    backgroundColor: '#ffffff',
    display: 'block',
    border: '1px solid #e2e8f0',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  pageFooterInfo: {
    marginTop: '6px',
    fontSize: '10.5px',
    fontWeight: '600',
    color: '#94a3b8',
  },

  // Cápsula de zoom flotante (bien separada por encima de la barra de acciones)
  floatingZoomPill: {
    position: 'absolute',
    bottom: 'calc(72px + env(safe-area-inset-bottom, 14px))',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(226, 232, 240, 0.95)',
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.14), 0 2px 4px rgba(0, 0, 0, 0.04)',
    zIndex: 25,
  },
  zoomCircleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  zoomPercentBtn: {
    padding: '3px 8px',
    background: 'none',
    border: 'none',
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#0f172a',
    cursor: 'pointer',
    minWidth: '42px',
    textAlign: 'center',
  },

  // Barra inferior de acciones (anclada al fondo de pantalla, espaciosa y simétrica)
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px calc(12px + env(safe-area-inset-bottom, 14px)) 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.08)',
    zIndex: 30,
    gap: '12px',
    boxSizing: 'border-box',
  },
  leftShareGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  whatsAppCircleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#25D366',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.35)',
    flexShrink: 0,
    transition: 'transform 0.12s ease',
  },
  actionCircleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.15s ease',
  },
  primaryDownloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '40px',
    padding: '0 22px',
    borderRadius: '20px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.22)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'transform 0.12s ease',
  },
};
