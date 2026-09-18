/**
 * Utilidad de optimización y compresión de imágenes para Aitems V3
 *
 * Reglas de negocio:
 * 1. Límite máximo estricto: 5MB. Si un archivo supera los 5MB es rechazado.
 * 2. Umbral de optimización: A partir de 1MB (inclusive), se comprime y optimiza
 *    automáticamente en el navegador vía HTML5 Canvas antes de enviarse por red,
 *    reduciendo el tiempo de subida y el ancho de banda sin perder fidelidad visual.
 * 3. Archivos menores a 1MB se mantienen en su calidad original.
 */

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const OPTIMIZE_THRESHOLD = 1 * 1024 * 1024; // 1MB
export const MAX_DIMENSION = 1920; // 1080p / Full HD estándar
export const COMPRESSION_QUALITY = 0.82; // Balance óptimo entre nitidez y peso

/**
 * Formatea bytes a MB con 2 decimales
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Valida si un archivo cumple con los requisitos de tamaño y formato
 */
export function validatePhotoFile(file) {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo' };
  }

  // Verificar tipo MIME
  const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
  if (!isImage) {
    return {
      valid: false,
      error: `"${file.name}" no es una imagen válida. Solo se admiten fotos (JPG, PNG, WebP).`,
    };
  }

  // Límite estricto de 5MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `"${file.name}" supera el límite de 5MB (${formatFileSize(file.size)}). Por favor, sube fotos de hasta 5MB.`,
    };
  }

  return { valid: true };
}

/**
 * Comprime una imagen usando HTML5 Canvas manteniendo relación de aspecto.
 * Retorna un nuevo objeto File optimizado en formato JPEG.
 */
export async function compressImage(file, maxDimension = MAX_DIMENSION, quality = COMPRESSION_QUALITY) {
  // Si pesa menos del umbral de 1MB, no necesita compresión
  if (file.size < OPTIMIZE_THRESHOLD) {
    return {
      file,
      wasOptimized: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calcular nuevas dimensiones si supera el límite de 1920px
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback si no hay soporte de canvas
          resolve({
            file,
            wasOptimized: false,
            originalSize: file.size,
            finalSize: file.size,
          });
          return;
        }

        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // Si por alguna razón la compresión dio un archivo más pesado o falló, usar el original
              resolve({
                file,
                wasOptimized: false,
                originalSize: file.size,
                finalSize: file.size,
              });
              return;
            }

            // Crear un nuevo objeto File con el nombre original o extensión jpg
            const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            console.log(
              `[imageOptimizer] ⚡ "${file.name}" optimizada: ${formatFileSize(file.size)} ➔ ${formatFileSize(compressedFile.size)} (${Math.round(
                (1 - compressedFile.size / file.size) * 100
              )}% reducción)`
            );

            resolve({
              file: compressedFile,
              wasOptimized: true,
              originalSize: file.size,
              finalSize: compressedFile.size,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve({
          file,
          wasOptimized: false,
          originalSize: file.size,
          finalSize: file.size,
        });
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      resolve({
        file,
        wasOptimized: false,
        originalSize: file.size,
        finalSize: file.size,
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Procesa un listado de archivos seleccionados:
 * - Filtra y separa los que superan el límite de 5MB
 * - Optimiza de forma asíncrona los que pesan >= 1MB
 * - Retorna los archivos válidos listos para la cola de subida y los rechazados con sus motivos
 */
export async function filterAndPreparePhotos(fileList) {
  const files = Array.from(fileList || []);
  const validFiles = [];
  const rejectedFiles = [];

  for (const file of files) {
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      rejectedFiles.push({
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        reason: validation.error,
      });
      continue;
    }

    try {
      const optimizationResult = await compressImage(file);
      validFiles.push({
        file: optimizationResult.file,
        originalName: file.name,
        name: optimizationResult.file.name,
        size: optimizationResult.finalSize,
        originalSize: optimizationResult.originalSize,
        wasOptimized: optimizationResult.wasOptimized,
        formattedSize: formatFileSize(optimizationResult.finalSize),
        previewUrl: URL.createObjectURL(optimizationResult.file),
      });
    } catch (err) {
      // Si falla la compresión, pasar archivo original si es menor a 5MB
      validFiles.push({
        file,
        originalName: file.name,
        name: file.name,
        size: file.size,
        originalSize: file.size,
        wasOptimized: false,
        formattedSize: formatFileSize(file.size),
        previewUrl: URL.createObjectURL(file),
      });
    }
  }

  return {
    validFiles,
    rejectedFiles,
    totalSelected: files.length,
  };
}
