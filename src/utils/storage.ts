import {
  AudioSettings,
  BackgroundItem,
  CaptureItem,
  RecordingSettings,
  ShortcutBinding,
  StudioStyleSettings,
  VideoEffectsSettings,
} from '../types/studio';
import { DEFAULT_SHORTCUTS } from './shortcuts';

const DB_NAME = 'framedeck_studio_db';
const DB_VERSION = 1;
const STORE_BACKGROUNDS = 'custom_backgrounds';
const STORE_CAPTURES = 'captures';

const LS_STYLE_KEY = 'framedeck_style_v1';
const LS_AUDIO_KEY = 'framedeck_audio_v1';
const LS_RECORDING_KEY = 'framedeck_recording_v1';
const LS_EFFECTS_KEY = 'framedeck_effects_v1';
const LS_SHORTCUTS_KEY = 'framedeck_shortcuts_v1';

export const DEFAULT_STYLE_SETTINGS: StudioStyleSettings = {
  backgroundId: 'wall-aurora-prism',
  aspectRatio: 'auto',
  padding: 72,
  cornerRadius: 16,
  shadowIntensity: 70,
  frameStyle: 'macos-dark',
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  systemAudioEnabled: true,
  micEnabled: true,
  micDeviceId: 'default',
  systemVolume: 1.0,
  micVolume: 1.0,
};

export const DEFAULT_RECORDING_SETTINGS: RecordingSettings = {
  qualityPreset: '1080p-60',
  compositeBackground: true,
};

export const DEFAULT_VIDEO_EFFECTS_SETTINGS: VideoEffectsSettings = {
  doubleTapZoomEnabled: true,
  zoomScale: 1.85,
  sentenceHighlightEnabled: true,
  highlightColor: 'amber',
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_BACKGROUNDS)) {
        db.createObjectStore(STORE_BACKGROUNDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CAPTURES)) {
        db.createObjectStore(STORE_CAPTURES, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function loadCustomBackgrounds(): Promise<BackgroundItem[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BACKGROUNDS, 'readonly');
      const store = tx.objectStore(STORE_BACKGROUNDS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as BackgroundItem[]) ?? [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveCustomBackground(bg: BackgroundItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_BACKGROUNDS, 'readwrite');
    tx.objectStore(STORE_BACKGROUNDS).put(bg);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCustomBackground(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_BACKGROUNDS, 'readwrite');
    tx.objectStore(STORE_BACKGROUNDS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCaptures(): Promise<CaptureItem[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CAPTURES, 'readonly');
      const req = tx.objectStore(STORE_CAPTURES).getAll();
      req.onsuccess = () => {
        const items = (req.result as CaptureItem[]) ?? [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveCapture(item: CaptureItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CAPTURES, 'readwrite');
    tx.objectStore(STORE_CAPTURES).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCapture(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CAPTURES, 'readwrite');
    tx.objectStore(STORE_CAPTURES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function loadStyleSettings(): StudioStyleSettings {
  return readJson(LS_STYLE_KEY, DEFAULT_STYLE_SETTINGS);
}

export function saveStyleSettings(settings: StudioStyleSettings): void {
  try {
    localStorage.setItem(LS_STYLE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAudioSettings(): AudioSettings {
  return readJson(LS_AUDIO_KEY, DEFAULT_AUDIO_SETTINGS);
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(LS_AUDIO_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadRecordingSettings(): RecordingSettings {
  return readJson(LS_RECORDING_KEY, DEFAULT_RECORDING_SETTINGS);
}

export function saveRecordingSettings(settings: RecordingSettings): void {
  try {
    localStorage.setItem(LS_RECORDING_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadShortcuts(): ShortcutBinding[] {
  try {
    const raw = localStorage.getItem(LS_SHORTCUTS_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const saved = JSON.parse(raw) as ShortcutBinding[];
    // Merge with defaults so any newly added action IDs exist
    return DEFAULT_SHORTCUTS.map((def) => {
      const match = saved.find((s) => s.id === def.id);
      return match ? { ...def, ...match } : def;
    });
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(bindings: ShortcutBinding[]): void {
  try {
    localStorage.setItem(LS_SHORTCUTS_KEY, JSON.stringify(bindings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadVideoEffectsSettings(): VideoEffectsSettings {
  return readJson(LS_EFFECTS_KEY, DEFAULT_VIDEO_EFFECTS_SETTINGS);
}

export function saveVideoEffectsSettings(settings: VideoEffectsSettings): void {
  try {
    localStorage.setItem(LS_EFFECTS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

