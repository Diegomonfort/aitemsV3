import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  Loader2,
} from 'lucide-react';
import { photoUploadService } from '../services/photoUploadService';
import { formatFileSize } from '../utils/imageOptimizer';
import './PhotoUploadProgress.css';

export default function PhotoUploadProgress({ onPhotoUploaded, onBatchCompleted }) {
  const [uploadState, setUploadState] = useState({
    isVisible: false,
    isProcessing: false,
    photos: [],
    completedCount: 0,
    errorCount: 0,
    totalCount: 0,
    isMinimized: false,
    room: '',
  });

  const autoCloseTimerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = photoUploadService.addListener((event) => {
      // Limpiar temporizador de auto-cierre si llegan nuevos eventos
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      switch (event.type) {
        case 'PHOTOS_QUEUED':
          setUploadState((prev) => ({
            ...prev,
            isVisible: true,
            isProcessing: true,
            isMinimized: true, // Inicia minimizado como burbuja flotante para no tapar la pantalla
            photos: [...prev.photos, ...event.photos],
            totalCount: prev.totalCount + event.photos.length,
            room: event.room || prev.room,
          }));
          break;

        case 'PROCESSING_STARTED':
          setUploadState((prev) => ({
            ...prev,
            isProcessing: true,
          }));
          break;

        case 'PHOTO_STATUS_UPDATED':
        case 'PHOTO_PROGRESS_UPDATED':
          setUploadState((prev) => ({
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === event.photo.id ? { ...p, ...event.photo } : p
            ),
          }));
          break;

        case 'PHOTO_UPLOADED_SUCCESS':
          setUploadState((prev) => ({
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === event.photo.id ? { ...p, ...event.photo, status: 'completed' } : p
            ),
            completedCount: prev.completedCount + 1,
          }));

          // Notificar hacia afuera para actualizar la UI en vivo
          if (typeof onPhotoUploaded === 'function') {
            onPhotoUploaded(event.result, event.photo);
          }
          break;

        case 'PHOTO_UPLOADED_ERROR':
          setUploadState((prev) => ({
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === event.photo.id ? { ...p, ...event.photo, status: 'error' } : p
            ),
            errorCount: prev.errorCount + 1,
          }));
          break;

        case 'PROCESSING_COMPLETED':
          setUploadState((prev) => ({
            ...prev,
            isProcessing: false,
          }));

          if (typeof onBatchCompleted === 'function') {
            onBatchCompleted({
              completedCount: event.completedCount,
              errorCount: event.errorCount,
              totalInBatch: event.totalInBatch,
            });
          }

          // Si no hubo errores, auto-ocultar después de 4.5 segundos
          if (event.errorCount === 0) {
            autoCloseTimerRef.current = setTimeout(() => {
              setUploadState((prev) => {
                if (prev.errorCount === 0 && !prev.isProcessing) {
                  return {
                    ...prev,
                    isVisible: false,
                    photos: [],
                    completedCount: 0,
                    errorCount: 0,
                    totalCount: 0,
                  };
                }
                return prev;
              });
            }, 4500);
          }
          break;

        case 'PHOTO_CANCELLED':
          setUploadState((prev) => ({
            ...prev,
            photos: prev.photos.filter((p) => p.id !== event.photo.id),
            totalCount: Math.max(0, prev.totalCount - 1),
          }));
          break;

        case 'QUEUE_CLEARED':
          setUploadState((prev) => ({
            ...prev,
            photos: prev.photos.filter((p) =>
              !event.canceledPhotos.some((c) => c.id === p.id)
            ),
            totalCount: Math.max(0, prev.totalCount - event.canceledPhotos.length),
          }));
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [onPhotoUploaded, onBatchCompleted]);

  if (!uploadState.isVisible) {
    return null;
  }

  const handleToggleMinimize = (e) => {
    e.stopPropagation();
    setUploadState((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  };

  const handleClose = (e) => {
    e.stopPropagation();
    if (uploadState.isProcessing) {
      // Si está procesando, minimizar en vez de destruir
      setUploadState((prev) => ({ ...prev, isMinimized: true }));
    } else {
      setUploadState({
        isVisible: false,
        isProcessing: false,
        photos: [],
        completedCount: 0,
        errorCount: 0,
        totalCount: 0,
        isMinimized: false,
        room: '',
      });
    }
  };

  const handleRetry = (photoId) => {
    photoUploadService.retryPhoto(photoId);
  };

  const progressPercent =
    uploadState.totalCount > 0
      ? Math.min(
          100,
          Math.round(
            ((uploadState.completedCount + uploadState.errorCount) /
              uploadState.totalCount) *
              100
          )
        )
      : 0;

  const isAllFinished = !uploadState.isProcessing && uploadState.totalCount > 0;
  const hasErrors = uploadState.errorCount > 0;

  // =================== VISTA MINIMIZADA (CÍRCULO FLOTANTE ELEGANTE) ===================
  if (uploadState.isMinimized) {
    const currentUploaded = uploadState.completedCount + uploadState.errorCount;
    const total = uploadState.totalCount;

    return (
      <div className="photo-upload-progress-container minimized">
        <button
          type="button"
          className="photo-upload-circle-minimized"
          onClick={handleToggleMinimize}
          title="Tocar para ver fotos en subida"
          aria-label="Ver progreso de subida"
        >
          {/* Anillo de progreso circular */}
          <svg className="circle-progress-svg" viewBox="0 0 58 58">
            <circle
              className="circle-progress-bg"
              cx="29"
              cy="29"
              r="25"
            />
            <circle
              className={`circle-progress-bar ${isAllFinished && !hasErrors ? 'success' : ''} ${hasErrors ? 'error' : ''}`}
              cx="29"
              cy="29"
              r="25"
              style={{
                strokeDasharray: 157.08,
                strokeDashoffset: 157.08 - (157.08 * (progressPercent || 0)) / 100,
              }}
            />
          </svg>

          <div className="circle-inner-content">
            <div className="circle-status-icon">
              {uploadState.isProcessing ? (
                <Loader2 size={16} className="circle-spinner" />
              ) : isAllFinished && !hasErrors ? (
                <CheckCircle2 size={16} color="#34d399" />
              ) : hasErrors ? (
                <AlertCircle size={16} color="#f87171" />
              ) : (
                <Upload size={16} color="#818cf8" />
              )}
            </div>
            <span className="circle-counter-label">
              {currentUploaded}/{total}
            </span>
          </div>
        </button>
      </div>
    );
  }

  // =================== VISTA EXPANDIDA (TARJETA FLOTANTE) ===================
  return (
    <div className="photo-upload-progress-container expanded">
      <div className="photo-upload-card-expanded">
        {/* Cabecera */}
        <div className="upload-card-header">
          <div className="upload-card-title-group">
            <div
              className={`upload-card-badge-icon ${
                isAllFinished && !hasErrors ? 'success' : ''
              }`}
            >
              {uploadState.isProcessing ? (
                <Loader2 size={18} className="pill-spinner" />
              ) : isAllFinished && !hasErrors ? (
                <CheckCircle2 size={18} color="#10b981" />
              ) : (
                <Upload size={18} />
              )}
            </div>
            <div>
              <h4 className="upload-card-title">
                {uploadState.isProcessing
                  ? 'Subiendo fotos en segundo plano'
                  : isAllFinished
                  ? hasErrors
                    ? 'Subida con observaciones'
                    : '¡Fotos subidas exitosamente!'
                  : 'Subida de fotos'}
              </h4>
              <p className="upload-card-subtitle">
                {uploadState.completedCount + uploadState.errorCount} de {uploadState.totalCount} fotos
                {uploadState.room ? ` • ${uploadState.room}` : ''}
              </p>
            </div>
          </div>

          <div className="upload-card-actions">
            <button
              type="button"
              className="upload-btn-action"
              onClick={handleToggleMinimize}
              title="Minimizar (sigue subiendo en background)"
              aria-label="Minimizar"
            >
              <ChevronDown size={18} />
            </button>
            <button
              type="button"
              className="upload-btn-action"
              onClick={handleClose}
              title="Cerrar widget"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de progreso global */}
        <div className="upload-card-overall-bar-wrap">
          <div className="upload-card-bar-track">
            <div
              className={`upload-card-bar-fill ${
                isAllFinished && !hasErrors ? 'all-success' : ''
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Lista de fotos en el lote */}
        <div className="upload-card-photos-list">
          {uploadState.photos.map((photo) => (
            <div
              key={photo.id}
              className={`upload-photo-row ${photo.status}`}
            >
              <div className="photo-row-info">
                <div className="photo-row-icon">
                  {photo.status === 'completed' && (
                    <CheckCircle2 size={16} color="#10b981" />
                  )}
                  {photo.status === 'uploading' && (
                    <div className="upload-mini-spinner" />
                  )}
                  {photo.status === 'error' && (
                    <AlertCircle size={16} color="#ef4444" />
                  )}
                  {photo.status === 'pending' && (
                    <Upload size={14} color="#94a3b8" />
                  )}
                </div>

                <div className="photo-row-texts">
                  <span className="photo-row-name" title={photo.filename}>
                    {photo.filename}
                  </span>
                  <div className="photo-row-meta">
                    <span>{formatFileSize(photo.size)}</span>
                    {photo.wasOptimized && (
                      <span className="optimized-tag" title="Optimizada automáticamente">
                        <Zap size={10} /> Optimizada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="photo-row-status-wrap">
                {photo.status === 'uploading' && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#4f46e5' }}>
                    {photo.progress || 10}%
                  </span>
                )}
                {photo.status === 'completed' && (
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981' }}>
                    Lista
                  </span>
                )}
                {photo.status === 'error' && (
                  <button
                    type="button"
                    className="upload-retry-btn"
                    onClick={() => handleRetry(photo.id)}
                    title="Reintentar subida"
                  >
                    <RotateCcw size={12} />
                    Reintentar
                  </button>
                )}
                {photo.status === 'pending' && (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    En espera
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Resumen en pie de tarjeta */}
        <div className="upload-card-footer">
          <span>Podés seguir haciendo otras cosas</span>
          <div>
            {uploadState.completedCount > 0 && (
              <span className="footer-stat-badge success">
                ✓ {uploadState.completedCount}
              </span>
            )}
            {uploadState.errorCount > 0 && (
              <span className="footer-stat-badge error" style={{ marginLeft: '8px' }}>
                ✗ {uploadState.errorCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
