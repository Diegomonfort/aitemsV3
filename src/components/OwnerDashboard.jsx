import React, { useState, useEffect } from 'react';
import { toast } from '../context/ToastContext';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Pencil, 
  CreditCard, 
  CheckCircle2, 
  Users, 
  UserPlus, 
  Mail, 
  Trash2, 
  RotateCw, 
  Crown, 
  X, 
  Check, 
  ExternalLink,
  Upload,
  Camera,
  Loader2,
  AlertCircle
} from 'lucide-react';
import logoDefault from '../assets/logo-color.png';
import { getCountries, getStates, getCities } from '../data/locationData';

export default function OwnerDashboard({
  agency,
  onUpdateAgency,
  plan,
  onUpdatePlan,
  agents,
  onAddAgent,
  onRemoveAgent,
  onResendInvite,
}) {
  // Modales
  const [isEditAgencyOpen, setIsEditAgencyOpen] = useState(false);
  const [isInviteAgentOpen, setIsInviteAgentOpen] = useState(false);

  // Formulario Editar Inmobiliaria
  const [formAgencyName, setFormAgencyName] = useState(agency?.name || '');
  const [formCountry, setFormCountry] = useState(agency?.country || 'Uruguay');
  const [formState, setFormState] = useState(agency?.state || 'Maldonado');
  const [formCity, setFormCity] = useState(agency?.city || 'Punta del Este');
  const [formAgencyWebsite, setFormAgencyWebsite] = useState(
    (agency?.website || agency?.website_url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
  );
  const [logoPreview, setLogoPreview] = useState(agency?.logo || null);
  const [logoError, setLogoError] = useState('');
  const [isSavingAgency, setIsSavingAgency] = useState(false);

  const [availableStates, setAvailableStates] = useState(() => getStates(agency?.country || 'Uruguay'));
  const [availableCities, setAvailableCities] = useState(() => getCities(agency?.country || 'Uruguay', agency?.state || 'Maldonado'));

  // Formulario Invitar Agente
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');

  // Toast global
  const showToast = (msg) => toast.success(msg);

  // Bloquear el scroll de fondo cuando un modal esté abierto
  useEffect(() => {
    if (!isEditAgencyOpen && !isInviteAgentOpen) return;

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
  }, [isEditAgencyOpen, isInviteAgentOpen]);

  const handleOpenEdit = () => {
    const curCountry = agency?.country || 'Uruguay';
    const states = getStates(curCountry);
    const curState = agency?.state && states.includes(agency.state) ? agency.state : (states[0] || '');
    const cities = getCities(curCountry, curState);
    const curCity = agency?.city && cities.includes(agency.city) ? agency.city : (agency?.city || cities[0] || '');

    setFormAgencyName(agency?.name || '');
    setFormCountry(curCountry);
    setAvailableStates(states);
    setFormState(curState);
    setAvailableCities(cities);
    setFormCity(curCity);
    setFormAgencyWebsite((agency?.website || agency?.website_url || '').replace(/^https?:\/\//i, '').replace(/\/$/, ''));
    setLogoPreview(agency?.logo || null);
    setLogoError('');
    setIsEditAgencyOpen(true);
  };

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setFormCountry(newCountry);
    const states = getStates(newCountry);
    setAvailableStates(states);
    const nextState = states[0] || '';
    setFormState(nextState);
    const cities = getCities(newCountry, nextState);
    setAvailableCities(cities);
    setFormCity(cities[0] || '');
  };

  const handleStateChange = (e) => {
    const newState = e.target.value;
    setFormState(newState);
    const cities = getCities(formCountry, newState);
    setAvailableCities(cities);
    setFormCity(cities[0] || '');
  };

  const handleLogoChange = (e) => {
    setLogoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('El logo no debe superar los 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setLogoError('El archivo debe ser una imagen (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAgency = async (e) => {
    e.preventDefault();
    if (!formAgencyName.trim()) return;

    setIsSavingAgency(true);
    setLogoError('');
    try {
      const locationText = [formCity, formCountry].filter(Boolean).join(', ');
      const formattedWebsite = formAgencyWebsite.trim() 
        ? `https://${formAgencyWebsite.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')}`
        : '';

      const updatedData = {
        ...agency,
        name: formAgencyName.trim(),
        country: formCountry,
        state: formState,
        city: formCity,
        location: locationText,
        website: formattedWebsite,
        website_url: formattedWebsite,
        logo: logoPreview,
      };

      if (onUpdateAgency) {
        await onUpdateAgency(updatedData);
      }

      setIsEditAgencyOpen(false);
      showToast('Datos actualizados');
    } catch (err) {
      console.error('Error guardando inmobiliaria:', err);
      setLogoError('Error al guardar datos. Inténtalo de nuevo.');
    } finally {
      setIsSavingAgency(false);
    }
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    onAddAgent({
      id: Date.now(),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'invited',
      joined: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    });

    setInviteName('');
    setInviteEmail('');
    setInviteRole('agent');
    setIsInviteAgentOpen(false);
    showToast(`Invitación enviada a ${inviteEmail.trim()}`);
  };

  const handleRemove = (agentId, agentName) => {
    if (window.confirm(`¿Quitar a ${agentName} del equipo?`)) {
      onRemoveAgent(agentId);
      showToast(`${agentName} removido`);
    }
  };

  return (
    <main key="dashboard-view" className="app-main-content" style={styles.container}>
      {/* Toast */}
      {toastMessage && (
        <div style={styles.toast}>
          <Check size={14} color="#ffffff" strokeWidth={3} />
          <span>{toastMessage}</span>
        </div>
      )}


      {/* =========================================================================
          HERO: PERFIL DE LA INMOBILIARIA (LIMPIO, ELEGANTE, SIN CAJAS ANIDADAS)
          ========================================================================= */}
      <div style={styles.profileHero}>
        <div style={styles.avatarCircle}>
          <img 
            src={agency?.logo || logoDefault} 
            alt={agency?.name || 'Inmobiliaria'} 
            style={styles.avatarImg}
            onError={(e) => {
              if (e.target.src !== logoDefault) {
                e.target.src = logoDefault;
              }
            }}
          />
        </div>

        <h2 style={styles.agencyName}>{agency?.name || 'Nombre Inmobiliaria'}</h2>

        <div style={styles.agencyMetaRow}>
          {agency?.location && (
            <span style={styles.metaItem}>
              <MapPin size={13} color="#64748b" />
              <span>{agency.location}</span>
            </span>
          )}
          {agency?.location && agency?.website && (
            <span style={styles.metaDot}>•</span>
          )}
          {agency?.website && (
            <a 
              href={agency.website.startsWith('http') ? agency.website : `https://${agency.website}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.websiteLink}
            >
              <Globe size={13} color="#4f46e5" />
              <span>{agency.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              <ExternalLink size={10} color="#4f46e5" />
            </a>
          )}
        </div>

        <button 
          type="button" 
          style={styles.editProfileBtn}
          onClick={handleOpenEdit}
        >
          <Pencil size={13} strokeWidth={2.2} />
          <span>Editar datos</span>
        </button>
      </div>

      {/* =========================================================================
          SECCIÓN 1: PLAN Y SUSCRIPCIÓN (TARJETA SLICK Y COMPACTA)
          ========================================================================= */}
      <div style={styles.sectionBlock}>
        <div style={styles.planCard}>
          <div style={styles.planCardTop}>
            <div>
              <span style={styles.planCardPre}>PLAN ACTUAL</span>
              <h3 style={styles.planCardTitle}>{plan?.name || 'Plan Pro Inmobiliaria'}</h3>
            </div>
            <span style={styles.planActivePill}>
              <Check size={11} strokeWidth={3} />
              <span>Activo</span>
            </span>
          </div>

          <div style={styles.planCardDivider} />

          <div style={styles.planCardBottom}>
            <div style={styles.planStat}>
              <span style={styles.planStatVal}>{plan?.propertiesUsed ?? 12} / {plan?.propertiesLimit ?? 50}</span>
              <span style={styles.planStatKey}>Propiedades</span>
            </div>
            <div style={styles.planStatDivider} />
            <div style={styles.planStat}>
              <span style={styles.planStatVal}>{agents.length} / {plan?.agentsLimit ?? 10}</span>
              <span style={styles.planStatKey}>Agentes</span>
            </div>
            <div style={styles.planStatDivider} />
            <div style={styles.planStat}>
              <span style={styles.planStatVal}>15/10/26</span>
              <span style={styles.planStatKey}>Renovación</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN 2: AGENTES DEL EQUIPO (LISTADO LIMPIO ESTILO IOS / LINEAR)
          ========================================================================= */}
      <div style={styles.sectionBlock}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={styles.sectionHeading}>
            Agentes <span>({agents.length})</span>
          </h3>
          <button 
            type="button" 
            style={styles.inviteBtn}
            onClick={() => setIsInviteAgentOpen(true)}
          >
            <UserPlus size={13} strokeWidth={2.4} />
            <span>Invitar</span>
          </button>
        </div>

        <div style={styles.teamListContainer}>
          {agents.map((agent, index) => {
            const isOwner = agent.role === 'owner';
            const isPending = agent.status === 'invited';

            return (
              <div 
                key={agent.id} 
                style={{
                  ...styles.agentRow,
                  borderBottom: index === agents.length - 1 ? 'none' : '1px solid #f1f5f9'
                }}
              >
                {/* Avatar */}
                <div style={{
                  ...styles.agentMiniAvatar,
                  backgroundColor: isOwner ? '#0f172a' : '#f1f5f9',
                  color: isOwner ? '#ffffff' : '#475569'
                }}>
                  {agent.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>

                {/* Info */}
                <div style={styles.agentMainInfo}>
                  <div style={styles.agentTitleRow}>
                    <span style={styles.agentName}>{agent.name}</span>
                    {isOwner ? (
                      <span style={styles.ownerPill}>Owner</span>
                    ) : isPending ? (
                      <span style={styles.pendingPill}>Invitado</span>
                    ) : (
                      <span style={styles.agentPill}>Agente</span>
                    )}
                  </div>
                  <span style={styles.agentEmail}>{agent.email}</span>
                </div>

                {/* Acciones */}
                <div style={styles.agentRowActions}>
                  {isPending && (
                    <button 
                      type="button" 
                      style={styles.resendActionBtn}
                      onClick={() => {
                        onResendInvite(agent.id);
                        showToast(`Reenviado a ${agent.email}`);
                      }}
                      title="Reenviar invitación"
                    >
                      <RotateCw size={12} color="#4f46e5" />
                    </button>
                  )}

                  {!isOwner && (
                    <button 
                      type="button" 
                      style={styles.deleteActionBtn}
                      onClick={() => handleRemove(agent.id, agent.name)}
                      title="Eliminar"
                    >
                      <Trash2 size={13} color="#94a3b8" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: '90px' }} />

      {/* =========================================================================
          MODAL: EDITAR PERFIL
          ========================================================================= */}
      {/* =========================================================================
          MODAL: EDITAR PERFIL DE LA INMOBILIARIA
          ========================================================================= */}
      {isEditAgencyOpen && (
        <div 
          className="app-modal-backdrop" 
          style={styles.modalBackdrop} 
          onClick={() => !isSavingAgency && setIsEditAgencyOpen(false)}
        >
          <div 
            className="app-modal-sheet" 
            style={styles.modalSheet} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHandle} />
            <div style={styles.modalTopRow}>
              <h4 style={styles.modalTitle}>Editar Inmobiliaria</h4>
              <button 
                type="button" 
                style={styles.modalCloseBtn}
                onClick={() => !isSavingAgency && setIsEditAgencyOpen(false)}
                disabled={isSavingAgency}
                aria-label="Cerrar modal"
              >
                <X size={16} color="#64748b" />
              </button>
            </div>

            <div className="app-modal-content-body no-scrollbar" style={styles.modalContentScroll}>
              <form onSubmit={handleSaveAgency} style={styles.formStack}>
                
                {/* 1. Nombre de la Inmobiliaria */}
                <div style={styles.inputStack}>
                  <label style={styles.label}>Nombre de la Inmobiliaria *</label>
                  <input 
                    type="text" 
                    value={formAgencyName}
                    onChange={(e) => setFormAgencyName(e.target.value)}
                    placeholder="Ej: Real State Diego"
                    style={styles.inputField}
                    required
                    disabled={isSavingAgency}
                  />
                </div>

                {/* 2. Logo */}
                <div style={styles.inputStack}>
                  <label style={styles.label}>Logo oficial</label>
                  
                  {logoError && (
                    <div style={styles.logoErrorBox}>
                      <AlertCircle size={13} color="#ef4444" />
                      <span>{logoError}</span>
                    </div>
                  )}

                  {logoPreview ? (
                    <div style={styles.logoPreviewCard}>
                      <div style={styles.logoPreviewBox}>
                        <img 
                          src={logoPreview} 
                          alt="Preview logo" 
                          style={styles.logoPreviewImg}
                          onError={(e) => {
                            if (e.target.src !== logoDefault) {
                              e.target.src = logoDefault;
                            }
                          }}
                        />
                      </div>
                      <div style={styles.logoActionBtns}>
                        <label htmlFor="edit-agency-logo-input" style={styles.changeLogoBtn}>
                          <Camera size={13} color="#0f172a" />
                          <span>Cambiar logo</span>
                        </label>
                        <button 
                          type="button" 
                          style={styles.removeLogoBtn}
                          onClick={() => setLogoPreview(null)}
                          disabled={isSavingAgency}
                        >
                          <Trash2 size={13} color="#ef4444" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                      <input 
                        type="file" 
                        id="edit-agency-logo-input" 
                        accept="image/*"
                        onChange={handleLogoChange}
                        style={{ display: 'none' }}
                        disabled={isSavingAgency}
                      />
                    </div>
                  ) : (
                    <div style={styles.uploadDashedBox}>
                      <input 
                        type="file" 
                        id="edit-agency-logo-input" 
                        accept="image/*"
                        onChange={handleLogoChange}
                        style={{ display: 'none' }}
                        disabled={isSavingAgency}
                      />
                      <label htmlFor="edit-agency-logo-input" style={styles.uploadLabel}>
                        <div style={styles.uploadIconCircle}>
                          <Upload size={17} color="#4f46e5" />
                        </div>
                        <span style={styles.uploadTitle}>Subir logo de la inmobiliaria</span>
                        <span style={styles.uploadSub}>PNG, JPG o WEBP (máx. 5MB)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. País */}
                <div style={styles.inputStack}>
                  <label style={styles.label}>País *</label>
                  <select 
                    value={formCountry}
                    onChange={handleCountryChange}
                    style={styles.selectField}
                    disabled={isSavingAgency}
                    required
                  >
                    {getCountries().map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Provincia / Depto. y Ciudad en fila */}
                <div style={styles.formRow}>
                  <div style={{ ...styles.inputStack, flex: 1 }}>
                    <label style={styles.label}>Provincia / Depto. *</label>
                    <select 
                      value={formState}
                      onChange={handleStateChange}
                      style={styles.selectField}
                      disabled={isSavingAgency || availableStates.length === 0}
                      required
                    >
                      {availableStates.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ ...styles.inputStack, flex: 1 }}>
                    <label style={styles.label}>Ciudad *</label>
                    <select 
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      style={styles.selectField}
                      disabled={isSavingAgency || availableCities.length === 0}
                      required
                    >
                      {formCity && !availableCities.includes(formCity) && (
                        <option value={formCity}>{formCity}</option>
                      )}
                      {availableCities.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Sitio Web */}
                <div style={styles.inputStack}>
                  <label style={styles.label}>Sitio Web de la Inmobiliaria</label>
                  <div style={styles.urlInputWrap}>
                    <span style={styles.urlPrefix}>https://</span>
                    <input 
                      type="text" 
                      value={formAgencyWebsite}
                      onChange={(e) => setFormAgencyWebsite(e.target.value.replace(/^https?:\/\//i, ''))}
                      placeholder="www.miinmobiliaria.com"
                      style={styles.urlInputField}
                      disabled={isSavingAgency}
                    />
                  </div>
                  <span style={styles.formHint}>Dominio de tu portal para compartir e informes</span>
                </div>

                {/* Botón Guardar */}
                <button 
                  type="submit" 
                  style={{
                    ...styles.submitBtn,
                    opacity: isSavingAgency ? 0.75 : 1,
                    cursor: isSavingAgency ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isSavingAgency}
                >
                  {isSavingAgency ? (
                    <>
                      <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} color="#ffffff" strokeWidth={2.5} />
                      <span>Guardar cambios</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INVITAR AGENTE
          ========================================================================= */}
      {isInviteAgentOpen && (
        <div className="app-modal-backdrop" style={styles.modalBackdrop} onClick={() => setIsInviteAgentOpen(false)}>
          <div className="app-modal-sheet" style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHandle} />
            <div style={styles.modalTopRow}>
              <h4 style={styles.modalTitle}>Invitar nuevo agente</h4>
              <button 
                type="button" 
                style={styles.modalCloseBtn}
                onClick={() => setIsInviteAgentOpen(false)}
              >
                <X size={16} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} style={styles.formStack}>
              <div style={styles.inputStack}>
                <label style={styles.label}>Nombre y Apellido</label>
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ej: Sofía Martínez"
                  style={styles.inputField}
                  autoFocus
                  required
                />
              </div>

              <div style={styles.inputStack}>
                <label style={styles.label}>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="sofia@inmobiliaria.com"
                  style={styles.inputField}
                  required
                />
              </div>

              <div style={styles.inputStack}>
                <label style={styles.label}>Rol</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={styles.selectField}
                >
                  <option value="agent">Agente (Carga y edición de inventarios)</option>
                  <option value="admin">Administrador (Gestión de equipo)</option>
                </select>
              </div>

              <button type="submit" style={styles.submitBtn}>
                <Mail size={15} strokeWidth={2.4} />
                <span>Enviar invitación</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: '0 20px',
    paddingTop: '6px',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 300,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '8px 14px',
    borderRadius: '20px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12.5px',
    fontWeight: '600',
  },

  /* Hero Profile */
  profileHero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '16px 12px 22px 12px',
    marginBottom: '16px',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
  },
  avatarCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
    padding: '8px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  agencyName: {
    fontSize: '19px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  agencyMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12.5px',
    color: '#64748b',
    fontWeight: '500',
  },
  metaDot: {
    color: '#cbd5e1',
    fontSize: '12px',
  },
  websiteLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12.5px',
    color: '#4f46e5',
    fontWeight: '600',
    textDecoration: 'none',
  },
  editProfileBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '14px',
    padding: '7px 14px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  /* Section Block */
  sectionBlock: {
    marginBottom: '16px',
  },

  /* Plan Card */
  planCard: {
    borderRadius: '16px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '16px',
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
  },
  planCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planCardPre: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: '0.6px',
  },
  planCardTitle: {
    fontSize: '15.5px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '2px 0 0 0',
    letterSpacing: '-0.2px',
  },
  planActivePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '12px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#4ade80',
    fontSize: '11px',
    fontWeight: '700',
  },
  planCardDivider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '12px 0',
  },
  planCardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  planStatVal: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
  },
  planStatKey: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  planStatDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  /* Team List */
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    padding: '0 2px',
  },
  sectionHeading: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  inviteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  teamListContainer: {
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
    overflow: 'hidden',
  },
  agentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
  },
  agentMiniAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '800',
    flexShrink: 0,
  },
  agentMainInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  agentTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  agentName: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  ownerPill: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  agentPill: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  pendingPill: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  agentEmail: {
    fontSize: '12px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  agentRowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  resendActionBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  deleteActionBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  /* Modales */
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
    alignItems: 'center',
    marginBottom: '14px',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
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
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  inputStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
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
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  urlInputWrap: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  urlPrefix: {
    padding: '10px 0 10px 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    userSelect: 'none',
  },
  urlInputField: {
    flex: 1,
    padding: '10px 12px 10px 4px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
  },
  formHint: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: '2px',
  },
  logoErrorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid #fecaca',
  },
  logoPreviewCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  logoPreviewBox: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '6px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    flexShrink: 0,
  },
  logoPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  logoActionBtns: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  changeLogoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  removeLogoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '7px 12px',
    borderRadius: '8px',
    backgroundColor: '#fff1f2',
    border: '1px solid #ffe4e6',
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  uploadDashedBox: {
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    padding: '18px 14px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  uploadIconCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2px',
  },
  uploadTitle: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadSub: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '500',
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
