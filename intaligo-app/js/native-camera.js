import { isNativeApp } from './api.js';

let cameraMod = null;

async function getCamera() {
  if (!isNativeApp()) return null;
  if (!cameraMod) {
    cameraMod = await import('@capacitor/camera');
  }
  return cameraMod;
}

async function ensureCameraPermission(forGallery = false) {
  const mod = await getCamera();
  if (!mod) return false;

  const perms = forGallery ? ['photos', 'camera'] : ['camera'];
  let status = await mod.Camera.checkPermissions();
  const need = perms.some((p) => status[p] !== 'granted' && status[p] !== 'limited');
  if (need) {
    status = await mod.Camera.requestPermissions({ permissions: perms });
  }
  if (forGallery) {
    return status.photos === 'granted' || status.photos === 'limited' || status.camera === 'granted';
  }
  return status.camera === 'granted' || status.camera === 'limited';
}

export async function takeNativePhoto() {
  const mod = await getCamera();
  if (!mod) return null;

  const ok = await ensureCameraPermission(false);
  if (!ok) {
    throw new Error('Camera permission denied');
  }

  const photo = await mod.Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: mod.CameraResultType.Uri,
    source: mod.CameraSource.Camera,
    correctOrientation: true,
    saveToGallery: false,
  });

  return photo.webPath || photo.path || null;
}

export async function pickNativePhoto() {
  const mod = await getCamera();
  if (!mod) return null;

  await ensureCameraPermission(true);

  const photo = await mod.Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: mod.CameraResultType.Uri,
    source: mod.CameraSource.Photos,
    correctOrientation: true,
  });

  return photo.webPath || photo.path || null;
}

export function usesNativeCamera() {
  return isNativeApp();
}
