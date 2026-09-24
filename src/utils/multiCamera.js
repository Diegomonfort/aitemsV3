import { Capacitor, registerPlugin } from '@capacitor/core';

const MultiCamera = registerPlugin('MultiCamera');

/**
 * Opens the native multi-camera on iOS with zoom controls and proper orientation.
 * Falls back gracefully on web/Android.
 * 
 * @param {number} maxPhotos - Maximum number of photos to capture
 * @returns {Promise<Array<{url: string, file: File, format: string}>>} Array of captured photos
 */
export async function openNativeMultiCamera(maxPhotos = 20) {
  const result = await MultiCamera.openCamera({ maxPhotos });

  if (!result?.photos?.length) return [];

  const photos = [];
  for (const photo of result.photos) {
    try {
      // Convert the native file URI to a web-accessible URL
      const webPath = Capacitor.convertFileSrc(photo.path);
      const response = await fetch(webPath);
      const blob = await response.blob();
      const filename = `multicam_${Date.now()}_${photos.length}.jpeg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      photos.push({
        url: webPath,
        file,
        format: photo.format || 'jpeg',
        width: photo.width,
        height: photo.height,
      });
    } catch (e) {
      console.warn('[MultiCamera] Error processing photo:', e);
    }
  }

  return photos;
}

/**
 * Check if the native multi-camera plugin is available.
 * Returns true only on iOS native platform.
 */
export function isMultiCameraAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}
