import React, { useState, useEffect, useRef } from 'react';
import { toast } from '../context/ToastContext';
import { 
  Camera, 
  Trash2, 
  Loader2, 
  MapPin, 
  Home, 
  Check 
} from 'lucide-react';
import { propertyService } from '../services/propertyService';
import BottomSheet from './BottomSheet';

export default function EditPropertyModal({
  isOpen,
  onClose,
  property,
  onPropertyUpdated,
  showToast
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = useRef(null);

  // Sincronizar estado cuando se abre con una propiedad específica
  useEffect(() => {
    if (property && isOpen) {
      setName(property.name || '');
      setLocation(property.location || property.address || '');
      setImagePreview(property.image || property.image_url || '');
      setFieldErrors({});
    }
  }, [property, isOpen]);

  if (!isOpen || !property) return null;

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    const errors = {};
    if (!name.trim()) errors.name = 'El nombre es obligatorio';
    if (!location.trim()) errors.location = 'La ubicación es obligatoria';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const updates = {
        name: name.trim(),
        location: location.trim(),
        image: imagePreview
      };

      const res = await propertyService.updateProperty(property.id, updates);
      const updatedData = res.property || res.data || {
        ...property,
        name: name.trim(),
        location: location.trim(),
        image_url: imagePreview,
        image: imagePreview
      };

      if (onPropertyUpdated) {
        onPropertyUpdated(updatedData);
      }

      toast.success('Propiedad actualizada con éxito');
      onClose();
    } catch (err) {
      console.error('Error al actualizar la propiedad:', err);
      toast.error('Ocurrió un error al guardar los cambios de la propiedad.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Editar propiedad"
      subtitle="Modificá los datos principales de la propiedad"
      size="medium"
    >
        <form onSubmit={handleSave} style={styles.formContainer}>
          <div style={styles.body}>
            {/* Foto de portada */}
            <div style={styles.inputStack}>
              <label style={styles.label}>Foto de portada</label>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleImageFileChange} 
                style={{ display: 'none' }} 
              />

              {imagePreview ? (
                <div style={styles.imagePreviewWrapper}>
                  <img 
                    src={imagePreview} 
                    alt="Portada" 
                    style={styles.imagePreviewImg} 
                  />
                  <div style={styles.imageOverlayButtons}>
                    <button 
                      type="button" 
                      style={styles.changeImageBtn}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={13} color="#ffffff" />
                      <span>Cambiar foto</span>
                    </button>
                    <button 
                      type="button" 
                      style={styles.removeImageBtn}
                      onClick={handleRemoveImage}
                      title="Quitar foto"
                    >
                      <Trash2 size={13} color="#ffffff" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  style={styles.uploadDropzone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={styles.uploadIconCircle}>
                    <Camera size={20} color="#4f46e5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <span style={styles.uploadTitle}>Subir o tomar foto de portada</span>
                    <span style={styles.uploadSub}>Elegí de tu galería o tomá una foto nueva</span>
                  </div>
                </div>
              )}
            </div>

            {/* Nombre de la propiedad */}
            <div style={styles.inputStack}>
              <label style={styles.label}>
                <Home size={13} color="#64748b" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Nombre o Identificador *
              </label>
              <input 
                type="text"
                placeholder="Ej: La Arbolada Village, Wind Tower 503..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null }));
                }}
                style={{
                  ...styles.inputField,
                  ...(fieldErrors.name ? styles.inputFieldError : {})
                }}
                required
              />
              {fieldErrors.name && <span style={styles.errorText}>{fieldErrors.name}</span>}
            </div>

            {/* Ubicación / Dirección */}
            <div style={styles.inputStack}>
              <label style={styles.label}>
                <MapPin size={13} color="#64748b" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Ubicación o Dirección *
              </label>
              <input 
                type="text"
                placeholder="Ej: Punta del Este, Barrio Privado La Arbolada..."
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: null }));
                }}
                style={{
                  ...styles.inputField,
                  ...(fieldErrors.location ? styles.inputFieldError : {})
                }}
                required
              />
              {fieldErrors.location && <span style={styles.errorText}>{fieldErrors.location}</span>}
            </div>
          </div>

          {/* Botones de acción inferiores */}
          <div style={styles.footerActions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={16} color="#ffffff" strokeWidth={2.4} />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
    </BottomSheet>
  );
}

const styles = {
  sheetOverride: {
    maxWidth: '520px',
    margin: '0 auto',
    padding: '0 0 24px 0',
    borderRadius: '24px 24px 0 0',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '88vh',
    boxShadow: '0 -10px 40px rgba(15, 23, 42, 0.16)',
    boxSizing: 'border-box',
  },
  handleWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0 6px 0',
    cursor: 'grab',
  },
  handle: {
    width: '40px',
    height: '4px',
    borderRadius: '4px',
    backgroundColor: '#cbd5e1',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 20px 14px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  body: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    flex: 1,
  },
  inputStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#334155',
  },
  inputField: {
    width: '100%',
    padding: '11px 14px',
    fontSize: '13.5px',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  },
  inputFieldError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: '11px',
    color: '#ef4444',
    fontWeight: '600',
    marginTop: '2px',
  },

  /* Foto de portada */
  imagePreviewWrapper: {
    position: 'relative',
    width: '100%',
    height: '150px',
    borderRadius: '14px',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  imagePreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imageOverlayButtons: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  changeImageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(6px)',
    border: 'none',
    color: '#ffffff',
    fontSize: '11.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  removeImageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    backdropFilter: 'blur(6px)',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  uploadDropzone: {
    border: '2px dashed #cbd5e1',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  uploadIconCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadTitle: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadSub: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },

  /* Footer con botones de acción */
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 20px 0 20px',
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#4f46e5',
    border: 'none',
    color: '#ffffff',
    fontSize: '13.5px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
  },
};
