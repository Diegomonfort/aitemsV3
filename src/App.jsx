import React, { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { 
  Home, 
  Building2, 
  Plus, 
  Menu, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  Mic, 
  Camera, 
  Layers, 
  ArrowRight, 
  X, 
  Sparkles, 
  StopCircle, 
  Radio, 
  Check, 
  Building,
  Upload,
  Ruler,
  Trash2,
  Search,
  Minus,
  Pencil,
  ArrowUpDown,
  Share2,
  FileText,
  CheckCircle2,
  ArrowLeft,
  PenTool,
  Crown,
  Briefcase,
  Images,
  LogOut,
  BedDouble,
  Bath,
  UtensilsCrossed,
  Sofa,
  Sun,
  Car,
  DoorClosed,
  ExternalLink,
  CheckSquare,
  ArrowRightLeft,
  ArrowUp,
  Loader2,
  Users,
  MoreVertical
} from 'lucide-react';
import logo from './assets/logo-color.png';
import placeholderVertical from './assets/placeholderVertical.webp';
import placeholderHorizontal from './assets/placeholderHorizontal.webp';
import MobileFloorPlanEditor from './components/MobileFloorPlanEditor';
import ExportPdfModal from './components/ExportPdfModal';
import PDFViewer from './components/PDFViewer';
import OwnerDashboard from './components/OwnerDashboard';
import SharePropertyModal from './components/SharePropertyModal';
import CreatePropertyModal from './components/CreatePropertyModal';
import EditPropertyModal from './components/EditPropertyModal';
import LoginScreen from './components/auth/LoginScreen';
import VerifyEmailScreen from './components/auth/VerifyEmailScreen';
import CreateInmobiliariaScreen from './components/auth/CreateInmobiliariaScreen';
import { useAuth } from './context/AuthContext';
import { propertyService } from './services/propertyService';
import { agencyService } from './services/agencyService';
import { voiceService } from './services/voiceService';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { photoUploadService } from './services/photoUploadService';
import { filterAndPreparePhotos, formatFileSize } from './utils/imageOptimizer';
import PhotoUploadProgress from './components/PhotoUploadProgress';
import BottomSheet from './components/BottomSheet';
import { api } from './services/api';
import { photoService } from './services/photoService';
import { isNativePlatform, takeMultiplePhotos, pickFromGallery } from './utils/nativeCamera';
import CameraCapture from './components/CameraCapture';
import { useToast } from './context/ToastContext';

const getPropertyInventory = (prop) => {
  if (!prop) return {};
  if (prop.inventory !== undefined && prop.inventory !== null) return prop.inventory;
  const inv = {};
  const rooms = (prop && prop.rooms) || [];
  rooms.forEach((room) => {
    inv[room] = [];
  });
  return inv;
};

// Asigna un icono representativo y dinámico según el tipo y nombre del ambiente
const getAmbientIcon = (roomName = '') => {
  const n = (roomName || '').toLowerCase();
  if (n.includes('dorm') || n.includes('hab') || n.includes('suite') || n.includes('cuarto') || n.includes('cama')) {
    return <BedDouble size={18} color="#4f46e5" strokeWidth={2} />;
  }
  if (n.includes('bañ') || n.includes('toilet') || n.includes('lavab') || n.includes('duch')) {
    return <Bath size={18} color="#0284c7" strokeWidth={2} />;
  }
  if (n.includes('cocin') || n.includes('kitchen') || n.includes('anafe')) {
    return <UtensilsCrossed size={18} color="#ea580c" strokeWidth={2} />;
  }
  if (n.includes('living') || n.includes('estar') || n.includes('sala')) {
    return <Sofa size={18} color="#7c3aed" strokeWidth={2} />;
  }
  if (n.includes('comedor')) {
    return <UtensilsCrossed size={18} color="#d97706" strokeWidth={2} />;
  }
  if (n.includes('balc') || n.includes('terra') || n.includes('patio') || n.includes('jard') || n.includes('aire')) {
    return <Sun size={18} color="#eab308" strokeWidth={2} />;
  }
  if (n.includes('coch') || n.includes('gara') || n.includes('auto')) {
    return <Car size={18} color="#64748b" strokeWidth={2} />;
  }
  return <DoorClosed size={18} color="#4f46e5" strokeWidth={2} />;
};

const getRoomContextItems = (roomName) => {
  const r = (roomName || '').toLowerCase();
  if (r.includes('cocina')) {
    return [
      { id: 1, name: 'Mesada de granito con zócalo', quantity: 1, description: 'Superficie de granito pulido en buen estado, sellado perimetral intacto', checked: true },
      { id: 2, name: 'Bajo mesada y alacena en melamina', quantity: 1, description: 'Mueble con puertas y cajoneras funcionales, perfilería de aluminio', checked: true },
      { id: 3, name: 'Grifería monocomando cromada', quantity: 1, description: 'Monocomando pico alto sin fugas ni sarro, cierre cerámico suave', checked: true },
      { id: 4, name: 'Bacha doble de acero inoxidable', quantity: 1, description: 'Bacha Johnson Acero limpia, con tapón hermético y canasto', checked: true },
      { id: 5, name: 'Anafe a gas 4 hornallas', quantity: 1, description: 'Hornallas con encendido electrónico y rejillas de fundición operativas', checked: true },
    ];
  } else if (r.includes('dormitorio') || r.includes('suite') || r.includes('habitación')) {
    return [
      { id: 1, name: 'Placard empotrado de piso a techo', quantity: 1, description: 'Frente corredizo con espejo, interiores con estantes y barrales sanos', checked: true },
      { id: 2, name: 'Pisos vinílicos flotantes símil madera', quantity: 1, description: 'Listones nivelados sin marcas de humedad, zócalos perimetrales al tono', checked: true },
      { id: 3, name: 'Ventana corrediza con persiana y DVH', quantity: 1, description: 'Carpintería de aluminio línea Módena con traba y persiana operativa', checked: true },
      { id: 4, name: 'Equipo de aire acondicionado split', quantity: 1, description: 'Split frío/calor 3000 frigorías con control remoto y soporte', checked: true },
    ];
  } else if (r.includes('baño') || r.includes('toilette')) {
    return [
      { id: 1, name: 'Vanitory con bacha de apoyo y espejo', quantity: 1, description: 'Mueble colgante laqueado con espejo iluminado, grifería monocomando', checked: true },
      { id: 2, name: 'Inodoro y bidet Ferrum con tapa amortiguada', quantity: 1, description: 'Artefactos sanitarios blancos en excelente estado de fijación', checked: true },
      { id: 3, name: 'Receptáculo y mampara de ducha templada', quantity: 1, description: 'Vidrio templado 8mm con perfiles de acero inoxidable limpios', checked: true },
    ];
  } else if (r.includes('balcón') || r.includes('terraza') || r.includes('quincho')) {
    return [
      { id: 1, name: 'Piso cerámico antideslizante para exterior', quantity: 1, description: 'Baldosas atérmicas en desnivel correcto hacia rejilla de desagüe pluvial', checked: true },
      { id: 2, name: 'Baranda perimetral de seguridad en aluminio', quantity: 1, description: 'Estructura rígida con paños de vidrio laminado de seguridad', checked: true },
      { id: 3, name: 'Parrilla con herrajes enlozados y leñero', quantity: 1, description: 'Emparrillado con manivela de elevación y campana de tiraje limpia', checked: true },
    ];
  }
  return [
    { id: 1, name: 'Pisos de porcelanato pulido', quantity: 1, description: 'Placas 60x60 en excelente estado, sin piezas flojas ni rajaduras', checked: true },
    { id: 2, name: 'Paredes y pintura al látex', quantity: 4, description: 'Paredes en látex mate blanco lavable, sin marcas ni orificios', checked: true },
    { id: 3, name: 'Ventanal corredizo con cortinas', quantity: 1, description: 'Abertura de aluminio con doble vidrio y trabas operativas', checked: true },
    { id: 4, name: 'Luminarias LED de techo', quantity: 4, description: 'Plafones circulares embutidos con lámparas cálidas al 100%', checked: true },
  ];
};

const capitalizeFirst = (text) => {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const getPropertyPhotos = (prop) => {
  if (!prop) return [];
  if (prop.photos !== undefined && Array.isArray(prop.photos)) return prop.photos;
  return [];
};

// Componente de tarjeta de propiedad altamente optimizado con React.memo
// Evita re-renderizados innecesarios cuando se cargan más propiedades al scroll
const PropertyCardItem = React.memo(({ item, onOpen, placeholder, styles }) => {
  const hasPhoto = Boolean(item.image || item.image_url);
  const photoSrc = hasPhoto ? (item.image || item.image_url) : placeholder;
  const roomCount = item.rooms?.length || item.ambientes || 0;
  const title = item.name || item.title || 'Propiedad';
  const address = item.address || item.location || '';
  const isShared = Boolean(item.isShared || item.is_shared);
  const sharedCount = item.sharedCount || item.sharedUsers?.length || item.shared_users?.length || 0;
  const isSharedByMe = Boolean(!isShared && sharedCount > 0);

  return (
    <div 
      className="app-property-list-item"
      style={{ 
        ...styles.propertyListItem, 
        cursor: 'pointer',
      }}
      onClick={() => onOpen(item)}
    >
      <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
        <img 
          src={photoSrc} 
          alt={title} 
          loading="lazy"
          decoding="async"
          width="64"
          height="64"
          style={{
            ...styles.propertyThumb,
            objectPosition: hasPhoto ? 'center' : 'right',
          }} 
          onError={(e) => {
            if (e.target.src !== placeholder) {
              e.target.src = placeholder;
              e.target.style.objectPosition = 'right';
            }
          }}
        />
      </div>

      <div style={styles.propertyListInfo}>
        <h4 style={styles.propertyListTitle}>{title}</h4>
        <p style={{
          ...styles.propertyListAddress,
          color: address ? '#64748b' : '#94a3b8',
        }}>
          {address || 'Sin dirección asignada'}
        </p>
        <div style={styles.propertyListMetaRow}>
          <span style={{
            ...styles.propRoomsTag,
            ...(roomCount === 0 ? { color: '#94a3b8' } : {})
          }}>
            {roomCount > 0 ? `${roomCount} amb.` : '0 amb.'}
          </span>
          {isShared && (
            <span style={styles.propSharedBadge} title="Propiedad compartida contigo">
              <Users size={11} color="#4338ca" strokeWidth={2.4} />
            </span>
          )}
          {isSharedByMe && (
            <span style={styles.propSharedByMeBadge} title={`Compartida con ${sharedCount} ${sharedCount === 1 ? 'colega' : 'colegas'}`}>
              <Users size={11} color="#15803d" strokeWidth={2.4} />
              <span>({sharedCount})</span>
            </span>
          )}
        </div>
      </div>
      <button 
        style={styles.adminMiniBtn}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(item);
        }}
      >
        <span>Abrir</span>
        <ChevronRight size={14} color="#4f46e5" />
      </button>
    </div>
  );
});

// Componente aislado para el botón flotante "Volver arriba"
// Al aislar el estado del scroll, evita re-renderizar todo App.jsx durante el movimiento del usuario
const FloatingBackToTop = React.memo(({ styles }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setVisible(window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      style={styles.backToTopFab}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Volver arriba"
      aria-label="Volver arriba"
    >
      <ArrowUp size={16} color="#ffffff" strokeWidth={2.5} />
      <span style={styles.backToTopFabText}>Arriba</span>
    </button>
  );
});

// Helper para recuperar el estado de navegación (pestaña, propiedad, ambiente, etc.) tras F5 o recarga
const getInitialNavState = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlPropertyId = params.get('propertyId') || params.get('propId');
    const urlTab = params.get('tab');
    const urlSubTab = params.get('subTab');
    const urlRoom = params.get('room');

    let storedNav = null;
    try {
      const raw = sessionStorage.getItem('aitems_nav_state') || localStorage.getItem('aitems_nav_state');
      if (raw) storedNav = JSON.parse(raw);
    } catch (e) {}

    let cachedProp = null;
    try {
      const rawProp = sessionStorage.getItem('aitems_cached_property_detail') || localStorage.getItem('aitems_cached_property_detail');
      if (rawProp) cachedProp = JSON.parse(rawProp);
    } catch (e) {}

    const targetPropId = urlPropertyId || (storedNav?.activeTab === 'property-detail' ? storedNav?.propertyId : null);
    const targetRoom = urlRoom ? decodeURIComponent(urlRoom) : (targetPropId ? storedNav?.selectedRoomDetail : null);
    const targetSubTab = urlSubTab || storedNav?.detailSubTab || 'ambientes';

    let initialTab = 'home';
    let initialProp = null;

    if (targetPropId) {
      initialTab = 'property-detail';
      if (cachedProp && (cachedProp.id === targetPropId || String(cachedProp.id) === String(targetPropId))) {
        initialProp = cachedProp;
      } else {
        initialProp = { id: targetPropId, name: 'Cargando propiedad...' };
      }
    } else if (urlTab && ['home', 'propiedades', 'dashboard'].includes(urlTab)) {
      initialTab = urlTab;
    } else if (storedNav?.activeTab && ['home', 'propiedades', 'dashboard'].includes(storedNav.activeTab)) {
      initialTab = storedNav.activeTab;
    }

    return {
      activeTab: initialTab,
      propertyId: targetPropId,
      selectedPropertyDetail: initialProp,
      detailSubTab: targetSubTab,
      selectedRoomDetail: targetRoom,
      previousTab: storedNav?.previousTab || 'home'
    };
  } catch (err) {
    return {
      activeTab: 'home',
      propertyId: null,
      selectedPropertyDetail: null,
      detailSubTab: 'ambientes',
      selectedRoomDetail: null,
      previousTab: 'home'
    };
  }
};

