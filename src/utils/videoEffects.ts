import { HighlightColorId } from '../types/studio';

export interface ZoomCameraState {
  isZoomed: boolean;
  targetScale: number;
  currentScale: number;
  targetFocalX: number; // 0..1 normalized in content rect
  targetFocalY: number; // 0..1 normalized in content rect
  currentFocalX: number;
  currentFocalY: number;
}

export interface HighlightDragState {
  active: boolean;
  startX: number; // 0..1 normalized in content rect
  startY: number; // 0..1 normalized in content rect
  currentX: number; // 0..1 normalized in content rect
  currentY: number; // 0..1 normalized in content rect
}

export interface RectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const HIGHLIGHT_COLOR_RGBA: Record<HighlightColorId, string> = {
  amber: 'rgba(250, 204, 21, 0.42)',
  cyan: 'rgba(56, 189, 248, 0.38)',
  rose: 'rgba(251, 113, 133, 0.38)',
  mint: 'rgba(52, 211, 153, 0.38)',
};

export function createInitialZoomCamera(): ZoomCameraState {
  return {
    isZoomed: false,
    targetScale: 1,
    currentScale: 1,
    targetFocalX: 0.5,
    targetFocalY: 0.5,
    currentFocalX: 0.5,
    currentFocalY: 0.5,
  };
}

export function createInitialHighlightDrag(): HighlightDragState {
  return {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  };
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

export function toggleZoomAtPoint(
  state: ZoomCameraState,
  normX: number,
  normY: number,
  zoomScale: number
): ZoomCameraState {
  const safeScale = Math.max(1.2, Math.min(3.0, zoomScale));
  const fx = clamp01(normX);
  const fy = clamp01(normY);

  if (!state.isZoomed) {
    return {
      ...state,
      isZoomed: true,
      targetScale: safeScale,
      targetFocalX: fx,
      targetFocalY: fy,
    };
  }

  return {
    ...state,
    isZoomed: false,
    targetScale: 1,
    targetFocalX: fx,
    targetFocalY: fy,
  };
}

export function stepZoomCamera(state: ZoomCameraState, dtMs: number): ZoomCameraState {
  const safeDt = Math.max(1, Math.min(100, dtMs));
  const alpha = 1 - Math.exp(-safeDt / 85);
  const nextScale = state.currentScale + (state.targetScale - state.currentScale) * alpha;
  const nextX = state.currentFocalX + (state.targetFocalX - state.currentFocalX) * alpha;
  const nextY = state.currentFocalY + (state.targetFocalY - state.currentFocalY) * alpha;

  const snapScale = Math.abs(state.targetScale - nextScale) < 0.002 ? state.targetScale : nextScale;
  const snapX = Math.abs(state.targetFocalX - nextX) < 0.001 ? state.targetFocalX : nextX;
  const snapY = Math.abs(state.targetFocalY - nextY) < 0.001 ? state.targetFocalY : nextY;

  return {
    ...state,
    currentScale: snapScale,
    currentFocalX: snapX,
    currentFocalY: snapY,
  };
}

export function computeZoomedSourceCrop(
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
  focalX: number,
  focalY: number
): { sx: number; sy: number; sw: number; sh: number } {
  const safeW = Math.max(1, sourceWidth);
  const safeH = Math.max(1, sourceHeight);
  const safeScale = Math.max(1, scale);
  if (safeScale <= 1.001) {
    return { sx: 0, sy: 0, sw: safeW, sh: safeH };
  }

  const sw = safeW / safeScale;
  const sh = safeH / safeScale;
  const fx = clamp01(focalX);
  const fy = clamp01(focalY);

  // Anchor focal point so zoomed region centers smoothly while clamped inside source bounds
  const rawSx = fx * safeW - sw * fx;
  const rawSy = fy * safeH - sh * fy;
  const sx = Math.max(0, Math.min(safeW - sw, rawSx));
  const sy = Math.max(0, Math.min(safeH - sh, rawSy));

  return { sx, sy, sw, sh };
}

/**
 * Computes PDF-style multi-line sentence highlight rectangles while the mouse key is held.
 */
export function computePdfSentenceHighlightRects(
  drag: HighlightDragState,
  contentWidth: number,
  contentHeight: number,
  lineHeightPx = 22
): RectBox[] {
  if (!drag.active || contentWidth <= 0 || contentHeight <= 0) return [];

  const x1 = clamp01(drag.startX) * contentWidth;
  const y1 = clamp01(drag.startY) * contentHeight;
  const x2 = clamp01(drag.currentX) * contentWidth;
  const y2 = clamp01(drag.currentY) * contentHeight;

  const dy = Math.abs(y2 - y1);
  const dx = Math.abs(x2 - x1);
  if (dx < 3 && dy < 3) return [];

  const lineH = Math.max(14, lineHeightPx);

  // Single-line PDF sentence highlight
  if (dy < lineH * 0.85) {
    const top = Math.max(0, Math.min(contentHeight - lineH, (y1 + y2) / 2 - lineH / 2));
    const left = Math.min(x1, x2);
    return [
      {
        x: left,
        y: top,
        width: Math.max(4, Math.abs(x2 - x1)),
        height: lineH,
      },
    ];
  }

  // Multi-line PDF paragraph/sentence selection
  const forward = y2 >= y1;
  const startPt = forward ? { x: x1, y: y1 } : { x: x2, y: y2 };
  const endPt = forward ? { x: x2, y: y2 } : { x: x1, y: y1 };

  const marginX = Math.max(16, Math.round(contentWidth * 0.04));
  const rightEdge = Math.max(startPt.x + 20, contentWidth - marginX);

  const rects: RectBox[] = [];
  const startRow = Math.floor(startPt.y / lineH);
  const endRow = Math.floor(endPt.y / lineH);

  for (let row = startRow; row <= endRow; row++) {
    const rowY = Math.max(0, Math.min(contentHeight - lineH, row * lineH));
    if (row === startRow) {
      rects.push({
        x: startPt.x,
        y: rowY,
        width: Math.max(8, rightEdge - startPt.x),
        height: lineH - 2,
      });
    } else if (row === endRow) {
      const left = Math.min(marginX, endPt.x);
      rects.push({
        x: left,
        y: rowY,
        width: Math.max(8, endPt.x - left),
        height: lineH - 2,
      });
    } else {
      rects.push({
        x: marginX,
        y: rowY,
        width: Math.max(12, rightEdge - marginX),
        height: lineH - 2,
      });
    }
  }

  return rects;
}
