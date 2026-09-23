import { api } from './api';

class PhotoUploadService {
  constructor() {
    this.uploadQueue = [];
    this.isProcessing = false;
    this.listeners = new Set();
    this.completedPhotos = 0;
    this.errorPhotos = 0;
    this.totalPhotosInBatch = 0;
    this.currentBatchPhotos = [];
  }

  // Agregar listener para cambios de estado
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notificar cambios a todos los listeners
  notifyListeners(event) {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('[photoUploadService] Error en listener:', err);
      }
    });
  }

  /**
   * Agregar fotos a la cola de subida asíncrona
   * @param {Object} photosData
   * @param {Array<File|Object>} photosData.files
   * @param {string} photosData.property_id
   * @param {string} photosData.user_id
   * @param {string} [photosData.room] - Nombre del ambiente (ej: "Living", "Exterior")
   * @param {string} [photosData.category_id] - UUID opcional de la categoría
   * @param {string} [photosData.method] - "upload" | "camera"
   */
  async queuePhotos(photosData) {
    const { files = [], property_id, user_id, room = 'General', category_id = null, method = 'upload' } = photosData;

    if (!files || files.length === 0) return [];
    if (!property_id) {
      console.error('[photoUploadService] property_id es requerido para encolar fotos');
      return [];
    }

    const timestampNow = Date.now();
    const photoItems = files.map((item, index) => {
      // Soportar tanto objetos con { file, name, size } como objetos File directos
      const fileObj = item.file || item;
      const fileName = item.name || fileObj.name || `foto_${timestampNow}_${index + 1}.jpg`;
      const fileSize = item.size || fileObj.size || 0;
      const originalSize = item.originalSize || fileSize;
      const wasOptimized = Boolean(item.wasOptimized);

      return {
        id: `upload_${timestampNow}_${index}_${Math.random().toString(36).slice(2, 7)}`,
        file: fileObj,
        property_id,
        user_id,
        room,
        category_id,
        method,
        status: 'pending', // 'pending' | 'uploading' | 'completed' | 'error'
        progress: 0,
        error: null,
        filename: fileName,
        size: fileSize,
        originalSize,
        wasOptimized,
        type: fileObj.type || 'image/jpeg',
        createdAt: new Date().toISOString(),
      };
    });

    // Actualizar contadores para este lote
    this.completedPhotos = 0;
    this.errorPhotos = 0;
    this.totalPhotosInBatch = photoItems.length;
    this.currentBatchPhotos = [...photoItems];

    // Agregar a la cola general
    this.uploadQueue.push(...photoItems);

    // Notificar fotos encoladas
    this.notifyListeners({
      type: 'PHOTOS_QUEUED',
      photos: photoItems,
      totalInQueue: this.uploadQueue.length,
      totalInBatch: this.totalPhotosInBatch,
      room,
      property_id,
    });

    // Iniciar procesamiento en background si no está en curso
    if (!this.isProcessing) {
      this.processQueue();
    }

    return photoItems.map((item) => item.id);
  }

  // Procesar secuencialmente la cola de fotos
  async processQueue() {
    if (this.isProcessing || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    this.notifyListeners({
      type: 'PROCESSING_STARTED',
      totalPhotos: this.uploadQueue.length,
      totalInBatch: this.totalPhotosInBatch,
    });

    while (this.uploadQueue.length > 0) {
      const photoItem = this.uploadQueue.shift();
      await this.uploadSinglePhoto(photoItem);
    }

    this.isProcessing = false;

    this.notifyListeners({
      type: 'PROCESSING_COMPLETED',
      completedCount: this.completedPhotos,
      errorCount: this.errorPhotos,
      totalInBatch: this.totalPhotosInBatch,
    });
  }

  // Subir una foto individual mediante FormData
  async uploadSinglePhoto(photoItem) {
    try {
      photoItem.status = 'uploading';
      photoItem.progress = 15;
      this.notifyListeners({
        type: 'PHOTO_STATUS_UPDATED',
        photo: photoItem,
      });

      // Crear FormData con los campos esperados por el backend
      const formData = new FormData();
      formData.append('photo', photoItem.file, photoItem.filename);
      formData.append('property_id', photoItem.property_id);

      if (photoItem.user_id) {
        formData.append('user_id', photoItem.user_id);
      }
      if (photoItem.category_id) {
        formData.append('category_id', photoItem.category_id);
      }
      if (photoItem.room) {
        formData.append('room', photoItem.room);
        formData.append('category', photoItem.room);
      }
      formData.append('method', photoItem.method || 'upload');

      // Animación visual de progreso suave
      const progressTimer = setInterval(() => {
        if (photoItem.progress < 85) {
          photoItem.progress += Math.round(Math.random() * 15 + 5);
          this.notifyListeners({
            type: 'PHOTO_PROGRESS_UPDATED',
            photo: photoItem,
          });
        }
      }, 150);

      // Enviar solicitud POST al backend (con hasta 2 intentos automáticos)
      let response = null;
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await api.post('/api/photos', formData);
          if (response && response.success !== false) {
            lastError = null;
            break;
          }
          lastError = new Error(response?.message || response?.error || 'Error en la respuesta del servidor');
        } catch (postErr) {
          lastError = postErr;
        }

        if (attempt < 2) {
          console.warn(`[photoUploadService] Intento ${attempt} falló para ${photoItem.filename}. Reintentando en 1s...`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      clearInterval(progressTimer);

      if (lastError || !response || response.success === false) {
        throw (lastError || new Error('Error desconocido al subir la foto'));
      }

      const uploadedData = response.data || response;

      photoItem.status = 'completed';
      photoItem.progress = 100;
      photoItem.result = uploadedData;
      this.completedPhotos++;

      console.log(`[photoUploadService] ✅ Foto subida: ${photoItem.filename} -> ${uploadedData?.url}`);

      this.notifyListeners({
        type: 'PHOTO_UPLOADED_SUCCESS',
        photo: photoItem,
        result: uploadedData,
        completedCount: this.completedPhotos,
        totalInBatch: this.totalPhotosInBatch,
      });
    } catch (error) {
      console.error(`[photoUploadService] ❌ Error subiendo ${photoItem.filename}:`, error);

      photoItem.status = 'error';
      photoItem.error = error.message || 'Error al subir la foto';
      this.errorPhotos++;

      this.notifyListeners({
        type: 'PHOTO_UPLOADED_ERROR',
        photo: photoItem,
        error: error.message,
        errorCount: this.errorPhotos,
        totalInBatch: this.totalPhotosInBatch,
      });
    }
  }

  // Reintentar una foto con error
  async retryPhoto(photoId) {
    const item = this.currentBatchPhotos.find((p) => p.id === photoId);
    if (!item) return;

    item.status = 'pending';
    item.progress = 0;
    item.error = null;

    if (this.errorPhotos > 0) {
      this.errorPhotos--;
    }

    this.uploadQueue.push(item);

    this.notifyListeners({
      type: 'PHOTOS_QUEUED',
      photos: [item],
      totalInQueue: this.uploadQueue.length,
      totalInBatch: this.totalPhotosInBatch,
    });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Cancelar una foto si aún está pendiente en la cola
  cancelPhoto(photoId) {
    const index = this.uploadQueue.findIndex((item) => item.id === photoId);
    if (index !== -1) {
      const canceled = this.uploadQueue.splice(index, 1)[0];
      this.notifyListeners({
        type: 'PHOTO_CANCELLED',
        photo: canceled,
      });
      return true;
    }
    return false;
  }

  // Limpiar fotos pendientes
  clearQueue() {
    const pendingPhotos = this.uploadQueue.filter((item) => item.status === 'pending');
    this.uploadQueue = this.uploadQueue.filter((item) => item.status !== 'pending');

    this.notifyListeners({
      type: 'QUEUE_CLEARED',
      canceledPhotos: pendingPhotos,
    });

    return pendingPhotos.length;
  }

  // Consultar estado de procesamiento
  getCurrentProcessingInfo() {
    return {
      isProcessing: this.isProcessing,
      completedCount: this.completedPhotos,
      errorCount: this.errorPhotos,
      totalInBatch: this.totalPhotosInBatch,
      remainingCount: this.uploadQueue.length,
    };
  }
}

// Instancia singleton compartida en toda la aplicación
export const photoUploadService = new PhotoUploadService();
export default photoUploadService;
