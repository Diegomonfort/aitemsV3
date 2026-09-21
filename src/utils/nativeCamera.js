import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Check if we're running on a native iOS/Android device
 */
export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * Take a single photo using the native camera.
 * Returns { url, file } or null if cancelled.
 */
export async function takeNativePhoto() {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 85,
      width: 1920,
      height: 1920,
      correctOrientation: true,
      saveToGallery: false,
    });

    if (!photo?.webPath) return null;

    // Convert webPath to a blob/file for upload
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    const filename = `photo_${Date.now()}.${photo.format || 'jpeg'}`;
    const file = new File([blob], filename, { type: `image/${photo.format || 'jpeg'}` });

    return {
      url: photo.webPath,
      file,
      format: photo.format || 'jpeg',
    };
  } catch (err) {
    // User cancelled or camera error
    if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
      return null;
    }
    console.warn('[Camera] Error taking photo:', err);
    return null;
  }
}

/**
 * Take multiple photos in a loop using native camera.
 * Opens camera → takes photo → adds to list → opens camera again.
 * Stops when user cancels/goes back from the camera.
 * 
 * @param {Function} onPhotoTaken - callback called with each photo { url, file }
 * @param {number} maxPhotos - max number of photos allowed (default 20)
 * @returns {Promise<Array>} array of all captured photos
 */
export async function takeMultiplePhotos(onPhotoTaken, maxPhotos = 20) {
  const photos = [];

  while (photos.length < maxPhotos) {
    const photo = await takeNativePhoto();

    // If user cancelled, stop the loop
    if (!photo) break;

    photos.push(photo);

    // Notify parent about the new photo immediately
    if (onPhotoTaken) {
      onPhotoTaken(photo, photos.length);
    }
  }

  return photos;
}

/**
 * Pick photos from the device gallery.
 * Returns array of { url, file } or empty array.
 */
export async function pickFromGallery(maxPhotos = 5) {
  try {
    const result = await Camera.pickImages({
      quality: 85,
      width: 1920,
      height: 1920,
      correctOrientation: true,
      limit: maxPhotos,
    });

    if (!result?.photos?.length) return [];

    const photos = [];
    for (const photo of result.photos) {
      try {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const filename = `gallery_${Date.now()}_${photos.length}.${photo.format || 'jpeg'}`;
        const file = new File([blob], filename, { type: `image/${photo.format || 'jpeg'}` });
        photos.push({
          url: photo.webPath,
          file,
          format: photo.format || 'jpeg',
        });
      } catch (e) {
        console.warn('[Camera] Error processing gallery photo:', e);
      }
    }

    return photos;
  } catch (err) {
    if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
      return [];
    }
    console.warn('[Camera] Error picking from gallery:', err);
    return [];
  }
}
