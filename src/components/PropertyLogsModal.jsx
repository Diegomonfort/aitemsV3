import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  RotateCw,
  Package,
  Layers,
  Camera,
  Users,
  User,
  Trash2,
  Edit3,
  ArrowRight,
  Compass,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  ArrowDown
} from 'lucide-react';
import BottomSheet from './BottomSheet';
import { propertyService } from '../services/propertyService';
import { useAuth } from '../context/AuthContext';

const ENTITY_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'item', label: 'Ítems', icon: Package },
  { id: 'room', label: 'Ambientes', icon: Layers },
  { id: 'photo', label: 'Fotos', icon: Camera },
  { id: 'floor_plan', label: 'Planos', icon: Compass },
  { id: 'pdf', label: 'Documentos', icon: FileText },
  { id: 'property', label: 'Equipo', icon: Users },
];

function getEventTheme(entityType, action) {
  const act = (action || '').toUpperCase();

  if (entityType === 'item') {
    if (act.includes('DELETE')) {
      return {
        icon: Trash2,
        color: '#ef4444',
        bg: '#fef2f2',
        border: '#fee2e2',
      };
    }
    if (act.includes('UPDATE')) {
      return {
        icon: Edit3,
        color: '#f59e0b',
        bg: '#fffbeb',
        border: '#fef3c7',
      };
    }
    return {
      icon: Package,
      color: '#4f46e5',
      bg: '#eef2ff',
      border: '#e0e7ff',
    };
  }

  if (entityType === 'room') {
    if (act.includes('DELETE')) {
      return {
        icon: Trash2,
        color: '#ef4444',
        bg: '#fef2f2',
        border: '#fee2e2',
      };
    }
    return {
      icon: Layers,
      color: '#059669',
      bg: '#ecfdf5',
      border: '#d1fae5',
    };
  }

  if (entityType === 'photo') {
    if (act.includes('DELETE')) {
      return {
        icon: Trash2,
        color: '#ef4444',
        bg: '#fef2f2',
        border: '#fee2e2',
      };
    }
    if (act.includes('MOVE')) {
      return {
        icon: ArrowRight,
        color: '#0284c7',
        bg: '#f0f9ff',
        border: '#e0f2fe',
      };
    }
    return {
      icon: Camera,
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#e0f2fe',
    };
  }

  if (entityType === 'floor_plan') {
    return {
      icon: Compass,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      border: '#ede9fe',
    };
  }

  if (entityType === 'pdf') {
    return {
      icon: FileText,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#dbeafe',
    };
  }

  if (entityType === 'property' || act.includes('SHARE')) {
    return {
      icon: Users,
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ede9fe',
    };
  }

  return {
    icon: History,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
  };
}

