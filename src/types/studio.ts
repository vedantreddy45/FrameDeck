export type StudioTab = 'studio' | 'captures' | 'editor' | 'shortcuts' | 'extension';

export type CaptureMode = 'screenshot' | 'video';

export type AspectRatioPreset = 'auto' | '16:9' | '4:3' | '1:1' | '9:16';

export type FrameStyle = 'none' | 'macos-dark' | 'macos-light';

export type QualityPresetId = '4k-60' | '1080p-60' | '720p-30';

export type BackgroundKind = 'image' | 'gradient';

export type HighlightColorId = 'amber' | 'cyan' | 'rose' | 'mint';

export interface VideoEffectsSettings {
  doubleTapZoomEnabled: boolean;
  zoomScale: number; // 1.5 .. 2.5
  sentenceHighlightEnabled: boolean;
  highlightColor: HighlightColorId;
}

export interface CutRange {
  id: string;
  startSec: number;
  endSec: number;
}

export interface BuiltinMusicTrack {
  id: string;
  name: string;
  bpm: number;
  mood: string;
  durationSec: number;
}

export interface BackgroundItem {
  id: string;
  name: string;
  kind: BackgroundKind;
  isCustom: boolean;
  /** Used when kind === 'image' (bundled asset path or custom data URL) */
  imageUrl?: string;
  /** Used when kind === 'gradient' */
  colors?: string[];
  angle?: number;
  createdAt: number;
}

export interface StudioStyleSettings {
  backgroundId: string;
  aspectRatio: AspectRatioPreset;
  padding: number;
  cornerRadius: number;
  shadowIntensity: number;
  frameStyle: FrameStyle;
}

export interface AudioSettings {
  systemAudioEnabled: boolean;
  micEnabled: boolean;
  micDeviceId: string;
  systemVolume: number; // 0..1.5
  micVolume: number; // 0..1.5
}

export interface RecordingSettings {
  qualityPreset: QualityPresetId;
  compositeBackground: boolean;
}

export type ShortcutActionId =
  | 'screenshot'
  | 'recordToggle'
  | 'recordPause'
  | 'copyLatest'
  | 'downloadLatest'
  | 'sampleCapture';

export interface ShortcutBinding {
  id: ShortcutActionId;
  label: string;
  description: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export interface CaptureItem {
  id: string;
  kind: 'screenshot' | 'video';
  name: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  durationSeconds?: number;
  backgroundName: string;
  createdAt: number;
  blob: Blob;
  /** For screenshots, store raw unframed source blob so user can re-style backgrounds later */
  rawSourceBlob?: Blob;
}

export interface QualityPresetConfig {
  id: QualityPresetId;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  fps: number;
  videoBitsPerSecond: number;
}
