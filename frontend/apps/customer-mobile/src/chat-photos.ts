// Picking, shooting and shrinking photos for order chats. The native modules are
// checked before their JS is loaded: a binary built before they were added (or
// an OTA update on an old build) simply hides the photo buttons. Importing the
// JS without the native side would throw while Metro loads the module, which is
// reported as a fatal error even inside a caught import().
import { requireOptionalNativeModule } from "expo";

export const MAX_CHAT_PHOTOS = 5;
const MAX_SIDE = 1600;
const QUALITY = 0.7;

export type LocalPhoto = { key: string; uri: string; width: number; height: number };

type Picker = typeof import("expo-image-picker");
type Manipulator = typeof import("expo-image-manipulator");
let modules: Promise<{ picker: Picker; manipulator: Manipulator } | null> | null = null;

export function loadPhotoModules() {
  if (!modules) {
    const native = Boolean(requireOptionalNativeModule("ExponentImagePicker") && requireOptionalNativeModule("ExpoImageManipulator"));
    modules = !native ? Promise.resolve(null) : Promise.all([import("expo-image-picker"), import("expo-image-manipulator")])
      .then(([picker, manipulator]) => ({ picker, manipulator }))
      .catch(() => null);
  }
  return modules;
}

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Photos from the library (multi-select up to `limit`). HEIC comes back as JPEG. */
export async function pickPhotos(limit: number): Promise<LocalPhoto[]> {
  const m = await loadPhotoModules();
  if (!m || limit <= 0) return [];
  const result = await m.picker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
    preferredAssetRepresentationMode: m.picker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((a) => ({ key: key(), uri: a.uri, width: a.width, height: a.height }));
}

/** One photo from the camera; returns null when cancelled or not allowed. */
export async function takePhoto(): Promise<LocalPhoto | null> {
  const m = await loadPhotoModules();
  if (!m) return null;
  const permission = await m.picker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("CAMERA_DENIED");
  const result = await m.picker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { key: key(), uri: a.uri, width: a.width, height: a.height };
}

/** Longest side ≤ 1600px, JPEG at 0.7: a few hundred KB, well under the 2MB server cap. */
export async function compressPhoto(photo: LocalPhoto): Promise<LocalPhoto> {
  const m = await loadPhotoModules();
  if (!m) return photo;
  const { ImageManipulator, SaveFormat } = m.manipulator;
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_SIDE) {
    context.resize(photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });
  return { key: photo.key, uri: saved.uri, width: saved.width, height: saved.height };
}
