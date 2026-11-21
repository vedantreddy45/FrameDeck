import { CutRange } from '../types/studio';

export interface KeptSegment {
  startSec: number;
  endSec: number;
}

export function computeKeptSegments(
  durationSec: number,
  trimStartSec: number,
  trimEndSec: number,
  cutRanges: CutRange[]
): { segments: KeptSegment[]; totalDurationSec: number } {
  const safeDuration = Math.max(0, durationSec);
  const start = Math.max(0, Math.min(safeDuration, trimStartSec));
  const end = Math.max(start, Math.min(safeDuration, trimEndSec));

  if (end - start <= 0.01) {
    return { segments: [], totalDurationSec: 0 };
  }

  // Merge & clamp cut ranges inside [start, end]
  const normalizedCuts = cutRanges
    .map((c) => ({
      startSec: Math.max(start, Math.min(end, Math.min(c.startSec, c.endSec))),
      endSec: Math.max(start, Math.min(end, Math.max(c.startSec, c.endSec))),
    }))
    .filter((c) => c.endSec - c.startSec > 0.05)
    .sort((a, b) => a.startSec - b.startSec);

  const mergedCuts: { startSec: number; endSec: number }[] = [];
  for (const cut of normalizedCuts) {
    const prev = mergedCuts[mergedCuts.length - 1];
    if (prev && cut.startSec <= prev.endSec + 0.02) {
      prev.endSec = Math.max(prev.endSec, cut.endSec);
    } else {
      mergedCuts.push({ ...cut });
    }
  }

  const segments: KeptSegment[] = [];
  let cursor = start;

  for (const cut of mergedCuts) {
    if (cut.startSec - cursor > 0.02) {
      segments.push({ startSec: cursor, endSec: cut.startSec });
    }
    cursor = Math.max(cursor, cut.endSec);
  }

  if (end - cursor > 0.02) {
    segments.push({ startSec: cursor, endSec: end });
  }

  const totalDurationSec = segments.reduce((acc, s) => acc + (s.endSec - s.startSec), 0);
  return { segments, totalDurationSec };
}

export function mapEditedTimeToSourceTime(
  editedTimeSec: number,
  segments: KeptSegment[]
): number | null {
  if (segments.length === 0) return null;
  let remaining = Math.max(0, editedTimeSec);
  for (const seg of segments) {
    const len = seg.endSec - seg.startSec;
    if (remaining <= len) {
      return seg.startSec + remaining;
    }
    remaining -= len;
  }
  return segments[segments.length - 1].endSec;
}

export function findNextPlaybackTime(
  sourceTimeSec: number,
  segments: KeptSegment[]
): { nextTime: number; ended: boolean } {
  if (segments.length === 0) return { nextTime: sourceTimeSec, ended: true };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (sourceTimeSec < seg.startSec - 0.02) {
      return { nextTime: seg.startSec, ended: false };
    }
    if (sourceTimeSec >= seg.startSec - 0.02 && sourceTimeSec < seg.endSec - 0.02) {
      return { nextTime: sourceTimeSec, ended: false };
    }
  }

  return { nextTime: segments[0].startSec, ended: true };
}
