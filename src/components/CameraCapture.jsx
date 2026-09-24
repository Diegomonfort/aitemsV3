import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, RotateCw, Check, Images } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { pickFromGallery } from '../utils/nativeCamera';
import { openNativeMultiCamera, isMultiCameraAvailable } from '../utils/multiCamera';

/**
 * CameraCapture — Cámara fullscreen in-app para captura múltiple rápida.
 * 
 * En iOS nativo, delega al plugin Swift MultiCamera que ofrece:
 * - Zoom 0.5x / 1x / 2x con lentes reales
 * - Orientación correcta al girar el teléfono
 * - Captura multi-foto sin cerrar la cámara
 * 
 * En web/Android, usa getUserMedia como fallback.
 */
export default function CameraCapture({ isOpen, onClose, onPhotosReady, maxPhotos = 20 }) {
  const nativeCameraLaunched = useRef(false);
  const [useWebFallback, setUseWebFallback] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUseWebFallback(false);
    }
  }, [isOpen]);

  // ── iOS nativo: usar plugin Swift directamente ──
  useEffect(() => {
    if (!isOpen || !isMultiCameraAvailable() || useWebFallback || nativeCameraLaunched.current) return;
    nativeCameraLaunched.current = true;

    (async () => {
      try {
        const photos = await openNativeMultiCamera(maxPhotos);
        if (photos?.length > 0 && onPhotosReady) {
          onPhotosReady(photos.map((p, idx) => ({
            url: p.url,
            file: p.file,
            id: `native-cam-${Date.now()}-${idx}`,
          })));
        }
        onClose();
      } catch (err) {
        console.warn('[CameraCapture] Native camera error:', err);
        // Si el plugin nativo da error (ej. binario viejo sin compilar), caer al fallback web
        setUseWebFallback(true);
      } finally {
        nativeCameraLaunched.current = false;
      }
    })();
  }, [isOpen, maxPhotos, onPhotosReady, onClose, useWebFallback]);

  // Si estamos en iOS nativo y no se activó el fallback, no renderizar la UI web
  if (isMultiCameraAvailable() && !useWebFallback) {
    return null;
  }

  // ── Fallback: Web/Android con getUserMedia ──
  return <CameraCaptureWeb isOpen={isOpen} onClose={onClose} onPhotosReady={onPhotosReady} maxPhotos={maxPhotos} />;
}

/**
 * CameraCaptureWeb — Fallback con getUserMedia para web/Android.
 */