export default function App() {
  const toast = useToast();
  const initialNav = useMemo(() => getInitialNavState(), []);
  const [activeTab, setActiveTab] = useState(initialNav.activeTab); // 'home' | 'propiedades' | 'dashboard' | 'property-detail'
  const [previousTab, setPreviousTab] = useState(initialNav.previousTab);
  const [detailSubTab, setDetailSubTab] = useState(initialNav.detailSubTab); // 'ambientes' | 'plano' | 'fotos'
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(initialNav.selectedRoomDetail); // ambiente seleccionado para ver sus ítems
  const [selectedPropertyDetail, setSelectedPropertyDetail] = useState(initialNav.selectedPropertyDetail);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [previewFloorId, setPreviewFloorId] = useState(null);

  // Hook central de Autenticación y Sesión
  const { 
    user: authUser, 
    agency: authAgency, 
    isAuthenticated, 
    isLoading: authLoading, 
    signOut,
    refreshProfile 
  } = useAuth();

  // Estado de vista de inicio / autenticación
  const [authView, setAuthView] = useState('app'); // 'app' | 'login' | 'verify-email' | 'create-inmobiliaria'
  const [currentUser, setCurrentUser] = useState({
    name: 'Usuario',
    email: '',
    role: 'owner',
  });
  const [pendingRegisterEmail, setPendingRegisterEmail] = useState('');
  const [pendingRegisterData, setPendingRegisterData] = useState(null);

  // Rol de usuario ('owner' | 'agent')
  const [userRole, setUserRole] = useState('owner');

  // Datos de la Inmobiliaria (Owner)
  const [agency, setAgency] = useState({
    name: 'Horizonte Propiedades',
    location: 'Montevideo, Uruguay',
    website: '',
    logo: null,
  });

  // Datos del Plan (Owner)
  const [plan, setPlan] = useState({
    name: 'Plan Pro Inmobiliaria',
    status: 'active',
    renewalDate: '15 de Octubre, 2026',
    propertiesUsed: 0,
    propertiesLimit: 50,
    agentsLimit: 10,
  });

  // Lista de Agentes del equipo (Owner)
  const [agents, setAgents] = useState([]);

  // Lista de propiedades (completas y 3 recientes)
  const [properties, setProperties] = useState([]);
  const [recentProperties, setRecentProperties] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [hasInitialPropertiesLoaded, setHasInitialPropertiesLoaded] = useState(false);
  const [isLoadingPropertyDetail, setIsLoadingPropertyDetail] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleUpdateAgency = async (updatedAgency) => {
    setAgency(prev => ({ ...prev, ...updatedAgency }));
    if (updatedAgency?.id) {
      try {
        const payload = {
          name: updatedAgency.name,
          country: updatedAgency.country,
          state: updatedAgency.state,
          city: updatedAgency.city,
          website_url: updatedAgency.website || updatedAgency.website_url || '',
        };
        if (updatedAgency.logo !== undefined) {
          payload.logo = updatedAgency.logo;
        }
        const res = await agencyService.updateAgency(updatedAgency.id, payload);
        if (res?.inmobiliaria) {
          const inmo = res.inmobiliaria;
          setAgency(prev => ({
            ...prev,
            ...inmo,
            location: [inmo.city, inmo.country].filter(Boolean).join(', '),
            website: inmo.website_url || '',
          }));
        }
        refreshProfile?.();
      } catch (err) {
        console.warn('Error guardando cambios de inmobiliaria en backend:', err);
      }
    }
  };

  const handleUpdatePlan = (updatedPlan) => {
    setPlan(updatedPlan);
  };

  const handleAddAgent = (newAgent) => {
    setAgents(prev => [newAgent, ...prev]);
  };

  const handleRemoveAgent = (agentId) => {
    setAgents(prev => prev.filter(a => a.id !== agentId));
  };

  const handleResendInvite = (agentId) => {
    // Confirmación visual
  };

  // Sincronizar estado reactivo con AuthContext
  useEffect(() => {
    if (!authLoading) {
      if (authUser) {
        setCurrentUser(authUser);
        setUserRole(authUser.role || 'owner');
        if (authView === 'login') {
          setAuthView('app');
        }
      } else {
        if (authView === 'app') {
          setAuthView('login');
        }
      }
    }
  }, [authUser, authLoading]);

  // Sincronizar datos de la inmobiliaria
  useEffect(() => {
    if (authAgency) {
      setAgency(prev => ({
        ...prev,
        id: authAgency.id,
        name: authAgency.name || prev.name,
        location: authAgency.location || prev.location,
        website: authAgency.website || prev.website,
        logo: authAgency.logo || prev.logo,
        country: authAgency.country || prev.country || 'Uruguay',
        state: authAgency.state || prev.state || '',
        city: authAgency.city || prev.city || '',
      }));
    }
  }, [authAgency]);

  // Cargar propiedades reales del backend (todas y las 3 más recientes)
  const loadProperties = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingProperties(true);
    try {
      // 1. Cargar todas las propiedades para la pestaña "Propiedades"
      const res = await propertyService.getProperties();
      const allProps = res?.properties || res?.data?.properties || [];
      if (Array.isArray(allProps)) {
        setProperties(allProps);
      }

      // 2. Cargar las 3 recientes para la sección "Propiedades recientes" del Home
      const recentRes = await propertyService.getRecentProperties();
      const recentProps = recentRes?.recentProperties || recentRes?.data?.recentProperties || [];
      if (Array.isArray(recentProps) && recentProps.length > 0) {
        setRecentProperties(recentProps);
      } else if (Array.isArray(allProps) && allProps.length > 0) {
        setRecentProperties(allProps.slice(0, 3));
      }
    } catch (err) {
      console.warn('Error cargando propiedades desde backend:', err);
    } finally {
      setIsLoadingProperties(false);
      setHasInitialPropertiesLoaded(true);
    }
  }, [isAuthenticated]);

  // Cargar colegas del equipo / inmobiliaria para compartir
  const loadColleagues = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await propertyService.getColleagues();
      const colls = res?.colleagues || res?.data?.colleagues || [];
      if (Array.isArray(colls)) {
        setAgents(colls);
      }
    } catch (err) {
      console.warn('Error cargando colegas desde backend:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProperties();
    loadColleagues();
  }, [loadProperties, loadColleagues]);

  // Registrar handler para pull-to-refresh nativo de iOS
  useEffect(() => {
    window.onNativePullToRefresh = () => {
      loadProperties();
      loadColleagues();
    };
    return () => {
      delete window.onNativePullToRefresh;
    };
  }, [loadProperties, loadColleagues]);


  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setUserRole(userData.role || 'owner');
    setAuthView('app');
    setActiveTab('home');
    setHasInitialPropertiesLoaded(false);
    refreshProfile?.();
    loadProperties();
    loadColleagues();
  };

  const handleRegisterSuccess = (userData) => {
    setCurrentUser(userData);
    setPendingRegisterEmail(userData.email);
    setPendingRegisterData({
      agencyName: `${userData.name} Propiedades`,
      country: userData.country,
      state: userData.state,
      city: userData.city,
    });
    setAuthView('verify-email');
  };

  const handleCompleteInmobiliaria = (agencyData) => {
    setAgency(prev => ({
      ...prev,
      name: agencyData.name,
      location: agencyData.location,
      website: agencyData.website,
      logo: agencyData.logo || prev.logo,
    }));
    refreshProfile?.();
    loadProperties();
    setAuthView('app');
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    setProperties([]);
    setRecentProperties([]);
    setHasInitialPropertiesLoaded(false);
    setSelectedPropertyDetail(null);
    setSelectedRoomDetail(null);
    setActiveTab('home');
    try {
      sessionStorage.removeItem('aitems_nav_state');
      sessionStorage.removeItem('aitems_cached_property_detail');
      localStorage.removeItem('aitems_nav_state');
      localStorage.removeItem('aitems_cached_property_detail');
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) {}
    await signOut();
    setAuthView('login');
  };

  // Formulario nueva propiedad
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formImage, setFormImage] = useState(null);
  const fileInputRef = useRef(null);

  // Estado del flujo de Acciones Rápidas (Dictado, Fotos, Planos)
  const [quickActionType, setQuickActionType] = useState(null); // 'voice' | 'photos' | 'plans' | null
  const [actionStep, setActionStep] = useState(1); // 1: Elegir propiedad, 2: Elegir ambiente, 3: Acción
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [isAddingCustomRoom, setIsAddingCustomRoom] = useState(false);
  const [isDirectRoomAction, setIsDirectRoomAction] = useState(false);

  // Estado de fotos por ambiente
  const [roomPhotos, setRoomPhotos] = useState([]);
  const roomPhotoInputRef = useRef(null);

  // Estado de planos y croquis
  const [roomLength, setRoomLength] = useState('4.20');
  const [roomWidth, setRoomWidth] = useState('3.50');
  const [generatedPlan, setGeneratedPlan] = useState(false);
  const [uploadedPlanFile, setUploadedPlanFile] = useState(null);
  const planFileInputRef = useRef(null);

  // Búsqueda y paginación para el selector de propiedades en modal
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertyPage, setPropertyPage] = useState(1);
  const PROPERTIES_PER_PAGE = 5;

  const filteredProperties = properties.filter((prop) => {
    const q = propertySearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      prop.name.toLowerCase().includes(q) ||
      (prop.address && prop.address.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE) || 1;
  const safePage = Math.min(propertyPage, totalPages);
  const paginatedProperties = filteredProperties.slice(
    (safePage - 1) * PROPERTIES_PER_PAGE,
    safePage * PROPERTIES_PER_PAGE
  );

  // Estado para la pestaña "Todas las propiedades" (Filtro, Orden y Carga Progresiva / Infinite Scroll)
  const [tabSearchQuery, setTabSearchQuery] = useState('');
  const deferredTabSearchQuery = useDeferredValue(tabSearchQuery);
  const [tabSortBy, setTabSortBy] = useState('recientes'); // 'recientes' | 'nombre-asc' | 'nombre-desc'
  const [propertyFilterScope, setPropertyFilterScope] = useState('propias'); // 'propias' | 'compartidas'
  const TAB_INITIAL_VISIBLE = 15;
  const TAB_BATCH_SIZE = 15;
  const [tabVisibleCount, setTabVisibleCount] = useState(TAB_INITIAL_VISIBLE);
  const tabSentinelRef = useRef(null);

  const currentUserId = authUser?.id || currentUser?.id;

  // Conteo de propiedades para las pestañas de alcance (Mis propiedades / Compartidas)
  const { propertiesCountMine, propertiesCountShared } = useMemo(() => {
    let mine = 0, shared = 0;
    properties.forEach((p) => {
      if (p.access === false) return;
      const isSharedProp = Boolean(p.isShared || p.is_shared || (currentUserId && p.userId && p.userId !== currentUserId));
      if (isSharedProp) {
        shared++;
      } else {
        mine++;
      }
    });
    return { propertiesCountMine: mine, propertiesCountShared: shared };
  }, [properties, currentUserId]);

  // Filtrado y ordenamiento altamente optimizado con useMemo
  const tabSortedProperties = useMemo(() => {
    const q = deferredTabSearchQuery.trim().toLowerCase();
    let list = properties;

    // 1. Filtrar por ámbito (Mis propiedades / Compartidas)
    if (propertyFilterScope === 'compartidas') {
      list = list.filter((p) => {
        const isSharedProp = Boolean(p.isShared || p.is_shared || (currentUserId && p.userId && p.userId !== currentUserId));
        return isSharedProp;
      });
    } else {
      // 'propias' por defecto
      list = list.filter((p) => {
        const isSharedProp = Boolean(p.isShared || p.is_shared || (currentUserId && p.userId && p.userId !== currentUserId));
        return !isSharedProp;
      });
    }

    // 2. Filtrar por texto de búsqueda
    if (q) {
      list = list.filter((prop) => {
        const name = prop.name || prop.title || '';
        const addr = prop.address || prop.location || '';
        return name.toLowerCase().includes(q) || addr.toLowerCase().includes(q);
      });
    }

    // 3. Ordenamiento
    return [...list].sort((a, b) => {
      if (tabSortBy === 'nombre-asc') {
        return (a.name || a.title || '').localeCompare(b.name || b.title || '');
      }
      if (tabSortBy === 'nombre-desc') {
        return (b.name || b.title || '').localeCompare(a.name || a.title || '');
      }
      return (b.id || 0) - (a.id || 0);
    });
  }, [properties, deferredTabSearchQuery, tabSortBy, propertyFilterScope, currentUserId]);

  // Lista de propiedades visibles progresivamente (Lotes rápidos y fluidos en memoria)
  const tabPaginatedProperties = useMemo(() => {
    return tabSortedProperties.slice(0, tabVisibleCount);
  }, [tabSortedProperties, tabVisibleCount]);

  const hasMoreTabProperties = tabVisibleCount < tabSortedProperties.length;

  const handleLoadMoreTabProperties = useCallback(() => {
    setTabVisibleCount((prev) => prev + TAB_BATCH_SIZE);
  }, []);

  // Observer para carga infinita automática al acercarse al final del scroll
  useEffect(() => {
    const sentinel = tabSentinelRef.current;
    if (!sentinel || !hasMoreTabProperties) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMoreTabProperties();
        }
      },
      {
        root: null,
        rootMargin: '300px',
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMoreTabProperties, hasMoreTabProperties]);

  // Estado de grabación en vivo simulada y fases de dictado ('idle' | 'recording' | 'processing' | 'review')
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voicePhase, setVoicePhase] = useState('idle');
  const [transcribedText, setTranscribedText] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemForm, setEditItemForm] = useState({ name: '', quantity: 1, description: '' });

  // Estado para la vista de detalle de propiedad
  const [isPropertyOptionsMenuOpen, setIsPropertyOptionsMenuOpen] = useState(false);
  const [isDeletePropertyModalOpen, setIsDeletePropertyModalOpen] = useState(false);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [isDeletingProperty, setIsDeletingProperty] = useState(false);
  const showToast = (msg, type = 'success') => {
    if (type === 'error') toast.error(msg);
    else if (type === 'warning') toast.warning(msg);
    else if (type === 'info') toast.info(msg);
    else toast.success(msg);
  };




  // Restaurar detalle fresco de la propiedad al recargar con F5
  useEffect(() => {
    const targetId = initialNav.propertyId;
    if (!targetId || !isAuthenticated) return;

    let isMounted = true;
    (async () => {
      try {
        setIsLoadingPropertyDetail(true);
        const res = await propertyService.getPropertyById(targetId);
        const freshProp = res?.property || res?.data?.property;
        if (freshProp && isMounted) {
          const propWithInv = {
            ...freshProp,
            inventory: freshProp.inventory || getPropertyInventory(freshProp),
            photos: freshProp.photos || getPropertyPhotos(freshProp),
            ambientes: freshProp.ambientes || [],
            rooms: freshProp.rooms || [],
            floorPlan: freshProp.floorPlan !== undefined ? freshProp.floorPlan : null,
          };
          setSelectedPropertyDetail(propWithInv);
          try {
            sessionStorage.setItem('aitems_cached_property_detail', JSON.stringify(propWithInv));
            localStorage.setItem('aitems_cached_property_detail', JSON.stringify(propWithInv));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('No se pudo restaurar la propiedad desde el backend:', err);
        if (isMounted) {
          setSelectedPropertyDetail(null);
          setSelectedRoomDetail(null);
          setActiveTab('home');
        }
      } finally {
        if (isMounted) setIsLoadingPropertyDetail(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialNav.propertyId, isAuthenticated]);

  // Sincronizar URL y almacenamiento para persistir navegación ante recargas (F5)
  useEffect(() => {
    if (!isAuthenticated || authView !== 'app') return;

    const params = new URLSearchParams();

    if (activeTab === 'property-detail' && selectedPropertyDetail?.id) {
      params.set('propertyId', selectedPropertyDetail.id);
      if (detailSubTab && detailSubTab !== 'ambientes') {
        params.set('subTab', detailSubTab);
      }
      if (selectedRoomDetail) {
        params.set('room', selectedRoomDetail);
      }
    } else if (activeTab && activeTab !== 'home') {
      params.set('tab', activeTab);
    }

    const searchStr = params.toString();
    const newRelativePathQuery = searchStr 
      ? `${window.location.pathname}?${searchStr}` 
      : window.location.pathname;

    const currentSearch = window.location.search.replace(/^\?/, '');
    if (currentSearch !== searchStr) {
      window.history.replaceState(null, '', newRelativePathQuery);
    }

    try {
      const navStateToStore = {
        activeTab,
        propertyId: (activeTab === 'property-detail' && selectedPropertyDetail?.id) ? selectedPropertyDetail.id : null,
        detailSubTab,
        selectedRoomDetail,
        previousTab
      };
      sessionStorage.setItem('aitems_nav_state', JSON.stringify(navStateToStore));
      localStorage.setItem('aitems_nav_state', JSON.stringify(navStateToStore));

      if (activeTab === 'property-detail' && selectedPropertyDetail && selectedPropertyDetail.id) {
        sessionStorage.setItem('aitems_cached_property_detail', JSON.stringify(selectedPropertyDetail));
        localStorage.setItem('aitems_cached_property_detail', JSON.stringify(selectedPropertyDetail));
      } else if (activeTab !== 'property-detail') {
        sessionStorage.removeItem('aitems_cached_property_detail');
        localStorage.removeItem('aitems_cached_property_detail');
      }
    } catch (e) {}
  }, [activeTab, selectedPropertyDetail?.id, detailSubTab, selectedRoomDetail, previousTab, isAuthenticated, authView]);

  // Soporte para botones Atrás/Adelante del navegador
  useEffect(() => {
    const handlePopState = () => {
      const state = getInitialNavState();
      setActiveTab(state.activeTab);
      if (state.selectedPropertyDetail) {
        setSelectedPropertyDetail(state.selectedPropertyDetail);
      } else if (state.activeTab !== 'property-detail') {
        setSelectedPropertyDetail(null);
      }
      setDetailSubTab(state.detailSubTab);
      setSelectedRoomDetail(state.selectedRoomDetail);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [isExportPdfModalOpen, setIsExportPdfModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeRoomFilter, setActiveRoomFilter] = useState('Todos');
  const [roomItemSearchQuery, setRoomItemSearchQuery] = useState('');

  // Estado para crear un nuevo ítem manual dentro de un ambiente
  const [isAddingItemRoom, setIsAddingItemRoom] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemStatus, setNewItemStatus] = useState('');

  // Estado para el modal unificado de Nuevo Ítem (Selector: Voz, Fotos IA, Manual)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemAddMethod, setItemAddMethod] = useState('select'); // 'select' | 'voice' | 'photo' | 'manual'

  // Estados para Dictado por Voz de ítems en ambiente
  const [voiceItemPhase, setVoiceItemPhase] = useState('idle'); // 'idle' | 'recording' | 'processing' | 'review'
  const [voiceItemTime, setVoiceItemTime] = useState(0);
  const [voiceItemDuration, setVoiceItemDuration] = useState(0);
  const [voiceItemTranscript, setVoiceItemTranscript] = useState('');
  const [voiceDetectedItems, setVoiceDetectedItems] = useState([]);
  const [editingVoiceItemId, setEditingVoiceItemId] = useState(null);
  const [editingVoiceItemName, setEditingVoiceItemName] = useState('');

  // Estados para Detección de Ítems por Fotos con IA en ambiente
  const [photoItemPhase, setPhotoItemPhase] = useState('upload'); // 'upload' | 'analyzing' | 'review'
  const [photoItemFiles, setPhotoItemFiles] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraContext, setCameraContext] = useState('items'); // 'items' | 'property' | 'room'
  const [photoDetectedItems, setPhotoDetectedItems] = useState([]);
  const [selectedPhotoReviewId, setSelectedPhotoReviewId] = useState('all');
  const [photoSourceFilter, setPhotoSourceFilter] = useState('all'); // 'all' | 'room' | 'unassigned' | 'other'
  const [isPhotoTypeSelectorOpen, setIsPhotoTypeSelectorOpen] = useState(false);
  const [photoAnalyzeType, setPhotoAnalyzeType] = useState('item'); // 'item' | 'structure'

  // Modal para editar ítem detectado (Voz o Foto) por encima del modal actual
  const [reviewEditModal, setReviewEditModal] = useState(null); // { item, source: 'voice' | 'photo' }
  const [reviewEditForm, setReviewEditForm] = useState({ name: '', quantity: 1, description: '', status: '' });

  // Estado para editar ítem en la vista de detalle
  const [detailEditingItemId, setDetailEditingItemId] = useState(null);
  const [detailEditForm, setDetailEditForm] = useState({ name: '', quantity: 1, description: '', status: '' });

  // Estado para agregar un nuevo ambiente dentro de la propiedad
  // Estado para agregar un nuevo ambiente dentro de la propiedad (Selector: Voz o Manual)
  const [isAddingRoomToDetail, setIsAddingRoomToDetail] = useState(false);
  const [newDetailRoomName, setNewDetailRoomName] = useState('');
  const [addRoomMethod, setAddRoomMethod] = useState('select'); // 'select' | 'voice' | 'manual'
  const [voiceRoomPhase, setVoiceRoomPhase] = useState('idle'); // 'idle' | 'recording' | 'processing' | 'review'
  const [voiceRoomTime, setVoiceRoomTime] = useState(0);
  const [voiceRoomDuration, setVoiceRoomDuration] = useState(0);
  const [voiceRoomTranscript, setVoiceRoomTranscript] = useState('');
  const [detectedVoiceRooms, setDetectedVoiceRooms] = useState([]);
  const [editingDetectedRoomId, setEditingDetectedRoomId] = useState(null);
  const [editingDetectedRoomName, setEditingDetectedRoomName] = useState('');
  const [isConfirmingVoiceRooms, setIsConfirmingVoiceRooms] = useState(false);
  const [isConfirmingRoomVoiceItems, setIsConfirmingRoomVoiceItems] = useState(false);
  const [isConfirmingVoiceItems, setIsConfirmingVoiceItems] = useState(false);
  const [isConfirmingPhotoItems, setIsConfirmingPhotoItems] = useState(false);

  // Grabadores de audio reales (MediaRecorder)
  const roomAudioRecorder = useAudioRecorder();
  const itemAudioRecorder = useAudioRecorder();



  // Galería de fotos lightbox / medidas de plano en detalle
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const [detailPlanLength, setDetailPlanLength] = useState('8.50');
  const [detailPlanWidth, setDetailPlanWidth] = useState('6.20');
  const [isFloorPlanEditorOpen, setIsFloorPlanEditorOpen] = useState(false);

  // Estado de fotos y filtros en detalle
  const [photoFilterRoom, setPhotoFilterRoom] = useState('Todos');
  const [isAddingPhotosModal, setIsAddingPhotosModal] = useState(false);
  const [newPhotoRoom, setNewPhotoRoom] = useState('');
  const [selectedNewPhotos, setSelectedNewPhotos] = useState([]);
  const [isOptimizingPhotos, setIsOptimizingPhotos] = useState(false);
  const [selectedPhotoRoomDetail, setSelectedPhotoRoomDetail] = useState(null);
  const [isManagingPhotos, setIsManagingPhotos] = useState(false);
  const [selectedBulkPhotoIds, setSelectedBulkPhotoIds] = useState([]);
  const [isMovingPhotosModal, setIsMovingPhotosModal] = useState(false);
  const [targetMoveRoom, setTargetMoveRoom] = useState('');
  const [newCustomMoveRoom, setNewCustomMoveRoom] = useState('');
  const [isDeletingPhotosModal, setIsDeletingPhotosModal] = useState(false);

  // Deshabilitar pull-to-refresh nativo cuando hay un overlay abierto
  useEffect(() => {
    const anyOverlayOpen = isMenuOpen || isCameraOpen || isModalOpen || isEditPropertyModalOpen 
      || isDeletePropertyModalOpen || isExportPdfModalOpen || isShareModalOpen 
      || selectedPhotoModal || isAddingPhotosModal || isFloorPlanEditorOpen;
    // Comunicar directamente al nativo de iOS
    try {
      window.webkit?.messageHandlers?.pullToRefresh?.postMessage({ enabled: !anyOverlayOpen });
    } catch (e) { /* no estamos en iOS */ }
  }, [isMenuOpen, isCameraOpen, isModalOpen, isEditPropertyModalOpen, 
      isDeletePropertyModalOpen, isExportPdfModalOpen, isShareModalOpen, 
      selectedPhotoModal, isAddingPhotosModal, isFloorPlanEditorOpen]);

  useEffect(() => {
    if (!selectedPhotoModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPhotoModal(null);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const allPhotos = selectedPropertyDetail?.photos || getPropertyPhotos(selectedPropertyDetail) || [];
        const activeRoom = selectedPhotoRoomDetail || selectedPhotoModal.room || '';
        const roomPhotos = allPhotos.filter(p => (p.room || '').trim().toLowerCase() === activeRoom.trim().toLowerCase());
        const list = roomPhotos.length > 0 ? roomPhotos : allPhotos;
        if (list.length <= 1) return;
        const curIdx = list.findIndex(p => p.id === selectedPhotoModal.id || (p.url && p.url === selectedPhotoModal.url));
        if (curIdx === -1) return;
        if (e.key === 'ArrowLeft') {
          const nextIdx = curIdx > 0 ? curIdx - 1 : list.length - 1;
          setSelectedPhotoModal(list[nextIdx]);
        } else {
          const nextIdx = curIdx < list.length - 1 ? curIdx + 1 : 0;
          setSelectedPhotoModal(list[nextIdx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoModal, selectedPropertyDetail, selectedPhotoRoomDetail]);

  // Límite de audio para ítems (modo rápido): 60 segundos
  useEffect(() => {
    if (!isRecording) {
      setRecordingTime(0);
      return;
    }

    if (recordingTime >= 60) {
      toast.info('Tiempo límite alcanzado (60s). Procesando ítems...');
      handleStopVoiceRecording();
      return;
    }

    const timer = setTimeout(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRecording, recordingTime]);

  // Límite de audio para ambientes: 45 segundos
  useEffect(() => {
    if (voiceRoomPhase !== 'recording') {
      if (voiceRoomPhase === 'idle') {
        setVoiceRoomTime(0);
      }
      return;
    }

    if (voiceRoomTime >= 45) {
      toast.info('Tiempo límite alcanzado (45s). Procesando ambientes...');
      handleStopVoiceRoomRecording();
      return;
    }

    const timer = setTimeout(() => {
      setVoiceRoomTime((prev) => prev + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [voiceRoomPhase, voiceRoomTime]);

  // Límite de audio para ítems (detalle de propiedad): 60 segundos
  useEffect(() => {
    if (voiceItemPhase !== 'recording') {
      if (voiceItemPhase === 'idle') {
        setVoiceItemTime(0);
      }
      return;
    }

    if (voiceItemTime >= 60) {
      toast.info('Tiempo límite alcanzado (60s). Procesando ítems...');
      handleStopItemVoiceRecording();
      return;
    }

    const timer = setTimeout(() => {
      setVoiceItemTime((prev) => prev + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [voiceItemPhase, voiceItemTime]);

  // Reset de scroll al cambiar de pantalla, ambiente, fotos o pestaña
  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    const scrollables = document.querySelectorAll('main, [style*="overflow"]');
    scrollables.forEach((el) => {
      el.scrollTop = 0;
    });

    const raf = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      const elements = document.querySelectorAll('main');
      elements.forEach((el) => {
        el.scrollTop = 0;
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [
    activeTab, 
    selectedPropertyDetail?.id, 
    selectedRoomDetail, 
    selectedPhotoRoomDetail, 
    detailSubTab
  ]);

  const handleStartRecording = async () => {
    const started = await itemAudioRecorder.startRecording();
    if (started) {
      setIsRecording(true);
      setVoicePhase('recording');
      setRecordingTime(0);
    } else {
      toast.error(itemAudioRecorder.error || 'No se pudo acceder al micrófono para dictar los ítems.');
    }
  };

  const handleStopVoiceRecording = async () => {
    setIsRecording(false);
    setVoicePhase('processing');
    try {
      console.log('🎤 [handleStopVoiceRecording] Deteniendo grabación...');
      const { audioBlob, mimeType } = await itemAudioRecorder.stopRecording();
      console.log('🎤 [handleStopVoiceRecording] Audio obtenido:', { size: audioBlob?.size, mimeType });
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No se detectó audio grabado. Probá hablar más cerca del micrófono.');
      }

      const activeProp = selectedProperty || selectedPropertyDetail;
      const propId = activeProp?.id;
      if (!propId) {
        throw new Error('No se encontró el ID de la propiedad.');
      }

      const matchedAmb = (activeProp?.ambientes || []).find(
        a => a.name?.toLowerCase().trim() === selectedRoom?.toLowerCase().trim()
      );
      const categoryId = matchedAmb?.id || selectedRoom || 'general';

      const fileExt = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `item_${Date.now()}.${fileExt}`);
      formData.append('user_id', authUser?.id || activeProp?.userId || 'anonymous');
      formData.append('property_id', propId);
      formData.append('category_id', categoryId);

      console.log('🚀 [handleStopVoiceRecording] Enviando audio a /api/voice/item/process...');
      const res = await voiceService.processVoiceItem(formData);
      console.log('📥 [handleStopVoiceRecording] Respuesta de voiceService:', res);
      if (!res.success) {
        throw new Error(res.message || res.error || 'Error al procesar los ítems por voz');
      }

      const rawItems = res.data?.items || res.items || res.data?.data?.items || [];
      const formatted = rawItems.map((item, idx) => ({
        id: Date.now() + idx,
        name: capitalizeFirst(item.name),
        quantity: item.quantity || 1,
        description: item.description || '',
        status: item.status || null,
        checked: true
      }));

      const transcriptText = res.data?.transcription || res.transcription || res.data?.data?.transcription || 'Audio procesado correctamente';
      setTranscribedText(transcriptText);
      setExtractedItems(formatted);
      setVoicePhase('review');
    } catch (err) {
      console.error('❌ Error procesando dictado por voz:', err);
      toast.error(err.message || 'Ocurrió un error al procesar el audio.');
      setVoicePhase('idle');
    }
  };

  const handleToggleExtractedItem = (id) => {
    setExtractedItems(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleStartEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemForm({
      name: item.name,
      quantity: item.quantity || 1,
      description: item.description || '',
      status: item.status || '',
    });
  };

  const handleSaveEditItem = () => {
    if (!editItemForm.name.trim()) return;
    setExtractedItems(prev => prev.map(item => {
      if (item.id === editingItemId) {
        return {
          ...item,
          name: capitalizeFirst(editItemForm.name),
          quantity: Math.max(1, parseInt(editItemForm.quantity) || 1),
          description: capitalizeFirst(editItemForm.description),
          status: editItemForm.status ? editItemForm.status.trim() : null,
        };
      }
      return item;
    }));
    setEditingItemId(null);
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
  };

  const handleConfirmVoiceItems = async () => {
    if (isConfirmingVoiceItems) return;
    const confirmedItems = extractedItems.filter(i => i.checked && i.name.trim());
    if (confirmedItems.length === 0) return;

    setIsConfirmingVoiceItems(true);
    const activeProp = selectedProperty || selectedPropertyDetail;
    const room = selectedRoom;

    try {
      const matchedAmb = (activeProp?.ambientes || []).find(
        a => a.name?.toLowerCase().trim() === room?.toLowerCase().trim()
      );
      const categoryId = matchedAmb?.id;

      let createdItems = [];
      if (categoryId) {
        const payload = {
          user_id: authUser?.id || activeProp?.userId || 'anonymous',
          property_id: activeProp?.id,
          category_id: categoryId,
          items: confirmedItems.map(c => ({
            name: c.name.trim(),
            quantity: c.quantity || 1,
            description: c.description || null,
            status: c.status || null,
          })),
          transcription: transcribedText,
          duration: recordingTime || 0
        };

        const res = await voiceService.confirmVoiceItems(payload);
        if (res.success && (res.data?.items || res.items || res.data?.data?.items)) {
          createdItems = res.data?.items || res.items || res.data?.data?.items || [];
        }
      }

      const currentInv = activeProp?.inventory || getPropertyInventory(activeProp) || {};
      const roomItems = currentInv[room] || [];

      const newFormatted = createdItems.length > 0
        ? createdItems.map(ci => ({
            id: ci.id,
            name: ci.name,
            quantity: ci.quantity || 1,
            description: ci.details || ci.description || '',
            status: ci.status || null,
            cat_id: ci.cat_id
          }))
        : confirmedItems.map((c, idx) => ({
            id: Date.now() + idx,
            name: c.name.trim(),
            quantity: c.quantity || 1,
            description: c.description || '',
            status: c.status || null,
          }));

      const updatedInv = {
        ...currentInv,
        [room]: [...roomItems, ...newFormatted]
      };

      const updatedProp = { ...activeProp, inventory: updatedInv };
      if (selectedPropertyDetail && selectedPropertyDetail.id === activeProp?.id) {
        setSelectedPropertyDetail(updatedProp);
      }
      setProperties(prev => prev.map(p => p.id === activeProp?.id ? updatedProp : p));

      const count = newFormatted.length;
      closeQuickAction();
      toast.success(`¡${count} ítems incorporados exitosamente al inventario de ${room}!`);
    } catch (err) {
      console.error('Error al confirmar ítems de dictado:', err);
      toast.error('Error guardando los ítems: ' + (err.message || err));
    } finally {
      setIsConfirmingVoiceItems(false);
    }
  };

  // Handlers para la página / vista de detalle de propiedad
  const handleOpenPropertyDetail = useCallback(async (prop) => {
    setIsLoadingPropertyDetail(true);
    const propWithInv = {
      ...prop,
      inventory: prop.inventory || getPropertyInventory(prop),
      photos: prop.photos || getPropertyPhotos(prop),
      floorPlan: prop.floorPlan || null,
    };
    setSelectedPropertyDetail(propWithInv);
    setSelectedRoomDetail(null);
    setSelectedPhotoRoomDetail(null);
    setPreviousTab(activeTab === 'property-detail' ? 'home' : activeTab);
    setActiveTab('property-detail');
    setDetailSubTab('ambientes');
    setActiveRoomFilter('Todos');
    setPhotoFilterRoom('Todos');

    // Mantener las 3 propiedades recientes actualizadas con la última abierta
    setRecentProperties(prev => {
      const filtered = prev.filter(p => p.id !== prop.id);
      return [prop, ...filtered].slice(0, 3);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Consultar el detalle real de la propiedad desde el backend (ambientes e inventario de ítems reales)
    try {
      const res = await propertyService.getPropertyById(prop.id);
      const freshProp = res?.property || res?.data?.property;
      if (freshProp) {
        setSelectedPropertyDetail(prev => {
          if (!prev || prev.id !== prop.id) return prev;
          return {
            ...prev,
            ...freshProp,
            inventory: freshProp.inventory || prev.inventory || {},
            ambientes: freshProp.ambientes || prev.ambientes || [],
            rooms: freshProp.rooms || prev.rooms || [],
            floorPlan: freshProp.floorPlan !== undefined ? freshProp.floorPlan : (prev.floorPlan || null),
          };
        });
        setProperties(prev => prev.map(p => p.id === prop.id ? { ...p, ...freshProp } : p));
      }
    } catch (err) {
      console.warn('Error cargando detalle real de la propiedad:', err);
    } finally {
      setIsLoadingPropertyDetail(false);
    }
  }, [activeTab]);

  // Callback invocado automáticamente cada vez que una foto termina de subirse en background
  const handlePhotoUploaded = useCallback((result, photoItem) => {
    if (!result) return;
    const propId = result.property_id || photoItem?.property_id;
    const roomName = result.room || result.category || photoItem?.room || (selectedPropertyDetail?.rooms?.[0] || 'General');

    const newPhotoItem = {
      id: result.id,
      url: result.url,
      title: `${roomName} - Foto`,
      room: roomName,
      category: roomName,
      category_id: result.category_id || null,
      user_id: result.user_id,
      created_at: result.created_at || new Date().toISOString(),
    };

    setSelectedPropertyDetail((prev) => {
      if (!prev || prev.id !== propId) return prev;
      const currentPhotos = prev.photos || getPropertyPhotos(prev) || [];
      if (currentPhotos.some((p) => p.id === newPhotoItem.id || p.url === newPhotoItem.url)) {
        return prev;
      }
      return {
        ...prev,
        photos: [newPhotoItem, ...currentPhotos],
      };
    });

    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== propId) return p;
        const currentPhotos = p.photos || getPropertyPhotos(p) || [];
        if (currentPhotos.some((photo) => photo.id === newPhotoItem.id || photo.url === newPhotoItem.url)) {
          return p;
        }
        return {
          ...p,
          photos: [newPhotoItem, ...currentPhotos],
        };
      })
    );
  }, []);

  const handleOpenAddPhotosModal = (preselectedRoom = null) => {
    const defaultRoom = preselectedRoom || (selectedPropertyDetail?.rooms?.[0] || '');
    setNewPhotoRoom(defaultRoom);
    setSelectedNewPhotos([]);
    setIsAddingPhotosModal(true);
  };

  const handleNewPhotosSelected = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (!rawFiles.length) return;
    e.target.value = '';

    setIsOptimizingPhotos(true);
    try {
      const { validFiles, rejectedFiles } = await filterAndPreparePhotos(rawFiles);

      if (rejectedFiles.length > 0) {
        const rejectedList = rejectedFiles
          .map((r) => `• ${r.name} (${r.formattedSize})`)
          .join('\n');
        toast.warning(
          `${rejectedFiles.length === 1 ? 'Una foto supera' : `${rejectedFiles.length} fotos superan`} el límite máximo de 5MB:\n${rejectedList}`,
          { title: 'Fotos no agregadas (Límite 5MB)' }
        );
      }

      if (validFiles.length > 0) {
        const newItems = validFiles.map((vf, idx) => ({
          id: `pending-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          file: vf.file,
          name: vf.name,
          title: vf.name.replace(/\.[^/.]+$/, ''),
          url: vf.previewUrl,
          size: vf.size,
          originalSize: vf.originalSize,
          wasOptimized: vf.wasOptimized,
          formattedSize: vf.formattedSize,
          room: newPhotoRoom || 'General',
        }));

        setSelectedNewPhotos((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('Error preparando fotos seleccionadas:', err);
      toast.error('Error al preparar las fotos: ' + (err.message || err));
    } finally {
      setIsOptimizingPhotos(false);
    }
  };

  const handleRemovePendingPhoto = (id) => {
    setSelectedNewPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveNewPhotos = () => {
    if (!selectedPropertyDetail || selectedNewPhotos.length === 0) return;

    const filesToQueue = selectedNewPhotos.map((p) => ({
      file: p.file,
      name: p.name,
      size: p.size,
      originalSize: p.originalSize,
      wasOptimized: p.wasOptimized,
    }));

    const targetRoom = newPhotoRoom || (selectedPropertyDetail?.rooms?.[0] || 'General');

    // Cerrar el modal inmediatamente para que el usuario pueda seguir haciendo cosas sin interrupción
    setIsAddingPhotosModal(false);
    setSelectedNewPhotos([]);

    // Enviar a la cola asíncrona en segundo plano
    photoUploadService.queuePhotos({
      files: filesToQueue,
      property_id: selectedPropertyDetail.id,
      user_id: currentUserId,
      room: targetRoom,
      method: 'upload',
    });
  };

  const handleDeletePhoto = async (photoId) => {
    if (!selectedPropertyDetail) return;
    const currentPhotos = selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail);
    const updatedPhotos = currentPhotos.filter((p) => p.id !== photoId);
    const updatedProp = { ...selectedPropertyDetail, photos: updatedPhotos };
    setSelectedPropertyDetail(updatedProp);
    setProperties((prev) => prev.map((p) => (p.id === updatedProp.id ? updatedProp : p)));
    setSelectedPhotoModal(null);
    toast.info('Foto eliminada');

    // Sincronizar eliminación real en backend y Supabase Storage
    try {
      await api.delete('/api/photos', { body: { id: photoId } });
    } catch (err) {
      console.warn('Error eliminando foto en backend:', err);
    }
  };

  const handleExecuteBulkMove = async () => {
    const finalRoom = (newCustomMoveRoom || '').trim() || targetMoveRoom;
    if (!selectedPropertyDetail || selectedBulkPhotoIds.length === 0 || !finalRoom) return;

    const idsSet = new Set(selectedBulkPhotoIds.map(String));
    const currentPhotos = selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail);
    const updatedPhotos = currentPhotos.map((p) => {
      if (idsSet.has(String(p.id))) {
        return { ...p, room: finalRoom, category: finalRoom, title: `${finalRoom} - Foto` };
      }
      return p;
    });

    const currentRooms = selectedPropertyDetail.rooms || [];
    const roomExists = currentRooms.some((r) => r.trim().toLowerCase() === finalRoom.trim().toLowerCase());
    const updatedRooms = roomExists ? currentRooms : [...currentRooms, finalRoom];

    const updatedProp = { ...selectedPropertyDetail, rooms: updatedRooms, photos: updatedPhotos };
    setSelectedPropertyDetail(updatedProp);
    setProperties((prev) => prev.map((p) => (p.id === updatedProp.id ? updatedProp : p)));

    const idsToSync = [...selectedBulkPhotoIds];
    setIsMovingPhotosModal(false);
    setIsManagingPhotos(false);
    setSelectedBulkPhotoIds([]);
    setNewCustomMoveRoom('');
    toast.success(idsToSync.length === 1 ? `Foto movida a ${finalRoom}` : `${idsToSync.length} fotos movidas a ${finalRoom}`);

    // Sincronizar en background con backend
    try {
      const res = await api.patch('/api/photos', {
        photoIds: idsToSync,
        property_id: selectedPropertyDetail.id,
        room: finalRoom,
      });
      if (res && res.success === false) {
        console.warn('Aviso sincronizando fotos en backend:', res.error);
      }
    } catch (err) {
      console.warn('Backend batch move sync error:', err);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (!selectedPropertyDetail || selectedBulkPhotoIds.length === 0) return;

    const idsSet = new Set(selectedBulkPhotoIds.map(String));
    const currentPhotos = selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail);
    const updatedPhotos = currentPhotos.filter((p) => !idsSet.has(String(p.id)));

    const updatedProp = { ...selectedPropertyDetail, photos: updatedPhotos };
    setSelectedPropertyDetail(updatedProp);
    setProperties((prev) => prev.map((p) => (p.id === updatedProp.id ? updatedProp : p)));

    const idsToDelete = [...selectedBulkPhotoIds];
    setIsDeletingPhotosModal(false);
    setIsManagingPhotos(false);
    setSelectedBulkPhotoIds([]);
    toast.info(idsToDelete.length === 1 ? 'Foto eliminada' : `${idsToDelete.length} fotos eliminadas`);

    // Sincronizar en background con backend
    try {
      await api.delete('/api/photos', {
        body: { ids: idsToDelete },
      });
    } catch (err) {
      console.warn('Backend batch delete sync error:', err);
    }
  };

  const handleBackFromPropertyDetail = () => {
    if (selectedRoomDetail) {
      setSelectedRoomDetail(null);
      setIsAddingItemRoom(null);
      setDetailEditingItemId(null);
      setRoomItemSearchQuery('');
      return;
    }
    if (selectedPhotoRoomDetail) {
      setSelectedPhotoRoomDetail(null);
      setIsManagingPhotos(false);
      setSelectedBulkPhotoIds([]);
      return;
    }
    setActiveTab(previousTab || 'home');
    setSelectedPropertyDetail(null);
    setRoomItemSearchQuery('');
  };

  const handleConfirmDeleteProperty = async () => {
    if (!selectedPropertyDetail) return;
    const propId = selectedPropertyDetail.id;
    setIsDeletingProperty(true);
    try {
      await propertyService.deleteProperty(propId);
      setProperties(prev => prev.filter(p => p.id !== propId));
      setRecentProperties(prev => prev.filter(p => p.id !== propId));
      setIsDeletePropertyModalOpen(false);
      setIsPropertyOptionsMenuOpen(false);
      setSelectedPropertyDetail(null);
      setActiveTab(previousTab || 'propiedades');
      showToast('Propiedad eliminada');
    } catch (err) {
      console.error('Error al eliminar propiedad:', err);
      toast.error('Error al eliminar la propiedad. Inténtalo de nuevo.');
    } finally {
      setIsDeletingProperty(false);
    }
  };

  const handleStartDictationForRoom = (roomName) => {
    setSelectedProperty(selectedPropertyDetail);
    setSelectedRoom(roomName);
    setQuickActionType('voice');
    setActionStep(3);
    setIsDirectRoomAction(true);
    itemAudioRecorder.cancelRecording();
    setIsRecording(false);
    setVoicePhase('idle');
    setRecordingTime(0);
    setTranscribedText('');
    setExtractedItems([]);
  };

  const handleSaveNewItem = (roomName) => {
    if (!newItemName.trim() || !selectedPropertyDetail) return;
    const newItem = {
      id: Date.now(),
      name: capitalizeFirst(newItemName),
      quantity: Math.max(1, parseInt(newItemQty) || 1),
      description: capitalizeFirst(newItemDesc),
      status: newItemStatus ? newItemStatus.trim() : null,
    };

    const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail);
    const roomItems = currentInv[roomName] || [];
    const updatedInv = {
      ...currentInv,
      [roomName]: [...roomItems, newItem]
    };
    const updatedProp = { ...selectedPropertyDetail, inventory: updatedInv };

    setSelectedPropertyDetail(updatedProp);
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
    toast.success(`Ítem "${newItem.name}" agregado a ${roomName}`);

    setNewItemName('');
    setNewItemQty(1);
    setNewItemDesc('');
    setNewItemStatus('');
    setIsAddingItemRoom(null);
  };

  const handleStartDetailEdit = (item) => {
    setDetailEditingItemId(item.id);
    setDetailEditForm({
      name: item.name,
      quantity: item.quantity || 1,
      description: item.description || '',
      status: item.status || '',
    });
  };

  const handleSaveDetailEdit = (roomName) => {
    if (!detailEditForm.name.trim() || !selectedPropertyDetail) return;
    const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail);
    const roomItems = currentInv[roomName] || [];
    const updatedRoomItems = roomItems.map(item => {
      if (item.id === detailEditingItemId) {
        return {
          ...item,
          name: capitalizeFirst(detailEditForm.name),
          quantity: Math.max(1, parseInt(detailEditForm.quantity) || 1),
          description: capitalizeFirst(detailEditForm.description),
          status: detailEditForm.status ? detailEditForm.status.trim() : null,
        };
      }
      return item;
    });
    const updatedInv = {
      ...currentInv,
      [roomName]: updatedRoomItems
    };
    const updatedProp = { ...selectedPropertyDetail, inventory: updatedInv };

    setSelectedPropertyDetail(updatedProp);
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
    setDetailEditingItemId(null);
  };

  const handleDeleteDetailItem = (roomName, itemId) => {
    if (!selectedPropertyDetail) return;
    const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail);
    const roomItems = currentInv[roomName] || [];
    const updatedRoomItems = roomItems.filter(item => item.id !== itemId);
    const updatedInv = {
      ...currentInv,
      [roomName]: updatedRoomItems
    };
    const updatedProp = { ...selectedPropertyDetail, inventory: updatedInv };

    setSelectedPropertyDetail(updatedProp);
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
  };

  const handleOpenAddRoomModal = () => {
    roomAudioRecorder.cancelRecording();
    setIsAddingRoomToDetail(true);
    setAddRoomMethod('select');
    setNewDetailRoomName('');
    setVoiceRoomPhase('idle');
    setVoiceRoomTime(0);
    setVoiceRoomTranscript('');
    setDetectedVoiceRooms([]);
    setEditingDetectedRoomId(null);
  };

  const handleStartVoiceRoomRecording = async () => {
    const started = await roomAudioRecorder.startRecording();
    if (started) {
      setVoiceRoomPhase('recording');
      setVoiceRoomTime(0);
    } else {
      toast.error(roomAudioRecorder.error || 'No se pudo acceder al micrófono para dictar los ambientes.');
    }
  };

  const handleStopVoiceRoomRecording = async () => {
    setVoiceRoomPhase('processing');
    try {
      console.log('🎤 [handleStopVoiceRoomRecording] Deteniendo grabación...');
      const { audioBlob, mimeType } = await roomAudioRecorder.stopRecording();
      console.log('🎤 [handleStopVoiceRoomRecording] Audio obtenido:', { size: audioBlob?.size, mimeType });
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No se detectó audio grabado. Probá hablar más cerca del micrófono.');
      }

      const propId = selectedPropertyDetail?.id || selectedProperty?.id;
      if (!propId) {
        throw new Error('No se encontró el ID de la propiedad.');
      }

      const fileExt = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `ambient_${Date.now()}.${fileExt}`);
      formData.append('user_id', authUser?.id || selectedPropertyDetail?.userId || 'anonymous');
      formData.append('property_id', propId);

      console.log('🚀 [handleStopVoiceRoomRecording] Enviando audio a /api/voice/ambient/process...');
      const res = await voiceService.processVoiceAmbient(formData);
      console.log('📥 [handleStopVoiceRoomRecording] Respuesta del backend:', res);
      if (!res.success) {
        throw new Error(res.message || res.error || 'Error al procesar los ambientes por voz');
      }

      const rawAmbients = res.data?.ambients || res.ambients || res.data?.data?.ambients || [];
      const formatted = rawAmbients.map((amb, idx) => ({
        id: Date.now() + idx,
        name: capitalizeFirst(amb.name),
        type: amb.type || 'habitacion',
        checked: true
      }));

      const transcriptText = res.data?.transcription || res.transcription || res.data?.data?.transcription || 'Audio procesado correctamente';
      setVoiceRoomTranscript(transcriptText);
      setDetectedVoiceRooms(formatted);
      setVoiceRoomDuration(res.data?.duration || res.duration || res.data?.data?.duration || roomAudioRecorder.recordingTime || 0);
      setVoiceRoomPhase('review');
    } catch (err) {
      console.error('❌ Error procesando audio de ambientes:', err);
      toast.error(err.message || 'Ocurrió un error al procesar el audio.');
      setVoiceRoomPhase('idle');
    }
  };

  const handleToggleDetectedRoom = (id) => {
    setDetectedVoiceRooms(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r));
  };

  const handleStartEditDetectedRoom = (room) => {
    setEditingDetectedRoomId(room.id);
    setEditingDetectedRoomName(room.name);
  };

  const handleSaveEditDetectedRoom = () => {
    if (!editingDetectedRoomName.trim()) return;
    setDetectedVoiceRooms(prev => prev.map(r => r.id === editingDetectedRoomId ? { ...r, name: editingDetectedRoomName.trim() } : r));
    setEditingDetectedRoomId(null);
    setEditingDetectedRoomName('');
  };

  const handleCancelEditDetectedRoom = () => {
    setEditingDetectedRoomId(null);
    setEditingDetectedRoomName('');
  };

  const handleConfirmDetectedRooms = async () => {
    if (isConfirmingVoiceRooms) return;
    if (!selectedPropertyDetail) return;
    const confirmed = detectedVoiceRooms.filter(r => r.checked && r.name.trim());
    if (confirmed.length === 0) return;

    const currentRooms = selectedPropertyDetail.rooms || [];
    const currentAmbientes = selectedPropertyDetail.ambientes || [];
    const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail) || {};

    const newNames = confirmed.map(r => r.name.trim()).filter(name => !currentRooms.includes(name));
    if (newNames.length === 0) {
      toast.warning('Todos los ambientes seleccionados ya existían en esta propiedad.');
      setIsAddingRoomToDetail(false);
      setAddRoomMethod('select');
      return;
    }

    setIsConfirmingVoiceRooms(true);
    try {
      let createdCategories = [];
      const payload = {
        user_id: authUser?.id || selectedPropertyDetail.userId || 'anonymous',
        property_id: selectedPropertyDetail.id,
        ambients: confirmed.map(r => ({ name: r.name.trim(), type: r.type || 'habitacion' })),
        transcription: voiceRoomTranscript,
        duration: voiceRoomDuration || 0
      };

      const res = await voiceService.confirmVoiceAmbients(payload);
      if (res.success && (res.data?.ambients || res.ambients || res.data?.data?.ambients)) {
        createdCategories = res.data?.ambients || res.ambients || res.data?.data?.ambients || [];
      }

      const updatedRooms = [...currentRooms, ...newNames];
      const updatedInv = { ...currentInv };
      newNames.forEach(name => {
        if (!updatedInv[name]) updatedInv[name] = [];
      });

      const updatedAmbientes = createdCategories.length > 0
        ? [...currentAmbientes, ...createdCategories]
        : [...currentAmbientes, ...confirmed.map((r, i) => ({ id: `local-${Date.now()}-${i}`, name: r.name.trim(), type: r.type || 'habitacion' }))];

      const updatedProp = {
        ...selectedPropertyDetail,
        rooms: updatedRooms,
        ambientes: updatedAmbientes,
        inventory: updatedInv
      };

      setSelectedPropertyDetail(updatedProp);
      setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
      setIsAddingRoomToDetail(false);
      setAddRoomMethod('select');
      setVoiceRoomPhase('idle');
      toast.success(newNames.length === 1 ? `Ambiente ${newNames[0]} creado exitosamente` : `${newNames.length} ambientes creados exitosamente`);
    } catch (err) {
      console.error('Error al confirmar ambientes:', err);
      toast.error('Error guardando los ambientes: ' + (err.message || err));
    } finally {
      setIsConfirmingVoiceRooms(false);
    }
  };

  const handleAddRoomToPropertyDetail = (e, nameOverride) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawInput = (nameOverride || newDetailRoomName).trim();
    if (!rawInput || !selectedPropertyDetail) return;

    // Soporte para crear uno o múltiples separados por coma
    const roomNames = rawInput.split(',').map(n => n.trim()).filter(Boolean);
    const currentRooms = selectedPropertyDetail.rooms || [];
    const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail) || {};

    const newNames = roomNames.filter(name => !currentRooms.includes(name));
    if (newNames.length === 0) {
      toast.warning('Los ambientes ingresados ya existen en esta propiedad.');
      return;
    }

    const updatedRooms = [...currentRooms, ...newNames];
    const updatedInv = { ...currentInv };
    newNames.forEach(name => {
      if (!updatedInv[name]) updatedInv[name] = [];
    });

    const updatedProp = {
      ...selectedPropertyDetail,
      rooms: updatedRooms,
      inventory: updatedInv
    };

    setSelectedPropertyDetail(updatedProp);
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
    setNewDetailRoomName('');
    setIsAddingRoomToDetail(false);
    setAddRoomMethod('select');
    toast.success(newNames.length === 1 ? `Ambiente ${newNames[0]} creado exitosamente` : `${newNames.length} ambientes creados exitosamente`);
    if (newNames.length === 1) {
      setActiveRoomFilter(newNames[0]);
    }
  };

  // ============ HANDLERS MODAL UNIFICADO DE ÍTEMS (VOZ, FOTOS IA, MANUAL) ============
  const handleOpenAddItemModal = () => {
    itemAudioRecorder.cancelRecording();
    setIsAddItemModalOpen(true);
    setItemAddMethod('select');
    // reset voz
    setVoiceItemPhase('idle');
    setVoiceItemTime(0);
    setVoiceItemDuration(0);
    setVoiceItemTranscript('');
    setVoiceDetectedItems([]);
    // reset fotos
    setPhotoItemPhase('upload');
    setPhotoItemFiles([]);
    setPhotoDetectedItems([]);
    setSelectedPhotoReviewId('all');
    // reset modal edicion
    setReviewEditModal(null);
    setReviewEditForm({ name: '', quantity: 1, description: '', status: '' });
    // reset manual
    setNewItemName('');
    setNewItemQty(1);
    setNewItemDesc('');
    setNewItemStatus('');
  };

  const handleStartItemVoiceRecording = async () => {
    const started = await itemAudioRecorder.startRecording();
    if (started) {
      setVoiceItemPhase('recording');
      setVoiceItemTime(0);
    } else {
      toast.error(itemAudioRecorder.error || 'No se pudo acceder al micrófono para dictar los ítems.');
    }
  };

  const handleStopItemVoiceRecording = async () => {
    setVoiceItemPhase('processing');
    try {
      console.log('🎤 [handleStopItemVoiceRecording] Deteniendo grabación de ítem...');
      const { audioBlob, mimeType } = await itemAudioRecorder.stopRecording();
      console.log('🎤 [handleStopItemVoiceRecording] Audio de ítem obtenido:', { size: audioBlob?.size, mimeType });
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No se detectó audio grabado. Probá hablar más cerca del micrófono.');
      }

      const activeProp = selectedPropertyDetail || selectedProperty;
      const propId = activeProp?.id;
      if (!propId) {
        throw new Error('No se encontró el ID de la propiedad.');
      }

      // Buscar category_id del ambiente actual
      const matchedAmb = (activeProp?.ambientes || []).find(
        a => a.name?.toLowerCase().trim() === selectedRoomDetail?.toLowerCase().trim()
      );
      const categoryId = matchedAmb?.id || selectedRoomDetail || 'general';

      const fileExt = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `item_${Date.now()}.${fileExt}`);
      formData.append('user_id', authUser?.id || activeProp?.userId || 'anonymous');
      formData.append('property_id', propId);
      formData.append('category_id', categoryId);

      console.log('🚀 [handleStopItemVoiceRecording] Enviando audio a /api/voice/item/process...');
      const res = await voiceService.processVoiceItem(formData);
      console.log('📥 [handleStopItemVoiceRecording] Respuesta de voiceService:', res);
      if (!res.success) {
        throw new Error(res.message || res.error || 'Error al procesar los ítems por voz');
      }

      const rawItems = res.data?.items || res.items || res.data?.data?.items || [];
      const formatted = rawItems.map((item, idx) => ({
        id: Date.now() + idx,
        name: capitalizeFirst(item.name),
        quantity: item.quantity || 1,
        description: item.description || '',
        status: item.status || null,
        checked: true
      }));

      const transcriptText = res.data?.transcription || res.transcription || res.data?.data?.transcription || 'Audio procesado correctamente';
      setVoiceItemTranscript(transcriptText);
      setVoiceDetectedItems(formatted);
      setVoiceItemDuration(res.data?.duration || res.duration || res.data?.data?.duration || itemAudioRecorder.recordingTime || 0);
      setVoiceItemPhase('review');
    } catch (err) {
      console.error('❌ Error procesando audio de ítems:', err);
      toast.error(err.message || 'Ocurrió un error al procesar el audio.');
      setVoiceItemPhase('idle');
    }
  };

  const handleToggleVoiceItem = (id) => {
    setVoiceDetectedItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleOpenReviewEditModal = (item, source) => {
    setReviewEditModal({ item, source });
    setReviewEditForm({
      name: item.name || '',
      quantity: item.quantity || 1,
      description: item.description || '',
      status: item.status || ''
    });
  };

  const handleSaveReviewEditModal = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!reviewEditModal || !reviewEditForm.name.trim()) return;

    const { item, source } = reviewEditModal;
    const updated = {
      name: reviewEditForm.name.trim(),
      quantity: Math.max(1, parseInt(reviewEditForm.quantity) || 1),
      description: reviewEditForm.description.trim(),
      status: reviewEditForm.status ? reviewEditForm.status.trim() : null
    };

    if (source === 'voice') {
      setVoiceDetectedItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
    } else if (source === 'photo') {
      setPhotoDetectedItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
    }

    setReviewEditModal(null);
  };

  const handleConfirmRoomVoiceItems = async () => {
    if (isConfirmingRoomVoiceItems) return;
    if (!selectedPropertyDetail || !selectedRoomDetail) return;
    const confirmed = voiceDetectedItems.filter(i => i.checked && i.name.trim());
    if (confirmed.length === 0) return;

    setIsConfirmingRoomVoiceItems(true);
    try {
      const matchedAmb = (selectedPropertyDetail?.ambientes || []).find(
        a => a.name?.toLowerCase().trim() === selectedRoomDetail?.toLowerCase().trim()
      );
      const categoryId = matchedAmb?.id;

      let createdItems = [];
      if (categoryId) {
        const payload = {
          user_id: authUser?.id || selectedPropertyDetail.userId || 'anonymous',
          property_id: selectedPropertyDetail.id,
          category_id: categoryId,
          items: confirmed.map(c => ({
            name: c.name.trim(),
            quantity: c.quantity || 1,
            description: c.description || null,
            status: c.status || null
          })),
          transcription: voiceItemTranscript,
          duration: voiceItemDuration || 0
        };

        const res = await voiceService.confirmVoiceItems(payload);
        if (res.success && (res.data?.items || res.items || res.data?.data?.items)) {
          createdItems = res.data?.items || res.items || res.data?.data?.items || [];
        }
      }

      const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail) || {};
      const roomItems = currentInv[selectedRoomDetail] || [];

      const newFormatted = createdItems.length > 0
        ? createdItems.map(ci => ({
            id: ci.id,
            name: ci.name,
            quantity: ci.quantity || 1,
            description: ci.details || ci.description || '',
            status: ci.status || null,
            cat_id: ci.cat_id
          }))
        : confirmed.map((c, idx) => ({
            id: Date.now() + idx,
            name: c.name.trim(),
            quantity: c.quantity || 1,
            description: c.description || 'Relevado mediante dictado por voz IA',
            status: c.status || null
          }));

      const updatedInv = {
        ...currentInv,
        [selectedRoomDetail]: [...roomItems, ...newFormatted]
      };

      const updatedProp = { ...selectedPropertyDetail, inventory: updatedInv };
      setSelectedPropertyDetail(updatedProp);
      setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
      setIsAddItemModalOpen(false);
      toast.success(newFormatted.length === 1 ? `¡1 ítem incorporado al inventario de ${selectedRoomDetail}!` : `¡${newFormatted.length} ítems incorporados al inventario de ${selectedRoomDetail}!`);
    } catch (err) {
      console.error('Error al confirmar ítems:', err);
      toast.error('Error guardando los ítems: ' + (err.message || err));
    } finally {
      setIsConfirmingRoomVoiceItems(false);
    }
  };

  const handleSelectPhotoItemFiles = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remainingSlots = 5 - photoItemFiles.length;
    if (remainingSlots <= 0) {
      toast.warning('Solo podés seleccionar hasta 5 fotos a la vez');
      e.target.value = '';
      return;
    }
    const filesToAdd = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.warning(`Solo podés seleccionar hasta 5 fotos (se agregaron ${remainingSlots})`);
    }
    setPhotoItemFiles(prev => {
      const currentCount = prev.length;
      const newFiles = filesToAdd.map((file, idx) => ({
        id: `photo-item-${Date.now()}-${idx}`,
        title: `Foto ${currentCount + idx + 1}`,
        url: URL.createObjectURL(file),
        file
      }));
      return [...prev, ...newFiles];
    });
    e.target.value = '';
  };

  // Handler: abrir cámara in-app para captura múltiple
  const handleOpenCamera = (context = 'items') => {
    setCameraContext(context);
    setIsCameraOpen(true);
  };

  // Handler: fotos capturadas desde CameraCapture
  const handleCameraPhotosReady = (capturedPhotos) => {
    if (!capturedPhotos?.length) return;

    if (cameraContext === 'property') {
      // Flujo: "Subir fotos" a la propiedad
      const newItems = capturedPhotos.map((photo, idx) => ({
        id: `pending-cam-${Date.now()}-${idx}`,
        file: photo.file,
        name: photo.file.name,
        title: `Foto ${idx + 1}`,
        url: photo.url,
        size: photo.file.size,
        originalSize: photo.file.size,
        wasOptimized: false,
        formattedSize: `${(photo.file.size / 1024).toFixed(0)} KB`,
        room: newPhotoRoom || 'General',
      }));
      setSelectedNewPhotos(prev => [...prev, ...newItems]);
      toast.success(`${capturedPhotos.length} foto${capturedPhotos.length > 1 ? 's' : ''} agregada${capturedPhotos.length > 1 ? 's' : ''}`);
    } else if (cameraContext === 'room') {
      // Flujo: fotos de un ambiente específico
      const newPhotos = capturedPhotos.map((photo) => ({
        url: photo.url,
        file: photo.file,
      }));
      setRoomPhotos(prev => [...prev, ...newPhotos]);
      toast.success(`${capturedPhotos.length} foto${capturedPhotos.length > 1 ? 's' : ''} agregada${capturedPhotos.length > 1 ? 's' : ''}`);
    } else {
      // Flujo: detección de ítems por IA
      const remainingSlots = 20 - photoItemFiles.length;
      const photosToAdd = capturedPhotos.slice(0, remainingSlots);

      setPhotoItemFiles(prev => {
        const currentCount = prev.length;
        const newPhotos = photosToAdd.map((photo, idx) => ({
          id: `photo-cam-${Date.now()}-${idx}`,
          title: `Foto ${currentCount + idx + 1}`,
          url: photo.url,
          file: photo.file,
        }));
        return [...prev, ...newPhotos];
      });
      toast.success(`${photosToAdd.length} foto${photosToAdd.length > 1 ? 's' : ''} agregada${photosToAdd.length > 1 ? 's' : ''}`);
    }
  };

  // Handler nativo: elegir fotos de la galería (iOS/Android)
  const handleNativeGalleryPick = async () => {
    const remainingSlots = 20 - photoItemFiles.length;
    if (remainingSlots <= 0) {
      toast.warning('Ya tenés el máximo de fotos');
      return;
    }

    const photos = await pickFromGallery(Math.min(remainingSlots, 10));
    if (!photos.length) return;

    setPhotoItemFiles(prev => {
      const currentCount = prev.length;
      const newPhotos = photos.map((photo, idx) => ({
        id: `photo-gallery-${Date.now()}-${idx}`,
        title: `Foto ${currentCount + idx + 1}`,
        url: photo.url,
        file: photo.file,
      }));
      return [...prev, ...newPhotos];
    });

    toast.success(`${photos.length} foto${photos.length > 1 ? 's' : ''} agregada${photos.length > 1 ? 's' : ''}`);
  };

  const handleToggleExistingPhoto = (photo) => {
    const photoKey = `prop-photo-${photo.id}`;
    const alreadyInList = photoItemFiles.some(pf => pf.id === photoKey);
    if (alreadyInList) {
      setPhotoItemFiles(prev => prev.filter(pf => pf.id !== photoKey));
    } else {
      if (photoItemFiles.length >= 5) {
        toast.warning('Solo podés seleccionar hasta 5 fotos a la vez');
        return;
      }
      setPhotoItemFiles(prev => [
        ...prev,
        {
          id: photoKey,
          title: photo.title || 'Foto de la propiedad',
          url: photo.url,
          isExisting: true,
          originalPhoto: photo,
          room: photo.room || 'Sin asignar'
        }
      ]);
    }
  };

  const handleRemovePhotoItemFile = (id) => {
    setPhotoItemFiles(prev => prev.filter(f => f.id !== id));
  };

  const convertFileToOptimizedBase64 = (fileOrBlob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1280;
          let { width, height } = img;
          if (width > height && width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    });
  };

  const handleStartPhotoAnalysis = async (itemType = 'item') => {
    if (photoItemFiles.length === 0) return;
    if (photoItemFiles.length > 5) {
      toast.warning('Solo podés seleccionar hasta 5 fotos a la vez');
      return;
    }

    setPhotoAnalyzeType(itemType);
    setPhotoItemPhase('analyzing');

    try {
      const photoUrls = await Promise.all(
        photoItemFiles.map(async (item) => {
          if (item.file) {
            return await convertFileToOptimizedBase64(item.file);
          }
          if (item.url && item.url.startsWith('blob:')) {
            const resBlob = await fetch(item.url);
            const blob = await resBlob.blob();
            return await convertFileToOptimizedBase64(blob);
          }
          return item.url;
        })
      );

      const matchedAmb = (selectedPropertyDetail?.ambientes || []).find(
        a => a.name?.toLowerCase().trim() === (selectedRoomDetail || '').toLowerCase().trim()
      );

      const res = await photoService.analyzePhotos({
        photos: photoUrls,
        property_id: selectedPropertyDetail?.id,
        room: selectedRoomDetail,
        category_id: matchedAmb?.id || null,
        item_type: itemType
      });

      if (res.success && res.data?.items) {
        const items = res.data.items.map((item, idx) => ({
          id: `photo-item-${Date.now()}-${idx}`,
          name: item.name || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          status: item.status || 'Bueno',
          checked: true,
          photoId: photoItemFiles[idx % photoItemFiles.length]?.id || 'all',
          structure: itemType === 'structure'
        }));

        if (items.length === 0) {
          toast.info(`No se identificaron elementos de ${itemType === 'structure' ? 'estructura' : 'mobiliario'} en las fotos analizadas.`);
          setPhotoItemPhase('upload');
        } else {
          setPhotoDetectedItems(items);
          setSelectedPhotoReviewId('all');
          setPhotoItemPhase('review');
        }
      } else {
        toast.error(res.message || res.error || 'Error al analizar las fotos.');
        setPhotoItemPhase('upload');
      }
    } catch (err) {
      console.error('Error al analizar fotos con IA:', err);
      toast.error('Error al procesar las fotos con IA: ' + (err.message || err));
      setPhotoItemPhase('upload');
    }
  };

  const handleTogglePhotoDetectedItem = (id) => {
    setPhotoDetectedItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleConfirmPhotoItems = async () => {
    if (isConfirmingPhotoItems) return;
    if (!selectedPropertyDetail || !selectedRoomDetail) return;
    const confirmed = photoDetectedItems.filter(i => i.checked && i.name.trim());
    if (confirmed.length === 0) {
      toast.warning('Seleccioná al menos un ítem para incorporar');
      return;
    }

    setIsConfirmingPhotoItems(true);
    try {
      const matchedAmb = (selectedPropertyDetail.ambientes || []).find(
        a => a.name?.toLowerCase().trim() === selectedRoomDetail.toLowerCase().trim()
      );
      const categoryId = matchedAmb?.id;

      let createdItems = [];
      if (categoryId) {
        const payload = {
          user_id: authUser?.id || selectedPropertyDetail.userId || 'anonymous',
          property_id: selectedPropertyDetail.id,
          category_id: categoryId,
          items: confirmed.map(c => ({
            name: c.name.trim(),
            quantity: c.quantity || 1,
            description: c.description || null,
            status: c.status || null
          })),
          transcription: `Análisis de ${photoItemFiles.length} foto(s) con IA`,
          duration: 0
        };

        const res = await voiceService.confirmVoiceItems(payload);
        if (res.success && (res.data?.items || res.items || res.data?.data?.items)) {
          createdItems = res.data?.items || res.items || res.data?.data?.items || [];
        }
      }

      const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail) || {};
      const roomItems = currentInv[selectedRoomDetail] || [];

      const newFormatted = createdItems.length > 0
        ? createdItems.map(ci => ({
            id: ci.id,
            name: ci.name,
            quantity: ci.quantity || 1,
            description: ci.details || ci.description || '',
            status: ci.status || null,
            cat_id: ci.cat_id
          }))
        : confirmed.map((c, idx) => ({
            id: Date.now() + idx,
            name: c.name.trim(),
            quantity: c.quantity || 1,
            description: c.description || '',
            status: c.status || null
          }));

      const currentPhotos = selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail) || [];
      const newPhotosFormatted = photoItemFiles
        .filter(pf => !pf.isExisting)
        .map((pf) => ({
          id: pf.id,
          title: `${selectedRoomDetail} - ${pf.title}`,
          room: selectedRoomDetail,
          url: pf.url
        }));

      const updatedInv = {
        ...currentInv,
        [selectedRoomDetail]: [...roomItems, ...newFormatted]
      };

      const updatedProp = {
        ...selectedPropertyDetail,
        inventory: updatedInv,
        photos: [...currentPhotos, ...newPhotosFormatted]
      };

      setSelectedPropertyDetail(updatedProp);
      setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
      setIsAddItemModalOpen(false);
      setPhotoItemFiles([]);
      setPhotoDetectedItems([]);
      toast.success(newFormatted.length === 1 
        ? `¡1 ítem incorporado al inventario de ${selectedRoomDetail}!` 
        : `¡${newFormatted.length} ítems incorporados al inventario de ${selectedRoomDetail}!`);
    } catch (err) {
      console.error('Error al confirmar ítems de fotos:', err);
      toast.error('Error guardando los ítems: ' + (err.message || err));
    } finally {
      setIsConfirmingPhotoItems(false);
    }
  };

  const handleSaveManualItemInModal = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newItemName.trim() || !selectedRoomDetail || !selectedPropertyDetail) return;

    const currentInv = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail) || {};
    const roomItems = currentInv[selectedRoomDetail] || [];

    const matchedAmb = (selectedPropertyDetail?.ambientes || []).find(
      a => a.name?.toLowerCase().trim() === selectedRoomDetail?.toLowerCase().trim()
    );
    const categoryId = matchedAmb?.id;

    let createdItem = null;
    if (categoryId) {
      try {
        const res = await voiceService.confirmVoiceItems({
          user_id: authUser?.id || selectedPropertyDetail.userId || 'anonymous',
          property_id: selectedPropertyDetail.id,
          category_id: categoryId,
          items: [{
            name: newItemName.trim(),
            quantity: Math.max(1, parseInt(newItemQty) || 1),
            description: newItemDesc.trim() || null,
            status: newItemStatus ? newItemStatus.trim() : null
          }]
        });
        if (res.success && res.data?.items?.[0]) {
          createdItem = res.data.items[0];
        }
      } catch (err) {
        console.warn('Error guardando ítem manual en BD:', err);
      }
    }

    const newItem = createdItem ? {
      id: createdItem.id,
      name: createdItem.name,
      quantity: createdItem.quantity || 1,
      description: createdItem.details || createdItem.description || '',
      status: createdItem.status || null,
      cat_id: createdItem.cat_id
    } : {
      id: Date.now(),
      name: newItemName.trim(),
      quantity: Math.max(1, parseInt(newItemQty) || 1),
      description: newItemDesc.trim() || '',
      status: newItemStatus ? newItemStatus.trim() : null
    };

    const updatedInv = {
      ...currentInv,
      [selectedRoomDetail]: [...roomItems, newItem]
    };

    const updatedProp = {
      ...selectedPropertyDetail,
      inventory: updatedInv
    };

    setSelectedPropertyDetail(updatedProp);
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
    setNewItemName('');
    setNewItemQty(1);
    setNewItemDesc('');
    setNewItemStatus('');
    toast.success(`Ítem "${newItem.name}" agregado a ${selectedRoomDetail}`);
    setIsAddItemModalOpen(false);
  };

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const cardWidth = 310;
    const index = Math.round(scrollLeft / cardWidth);
    if (index !== activeCardIndex && index >= 0 && index < properties.length) {
      setActiveCardIndex(index);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoomPhotosChange = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (!rawFiles.length) return;
    e.target.value = '';

    try {
      const { validFiles, rejectedFiles } = await filterAndPreparePhotos(rawFiles);
      if (rejectedFiles.length > 0) {
        const rejectedList = rejectedFiles
          .map((r) => `• ${r.name} (${r.formattedSize})`)
          .join('\n');
        toast.warning(
          `${rejectedFiles.length === 1 ? 'Una foto supera' : `${rejectedFiles.length} fotos superan`} el límite máximo de 5MB:\n${rejectedList}`,
          { title: 'Fotos no agregadas (Límite 5MB)' }
        );
      }

      if (validFiles.length > 0) {
        setRoomPhotos((prev) => [
          ...prev,
          ...validFiles.map((vf) => ({
            file: vf.file,
            name: vf.name,
            size: vf.size,
            originalSize: vf.originalSize,
            wasOptimized: vf.wasOptimized,
            formattedSize: vf.formattedSize,
            url: vf.previewUrl,
          })),
        ]);
      }
    } catch (err) {
      console.error('Error preparando fotos de ambiente:', err);
    }
  };

  const handleRemovePhoto = (index) => {
    setRoomPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePlanFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPlanFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenFloorPlanDesigner = (prop) => {
    if (prop) setSelectedPropertyDetail(prop);
    setIsFloorPlanEditorOpen(true);
  };

  const handleSaveFloorPlan = async (planPayload) => {
    if (!selectedPropertyDetail) return;
    const propId = selectedPropertyDetail.id;

    // Actualización optimista inmediata en estado para respuesta instantánea
    const updatedProp = {
      ...selectedPropertyDetail,
      floorPlan: planPayload
    };
    setSelectedPropertyDetail(updatedProp);
    setProperties(prev => prev.map(p => p.id === propId ? updatedProp : p));
    setIsFloorPlanEditorOpen(false);

    // Guardado persistente en la base de datos Supabase vía API
    try {
      const res = await propertyService.saveFloorPlan(propId, planPayload);
      if (res?.floorPlan) {
        setSelectedPropertyDetail(prev => {
          if (!prev || prev.id !== propId) return prev;
          return { ...prev, floorPlan: res.floorPlan };
        });
        setProperties(prev => prev.map(p => p.id === propId ? { ...p, floorPlan: res.floorPlan } : p));
      }
    } catch (err) {
      console.warn('Error al persistir plano en backend:', err);
    }
  };

  const handleCreateProperty = async (data) => {
    // Acepta evento si viniera de form tradicional o payload estructurado
    const payload = (data && !data.preventDefault) ? data : {
      name: formName.trim(),
      location: formAddress.trim() || 'Uruguay',
      address: formAddress.trim() || 'Uruguay',
      type: 'apto',
      image_url: formImage || null,
      ambients: [],
      rooms: [],
    };

    if (!payload.name?.trim()) return;

    const propertyPayload = {
      name: payload.name.trim(),
      location: payload.location || payload.address || 'Uruguay',
      address: payload.address || payload.location || 'Uruguay',
      type: payload.type || 'apto',
      apartment_number: payload.apartment_number || null,
      image_url: payload.image_url || null,
      typeSeguro: payload.typeSeguro || null,
      ambients: payload.ambients || [],
      rooms: payload.rooms || (payload.ambients ? payload.ambients.map(a => a.name) : []),
    };

    try {
      const res = await propertyService.createProperty(propertyPayload);
      if (res?.success && res.property) {
        const created = {
          ...res.property,
          title: res.property.name,
          image: res.property.image || propertyPayload.image_url || null,
          rooms: res.property.rooms || propertyPayload.rooms || [],
          ambientes: res.property.ambientes?.length || res.property.rooms?.length || propertyPayload.rooms?.length || 0,
          typeSeguro: res.property.typeSeguro || propertyPayload.typeSeguro || null,
          items: 0,
          inventory: {},
        };
        setProperties(prev => [created, ...prev]);
        setRecentProperties(prev => [created, ...prev.filter(p => p.id !== created.id)].slice(0, 3));
      } else {
        const newProperty = {
          id: Date.now(),
          name: propertyPayload.name,
          title: propertyPayload.name,
          address: propertyPayload.address,
          location: propertyPayload.location,
          image: propertyPayload.image_url || null,
          rooms: propertyPayload.rooms || [],
          ambientes: (propertyPayload.rooms || []).length,
          typeSeguro: propertyPayload.typeSeguro || null,
          items: 0,
          inventory: {},
        };
        setProperties(prev => [newProperty, ...prev]);
        setRecentProperties(prev => [newProperty, ...prev].slice(0, 3));
      }
    } catch (err) {
      console.warn('Error al persistir propiedad en backend, guardando local:', err);
      const newProperty = {
        id: Date.now(),
        name: propertyPayload.name,
        title: propertyPayload.name,
        address: propertyPayload.address,
        location: propertyPayload.location,
        image: propertyPayload.image_url || null,
        rooms: propertyPayload.rooms || [],
        ambientes: (propertyPayload.rooms || []).length,
        typeSeguro: propertyPayload.typeSeguro || null,
        items: 0,
        inventory: {},
      };
      setProperties(prev => [newProperty, ...prev]);
      setRecentProperties(prev => [newProperty, ...prev].slice(0, 3));
    }

    toast.success(`Propiedad "${propertyPayload.name}" creada exitosamente`);

    setFormName('');
    setFormAddress('');
    setFormImage(null);
    setIsModalOpen(false);
  };

  // Abrir modal de acción rápida (Dictado / Fotos / Planos)
  const openQuickAction = (type) => {
    setQuickActionType(type);
    setActionStep(1);
    setSelectedProperty(null);
    setSelectedRoom(null);
    setIsRecording(false);
    setIsAddingCustomRoom(false);
    setCustomRoomInput('');
    setRoomPhotos([]);
    setGeneratedPlan(false);
    setUploadedPlanFile(null);
    setPropertySearchQuery('');
    setPropertyPage(1);
    setVoicePhase('idle');
    setTranscribedText('');
    setExtractedItems([]);
    setIsDirectRoomAction(false);
  };

  const closeQuickAction = () => {
    itemAudioRecorder.cancelRecording();
    setQuickActionType(null);
    setIsRecording(false);
    setVoicePhase('idle');
    setIsDirectRoomAction(false);
  };

  const getActionTitle = () => {
    if (quickActionType === 'voice') return 'Dictado por voz';
    if (quickActionType === 'photos') return 'Cargar fotos';
    if (quickActionType === 'plans') return 'Planos y croquis';
    return '';
  };

  const handleSelectProperty = (prop) => {
    setSelectedProperty(prop);
    setActionStep(2);
  };

  const handleSelectRoom = (roomName) => {
    setSelectedRoom(roomName);
    setActionStep(3);
  };

  const handleAddCustomRoom = (e) => {
    e.preventDefault();
    if (!customRoomInput.trim()) return;
    const roomName = customRoomInput.trim();
    if (selectedProperty && !selectedProperty.rooms.includes(roomName)) {
      selectedProperty.rooms.push(roomName);
    }
    setSelectedRoom(roomName);
    setActionStep(3);
    setCustomRoomInput('');
    setIsAddingCustomRoom(false);
  };

  // Renderizado condicional mientras se verifica la sesión inicial o se cargan las propiedades
  if (authLoading || (isAuthenticated && authView === 'app' && !hasInitialPropertiesLoaded)) {
    return (
      <div className="app-container" style={{
        ...styles.appContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center', animation: 'appFadeIn 0.25s ease-out' }}>
          <img src={logo} alt="Aitems" style={{ width: 135, marginBottom: 20, opacity: 0.95 }} />
          <div style={{
            width: 30,
            height: 30,
            border: '2.5px solid #e2e8f0',
            borderTopColor: '#4f46e5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 14px auto',
          }} />
          <p style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            letterSpacing: '0.2px',
          }}>
            Cargando tus propiedades...
          </p>
        </div>
      </div>
    );
  }

  // Renderizado para vista pública de PDF compartido
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pdf/')) {
    return (
      <PDFViewer 
        onBack={() => {
          window.history.pushState({}, '', '/');
          window.location.reload();
        }} 
      />
    );
  }

  // Renderizado condicional de vistas de inicio / autenticación
  if (authView === 'login') {
    return (
      <div className="app-container" style={styles.appContainer}>
        <LoginScreen 
          onLogin={handleLogin}
          onRegisterSuccess={handleRegisterSuccess}
        />
      </div>
    );
  }

  if (authView === 'verify-email') {
    return (
      <div className="app-container" style={styles.appContainer}>
        <VerifyEmailScreen 
          email={pendingRegisterEmail}
          onContinue={() => setAuthView('create-inmobiliaria')}
          onNavigateLogin={() => setAuthView('login')}
        />
      </div>
    );
  }

  if (authView === 'create-inmobiliaria') {
    return (
      <div className="app-container" style={styles.appContainer}>
        <CreateInmobiliariaScreen 
          initialData={pendingRegisterData}
          onCompleteInmobiliaria={handleCompleteInmobiliaria}
          onSkip={() => setAuthView('app')}
        />
      </div>
    );
  }

  return (
    <div className="app-container" style={styles.appContainer}>
      {/* ============ TOP BAR ============ */}
      <header className="app-top-bar" style={styles.topBar}>
        <div 
          style={styles.brandContainer}
          onClick={() => {
            setSelectedPropertyDetail(null);
            setSelectedRoomDetail(null);
            setActiveTab('home');
            setIsMenuOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Ir al inicio"
        >
          <img src={logo} alt="Aitems" style={styles.logo} />
        </div>
        <div style={styles.headerActions}>
          <button 
            style={styles.iconBtn} 
            aria-label="Menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={20} color="#1e293b" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* ============ MENÚ LATERAL DESPLEGABLE ============ */}
      {isMenuOpen && (
        <div style={styles.menuOverlay} onClick={() => setIsMenuOpen(false)}>
          <div style={styles.menuDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.menuHeader}>
              <span style={styles.menuTitle}>Aitems</span>
              <button style={styles.menuCloseBtn} onClick={() => setIsMenuOpen(false)}>
                <X size={18} color="#64748b" />
              </button>
            </div>
            <div style={styles.menuContent}>
              {/* Perfil del Usuario (Nombre y Email) */}
              <div style={styles.drawerUserCard}>
                <div style={styles.drawerUserAvatar}>
                  {(currentUser?.name || currentUser?.email || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div style={styles.drawerUserInfo}>
                  <span style={styles.drawerUserName}>{currentUser?.name || 'Usuario'}</span>
                  <span style={styles.drawerUserEmail}>{currentUser?.email || ''}</span>
                </div>
              </div>

              {/* Navegación del Drawer */}
              <div style={styles.drawerNavList}>
                <button 
                  type="button"
                  style={{
                    ...styles.drawerNavBtn,
                    backgroundColor: activeTab === 'home' && !selectedPropertyDetail ? '#f1f5f9' : 'transparent',
                    color: activeTab === 'home' && !selectedPropertyDetail ? '#0f172a' : '#475569',
                    fontWeight: activeTab === 'home' && !selectedPropertyDetail ? '700' : '600',
                  }}
                  onClick={() => {
                    setSelectedPropertyDetail(null);
                    setSelectedRoomDetail(null);
                    setActiveTab('home');
                    setIsMenuOpen(false);
                  }}
                >
                  <Home size={18} color={activeTab === 'home' && !selectedPropertyDetail ? '#0f172a' : '#64748b'} />
                  <span>Inicio</span>
                </button>

                <button 
                  type="button"
                  style={{
                    ...styles.drawerNavBtn,
                    backgroundColor: activeTab === 'propiedades' && !selectedPropertyDetail ? '#f1f5f9' : 'transparent',
                    color: activeTab === 'propiedades' && !selectedPropertyDetail ? '#0f172a' : '#475569',
                    fontWeight: activeTab === 'propiedades' && !selectedPropertyDetail ? '700' : '600',
                  }}
                  onClick={() => {
                    setSelectedPropertyDetail(null);
                    setSelectedRoomDetail(null);
                    setActiveTab('propiedades');
                    setIsMenuOpen(false);
                  }}
                >
                  <Building2 size={18} color={activeTab === 'propiedades' && !selectedPropertyDetail ? '#0f172a' : '#64748b'} />
                  <span>Propiedades</span>
                </button>

                {userRole === 'owner' && (
                  <button 
                    type="button"
                    style={{
                      ...styles.drawerNavBtn,
                      backgroundColor: activeTab === 'dashboard' ? '#f1f5f9' : 'transparent',
                      color: activeTab === 'dashboard' ? '#0f172a' : '#475569',
                      fontWeight: activeTab === 'dashboard' ? '700' : '600',
                    }}
                    onClick={() => {
                      setSelectedPropertyDetail(null);
                      setSelectedRoomDetail(null);
                      setActiveTab('dashboard');
                      setIsMenuOpen(false);
                    }}
                  >
                    <Briefcase size={18} color={activeTab === 'dashboard' ? '#0f172a' : '#64748b'} />
                    <span>Panel de Inmobiliaria</span>
                  </button>
                )}
              </div>

              <div style={styles.drawerDivider} />

              {/* Botón de Cerrar Sesión */}
              <button 
                type="button" 
                style={styles.drawerLogoutBtn} 
                onClick={handleLogout}
              >
                <LogOut size={16} color="#ef4444" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ VISTA 1: HOME ============ */}
      {activeTab === 'home' && (
        <main key="home-view" className="app-main-content" style={styles.mainContent}>
          {/* ---- SECCIÓN: PROPIEDADES RECIENTES ---- */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Propiedades Recientes</h2>
              </div>
              {properties.length > 0 && (
                <button 
                  style={styles.verTodasBtn}
                  onClick={() => setActiveTab('propiedades')}
                >
                  <span>Ver todas</span>
                  <ChevronRight size={14} color="#4f46e5" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Carrusel con las últimas 3 propiedades con actividad */}
            {isLoadingProperties ? (
              <div style={styles.cardsCarousel} className="app-cards-carousel no-scrollbar">
                {[1, 2].map((skIndex) => (
                  <div 
                    key={skIndex} 
                    className="app-skeleton-shimmer"
                    style={{
                      minWidth: '260px',
                      maxWidth: '280px',
                      height: '360px',
                      borderRadius: '24px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      background: 'rgba(255,255,255,0.75)',
                      backdropFilter: 'blur(8px)',
                      padding: '16px',
                      borderRadius: '16px',
                    }}>
                      <div style={{ width: '70%', height: '18px', borderRadius: '6px', background: '#cbd5e1' }} />
                      <div style={{ width: '90%', height: '12px', borderRadius: '4px', background: '#e2e8f0' }} />
                      <div style={{ width: '50%', height: '22px', borderRadius: '12px', background: '#e2e8f0' }} />
                      <div style={{ width: '100%', height: '38px', borderRadius: '12px', background: '#e2e8f0', marginTop: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (recentProperties.length > 0 ? recentProperties : properties).slice(0, 3).length > 0 ? (
              <>
                <div 
                  style={styles.cardsCarousel} 
                  className="app-cards-carousel no-scrollbar"
                  onScroll={handleScroll}
                >
                  {(recentProperties.length > 0 ? recentProperties : properties).slice(0, 3).map((item) => (
                    <article 
                      key={item.id} 
                      className="app-property-card"
                      style={{ ...styles.card, cursor: 'pointer' }}
                      onClick={() => handleOpenPropertyDetail(item)}
                    >
                      <img 
                        src={item.image || item.image_url || placeholderVertical} 
                        alt={item.name || item.title} 
                        style={styles.cardImg} 
                        onError={(e) => {
                          if (e.target.src !== placeholderVertical) {
                            e.target.src = placeholderVertical;
                          }
                        }}
                      />
                      <div style={styles.cardVignette} />

                      {item.access === false && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                        }}>
                          Sin acceso
                        </div>
                      )}

                      <div className="app-card-bottom" style={styles.cardBottom}>
                        <h3 className="app-card-title" style={styles.cardTitle}>{item.name || item.title}</h3>

                        {(item.address || item.location) && (
                          <div style={styles.cardAddressRow}>
                            <MapPin size={14} color="rgba(255, 255, 255, 0.85)" strokeWidth={2} style={{ flexShrink: 0 }} />
                            <span style={styles.cardAddress}>{item.address || item.location}</span>
                          </div>
                        )}

                        {/* Indicador estilizado y unificado de Ambientes e Ítems en cápsula frosted glass */}
                        {(() => {
                          const ambCount = item.ambientes ?? (item.rooms ? item.rooms.length : 0);
                          const itemsCount = item.items ?? item.itemsCount ?? item.total_items ?? 0;
                          return (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '10px',
                              alignSelf: 'flex-start',
                              backgroundColor: 'rgba(255, 255, 255, 0.16)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              borderRadius: '24px',
                              padding: '5px 12px',
                              marginTop: '2px',
                              marginBottom: '12px',
                              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#ffffff',
                                letterSpacing: '0.1px',
                              }}>
                                <Building2 size={13} color="#ffffff" strokeWidth={2.2} />
                                <span>{ambCount} {ambCount === 1 ? 'Ambiente' : 'Ambientes'}</span>
                              </div>

                              <span style={{
                                width: '3px',
                                height: '3px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.55)',
                              }} />

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#ffffff',
                                letterSpacing: '0.1px',
                              }}>
                                <Layers size={13} color="#ffffff" strokeWidth={2.2} />
                                <span>{itemsCount} {itemsCount === 1 ? 'Ítem' : 'Ítems'}</span>
                              </div>
                            </div>
                          );
                        })()}

                        <button 
                          className="app-admin-btn"
                          style={styles.adminBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPropertyDetail(item);
                          }}
                        >
                          <span>ADMINISTRAR</span>
                          <ArrowRight size={16} color="#4f46e5" strokeWidth={2.5} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div style={styles.dotsRow}>
                  {(recentProperties.length > 0 ? recentProperties : properties).slice(0, 3).map((_, i) => (
                    <span 
                      key={i} 
                      style={{
                        ...styles.dot,
                        ...(activeCardIndex === i ? styles.activeDot : {})
                      }} 
                    />
                  ))}
                </div>
              </>
            ) : (
              /* Recuadro con líneas punteadas ligero y sobrio */
              <div style={styles.emptyContainer}>
                <div 
                  className="app-dashed-card"
                  style={styles.dashedCard}
                  onClick={() => setIsModalOpen(true)}
                >
                  <div className="app-dashed-icon-circle" style={styles.dashedIconCircle}>
                    <Plus size={22} color="#4f46e5" strokeWidth={2.5} />
                  </div>
                  
                  <div style={styles.dashedTextGroup}>
                    <h3 className="app-dashed-title" style={styles.dashedTitle}>Crear primera propiedad</h3>
                    <p className="app-dashed-subtitle" style={styles.dashedSubtitle}>Tocá acá para cargar los datos y comenzar</p>
                  </div>

                  <div className="app-dashed-badge" style={styles.dashedBadge}>
                    <span>+ Nueva propiedad</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ---- SECCIÓN: ACCIONES RÁPIDAS ---- */}
          <section style={styles.quickSection}>
            <div style={styles.quickSectionHeader}>
              <h3 style={styles.quickSectionTitle}>Acciones rápidas</h3>
            </div>

            <div className="app-quick-grid" style={styles.quickGrid}>
              {/* Botón 1: Dictado por voz */}
              <div 
                className="app-quick-card"
                style={styles.quickCard}
                onClick={() => openQuickAction('voice')}
              >
                <div className="app-quick-icon-box" style={styles.quickIconBox}>
                  <Mic size={18} color="#4f46e5" strokeWidth={2.2} />
                </div>
                <div style={styles.quickInfo}>
                  <h4 className="app-quick-card-title" style={styles.quickCardTitle}>Dictado por voz</h4>
                  <p className="app-quick-card-desc" style={styles.quickCardDesc}>Relevá ambientes e ítems mientras recorrés</p>
                </div>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>

              {/* Botón 2: Cargar fotos */}
              <div 
                className="app-quick-card"
                style={styles.quickCard}
                onClick={() => openQuickAction('photos')}
              >
                <div className="app-quick-icon-box" style={styles.quickIconBox}>
                  <Camera size={18} color="#4f46e5" strokeWidth={2.2} />
                </div>
                <div style={styles.quickInfo}>
                  <h4 className="app-quick-card-title" style={styles.quickCardTitle}>Cargar fotos</h4>
                  <p className="app-quick-card-desc" style={styles.quickCardDesc}>Subí fotos para generar el inventario</p>
                </div>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>

              {/* Botón 3: Planos */}
              <div 
                className="app-quick-card"
                style={styles.quickCard}
                onClick={() => openQuickAction('plans')}
              >
                <div className="app-quick-icon-box" style={styles.quickIconBox}>
                  <Layers size={18} color="#4f46e5" strokeWidth={2.2} />
                </div>
                <div style={styles.quickInfo}>
                  <h4 className="app-quick-card-title" style={styles.quickCardTitle}>Planos y croquis</h4>
                  <p className="app-quick-card-desc" style={styles.quickCardDesc}>Distribución y medidas por ambiente</p>
                </div>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>
            </div>
          </section>

          <div style={{ height: '90px' }} />
        </main>
      )}

      {/* ============ VISTA 2: TAB PROPIEDADES ============ */}
      {activeTab === 'propiedades' && (
        <main key="properties-view" className="app-main-content" style={styles.mainContent}>
          <div style={styles.tabHeader}>
            <h2 style={styles.sectionTitle}>
              {propertyFilterScope === 'compartidas' ? 'Propiedades compartidas' : 'Mis propiedades'}
            </h2>
            <p style={styles.tabSubtitle}>
              {propertyFilterScope === 'compartidas' ? 'Compartidas por colegas de tu inmobiliaria' : 'Inventarios creados por ti'}
            </p>
          </div>

          {isLoadingProperties ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  <div className="app-skeleton-shimmer" style={{ width: '64px', height: '64px', borderRadius: '12px', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="app-skeleton-shimmer" style={{ width: '65%', height: '16px', borderRadius: '4px' }} />
                    <div className="app-skeleton-shimmer" style={{ width: '85%', height: '12px', borderRadius: '4px' }} />
                    <div className="app-skeleton-shimmer" style={{ width: '40%', height: '14px', borderRadius: '6px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <>
              {/* Barra de Filtro y Orden */}
              <div style={styles.tabControlsContainer}>
                {/* Pestañas de ámbito: Mis propiedades | Compartidas */}
                <div style={styles.propertiesScopeTabs}>
                  <button
                    type="button"
                    style={{
                      ...styles.propertiesScopeTab,
                      ...(propertyFilterScope === 'propias' ? styles.propertiesScopeTabActive : styles.propertiesScopeTabInactive),
                    }}
                    onClick={() => {
                      setPropertyFilterScope('propias');
                      setTabVisibleCount(TAB_INITIAL_VISIBLE);
                    }}
                  >
                    <span>Mis propiedades</span>
                    <span style={propertyFilterScope === 'propias' ? styles.scopeCountBadgeActive : styles.scopeCountBadgeInactive}>
                      {propertiesCountMine}
                    </span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.propertiesScopeTab,
                      ...(propertyFilterScope === 'compartidas' ? styles.propertiesScopeTabActive : styles.propertiesScopeTabInactive),
                    }}
                    onClick={() => {
                      setPropertyFilterScope('compartidas');
                      setTabVisibleCount(TAB_INITIAL_VISIBLE);
                    }}
                  >
                    <Users size={13} style={{ marginRight: '2px' }} />
                    <span>Compartidas</span>
                    <span style={propertyFilterScope === 'compartidas' ? styles.scopeCountBadgeActive : styles.scopeCountBadgeInactive}>
                      {propertiesCountShared}
                    </span>
                  </button>
                </div>

                <div style={styles.tabFilterBar}>
                  {/* Búsqueda */}
                  <div style={styles.tabSearchBar}>
                    <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <input 
                      type="text"
                      placeholder="Buscar por nombre o dirección..."
                      value={tabSearchQuery}
                      onChange={(e) => {
                        setTabSearchQuery(e.target.value);
                        setTabVisibleCount(TAB_INITIAL_VISIBLE);
                      }}
                      style={styles.tabSearchInput}
                    />
                    {tabSearchQuery && (
                      <button 
                        type="button" 
                        style={styles.searchClearBtn}
                        onClick={() => {
                          setTabSearchQuery('');
                          setTabVisibleCount(TAB_INITIAL_VISIBLE);
                        }}
                        aria-label="Limpiar búsqueda"
                      >
                        <X size={13} color="#64748b" />
                      </button>
                    )}
                  </div>

                  {/* Ordenamiento (Sort: solo más recientes, A-Z y Z-A) */}
                  <div style={styles.tabSortSelectWrapper}>
                    <ArrowUpDown size={14} color="#64748b" style={{ flexShrink: 0 }} />
                    <select 
                      value={tabSortBy}
                      onChange={(e) => {
                        setTabSortBy(e.target.value);
                        setTabVisibleCount(TAB_INITIAL_VISIBLE);
                      }}
                      style={styles.tabSortSelect}
                      aria-label="Ordenar propiedades"
                    >
                      <option value="recientes">Más recientes</option>
                      <option value="nombre-asc">Nombre (A - Z)</option>
                      <option value="nombre-desc">Nombre (Z - A)</option>
                    </select>
                  </div>
                </div>

                {/* Metadatos: Conteo y Progreso de visualización */}
                <div style={styles.tabListMetaRow}>
                  <span style={styles.tabListCountText}>
                    {tabSortedProperties.length} {tabSortedProperties.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
                    {tabSearchQuery && ` para "${tabSearchQuery}"`}
                  </span>
                  {tabSortedProperties.length > 0 && (
                    <span style={styles.tabListPageBadge}>
                      {tabPaginatedProperties.length < tabSortedProperties.length
                        ? `Mostrando ${tabPaginatedProperties.length} de ${tabSortedProperties.length}`
                        : `Total: ${tabSortedProperties.length}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Listado de propiedades renderizadas por lotes optimizados */}
              {tabPaginatedProperties.length > 0 ? (
                <div className="app-tab-content-list" style={styles.tabContentList}>
                  {tabPaginatedProperties.map((item) => (
                    <PropertyCardItem 
                      key={item.id}
                      item={item}
                      onOpen={handleOpenPropertyDetail}
                      placeholder={placeholderHorizontal}
                      styles={styles}
                    />
                  ))}
                </div>
              ) : propertyFilterScope === 'compartidas' && !tabSearchQuery ? (
                <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                  <div style={styles.emptySharedCard}>
                    <div style={styles.emptySharedIconCircle}>
                      <Users size={28} color="#4f46e5" />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '8px 0 4px' }}>
                      No tienes propiedades compartidas
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, maxWidth: '280px', lineHeight: 1.4 }}>
                      Cuando tus colegas de la inmobiliaria compartan propiedades contigo, aparecerán en esta sección.
                    </p>
                    <button 
                      type="button" 
                      style={styles.clearSearchFilterBtn}
                      onClick={() => {
                        setPropertyFilterScope('propias');
                        setTabVisibleCount(TAB_INITIAL_VISIBLE);
                      }}
                    >
                      Ver mis propiedades
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0 20px' }}>
                  <div style={styles.noResultsBox}>
                    <p style={styles.noResultsText}>
                      No se encontraron propiedades{tabSearchQuery ? ` para "${tabSearchQuery}"` : ''}
                    </p>
                    <button 
                      type="button" 
                      style={styles.clearSearchFilterBtn}
                      onClick={() => {
                        setTabSearchQuery('');
                        setPropertyFilterScope('todas');
                        setTabVisibleCount(TAB_INITIAL_VISIBLE);
                      }}
                    >
                      {tabSearchQuery ? 'Limpiar búsqueda' : 'Ver todas las propiedades'}
                    </button>
                  </div>
                </div>
              )}

              {/* Controles de Carga Progresiva / Infinite Scroll */}
              {tabSortedProperties.length > 0 && (
                <div style={styles.progressiveLoadContainer}>
                  {hasMoreTabProperties ? (
                    <>
                      {/* Centinela invisible para IntersectionObserver */}
                      <div ref={tabSentinelRef} style={styles.infiniteSentinel} />

                      {/* Botón interactivo de carga asistida instantánea */}
                      <button 
                        type="button"
                        style={styles.loadMorePillBtn}
                        onClick={handleLoadMoreTabProperties}
                      >
                        <span>Cargar más ({tabSortedProperties.length - tabPaginatedProperties.length} restantes)</span>
                        <ChevronDown size={16} color="#4f46e5" />
                      </button>

                      {/* Mini barra de progreso visual */}
                      <div style={styles.progressTrackerWrapper}>
                        <div 
                          style={{
                            ...styles.progressTrackerFill,
                            width: `${Math.min(100, Math.round((tabPaginatedProperties.length / tabSortedProperties.length) * 100))}%`
                          }} 
                        />
                      </div>
                    </>
                  ) : (
                    tabSortedProperties.length > TAB_INITIAL_VISIBLE && (
                      <div style={styles.tabAllLoadedBanner}>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span>Has visto todas las propiedades ({tabSortedProperties.length})</span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Botón flotante para volver arriba (aislado sin re-renders) */}
              <FloatingBackToTop styles={styles} />
            </>
          ) : (
            <div style={styles.emptyContainer}>
              <div style={styles.dashedCard} onClick={() => setIsModalOpen(true)}>
                <div style={styles.dashedIconCircle}>
                  <Plus size={22} color="#4f46e5" strokeWidth={2.5} />
                </div>
                <h3 style={styles.dashedTitle}>Sin propiedades</h3>
                <p style={styles.dashedSubtitle}>Creá tu primera propiedad para empezar</p>
                <div style={styles.dashedBadge}>
                  <span>+ Crear propiedad</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ height: '90px' }} />
        </main>
      )}

      {/* ============ VISTA DASHBOARD INMOBILIARIA (OWNER) ============ */}
      {activeTab === 'dashboard' && (
        <OwnerDashboard
          agency={agency}
          onUpdateAgency={handleUpdateAgency}
          plan={plan}
          onUpdatePlan={handleUpdatePlan}
          agents={agents}
          onAddAgent={handleAddAgent}
          onRemoveAgent={handleRemoveAgent}
          onResendInvite={handleResendInvite}
          userRole={userRole}
        />
      )}

      {/* ============ VISTA 3: DETALLE DE PROPIEDAD ============ */}
      {activeTab === 'property-detail' && selectedPropertyDetail && (() => {
        const propertyInventory = selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail);
        const detailRooms = selectedPropertyDetail.rooms || [];
        const totalItemsCount = Object.values(propertyInventory).reduce((acc, items) => {
          return acc + (items || []).reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 1), 0);
        }, 0);
        
        const detailPhotos = selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail);

        // Helper para renderizar el Visor de Fotos Profesional (Estilo Apple Photos / Airbnb)
        const renderPhotoViewer = (photosContext = []) => {
          if (!selectedPhotoModal) return null;

          const activeRoom = selectedPhotoRoomDetail || selectedPhotoModal.room || '';
          const ambientPhotos = photosContext.filter(p => 
            (p.room || '').trim().toLowerCase() === activeRoom.trim().toLowerCase()
          );
          const photosList = ambientPhotos.length > 0 ? ambientPhotos : (photosContext.length > 0 ? photosContext : [selectedPhotoModal]);
          const currentIndex = photosList.findIndex(p => p.id === selectedPhotoModal.id || (p.url && p.url === selectedPhotoModal.url));
          const safeIndex = currentIndex >= 0 ? currentIndex : 0;
          const currentPhoto = photosList[safeIndex] || selectedPhotoModal;
          const totalCount = photosList.length;

          const handlePrev = (e) => {
            e?.stopPropagation();
            const prevIdx = safeIndex > 0 ? safeIndex - 1 : totalCount - 1;
            setSelectedPhotoModal(photosList[prevIdx]);
          };

          const handleNext = (e) => {
            e?.stopPropagation();
            const nextIdx = safeIndex < totalCount - 1 ? safeIndex + 1 : 0;
            setSelectedPhotoModal(photosList[nextIdx]);
          };

          return (
            <div 
              className="app-pro-lightbox"
              onClick={() => setSelectedPhotoModal(null)}
            >
              {/* Barra superior estilo Apple Photos / Airbnb */}
              <div 
                className="app-pro-lightbox-topbar"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón Volver / Cerrar a la izquierda */}
                <button 
                  type="button" 
                  className="app-pro-lightbox-btn"
                  onClick={() => setSelectedPhotoModal(null)}
                  title="Cerrar visor"
                  aria-label="Cerrar visor"
                >
                  <ArrowLeft size={20} color="#ffffff" strokeWidth={2.2} />
                </button>

                {/* Título y Contador centrado */}
                <div className="app-pro-lightbox-title">
                  <span className="app-pro-lightbox-room">
                    {currentPhoto.room || 'Ambiente'}
                  </span>
                  {totalCount > 1 && (
                    <span className="app-pro-lightbox-counter">
                      {safeIndex + 1} de {totalCount}
                    </span>
                  )}
                </div>

                {/* Acciones a la derecha */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Botón para eliminar esta foto individual (usa modal propio de la app, sin alertas de navegador) */}
                  <button
                    type="button"
                    className="app-pro-lightbox-btn"
                    title="Eliminar foto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBulkPhotoIds([currentPhoto.id]);
                      setSelectedPhotoModal(null);
                      setIsDeletingPhotosModal(true);
                    }}
                  >
                    <Trash2 size={18} color="#f87171" strokeWidth={2.2} />
                  </button>

                  <a 
                    href={currentPhoto.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="app-pro-lightbox-btn"
                    title="Ver imagen original en alta resolución"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={18} color="#ffffff" strokeWidth={2} />
                  </a>
                </div>
              </div>

              {/* Viewport Principal de la Foto */}
              <div 
                className="app-pro-lightbox-viewport"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => {
                  if (e.touches && e.touches.length > 0) {
                    window.__photoTouchStartX = e.touches[0].clientX;
                    window.__photoTouchStartY = e.touches[0].clientY;
                  }
                }}
                onTouchEnd={(e) => {
                  if (typeof window.__photoTouchStartX === 'number' && e.changedTouches && e.changedTouches.length > 0) {
                    const diffX = e.changedTouches[0].clientX - window.__photoTouchStartX;
                    const diffY = e.changedTouches[0].clientY - (window.__photoTouchStartY || 0);
                    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
                      if (diffX > 0) {
                        handlePrev();
                      } else {
                        handleNext();
                      }
                    }
                  }
                  window.__photoTouchStartX = null;
                  window.__photoTouchStartY = null;
                }}
              >
                {/* En desktop: Flecha izquierda en el borde de la pantalla */}
                {totalCount > 1 && (
                  <button 
                    type="button"
                    className="app-pro-desktop-arrow"
                    style={{ left: '24px' }}
                    onClick={handlePrev}
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft size={28} strokeWidth={2.4} />
                  </button>
                )}

                {/* Foto pura a pantalla completa, sin recortes ni marcos raros */}
                <img 
                  key={currentPhoto.id || currentPhoto.url}
                  src={currentPhoto.url} 
                  alt={currentPhoto.title || currentPhoto.room}
                  className="app-pro-lightbox-img"
                  style={{
                    maxHeight: totalCount > 1 ? 'calc(100vh - 160px)' : 'calc(100vh - 80px)',
                  }}
                />

                {/* En desktop: Flecha derecha en el borde de la pantalla */}
                {totalCount > 1 && (
                  <button 
                    type="button"
                    className="app-pro-desktop-arrow"
                    style={{ right: '24px' }}
                    onClick={handleNext}
                    aria-label="Siguiente foto"
                  >
                    <ChevronRight size={28} strokeWidth={2.4} />
                  </button>
                )}
              </div>

              {/* Tira inferior de miniaturas (Filmstrip Apple) */}
              {totalCount > 1 && (
                <div 
                  className="app-pro-lightbox-filmstrip"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div 
                    className="no-scrollbar"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflowX: 'auto',
                      maxWidth: '100%',
                      padding: '4px 10px',
                    }}
                  >
                    {photosList.map((p, idx) => {
                      const isSelected = p.id === currentPhoto.id || (p.url && p.url === currentPhoto.url);
                      return (
                        <div 
                          key={p.id || idx}
                          className={`app-pro-thumb ${isSelected ? 'active' : ''}`}
                          onClick={() => setSelectedPhotoModal(p)}
                        >
                          <img 
                            src={p.url} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        };

        // Helper para renderizar el modal de Subir Fotos
        const renderAddPhotosModal = () => {
          if (!isAddingPhotosModal) return null;
          return (
            <BottomSheet
              isOpen={isAddingPhotosModal}
              onClose={() => setIsAddingPhotosModal(false)}
              title="Subir fotos"
              subtitle={selectedPropertyDetail?.name}
              size="full"
            >
                  <div style={styles.uploadPhotosFormWrap}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Asignar a ambiente</label>
                      <div style={styles.selectInputWrapper}>
                        <select 
                          style={styles.customSelectInput}
                          value={newPhotoRoom}
                          onChange={(e) => setNewPhotoRoom(e.target.value)}
                        >
                          {(selectedPropertyDetail?.rooms || []).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <div style={styles.selectChevronIcon}>
                          <ChevronDown size={18} color="#64748b" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenCamera('property')}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '20px 12px',
                          borderRadius: '16px',
                          border: '2px dashed #c7d2fe',
                          backgroundColor: '#f0f4ff',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Camera size={22} color="#ffffff" strokeWidth={2.2} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Tomar fotos</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Captura múltiple</span>
                      </button>

                      <label style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '20px 12px',
                        borderRadius: '16px',
                        border: '2px dashed #c7d2fe',
                        backgroundColor: '#f8f9ff',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleNewPhotosSelected}
                        />
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Images size={22} color="#ffffff" strokeWidth={2.2} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Galería</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Elegir del carrete</span>
                      </label>
                    </div>

                    {isOptimizingPhotos && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#eef2ff', borderRadius: '12px', color: '#4f46e5', fontSize: '13px', fontWeight: '600' }}>
                        <Loader2 size={16} className="pill-spinner" />
                        <span>Optimizando fotos seleccionadas...</span>
                      </div>
                    )}

                    {selectedNewPhotos.length > 0 && (
                      <div style={styles.pendingPhotosContainer}>
                        <div style={styles.pendingPhotosHeader}>
                          <span style={styles.pendingPhotosCount}>
                            {selectedNewPhotos.length} {selectedNewPhotos.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
                          </span>
                          <span style={styles.pendingPhotosRoomBadge}>
                            Para: {newPhotoRoom || (selectedPropertyDetail?.rooms?.[0] || 'General')}
                          </span>
                        </div>

                        <div style={styles.pendingPhotosGrid}>
                          {selectedNewPhotos.map((p) => (
                            <div key={p.id} style={{ ...styles.pendingPhotoItem, position: 'relative' }}>
                              <img src={p.url} alt="preview" style={styles.pendingPhotoImg} />
                              {p.wasOptimized && (
                                <span style={{
                                  position: 'absolute',
                                  bottom: '4px',
                                  left: '4px',
                                  background: 'rgba(79, 70, 229, 0.92)',
                                  color: '#ffffff',
                                  fontSize: '9px',
                                  fontWeight: '800',
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  lineHeight: 1.2,
                                }} title="Optimizada por ser >= 1MB">
                                  ⚡ &gt;1MB
                                </span>
                              )}
                              {p.formattedSize && (
                                <span style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  background: 'rgba(15, 23, 42, 0.75)',
                                  color: '#ffffff',
                                  fontSize: '9px',
                                  fontWeight: '700',
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  lineHeight: 1.2,
                                }}>
                                  {p.formattedSize}
                                </span>
                              )}
                              <button 
                                type="button" 
                                style={styles.pendingPhotoRemoveBtn}
                                onClick={() => handleRemovePendingPhoto(p.id)}
                                title="Quitar foto"
                              >
                                <X size={12} color="#ffffff" strokeWidth={2.4} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={styles.uploadPhotosActionsRow}>
                      <button 
                        type="button" 
                        style={{
                          ...styles.saveNewPhotosBtn,
                          ...(selectedNewPhotos.length === 0 || isOptimizingPhotos ? styles.saveNewPhotosBtnDisabled : {})
                        }}
                        disabled={selectedNewPhotos.length === 0 || isOptimizingPhotos}
                        onClick={handleSaveNewPhotos}
                      >
                        <Upload size={16} color="#ffffff" strokeWidth={2.4} />
                        <span>Subir {selectedNewPhotos.length > 0 ? `${selectedNewPhotos.length} ` : ''}{selectedNewPhotos.length === 1 ? 'foto' : 'fotos'}</span>
                      </button>
                      <button 
                        type="button" 
                        style={styles.cancelNewPhotosBtn}
                        onClick={() => setIsAddingPhotosModal(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
            </BottomSheet>
          );
        };

        // =========================================================================
        // Al entrar a las fotos de un ambiente: CERO quilombo, CERO foto gigante, CERO plano
        // =========================================================================
        if (selectedPhotoRoomDetail) {
          const roomPhotosList = detailPhotos.filter(p => 
            (p.room || '').trim().toLowerCase() === (selectedPhotoRoomDetail || '').trim().toLowerCase()
          );

          return (
            <>
              <main key={`photo-room-${selectedPropertyDetail?.id}-${selectedPhotoRoomDetail}`} className="app-detail-main" style={styles.detailMain}>
                {/* Barra superior con botón volver a fotos */}
                <div style={styles.roomHeaderBar}>
                  <button 
                    type="button" 
                    style={styles.detailBackBtn} 
                    onClick={() => {
                      setSelectedPhotoRoomDetail(null);
                      setIsManagingPhotos(false);
                      setSelectedBulkPhotoIds([]);
                    }}
                    aria-label="Volver a fotos"
                  >
                    <ArrowLeft size={16} color="#0f172a" strokeWidth={2.4} />
                    <span>Fotos</span>
                  </button>
                  <span style={styles.roomPropertyBreadcrumb}>{selectedPropertyDetail.name}</span>
                </div>

                {/* Cabecera del ambiente para fotos */}
                <div style={styles.roomFocusCard}>
                  <div style={styles.roomFocusTopRow}>
                    <h2 style={styles.roomFocusTitle}>{selectedPhotoRoomDetail}</h2>
                    <span style={styles.roomFocusBadge}>
                      {roomPhotosList.length} {roomPhotosList.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>

                  <div style={styles.roomFocusActions}>
                    <button 
                      type="button" 
                      style={styles.roomDictateBtn}
                      onClick={() => handleOpenAddPhotosModal(selectedPhotoRoomDetail)}
                    >
                      <Camera size={15} color="#ffffff" strokeWidth={2.2} />
                      <span>Subir fotos</span>
                    </button>

                    {roomPhotosList.length > 0 && (
                      <button 
                        type="button" 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px 16px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isManagingPhotos ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                          backgroundColor: isManagingPhotos ? '#eef2ff' : '#ffffff',
                          color: isManagingPhotos ? '#4f46e5' : '#334155',
                        }}
                        onClick={() => {
                          setIsManagingPhotos(!isManagingPhotos);
                          setSelectedBulkPhotoIds([]);
                        }}
                      >
                        <CheckSquare size={15} strokeWidth={2.2} />
                        <span>{isManagingPhotos ? 'Listo' : 'Seleccionar'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de control de selección masiva */}
                {isManagingPhotos && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    marginBottom: '14px',
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                      {selectedBulkPhotoIds.length} {selectedBulkPhotoIds.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
                    </span>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: '#4f46e5',
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                      onClick={() => {
                        if (selectedBulkPhotoIds.length === roomPhotosList.length) {
                          setSelectedBulkPhotoIds([]);
                        } else {
                          setSelectedBulkPhotoIds(roomPhotosList.map(p => p.id));
                        }
                      }}
                    >
                      {selectedBulkPhotoIds.length === roomPhotosList.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </button>
                  </div>
                )}

                {/* Grilla de fotos de este ambiente */}
                {roomPhotosList.length > 0 ? (
                  <div style={{
                    ...styles.detailGalleryGrid,
                    paddingBottom: isManagingPhotos ? '100px' : '20px',
                  }}>
                    {roomPhotosList.map((photo) => {
                      const isSelected = selectedBulkPhotoIds.includes(photo.id);

                      return (
                        <div 
                          key={photo.id} 
                          style={{
                            ...styles.detailGalleryItem,
                            border: isManagingPhotos && isSelected ? '2.5px solid #4f46e5' : '1px solid #e2e8f0',
                            transform: isManagingPhotos && isSelected ? 'scale(0.97)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={() => {
                            if (isManagingPhotos) {
                              setSelectedBulkPhotoIds(prev => 
                                prev.includes(photo.id) 
                                  ? prev.filter(id => id !== photo.id) 
                                  : [...prev, photo.id]
                              );
                            } else {
                              setSelectedPhotoModal(photo);
                            }
                          }}
                        >
                          <img src={photo.url} alt={photo.title} style={styles.detailGalleryImg} />
                          <div style={styles.detailGalleryGradientOverlay} />
                          <span style={styles.detailGalleryTag}>{photo.title}</span>

                          {/* Checkbox en modo selección */}
                          {isManagingPhotos && (
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? '#4f46e5' : 'rgba(15, 23, 42, 0.65)',
                              border: isSelected ? '2px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              backdropFilter: 'blur(4px)',
                              zIndex: 10,
                            }}>
                              {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.photosEmptyContainer}>
                    <div style={styles.photosEmptyIconBox}>
                      <Camera size={24} color="#64748b" strokeWidth={1.8} />
                    </div>
                    <h4 style={styles.photosEmptyTitle}>Sin fotos en {selectedPhotoRoomDetail}</h4>
                    <p style={styles.photosEmptySub}>
                      Cargá la primera foto para documentar este ambiente.
                    </p>
                    <button 
                      type="button" 
                      style={styles.photosEmptyActionBtn}
                      onClick={() => handleOpenAddPhotosModal(selectedPhotoRoomDetail)}
                    >
                      <Camera size={14} color="#ffffff" strokeWidth={2.4} />
                      <span>Subir foto</span>
                    </button>
                  </div>
                )}
              </main>

              {/* Barra flotante de acciones masivas */}
              {isManagingPhotos && !isMovingPhotosModal && !isDeletingPhotosModal && (
                <div className="app-bulk-floating-bar">
                  <div className="app-bulk-floating-capsule">
                    {/* Botón Mover de ambiente */}
                    <button
                      type="button"
                      className="app-bulk-btn-move"
                      disabled={selectedBulkPhotoIds.length === 0}
                      onClick={() => {
                        const otherRooms = (selectedPropertyDetail.rooms || []).filter(
                          r => r.trim().toLowerCase() !== selectedPhotoRoomDetail.trim().toLowerCase()
                        );
                        setTargetMoveRoom(otherRooms[0] || '');
                        setNewCustomMoveRoom('');
                        setIsMovingPhotosModal(true);
                      }}
                    >
                      <ArrowRightLeft size={16} strokeWidth={2.2} />
                      <span>Mover {selectedBulkPhotoIds.length > 0 ? `(${selectedBulkPhotoIds.length})` : ''}</span>
                    </button>

                    {/* Botón Eliminar seleccionadas */}
                    <button
                      type="button"
                      className="app-bulk-btn-delete"
                      disabled={selectedBulkPhotoIds.length === 0}
                      onClick={() => setIsDeletingPhotosModal(true)}
                    >
                      <Trash2 size={16} strokeWidth={2.2} />
                      <span>Eliminar {selectedBulkPhotoIds.length > 0 ? `(${selectedBulkPhotoIds.length})` : ''}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal: Mover fotos a otro ambiente */}
              {isMovingPhotosModal && (() => {
                const existingRooms = selectedPropertyDetail.rooms || [];
                const originRoom = selectedPhotoRoomDetail || (selectedPropertyDetail.photos?.find(p => selectedBulkPhotoIds.includes(p.id))?.room) || '';
                const otherRooms = existingRooms.filter(
                  r => r.trim().toLowerCase() !== originRoom.trim().toLowerCase()
                );

                return (
                  <BottomSheet
                    isOpen={isMovingPhotosModal}
                    onClose={() => setIsMovingPhotosModal(false)}
                    title="Mover fotos"
                    subtitle={`Mover ${selectedBulkPhotoIds.length} ${selectedBulkPhotoIds.length === 1 ? 'foto' : 'fotos'} desde ${originRoom || 'este ambiente'}`}
                    size="auto"
                  >
                        <label style={styles.formLabel}>Seleccionar ambiente de destino</label>
                        <div className="app-room-select-grid">
                          {otherRooms.map(room => (
                            <div
                              key={room}
                              className={`app-room-select-item ${targetMoveRoom === room ? 'selected' : ''}`}
                              onClick={() => {
                                setTargetMoveRoom(room);
                              }}
                            >
                              <span style={{ fontWeight: '600', fontSize: '14px', color: targetMoveRoom === room ? '#4f46e5' : '#0f172a' }}>
                                {room}
                              </span>
                              {targetMoveRoom === room && (
                                <Check size={18} color="#4f46e5" strokeWidth={2.5} />
                              )}
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            style={{
                              ...styles.saveNewPhotosBtn,
                              ...(!targetMoveRoom ? styles.saveNewPhotosBtnDisabled : {})
                            }}
                            disabled={!targetMoveRoom}
                            onClick={handleExecuteBulkMove}
                          >
                            <Check size={16} color="#ffffff" strokeWidth={2.4} />
                            <span>Confirmar</span>
                          </button>
                          <button
                            type="button"
                            style={styles.cancelNewPhotosBtn}
                            onClick={() => setIsMovingPhotosModal(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                  </BottomSheet>
                );
              })()}

              {/* Modal: Confirmación para eliminar fotos en masa */}
              {isDeletingPhotosModal && (
                <BottomSheet
                  isOpen={isDeletingPhotosModal}
                  onClose={() => setIsDeletingPhotosModal(false)}
                  size="auto"
                >
                    <div style={{ textAlign: 'center', padding: '16px 10px' }}>
                      <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px auto',
                      }}>
                        <Trash2 size={24} strokeWidth={2.2} />
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                        ¿Eliminar {selectedBulkPhotoIds.length} {selectedBulkPhotoIds.length === 1 ? 'foto' : 'fotos'}?
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                        Se {selectedBulkPhotoIds.length === 1 ? 'eliminará' : 'eliminarán'} permanentemente{selectedPhotoRoomDetail ? ` de ${selectedPhotoRoomDetail}` : ''}.
                      </p>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            height: '46px',
                            borderRadius: '12px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                          onClick={handleExecuteBulkDelete}
                        >
                          <Trash2 size={16} strokeWidth={2.2} />
                          <span>Sí, eliminar</span>
                        </button>
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            height: '46px',
                            borderRadius: '12px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                          onClick={() => setIsDeletingPhotosModal(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                </BottomSheet>
              )}

              {/* Visor de fotos profesional para este ambiente */}
              {renderPhotoViewer(roomPhotosList)}

              {/* Modal subir fotos */}
              {renderAddPhotosModal()}
            </>
          );
        }

        // =========================================================================
        // Al entrar a un ambiente: CERO quilombo, CERO foto gigante, CERO plano/fotos
        // =========================================================================
        if (selectedRoomDetail) {
          const roomItems = propertyInventory[selectedRoomDetail] || [];
          const roomTotalQty = roomItems.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 1), 0);
          const filteredRoomItems = roomItems.filter(item => {
            const q = roomItemSearchQuery.trim().toLowerCase();
            if (!q) return true;
            return (
              (item.name && item.name.toLowerCase().includes(q)) ||
              (item.description && item.description.toLowerCase().includes(q))
            );
          });

          return (
            <main key={`room-detail-${selectedPropertyDetail?.id}-${selectedRoomDetail}`} className="app-detail-main" style={styles.detailMain}>
              {/* Barra superior con botón volver a ambientes */}
              <div style={styles.roomHeaderBar}>
                <button 
                  type="button" 
                  style={styles.detailBackBtn} 
                  onClick={handleBackFromPropertyDetail}
                  aria-label="Volver a ambientes"
                >
                  <ArrowLeft size={16} color="#0f172a" strokeWidth={2.4} />
                  <span>Ambientes</span>
                </button>
                <span style={styles.roomPropertyBreadcrumb}>{selectedPropertyDetail.name}</span>
              </div>

              {/* Cabecera del ambiente con título, contador y botón único de acción */}
              <div style={styles.roomFocusCard}>
                <div style={styles.roomFocusTopRow}>
                  <h2 style={styles.roomFocusTitle}>{selectedRoomDetail}</h2>
                  <span style={styles.roomFocusBadge}>
                    {roomTotalQty} {roomTotalQty === 1 ? 'ítem' : 'ítems'}
                  </span>
                </div>

                <div style={styles.roomFocusActions}>
                  <button 
                    type="button" 
                    style={styles.roomSingleAddItemBtn}
                    onClick={handleOpenAddItemModal}
                  >
                    <Plus size={16} color="#ffffff" strokeWidth={2.6} />
                    <span>Nuevo ítem</span>
                  </button>
                </div>
              </div>

              {/* Barra de Búsqueda de ítems dentro del ambiente */}
              {roomItems.length > 0 && (
                <div style={styles.roomSearchBarWrapper}>
                  <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                  <input 
                    type="text"
                    placeholder={`Buscar ítems en ${selectedRoomDetail}...`}
                    value={roomItemSearchQuery}
                    onChange={(e) => setRoomItemSearchQuery(e.target.value)}
                    style={styles.roomSearchBarInput}
                  />
                  {roomItemSearchQuery && (
                    <button 
                      type="button" 
                      style={styles.roomSearchClearBtn}
                      onClick={() => setRoomItemSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                    >
                      <X size={14} color="#64748b" />
                    </button>
                  )}
                </div>
              )}

              {/* Listado de ítems dentro de este ambiente */}
              {isLoadingPropertyDetail ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                  {[1, 2, 3].map((idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '16px',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="app-skeleton-shimmer" style={{ width: '45%', height: '16px', borderRadius: '4px' }} />
                        <div className="app-skeleton-shimmer" style={{ width: '32px', height: '20px', borderRadius: '10px' }} />
                      </div>
                      <div className="app-skeleton-shimmer" style={{ width: '75%', height: '12px', borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>
              ) : roomItems.length > 0 ? (
                filteredRoomItems.length > 0 ? (
                  <div style={styles.detailItemsList}>
                    {filteredRoomItems.map((item) => (
                      <div key={item.id} style={styles.detailItemRow}>
                        {/* Fila superior: Título del ítem + Badge multiplicador + Acciones */}
                        <div style={styles.detailItemTopRow}>
                          <div style={styles.detailItemHeaderLeft}>
                            <h4 style={styles.detailItemNameText}>{capitalizeFirst(item.name)}</h4>
                            <span style={styles.detailItemQtyChip}>
                              x{item.quantity || 1}
                            </span>
                            {item.status && (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                backgroundColor: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#ecfdf5' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fef2f2' : '#f8fafc',
                                color: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#059669' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#dc2626' : '#64748b',
                                border: `1px solid ${item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#a7f3d0' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fecaca' : '#e2e8f0'}`,
                                whiteSpace: 'nowrap'
                              }}>
                                {item.status}
                              </span>
                            )}
                          </div>

                          {/* Botones de acción */}
                          <div style={styles.detailItemActions}>
                            <button 
                              type="button" 
                              style={styles.detailItemEditBtn}
                              onClick={() => handleStartDetailEdit(item)}
                              aria-label={`Editar ${item.name}`}
                              title="Editar ítem"
                            >
                              <Pencil size={13} color="#475569" />
                            </button>
                            <button 
                              type="button" 
                              style={styles.detailItemDeleteBtn}
                              onClick={() => handleDeleteDetailItem(selectedRoomDetail, item.id)}
                              aria-label={`Eliminar ${item.name}`}
                              title="Eliminar ítem"
                            >
                              <Trash2 size={13} color="#94a3b8" />
                            </button>
                          </div>
                        </div>

                        {/* Estado / Observación técnica en contenedor sutil */}
                        {item.description && (
                          <div style={styles.detailItemDescBox}>
                            <p style={styles.detailItemDescText}>
                              {capitalizeFirst(item.description)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.roomNoResultsBox}>
                    <p style={styles.roomNoResultsText}>
                      No se encontraron ítems para "{roomItemSearchQuery}"
                    </p>
                    <button 
                      type="button" 
                      style={styles.roomClearFilterBtn}
                      onClick={() => setRoomItemSearchQuery('')}
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                )
              ) : (
                <div style={styles.detailEmptyRoomCard}>
                  <div style={styles.detailEmptyIconCircle}>
                    <Plus size={22} color="#4f46e5" strokeWidth={2.2} />
                  </div>
                  <h4 style={styles.detailEmptyTitle}>Sin ítems relevados</h4>
                  <p style={styles.detailEmptySub}>
                    Dictá por voz, analizá fotos con IA o cargá elementos manualmente
                  </p>
                  <button 
                    type="button" 
                    style={styles.roomSingleAddItemBtn}
                    onClick={handleOpenAddItemModal}
                  >
                    <Plus size={16} color="#ffffff" strokeWidth={2.6} />
                    <span>Nuevo ítem</span>
                  </button>
                </div>
              )}

              {/* ============ MODAL: EDITAR ÍTEM (ESTILO CONSISTENTE CON LOS DEMÁS MODALES) ============ */}
              {detailEditingItemId !== null && (
                <BottomSheet
                  isOpen={detailEditingItemId !== null}
                  onClose={() => setDetailEditingItemId(null)}
                  title="Editar ítem"
                  subtitle="Modificá los datos del elemento relevado"
                  size="medium"
                >
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveDetailEdit(selectedRoomDetail);
                        }} 
                        style={styles.modalForm}
                      >
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Nombre del ítem *</label>
                          <input 
                            type="text"
                            value={detailEditForm.name}
                            onChange={(e) => setDetailEditForm({ ...detailEditForm, name: e.target.value })}
                            style={styles.formInput}
                            placeholder="Nombre del ítem"
                            autoFocus
                            required
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Cantidad *</label>
                          <input 
                            type="number"
                            min="1"
                            value={detailEditForm.quantity}
                            onChange={(e) => setDetailEditForm({ ...detailEditForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            style={styles.formInput}
                            required
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Descripción u observación técnica</label>
                          <textarea 
                            value={detailEditForm.description}
                            onChange={(e) => setDetailEditForm({ ...detailEditForm, description: e.target.value })}
                            style={{
                              ...styles.formInput,
                              minHeight: '85px',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                            placeholder="Observaciones de estado, fallas o detalles técnicos"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Estado de conservación (opcional)</label>
                          <select
                            value={detailEditForm.status || ''}
                            onChange={(e) => setDetailEditForm({ ...detailEditForm, status: e.target.value })}
                            style={styles.formInput}
                          >
                            <option value="">Sin especificar</option>
                            <option value="Óptimo">Óptimo</option>
                            <option value="Muy Bueno">Muy Bueno</option>
                            <option value="Bueno">Bueno</option>
                            <option value="Regular">Regular</option>
                            <option value="Con detalles">Con detalles</option>
                            <option value="Malo">Malo</option>
                            <option value="Con humedad">Con humedad</option>
                          </select>
                        </div>

                        <button 
                          type="submit" 
                          style={styles.submitPropertyBtn}
                          disabled={!detailEditForm.name.trim()}
                        >
                          <span>Guardar cambios</span>
                          <Check size={16} color="#ffffff" strokeWidth={2.4} />
                        </button>
                      </form>
                </BottomSheet>
              )}

              {/* ============ MODAL UNIFICADO: NUEVO ÍTEM (VOZ, FOTOS IA, MANUAL) ============ */}
              {isAddItemModalOpen && (
                <BottomSheet
                  isOpen={isAddItemModalOpen}
                  onClose={() => setIsAddItemModalOpen(false)}
                  title={
                    itemAddMethod === 'select' ? 'Nuevo ítem' :
                    itemAddMethod === 'voice' ? 'Dictar ítems por voz' :
                    itemAddMethod === 'photo' ? 'Analizar fotos con IA' :
                    'Carga manual de ítem'
                  }
                  subtitle={
                    itemAddMethod === 'select' ? `Elegí cómo relevar elementos en ${selectedRoomDetail}` :
                    itemAddMethod === 'voice' ? `${selectedRoomDetail} • Reconocimiento y desglose IA` :
                    itemAddMethod === 'photo' ? `${selectedRoomDetail} • Detección visual inteligente` :
                    `${selectedRoomDetail} • Carga detallada por teclado`
                  }
                  size="full"
                  showBackButton={itemAddMethod !== 'select'}
                  onBack={() => setItemAddMethod('select')}
                >
                    <div 
                      style={{
                        ...(itemAddMethod === 'photo' && photoItemPhase === 'upload' ? { overflow: 'hidden', paddingBottom: 0 } : {})
                      }}
                    >
                      {/* ---- PASO 1: SELECTOR DE MÉTODO (3 OPCIONES) ---- */}
                      {itemAddMethod === 'select' && (
                        <div style={styles.methodChoicesCol}>
                          {/* Opción 1: Dictado por voz */}
                          <div 
                            style={styles.methodChoiceCard}
                            onClick={() => {
                              setItemAddMethod('voice');
                              setVoiceItemPhase('idle');
                            }}
                          >
                            <div style={styles.methodIconCircleVoice}>
                              <Mic size={22} color="#4f46e5" strokeWidth={2.4} />
                            </div>
                            <div style={styles.methodCardInfo}>
                              <h4 style={styles.methodCardTitle}>Dictar por voz</h4>
                              <p style={styles.methodCardSub}>
                                Hablá describiendo aberturas, muebles y estado del ambiente para que la IA los desglose.
                              </p>
                            </div>
                            <ChevronRight size={18} color="#94a3b8" />
                          </div>

                          {/* Opción 2: Analizar fotos con IA */}
                          <div 
                            style={styles.methodChoiceCard}
                            onClick={() => {
                              setItemAddMethod('photo');
                              setPhotoItemPhase('upload');
                              setPhotoItemFiles([]);
                            }}
                          >
                            <div style={styles.methodIconCirclePhoto}>
                              <Camera size={22} color="#0284c7" strokeWidth={2.2} />
                            </div>
                            <div style={styles.methodCardInfo}>
                              <h4 style={styles.methodCardTitle}>Analizar fotos con IA</h4>
                              <p style={styles.methodCardSub}>
                                Subí o tomá fotos del ambiente y la IA identificará automáticamente los elementos y su estado.
                              </p>
                            </div>
                            <ChevronRight size={18} color="#94a3b8" />
                          </div>

                          {/* Opción 3: Carga manual */}
                          <div 
                            style={styles.methodChoiceCard}
                            onClick={() => setItemAddMethod('manual')}
                          >
                            <div style={styles.methodIconCircleManual}>
                              <Pencil size={20} color="#0f172a" strokeWidth={2.2} />
                            </div>
                            <div style={styles.methodCardInfo}>
                              <h4 style={styles.methodCardTitle}>Carga manual</h4>
                              <p style={styles.methodCardSub}>
                                Escribí el nombre del ítem, cantidad y observaciones técnicas directamente con el teclado.
                              </p>
                            </div>
                            <ChevronRight size={18} color="#94a3b8" />
                          </div>
                        </div>
                      )}

                      {/* ---- PASO 2A: FLUJO DE DICTADO POR VOZ ---- */}
                      {itemAddMethod === 'voice' && (
                        <div style={styles.voiceFlowWrapper}>
                          {/* FASE 1: IDLE */}
                          {voiceItemPhase === 'idle' && (
                            <div style={styles.readyRecordBox}>
                              <button 
                                type="button" 
                                style={styles.micRecordButton}
                                onClick={handleStartItemVoiceRecording}
                              >
                                <Mic size={36} color="#ffffff" strokeWidth={2.4} />
                              </button>
                              <h4 style={styles.recordActionTitle}>Tocar para dictar ítems</h4>
                              <p style={styles.recordActionHint}>
                                Nombrá elementos, terminaciones y detalles de {selectedRoomDetail} (ej: "Mesada de granito, grifería monocomando en excelente estado y mueble bajo mesada").
                              </p>
                            </div>
                          )}

                          {/* FASE 2: RECORDING */}
                          {voiceItemPhase === 'recording' && (
                            <div style={styles.recordingActiveBox}>
                              <div style={styles.recordingTimerRow}>
                                <span style={{
                                  ...styles.liveRecordDot,
                                  backgroundColor: voiceItemTime >= 50 ? '#f59e0b' : '#ef4444'
                                }} />
                                <span style={{
                                  ...styles.recordingTimerText,
                                  color: voiceItemTime >= 50 ? '#ea580c' : '#0f172a'
                                }}>
                                  {Math.floor(voiceItemTime / 60).toString().padStart(2, '0')}:{(voiceItemTime % 60).toString().padStart(2, '0')}
                                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginLeft: '6px' }}>/ 01:00</span>
                                </span>
                              </div>

                              <div style={styles.soundWaveRow}>
                                <span style={{ ...styles.waveBar, height: '24px', animationDelay: '0s' }} />
                                <span style={{ ...styles.waveBar, height: '40px', animationDelay: '0.15s' }} />
                                <span style={{ ...styles.waveBar, height: '18px', animationDelay: '0.3s' }} />
                                <span style={{ ...styles.waveBar, height: '36px', animationDelay: '0.1s' }} />
                                <span style={{ ...styles.waveBar, height: '28px', animationDelay: '0.25s' }} />
                              </div>

                              <p style={styles.transcriptionPreview}>
                                {voiceItemTime >= 50
                                  ? '⚠️ Quedan pocos segundos. Se procesará automáticamente al minuto.'
                                  : `Escuchando: relevando ítems para ${selectedRoomDetail || 'el ambiente'}...`}
                              </p>

                              <button 
                                type="button" 
                                style={styles.stopRecordSleekBtn}
                                onClick={handleStopItemVoiceRecording}
                              >
                                <div style={styles.stopSquareIndicator} />
                                <span>Finalizar dictado</span>
                              </button>
                            </div>
                          )}

                          {/* FASE 3: PROCESSING */}
                          {voiceItemPhase === 'processing' && (
                            <div style={styles.aiProcessingBox}>
                              <div style={styles.aiProcessingIconWrap}>
                                <Loader2 size={26} color="#0f172a" style={{ animation: 'spin 1s linear infinite' }} />
                              </div>
                              <h4 style={styles.aiProcessingTitle}>Procesando ítems...</h4>
                              <p style={styles.aiProcessingSub}>Extrayendo elementos de relevamiento para {selectedRoomDetail}</p>
                            </div>
                          )}

                          {/* FASE 4: REVIEW */}
                          {voiceItemPhase === 'review' && (
                            <div style={styles.reviewContentBlock}>
                              <div style={styles.transcriptCard}>
                                <span style={styles.transcriptLabel}>Audio reconocido:</span>
                                <p style={styles.transcriptQuote}>"{voiceItemTranscript}"</p>
                              </div>

                              <div style={styles.extractedItemsGroup}>
                                <span style={styles.extractedGroupLabel}>
                                  Ítems detectados ({voiceDetectedItems.filter(i => i.checked).length} de {voiceDetectedItems.length}):
                                </span>

                                <div style={styles.detectedItemsListWrap}>
                                  {voiceDetectedItems.map((item) => (
                                    <div 
                                      key={item.id}
                                      style={{
                                        ...styles.detectedReviewItemCard,
                                        ...(item.checked ? styles.detectedReviewItemCardChecked : styles.detectedReviewItemCardUnchecked)
                                      }}
                                      onClick={() => handleToggleVoiceItem(item.id)}
                                    >
                                      {/* Fila superior: Checkbox + Nombre + Cantidad + Botón Editar */}
                                      <div style={styles.detectedReviewItemTopRow}>
                                        <div style={styles.detectedReviewItemHeaderLeft}>
                                          <div style={{
                                            ...styles.detectedRoomCheckbox,
                                            ...(item.checked ? styles.detectedRoomCheckboxChecked : {})
                                          }}>
                                            {item.checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                                          </div>
                                          <div style={styles.detectedReviewTitleGroup}>
                                            <h4 style={{
                                              ...styles.detailItemNameText,
                                              color: item.checked ? '#0f172a' : '#94a3b8'
                                            }}>
                                              {capitalizeFirst(item.name)}
                                            </h4>
                                            <span style={{
                                              ...styles.detailItemQtyChip,
                                              backgroundColor: item.checked ? '#0f172a' : '#94a3b8'
                                            }}>
                                              x{item.quantity || 1}
                                            </span>
                                            {item.status && (
                                              <span style={{
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                padding: '2px 8px',
                                                borderRadius: '8px',
                                                backgroundColor: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#ecfdf5' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fef2f2' : '#f8fafc',
                                                color: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#059669' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#dc2626' : '#64748b',
                                                border: `1px solid ${item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#a7f3d0' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fecaca' : '#e2e8f0'}`,
                                                whiteSpace: 'nowrap'
                                              }}>
                                                {item.status}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <button 
                                          type="button" 
                                          style={styles.detailItemEditBtn}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenReviewEditModal(item, 'voice');
                                          }}
                                          title="Editar ítem"
                                          aria-label={`Editar ${item.name}`}
                                        >
                                          <Pencil size={14} color="#475569" />
                                        </button>
                                      </div>

                                      {/* Contenedor sutil para descripción */}
                                      {item.description && (
                                        <div style={styles.detailItemDescBox}>
                                          <p style={{
                                            ...styles.detailItemDescText,
                                            color: item.checked ? '#475569' : '#94a3b8'
                                          }}>
                                            {capitalizeFirst(item.description)}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div style={styles.reviewActionsCol}>
                                <button 
                                  type="button" 
                                  style={{
                                    ...styles.confirmItemsBtn,
                                    opacity: isConfirmingRoomVoiceItems ? 0.75 : 1,
                                    cursor: isConfirmingRoomVoiceItems ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={handleConfirmRoomVoiceItems}
                                  disabled={isConfirmingRoomVoiceItems || voiceDetectedItems.filter(i => i.checked).length === 0}
                                >
                                  {isConfirmingRoomVoiceItems ? (
                                    <>
                                      <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                                      <span>Guardando ítems...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check size={16} color="#ffffff" strokeWidth={2.4} />
                                      <span>Confirmar e incorporar {voiceDetectedItems.filter(i => i.checked).length} ítems</span>
                                    </>
                                  )}
                                </button>

                                <button 
                                  type="button" 
                                  style={styles.reRecordBtn}
                                  onClick={() => {
                                    setVoiceItemPhase('idle');
                                    setVoiceItemTime(0);
                                  }}
                                >
                                  <span>Volver a grabar</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ---- PASO 2B: FLUJO DE ANÁLISIS DE FOTOS CON IA ---- */}
                      {itemAddMethod === 'photo' && (
                        <div style={{
                          ...styles.voiceFlowWrapper,
                          ...(photoItemPhase === 'upload' ? styles.photoUploadFlowWrapper : {})
                        }}>
                          {/* FASE 1: UPLOAD / SELECCIÓN DE FOTOS */}
                          {photoItemPhase === 'upload' && (() => {
                            const existingPropPhotos = selectedPropertyDetail 
                              ? (selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail) || []) 
                              : [];

                            const roomPhotos = existingPropPhotos.filter(p => p.room === selectedRoomDetail);
                            const unassignedPhotos = existingPropPhotos.filter(p => !p.room || p.room === 'Sin asignar' || p.room === 'General' || p.room === 'Portada');
                            const otherPhotos = existingPropPhotos.filter(p => p.room && p.room !== selectedRoomDetail && p.room !== 'Sin asignar' && p.room !== 'General' && p.room !== 'Portada');

                            const filteredExistingPhotos = existingPropPhotos.filter(photo => {
                              if (photoSourceFilter === 'room') return photo.room === selectedRoomDetail;
                              if (photoSourceFilter === 'unassigned') return !photo.room || photo.room === 'Sin asignar' || photo.room === 'General' || photo.room === 'Portada';
                              if (photoSourceFilter === 'other') return photo.room && photo.room !== selectedRoomDetail && photo.room !== 'Sin asignar' && photo.room !== 'General' && photo.room !== 'Portada';
                              return true;
                            });

                            return (
                              <div style={styles.photoUploadColFixed}>
                                {/* Parte superior scrolleable con capturas y fotos de la propiedad */}
                                <div style={styles.photoUploadScrollArea} className="no-scrollbar">
                                  {/* Inputs ocultos para Cámara directa y Galería */}
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment" 
                                    id="camera-direct-upload-input" 
                                    style={{ display: 'none' }} 
                                    onChange={handleSelectPhotoItemFiles}
                                  />
                                  <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    id="gallery-direct-upload-input" 
                                    style={{ display: 'none' }} 
                                    onChange={handleSelectPhotoItemFiles}
                                  />

                                  {/* 1. Tarjetas de captura rápida (Tomar foto / Elegir de galería) */}
                                  <div style={styles.photoCaptureOptionsGrid}>
                                    <button type="button" onClick={handleOpenCamera} style={{...styles.photoCaptureCard, border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left'}}>
                                      <div style={styles.photoCaptureIconWrapCamera}>
                                        <Camera size={22} color="#0284c7" strokeWidth={2.2} />
                                      </div>
                                      <div style={styles.photoCaptureCardMeta}>
                                        <span style={styles.photoCaptureCardTitle}>Tomar fotos</span>
                                        <span style={styles.photoCaptureCardSub}>Captura múltiple</span>
                                      </div>
                                    </button>

                                    <label htmlFor="gallery-direct-upload-input" style={styles.photoCaptureCard}>
                                      <div style={styles.photoCaptureIconWrapGallery}>
                                        <Images size={22} color="#4f46e5" strokeWidth={2.2} />
                                      </div>
                                      <div style={styles.photoCaptureCardMeta}>
                                        <span style={styles.photoCaptureCardTitle}>Elegir de galería</span>
                                        <span style={styles.photoCaptureCardSub}>Selección múltiple</span>
                                        </div>
                                      </label>
                                  </div>

                                  {/* 2. Sección: Fotos ya subidas en la propiedad */}
                                  <div style={styles.existingPhotosSection}>
                                    <div style={styles.existingPhotosHeaderRow}>
                                      <div>
                                        <h4 style={styles.existingPhotosTitle}>Fotos de la propiedad</h4>
                                        <p style={styles.existingPhotosSub}>
                                          Tocá las fotos para analizarlas ({selectedRoomDetail})
                                        </p>
                                      </div>
                                      <span style={styles.existingPhotosCountBadge}>
                                        {existingPropPhotos.length} fotos
                                      </span>
                                    </div>

                                    {/* Filtros por ambiente */}
                                    {existingPropPhotos.length > 0 && (
                                      <div style={styles.photoFilterChipsScroll} className="no-scrollbar">
                                        <button
                                          type="button"
                                          style={{
                                            ...styles.photoFilterChip,
                                            ...(photoSourceFilter === 'all' ? styles.photoFilterChipActive : styles.photoFilterChipInactive)
                                          }}
                                          onClick={() => setPhotoSourceFilter('all')}
                                        >
                                          Todas ({existingPropPhotos.length})
                                        </button>

                                        {roomPhotos.length > 0 && (
                                          <button
                                            type="button"
                                            style={{
                                              ...styles.photoFilterChip,
                                              ...(photoSourceFilter === 'room' ? styles.photoFilterChipActive : styles.photoFilterChipInactive)
                                            }}
                                            onClick={() => setPhotoSourceFilter('room')}
                                          >
                                            {selectedRoomDetail} ({roomPhotos.length})
                                          </button>
                                        )}

                                        {unassignedPhotos.length > 0 && (
                                          <button
                                            type="button"
                                            style={{
                                              ...styles.photoFilterChip,
                                              ...(photoSourceFilter === 'unassigned' ? styles.photoFilterChipActive : styles.photoFilterChipInactive)
                                            }}
                                            onClick={() => setPhotoSourceFilter('unassigned')}
                                          >
                                            Sin ambiente ({unassignedPhotos.length})
                                          </button>
                                        )}

                                        {otherPhotos.length > 0 && (
                                          <button
                                            type="button"
                                            style={{
                                              ...styles.photoFilterChip,
                                              ...(photoSourceFilter === 'other' ? styles.photoFilterChipActive : styles.photoFilterChipInactive)
                                            }}
                                            onClick={() => setPhotoSourceFilter('other')}
                                          >
                                            Otros ambientes ({otherPhotos.length})
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Grid de fotos existentes */}
                                    {filteredExistingPhotos.length > 0 ? (
                                      <div style={styles.existingPhotosGrid}>
                                        {filteredExistingPhotos.map((photo) => {
                                          const photoKey = `prop-photo-${photo.id}`;
                                          const isSelected = photoItemFiles.some(pf => pf.id === photoKey);

                                          return (
                                            <div 
                                              key={photo.id}
                                              onClick={() => handleToggleExistingPhoto(photo)}
                                              style={{
                                                ...styles.existingPhotoThumbnailCard,
                                                ...(isSelected ? styles.existingPhotoThumbnailCardSelected : {})
                                              }}
                                            >
                                              <img 
                                                src={photo.url} 
                                                alt={photo.title || 'Foto de propiedad'} 
                                                style={styles.existingPhotoThumbnailImg} 
                                              />

                                              {/* Indicador de selección circular */}
                                              <div style={{
                                                ...styles.existingPhotoCheckCircle,
                                                ...(isSelected ? styles.existingPhotoCheckCircleSelected : styles.existingPhotoCheckCircleUnselected)
                                              }}>
                                                {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                                              </div>

                                              {/* Badge de ambiente */}
                                              <div style={styles.existingPhotoRoomTag}>
                                                <span>{photo.room || 'Sin ambiente'}</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div style={styles.existingPhotosEmptyBox}>
                                        <p style={styles.existingPhotosEmptyText}>
                                          No hay fotos en esta categoría. Podés tomar una foto o elegir de tu galería arriba.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 3. Botón FIXED abajo, sin flotar en el medio */}
                                <div style={styles.fixedPhotoBottomBar}>
                                  {photoItemFiles.length > 0 && (
                                    <div style={styles.selectedPhotosStripWrap}>
                                      <div style={styles.analysisSelectedHeaderRow}>
                                        <span style={styles.analysisSelectedTitle}>
                                          {photoItemFiles.length} de 5 {photoItemFiles.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
                                        </span>
                                        <button 
                                          type="button" 
                                          style={styles.clearSelectedPhotosBtn}
                                          onClick={() => setPhotoItemFiles([])}
                                        >
                                          Desmarcar todas
                                        </button>
                                      </div>

                                      <div style={styles.selectedPhotosScrollRow} className="no-scrollbar">
                                        {photoItemFiles.map((photo) => (
                                          <div key={photo.id} style={styles.selectedMiniThumbWrap}>
                                            <img src={photo.url} alt={photo.title} style={styles.selectedMiniThumbImg} />
                                            <button 
                                              type="button" 
                                              style={styles.selectedMiniRemoveBtn}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePhotoItemFile(photo.id);
                                              }}
                                              title="Quitar"
                                              aria-label="Quitar de selección"
                                            >
                                              <X size={10} color="#ffffff" strokeWidth={2.4} />
                                            </button>
                                            {photo.isExisting && (
                                              <span style={styles.selectedMiniOriginBadge}>Guardada</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <button 
                                    type="button" 
                                    style={{
                                      ...styles.thickAnalizarBtn,
                                      ...(photoItemFiles.length === 0 ? styles.thickAnalizarBtnDisabled : styles.thickAnalizarBtnActive)
                                    }}
                                    disabled={photoItemFiles.length === 0}
                                    onClick={() => setIsPhotoTypeSelectorOpen(true)}
                                  >
                                    <span>Analizar {photoItemFiles.length > 0 ? `(${photoItemFiles.length})` : ''}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* FASE 2: ANALYZING */}
                          {photoItemPhase === 'analyzing' && (
                            <div style={styles.aiProcessingBox}>
                              <div style={{
                                ...styles.aiProcessingIconWrap,
                                backgroundColor: photoAnalyzeType === 'structure' ? '#ecfdf5' : '#e0f2fe'
                              }}>
                                <Loader2 size={26} color={photoAnalyzeType === 'structure' ? '#059669' : '#0284c7'} style={{ animation: 'spin 1s linear infinite' }} />
                              </div>
                              <h4 style={styles.aiProcessingTitle}>
                                {photoAnalyzeType === 'structure' ? 'Analizando estructura...' : 'Analizando mobiliario...'}
                              </h4>
                              <p style={styles.aiProcessingSub}>
                                {photoAnalyzeType === 'structure'
                                  ? `Escaneando paredes, pisos, aberturas y terminaciones en ${selectedRoomDetail}`
                                  : `Detectando muebles, electrodomésticos y artefactos en ${selectedRoomDetail}`}
                              </p>
                            </div>
                          )}

                          {/* FASE 3: REVIEW */}
                          {photoItemPhase === 'review' && (
                            <div style={styles.reviewContentBlock}>
                              {/* Carrusel interactivo de fotos analizadas */}
                              {photoItemFiles.length > 0 && (
                                <div style={styles.photoCarouselBlock}>
                                  <div style={styles.photoCarouselHeaderRow}>
                                    <span style={styles.photoCarouselSectionTitle}>Fotos analizadas:</span>
                                    <span style={styles.photoCarouselCountBadge}>
                                      {photoItemFiles.length} {photoItemFiles.length === 1 ? 'captura' : 'capturas'}
                                    </span>
                                  </div>

                                  <div style={styles.photoCarouselScrollRow}>
                                    {/* Opción "Todas las fotos" si hay más de 1 foto */}
                                    {photoItemFiles.length > 1 && (
                                      <div 
                                        style={{
                                          ...styles.photoCarouselItemCard,
                                          ...(selectedPhotoReviewId === 'all' ? styles.photoCarouselItemCardActive : {})
                                        }}
                                        onClick={() => setSelectedPhotoReviewId('all')}
                                      >
                                        <div style={styles.photoCarouselAllIconBox}>
                                          <Layers size={22} color={selectedPhotoReviewId === 'all' ? '#4f46e5' : '#64748b'} strokeWidth={2.2} />
                                          <span style={styles.photoCarouselMiniBadge}>
                                            {photoDetectedItems.length}
                                          </span>
                                        </div>
                                        <span style={{
                                          ...styles.photoCarouselItemTitle,
                                          color: selectedPhotoReviewId === 'all' ? '#4f46e5' : '#0f172a',
                                          fontWeight: selectedPhotoReviewId === 'all' ? '700' : '600'
                                        }}>
                                          Todas
                                        </span>
                                        <span style={styles.photoCarouselItemSub}>
                                          {photoDetectedItems.length} ítems
                                        </span>
                                      </div>
                                    )}

                                    {/* Cada foto individual en el carrusel */}
                                    {photoItemFiles.map((photo, idx) => {
                                      const isSelected = selectedPhotoReviewId === photo.id || (photoItemFiles.length === 1 && selectedPhotoReviewId === 'all');
                                      const itemsOfThisPhoto = photoDetectedItems.filter(i => i.photoId === photo.id);

                                      return (
                                        <div 
                                          key={photo.id}
                                          style={{
                                            ...styles.photoCarouselItemCard,
                                            ...(isSelected ? styles.photoCarouselItemCardActive : {})
                                          }}
                                          onClick={() => setSelectedPhotoReviewId(photo.id)}
                                        >
                                          <div style={styles.photoCarouselThumbWrap}>
                                            <img src={photo.url} alt={photo.title} style={styles.photoCarouselImg} />
                                            <span style={styles.photoCarouselMiniBadge}>
                                              {itemsOfThisPhoto.length}
                                            </span>
                                            {isSelected && (
                                              <div style={styles.photoCarouselActiveIndicator}>
                                                <Check size={10} color="#ffffff" strokeWidth={3} />
                                              </div>
                                            )}
                                          </div>
                                          <span style={{
                                            ...styles.photoCarouselItemTitle,
                                            color: isSelected ? '#4f46e5' : '#0f172a',
                                            fontWeight: isSelected ? '700' : '600'
                                          }}>
                                            Foto {idx + 1}
                                          </span>
                                          <span style={styles.photoCarouselItemSub}>
                                            {itemsOfThisPhoto.length} {itemsOfThisPhoto.length === 1 ? 'ítem' : 'ítems'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {(() => {
                                const visiblePhotoItems = selectedPhotoReviewId === 'all'
                                  ? photoDetectedItems
                                  : photoDetectedItems.filter(i => i.photoId === selectedPhotoReviewId);

                                return (
                                  <div style={styles.extractedItemsGroup}>
                                    <div style={styles.extractedGroupLabelRow}>
                                      <span style={styles.extractedGroupLabel}>
                                        Ítems detectados ({visiblePhotoItems.filter(i => i.checked).length} de {visiblePhotoItems.length}):
                                      </span>
                                      {selectedPhotoReviewId !== 'all' && photoItemFiles.length > 1 && (
                                        <button
                                          type="button"
                                          style={styles.photoCarouselViewAllBtn}
                                          onClick={() => setSelectedPhotoReviewId('all')}
                                        >
                                          Ver todas ({photoDetectedItems.length})
                                        </button>
                                      )}
                                    </div>

                                    <div style={styles.detectedItemsListWrap}>
                                      {visiblePhotoItems.map((item) => (
                                        <div 
                                          key={item.id}
                                          style={{
                                            ...styles.detectedReviewItemCard,
                                            ...(item.checked ? styles.detectedReviewItemCardChecked : styles.detectedReviewItemCardUnchecked)
                                          }}
                                          onClick={() => handleTogglePhotoDetectedItem(item.id)}
                                        >
                                          {/* Fila superior: Checkbox + Nombre + Cantidad + Botón Editar */}
                                          <div style={styles.detectedReviewItemTopRow}>
                                            <div style={styles.detectedReviewItemHeaderLeft}>
                                              <div style={{
                                                ...styles.detectedRoomCheckbox,
                                                ...(item.checked ? styles.detectedRoomCheckboxChecked : {})
                                              }}>
                                                {item.checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                                              </div>
                                              <div style={styles.detectedReviewTitleGroup}>
                                                <h4 style={{
                                                  ...styles.detailItemNameText,
                                                  color: item.checked ? '#0f172a' : '#94a3b8'
                                                }}>
                                                  {capitalizeFirst(item.name)}
                                                </h4>
                                                <span style={{
                                                  ...styles.detailItemQtyChip,
                                                  backgroundColor: item.checked ? '#0f172a' : '#94a3b8'
                                                }}>
                                                  x{item.quantity || 1}
                                                </span>
                                                {item.status && (
                                                  <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    backgroundColor: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#ecfdf5' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fef2f2' : '#f8fafc',
                                                    color: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#059669' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#dc2626' : '#64748b',
                                                    border: `1px solid ${item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#a7f3d0' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fecaca' : '#e2e8f0'}`,
                                                    whiteSpace: 'nowrap'
                                                  }}>
                                                    {item.status}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <button 
                                              type="button" 
                                              style={styles.detailItemEditBtn}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenReviewEditModal(item, 'photo');
                                              }}
                                              title="Editar ítem"
                                              aria-label={`Editar ${item.name}`}
                                            >
                                              <Pencil size={14} color="#475569" />
                                            </button>
                                          </div>

                                          {/* Contenedor sutil para descripción */}
                                          {item.description && (
                                            <div style={styles.detailItemDescBox}>
                                              <p style={{
                                                ...styles.detailItemDescText,
                                                color: item.checked ? '#475569' : '#94a3b8'
                                              }}>
                                                {capitalizeFirst(item.description)}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      ))}

                                      {visiblePhotoItems.length === 0 && (
                                        <div style={styles.photoEmptyItemsBox}>
                                          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                            No se identificaron elementos específicos en esta foto.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              <div style={styles.reviewActionsCol}>
                                <button 
                                  type="button" 
                                  style={{
                                    ...styles.confirmItemsBtn,
                                    opacity: isConfirmingPhotoItems ? 0.75 : 1,
                                    cursor: isConfirmingPhotoItems ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={handleConfirmPhotoItems}
                                  disabled={isConfirmingPhotoItems || photoDetectedItems.filter(i => i.checked).length === 0}
                                >
                                  {isConfirmingPhotoItems ? (
                                    <>
                                      <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                                      <span>Guardando ítems...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check size={16} color="#ffffff" strokeWidth={2.4} />
                                      <span>Confirmar e incorporar {photoDetectedItems.filter(i => i.checked).length} ítems</span>
                                    </>
                                  )}
                                </button>

                                <button 
                                  type="button" 
                                  style={styles.reRecordBtn}
                                  onClick={() => {
                                    setPhotoItemPhase('upload');
                                    setPhotoItemFiles([]);
                                    setPhotoDetectedItems([]);
                                  }}
                                >
                                  <span>Subir otras fotos</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Modal Overlay: Selector de tipo de análisis (Mobiliario vs Estructura) */}
                          {isPhotoTypeSelectorOpen && (
                            <BottomSheet
                              isOpen={isPhotoTypeSelectorOpen}
                              onClose={() => setIsPhotoTypeSelectorOpen(false)}
                              title="¿Qué querés detectar?"
                              subtitle="Seleccioná qué elementos debe identificar la IA"
                              size="auto"
                              stacked
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                                  {/* Opción 1: Items / Mobiliario */}
                                  <div 
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '14px',
                                      padding: '16px',
                                      borderRadius: '16px',
                                      backgroundColor: '#ffffff',
                                      border: '2px solid #e0e7ff',
                                      boxShadow: '0 2px 10px rgba(79, 70, 229, 0.06)',
                                      cursor: 'pointer',
                                      transition: 'all 0.18s ease'
                                    }}
                                    onClick={() => {
                                      setIsPhotoTypeSelectorOpen(false);
                                      handleStartPhotoAnalysis('item');
                                    }}
                                  >
                                    <div style={{
                                      width: '50px',
                                      height: '50px',
                                      borderRadius: '14px',
                                      background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#4f46e5',
                                      flexShrink: 0
                                    }}>
                                      <Sofa size={26} strokeWidth={2.2} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                                        Items / Mobiliario
                                      </h4>
                                      <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.3 }}>
                                        Muebles, electrodomésticos, luminarias, artefactos y objetos.
                                      </p>
                                    </div>
                                    <ChevronRight size={18} color="#94a3b8" />
                                  </div>

                                  {/* Opción 2: Estructural */}
                                  <div 
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '14px',
                                      padding: '16px',
                                      borderRadius: '16px',
                                      backgroundColor: '#ffffff',
                                      border: '2px solid #d1fae5',
                                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.06)',
                                      cursor: 'pointer',
                                      transition: 'all 0.18s ease'
                                    }}
                                    onClick={() => {
                                      setIsPhotoTypeSelectorOpen(false);
                                      handleStartPhotoAnalysis('structure');
                                    }}
                                  >
                                    <div style={{
                                      width: '50px',
                                      height: '50px',
                                      borderRadius: '14px',
                                      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#059669',
                                      flexShrink: 0
                                    }}>
                                      <Layers size={26} strokeWidth={2.2} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                                        Estructural
                                      </h4>
                                      <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.3 }}>
                                        Paredes, techos, pisos, aberturas, mesadas y terminaciones fijas.
                                      </p>
                                    </div>
                                    <ChevronRight size={18} color="#94a3b8" />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  style={{
                                    width: '100%',
                                    height: '44px',
                                    borderRadius: '12px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    fontWeight: '600',
                                    fontSize: '13.5px',
                                    marginTop: '16px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setIsPhotoTypeSelectorOpen(false)}
                                >
                                  Cancelar
                                </button>
                            </BottomSheet>
                          )}
                        </div>
                      )}

                      {/* ---- PASO 2C: FLUJO DE CARGA MANUAL ---- */}
                      {itemAddMethod === 'manual' && (
                        <form onSubmit={handleSaveManualItemInModal} style={styles.modalForm}>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Nombre del ítem *</label>
                            <input 
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              style={styles.formInput}
                              placeholder="Ej: Aire acondicionado split, Mesada de mármol..."
                              autoFocus
                              required
                            />
                          </div>

                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Cantidad *</label>
                            <input 
                              type="number"
                              min="1"
                              value={newItemQty}
                              onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                              style={styles.formInput}
                              required
                            />
                          </div>

                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Descripción u observación técnica</label>
                            <textarea 
                              value={newItemDesc}
                              onChange={(e) => setNewItemDesc(e.target.value)}
                              style={{
                                ...styles.formInput,
                                minHeight: '85px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                              }}
                              placeholder="Observaciones de marcas o detalles"
                            />
                          </div>

                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Estado de conservación (opcional)</label>
                            <select
                              value={newItemStatus}
                              onChange={(e) => setNewItemStatus(e.target.value)}
                              style={styles.formInput}
                            >
                              <option value="">Sin especificar</option>
                              <option value="Óptimo">Óptimo</option>
                              <option value="Muy Bueno">Muy Bueno</option>
                              <option value="Bueno">Bueno</option>
                              <option value="Regular">Regular</option>
                              <option value="Con detalles">Con detalles</option>
                              <option value="Malo">Malo</option>
                              <option value="Con humedad">Con humedad</option>
                            </select>
                          </div>

                          <button 
                            type="submit" 
                            style={styles.submitPropertyBtn}
                            disabled={!newItemName.trim()}
                          >
                            <span>Agregar ítem al ambiente</span>
                            <Plus size={16} color="#ffffff" strokeWidth={2.4} />
                          </button>
                        </form>
                      )}
                    </div>
                </BottomSheet>
              )}

              {/* ============ MODAL SUPERIOR: EDITAR ÍTEM DETECTADO (VOZ O FOTO) ============ */}
              {reviewEditModal && (
                <BottomSheet
                  isOpen={!!reviewEditModal}
                  onClose={() => setReviewEditModal(null)}
                  title="Editar ítem detectado"
                  subtitle="Modificá nombre, cantidad y notas antes de incorporar"
                  size="medium"
                  stacked
                >
                      <form onSubmit={handleSaveReviewEditModal} style={styles.modalForm}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Nombre del ítem *</label>
                          <input 
                            type="text"
                            value={reviewEditForm.name}
                            onChange={(e) => setReviewEditForm({ ...reviewEditForm, name: e.target.value })}
                            style={styles.formInput}
                            placeholder="Nombre del elemento"
                            autoFocus
                            required
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Cantidad *</label>
                          <input 
                            type="number"
                            min="1"
                            value={reviewEditForm.quantity}
                            onChange={(e) => setReviewEditForm({ ...reviewEditForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            style={styles.formInput}
                            required
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Descripción u observación técnica</label>
                          <textarea 
                            value={reviewEditForm.description}
                            onChange={(e) => setReviewEditForm({ ...reviewEditForm, description: e.target.value })}
                            style={{
                              ...styles.formInput,
                              minHeight: '85px',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                            placeholder="Observaciones de estado de conservación, marcas o detalles"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Estado de conservación (opcional)</label>
                          <select
                            value={reviewEditForm.status || ''}
                            onChange={(e) => setReviewEditForm({ ...reviewEditForm, status: e.target.value })}
                            style={styles.formInput}
                          >
                            <option value="">Sin especificar</option>
                            <option value="Óptimo">Óptimo</option>
                            <option value="Muy Bueno">Muy Bueno</option>
                            <option value="Bueno">Bueno</option>
                            <option value="Regular">Regular</option>
                            <option value="Con detalles">Con detalles</option>
                            <option value="Malo">Malo</option>
                            <option value="Con humedad">Con humedad</option>
                          </select>
                        </div>

                        <button 
                          type="submit" 
                          style={styles.submitPropertyBtn}
                          disabled={!reviewEditForm.name.trim()}
                        >
                          <span>Guardar cambios</span>
                          <Check size={16} color="#ffffff" strokeWidth={2.4} />
                        </button>
                      </form>
                </BottomSheet>
              )}

              <div style={{ height: '70px' }} />
            </main>
          );
        }


        // =========================================================================
        // CASO 2: VISTA GENERAL DE LA PROPIEDAD (!selectedRoomDetail)
        // =========================================================================
        return (
          <main key={`property-detail-${selectedPropertyDetail?.id}-${detailSubTab}`} className="app-detail-main" style={styles.detailMain}>
            {/* Top Navigation Bar: Volver a la izquierda y Opciones (...) a la derecha */}
            <div style={styles.detailHeaderBar}>
              <button 
                type="button" 
                style={styles.detailBackBtn} 
                onClick={handleBackFromPropertyDetail}
                aria-label="Volver atrás"
              >
                <ArrowLeft size={16} color="#0f172a" strokeWidth={2.4} />
                <span>Volver</span>
              </button>

              {/* Botón de 3 puntos (Opciones de la propiedad) */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={styles.detailOptionsBtn}
                  onClick={() => setIsPropertyOptionsMenuOpen(prev => !prev)}
                  aria-label="Opciones de la propiedad"
                >
                  <MoreVertical size={18} color="#0f172a" />
                </button>

                {/* Dropdown flotante */}
                {isPropertyOptionsMenuOpen && (
                  <>
                    <div 
                      style={styles.dropdownBackdrop} 
                      onClick={() => setIsPropertyOptionsMenuOpen(false)} 
                    />
                    <div style={styles.propertyOptionsDropdown}>
                      <button
                        type="button"
                        style={styles.propertyOptionItem}
                        onClick={() => {
                          setIsPropertyOptionsMenuOpen(false);
                          setIsEditPropertyModalOpen(true);
                        }}
                      >
                        <Pencil size={14} color="#334155" />
                        <span>Editar propiedad</span>
                      </button>
                      <div style={styles.propertyOptionDivider} />
                      <button
                        type="button"
                        style={styles.propertyOptionItemDanger}
                        onClick={() => {
                          setIsPropertyOptionsMenuOpen(false);
                          setIsDeletePropertyModalOpen(true);
                        }}
                      >
                        <Trash2 size={14} color="#ef4444" />
                        <span>Eliminar propiedad</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Hero Card de la Propiedad */}
            <div className="app-detail-hero-card" style={styles.detailHeroCard}>
              <img 
                src={selectedPropertyDetail.image || selectedPropertyDetail.image_url || placeholderHorizontal} 
                alt={selectedPropertyDetail.name} 
                style={styles.detailHeroImg} 
                onError={(e) => {
                  if (e.target.src !== placeholderHorizontal) {
                    e.target.src = placeholderHorizontal;
                  }
                }}
              />
              {/* Badge Compartida sobre la imagen, arriba a la derecha */}
              {Boolean(
                selectedPropertyDetail.isShared || 
                selectedPropertyDetail.is_shared || 
                (currentUserId && selectedPropertyDetail.userId && selectedPropertyDetail.userId !== currentUserId) ||
                (currentUserId && selectedPropertyDetail.user_id && selectedPropertyDetail.user_id !== currentUserId)
              ) && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(6px)',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: '700',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                  zIndex: 2,
                }}>
                  <Users size={11} color="#475569" strokeWidth={2.4} />
                  Compartida
                </div>
              )}
              <div style={styles.detailHeroOverlay}>
                <h2 className="app-detail-hero-title" style={styles.detailHeroTitle}>{selectedPropertyDetail.name}</h2>
                {selectedPropertyDetail.address && (
                  <div style={styles.detailHeroAddressRow}>
                    <MapPin size={13} color="rgba(255, 255, 255, 0.9)" strokeWidth={2.2} />
                    <span style={styles.detailHeroAddress}>{selectedPropertyDetail.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Acciones de la Propiedad: Exportar PDF prominente y Compartir (solo si es propia) */}
            <div style={styles.detailExportActionRow}>
              <button 
                type="button" 
                style={styles.detailProminentExportBtn}
                onClick={() => setIsExportPdfModalOpen(true)}
                aria-label="Exportar PDF"
              >
                <FileText size={16} color="#ffffff" strokeWidth={2.2} />
                <span>Exportar PDF</span>
              </button>

              {!Boolean(
                selectedPropertyDetail.isShared || 
                selectedPropertyDetail.is_shared || 
                (currentUserId && selectedPropertyDetail.userId && selectedPropertyDetail.userId !== currentUserId) ||
                (currentUserId && selectedPropertyDetail.user_id && selectedPropertyDetail.user_id !== currentUserId)
              ) && (
                <button 
                  type="button" 
                  style={styles.detailShareSquareBtn}
                  onClick={() => {
                    loadColleagues();
                    setIsShareModalOpen(true);
                  }}
                  aria-label="Compartir ficha con colegas"
                  title="Compartir con colegas"
                >
                  <Share2 size={16} color="#334155" strokeWidth={2.2} />
                </button>
              )}
            </div>

            {/* Opciones principales de la propiedad: Ambientes, Fotos, Plano (sin números en paréntesis) */}
            <div style={styles.detailSubTabNav}>
              <button 
                type="button"
                style={{
                  ...styles.detailSubTabBtn,
                  ...(detailSubTab === 'ambientes' ? styles.detailSubTabBtnActive : styles.detailSubTabBtnInactive)
                }}
                onClick={() => setDetailSubTab('ambientes')}
              >
                <Building size={14} />
                <span>Ambientes</span>
              </button>
              <button 
                type="button"
                style={{
                  ...styles.detailSubTabBtn,
                  ...(detailSubTab === 'fotos' ? styles.detailSubTabBtnActive : styles.detailSubTabBtnInactive)
                }}
                onClick={() => setDetailSubTab('fotos')}
              >
                <Camera size={14} />
                <span>Fotos</span>
              </button>
              <button 
                type="button"
                style={{
                  ...styles.detailSubTabBtn,
                  ...(detailSubTab === 'plano' ? styles.detailSubTabBtnActive : styles.detailSubTabBtnInactive)
                }}
                onClick={() => setDetailSubTab('plano')}
              >
                <Layers size={14} />
                <span>Plano</span>
              </button>
            </div>

            {/* ============ CONTENIDO SUB-TAB 1: AMBIENTES ============ */}
            {detailSubTab === 'ambientes' && (
              <div>
                <div style={styles.detailRoomsHeaderRow}>
                  <h3 style={styles.detailRoomsSectionTitle}>
                    Ambientes
                  </h3>
                  <button 
                    type="button" 
                    style={styles.detailAddRoomBtnSolid}
                    onClick={handleOpenAddRoomModal}
                  >
                    <Plus size={15} color="#ffffff" strokeWidth={2.5} />
                    <span>Nuevo ambiente</span>
                  </button>
                </div>

                {/* Listado de tarjetas de ambiente limpias o Estado Vacío */}
                {isLoadingPropertyDetail ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[1, 2, 3, 4].map((idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          backgroundColor: '#ffffff',
                          borderRadius: '16px',
                          border: '1px solid #f1f5f9',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div className="app-skeleton-shimmer" style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                            <div className="app-skeleton-shimmer" style={{ width: '50%', height: '15px', borderRadius: '4px' }} />
                            <div className="app-skeleton-shimmer" style={{ width: '30%', height: '12px', borderRadius: '4px' }} />
                          </div>
                        </div>
                        <div className="app-skeleton-shimmer" style={{ width: '70px', height: '28px', borderRadius: '8px' }} />
                      </div>
                    ))}
                  </div>
                ) : detailRooms.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {detailRooms.map((roomName) => {
                      const roomItems = propertyInventory[roomName] || [];
                      const roomQty = roomItems.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 1), 0);
                      return (
                        <div 
                          key={roomName}
                          style={styles.detailRoomCardRow}
                        >
                          {/* Zona 1: Toque general para ver detalles / ítems del ambiente */}
                          <div 
                            style={styles.detailRoomCardMain}
                            onClick={() => {
                              setSelectedRoomDetail(roomName);
                              setIsAddingItemRoom(null);
                              setDetailEditingItemId(null);
                              setRoomItemSearchQuery('');
                            }}
                            title={`Ver detalles de ${roomName}`}
                          >
                            <div style={styles.detailRoomCardLeft}>
                              <div style={styles.detailRoomCardIconBox}>
                                {getAmbientIcon(roomName)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <h4 style={styles.detailRoomCardTitle}>{roomName}</h4>
                                <p style={styles.detailRoomCardSub}>
                                  {roomQty} {roomQty === 1 ? 'ítem relevado' : 'ítems relevados'}
                                </p>
                              </div>
                            </div>

                            <div style={styles.detailRoomEnterCue}>
                              <ChevronRight size={17} color="#94a3b8" />
                            </div>
                          </div>

                          {/* Separador vertical divisorio entre zonas */}
                          <div style={styles.detailRoomDivider} />

                          {/* Zona 2: Botón de acción rápida exclusiva para dictar */}
                          <div style={styles.detailRoomActionZone}>
                            <button 
                              type="button" 
                              style={styles.detailRoomQuickMicBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartDictationForRoom(roomName);
                              }}
                              title={`Dictar por voz en ${roomName}`}
                              aria-label={`Dictar por voz en ${roomName}`}
                            >
                              <Mic size={13} color="#4f46e5" strokeWidth={2.4} />
                              <span>Dictar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ESTADO VACÍO ELEGANTE Y DIRECTO - SIN EMOJIS, SIN PILLS */
                  <div style={styles.detailEmptyCard}>
                    <div style={styles.detailEmptyIconCircle}>
                      <Building size={22} color="#64748b" strokeWidth={1.8} />
                    </div>
                    <h4 style={styles.detailEmptyTitle}>Sin ambientes</h4>
                    <p style={styles.detailEmptySub}>
                      Esta propiedad no tiene ambientes creados aún
                    </p>

                    <button
                      type="button"
                      style={styles.detailEmptyPrimaryBtn}
                      onClick={handleOpenAddRoomModal}
                    >
                      <Plus size={14} color="#ffffff" strokeWidth={2.4} />
                      <span>Crear ambiente</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ============ CONTENIDO SUB-TAB 2: PLANO Y CROQUIS (SIN METROS CUADRADOS) ============ */}
            {detailSubTab === 'plano' && (() => {
              const savedPlan = selectedPropertyDetail?.floorPlan;
              let planShapes = [];
              let availableFloors = [];

              if (Array.isArray(savedPlan?.shapes)) {
                if (savedPlan.shapes.length > 0 && savedPlan.shapes[0]?.isFloor) {
                  availableFloors = savedPlan.shapes;
                  const currentFloor = availableFloors.find(f => f.id === previewFloorId) || availableFloors[0];
                  planShapes = currentFloor?.shapes || [];
                } else {
                  planShapes = savedPlan.shapes;
                }
              }
              const hasPlan = Boolean(planShapes && planShapes.length > 0);

              return (
                <div style={styles.detailPlanCard}>
                  <div style={{ marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Plano y distribución</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                      {hasPlan ? 'Croquis y distribución técnica de ambientes' : 'Aún no se ha creado un plano para esta propiedad'}
                    </p>
                  </div>

                  {/* Selector de pisos / plantas si hay más de 1 piso */}
                  {availableFloors.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {availableFloors.map((fl, idx) => {
                        const isSelected = previewFloorId ? fl.id === previewFloorId : idx === 0;
                        return (
                          <button
                            key={fl.id}
                            type="button"
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              border: isSelected ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                              backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                              color: isSelected ? '#4f46e5' : '#64748b',
                              fontSize: '12.5px',
                              fontWeight: isSelected ? '700' : '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => setPreviewFloorId(fl.id)}
                          >
                            {fl.name || (idx === 0 ? 'Planta Baja' : `Piso ${idx}`)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Canvas de Plano Arquitectónico interactivo limpio o estado vacío claro */}
                  <div style={styles.detailPlanCanvasContainer}>
                    {hasPlan ? (
                      (() => {
                        // Calcular Bounding Box automático para centrar y escalar perfectamente considerando rotaciones
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        planShapes.forEach((s) => {
                          const x = s.x ?? 0;
                          const y = s.y ?? 0;
                          const w = s.width || (s.type === 'door' ? 60 : 80);
                          const h = s.height || (s.type === 'window' ? 14 : (s.type === 'door' ? 60 : 80));
                          const rot = s.rotation || 0;

                          if (s.type === 'window' || s.type === 'stairs') {
                            const isRotated90 = (rot % 180 === 90);
                            const effW = isRotated90 ? h : w;
                            const effH = isRotated90 ? w : h;
                            const cx = x + w / 2;
                            const cy = y + h / 2;
                            if (cx - effW / 2 < minX) minX = cx - effW / 2;
                            if (cy - effH / 2 < minY) minY = cy - effH / 2;
                            if (cx + effW / 2 > maxX) maxX = cx + effW / 2;
                            if (cy + effH / 2 > maxY) maxY = cy + effH / 2;
                          } else if (s.type === 'door') {
                            const r = s.width || 60;
                            const rad = (rot * Math.PI) / 180;
                            const cos = Math.cos(rad);
                            const sin = Math.sin(rad);
                            const pts = [
                              { x: 0, y: 0 },
                              { x: r, y: 0 },
                              { x: 0, y: r },
                              { x: r, y: r }
                            ];
                            pts.forEach(p => {
                              const px = x + (p.x * cos - p.y * sin);
                              const py = y + (p.x * sin + p.y * cos);
                              if (px < minX) minX = px;
                              if (py < minY) minY = py;
                              if (px > maxX) maxX = px;
                              if (py > maxY) maxY = py;
                            });
                          } else {
                            if (x < minX) minX = x;
                            if (y < minY) minY = y;
                            if (x + w > maxX) maxX = x + w;
                            if (y + h > maxY) maxY = y + h;
                          }
                        });

                        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 400; maxY = 300; }
                        const pad = 40;
                        const boxW = Math.max(260, (maxX - minX) + pad * 2);
                        const boxH = Math.max(160, (maxY - minY) + pad * 2);
                        const boxX = minX - pad;
                        const boxY = minY - pad;

                        return (
                          <svg 
                            width="100%" 
                            height="100%" 
                            viewBox={`${boxX} ${boxY} ${boxW} ${boxH}`} 
                            preserveAspectRatio="xMidYMid meet"
                            style={{ width: '100%', height: '100%', display: 'block' }}
                          >
                            <defs>
                              <pattern id="preview-grid-mini" width="24" height="24" patternUnits="userSpaceOnUse">
                                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                              </pattern>
                            </defs>
                            <rect x={boxX} y={boxY} width={boxW} height={boxH} fill="url(#preview-grid-mini)" />
                            <g>
                              {planShapes.map((shape) => {
                                if (shape.type === 'room') {
                                  const cx = shape.x + shape.width / 2;
                                  const cy = shape.y + shape.height / 2;
                                  return (
                                    <g key={shape.id} transform={`rotate(${shape.rotation || 0}, ${cx}, ${cy})`}>
                                      <rect
                                        x={shape.x}
                                        y={shape.y}
                                        width={shape.width}
                                        height={shape.height}
                                        rx={5}
                                        fill={shape.fill || 'rgba(241, 245, 249, 0.92)'}
                                        stroke={shape.stroke || '#94a3b8'}
                                        strokeWidth={1.8}
                                        strokeDasharray={shape.noRoom ? '5,3' : 'none'}
                                      />
                                      <text
                                        x={cx}
                                        y={cy + 4}
                                        textAnchor="middle"
                                        fill="#0f172a"
                                        fontSize={11.5}
                                        fontWeight={700}
                                        fontFamily="Plus Jakarta Sans, sans-serif"
                                      >
                                        {shape.label}
                                      </text>
                                    </g>
                                  );
                                }
                                if (shape.type === 'polygon' && shape.points?.length >= 6) {
                                  const pointsStr = [];
                                  for (let i = 0; i < shape.points.length; i += 2) {
                                    pointsStr.push(`${shape.points[i]},${shape.points[i + 1]}`);
                                  }
                                  const cx = shape.width / 2;
                                  const cy = shape.height / 2;
                                  return (
                                    <g key={shape.id} transform={`translate(${shape.x}, ${shape.y}) rotate(${shape.rotation || 0}, ${cx}, ${cy})`}>
                                      <polygon
                                        points={pointsStr.join(' ')}
                                        fill={shape.fill || 'rgba(224, 242, 254, 0.88)'}
                                        stroke={shape.stroke || '#38bdf8'}
                                        strokeWidth={1.8}
                                        strokeDasharray={shape.noRoom ? '5,3' : 'none'}
                                      />
                                      <text
                                        x={cx}
                                        y={cy + 4}
                                        textAnchor="middle"
                                        fill="#0f172a"
                                        fontSize={11.5}
                                        fontWeight={700}
                                        fontFamily="Plus Jakarta Sans, sans-serif"
                                      >
                                        {shape.label}
                                      </text>
                                    </g>
                                  );
                                }
                                if (shape.type === 'door') {
                                  const r = shape.width || 60;
                                  return (
                                    <g key={shape.id} transform={`translate(${shape.x}, ${shape.y}) rotate(${shape.rotation || 0})`}>
                                      <line x1="0" y1="0" x2={r} y2="0" stroke="#334155" strokeWidth={2} />
                                      <path d={`M 0 0 L ${r} 0 A ${r} ${r} 0 0 1 0 ${r} Z`} fill="rgba(79, 70, 229, 0.08)" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3,2" />
                                      <circle cx="0" cy="0" r={3} fill="#0f172a" />
                                    </g>
                                  );
                                }
                                if (shape.type === 'window') {
                                  const w = shape.width || 80;
                                  const h = shape.height || 14;
                                  const rot = shape.rotation || 0;
                                  return (
                                    <g key={shape.id} transform={`translate(${shape.x}, ${shape.y}) rotate(${rot}, ${w / 2}, ${h / 2})`}>
                                      <rect x="0" y="0" width={w} height={h} fill="#ffffff" stroke="#334155" strokeWidth={1.5} rx={2} />
                                      <line x1="3" y1={h / 2} x2={w - 3} y2={h / 2} stroke="#38bdf8" strokeWidth={1.5} />
                                    </g>
                                  );
                                }
                                if (shape.type === 'stairs') {
                                  const w = shape.width || 90;
                                  const h = shape.height || 60;
                                  const rot = shape.rotation || 0;
                                  const steps = 5;
                                  const stepWidth = w / steps;
                                  return (
                                    <g key={shape.id} transform={`translate(${shape.x}, ${shape.y}) rotate(${rot}, ${w / 2}, ${h / 2})`}>
                                      <rect x="0" y="0" width={w} height={h} fill="#f1f5f9" stroke="#64748b" strokeWidth={1.5} rx={2} />
                                      {Array.from({ length: steps - 1 }).map((_, i) => (
                                        <line key={i} x1={(i + 1) * stepWidth} y1="0" x2={(i + 1) * stepWidth} y2={h} stroke="#94a3b8" strokeWidth={1} />
                                      ))}
                                      <line x1="8" y1={h / 2} x2={w - 12} y2={h / 2} stroke="#4f46e5" strokeWidth={1.5} />
                                    </g>
                                  );
                                }
                                return null;
                              })}
                            </g>
                          </svg>
                        );
                      })()
                    ) : (
                      <div
                        style={{ ...styles.detailEmptyPlanPrompt, cursor: 'pointer' }}
                        onClick={() => handleOpenFloorPlanDesigner(selectedPropertyDetail)}
                      >
                        <div style={styles.emptyPlanIconCircle}>
                          <Layers size={26} color="#4f46e5" strokeWidth={2} />
                        </div>
                        <span style={styles.detailEmptyPlanTitle}>Esta propiedad no tiene plano</span>
                        <span style={styles.detailEmptyPlanSub}>
                          Aún no se ha diseñado el plano arquitectónico para esta propiedad
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botón de acción centrado: Diseñar o Editar plano */}
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <button
                      type="button"
                      style={styles.detailPlanDesignerBtn}
                      onClick={() => handleOpenFloorPlanDesigner(selectedPropertyDetail)}
                    >
                      {hasPlan ? (
                        <Layers size={16} color="#ffffff" strokeWidth={2.2} />
                      ) : (
                        <Plus size={16} color="#ffffff" strokeWidth={2.4} />
                      )}
                      <span>{hasPlan ? 'Editar plano' : 'Diseñar plano'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ============ CONTENIDO SUB-TAB 3: FOTOS (COMO EN ITEMS: LISTADO DE AMBIENTES) ============ */}
            {detailSubTab === 'fotos' && (() => {
              const allPhotos = selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail);
              // Ambientes para fotos: descartar 'General' y 'Portada'
              const propertyRooms = selectedPropertyDetail.rooms || [];
              const rawRooms = [
                ...propertyRooms,
                ...allPhotos.map(p => p.room).filter(Boolean)
              ];
              const seen = new Set();
              const photoRooms = [];
              for (const r of rawRooms) {
                const norm = (r || '').trim().toLowerCase();
                if (!norm || norm === 'general' || norm === 'portada') continue;
                if (!seen.has(norm)) {
                  seen.add(norm);
                  const matchedOrig = propertyRooms.find(pr => pr.trim().toLowerCase() === norm);
                  photoRooms.push(matchedOrig || r.trim());
                }
              }

              return (
                <div>
                  <div style={styles.detailRoomsHeaderRow}>
                    <h3 style={styles.detailRoomsSectionTitle}>Fotos por ambiente</h3>
                    <button 
                      type="button" 
                      style={styles.detailAddRoomBtnSolid}
                      onClick={() => handleOpenAddPhotosModal()}
                    >
                      <Camera size={15} color="#ffffff" strokeWidth={2.4} />
                      <span>Subir fotos</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {photoRooms.map((roomName) => {
                      const roomPhotosList = allPhotos.filter(p => 
                        (p.room || '').trim().toLowerCase() === (roomName || '').trim().toLowerCase()
                      );
                      const firstPhoto = roomPhotosList[0];

                      return (
                        <div 
                          key={roomName}
                          style={styles.photoRoomCardRow}
                          onClick={() => setSelectedPhotoRoomDetail(roomName)}
                        >
                          <div style={styles.photoRoomCardLeft}>
                            <div style={styles.photoRoomThumbBox}>
                              {firstPhoto ? (
                                <img src={firstPhoto.url} alt={roomName} style={styles.photoRoomThumbImg} />
                              ) : (
                                <Camera size={19} color="#6366f1" strokeWidth={1.8} />
                              )}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <h4 style={styles.photoRoomCardTitle}>{roomName}</h4>
                              <p style={styles.photoRoomCardSub}>
                                {roomPhotosList.length > 0 
                                  ? (roomPhotosList.length === 1 ? '1 foto relevada' : `${roomPhotosList.length} fotos relevadas`)
                                  : 'Sin fotos relevadas'
                                }
                              </p>
                            </div>
                          </div>

                          <div style={styles.photoRoomCardRight}>
                            <ChevronRight size={18} color="#94a3b8" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Modal Lightbox para fotos */}
            {renderPhotoViewer(detailPhotos)}

            {/* Modal: Subir fotos a la propiedad */}
            {renderAddPhotosModal()}

            {/* ============ MODAL: CREAR AMBIENTE (ELECCIÓN ENTRE VOZ O MANUAL) ============ */}
            {isAddingRoomToDetail && (
              <BottomSheet
                isOpen={isAddingRoomToDetail}
                onClose={() => setIsAddingRoomToDetail(false)}
                title={
                  addRoomMethod === 'select' ? 'Nuevo ambiente' :
                  addRoomMethod === 'voice' ? 'Dictar ambientes por voz' :
                  'Carga manual de ambiente'
                }
                subtitle={
                  addRoomMethod === 'select' ? '¿Cómo querés sumar los ambientes?' :
                  addRoomMethod === 'voice' ? `${selectedPropertyDetail?.name} • Reconocimiento IA` :
                  `${selectedPropertyDetail?.name} • Teclado`
                }
                size={addRoomMethod === 'voice' ? 'full' : 'auto'}
                showBackButton={addRoomMethod !== 'select'}
                onBack={() => setAddRoomMethod('select')}
              >
                    {/* ---- PASO 1: SELECTOR DE MÉTODO (VOZ O MANUAL) ---- */}
                    {addRoomMethod === 'select' && (
                      <div style={styles.methodChoicesCol}>
                        {/* Opción 1: Dictado por voz */}
                        <div 
                          style={styles.methodChoiceCard}
                          onClick={() => {
                            setAddRoomMethod('voice');
                            setVoiceRoomPhase('idle');
                          }}
                        >
                          <div style={styles.methodIconCircleVoice}>
                            <Mic size={22} color="#4f46e5" strokeWidth={2.4} />
                          </div>
                          <div style={styles.methodCardInfo}>
                            <h4 style={styles.methodCardTitle}>Dictar por voz</h4>
                            <p style={styles.methodCardSub}>
                              Nombrá uno o varios ambientes en voz alta y la IA los separará y creará juntos.
                            </p>
                          </div>
                          <ChevronRight size={18} color="#94a3b8" />
                        </div>

                        {/* Opción 2: Carga manual */}
                        <div 
                          style={styles.methodChoiceCard}
                          onClick={() => setAddRoomMethod('manual')}
                        >
                          <div style={styles.methodIconCircleManual}>
                            <Pencil size={20} color="#0f172a" strokeWidth={2.2} />
                          </div>
                          <div style={styles.methodCardInfo}>
                            <h4 style={styles.methodCardTitle}>Carga manual</h4>
                            <p style={styles.methodCardSub}>
                              Escribí el nombre del ambiente directamente con el teclado.
                            </p>
                          </div>
                          <ChevronRight size={18} color="#94a3b8" />
                        </div>
                      </div>
                    )}

                    {/* ---- PASO 2A: FLUJO DE DICTADO POR VOZ ---- */}
                    {addRoomMethod === 'voice' && (
                      <div style={styles.voiceFlowWrapper}>
                        {/* FASE 1: IDLE */}
                        {voiceRoomPhase === 'idle' && (
                          <div style={styles.readyRecordBox}>
                            <button 
                              type="button" 
                              style={styles.micRecordButton}
                              onClick={handleStartVoiceRoomRecording}
                            >
                              <Mic size={36} color="#ffffff" strokeWidth={2.4} />
                            </button>
                            <h4 style={styles.recordActionTitle}>Tocar para dictar ambientes</h4>
                            <p style={styles.recordActionHint}>
                              Nombrá los ambientes en voz alta. Podés decir varios juntos (ej: "Living comedor, dos dormitorios y quincho").
                            </p>
                          </div>
                        )}

                        {/* FASE 2: RECORDING */}
                        {voiceRoomPhase === 'recording' && (
                          <div style={styles.recordingActiveBox}>
                            <div style={styles.recordingTimerRow}>
                              <span style={{
                                ...styles.liveRecordDot,
                                backgroundColor: voiceRoomTime >= 35 ? '#f59e0b' : '#ef4444'
                              }} />
                              <span style={{
                                ...styles.recordingTimerText,
                                color: voiceRoomTime >= 35 ? '#ea580c' : '#0f172a'
                              }}>
                                {Math.floor(voiceRoomTime / 60).toString().padStart(2, '0')}:{(voiceRoomTime % 60).toString().padStart(2, '0')}
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginLeft: '6px' }}>/ 00:45</span>
                              </span>
                            </div>

                            <div style={styles.soundWaveRow}>
                              <span style={{ ...styles.waveBar, height: '24px', animationDelay: '0s' }} />
                              <span style={{ ...styles.waveBar, height: '40px', animationDelay: '0.15s' }} />
                              <span style={{ ...styles.waveBar, height: '18px', animationDelay: '0.3s' }} />
                              <span style={{ ...styles.waveBar, height: '36px', animationDelay: '0.1s' }} />
                              <span style={{ ...styles.waveBar, height: '28px', animationDelay: '0.25s' }} />
                            </div>

                            <p style={styles.transcriptionPreview}>
                              {voiceRoomTime >= 35 
                                ? '⚠️ Quedan pocos segundos. Se procesará automáticamente a los 45s.'
                                : `Escuchando: nombrando ambientes para ${selectedPropertyDetail?.name || 'la propiedad'}...`}
                            </p>

                            <button 
                              type="button" 
                              style={styles.stopRecordSleekBtn}
                              onClick={handleStopVoiceRoomRecording}
                            >
                              <div style={styles.stopSquareIndicator} />
                              <span>Finalizar dictado</span>
                            </button>
                          </div>
                        )}

                        {/* FASE 3: PROCESSING */}
                        {voiceRoomPhase === 'processing' && (
                          <div style={styles.aiProcessingBox}>
                            <div style={styles.aiProcessingIconWrap}>
                              <Loader2 size={26} color="#0f172a" style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                            <h4 style={styles.aiProcessingTitle}>Procesando ambientes...</h4>
                            <p style={styles.aiProcessingSub}>Identificando y separando cada espacio nombrado</p>
                          </div>
                        )}

                        {/* FASE 4: REVIEW */}
                        {voiceRoomPhase === 'review' && (
                          <div style={styles.reviewContentBlock}>
                            <div style={styles.transcriptCard}>
                              <span style={styles.transcriptLabel}>Audio reconocido:</span>
                              <p style={styles.transcriptQuote}>"{voiceRoomTranscript}"</p>
                            </div>

                            <div style={styles.extractedItemsGroup}>
                              <span style={styles.extractedGroupLabel}>
                                Ambientes a incorporar ({detectedVoiceRooms.filter(r => r.checked).length} de {detectedVoiceRooms.length}):
                              </span>

                              <div style={styles.detectedRoomsList}>
                                {detectedVoiceRooms.map((room) => (
                                  <div 
                                    key={room.id}
                                    style={{
                                      ...styles.detectedRoomCard,
                                      ...(room.checked ? styles.detectedRoomCardChecked : {})
                                    }}
                                    onClick={() => handleToggleDetectedRoom(room.id)}
                                  >
                                    {editingDetectedRoomId === room.id ? (
                                      <div 
                                        style={styles.detectedRoomEditRow}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input 
                                          type="text"
                                          value={editingDetectedRoomName}
                                          onChange={(e) => setEditingDetectedRoomName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEditDetectedRoom();
                                            if (e.key === 'Escape') handleCancelEditDetectedRoom();
                                          }}
                                          style={styles.detectedRoomEditInput}
                                          autoFocus
                                        />
                                        <button 
                                          type="button"
                                          style={styles.detectedRoomSaveEditBtn}
                                          onClick={handleSaveEditDetectedRoom}
                                          title="Guardar nombre"
                                          aria-label="Guardar nombre"
                                        >
                                          <Check size={18} color="#ffffff" strokeWidth={2.6} />
                                        </button>
                                        <button 
                                          type="button"
                                          style={styles.detectedRoomCancelEditBtn}
                                          onClick={handleCancelEditDetectedRoom}
                                          title="Cancelar edición"
                                          aria-label="Cancelar edición"
                                        >
                                          <X size={18} color="#64748b" strokeWidth={2.4} />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div style={styles.detectedRoomCardLeft}>
                                          <div style={{
                                            ...styles.detectedRoomCheckbox,
                                            ...(room.checked ? styles.detectedRoomCheckboxChecked : {})
                                          }}>
                                            {room.checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                                          </div>
                                          <span style={styles.detectedRoomName}>{room.name}</span>
                                        </div>

                                        <button 
                                          type="button" 
                                          style={styles.detectedRoomEditBtn}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartEditDetectedRoom(room);
                                          }}
                                          title="Editar nombre"
                                          aria-label="Editar nombre"
                                        >
                                          <Pencil size={15} color="#475569" strokeWidth={2.2} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div style={styles.reviewActionsCol}>
                              <button 
                                type="button" 
                                style={{
                                  ...styles.confirmItemsBtn,
                                  opacity: isConfirmingVoiceRooms ? 0.75 : 1,
                                  cursor: isConfirmingVoiceRooms ? 'not-allowed' : 'pointer'
                                }}
                                onClick={handleConfirmDetectedRooms}
                                disabled={isConfirmingVoiceRooms || detectedVoiceRooms.filter(r => r.checked).length === 0}
                              >
                                {isConfirmingVoiceRooms ? (
                                  <>
                                    <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                                    <span>Creando ambientes...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={16} color="#ffffff" strokeWidth={2.4} />
                                    <span>Confirmar e incorporar {detectedVoiceRooms.filter(r => r.checked).length} ambientes</span>
                                  </>
                                )}
                              </button>

                              <button 
                                type="button" 
                                style={styles.reRecordBtn}
                                onClick={() => {
                                  setVoiceRoomPhase('idle');
                                  setVoiceRoomTime(0);
                                }}
                              >
                                <span>Volver a grabar</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---- PASO 2B: FLUJO MANUAL ---- */}
                    {addRoomMethod === 'manual' && (
                      <form onSubmit={handleAddRoomToPropertyDetail} style={styles.modalForm}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Nombre del ambiente *</label>
                          <input 
                            type="text"
                            placeholder="Ej: Quincho, Playroom, Lavadero..."
                            value={newDetailRoomName}
                            onChange={(e) => setNewDetailRoomName(e.target.value)}
                            style={styles.formInput}
                            autoFocus
                            required
                          />
                          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Podés ingresar varios separados por coma (ej: Quincho, Playroom, Lavadero)
                          </span>
                        </div>

                        <button type="submit" style={styles.submitPropertyBtn}>
                          <span>Crear ambiente</span>
                          <Plus size={16} color="#ffffff" strokeWidth={2.4} />
                        </button>
                      </form>
                    )}
              </BottomSheet>
            )}

            <div style={{ height: '70px' }} />
          </main>
        );
      })()}

      {/* ============ BOTTOM NAVBAR ============ */}
      <nav className="app-bottom-nav" style={styles.bottomNav}>
        {/* 1. Tab Home */}
        <button 
          className="app-nav-btn"
          style={styles.navBtn} 
          onClick={() => {
            setSelectedPropertyDetail(null);
            setSelectedRoomDetail(null);
            setActiveTab('home');
          }}
        >
          <Home 
            size={26} 
            color={activeTab === 'home' && !selectedPropertyDetail ? '#4f46e5' : '#94a3b8'} 
            strokeWidth={activeTab === 'home' && !selectedPropertyDetail ? 2.4 : 1.8} 
          />
          <span 
            className="app-nav-label"
            style={{ 
              ...styles.navLabel, 
              color: activeTab === 'home' && !selectedPropertyDetail ? '#4f46e5' : '#94a3b8', 
              fontWeight: activeTab === 'home' && !selectedPropertyDetail ? '700' : '600' 
            }}
          >
            Home
          </span>
          {activeTab === 'home' && !selectedPropertyDetail && <span style={styles.navActiveDot} />}
        </button>

        {/* 2. Botón Central: Crear (+) Negro, Minimalista y Proporcionado */}
        <div className="app-fab-wrapper" style={styles.fabWrapper}>
          <button 
            className="app-fab-button"
            style={styles.fabButton} 
            onClick={() => setIsModalOpen(true)}
            aria-label="Crear propiedad"
          >
            <Plus size={26} color="#ffffff" strokeWidth={2.4} />
          </button>
        </div>

        {/* 3. Tab Propiedades */}
        <button 
          className="app-nav-btn"
          style={styles.navBtn} 
          onClick={() => {
            setSelectedPropertyDetail(null);
            setSelectedRoomDetail(null);
            setActiveTab('propiedades');
          }}
        >
          <Building2 
            size={26} 
            color={activeTab === 'propiedades' && !selectedPropertyDetail ? '#4f46e5' : '#94a3b8'} 
            strokeWidth={activeTab === 'propiedades' && !selectedPropertyDetail ? 2.4 : 1.8} 
          />
          <span 
            className="app-nav-label"
            style={{ 
              ...styles.navLabel, 
              color: activeTab === 'propiedades' && !selectedPropertyDetail ? '#4f46e5' : '#94a3b8', 
              fontWeight: activeTab === 'propiedades' && !selectedPropertyDetail ? '700' : '600' 
            }}
          >
            Propiedades
          </span>
          {activeTab === 'propiedades' && !selectedPropertyDetail && <span style={styles.navActiveDot} />}
        </button>
      </nav>

      {/* ============ MODAL 1: CREAR PROPIEDAD (MODAL COMPLETO CON IA / LINK O MANUAL) ============ */}
      {isModalOpen && (
        <CreatePropertyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateProperty}
          agency={agency}
          onOpenAgencyEdit={() => {
            setActiveTab('home');
          }}
        />
      )}


      {/* ============ MODAL CONFIRMAR ELIMINAR PROPIEDAD ============ */}
      {isDeletePropertyModalOpen && selectedPropertyDetail && (
        <BottomSheet
          isOpen={isDeletePropertyModalOpen}
          onClose={() => !isDeletingProperty && setIsDeletePropertyModalOpen(false)}
          size="auto"
        >
            <div style={styles.deleteIconWrap}>
              <Trash2 size={24} color="#ef4444" strokeWidth={2.2} />
            </div>

            <h4 style={styles.deleteConfirmTitle}>¿Eliminar propiedad?</h4>
            <p style={styles.deleteConfirmDesc}>
              ¿Estás seguro de que deseas eliminar <strong>"{selectedPropertyDetail.name}"</strong>? Dejará de estar visible en tu listado de propiedades.
            </p>

            <div style={styles.deleteConfirmActions}>
              <button
                type="button"
                style={styles.deleteCancelBtn}
                onClick={() => setIsDeletePropertyModalOpen(false)}
                disabled={isDeletingProperty}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={styles.deleteConfirmSolidBtn}
                onClick={handleConfirmDeleteProperty}
                disabled={isDeletingProperty}
              >
                {isDeletingProperty ? (
                  <>
                    <Loader2 size={15} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} color="#ffffff" />
                    <span>Eliminar propiedad</span>
                  </>
                )}
              </button>
            </div>
        </BottomSheet>
      )}

      {/* ============ MODAL EDITAR PROPIEDAD ============ */}
      <EditPropertyModal
        isOpen={isEditPropertyModalOpen}
        onClose={() => setIsEditPropertyModalOpen(false)}
        property={selectedPropertyDetail}
        showToast={showToast}
        onPropertyUpdated={(updatedProp) => {
          setSelectedPropertyDetail(prev => ({
            ...prev,
            ...updatedProp,
            image: updatedProp.image_url || updatedProp.image || prev?.image,
            image_url: updatedProp.image_url || updatedProp.image || prev?.image_url
          }));
          setProperties(prev => prev.map(p => p.id === updatedProp.id ? { 
            ...p, 
            ...updatedProp,
            image: updatedProp.image_url || updatedProp.image || p.image,
            image_url: updatedProp.image_url || updatedProp.image || p.image_url
          } : p));
          setRecentProperties(prev => prev.map(p => p.id === updatedProp.id ? { 
            ...p, 
            ...updatedProp,
            image: updatedProp.image_url || updatedProp.image || p.image,
            image_url: updatedProp.image_url || updatedProp.image || p.image_url
          } : p));
        }}
      />

      {/* ============ MODAL 2: ACCIONES RÁPIDAS (PROPIEDAD -> AMBIENTE -> GRABAR/FOTOS/PLANOS) ============ */}
      {quickActionType && (
        <BottomSheet
          isOpen={!!quickActionType}
          onClose={closeQuickAction}
          title={getActionTitle()}
          subtitle={
            actionStep === 1 ? 'Seleccioná la propiedad para iniciar' :
            actionStep === 2 ? `Ambiente en ${selectedProperty?.name}` :
            `${selectedProperty?.name} • ${selectedRoom}`
          }
          size="full"
          headerExtra={
            !isDirectRoomAction ? (
              <div style={styles.stepTabsNav}>
                {/* Tab 1: Propiedad */}
                <button 
                  type="button"
                  style={{
                    ...styles.stepTabItem,
                    ...(actionStep === 1 ? styles.stepTabItemActive : {}),
                    ...(actionStep > 1 ? styles.stepTabItemDone : {})
                  }}
                  onClick={() => {
                    if (actionStep > 1) setActionStep(1);
                  }}
                >
                  <span style={{
                    ...styles.stepTabBadge,
                    ...(actionStep === 1 ? styles.stepTabBadgeActive : {}),
                    ...(actionStep > 1 ? styles.stepTabBadgeDone : {})
                  }}>
                    {actionStep > 1 ? <Check size={11} color="#ffffff" strokeWidth={3} /> : '1'}
                  </span>
                  <span style={{
                    ...styles.stepTabTitle,
                    ...(actionStep > 1 ? { color: '#0f172a' } : {})
                  }}>Propiedad</span>
                </button>

                <div style={styles.stepTabDivider} />

                {/* Tab 2: Ambiente */}
                <button 
                  type="button"
                  style={{
                    ...styles.stepTabItem,
                    ...(actionStep === 2 ? styles.stepTabItemActive : {}),
                    ...(actionStep > 2 ? styles.stepTabItemDone : {}),
                    ...(!selectedProperty ? styles.stepTabItemDisabled : {})
                  }}
                  onClick={() => {
                    if (selectedProperty && actionStep > 2) setActionStep(2);
                  }}
                  disabled={!selectedProperty}
                >
                  <span style={{
                    ...styles.stepTabBadge,
                    ...(actionStep === 2 ? styles.stepTabBadgeActive : {}),
                    ...(actionStep > 2 ? styles.stepTabBadgeDone : {})
                  }}>
                    {actionStep > 2 ? <Check size={11} color="#ffffff" strokeWidth={3} /> : '2'}
                  </span>
                  <span style={{
                    ...styles.stepTabTitle,
                    ...(actionStep > 2 ? { color: '#0f172a' } : {})
                  }}>Ambiente</span>
                </button>

                <div style={styles.stepTabDivider} />

                {/* Tab 3: Acción */}
                <button 
                  type="button"
                  style={{
                    ...styles.stepTabItem,
                    ...(actionStep === 3 ? styles.stepTabItemActive : {}),
                    ...(!selectedRoom ? styles.stepTabItemDisabled : {})
                  }}
                  disabled={!selectedRoom}
                >
                  <span style={{
                    ...styles.stepTabBadge,
                    ...(actionStep === 3 ? styles.stepTabBadgeActive : {})
                  }}>
                    3
                  </span>
                  <span style={styles.stepTabTitle}>
                    {quickActionType === 'voice' ? 'Dictado' : quickActionType === 'photos' ? 'Fotos' : 'Plano'}
                  </span>
                </button>
              </div>
            ) : null
          }
        >
              {/* ---- PASO 1: SELECCIONAR PROPIEDAD ---- */}
            {actionStep === 1 && (
              <div style={styles.stepContainer}>
                {properties.length > 0 ? (
                  <>
                    {/* Barra de Búsqueda instantánea para filtrar entre 100+ propiedades */}
                    <div style={styles.searchBarContainer}>
                      <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <input 
                        type="text"
                        placeholder="Buscar por nombre o dirección..."
                        value={propertySearchQuery}
                        onChange={(e) => {
                          setPropertySearchQuery(e.target.value);
                          setPropertyPage(1);
                        }}
                        style={styles.searchBarInput}
                      />
                      {propertySearchQuery && (
                        <button 
                          type="button"
                          style={styles.searchClearBtn}
                          onClick={() => {
                            setPropertySearchQuery('');
                            setPropertyPage(1);
                          }}
                        >
                          <X size={13} color="#64748b" />
                        </button>
                      )}
                    </div>

                    {/* Metadatos: Contador y estado */}
                    <div style={styles.listMetaRow}>
                      <span style={styles.listCountText}>
                        {filteredProperties.length} {filteredProperties.length === 1 ? 'propiedad' : 'propiedades'}
                        {propertySearchQuery && ` para "${propertySearchQuery}"`}
                      </span>
                      {totalPages > 1 && (
                        <span style={styles.listPageBadge}>
                          Pág. {safePage} de {totalPages}
                        </span>
                      )}
                    </div>

                    {/* Lista Compacta de propiedades (Estilo tabla elegante) */}
                    {paginatedProperties.length > 0 ? (
                      <div className="app-compact-list-scroll" style={styles.compactListWrapper}>
                        {paginatedProperties.map((prop, idx) => {
                          const hasPhoto = Boolean(prop.image || prop.image_url);
                          return (
                            <div 
                              key={prop.id} 
                              style={{
                                ...styles.compactListItem,
                                borderBottom: idx === paginatedProperties.length - 1 ? 'none' : '1px solid #f1f5f9'
                              }}
                              onClick={() => handleSelectProperty(prop)}
                            >
                              <img 
                                src={hasPhoto ? (prop.image || prop.image_url) : placeholderHorizontal} 
                                alt={prop.name} 
                                style={{
                                  ...styles.compactListThumb,
                                  objectPosition: hasPhoto ? 'center' : 'right',
                                }} 
                                onError={(e) => {
                                  if (e.target.src !== placeholderHorizontal) {
                                    e.target.src = placeholderHorizontal;
                                    e.target.style.objectPosition = 'right';
                                  }
                                }}
                              />
                            
                            <div style={styles.compactListInfo}>
                              <h4 style={styles.compactListTitle}>{prop.name}</h4>
                              {prop.address && <p style={styles.compactListAddress}>{prop.address}</p>}
                            </div>

                            <div style={styles.compactListRight}>
                              {prop.rooms && (
                                <span style={styles.compactRoomsBadge}>
                                  {prop.rooms.length} amb.
                                </span>
                              )}
                              <ChevronRight size={15} color="#94a3b8" />
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    ) : (
                      <div style={styles.noResultsBox}>
                        <p style={styles.noResultsText}>No se encontraron propiedades para "{propertySearchQuery}"</p>
                        <button 
                          type="button" 
                          style={styles.clearSearchFilterBtn}
                          onClick={() => setPropertySearchQuery('')}
                        >
                          Limpiar búsqueda
                        </button>
                      </div>
                    )}

                    {/* Numeración de tabs de páginas (Paginación fija al fondo) */}
                    <div style={styles.paginationTabsRow}>
                      <button 
                        type="button"
                        style={{
                          ...styles.pageNavBtn,
                          ...(safePage <= 1 || totalPages <= 1 ? styles.pageNavBtnDisabled : {})
                        }}
                        onClick={() => setPropertyPage(prev => Math.max(1, prev - 1))}
                        disabled={safePage <= 1 || totalPages <= 1}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div style={styles.pageNumberTabs}>
                        {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((pageNum) => (
                          <button 
                            key={pageNum}
                            type="button"
                            style={{
                              ...styles.pageTabBtn,
                              ...(safePage === pageNum ? styles.pageTabBtnActive : {})
                            }}
                            onClick={() => setPropertyPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      <button 
                        type="button"
                        style={{
                          ...styles.pageNavBtn,
                          ...(safePage >= totalPages || totalPages <= 1 ? styles.pageNavBtnDisabled : {})
                        }}
                        onClick={() => setPropertyPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={safePage >= totalPages || totalPages <= 1}
                        aria-label="Página siguiente"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={styles.actionEmptyNotice}>
                    <Building size={32} color="#94a3b8" />
                    <p style={styles.actionEmptyText}>
                      No tenés propiedades cargadas todavía. Creá una primero para iniciar el relevamiento.
                    </p>
                    <button 
                      style={styles.actionCreatePropBtn}
                      onClick={() => {
                        closeQuickAction();
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus size={16} color="#ffffff" />
                      <span>Crear primera propiedad</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ---- PASO 2: SELECCIONAR AMBIENTE ---- */}
            {actionStep === 2 && selectedProperty && (
              <div style={styles.stepContainer}>
                <button 
                  style={styles.stepBackBtn}
                  onClick={() => setActionStep(1)}
                >
                  <ChevronLeft size={16} color="#4f46e5" />
                  <span>Volver</span>
                </button>

                <div style={styles.roomsGrid}>
                  {(selectedProperty.rooms || []).map((room) => (
                    <button 
                      key={room}
                      style={styles.roomSelectChip}
                      onClick={() => handleSelectRoom(room)}
                    >
                      <span>{room}</span>
                      <ChevronRight size={14} color="#64748b" />
                    </button>
                  ))}
                  {(!selectedProperty.rooms || selectedProperty.rooms.length === 0) && (
                    <p style={{ fontSize: '12px', color: '#64748b', gridColumn: '1 / -1', margin: '4px 0 10px 0' }}>
                      Esta propiedad no tiene ambientes cargados aún. Agrega uno a continuación:
                    </p>
                  )}
                </div>

                {/* Opción de agregar ambiente personalizado */}
                {isAddingCustomRoom ? (
                  <form onSubmit={handleAddCustomRoom} style={styles.customRoomForm}>
                    <input 
                      type="text"
                      placeholder="Nombre del ambiente (ej: Quincho, Playroom)..."
                      value={customRoomInput}
                      onChange={(e) => setCustomRoomInput(e.target.value)}
                      style={styles.formInput}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" style={styles.saveCustomRoomBtn}>
                        <span>Agregar y continuar</span>
                      </button>
                      <button 
                        type="button" 
                        style={styles.cancelCustomRoomBtn}
                        onClick={() => setIsAddingCustomRoom(false)}
                      >
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <button 
                    style={styles.addCustomRoomTrigger}
                    onClick={() => setIsAddingCustomRoom(true)}
                  >
                    <Plus size={15} color="#4f46e5" strokeWidth={2.4} />
                    <span>Agregar otro ambiente</span>
                  </button>
                )}
              </div>
            )}

            {/* ---- PASO 3: INICIAR ACCIÓN (GRABAR / FOTOS / PLANOS) ---- */}
            {actionStep === 3 && selectedProperty && selectedRoom && (
              <div style={styles.step3Container}>
                {/* Botón Volver fijo arriba - solo si NO es acción directa desde ambiente */}
                {!isDirectRoomAction && (
                  <div style={styles.step3HeaderSticky}>
                    <button 
                      style={styles.stepBackBtn}
                      onClick={() => setActionStep(2)}
                    >
                      <ChevronLeft size={16} color="#4f46e5" />
                      <span>Volver</span>
                    </button>
                  </div>
                )}

                {/* Contenedor scrolleable completo desde abajo de Volver */}
                <div style={styles.step3ScrollContent}>
                  {/* Sub-vista A: DICTADO POR VOZ */}
                  {quickActionType === 'voice' && (
                    <div style={styles.voiceFlowWrapper}>
                      {/* FASE 1: IDLE / LISTO PARA DICTAR */}
                      {voicePhase === 'idle' && (
                        <div style={styles.readyRecordBox}>
                          <button 
                            type="button"
                            style={styles.micRecordButton}
                            onClick={handleStartRecording}
                          >
                            <Mic size={36} color="#ffffff" strokeWidth={2.4} />
                          </button>
                          <h4 style={styles.recordActionTitle}>Tocar para comenzar a dictar</h4>
                          <p style={styles.recordActionHint}>
                            Caminá por el ambiente y describí en voz alta los elementos, materiales y su estado.
                          </p>
                        </div>
                      )}

                      {/* FASE 2: GRABANDO EN VIVO */}
                      {voicePhase === 'recording' && (
                        <div style={styles.recordingActiveBox}>
                          {/* Indicador de grabación en vivo */}
                          <div style={styles.recordingTimerRow}>
                            <span style={{
                              ...styles.liveRecordDot,
                              backgroundColor: recordingTime >= 50 ? '#f59e0b' : '#ef4444'
                            }} />
                            <span style={{
                              ...styles.recordingTimerText,
                              color: recordingTime >= 50 ? '#ea580c' : '#0f172a'
                            }}>
                              {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginLeft: '6px' }}>/ 01:00</span>
                            </span>
                          </div>

                          {/* Animación de ondas de sonido elegantes */}
                          <div style={styles.soundWaveRow}>
                            <span style={{ ...styles.waveBar, height: '24px', animationDelay: '0s' }} />
                            <span style={{ ...styles.waveBar, height: '40px', animationDelay: '0.15s' }} />
                            <span style={{ ...styles.waveBar, height: '18px', animationDelay: '0.3s' }} />
                            <span style={{ ...styles.waveBar, height: '36px', animationDelay: '0.1s' }} />
                            <span style={{ ...styles.waveBar, height: '28px', animationDelay: '0.25s' }} />
                          </div>

                          <p style={styles.transcriptionPreview}>
                            {recordingTime >= 50
                              ? '⚠️ Quedan pocos segundos. Se procesará automáticamente al minuto.'
                              : `"Escuchando: ${selectedRoom || 'el ambiente'}... describiendo elementos y terminaciones"`}
                          </p>

                          {/* Botón sobrio y elegante para detener (NO ROJO) */}
                          <button 
                            type="button"
                            style={styles.stopRecordSleekBtn}
                            onClick={handleStopVoiceRecording}
                          >
                            <div style={styles.stopSquareIndicator} />
                            <span>Finalizar dictado</span>
                          </button>
                        </div>
                      )}

                      {/* FASE 3: PROCESANDO */}
                      {voicePhase === 'processing' && (
                        <div style={styles.aiProcessingBox}>
                          <div style={styles.aiProcessingIconWrap}>
                            <Loader2 size={26} color="#0f172a" style={{ animation: 'spin 1s linear infinite' }} />
                          </div>
                          <h4 style={styles.aiProcessingTitle}>Procesando dictado...</h4>
                          <p style={styles.aiProcessingSub}>Extrayendo elementos, materiales y estados para {selectedRoom}</p>
                        </div>
                      )}

                      {/* FASE 4: REVISIÓN DE TRANSCRIPCIÓN E ÍTEMS PARA CONFIRMAR */}
                      {voicePhase === 'review' && (
                        <div style={styles.reviewContentBlock}>
                          {/* Transcripción generada */}
                          <div style={styles.transcriptCard}>
                            <span style={styles.transcriptLabel}>Transcripción del audio:</span>
                            <p style={styles.transcriptQuote}>"{transcribedText}"</p>
                          </div>

                          {/* Checklist de ítems detectados */}
                          <div style={styles.extractedItemsGroup}>
                            <span style={styles.extractedGroupLabel}>
                              Ítems a incorporar ({extractedItems.filter(i => i.checked).length} de {extractedItems.length}):
                            </span>

                            <div style={styles.itemsChecklist}>
                              {extractedItems.map((item) => (
                                editingItemId === item.id ? (
                                  <div 
                                    key={item.id}
                                    style={styles.itemEditCard}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div style={styles.editCardHeader}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Pencil size={13} color="#0f172a" strokeWidth={2.4} />
                                        <span style={styles.editCardTitle}>Editar ítem</span>
                                      </div>
                                      <button 
                                        type="button" 
                                        style={styles.cancelEditIconBtn}
                                        onClick={handleCancelEditItem}
                                        title="Cerrar edición"
                                      >
                                        <X size={14} color="#64748b" />
                                      </button>
                                    </div>

                                    <div style={styles.editFormGrid}>
                                      <div style={{ ...styles.editFieldGroup, flex: 1 }}>
                                        <label style={styles.editFieldLabel}>Nombre</label>
                                        <input 
                                          type="text"
                                          value={editItemForm.name}
                                          onChange={(e) => setEditItemForm(prev => ({ ...prev, name: e.target.value }))}
                                          style={styles.editTextInput}
                                          placeholder="Nombre del elemento"
                                        />
                                      </div>

                                      <div style={{ ...styles.editFieldGroup, width: '70px' }}>
                                        <label style={styles.editFieldLabel}>Cantidad</label>
                                        <input 
                                          type="number"
                                          min="1"
                                          value={editItemForm.quantity}
                                          onChange={(e) => setEditItemForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                                          style={styles.editNumberInput}
                                        />
                                      </div>

                                      <div style={{ ...styles.editFieldGroup, minWidth: '130px', flex: 1 }}>
                                        <label style={styles.editFieldLabel}>Estado</label>
                                        <select
                                          value={editItemForm.status || ''}
                                          onChange={(e) => setEditItemForm(prev => ({ ...prev, status: e.target.value }))}
                                          style={styles.editTextInput}
                                        >
                                          <option value="">Sin especificar</option>
                                          <option value="Óptimo">Óptimo</option>
                                          <option value="Muy Bueno">Muy Bueno</option>
                                          <option value="Bueno">Bueno</option>
                                          <option value="Regular">Regular</option>
                                          <option value="Con detalles">Con detalles</option>
                                          <option value="Malo">Malo</option>
                                          <option value="Con humedad">Con humedad</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div style={styles.editFieldGroup}>
                                      <label style={styles.editFieldLabel}>Descripción</label>
                                      <textarea 
                                        value={editItemForm.description}
                                        onChange={(e) => setEditItemForm(prev => ({ ...prev, description: e.target.value }))}
                                        style={styles.editTextarea}
                                        rows={2}
                                        placeholder="Materiales, detalles y estado de conservación..."
                                      />
                                    </div>

                                    <div style={styles.editActionsRow}>
                                      <button 
                                        type="button" 
                                        style={styles.saveEditBtn}
                                        onClick={handleSaveEditItem}
                                      >
                                        <Check size={14} color="#ffffff" strokeWidth={2.5} />
                                        <span>Guardar</span>
                                      </button>
                                      <button 
                                        type="button" 
                                        style={styles.dismissEditBtn}
                                        onClick={handleCancelEditItem}
                                      >
                                        <span>Cancelar</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    key={item.id}
                                    style={{
                                      ...styles.itemCheckRow,
                                      backgroundColor: item.checked ? '#ffffff' : '#f8fafc',
                                      borderColor: item.checked ? '#cbd5e1' : '#f1f5f9',
                                      opacity: item.checked ? 1 : 0.6,
                                    }}
                                    onClick={() => handleToggleExtractedItem(item.id)}
                                  >
                                    <div style={{
                                      ...styles.customCheckbox,
                                      backgroundColor: item.checked ? '#0f172a' : '#ffffff',
                                      borderColor: item.checked ? '#0f172a' : '#cbd5e1'
                                    }}>
                                      {item.checked && <Check size={11} color="#ffffff" strokeWidth={3} />}
                                    </div>

                                    <div style={styles.itemCheckInfo}>
                                      <div style={styles.itemHeaderRow}>
                                        <span style={styles.itemCheckName}>{item.name}</span>
                                        
                                        <div 
                                          style={styles.itemActionsRight}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <span style={styles.itemQtyBadge}>x{item.quantity}</span>
                                          {item.status && (
                                            <span style={{
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              padding: '2px 7px',
                                              borderRadius: '6px',
                                              backgroundColor: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#ecfdf5' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fef2f2' : '#f8fafc',
                                              color: item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#059669' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#dc2626' : '#64748b',
                                              border: `1px solid ${item.status.toLowerCase().includes('óptimo') || item.status.toLowerCase().includes('bueno') ? '#a7f3d0' : item.status.toLowerCase().includes('malo') || item.status.toLowerCase().includes('humedad') ? '#fecaca' : '#e2e8f0'}`,
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {item.status}
                                            </span>
                                          )}
                                          <button 
                                            type="button"
                                            style={styles.editItemBtn}
                                            onClick={() => handleStartEditItem(item)}
                                            title="Editar ítem"
                                            aria-label="Editar ítem"
                                          >
                                            <Pencil size={12} color="#475569" strokeWidth={2.2} />
                                          </button>
                                        </div>
                                      </div>

                                      <p style={styles.itemCheckDescription}>{item.description}</p>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>

                          {/* Acciones finales */}
                          <div style={styles.reviewActionsCol}>
                            <button 
                              type="button"
                              style={{
                                ...styles.confirmItemsBtn,
                                opacity: isConfirmingVoiceItems ? 0.75 : 1,
                                cursor: isConfirmingVoiceItems ? 'not-allowed' : 'pointer'
                              }}
                              onClick={handleConfirmVoiceItems}
                              disabled={isConfirmingVoiceItems || extractedItems.filter(i => i.checked).length === 0}
                            >
                              {isConfirmingVoiceItems ? (
                                <>
                                  <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                                  <span>Guardando ítems...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={16} color="#ffffff" strokeWidth={2.4} />
                                  <span>Confirmar e incorporar al inventario</span>
                                </>
                              )}
                            </button>

                            <button 
                              type="button"
                              style={styles.reRecordBtn}
                              onClick={() => {
                                setVoicePhase('idle');
                                setRecordingTime(0);
                              }}
                            >
                              <span>Volver a grabar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* Sub-vista B: CARGAR FOTOS */}
                {quickActionType === 'photos' && (
                  <div style={styles.actionPlayground}>
                    <input 
                      type="file" 
                      ref={roomPhotoInputRef} 
                      accept="image/*" 
                      multiple 
                      style={{ display: 'none' }} 
                      onChange={handleRoomPhotosChange}
                    />

                    {roomPhotos.length === 0 ? (
                      <div style={styles.readyRecordBox}>
                        <h4 style={styles.recordActionTitle}>Tomar o subir fotos de {selectedRoom}</h4>
                        <p style={styles.recordActionHint}>
                          Podés sacar varias fotos de corrido. La IA detectará artefactos, acabados y detalles automáticamente.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenCamera('room')}
                            style={{
                              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                              padding: '16px 8px', borderRadius: '14px', border: '2px dashed #c7d2fe',
                              backgroundColor: '#f0f4ff', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <Camera size={24} color="#0284c7" strokeWidth={2.2} />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Tomar fotos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => roomPhotoInputRef.current?.click()}
                            style={{
                              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                              padding: '16px 8px', borderRadius: '14px', border: '2px dashed #c7d2fe',
                              backgroundColor: '#f8f9ff', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <Images size={24} color="#4f46e5" strokeWidth={2.2} />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Galería</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                            Fotos seleccionadas ({roomPhotos.length})
                          </span>
                          <button 
                            type="button" 
                            onClick={() => roomPhotoInputRef.current?.click()}
                            style={styles.addMorePhotosBtn}
                          >
                            <Plus size={14} />
                            <span>Agregar más</span>
                          </button>
                        </div>

                        <div style={styles.photosGridPreview}>
                          {roomPhotos.map((item, idx) => {
                            const imgSrc = typeof item === 'string' ? item : item.url;
                            return (
                              <div key={idx} style={{ ...styles.photoThumbWrapper, position: 'relative' }}>
                                <img src={imgSrc} alt={`Foto ${idx + 1}`} style={styles.photoThumbImg} />
                                {item.wasOptimized && (
                                  <span style={{
                                    position: 'absolute',
                                    bottom: '3px',
                                    left: '3px',
                                    background: 'rgba(79, 70, 229, 0.92)',
                                    color: '#ffffff',
                                    fontSize: '8px',
                                    fontWeight: '800',
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    lineHeight: 1.2,
                                  }} title="Optimizada >1MB">⚡ &gt;1MB</span>
                                )}
                                <button 
                                  type="button" 
                                  style={styles.removePhotoBtn}
                                  onClick={() => handleRemovePhoto(idx)}
                                  title="Quitar foto"
                                >
                                  <X size={12} color="#ffffff" />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <button 
                          type="button"
                          style={styles.submitPropertyBtn}
                          onClick={() => {
                            if (!selectedProperty || roomPhotos.length === 0) return;
                            const targetRoom = selectedRoom || (selectedProperty?.rooms?.[0] || 'General');
                            const filesToQueue = roomPhotos.map((p) => ({
                              file: p.file || p,
                              name: p.name || 'foto.jpg',
                              size: p.size || 0,
                              originalSize: p.originalSize || 0,
                              wasOptimized: p.wasOptimized,
                            }));

                            closeQuickAction();

                            photoUploadService.queuePhotos({
                              files: filesToQueue,
                              property_id: selectedProperty.id,
                              user_id: currentUserId,
                              room: targetRoom,
                              method: 'upload',
                            });
                          }}
                        >
                          <Upload size={16} />
                          <span>Subir {roomPhotos.length} fotos a {selectedRoom}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-vista C: PLANOS */}
                {quickActionType === 'plans' && (
                  <div style={styles.actionPlayground}>
                    <input 
                      type="file" 
                      ref={planFileInputRef} 
                      accept="image/*,application/pdf" 
                      style={{ display: 'none' }} 
                      onChange={handlePlanFileChange}
                    />

                    {!generatedPlan && !uploadedPlanFile ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Opción 1: Generar croquis con medidas */}
                        <div style={styles.planCardOption}>
                          <div style={styles.planOptionHeader}>
                            <div style={styles.planOptionIcon}>
                              <Ruler size={20} color="#4f46e5" />
                            </div>
                            <div>
                              <h4 style={styles.planOptionTitle}>Generar croquis con medidas</h4>
                              <p style={styles.planOptionDesc}>Ingresá el largo y ancho de {selectedRoom}</p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={styles.measureLabel}>Largo (m)</label>
                              <input 
                                type="text" 
                                value={roomLength} 
                                onChange={(e) => setRoomLength(e.target.value)}
                                style={styles.measureInput} 
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={styles.measureLabel}>Ancho (m)</label>
                              <input 
                                type="text" 
                                value={roomWidth} 
                                onChange={(e) => setRoomWidth(e.target.value)}
                                style={styles.measureInput} 
                              />
                            </div>
                          </div>

                          <button 
                            type="button" 
                            style={styles.generatePlanBtn}
                            onClick={() => setGeneratedPlan(true)}
                          >
                            <span>Generar croquis 2D</span>
                            <ChevronRight size={15} />
                          </button>
                        </div>

                        {/* Separador */}
                        <div style={styles.orDivider}>
                          <span>o también</span>
                        </div>

                        {/* Opción 2: Subir archivo */}
                        <div 
                          style={styles.uploadPlanBox}
                          onClick={() => planFileInputRef.current?.click()}
                        >
                          <Upload size={22} color="#4f46e5" />
                          <span style={styles.uploadPlanTitle}>Subir plano o foto de croquis en papel</span>
                          <span style={styles.uploadPlanSub}>Formatos JPG, PNG o PDF</span>
                        </div>
                      </div>
                    ) : generatedPlan ? (
                      /* Croquis 2D generado */
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                        <div style={styles.blueprintContainer}>
                          <div style={styles.cotaTop}>{roomLength} m</div>
                          <div style={styles.blueprintRoomBox}>
                            <div style={styles.blueprintDoor} />
                            <div style={styles.blueprintWindow} />
                            <span style={styles.blueprintRoomName}>{selectedRoom}</span>
                            <span style={styles.blueprintArea}>
                              {(parseFloat(roomLength || 0) * parseFloat(roomWidth || 0)).toFixed(1)} m²
                            </span>
                          </div>
                          <div style={styles.cotaRight}>{roomWidth} m</div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button 
                            type="button"
                            style={styles.submitPropertyBtn}
                            onClick={() => {
                              closeQuickAction();
                              toast.success(`¡Croquis de ${selectedRoom} guardado en el inventario!`);
                            }}
                          >
                            <Check size={16} />
                            <span>Guardar croquis</span>
                          </button>
                          <button 
                            type="button" 
                            style={styles.cancelCustomRoomBtn}
                            onClick={() => setGeneratedPlan(false)}
                          >
                            <span>Reajustar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Archivo subido */
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                        <img src={uploadedPlanFile} alt="Plano subido" style={styles.uploadedPlanPreview} />
                        <button 
                          type="button"
                          style={styles.submitPropertyBtn}
                          onClick={() => {
                            closeQuickAction();
                            toast.success(`¡Plano de ${selectedRoom} guardado exitosamente!`);
                          }}
                        >
                          <Check size={16} />
                          <span>Guardar plano cargado</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                </div>
              </div>
            )}


        </BottomSheet>
      )}

      {/* ============ CÁMARA IN-APP PARA CAPTURA MÚLTIPLE ============ */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotosReady={handleCameraPhotosReady}
        maxPhotos={20 - photoItemFiles.length}
      />

      {/* ============ SUPER EDITOR MÓVIL DE PLANO A PANTALLA COMPLETA ============ */}
      {isFloorPlanEditorOpen && selectedPropertyDetail && (
        <MobileFloorPlanEditor
          property={selectedPropertyDetail}
          initialPlan={selectedPropertyDetail?.floorPlan}
          onSave={handleSaveFloorPlan}
          onClose={() => setIsFloorPlanEditorOpen(false)}
        />
      )}

      {/* ============ MODAL DE CONFIGURACIÓN Y EXPORTACIÓN DE PDF ============ */}
      {isExportPdfModalOpen && selectedPropertyDetail && (
        <ExportPdfModal
          isOpen={isExportPdfModalOpen}
          onClose={() => setIsExportPdfModalOpen(false)}
          property={selectedPropertyDetail}
          userId={authUser?.id || selectedPropertyDetail?.user_id}
          inventory={selectedPropertyDetail.inventory || getPropertyInventory(selectedPropertyDetail) || {}}
          photos={selectedPropertyDetail.photos || getPropertyPhotos(selectedPropertyDetail) || []}
          logo={logo}
          onUpdateProperty={(propertyId, updates) => {
            setSelectedPropertyDetail(prev => prev && prev.id === propertyId ? { ...prev, ...updates } : prev);
            setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, ...updates } : p));
          }}
        />
      )}

      {/* ============ MODAL DE COMPARTIR PROPIEDAD INTERNAMENTE CON COLEGAS ============ */}
      {isShareModalOpen && selectedPropertyDetail && (
        <SharePropertyModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          property={selectedPropertyDetail}
          agents={agents}
          agency={agency}
          onUpdateSharedWith={async (propertyId, sharedAgentIds) => {
            const res = await propertyService.shareProperty(propertyId, sharedAgentIds);
            if (!res || res.success === false) {
              const errorMsg = res?.message || res?.error || 'Error al guardar cambios de compartir en el servidor';
              throw new Error(errorMsg);
            }

            const count = sharedAgentIds.length;
            setSelectedPropertyDetail(prev => prev && prev.id === propertyId ? { 
              ...prev, 
              sharedWith: sharedAgentIds,
              sharedUsers: sharedAgentIds,
              shared_users: sharedAgentIds,
              sharedCount: count,
            } : prev);
            setProperties(prev => prev.map(p => p.id === propertyId ? { 
              ...p, 
              sharedWith: sharedAgentIds,
              sharedUsers: sharedAgentIds,
              shared_users: sharedAgentIds,
              sharedCount: count,
            } : p));

            return res;
          }}
        />
      )}

      {/* ============ WIDGET FLOTANTE DE PROGRESO DE FOTOS EN BACKGROUND ============ */}
      <PhotoUploadProgress onPhotoUploaded={handlePhotoUploaded} />

    </div>
  );
}

const styles = {
  appContainer: {
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    position: 'relative',
    boxShadow: '0 0 40px rgba(0, 0, 0, 0.05)',
  },

  /* Top Bar */
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid #f1f5f9',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  logo: {
    height: '30px',
    objectFit: 'contain',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  /* Menú lateral modal */
  menuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  menuDrawer: {
    width: '280px',
    height: '100%',
    maxHeight: '100%',
    backgroundColor: '#ffffff',
    padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 20px calc(env(safe-area-inset-bottom, 0px) + 24px) 20px',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  menuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
  },
  menuTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  menuCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
  },
  menuContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  menuActionBtn: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
  },
  drawerUserCard: {
    padding: '12px 14px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },
  drawerUserAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  drawerUserInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  drawerUserName: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  drawerUserEmail: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  drawerNavList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  drawerNavBtn: {
    width: '100%',
    height: '44px',
    padding: '0 12px',
    borderRadius: '12px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13.5px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  drawerDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '12px 0',
  },
  drawerLogoutBtn: {
    width: '100%',
    height: '44px',
    padding: '0 14px',
    borderRadius: '12px',
    border: '1px solid #fee2e2',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  roleBtnActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
  },

  /* Contenido principal */
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingTop: '16px',
  },

  /* Sección */
  section: {
    marginBottom: '28px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '19px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.3px',
  },
  verTodasBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#eef2ff',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 12px',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },

  /* Carrusel con propiedades */
  cardsCarousel: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    padding: '4px 20px 12px 20px',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
  },
  card: {
    flex: '0 0 295px',
    width: '295px',
    height: '390px',
    borderRadius: '24px',
    overflow: 'hidden',
    position: 'relative',
    scrollSnapAlign: 'center',
    backgroundColor: '#0f172a',
    boxShadow: '0 12px 30px -6px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  cardImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 1,
  },
  cardVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0) 45%, rgba(15, 23, 42, 0.5) 68%, rgba(15, 23, 42, 0.92) 100%)',
    zIndex: 2,
  },
  cardBottom: {
    position: 'relative',
    zIndex: 3,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '-0.4px',
    lineHeight: '1.2',
  },
  cardAddressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '10px',
  },
  cardAddress: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  adminBtn: {
    width: '100%',
    padding: '13px 18px',
    borderRadius: '16px',
    border: 'none',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '1.2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
    transition: 'all 0.15s ease',
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    transition: 'all 0.2s ease',
  },
  activeDot: {
    width: '20px',
    borderRadius: '6px',
    backgroundColor: '#4f46e5',
  },

  /* Estado vacío */
  emptyContainer: {
    padding: '0 20px',
  },
  dashedCard: {
    backgroundColor: '#f8fafc',
    border: '1.5px dashed #cbd5e1',
    borderRadius: '20px',
    padding: '32px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dashedIconCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  },
  dashedTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dashedTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  dashedSubtitle: {
    fontSize: '13px',
    color: '#64748b',
  },
  dashedBadge: {
    padding: '7px 14px',
    borderRadius: '20px',
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    marginTop: '4px',
  },

  /* Acciones Rápidas */
  quickSection: {
    padding: '0 20px',
    marginBottom: '26px',
  },
  quickSectionHeader: {
    marginBottom: '12px',
  },
  quickSectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  quickGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  quickCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '13px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  quickIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickInfo: {
    flex: 1,
  },
  quickCardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  quickCardDesc: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },

  /* Vista Propiedades Tab */
  tabHeader: {
    padding: '0 20px',
    marginBottom: '16px',
  },
  tabSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px',
  },
  propertiesScopeTabs: {
    display: 'flex',
    gap: '6px',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '14px',
    marginBottom: '4px',
  },
  propertiesScopeTab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '8px 12px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    whiteSpace: 'nowrap',
  },
  propertiesScopeTabActive: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontWeight: '700',
    boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
  },
  propertiesScopeTabInactive: {
    backgroundColor: 'transparent',
    color: '#64748b',
  },
  scopeCountBadgeActive: {
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    padding: '2px 7px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
  },
  scopeCountBadgeInactive: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    padding: '2px 7px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
  },
  emptySharedCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  emptySharedIconCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px',
  },
  tabControlsContainer: {
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '14px',
  },
  tabFilterBar: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  tabSearchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    minWidth: 0,
  },
  tabSearchInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13px',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
    minWidth: 0,
  },
  tabSortSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 10px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  tabSortSelect: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  },
  tabListMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2px',
  },
  tabListCountText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  tabListPageBadge: {
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#94a3b8',
  },
  propRoomsTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: '2px 7px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: '15px',
  },
  tabPaginationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '20px',
    padding: '0 20px',
  },
  progressiveLoadContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '16px',
    marginBottom: '28px',
    padding: '0 20px',
    width: '100%',
  },
  infiniteSentinel: {
    width: '100%',
    height: '4px',
    opacity: 0,
    pointerEvents: 'none',
  },
  loadMorePillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    maxWidth: '340px',
    padding: '12px 18px',
    backgroundColor: '#ffffff',
    color: '#4f46e5',
    border: '1.5px solid #e0e7ff',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(79, 70, 229, 0.08)',
    transition: 'all 0.15s ease',
  },
  progressTrackerWrapper: {
    width: '100%',
    maxWidth: '180px',
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressTrackerFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: '999px',
    transition: 'width 0.3s ease',
  },
  tabAllLoadedBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 18px',
    backgroundColor: '#f0fdf4',
    color: '#166534',
    borderRadius: '14px',
    border: '1px solid #bbf7d0',
    fontSize: '12.5px',
    fontWeight: '600',
  },
  backToTopFab: {
    position: 'fixed',
    bottom: '88px',
    right: '20px',
    zIndex: 90,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 15px',
    borderRadius: '999px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.25)',
    cursor: 'pointer',
  },
  backToTopFabText: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.2px',
  },
  tabContentList: {
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  propertyListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px',
    borderRadius: '18px',
    border: '1px solid #f1f5f9',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
  },
  propertyThumb: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  propertyListInfo: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  propertyListTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: 0,
    lineHeight: 1.25,
  },
  propertyListAddress: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
    marginBottom: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    lineHeight: 1.25,
  },
  propertyListMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  propSharedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 5px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    color: '#4338ca',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid #c7d2fe',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: '15px',
  },
  propSharedByMeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    borderRadius: '6px',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid #bbf7d0',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: '15px',
  },
  adminMiniBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    background: '#eef2ff',
    border: 'none',
    borderRadius: '12px',
    padding: '8px 12px',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    flexShrink: 0,
  },

  /* ============ BOTTOM NAVBAR ============ */
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingLeft: '24px',
    paddingRight: '24px',
    paddingTop: '10px',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    borderTop: 'none',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
  },
  navBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '84px',
    padding: '4px 0',
    position: 'relative',
  },
  navLabel: {
    fontSize: '12.5px',
    letterSpacing: '-0.2px',
  },
  navActiveDot: {
    position: 'absolute',
    bottom: '-3px',
    width: '4.5px',
    height: '4.5px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
  },
  fabWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: '-14px',
  },
  fabButton: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.25)',
    transition: 'transform 0.15s ease',
  },

  /* ============ MODAL BOTTOM SHEETS ============ */
  /* ============ MODAL BOTTOM SHEETS ============ */
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    zIndex: 150,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: 'min(90vh, 700px)',
    minHeight: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '12px 20px 24px 20px',
    boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  quickActionModalSheet: {
    width: '100%',
    maxWidth: '520px',
    height: 'calc(100dvh - 54px)',
    minHeight: 'calc(100dvh - 54px)',
    maxHeight: 'calc(100dvh - 54px)',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '12px 20px 20px 20px',
    boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalContentBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    minHeight: 0,
    marginTop: '4px',
    paddingRight: '2px',
    paddingBottom: '12px',
  },
  modalHeader: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '14px',
  },
  modalHandle: {
    width: '38px',
    height: '4px',
    borderRadius: '4px',
    backgroundColor: '#cbd5e1',
    marginBottom: '14px',
    flexShrink: 0,
  },
  modalTitleRow: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  modalSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '3px',
  },
  modalCloseBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
  },
  formInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '14px',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
  },
  uploadDropzone: {
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    border: '1.5px dashed #cbd5e1',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  uploadIconCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  uploadTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadSubtitle: {
    fontSize: '11px',
    color: '#64748b',
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: '100%',
    height: '140px',
    borderRadius: '14px',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    border: 'none',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  submitPropertyBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    marginTop: '6px',
  },

  /* ============ ESTILOS DE ACCIONES RÁPIDAS (PASOS 1, 2 Y 3) ============ */
  stepContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    flex: '1 1 auto',
    minHeight: 0,
  },
  step3Container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  step3HeaderSticky: {
    flexShrink: 0,
    paddingBottom: '4px',
    position: 'sticky',
    top: 0,
    zIndex: 5,
    backgroundColor: '#ffffff',
  },
  step3ScrollContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    paddingBottom: '0',
  },
  voiceFlowWrapper: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  stepBackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '4px 0',
    alignSelf: 'flex-start',
  },
  /* Pestañas numeradas de pasos (Tabs 1, 2, 3) */
  stepTabsNav: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px',
    backgroundColor: '#f1f5f9',
    borderRadius: '14px',
    marginTop: '12px',
    gap: '4px',
  },
  stepTabItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 6px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  stepTabItemActive: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
  },
  stepTabItemDone: {
    color: '#0f172a',
  },
  stepTabItemDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  stepTabBadge: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTabBadgeActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
  },
  stepTabBadgeDone: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
  },
  stepTabTitle: {
    fontSize: '11.5px',
    fontWeight: '700',
    letterSpacing: '-0.2px',
    whiteSpace: 'nowrap',
  },
  stepTabDivider: {
    width: '1px',
    height: '14px',
    backgroundColor: '#e2e8f0',
  },

  /* Barra de Búsqueda instantánea */
  searchBarContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    transition: 'border-color 0.15s ease',
  },
  searchBarInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
  },
  searchClearBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  /* Metadatos de lista */
  listMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
    marginTop: '-4px',
    marginBottom: '-4px',
  },
  listCountText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  listPageBadge: {
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#94a3b8',
  },

  /* Lista compacta de propiedades (Estilo tabla elegante) */
  compactListWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    flex: '1 1 auto',
    minHeight: '110px',
    maxHeight: '260px',
  },
  compactListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    transition: 'background-color 0.15s ease',
  },
  compactListThumb: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0,
    backgroundColor: '#f1f5f9',
  },
  compactListInfo: {
    flex: 1,
    minWidth: 0,
  },
  compactListTitle: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  compactListAddress: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  compactListRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  compactRoomsBadge: {
    padding: '3px 7px',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '11px',
    fontWeight: '600',
  },

  /* Sin resultados */
  noResultsBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 16px',
    gap: '10px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '1px dashed #cbd5e1',
  },
  noResultsText: {
    fontSize: '13px',
    color: '#64748b',
  },
  clearSearchFilterBtn: {
    padding: '6px 14px',
    borderRadius: '10px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },

  /* Paginación con Pestañas Numéricas */
  paginationTabsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '8px',
    paddingTop: '6px',
    paddingBottom: '2px',
    flexShrink: 0,
  },
  pageNavBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pageNavBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  pageNumberTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pageTabBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '12.5px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pageTabBtnActive: {
    backgroundColor: '#0f172a',
    border: '1px solid #0f172a',
    color: '#ffffff',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
  },
  actionEmptyNotice: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px 16px',
    gap: '12px',
  },
  actionEmptyText: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.4',
  },
  actionCreatePropBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 18px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
  },

  /* Selector de ambientes (Paso 2) */
  roomsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  roomSelectChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  addCustomRoomTrigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px',
    borderRadius: '12px',
    border: '1.5px dashed #c7d2fe',
    backgroundColor: '#f8faff',
    color: '#4f46e5',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
  },
  customRoomForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '6px',
  },
  saveCustomRoomBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '10px',
    backgroundColor: '#0f172a',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  cancelCustomRoomBtn: {
    padding: '11px 16px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  /* Paso 3: Área de acción / Playground */
  actionPlayground: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    paddingTop: '6px',
  },
  recordingPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '20px',
    backgroundColor: '#f1f5f9',
    fontSize: '12px',
  },
  readyRecordBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '16px 10px',
    gap: '12px',
  },
  micRecordButton: {
    width: '74px',
    height: '74px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
    transition: 'transform 0.15s ease',
  },
  cameraUploadButton: {
    width: '74px',
    height: '74px',
    borderRadius: '50%',
    backgroundColor: '#0ea5e9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.35)',
    transition: 'transform 0.15s ease',
  },
  recordActionTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
    marginTop: '4px',
  },
  recordActionHint: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.4',
    maxWidth: '280px',
  },

  /* Grabación activa */
  recordingActiveBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    padding: '14px 10px',
    gap: '16px',
  },
  recordingTimerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  liveRecordDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
  },
  recordingTimerText: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f172a',
    fontVariantNumeric: 'tabular-nums',
  },
  soundWaveRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    height: '44px',
  },
  waveBar: {
    width: '5px',
    backgroundColor: '#4f46e5',
    borderRadius: '4px',
    animation: 'pulse 1s infinite alternate ease-in-out',
  },
  transcriptionPreview: {
    fontSize: '12.5px',
    color: '#475569',
    fontStyle: 'italic',
    backgroundColor: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    lineHeight: '1.4',
    width: '100%',
  },
  /* Botón elegante para detener dictado (NO ROJO) */
  stopRecordSleekBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '13px 20px',
    borderRadius: '14px',
    backgroundColor: '#0f172a',
    border: 'none',
    color: '#ffffff',
    fontSize: '13.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
    transition: 'all 0.15s ease',
  },
  stopSquareIndicator: {
    width: '12px',
    height: '12px',
    backgroundColor: '#ef4444',
    borderRadius: '3px',
    flexShrink: 0,
  },

  /* Procesando con IA */
  aiProcessingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    gap: '12px',
    width: '100%',
  },
  aiProcessingIconWrap: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiProcessingTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
  },
  aiProcessingSub: {
    fontSize: '12.5px',
    color: '#64748b',
    maxWidth: '280px',
  },

  /* Pantalla de revisión de dictado e ítems generados */
  reviewContentBlock: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  transcriptCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 14px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  transcriptLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  transcriptQuote: {
    fontSize: '12.5px',
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: '1.45',
  },
  extractedItemsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  extractedGroupLabel: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  itemsChecklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  itemCheckRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  customCheckbox: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    border: '1.5px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
    transition: 'all 0.15s ease',
  },
  itemCheckInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  itemHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  itemCheckName: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  itemActionsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  itemQtyBadge: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    padding: '2px 8px',
    borderRadius: '6px',
    letterSpacing: '-0.2px',
  },
  editItemBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: 0,
  },

  /* Tarjeta de edición inline de ítem */
  itemEditCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1.5px solid #0f172a',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
  },
  editCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '2px',
  },
  editCardTitle: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  cancelEditIconBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  editFormGrid: {
    display: 'flex',
    gap: '8px',
    width: '100%',
  },
  editFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  editFieldLabel: {
    fontSize: '10.5px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  editTextInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
  },
  editNumberInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center',
  },
  editTextarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '12px',
    color: '#334155',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'none',
    lineHeight: '1.4',
  },
  editActionsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '2px',
  },
  saveEditBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: '#0f172a',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  dismissEditBtn: {
    padding: '9px 14px',
    borderRadius: '8px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  itemCheckDescription: {
    fontSize: '11.5px',
    color: '#64748b',
    lineHeight: '1.4',
    margin: 0,
  },
  reviewActionsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '6px',
    paddingBottom: '4px',
  },
  confirmItemsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '13px',
    borderRadius: '14px',
    backgroundColor: '#0f172a',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
  },
  reRecordBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  /* Fotos Preview */
  addMorePhotosBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '10px',
    backgroundColor: '#eef2ff',
    border: 'none',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  photosGridPreview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  photoThumbWrapper: {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  /* Planos y Croquis */
  planCardOption: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  planOptionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  planOptionIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planOptionTitle: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  planOptionDesc: {
    fontSize: '11.5px',
    color: '#64748b',
    marginTop: '2px',
  },
  measureLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '4px',
  },
  measureInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    outline: 'none',
  },
  generatePlanBtn: {
    width: '100%',
    padding: '11px',
    borderRadius: '10px',
    backgroundColor: '#4f46e5',
    border: 'none',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  uploadPlanBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '20px',
    borderRadius: '16px',
    border: '1.5px dashed #cbd5e1',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    textAlign: 'center',
  },
  uploadPlanTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadPlanSub: {
    fontSize: '11px',
    color: '#64748b',
  },
  blueprintContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '280px',
    height: '200px',
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.4)',
  },
  cotaTop: {
    position: 'absolute',
    top: '8px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: '0.5px',
  },
  cotaRight: {
    position: 'absolute',
    right: '10px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#38bdf8',
    transform: 'rotate(90deg)',
    letterSpacing: '0.5px',
  },
  blueprintRoomBox: {
    width: '100%',
    height: '100%',
    border: '2px solid #38bdf8',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  blueprintDoor: {
    position: 'absolute',
    bottom: '-2px',
    left: '20px',
    width: '28px',
    height: '3px',
    backgroundColor: '#0f172a',
  },
  blueprintWindow: {
    position: 'absolute',
    top: '-3px',
    right: '25px',
    width: '32px',
    height: '4px',
    backgroundColor: '#93c5fd',
  },
  blueprintRoomName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
  },
  blueprintArea: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  uploadedPlanPreview: {
    width: '100%',
    maxHeight: '220px',
    objectFit: 'contain',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },

  /* ============ ESTILOS DE DETALLE DE PROPIEDAD ============ */
  detailMain: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '12px 18px 120px 18px',
  },
  detailHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  detailBackBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '7px 14px',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  detailHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailOptionsBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'all 0.15s ease',
  },
  dropdownBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  propertyOptionsDropdown: {
    position: 'absolute',
    top: '42px',
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '6px',
    minWidth: '180px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  propertyOptionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#0f172a',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  propertyOptionDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '3px 0',
  },
  propertyOptionItemDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ef4444',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  deleteConfirmSheet: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '16px 20px 24px 20px',
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  deleteIconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    marginTop: '4px',
  },
  deleteConfirmTitle: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  deleteConfirmDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 20px 0',
    lineHeight: '1.4',
  },
  deleteConfirmActions: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  deleteConfirmSolidBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(239, 68, 68, 0.25)',
  },
  appToast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 350,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '20px',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.22)',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '12.5px',
    fontWeight: '600',
    animation: 'fadeIn 0.2s ease',
  },
  detailExportActionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
  },
  detailProminentExportBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    padding: '12px 18px',
    fontSize: '13.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
    transition: 'all 0.15s ease',
  },
  detailShareSquareBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    flexShrink: 0,
  },
  detailActionIconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '7px',
    cursor: 'pointer',
    color: '#475569',
  },
  detailHeroCard: {
    position: 'relative',
    width: '100%',
    height: '170px',
    borderRadius: '20px',
    overflow: 'hidden',
    marginBottom: '14px',
    backgroundColor: '#0f172a',
    boxShadow: '0 8px 22px -4px rgba(15, 23, 42, 0.14)',
  },
  detailHeroImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  detailHeroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.05) 0%, rgba(15, 23, 42, 0.45) 50%, rgba(15, 23, 42, 0.9) 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '16px',
  },
  detailHeroTopBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: '10.5px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '12px',
  },
  detailHeroTitle: {
    color: '#ffffff',
    fontSize: '19px',
    fontWeight: '800',
    letterSpacing: '-0.3px',
    margin: 0,
  },
  detailHeroAddressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '4px',
  },
  detailHeroAddress: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '12.5px',
    fontWeight: '500',
  },
  detailKpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  detailKpiCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '10px 4px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  detailKpiVal: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
  },
  detailKpiLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: '2px',
    letterSpacing: '0.4px',
  },
  detailRoomsHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  detailRoomsSectionTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  detailAddRoomBtnSolid: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '8px 15px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)',
    transition: 'all 0.15s ease',
  },
  detailRoomCardRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    marginBottom: '10px',
    padding: '0 10px 0 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    transition: 'all 0.15s ease',
  },
  detailRoomCardMain: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 6px 12px 0',
    cursor: 'pointer',
    minWidth: 0,
  },
  detailRoomCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  detailRoomCardIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailRoomCardTitle: {
    fontSize: '14.5px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  detailRoomCardSub: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
    margin: 0,
  },
  detailRoomEnterCue: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '4px',
    flexShrink: 0,
  },
  detailRoomDivider: {
    width: '1px',
    height: '30px',
    backgroundColor: '#e2e8f0',
    margin: '0 4px',
    flexShrink: 0,
  },
  detailRoomActionZone: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 0 4px 4px',
    flexShrink: 0,
  },
  detailRoomQuickMicBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 11px',
    borderRadius: '10px',
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 2px rgba(79, 70, 229, 0.08)',
  },
  detailInsideRoomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '12px 14px',
    marginBottom: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    flexWrap: 'wrap',
    gap: '10px',
  },
  detailInsideRoomInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailInsideRoomTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  detailInsideRoomCount: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  detailInsideRoomActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailRoomDictateLargeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)',
  },
  detailRoomAddItemBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '7px 11px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailSubTabNav: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '16px',
    padding: '5px',
    gap: '6px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
  },
  detailSubTabBtn: {
    flex: 1,
    padding: '10px 4px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  detailSubTabBtnActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.18)',
  },
  detailSubTabBtnInactive: {
    backgroundColor: 'transparent',
    color: '#64748b',
  },
  detailRoomFilterScroll: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '8px',
    marginBottom: '14px',
  },
  detailRoomPill: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  detailRoomPillActive: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    borderColor: '#4f46e5',
  },
  detailRoomCountBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
  },
  detailRoomCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
  },
  detailAddRoomPill: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    border: '1px dashed #4f46e5',
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  detailAddRoomForm: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '14px',
    padding: '12px',
    marginBottom: '14px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  detailAddRoomInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  detailAddRoomSubmit: {
    padding: '8px 14px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  detailAddRoomCancel: {
    padding: '8px 10px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailRoomCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    marginBottom: '14px',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },
  detailRoomHeader: {
    padding: '12px 14px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRoomTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailRoomName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
  },
  detailRoomBadge: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 7px',
    borderRadius: '10px',
  },
  detailRoomActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  detailDictateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    color: '#4f46e5',
    padding: '5px 10px',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  detailAddItemBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#334155',
    padding: '5px 10px',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  /* Buscador de ítems en ambiente */
  roomSearchBarWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1.5px solid #e2e8f0',
    padding: '11px 14px',
    marginBottom: '14px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
    boxSizing: 'border-box',
    width: '100%',
  },
  roomSearchBarInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    fontFamily: 'inherit',
    minWidth: 0,
    padding: 0,
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
  },
  roomSearchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0f172a',
    fontFamily: 'inherit',
    minWidth: 0,
    padding: 0,
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
  },
  roomSearchClearBtn: {
    background: 'none',
    border: 'none',
    padding: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomNoResultsBox: {
    padding: '28px 16px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '1px dashed #cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  roomNoResultsText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  roomClearFilterBtn: {
    padding: '7px 14px',
    borderRadius: '9px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailItemsList: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailItemRow: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailItemTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  detailItemHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  detailItemNameText: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    lineHeight: '1.3',
    flex: 1,
    minWidth: 0,
    wordBreak: 'break-word',
  },
  detailItemQtyChip: {
    fontSize: '11px',
    fontWeight: '800',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '2px 7px',
    borderRadius: '6px',
    lineHeight: '1.2',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  detailItemDescBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: '10px',
    padding: '9px 12px',
  },
  detailItemDescText: {
    fontSize: '12.5px',
    color: '#475569',
    lineHeight: '1.45',
    margin: 0,
  },
  detailItemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexShrink: 0,
  },
  detailItemEditBtn: {
    width: '32px',
    height: '32px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '9px',
    color: '#475569',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  detailItemDeleteBtn: {
    width: '32px',
    height: '32px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '9px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  detailInlineItemForm: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '14px',
    margin: '0 0 10px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: '1.5px solid #cbd5e1',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
  },
  detailInlineRow: {
    display: 'flex',
    gap: '8px',
  },
  detailInlineInput: {
    flex: 1,
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '13px',
    color: '#0f172a',
    outline: 'none',
  },
  detailInlineQtyInput: {
    width: '65px',
    padding: '9px 10px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '13px',
    color: '#0f172a',
    textAlign: 'center',
    fontWeight: '700',
    outline: 'none',
  },
  detailInlineBtnSave: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '9px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  detailInlineBtnCancel: {
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid #cbd5e1',
    padding: '8px 14px',
    borderRadius: '9px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailEmptyRoomState: {
    padding: '16px 14px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '12.5px',
    fontStyle: 'italic',
  },
  /* Vista dedicada del ambiente (Room View) */
  roomHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  roomPropertyBreadcrumb: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '5px 12px',
    borderRadius: '10px',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  roomFocusCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  roomFocusTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  roomFocusTitle: {
    fontSize: '19px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  roomFocusBadge: {
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    fontSize: '11.5px',
    fontWeight: '700',
    padding: '3px 9px',
    borderRadius: '12px',
  },
  roomFocusActions: {
    display: 'flex',
    gap: '8px',
  },
  roomDictateBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)',
  },
  roomAddItemBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  /* Estados vacíos de la propiedad y ambientes */
  detailEmptyCard: {
    backgroundColor: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '24px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '6px',
    marginBottom: '16px',
  },
  detailEmptyIconCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  detailEmptyTitle: {
    fontSize: '14.5px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  detailEmptySub: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 14px 0',
    lineHeight: '1.4',
  },
  detailEmptyPrimaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '9px 16px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)',
  },
  detailEmptyRoomCard: {
    backgroundColor: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '24px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '6px',
    marginBottom: '14px',
  },
  detailEmptyRoomBtnRow: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '280px',
  },
  detailEmptyRoomDictateBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  detailEmptyRoomManualBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailEmptyPlanPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    gap: '6px',
    padding: '24px 16px',
  },
  emptyPlanIconCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  detailEmptyPlanTitle: {
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: '700',
  },
  detailEmptyPlanSub: {
    color: '#64748b',
    fontSize: '12px',
    lineHeight: '1.4',
    maxWidth: '260px',
  },
  detailPhotosEmptyBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '12px',
    padding: '10px 14px',
    marginBottom: '14px',
    fontSize: '12px',
    color: '#3730a3',
    fontWeight: '500',
  },
  /* Plano y medidas subtab */
  detailPlanCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },
  detailPlanActionBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '13px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '13.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
    transition: 'all 0.15s ease',
  },
  detailPlanDesignerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px 24px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '13.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
    transition: 'all 0.15s ease',
  },
  detailPlanCanvasContainer: {
    position: 'relative',
    width: '100%',
    height: '220px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  detailBlueprintGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: '8px',
    width: '100%',
    height: '100%',
  },
  detailBlueprintModule: {
    border: '1.5px solid #cbd5e1',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
  },
  detailBlueprintModName: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  detailBlueprintModM2: {
    fontSize: '9.5px',
    color: '#64748b',
    marginTop: '2px',
  },
  detailPlanControls: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginTop: '14px',
  },
  detailPlanInputGroup: {
    flex: 1,
  },
  detailPlanSurfaceBadge: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    padding: '8px 12px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '700',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  detailRoomsDistributionList: {
    marginTop: '14px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  detailRoomDistPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '11.5px',
  },
  /* ============ GESTIÓN ELEGANTE DE FOTOS ============ */
  photosTabContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  photosTopActionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: '12px 14px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
  },
  photosCounterWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  photosCounterTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  photosCounterSub: {
    fontSize: '11.5px',
    color: '#64748b',
    margin: 0,
    fontWeight: '500',
  },
  photosTopUploadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '8px 14px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 3px 8px rgba(79, 70, 229, 0.25)',
    transition: 'all 0.15s ease',
  },
  photosFilterScrollRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: '4px',
    scrollbarWidth: 'none',
  },
  photosFilterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '11.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  photosFilterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    color: '#ffffff',
  },
  detailGalleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '16px',
  },
  detailGalleryItem: {
    position: 'relative',
    borderRadius: '14px',
    overflow: 'hidden',
    height: '130px',
    cursor: 'pointer',
    border: '1px solid #e2e8f0',
    backgroundColor: '#0f172a',
  },
  detailGalleryImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  detailGalleryGradientOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0) 60%)',
    pointerEvents: 'none',
  },
  detailGalleryTag: {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: '#ffffff',
    fontSize: '10.5px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
    backdropFilter: 'blur(4px)',
    maxWidth: '90%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  photosEmptyContainer: {
    backgroundColor: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '28px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  photosEmptyIconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  photosEmptyTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  photosEmptySub: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
    maxWidth: '260px',
    lineHeight: '1.4',
  },
  photosEmptyActionBtn: {
    marginTop: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  photoRoomCardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '13px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    marginBottom: '10px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    transition: 'all 0.15s ease',
    width: '100%',
    boxSizing: 'border-box',
  },
  photoRoomCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    minWidth: 0,
    flex: 1,
  },
  photoRoomThumbBox: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  photoRoomThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoRoomCardTitle: {
    fontSize: '14.5px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  photoRoomCardSub: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '3px',
    margin: 0,
  },
  photoRoomCardRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '10px',
    flexShrink: 0,
  },
  photoDeleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontWeight: '700',
  },
  roomSelectChipsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '4px',
  },
  roomSelectPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 13px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  roomSelectPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    color: '#ffffff',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
  },
  selectInputWrapper: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  customSelectInput: {
    width: '100%',
    padding: '12px 42px 12px 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'inherit',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    lineHeight: '1.4',
  },
  selectChevronIcon: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPhotosFormWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingBottom: '20px',
  },
  photoCaptureOptionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  photoCaptureCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 12px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  photoCaptureIconWrapCamera: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#e0f2fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  photoCaptureIconWrapGallery: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  photoCaptureCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  photoCaptureCardTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  photoCaptureCardSub: {
    fontSize: '11px',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },
  existingPhotosSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: '16px',
    padding: '12px 14px',
  },
  existingPhotosHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  existingPhotosTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  existingPhotosSub: {
    fontSize: '11.5px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  existingPhotosCountBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#e2e8f0',
    padding: '2px 7px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  },
  photoFilterChipsScroll: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  photoFilterChip: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    border: '1px solid transparent',
  },
  photoFilterChipActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderColor: '#0f172a',
  },
  photoFilterChipInactive: {
    backgroundColor: '#ffffff',
    color: '#64748b',
    borderColor: '#e2e8f0',
  },
  existingPhotosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    paddingRight: '2px',
    alignContent: 'start',
  },
  existingPhotoThumbnailCard: {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid transparent',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.15s ease',
  },
  existingPhotoThumbnailCardSelected: {
    borderColor: '#4f46e5',
    boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.25)',
  },
  existingPhotoThumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  existingPhotoCheckCircle: {
    position: 'absolute',
    top: '5px',
    right: '5px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  existingPhotoCheckCircleSelected: {
    backgroundColor: '#4f46e5',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  existingPhotoCheckCircleUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    border: '1.5px solid rgba(15, 23, 42, 0.35)',
    backdropFilter: 'blur(2px)',
  },
  existingPhotoRoomTag: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    right: '4px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(4px)',
    borderRadius: '4px',
    padding: '1px 4px',
    fontSize: '9px',
    fontWeight: '600',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'center',
  },
  existingPhotosEmptyBox: {
    padding: '16px 12px',
    minHeight: '190px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
  },
  existingPhotosEmptyText: {
    fontSize: '11.5px',
    color: '#64748b',
    margin: 0,
  },
  analysisSelectedPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  analysisSelectedHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisSelectedTitle: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  clearSelectedPhotosBtn: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
  },
  selectedPhotosScrollRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  selectedMiniThumbWrap: {
    position: 'relative',
    width: '54px',
    height: '54px',
    borderRadius: '8px',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid #e2e8f0',
  },
  selectedMiniThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  selectedMiniRemoveBtn: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  selectedMiniOriginBadge: {
    position: 'absolute',
    bottom: '1px',
    left: '1px',
    right: '1px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '8px',
    fontWeight: '700',
    textAlign: 'center',
    borderRadius: '2px',
    padding: '0 2px',
  },
  photoUploadFlowWrapper: {
    flex: 1,
    height: '100%',
    minHeight: 0,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    alignItems: 'stretch',
  },
  photoUploadColFixed: {
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  photoUploadScrollArea: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingRight: '2px',
    paddingBottom: '12px',
  },
  fixedPhotoBottomBar: {
    flexShrink: 0,
    width: '100%',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '12px',
    paddingBottom: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)',
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
  },
  selectedPhotosStripWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingBottom: '2px',
  },
  thickAnalizarBtn: {
    width: '100%',
    height: '52px',
    padding: '0 20px',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '-0.2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  thickAnalizarBtnActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)',
  },
  thickAnalizarBtnDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'not-allowed',
    border: '1px solid #e2e8f0',
  },
  photoUploadDropZone: {
    border: '2px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    gap: '8px',
    transition: 'all 0.15s ease',
  },
  photoUploadIconCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: '#eeedfe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadDropTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
  },
  photoUploadDropSub: {
    fontSize: '11.5px',
    color: '#64748b',
  },
  pendingPhotosContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  pendingPhotosHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingPhotosCount: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#0f172a',
  },
  pendingPhotosRoomBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: '#eeedfe',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  pendingPhotosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  pendingPhotoItem: {
    position: 'relative',
    height: '80px',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  pendingPhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  pendingPhotoRemoveBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  uploadPhotosActionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
    paddingBottom: '20px',
  },
  saveNewPhotosBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '13px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
  },
  saveNewPhotosBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  cancelNewPhotosBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    padding: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailLightboxOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  detailLightboxContent: {
    maxWidth: '520px',
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  detailLightboxImg: {
    width: '100%',
    maxHeight: 'min(68vh, calc(100vh - 120px))',
    objectFit: 'contain',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  detailLightboxFooter: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff',
    padding: '0 4px',
  },
  detailLightboxCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
  },
  /* Export & Summary card */
  detailExportBanner: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderRadius: '16px',
    padding: '16px',
    color: '#ffffff',
    marginTop: '6px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
  },
  detailExportTitle: {
    fontSize: '14px',
    fontWeight: '800',
    margin: 0,
    color: '#ffffff',
  },
  detailExportDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.4',
  },
  detailExportActions: {
    display: 'flex',
    gap: '8px',
  },
  detailExportBtn: {
    flex: 1,
    padding: '10px 8px',
    borderRadius: '10px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  detailShareLinkBtn: {
    flex: 1,
    padding: '10px 8px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
  },

  /* Estilos para el selector de método y creación de ambientes (Voz / Manual) */
  methodChoicesCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '4px 0 10px 0',
  },
  methodChoiceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
    textAlign: 'left',
  },
  methodIconCircleVoice: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodIconCircleManual: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodCardInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  methodCardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  methodBadgeAi: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#4f46e5',
    backgroundColor: '#e0e7ff',
    padding: '2px 8px',
    borderRadius: '12px',
    letterSpacing: '0.02em',
  },
  methodBadgeManual: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#e2e8f0',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  methodCardSub: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4',
  },
  detectedRoomsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detectedRoomCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: '52px',
    boxSizing: 'border-box',
  },
  detectedRoomCardChecked: {
    backgroundColor: '#ffffff',
    borderColor: '#4f46e5',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)',
  },
  detectedRoomCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  detectedRoomCheckbox: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  detectedRoomCheckboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  detectedRoomName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    wordBreak: 'break-word',
  },
  detectedRoomEditBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.15s ease',
  },
  detectedRoomEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  detectedRoomEditInput: {
    flex: 1,
    padding: '9px 12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    border: '1.5px solid #4f46e5',
    borderRadius: '10px',
    outline: 'none',
    minHeight: '40px',
    boxSizing: 'border-box',
  },
  detectedRoomSaveEditBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#4f46e5',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
  },
  detectedRoomCancelEditBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  roomSingleAddItemBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
    transition: 'background-color 0.2s ease',
  },
  methodIconCirclePhoto: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#e0f2fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodBadgeAI: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  methodBadgeVoice: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  detectedItemsListWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detectedReviewItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1.5px solid #e2e8f0',
    padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  detectedReviewItemCardChecked: {
    backgroundColor: '#ffffff',
    borderColor: '#4f46e5',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)',
  },
  detectedReviewItemCardUnchecked: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.65,
  },
  detectedReviewItemTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  detectedReviewItemHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  detectedReviewTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  photoCarouselBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '4px 0 6px 0',
  },
  photoCarouselHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoCarouselSectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  photoCarouselCountBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  photoCarouselScrollRow: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    padding: '4px 2px 8px 2px',
    margin: '0 -2px',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  photoCarouselItemCard: {
    flexShrink: 0,
    width: '108px',
    padding: '7px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    textAlign: 'center',
    transition: 'all 0.18s ease',
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
    boxSizing: 'border-box',
  },
  photoCarouselItemCardActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f3ff',
    boxShadow: '0 3px 10px rgba(79, 70, 229, 0.16)',
    transform: 'translateY(-2px)',
  },
  photoCarouselThumbWrap: {
    position: 'relative',
    width: '100%',
    height: '66px',
    borderRadius: '9px',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  photoCarouselImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  photoCarouselAllIconBox: {
    position: 'relative',
    width: '100%',
    height: '66px',
    borderRadius: '9px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCarouselMiniBadge: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '800',
    padding: '1px 5px',
    borderRadius: '5px',
    lineHeight: 1.1,
  },
  photoCarouselActiveIndicator: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  },
  photoCarouselItemTitle: {
    fontSize: '11px',
    color: '#0f172a',
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: 0,
    lineHeight: 1.2,
  },
  photoCarouselItemSub: {
    fontSize: '10px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
  },
  extractedGroupLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '2px',
  },
  photoCarouselViewAllBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '11.5px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  photoEmptyItemsBox: {
    padding: '24px 16px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    border: '1px dashed #cbd5e1',
  },
};
