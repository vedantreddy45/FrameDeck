import { QualityPresetConfig, QualityPresetId } from '../types/studio';

export const QUALITY_PRESETS: Record<QualityPresetId, QualityPresetConfig> = {
  '4k-60': {
    id: '4k-60',
    label: '4K Ultra · 2160p @ 60fps',
    shortLabel: '4K · 60fps',
    width: 3840,
    height: 2160,
    fps: 60,
    videoBitsPerSecond: 16_000_000,
  },
  '1080p-60': {
    id: '1080p-60',
    label: 'Full HD · 1080p @ 60fps',
    shortLabel: '1080p · 60fps',
    width: 1920,
    height: 1080,
    fps: 60,
    videoBitsPerSecond: 8_000_000,
  },
  '720p-30': {
    id: '720p-30',
    label: 'Compact HD · 720p @ 30fps',
    shortLabel: '720p · 30fps',
    width: 1280,
    height: 720,
    fps: 30,
    videoBitsPerSecond: 4_000_000,
  },
};

export function pickSupportedRecorderMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'video/webm';
}

export async function copyPngBlobToClipboard(
  blob: Blob
): Promise<{ ok: boolean; reason?: string }> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard ||
      typeof navigator.clipboard.write !== 'function' ||
      typeof ClipboardItem === 'undefined'
    ) {
      return { ok: false, reason: 'Clipboard image API is unavailable in this browser context.' };
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clipboard write requires active focus.';
    return { ok: false, reason: message };
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
