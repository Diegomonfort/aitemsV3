import React, { useState, useEffect } from 'react';
import { toast } from '../context/ToastContext';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Pencil, 
  CheckCircle2, 
  Users, 
  UserPlus, 
  Mail, 
  Trash2, 
  RotateCw, 
  X, 
  Check, 
  ExternalLink,
  Upload,
  Camera,
  Loader2,
  AlertCircle,
  Laptop,
  Copy,
  Clock
} from 'lucide-react';
import logoDefault from '../assets/logo-color.png';
import { getCountries, getStates, getCities } from '../data/locationData';
import BottomSheet from './BottomSheet';
import { agencyService } from '../services/agencyService';

export default function OwnerDashboard({
  agency,
  onUpdateAgency,
  plan,
  onUpdatePlan,
  agents = [],
  onAddAgent,
  onRemoveAgent,
  onResendInvite,
}) {
  const safeAgents = Array.isArray(agents) ? agents : [];

  // Modales
  const [isEditAgencyOpen, setIsEditAgencyOpen] = useState(false);
  const [isInviteAgentOpen, setIsInviteAgentOpen] = useState(false);
  const [isManagePlanOpen, setIsManagePlanOpen] = useState(false);
  const [agentToRemove, setAgentToRemove] = useState(null);

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

  // Formulario Invitar Inspector (Solo Email)
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [createdInviteLink, setCreatedInviteLink] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  // Toast global
  const showToast = (msg) => toast.success(msg);



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

  const handleSendInvite = async (e) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setInviteError('Ingresá el correo electrónico del inspector.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setInviteError('Ingresá un formato de email válido.');
      return;
    }

    setIsSubmittingInvite(true);
    setInviteError('');

    try {
      const res = await agencyService.createInvitation(cleanEmail, 'agent');
      if (res && (res.success || res.invitation)) {
        toast.success(`Invitación enviada por email a ${cleanEmail}`);
        const code = res.code || res.invitation?.invitation_token || '';
        const link = res.invitationLink || (code ? `https://aitems.app/accept-invitation?token=${code}` : '');
        setCreatedInviteCode(code);
        setCreatedInviteLink(link);

        if (onAddAgent) {
          onAddAgent({
            id: res.invitation?.id || Date.now(),
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
            role: 'agent',
            status: 'invited',
            joined: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          });
        }
      } else {
        throw new Error(res?.message || res?.error || 'Error al enviar la invitación');
      }
    } catch (err) {
      console.error('Error enviando invitación:', err);
      const msg = err.response?.data?.message || err.message || 'No se pudo enviar la invitación';
      setInviteError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (!createdInviteCode) return;
    navigator.clipboard.writeText(createdInviteCode);
    setHasCopiedCode(true);
    toast.success('¡Código de invitación copiado!');
    setTimeout(() => setHasCopiedCode(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const code = createdInviteCode;
    const inmo = agency?.name || 'Aitems';
    const text = `¡Hola! Te invito a unirte al equipo de ${inmo} en Aitems.\n\n1. Descargá o abrí la App de Aitems\n2. Tocá en "Registrarse" y elegí "Tengo código de invitación"\n3. Ingresá este código de 6 caracteres: *${code}*`;
    window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyInviteLink = () => {
    if (!createdInviteLink) return;
    navigator.clipboard.writeText(createdInviteLink);
    setHasCopiedLink(true);
    toast.success('¡Enlace de invitación copiado al portapapeles!');
    setTimeout(() => setHasCopiedLink(false), 3000);
  };

  const handleCloseInviteModal = () => {
    setIsInviteAgentOpen(false);
    setInviteEmail('');
    setInviteError('');
    setCreatedInviteLink('');
    setCreatedInviteCode('');
    setHasCopiedLink(false);
    setHasCopiedCode(false);
    setIsSubmittingInvite(false);
  };

  const handleConfirmRemoveAgent = () => {
    if (agentToRemove) {
      onRemoveAgent(agentToRemove.id);
      showToast(`${agentToRemove.name} removido de la inmobiliaria`);
      setAgentToRemove(null);
    }
  };

  return (
    <main key="dashboard-view" className="app-main-content" style={styles.container}>


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
              <h3 style={styles.planCardTitle}>{plan?.name || 'Plan Free'}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.planActivePill}>
                <Check size={11} strokeWidth={3} />
                <span>{plan?.status === 'active' || !plan?.status ? 'Activo' : plan.status}</span>
              </span>
              <button
                type="button"
                style={styles.planManageBtn}
                onClick={() => setIsManagePlanOpen(true)}
              >
                <span>Gestionar</span>
              </button>
            </div>
          </div>

          <div style={styles.planCardDivider} />

          <div style={styles.planCardBottom}>
            <div style={styles.planStat}>
              <span style={styles.planStatVal}>{plan?.propertiesUsed ?? 0} / {plan?.propertiesLimit ?? 10}</span>
              <span style={styles.planStatKey}>Propiedades</span>
            </div>
            <div style={styles.planStatDivider} />
            <div style={styles.planStat}>
              <span style={styles.planStatVal}>{safeAgents.length} / {plan?.agentsLimit ?? 1}</span>
              <span style={styles.planStatKey}>Agentes</span>
            </div>
            <div style={styles.planStatDivider} />
            <div style={styles.planStat}>
              <span style={styles.planStatVal}>{plan?.renewalDate || 'Sin vencimiento'}</span>
              <span style={styles.planStatKey}>Renovación</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN 2: AGENTES / INSPECTORES DEL EQUIPO (LISTADO LIMPIO)
          ========================================================================= */}
      <div style={styles.sectionBlock}>
        <div style={styles.sectionHeaderRow}>
          <h3 style={styles.sectionHeading}>
            Inspectores y Colegas <span>({safeAgents.length})</span>
          </h3>
          <button 
            type="button" 
            style={styles.inviteBtn}
            onClick={() => {
              if (plan?.name === 'Plan Free' || (plan?.agentsLimit && plan.agentsLimit <= 1)) {
                toast.info('El Plan Free no permite agregar inspectores. Podés ampliar tu plan a Starter o Pro.');
                setIsManagePlanOpen(true);
                return;
              }
              setIsInviteAgentOpen(true);
            }}
          >
            <UserPlus size={13} strokeWidth={2.4} />
            <span>Invitar</span>
          </button>
        </div>

        <div style={styles.teamListContainer}>
          {safeAgents.map((agent, index) => {
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
                      onClick={() => setAgentToRemove({ id: agent.id, name: agent.name })}
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
        <BottomSheet
          isOpen={isEditAgencyOpen}
          onClose={() => !isSavingAgency && setIsEditAgencyOpen(false)}
          title="Editar Inmobiliaria"
          size="full"
        >
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
        </BottomSheet>
      )}

      {/* =========================================================================
          MODAL: INVITAR INSPECTOR (SOLO EMAIL, IDÉNTICO A DESKTOP)
          ========================================================================= */}
      {isInviteAgentOpen && (
        <BottomSheet
          isOpen={isInviteAgentOpen}
          onClose={handleCloseInviteModal}
          title={createdInviteLink ? '¡Invitación enviada!' : 'Invitar nuevo inspector'}
          size="auto"
        >
          {createdInviteLink ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0 10px 0' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}>
                <CheckCircle2 size={24} color="#10b981" strokeWidth={2.4} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                  Invitación enviada
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.45', margin: 0 }}>
                  Se envió un correo a <strong>{inviteEmail}</strong> con las instrucciones de acceso para unirse a <strong>{agency?.name || 'la inmobiliaria'}</strong>.
                </p>
              </div>

              {/* Tarjeta con CÓDIGO DE ACCESO PARA APP */}
              {createdInviteCode && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1.5px dashed #86efac',
                  borderRadius: '16px',
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      CÓDIGO PARA APP MÓVIL
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: '#15803d',
                      backgroundColor: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Clock size={10} /> 7 días
                    </span>
                  </div>

                  <div style={{
                    fontSize: '30px',
                    fontWeight: '900',
                    letterSpacing: '8px',
                    color: '#14532d',
                    fontFamily: 'monospace',
                    background: '#ffffff',
                    padding: '8px 24px',
                    borderRadius: '12px',
                    border: '1.5px solid #bbf7d0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    userSelect: 'all',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}>
                    {createdInviteCode}
                  </div>

                  <span style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.35 }}>
                    El inspector descarga la app y elige <strong>"Tengo código de invitación"</strong> al registrarse.
                  </span>

                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: hasCopiedCode ? '#dcfce7' : '#ffffff',
                        color: hasCopiedCode ? '#15803d' : '#166534',
                        border: hasCopiedCode ? '1px solid #86efac' : '1px solid #bbf7d0',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {hasCopiedCode ? (
                        <>
                          <Check size={14} strokeWidth={2.6} />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copiar código</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: '#25D366',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(37,211,102,0.3)',
                      }}
                    >
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tarjeta con enlace directo (Web) */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                    O Enlace directo para navegador
                  </span>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '9px 11px',
                  fontSize: '11.5px',
                  color: '#334155',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}>
                  {createdInviteLink}
                </div>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: hasCopiedLink ? '#ecfdf5' : '#eef2ff',
                    color: hasCopiedLink ? '#059669' : '#4f46e5',
                    border: hasCopiedLink ? '1px solid #a7f3d0' : '1px solid #e0e7ff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                  onClick={handleCopyInviteLink}
                >
                  {hasCopiedLink ? (
                    <>
                      <Check size={14} strokeWidth={2.6} />
                      <span>¡Enlace copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar enlace web</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
                onClick={handleCloseInviteModal}
              >
                Listo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} style={styles.formStack}>
              {inviteError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  color: '#b91c1c',
                  fontSize: '12.5px',
                }}>
                  <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>{inviteError}</span>
                </div>
              )}

              <div style={styles.inputStack}>
                <label style={styles.label}>
                  Correo electrónico del inspector <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError('');
                  }}
                  placeholder="ejemplo@inmobiliaria.com"
                  style={styles.inputField}
                  disabled={isSubmittingInvite}
                  autoFocus
                  required
                />
                <span style={styles.formHint}>
                  Se le enviará un correo con el enlace para sumarse al equipo de inspectores de la inmobiliaria.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '6px' }}>
                <button 
                  type="submit" 
                  style={{
                    ...styles.submitBtn,
                    opacity: isSubmittingInvite ? 0.75 : 1,
                    cursor: isSubmittingInvite ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isSubmittingInvite || !inviteEmail.trim()}
                >
                  {isSubmittingInvite ? (
                    <>
                      <Loader2 size={15} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Enviando invitación...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={15} strokeWidth={2.4} />
                      <span>Enviar invitación</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  onClick={handleCloseInviteModal}
                  disabled={isSubmittingInvite}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </BottomSheet>
      )}

      {/* =========================================================================
          MODAL: GESTIÓN DE PLAN (AVISO DE ESCRITORIO EN AITEMSAPP.COM)
          ========================================================================= */}
      {isManagePlanOpen && (
        <BottomSheet
          isOpen={isManagePlanOpen}
          onClose={() => setIsManagePlanOpen(false)}
          title="Gestión de Suscripción"
          size="auto"
        >
          <div style={styles.managePlanContent}>
            {/* Icono de Computadora */}
            <div style={styles.managePlanIconWrap}>
              <Laptop size={26} color="#4f46e5" strokeWidth={2.2} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h4 style={styles.managePlanTitle}>
                {plan?.name || 'Plan Free'}
              </h4>
              <p style={styles.managePlanSubtitle}>
                Para cambiar de plan, ampliar límites de propiedades o gestionar tus métodos de pago, ingresá desde tu computadora a la versión de escritorio:
              </p>
            </div>

            {/* Tarjeta con el enlace aitemsapp.com */}
            <div style={styles.desktopLinkCard}>
              <div style={styles.desktopLinkIconBox}>
                <Globe size={18} color="#4f46e5" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={styles.desktopLinkSiteTitle}>aitemsapp.com</span>
                <span style={styles.desktopLinkSiteDesc}>Plataforma web de escritorio</span>
              </div>
              <a
                href="https://aitemsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.desktopLinkActionBtn}
              >
                <ExternalLink size={14} color="#4f46e5" />
              </a>
            </div>

            {/* Resumen de límites actuales */}
            <div style={styles.managePlanStatsBox}>
              <div style={styles.managePlanStatItem}>
                <span style={styles.managePlanStatVal}>{plan?.propertiesLimit ?? 10}</span>
                <span style={styles.managePlanStatKey}>Propiedades</span>
              </div>
              <div style={styles.managePlanStatDivider} />
              <div style={styles.managePlanStatItem}>
                <span style={styles.managePlanStatVal}>{plan?.agentsLimit ?? 1}</span>
                <span style={styles.managePlanStatKey}>Inspectores</span>
              </div>
              <div style={styles.managePlanStatDivider} />
              <div style={styles.managePlanStatItem}>
                <span style={styles.managePlanStatVal}>{plan?.renewalDate || 'Sin vencimiento'}</span>
                <span style={styles.managePlanStatKey}>Renovación</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', width: '100%', marginTop: '4px' }}>
              <a
                href="https://aitemsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.openDesktopWebBtn}
              >
                <ExternalLink size={16} strokeWidth={2.4} />
                <span>Abrir aitemsapp.com</span>
              </a>

              <button
                type="button"
                style={styles.closeManagePlanBtn}
                onClick={() => setIsManagePlanOpen(false)}
              >
                <span>Entendido</span>
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* =========================================================================
          MODAL: CONFIRMAR QUITAR INSPECTOR / COLEGA
          ========================================================================= */}
      {agentToRemove && (
        <BottomSheet
          isOpen={!!agentToRemove}
          onClose={() => setAgentToRemove(null)}
          title="Quitar del equipo"
          size="auto"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '10px 0' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trash2 size={24} color="#dc2626" strokeWidth={2.2} />
            </div>

            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                ¿Quitar a {agentToRemove.name}?
              </h4>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.45', margin: 0 }}>
                Ya no formará parte de la inmobiliaria ni tendrá permisos para realizar inventarios.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', width: '100%', marginTop: '6px' }}>
              <button
                type="button"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
                onClick={handleConfirmRemoveAgent}
              >
                <Trash2 size={16} />
                <span>Quitar del equipo</span>
              </button>

              <button
                type="button"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={() => setAgentToRemove(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </BottomSheet>
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
  planManageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 9px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.22)',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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

  /* Manage Plan Modal Styles */
  managePlanContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
    padding: '6px 0 10px 0',
  },
  managePlanIconWrap: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    backgroundColor: '#eef2ff',
    border: '1px solid #e0e7ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managePlanTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 6px 0',
    letterSpacing: '-0.3px',
  },
  managePlanSubtitle: {
    fontSize: '13.5px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0,
    maxWidth: '320px',
  },
  desktopLinkCard: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  },
  desktopLinkIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  desktopLinkSiteTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#4f46e5',
    display: 'block',
  },
  desktopLinkSiteDesc: {
    fontSize: '11.5px',
    color: '#64748b',
    display: 'block',
  },
  desktopLinkActionBtn: {
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
  },
  managePlanStatsBox: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    boxSizing: 'border-box',
  },
  managePlanStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    flex: 1,
  },
  managePlanStatVal: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#0f172a',
  },
  managePlanStatKey: {
    fontSize: '10.5px',
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  managePlanStatDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#cbd5e1',
  },
  openDesktopWebBtn: {
    width: '100%',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
    boxSizing: 'border-box',
  },
  closeManagePlanBtn: {
    width: '100%',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