function CameraCaptureWeb({ isOpen, onClose, onPhotosReady, maxPhotos = 20 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [facingMode, setFacingMode] = useState('environment');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [lastFlash, setLastFlash] = useState(false);
  const [mode, setMode] = useState('loading'); // 'loading' | 'stream' | 'native'
  const [activeStream, setActiveStream] = useState(null);
  const isMountedRef = useRef(true);

  // ── Detener tracks activos ──
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActiveStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ── Iniciar cámara con getUserMedia ──
  const startCamera = useCallback(async (facing) => {
    stopCurrentStream();
    setIsReady(false);
    setError(null);
    setMode('loading');

    try {
      // 1. Asegurar permiso de cámara a nivel de Android / iOS nativo
      if (Capacitor.isNativePlatform()) {
        try {
          const check = await CapCamera.checkPermissions();
          if (check.camera !== 'granted') {
            const req = await CapCamera.requestPermissions({ permissions: ['camera'] });
            if (req.camera !== 'granted') {
              throw new Error('Permiso de cámara denegado');
            }
          }
        } catch (permErr) {
          console.warn('[CameraCapture] Verificación de permisos nativos:', permErr);
        }
      }

      // 2. Verificar si getUserMedia está disponible
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no disponible');
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing || facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn('[CameraCapture] Fallback a constraints flexibles:', constraintErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing || facingMode },
            audio: false,
          });
        } catch (f2Err) {
          console.warn('[CameraCapture] Fallback a video genérico:', f2Err);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }
      
      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      
      streamRef.current = stream;
      setActiveStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[CameraCapture] video play error:', playErr);
        }
      }

      if (isMountedRef.current) {
        setIsReady(true);
        setMode('stream');
      }
    } catch (err) {
      console.warn('[CameraCapture] getUserMedia falló, usando fallback nativo:', err.message);
      if (isMountedRef.current) {
        setMode('native');
        setIsReady(true);
      }
    }
  }, [facingMode, stopCurrentStream]);

  // Sincronizar video cuando activeStream cambie
  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch(err => {
        console.warn('[CameraCapture] video play effect error:', err);
      });
    }
  }, [activeStream]);

  // ── Lifecycle ──
  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      setPhotos([]);
      setError(null);
      startCamera('environment');
    }
    return () => {
      isMountedRef.current = false;
      stopCurrentStream();
    };
  }, [isOpen, startCamera, stopCurrentStream]);

  // ── Cambiar cámara (solo modo stream) ──
  const handleFlipCamera = useCallback(() => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  // ── Captura: getUserMedia ──
  const handleCaptureStream = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || photos.length >= maxPhotos) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    setLastFlash(true);
    setTimeout(() => setLastFlash(false), 150);
    try {
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (_) {}

    canvas.toBlob((blob) => {
      if (!blob) return;
      const filename = `foto_${Date.now()}.jpeg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setPhotos(prev => [...prev, { url, file, id: `cam-${Date.now()}` }]);
    }, 'image/jpeg', 0.85);
  }, [photos.length, maxPhotos, facingMode]);

  // ── Captura: Capacitor Camera nativa ──
  const handleCaptureNative = useCallback(async () => {
    if (photos.length >= maxPhotos) return;

    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 85,
        width: 1920,
        height: 1920,
        correctOrientation: true,
        saveToGallery: false,
      });

      if (!photo?.webPath) return;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const filename = `foto_${Date.now()}.${photo.format || 'jpeg'}`;
      const file = new File([blob], filename, { type: `image/${photo.format || 'jpeg'}` });

      setPhotos(prev => [...prev, {
        url: photo.webPath,
        file,
        id: `cam-native-${Date.now()}`,
      }]);
    } catch (err) {
      // User cancelled
      if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
        return;
      }
      console.warn('[CameraCapture] Error nativo:', err);
    }
  }, [photos.length, maxPhotos]);
  // ── Elegir desde galería ──
  const handlePickFromGallery = useCallback(async () => {
    try {
      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) return;
      const picked = await pickFromGallery(remaining);
      if (picked?.length) {
        setPhotos(prev => [
          ...prev,
          ...picked.map((p, idx) => ({
            ...p,
            id: `gallery-${Date.now()}-${idx}`,
          })),
        ]);
      }
    } catch (e) {
      console.warn('[CameraCapture] Error al seleccionar de galería:', e);
    }
  }, [photos.length, maxPhotos]);

  // ── Captura dispatch ──
  const handleCapture = useCallback(() => {
    if (mode === 'stream') {
      handleCaptureStream();
    } else if (mode === 'native') {
      handleCaptureNative();
    }
  }, [mode, handleCaptureStream, handleCaptureNative]);

  // ── Confirmar ──
  const handleDone = useCallback(() => {
    stopCurrentStream();
    if (photos.length > 0 && onPhotosReady) {
      onPhotosReady(photos);
    }
    onClose();
  }, [photos, onPhotosReady, onClose, stopCurrentStream]);

  // ── Cancelar ──
  const handleCancel = useCallback(() => {
    stopCurrentStream();
    setPhotos([]);
    onClose();
  }, [onClose, stopCurrentStream]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      {/* Video feed: SIEMPRE en el DOM para que el ref y srcObject existan desde el inicio */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          ...styles.video,
          opacity: mode === 'stream' ? 1 : 0,
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Modo nativo: fondo oscuro con instrucciones */}
      {mode === 'native' && (
        <div style={{ ...styles.nativeBackground, zIndex: 10 }}>
          <div style={styles.nativeContent}>
            <div style={styles.nativeIconWrap}>
              <Camera size={40} color="#ffffff" strokeWidth={1.5} />
            </div>
            <h3 style={styles.nativeTitle}>Captura múltiple</h3>
            <p style={styles.nativeHint}>
              Tocá el botón para abrir la cámara.{'\n'}
              Cada foto se agrega automáticamente.{'\n'}
              Cuando termines, tocá "Listo".
            </p>
            {photos.length > 0 && (
              <span style={styles.nativeCountBig}>
                {photos.length} foto{photos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {mode === 'loading' && (
        <div style={{ ...styles.nativeBackground, zIndex: 10 }}>
          <div style={styles.nativeContent}>
            <div style={{ ...styles.nativeIconWrap, animation: 'spin 1s linear infinite' }}>
              <Camera size={32} color="#ffffff" strokeWidth={1.5} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Iniciando cámara...</p>
            <button
              type="button"
              onClick={() => {
                setMode('native');
                setIsReady(true);
              }}
              style={{
                marginTop: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#cbd5e1',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Usar cámara externa
            </button>
          </div>
        </div>
      )}

      {/* Flash */}
      {lastFlash && <div style={styles.flashOverlay} />}

      {/* Canvas oculto */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top bar */}
      <div style={styles.topBar}>
        <button type="button" onClick={handleCancel} style={styles.topBtn}>
          <X size={22} color="#ffffff" strokeWidth={2.2} />
        </button>
        <div style={styles.topCenter}>
          {photos.length > 0 && (
            <span style={styles.photoCount}>
              {photos.length} foto{photos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {mode === 'stream' ? (
          <button type="button" onClick={handleFlipCamera} style={styles.topBtn}>
            <RotateCw size={20} color="#ffffff" strokeWidth={2.2} />
          </button>
        ) : (
          <div style={{ width: 44 }} />
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={styles.errorBox}>
          <Camera size={32} color="#ef4444" />
          <p style={styles.errorText}>{error}</p>
          <button type="button" onClick={handleCancel} style={styles.errorBtn}>
            Volver
          </button>
        </div>
      )}

      {/* Bottom area */}
      <div style={styles.bottomArea}>
        {/* Thumbnails */}
        {photos.length > 0 && (
          <div style={styles.thumbnailStrip} className="no-scrollbar">
            {photos.map((photo, idx) => (
              <div key={photo.id || idx} style={styles.thumbWrap}>
                <img src={photo.url} alt={`Foto ${idx + 1}`} style={styles.thumbImg} />
                <span style={styles.thumbBadge}>{idx + 1}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotos(prev => prev.filter((_, i) => i !== idx));
                  }}
                  style={styles.thumbDeleteBtn}
                  title="Eliminar foto"
                >
                  <X size={10} color="#ffffff" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Controles */}
        <div style={styles.controls}>
          <div style={styles.sideBtn}>
            <button
              type="button"
              onClick={handlePickFromGallery}
              style={styles.galleryBtn}
              title="Elegir fotos de la galería"
            >
              <Images size={22} color="#ffffff" strokeWidth={2} />
            </button>
          </div>

          {/* Botón de captura */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={!isReady || photos.length >= maxPhotos}
            style={{
              ...styles.captureBtn,
              opacity: (!isReady || photos.length >= maxPhotos) ? 0.4 : 1,
            }}
          >
            <div style={styles.captureBtnInner} />
          </button>

          {/* Botón Listo */}
          {photos.length > 0 ? (
            <button type="button" onClick={handleDone} style={styles.doneBtn}>
              <Check size={18} color="#ffffff" strokeWidth={2.8} />
              <span style={styles.doneBtnText}>Listo</span>
            </button>
          ) : (
            <div style={styles.sideBtn} />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    inset: 0,
    zIndex: 2000,
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    inset: 0,
    objectFit: 'cover',
  },
  nativeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    inset: 0,
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    textAlign: 'center',
  },
  nativeIconWrap: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(79, 70, 229, 0.3)',
    border: '2px solid rgba(79, 70, 229, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  nativeTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
  },
  nativeHint: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
    whiteSpace: 'pre-line',
  },
  nativeCountBig: {
    backgroundColor: 'rgba(79, 70, 229, 0.9)',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    padding: '8px 20px',
    borderRadius: '24px',
    marginTop: '8px',
  },
  flashOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#ffffff',
    zIndex: 10,
    pointerEvents: 'none',
    animation: 'camFlash 0.15s ease-out forwards',
  },
  topBar: {
    position: 'relative',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'calc(env(safe-area-inset-top, 12px) + 8px) 16px 8px 16px',
  },
  topBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  topCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  photoCount: {
    backgroundColor: 'rgba(79, 70, 229, 0.9)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    padding: '5px 14px',
    borderRadius: '20px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  errorBox: {
    position: 'absolute',
    inset: 0,
    zIndex: 30,
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
  },
  errorText: {
    color: '#94a3b8',
    fontSize: '15px',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  errorBtn: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)',
  },
  thumbnailStrip: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  thumbWrap: {
    position: 'relative',
    flexShrink: 0,
    width: '56px',
    height: '56px',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '2px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: 'rgba(79, 70, 229, 0.9)',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '700',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDeleteBtn: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    zIndex: 5,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 28px 0 28px',
  },
  sideBtn: {
    width: '56px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    border: '1px solid rgba(255, 255, 255, 0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'background-color 0.15s ease',
  },
  captureBtn: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: '4px solid rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
    padding: 0,
  },
  captureBtnInner: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
  },
  doneBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(79, 70, 229, 0.95)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '24px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
    fontFamily: 'inherit',
  },
  doneBtnText: {
    fontSize: '14px',
    fontWeight: '700',
  },
};
