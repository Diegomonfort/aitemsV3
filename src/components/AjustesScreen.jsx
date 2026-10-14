import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  HelpCircle, 
  Info, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  Mail, 
  MessageCircle, 
  AlertTriangle, 
  ExternalLink, 
  Check, 
  MapPin,
  X,
  Loader2
} from 'lucide-react';
import logoColor from '../assets/logo-color.png';
import { getCountries, getStates, getCities } from '../data/locationData';
import BottomSheet from './BottomSheet';
import { toast } from '../context/ToastContext';
import { userService } from '../services/userService';

const FAQ_ITEMS = [
  {
    question: "¿Cómo creo un inventario?",
    answer: "El proceso es simple: Primero crea una Propiedad. Dentro de ella, añade Ambientes (ej: Cocina, Baño). Finalmente, entra en cada ambiente y agrega los Ítems tanto por voz, como con fotos o IA."
  },
  {
    question: "¿Puedo personalizar el reporte PDF?",
    answer: "¡Sí! El reporte PDF se genera automáticamente con el logo y los datos de tu Inmobiliaria configurados en tu perfil o Dashboard."
  },
  {
    question: "¿Cómo funcionan los agentes?",
    answer: "Los agentes son miembros de tu equipo inmobiliario. Ellos heredan tu plan de suscripción y pueden crear inventarios y planos bajo tu misma organización."
  },
  {
    question: "¿Cómo funciona el editor de planos?",
    answer: "Puedes subir un plano existente o trazar habitaciones desde cero. El editor te permite dibujar paredes, añadir puertas, ventanas y mobiliario con medidas automáticas."
  },
  {
    question: "¿Cómo cambio o gestiono mi plan?",
    answer: "Puedes gestionar tu suscripción en cualquier momento desde el 'Panel de Inmobiliaria', donde encontrarás las opciones para actualizar o administrar tus licencias."
  }
];

