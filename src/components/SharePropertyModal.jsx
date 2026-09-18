import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Check, 
  Users
} from 'lucide-react';

export default function SharePropertyModal({
  isOpen,
  onClose,
  property,
  agents = [],
  agency,
  onUpdateSharedWith,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Los que ya están compartidos aparecen seleccionados
  const [selectedAgentIds, setSelectedAgentIds] = useState(() => {
    const list = property?.shared_users || property?.sharedUsers || property?.sharedWith;
    return Array.isArray(list) ? list : [];
  });

  // Sincronizar si cambia la propiedad abierta
  React.useEffect(() => {
    const list = property?.shared_users || property?.sharedUsers || property?.sharedWith;
    if (Array.isArray(list)) {
      setSelectedAgentIds(list);
    }
  }, [property?.id, property?.shared_users, property?.sharedUsers]);

  // Bloquear scroll de fondo mientras esté abierto
  React.useEffect(() => {
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

  if (!isOpen || !property) return null;

  // Filtrar colegas únicamente por nombre
  const filteredColleagues = agents.filter(agent => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return agent.name?.toLowerCase().includes(q) || agent.email?.toLowerCase().includes(q);
  });

  const handleToggleColleague = (agentId) => {
    const nextSelected = selectedAgentIds.includes(agentId)
      ? selectedAgentIds.filter(id => id !== agentId)
      : [...selectedAgentIds, agentId];

    setSelectedAgentIds(nextSelected);
    if (onUpdateSharedWith) {
      onUpdateSharedWith(property.id, nextSelected);
    }
  };

  const getAvatarPalette = (name) => {
    const palette = [
      { bg: '#eff6ff', text: '#2563eb' }, // Blue
      { bg: '#f5f3ff', text: '#7c3aed' }, // Purple
      { bg: '#ecfdf5', text: '#059669' }, // Emerald
      { bg: '#fff7ed', text: '#c2410c' }, // Orange
      { bg: '#fdf2f8', text: '#db2777' }, // Pink
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
    return palette[hash % palette.length];
  };

  return (
    <div className="app-modal-backdrop" onClick={onClose}>
      <div 
        className="app-modal-sheet" 
        onClick={(e) => e.stopPropagation()}
        style={styles.sheetOverride}
      >
        {/* Handle de arrastre superior centrado */}
        <div style={styles.handleWrapper}>
          <div className="app-modal-handle" style={styles.handle} />
        </div>

        {/* Encabezado */}
        <div style={styles.header}>
          <div style={styles.headerText}>
            <h3 style={styles.title}>Compartir propiedad</h3>
            <p style={styles.subtitle}>{property.name}</p>
          </div>

          <button 
            type="button" 
            style={styles.closeBtn} 
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={16} color="#64748b" />
          </button>
        </div>

        <div className="app-modal-content-body no-scrollbar" style={styles.body}>
          {/* Buscador de colegas por nombre */}
          <div style={styles.searchBox}>
            <Search size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
            <input 
              type="text"
              placeholder="Buscar colega..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />
            {searchQuery && (
              <button 
                type="button" 
                style={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
                aria-label="Borrar búsqueda"
              >
                <X size={11} color="#64748b" />
              </button>
            )}
          </div>

          {/* Subtítulo de sección */}
          <div style={styles.sectionTitleRow}>
            <span style={styles.sectionTitle}>
              Colegas de {agency?.name || 'la inmobiliaria'}
            </span>
            <span style={styles.selectedCount}>
              {selectedAgentIds.length} seleccionados
            </span>
          </div>

          {/* Listado de colegas con checkbox directo */}
          {filteredColleagues.length > 0 ? (
            <div style={styles.colleaguesCard}>
              {filteredColleagues.map((agent, index) => {
                const isSelected = selectedAgentIds.includes(agent.id);
                const palette = getAvatarPalette(agent.name);
                const initials = (agent.name || 'Agente')
                  .split(' ')
                  .map(p => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isLast = index === filteredColleagues.length - 1;

                return (
                  <div 
                    key={agent.id}
                    onClick={() => handleToggleColleague(agent.id)}
                    style={{
                      ...styles.colleagueRow,
                      ...(isSelected ? styles.colleagueRowSelected : {}),
                      ...(isLast ? { borderBottom: 'none' } : {})
                    }}
                  >
                    {/* Avatar circular */}
                    <div 
                      style={{
                        ...styles.avatar,
                        backgroundColor: palette.bg,
                        color: palette.text,
                      }}
                    >
                      {initials}
                    </div>

                    {/* Nombre únicamente */}
                    <div style={styles.nameContainer}>
                      <span style={{
                        ...styles.agentName,
                        fontWeight: isSelected ? '700' : '600',
                      }}>
                        {agent.name}
                      </span>
                    </div>

                    {/* Checkbox / Indicador de selección circular */}
                    <div style={styles.checkCol}>
                      {isSelected ? (
                        <div style={styles.checkCircleActive}>
                          <Check size={12} strokeWidth={3} color="#ffffff" />
                        </div>
                      ) : (
                        <div style={styles.checkCircleInactive} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyCard}>
              <Users size={24} color="#cbd5e1" />
              <p style={styles.emptyText}>
                {searchQuery
                  ? `No se encontró a ningún colega con "${searchQuery}"`
                  : 'Aún no hay colegas registrados en tu inmobiliaria'}
              </p>
              {searchQuery && (
                <button 
                  type="button" 
                  style={styles.resetBtn}
                  onClick={() => setSearchQuery('')}
                >
                  Ver todos
                </button>
              )}
            </div>
          )}
        </div>

        {/* Botón de confirmación inferior */}
        <div style={styles.footer}>
          <button 
            type="button" 
            style={styles.doneBtn}
            onClick={onClose}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  sheetOverride: {
    paddingBottom: '16px',
  },
  handleWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '8px',
    flexShrink: 0,
  },
  handle: {
    margin: '0 auto',
    alignSelf: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    flexShrink: 0,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    fontWeight: '500',
  },
  closeBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  body: {
    paddingBottom: '6px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    marginBottom: '12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
  },
  clearSearchBtn: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  sectionTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    padding: '0 2px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  selectedCount: {
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#4f46e5',
  },
  colleaguesCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #f1f5f9',
    overflow: 'hidden',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  colleagueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderBottom: '1px solid #f8fafc',
    cursor: 'pointer',
    transition: 'background-color 0.12s ease',
    userSelect: 'none',
  },
  colleagueRowSelected: {
    backgroundColor: '#f8faff',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  agentName: {
    fontSize: '14px',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  checkCol: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.35)',
  },
  checkCircleInactive: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #cbd5e1',
    backgroundColor: '#ffffff',
  },
  emptyCard: {
    padding: '24px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
  },
  emptyText: {
    fontSize: '12.5px',
    color: '#64748b',
    margin: 0,
  },
  resetBtn: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  footer: {
    paddingTop: '6px',
    flexShrink: 0,
  },
  doneBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
};