function groupLogsByDate(logs) {
  const groups = {};
  const todayStr = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  (logs || []).forEach((log) => {
    if (!log.created_at) return;
    const d = new Date(log.created_at);
    const dateKeyStr = d.toDateString();

    let label = '';
    if (dateKeyStr === todayStr) {
      label = 'Hoy';
    } else if (dateKeyStr === yesterdayStr) {
      label = 'Ayer';
    } else {
      label = d.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  });

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

function formatLogDescription(text, metadata) {
  if (!text) return '';
  return text.replace(/"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"/gi, () => {
    return metadata?.room ? `"${metadata.room}"` : '"Ambiente"';
  });
}

export default function PropertyLogsModal({
  isOpen,
  onClose,
  property,
}) {
  const { user } = useAuth();
  const propertyId = property?.id;
  const propertyTitle = property?.name || property?.title || 'Propiedad';

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(
    async (showLoading = true) => {
      if (!propertyId) return;
      if (showLoading) setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await propertyService.getPropertyLogs(propertyId, {
          limit: 20,
          page: 1,
          entityType: activeFilter !== 'all' ? activeFilter : null,
        });

        if (res && res.success) {
          const fetchedLogs = res.logs || [];
          const total = res.total ?? fetchedLogs.length;
          setLogs(fetchedLogs);
          setTotalCount(total);
          setCurrentPage(1);
          setHasMore(res.hasMore ?? (fetchedLogs.length < total));
        } else {
          setLogs([]);
          setTotalCount(0);
          setHasMore(false);
          if (res?.message) setErrorMsg(res.message);
        }
      } catch (err) {
        console.error('Error cargando historial de la propiedad:', err);
        setErrorMsg('No se pudo cargar el historial. Reintentá en unos instantes.');
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [propertyId, activeFilter]
  );

  const handleLoadMore = async () => {
    if (!propertyId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const res = await propertyService.getPropertyLogs(propertyId, {
        limit: 20,
        page: nextPage,
        entityType: activeFilter !== 'all' ? activeFilter : null,
      });

      if (res && res.success) {
        const newLogs = res.logs || [];
        setLogs(prev => [...prev, ...newLogs]);
        setCurrentPage(nextPage);
        const total = res.total ?? totalCount;
        setTotalCount(total);
        setHasMore(res.hasMore ?? ((logs.length + newLogs.length) < total));
      }
    } catch (err) {
      console.error('Error cargando más historial:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs(true);
    } else {
      // Reset filter when closed
      setActiveFilter('all');
    }
  }, [isOpen, fetchLogs]);

  const grouped = useMemo(() => groupLogsByDate(logs), [logs]);

  // Header Extra con filtros horizontales y barra de control
  const headerExtra = (
    <div style={styles.headerExtraContainer}>
      <div style={styles.controlRow}>
        <div style={styles.statsBadge}>
          <Clock size={12} color="#6366f1" />
          <span style={styles.statsBadgeText}>
            {totalCount > 20
              ? `Mostrando ${logs.length} de ${totalCount} eventos`
              : `${totalCount} ${totalCount === 1 ? 'evento registrado' : 'eventos registrados'}`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs(false)}
          disabled={isLoading}
          style={styles.refreshBtn}
          aria-label="Actualizar registros"
        >
          <RotateCw 
            size={13} 
            color="#475569" 
            style={{ 
              animation: isLoading ? 'spin 1s linear infinite' : 'none',
              transformOrigin: 'center'
            }} 
          />
          <span style={styles.refreshBtnText}>Actualizar</span>
        </button>
      </div>

      {/* Chips de filtro scrollables */}
      <div style={styles.filterScroll}>
        {ENTITY_FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              style={{
                ...styles.filterChip,
                ...(isActive ? styles.filterChipActive : styles.filterChipInactive),
              }}
            >
              {Icon && (
                <Icon 
                  size={12} 
                  strokeWidth={2.4} 
                  color={isActive ? '#ffffff' : '#64748b'} 
                />
              )}
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de actividad"
      subtitle={propertyTitle}
      size="full"
      headerExtra={headerExtra}
      bodyClassName="pl-logs-body"
    >
      <div style={styles.container}>
        {/* Loading State */}
        {isLoading && logs.length === 0 ? (
          <div style={styles.loadingBox}>
            <div style={styles.loadingSpinnerWrapper}>
              <RotateCw size={26} color="#4f46e5" style={{ animation: 'spin 0.9s linear infinite' }} />
            </div>
            <p style={styles.loadingTitle}>Cargando historial...</p>
            <p style={styles.loadingSubtitle}>Recuperando los registros y eventos de la propiedad</p>
          </div>
        ) : errorMsg ? (
          <div style={styles.errorBox}>
            <div style={styles.errorIconCircle}>
              <AlertCircle size={24} color="#ef4444" />
            </div>
            <p style={styles.errorTitle}>Error al cargar</p>
            <p style={styles.errorDesc}>{errorMsg}</p>
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              style={styles.retryBtn}
            >
              <RotateCw size={13} color="#ffffff" />
              <span>Reintentar</span>
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div style={styles.emptyBox}>
            <div style={styles.emptyIconCircle}>
              <History size={28} color="#94a3b8" />
            </div>
            <h4 style={styles.emptyTitle}>Sin actividad registrada</h4>
            <p style={styles.emptyDesc}>
              {activeFilter !== 'all'
                ? `No se encontraron eventos para el filtro "${ENTITY_FILTERS.find(f => f.id === activeFilter)?.label || activeFilter}".`
                : 'A partir de ahora, cada ítem creado, editado o eliminado, ambiente modificado o foto analizada quedará auditado aquí.'}
            </p>
          </div>
        ) : (
          <div style={styles.timelineWrapper}>
            {grouped.map((group) => (
              <div key={group.label} style={styles.groupContainer}>
                {/* Encabezado de Fecha */}
                <div style={styles.dateHeaderRow}>
                  <span style={styles.dateHeaderLabel}>{group.label}</span>
                  <div style={styles.dateHeaderLine} />
                </div>

                {/* Lista de eventos del grupo con línea conectora vertical */}
                <div style={styles.eventList}>
                  <div style={styles.timelineConnectorLine} />

                  {group.items.map((log) => {
                    const theme = getEventTheme(log.entity_type, log.action);
                    const Icon = theme.icon;
                    const isMe =
                      user &&
                      log.user_id &&
                      String(log.user_id) === String(user.id);
                    const authorLabel = isMe
                      ? 'Ti'
                      : log.user_name || 'Usuario';

                    const timeString = log.created_at
                      ? new Date(log.created_at).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div key={log.id} style={styles.eventRow}>
                        {/* Nodo Circular con Icono */}
                        <div
                          style={{
                            ...styles.nodeCircle,
                            backgroundColor: theme.bg,
                            border: `1.5px solid ${theme.border}`,
                            color: theme.color,
                          }}
                        >
                          <Icon size={14} strokeWidth={2.4} color={theme.color} />
                        </div>

                        {/* Tarjeta de Contenido */}
                        <div style={styles.eventCard}>
                          <div style={styles.cardHeader}>
                            <span style={styles.cardTitle}>
                              {log.title || 'Evento'}
                            </span>
                            {timeString && (
                              <span style={styles.cardTime}>
                                {timeString}
                              </span>
                            )}
                          </div>

                          {/* Descripción del evento */}
                          <p style={styles.cardDesc}>
                            {formatLogDescription(log.description, log.metadata)}
                          </p>

                          {/* Footer con el autor */}
                          <div style={styles.cardFooter}>
                            <div
                              style={{
                                ...styles.authorBadge,
                                ...(isMe ? styles.authorBadgeMe : styles.authorBadgeOther),
                              }}
                            >
                              <User
                                size={10}
                                strokeWidth={2.4}
                                color={isMe ? '#4f46e5' : '#64748b'}
                              />
                              <span>
                                {isMe ? 'Por Ti' : `Por ${authorLabel}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Paginación / Cargar Más */}
            {hasMore && (
              <div style={styles.loadMoreContainer}>
                <button
                  type="button"
                  style={styles.loadMoreBtn}
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <RotateCw size={15} color="#4f46e5" style={{ animation: 'spin 0.9s linear infinite' }} />
                      <span>Cargando más actividades...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown size={14} color="#4f46e5" strokeWidth={2.4} />
                      <span>Cargar más actividades (+20)</span>
                    </>
                  )}
                </button>
                <span style={styles.paginationSummary}>
                  Mostrando {logs.length} de {totalCount} eventos
                </span>
              </div>
            )}

            {!hasMore && logs.length > 0 && totalCount > 20 && (
              <div style={styles.endOfTimelineNotice}>
                <div style={styles.endDot} />
                <span>Has llegado al inicio del historial ({totalCount} eventos)</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pl-logs-body {
          padding: 0 !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </BottomSheet>
  );
}

const styles = {
  headerExtraContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
    paddingBottom: '4px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2px',
  },
  statsBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: '#f1f5f9',
    padding: '3px 8px',
    borderRadius: '12px',
  },
  statsBadgeText: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '4px 9px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  refreshBtnText: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
  },
  filterScroll: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '2px 0 6px 0',
  },
  filterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    WebkitTapHighlightColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: '1px solid #4f46e5',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
  },
  filterChipInactive: {
    backgroundColor: '#ffffff',
    color: '#64748b',
    border: '1px solid #e2e8f0',
  },
  container: {
    padding: '16px 20px 36px',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  loadingSpinnerWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  loadingTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 4px',
  },
  loadingSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  errorIconCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 4px',
  },
  errorDesc: {
    fontSize: '12.5px',
    color: '#64748b',
    margin: '0 0 16px',
    maxWidth: '280px',
    lineHeight: 1.4,
  },
  retryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  emptyTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 6px',
  },
  emptyDesc: {
    fontSize: '12.5px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
    maxWidth: '300px',
  },
  timelineWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
  },
  groupContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  dateHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  dateHeaderLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  dateHeaderLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  eventList: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '4px',
  },
  timelineConnectorLine: {
    position: 'absolute',
    left: '17px',
    top: '12px',
    bottom: '12px',
    width: '2px',
    backgroundColor: '#f1f5f9',
    zIndex: 0,
  },
  eventRow: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  nodeCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '3px',
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    border: '1px solid #f1f5f9',
    borderRadius: '12px',
    padding: '10px 12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    marginBottom: '4px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
  },
  cardTime: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardDesc: {
    fontSize: '12px',
    color: '#334155',
    margin: '0 0 6px',
    lineHeight: 1.45,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
  },
  authorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 7px',
    borderRadius: '10px',
    fontSize: '10.5px',
    fontWeight: '600',
  },
  authorBadgeMe: {
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
  },
  authorBadgeOther: {
    backgroundColor: '#f8fafc',
    color: '#64748b',
    border: '1px solid #f1f5f9',
  },
  loadMoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 0 24px 0',
    gap: '8px',
  },
  loadMoreBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '14px',
    backgroundColor: '#eef2ff',
    border: '1.5px solid #e0e7ff',
    color: '#4f46e5',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.08)',
    transition: 'all 0.15s ease',
  },
  paginationSummary: {
    fontSize: '11.5px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  endOfTimelineNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '16px 0 24px 0',
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  endDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#cbd5e1',
  },
};