export default function AjustesScreen({
  currentUser,
  agency,
  propertiesCount = 0,
  agentsCount = 0,
  onUpdateUser,
  onBack,
  onLogout
}) {
  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Edit profile form
  const [formName, setFormName] = useState(currentUser?.name || 'Diego M');
  const [formEmail, setFormEmail] = useState(currentUser?.email || 'monfortdiego@gmail.com');
  const [formCountry, setFormCountry] = useState(currentUser?.country || 'Uruguay');
  const [formState, setFormState] = useState(currentUser?.state || 'Maldonado');
  const [formCity, setFormCity] = useState(currentUser?.city || 'Punta del Este');

  const [availableStates, setAvailableStates] = useState(() => getStates(formCountry));
  const [availableCities, setAvailableCities] = useState(() => getCities(formCountry, formState));

  // Sincronizar formulario cada vez que currentUser cambie o al abrir modal
  useEffect(() => {
    if (currentUser) {
      const userCountry = currentUser.country || 'Uruguay';
      const userState = currentUser.state || '';
      const userCity = currentUser.city || '';
      setFormName(currentUser.name || '');
      setFormEmail(currentUser.email || '');
      setFormCountry(userCountry);
      setFormState(userState);
      setFormCity(userCity);

      const states = getStates(userCountry);
      setAvailableStates(states);
      if (userState) {
        setAvailableCities(getCities(userCountry, userState));
      }
    }
  }, [currentUser, isEditProfileOpen]);

  // Delete account confirmation input
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Handle country change
  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setFormCountry(newCountry);
    const states = getStates(newCountry);
    setAvailableStates(states);
    const firstState = states[0] || '';
    setFormState(firstState);
    const cities = getCities(newCountry, firstState);
    setAvailableCities(cities);
    setFormCity(cities[0] || '');
  };

  // Handle state change
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setFormState(newState);
    const cities = getCities(formCountry, newState);
    setAvailableCities(cities);
    setFormCity(cities[0] || '');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    try {
      setIsSavingProfile(true);
      const updateData = {
        name: formName.trim(),
        country: formCountry,
        state: formState,
        city: formCity
      };

      const res = await userService.updateUserProfile(currentUser?.id, updateData);

      if (res?.success) {
        toast.success('Perfil actualizado correctamente');
        if (onUpdateUser) {
          onUpdateUser({
            ...currentUser,
            ...updateData
          });
        }
        setIsEditProfileOpen(false);
      } else {
        toast.error(res?.error || res?.message || 'Error al actualizar el perfil');
      }
    } catch (err) {
      console.error('Error guardando perfil:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'ELIMINAR') {
      toast.error("Debes escribir la palabra 'ELIMINAR' para confirmar");
      return;
    }

    try {
      setIsDeletingAccount(true);
      const res = await userService.deleteAccount(currentUser?.id);

      if (res?.success) {
        toast.success('Tu cuenta ha sido eliminada correctamente');
        setIsDeleteAccountOpen(false);
        setDeleteConfirmationText('');
        if (onLogout) {
          await onLogout();
        }
      } else {
        toast.error(res?.message || res?.error || 'Error al eliminar la cuenta');
      }
    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      toast.error('Error al procesar la eliminación de la cuenta');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Get user initial
  const getUserInitial = () => {
    if (currentUser?.name && currentUser.name.trim().length > 0) {
      return currentUser.name.trim().charAt(0).toUpperCase();
    }
    if (currentUser?.email && currentUser.email.trim().length > 0) {
      return currentUser.email.trim().charAt(0).toUpperCase();
    }
    return 'D';
  };

  return (
    <div style={styles.container}>
      {/* ============ HEADER ============ */}
      <header style={styles.header}>
        <button 
          style={styles.backBtn} 
          onClick={onBack}
          aria-label="Volver"
        >
          <ArrowLeft size={22} color="#0f172a" />
        </button>
        <h1 style={styles.headerTitle}>Ajustes</h1>
        <div style={styles.headerSpacer} />
      </header>

      <main style={styles.content}>
        {/* ============ TARJETA USUARIO ============ */}
        <section style={styles.userCard}>
          <div style={styles.userAvatar}>
            <span>{getUserInitial()}</span>
          </div>
          <div style={styles.userInfo}>
            <h2 style={styles.userName}>{currentUser?.name || 'Diego M'}</h2>
            <p style={styles.userSubtitle}>{agency?.name || 'Real State Diego'}</p>
          </div>
          <button 
            style={styles.editBtn} 
            onClick={() => setIsEditProfileOpen(true)}
            aria-label="Editar perfil"
          >
            <Pencil size={18} color="#3b82f6" strokeWidth={2.2} />
          </button>
        </section>

        {/* ============ TARJETA INMOBILIARIA ============ */}
        <section style={styles.agencyCard}>
          <div style={styles.agencyLogoWrap}>
            <img 
              src={agency?.logo || logoColor} 
              alt={agency?.name || 'Inmobiliaria'} 
              style={styles.agencyLogo} 
            />
          </div>
          <div style={styles.agencyInfo}>
            <h3 style={styles.agencyName}>{agency?.name || 'Real State Diego'}</h3>
            <p style={styles.agencyLocation}>{agency?.location || agency?.country || 'Uruguay'}</p>
            <span style={styles.agencyStats}>
              {agentsCount || 4} Agentes | {propertiesCount || 20} Propiedades
            </span>
          </div>
        </section>

        {/* ============ SECCIÓN CONFIGURACIÓN ============ */}
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>CONFIGURACIÓN</span>
        </div>

        <div style={styles.groupedCard}>
          <button 
            type="button" 
            style={styles.groupItem} 
            onClick={() => setIsTermsOpen(true)}
          >
            <div style={styles.groupItemLeft}>
              <Shield size={20} color="#3b82f6" strokeWidth={2} />
              <span style={styles.groupItemText}>Términos y condiciones</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>

          <div style={styles.itemDivider} />

          <button 
            type="button" 
            style={styles.groupItem} 
            onClick={() => setIsSupportOpen(true)}
          >
            <div style={styles.groupItemLeft}>
              <HelpCircle size={20} color="#3b82f6" strokeWidth={2} />
              <span style={styles.groupItemText}>Soporte</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>

          <div style={styles.itemDivider} />

          <button 
            type="button" 
            style={styles.groupItem} 
            onClick={() => setIsHelpOpen(true)}
          >
            <div style={styles.groupItemLeft}>
              <Info size={20} color="#3b82f6" strokeWidth={2} />
              <span style={styles.groupItemText}>Ayuda</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>
        </div>

        {/* ============ SECCIÓN CUENTA (APPLE GUIDELINE COMPLIANCE) ============ */}
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>CUENTA</span>
        </div>

        <div style={styles.groupedCardDanger}>
          <button 
            type="button" 
            style={styles.groupItemDanger} 
            onClick={() => setIsDeleteAccountOpen(true)}
          >
            <div style={styles.groupItemLeft}>
              <Trash2 size={20} color="#ef4444" strokeWidth={2} />
              <span style={styles.groupItemDangerText}>Eliminar cuenta</span>
            </div>
            <ChevronRight size={18} color="#fca5a5" />
          </button>
        </div>

        {/* Espaciado inferior de seguridad */}
        <div style={{ height: '40px' }} />
      </main>

      {/* ============ MODAL 1: EDITAR PERFIL ============ */}
      <BottomSheet
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Editar Perfil"
        subtitle="Actualiza tu información personal"
        size="auto"
      >
        <form onSubmit={handleSaveProfile} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Nombre Completo</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ingresa tu nombre completo"
              style={styles.formInput}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Email</label>
            <input
              type="email"
              value={formEmail}
              disabled
              style={{ ...styles.formInput, backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
            />
            <span style={styles.formHelperText}>El email no se puede modificar</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>País</label>
            <select
              value={formCountry}
              onChange={handleCountryChange}
              style={styles.formSelect}
            >
              {getCountries().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Estado / Departamento</label>
            <select
              value={formState}
              onChange={handleStateChange}
              style={styles.formSelect}
            >
              {availableStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Ciudad</label>
            <select
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
              style={styles.formSelect}
            >
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div style={styles.formActions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => setIsEditProfileOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: isSavingProfile ? 0.7 : 1,
                cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 size={18} color="#ffffff" className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* ============ MODAL 2: SOPORTE ============ */}
      <BottomSheet
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        title="Soporte Técnico"
        subtitle="¿Necesitas ayuda? Contáctanos por cualquiera de estos canales:"
        size="auto"
      >
        <div style={styles.supportContainer}>
          {/* Opción Email */}
          <div style={styles.supportCard}>
            <div style={styles.supportIconWrapEmail}>
              <Mail size={22} color="#3b82f6" />
            </div>
            <div style={styles.supportInfo}>
              <h4 style={styles.supportTitle}>Email</h4>
              <p style={styles.supportDesc}>soporte@aitems.uy</p>
            </div>
            <a
              href="mailto:soporte@aitems.uy"
              style={styles.supportActionBtn}
            >
              Enviar correo
            </a>
          </div>

          {/* Opción WhatsApp */}
          <div style={styles.supportCard}>
            <div style={styles.supportIconWrapWa}>
              <MessageCircle size={22} color="#16a34a" />
            </div>
            <div style={styles.supportInfo}>
              <h4 style={styles.supportTitle}>WhatsApp</h4>
              <p style={styles.supportDesc}>+598 94 539 866</p>
            </div>
            <a
              href="https://wa.me/59894539866"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.supportActionBtnWa}
            >
              Enviar mensaje
            </a>
          </div>

          <button
            type="button"
            style={styles.closeFullBtn}
            onClick={() => setIsSupportOpen(false)}
          >
            Cerrar
          </button>
        </div>
      </BottomSheet>

      {/* ============ MODAL 3: AYUDA (FAQ) ============ */}
      <BottomSheet
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Centro de Ayuda"
        subtitle="Preguntas frecuentes sobre el uso de Aitems"
        size="auto"
      >
        <div style={styles.faqList}>
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} style={styles.faqCard}>
              <h4 style={styles.faqQuestion}>{item.question}</h4>
              <p style={styles.faqAnswer}>{item.answer}</p>
            </div>
          ))}

          <button
            type="button"
            style={styles.closeFullBtn}
            onClick={() => setIsHelpOpen(false)}
          >
            Cerrar
          </button>
        </div>
      </BottomSheet>

      {/* ============ MODAL 4: TÉRMINOS Y CONDICIONES ============ */}
      <BottomSheet
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        title="Términos y Condiciones"
        subtitle="Políticas de uso, privacidad y tratamiento de datos"
        size="auto"
      >
        <div style={styles.termsContainer}>
          <div style={styles.termsCard}>
            <h4 style={styles.termsHeading}>1. Uso de la plataforma</h4>
            <p style={styles.termsParagraph}>
              Aitems es una herramienta profesional destinada al relevamiento inmobiliario, generación de inventarios digitales y planos arquitectónicos interactivos.
            </p>

            <h4 style={styles.termsHeading}>2. Privacidad y Seguridad</h4>
            <p style={styles.termsParagraph}>
              Tus fotografías, audios e información cargada están protegidos con cifrado y se almacenan de manera confidencial conforme a los estándares de la industria.
            </p>

            <h4 style={styles.termsHeading}>3. Propiedad de los Contenidos</h4>
            <p style={styles.termsParagraph}>
              Los inventarios, planos y reportes generados pertenecen exclusivamente a tu inmobiliaria o usuario y son exportables en formato PDF de alta resolución.
            </p>
          </div>

          <a
            href="https://www.aitems.uy/terminos-condiciones"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.termsLinkBtn}
          >
            <span>Ver términos completos en el sitio web</span>
            <ExternalLink size={16} />
          </a>

          <button
            type="button"
            style={styles.closeFullBtn}
            onClick={() => setIsTermsOpen(false)}
          >
            Entendido
          </button>
        </div>
      </BottomSheet>

      {/* ============ MODAL 5: ELIMINAR CUENTA (APPLE REQUIREMENT) ============ */}
      <BottomSheet
        isOpen={isDeleteAccountOpen}
        onClose={() => {
          setIsDeleteAccountOpen(false);
          setDeleteConfirmationText('');
        }}
        title="¿Deseas eliminar tu cuenta?"
        subtitle="Esta acción es permanente e irreversible"
        size="auto"
      >
        <div style={styles.deleteModalContainer}>
          <div style={styles.deleteWarningBadge}>
            <AlertTriangle size={32} color="#dc2626" />
          </div>

          <p style={styles.deleteModalDesc}>
            Al confirmar la eliminación de tu cuenta, se borrarán de forma definitiva tu perfil de usuario, inventarios, planos de planta, reportes y accesos asociados, de acuerdo a las directrices de privacidad de Apple App Store.
          </p>

          <div style={styles.deleteVerifyBox}>
            <label style={styles.deleteVerifyLabel}>
              Para confirmar, escribe la palabra <strong>ELIMINAR</strong> a continuación:
            </label>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="ELIMINAR"
              style={styles.deleteVerifyInput}
            />
          </div>

          <div style={styles.formActions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => {
                setIsDeleteAccountOpen(false);
                setDeleteConfirmationText('');
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              style={{
                ...styles.deleteDangerBtn,
                opacity: deleteConfirmationText.trim().toUpperCase() === 'ELIMINAR' && !isDeletingAccount ? 1 : 0.45,
                cursor: deleteConfirmationText.trim().toUpperCase() === 'ELIMINAR' && !isDeletingAccount ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
              }}
              disabled={deleteConfirmationText.trim().toUpperCase() !== 'ELIMINAR' || isDeletingAccount}
              onClick={handleConfirmDeleteAccount}
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 size={16} color="#ffffff" className="app-spin-anim" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 size={15} color="#ffffff" strokeWidth={2.2} />
                  <span>Eliminar cuenta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 14px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  backBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    textAlign: 'center',
  },
  headerSpacer: {
    width: '40px',
  },
  content: {
    flex: 1,
    padding: '20px 18px',
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
    marginBottom: '14px',
  },
  userAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 2px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userSubtitle: {
    fontSize: '13.5px',
    color: '#64748b',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  editBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  agencyCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
    marginBottom: '26px',
  },
  agencyLogoWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  agencyLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  agencyInfo: {
    flex: 1,
    minWidth: 0,
  },
  agencyName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  agencyLocation: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 4px 0',
  },
  agencyStats: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3b82f6',
    display: 'block',
  },
  sectionHeader: {
    margin: '0 0 8px 4px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
  },
  groupedCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  groupItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  groupItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  groupItemText: {
    fontSize: '14.5px',
    fontWeight: '500',
    color: '#0f172a',
  },
  itemDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    marginLeft: '52px',
  },
  groupedCardDanger: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #fee2e2',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.03)',
    overflow: 'hidden',
  },
  groupItemDanger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  groupItemDangerText: {
    fontSize: '14.5px',
    fontWeight: '600',
    color: '#ef4444',
  },
  // Forms & Bottom Sheets
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '6px 0 12px 0',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  formInput: {
    width: '100%',
    height: '46px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    padding: '0 14px',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
  },
  formSelect: {
    width: '100%',
    height: '46px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    padding: '0 14px',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
  },
  formHelperText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  formActions: {
    width: '100%',
    display: 'flex',
    gap: '12px',
    marginTop: '14px',
    boxSizing: 'border-box',
  },
  cancelBtn: {
    flex: 1,
    height: '48px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  submitBtn: {
    flex: 1,
    height: '46px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
  },
  // Support options
  supportContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '8px 0 12px 0',
  },
  supportCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
  },
  supportIconWrapEmail: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  supportIconWrapWa: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#f0fdf4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  supportInfo: {
    flex: 1,
  },
  supportTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  supportDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  supportActionBtn: {
    padding: '8px 14px',
    borderRadius: '10px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    flexShrink: 0,
  },
  supportActionBtnWa: {
    padding: '8px 14px',
    borderRadius: '10px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    flexShrink: 0,
  },
  closeFullBtn: {
    width: '100%',
    height: '46px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
  },
  // FAQ
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '6px 0 12px 0',
  },
  faqCard: {
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
  },
  faqQuestion: {
    fontSize: '14.5px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  faqAnswer: {
    fontSize: '13.5px',
    lineHeight: '1.5',
    color: '#475569',
    margin: 0,
  },
  // Terms
  termsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '6px 0 12px 0',
  },
  termsCard: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
  },
  termsHeading: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  termsParagraph: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#475569',
    margin: '0 0 14px 0',
  },
  termsLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    color: '#2563eb',
    fontSize: '13.5px',
    fontWeight: '600',
    textDecoration: 'none',
  },
  // Delete account modal
  deleteModalContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '8px 0 12px 0',
  },
  deleteWarningBadge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  deleteModalDesc: {
    fontSize: '14px',
    lineHeight: '1.55',
    color: '#475569',
    margin: '0 0 18px 0',
    textAlign: 'center',
  },
  deleteVerifyBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
    marginBottom: '14px',
    textAlign: 'left',
  },
  deleteVerifyLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#334155',
    marginBottom: '8px',
  },
  deleteVerifyInput: {
    width: '100%',
    height: '44px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    padding: '0 12px',
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '1px',
    color: '#dc2626',
    boxSizing: 'border-box',
    outline: 'none',
  },
  deleteDangerBtn: {
    flex: 1,
    height: '48px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
};
