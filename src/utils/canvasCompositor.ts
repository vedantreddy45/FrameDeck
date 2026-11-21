import {
  AspectRatioPreset,
  BackgroundItem,
  FrameStyle,
  HighlightColorId,
  StudioStyleSettings,
} from '../types/studio';
import { computeCoverDrawRect, computeGradientEndpoints } from './backgrounds';
import {
  HIGHLIGHT_COLOR_RGBA,
  HighlightDragState,
  ZoomCameraState,
  computePdfSentenceHighlightRects,
  computeZoomedSourceCrop,
} from './videoEffects';

export interface CanvasLayoutInput {
  sourceWidth: number;
  sourceHeight: number;
  aspectRatio: AspectRatioPreset;
  padding: number;
  cornerRadius: number;
  frameStyle: FrameStyle;
}

export interface CanvasLayoutResult {
  canvasWidth: number;
  canvasHeight: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  chromeHeight: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
  effectiveRadius: number;
}

export const ASPECT_RATIOS: Record<AspectRatioPreset, number | null> = {
  auto: null,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '9:16': 9 / 16,
};

export function computeCanvasLayout(input: CanvasLayoutInput): CanvasLayoutResult {
  const safeSrcW = Math.max(1, Math.round(input.sourceWidth));
  const safeSrcH = Math.max(1, Math.round(input.sourceHeight));
  const safePad = Math.max(0, Math.round(input.padding));
  const chromeHeight =
    input.frameStyle === 'none' ? 0 : Math.max(28, Math.round(Math.min(44, safeSrcH * 0.042)));

  const totalContentW = safeSrcW;
  const totalContentH = safeSrcH + chromeHeight;

  const targetRatio = ASPECT_RATIOS[input.aspectRatio];
  let canvasWidth: number;
  let canvasHeight: number;

  if (targetRatio === null) {
    canvasWidth = totalContentW + safePad * 2;
    canvasHeight = totalContentH + safePad * 2;
  } else {
    const minW = totalContentW + safePad * 2;
    const minH = totalContentH + safePad * 2;
    if (minW / minH > targetRatio) {
      canvasWidth = minW;
      canvasHeight = Math.round(minW / targetRatio);
    } else {
      canvasHeight = minH;
      canvasWidth = Math.round(minH * targetRatio);
    }
  }

  const availW = Math.max(1, canvasWidth - safePad * 2);
  const availH = Math.max(1, canvasHeight - safePad * 2);
  const scale = Math.min(availW / totalContentW, availH / totalContentH, 1);

  const frameWidth = Math.round(totalContentW * scale);
  const scaledChrome = Math.round(chromeHeight * scale);
  const contentWidth = frameWidth;
  const contentHeight = Math.round(safeSrcH * scale);
  const frameHeight = contentHeight + scaledChrome;

  const frameX = Math.round((canvasWidth - frameWidth) / 2);
  const frameY = Math.round((canvasHeight - frameHeight) / 2);

  const maxRadius = Math.floor(Math.min(frameWidth, frameHeight) / 2);
  const effectiveRadius = Math.max(0, Math.min(Math.round(input.cornerRadius), maxRadius));

  return {
    canvasWidth,
    canvasHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    chromeHeight: scaledChrome,
    contentX: frameX,
    contentY: frameY + scaledChrome,
    contentWidth,
    contentHeight,
    effectiveRadius,
  };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawBackgroundToCanvas(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundItem,
  width: number,
  height: number,
  loadedImage?: HTMLImageElement | null
): void {
  if (bg.kind === 'image' && loadedImage && loadedImage.complete && loadedImage.naturalWidth > 0) {
    const crop = computeCoverDrawRect(
      loadedImage.naturalWidth,
      loadedImage.naturalHeight,
      width,
      height
    );
    ctx.drawImage(
      loadedImage,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      width,
      height
    );
    return;
  }

  const colors = bg.colors && bg.colors.length >= 2 ? bg.colors : ['#1D4ED8', '#06B6D4', '#EC4899'];
  const angle = typeof bg.angle === 'number' ? bg.angle : 135;
  const pts = computeGradientEndpoints(width, height, angle);
  const grad = ctx.createLinearGradient(pts.x0, pts.y0, pts.x1, pts.y1);
  colors.forEach((color, idx) => {
    grad.addColorStop(idx / Math.max(1, colors.length - 1), color);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

export interface CompositorEffectsOptions {
  zoomCamera?: ZoomCameraState;
  highlightDrag?: HighlightDragState;
  highlightColor?: HighlightColorId;
}

export function renderCompositedFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  settings: StudioStyleSettings,
  bg: BackgroundItem,
  bgImage?: HTMLImageElement | null,
  effects?: CompositorEffectsOptions
): CanvasLayoutResult {
  const layout = computeCanvasLayout({
    sourceWidth,
    sourceHeight,
    aspectRatio: settings.aspectRatio,
    padding: settings.padding,
    cornerRadius: settings.cornerRadius,
    frameStyle: settings.frameStyle,
  });

  if (ctx.canvas.width !== layout.canvasWidth || ctx.canvas.height !== layout.canvasHeight) {
    ctx.canvas.width = layout.canvasWidth;
    ctx.canvas.height = layout.canvasHeight;
  }

  ctx.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight);

  // 1. Vibrant background
  drawBackgroundToCanvas(ctx, bg, layout.canvasWidth, layout.canvasHeight, bgImage);

  // 2. Drop shadow behind framed window
  const shadowAlpha = Math.max(0, Math.min(1, settings.shadowIntensity / 100));
  if (shadowAlpha > 0) {
    ctx.save();
    drawRoundedRectPath(
      ctx,
      layout.frameX,
      layout.frameY,
      layout.frameWidth,
      layout.frameHeight,
      layout.effectiveRadius
    );
    ctx.shadowColor = `rgba(4, 6, 14, ${(0.55 * shadowAlpha).toFixed(3)})`;
    ctx.shadowBlur = Math.round(64 * shadowAlpha + 12);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(24 * shadowAlpha + 4);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.restore();
  }

  // 3. Clipped rounded frame containing chrome + screen source
  ctx.save();
  drawRoundedRectPath(
    ctx,
    layout.frameX,
    layout.frameY,
    layout.frameWidth,
    layout.frameHeight,
    layout.effectiveRadius
  );
  ctx.clip();

  if (layout.chromeHeight > 0) {
    const isLight = settings.frameStyle === 'macos-light';
    ctx.fillStyle = isLight ? '#F1F5F9' : '#181B24';
    ctx.fillRect(layout.frameX, layout.frameY, layout.frameWidth, layout.chromeHeight);

    // Subtle divider line below window bar
    ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(layout.frameX, layout.frameY + layout.chromeHeight - 1, layout.frameWidth, 1);

    // Window traffic lights
    const dotY = layout.frameY + layout.chromeHeight / 2;
    const dotRadius = Math.max(4, Math.round(layout.chromeHeight * 0.16));
    const startX = layout.frameX + Math.round(layout.chromeHeight * 0.55);
    const gap = Math.round(dotRadius * 3.1);
    const dotColors = ['#FF5F56', '#FFBD2E', '#27C93F'];
    dotColors.forEach((col, i) => {
      ctx.beginPath();
      ctx.arc(startX + i * gap, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    });
  }

  // Draw screen source with optional smooth zoom crop
  if (effects?.zoomCamera && effects.zoomCamera.currentScale > 1.001) {
    const crop = computeZoomedSourceCrop(
      sourceWidth,
      sourceHeight,
      effects.zoomCamera.currentScale,
      effects.zoomCamera.currentFocalX,
      effects.zoomCamera.currentFocalY
    );
    ctx.drawImage(
      source,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      layout.contentX,
      layout.contentY,
      layout.contentWidth,
      layout.contentHeight
    );
  } else {
    ctx.drawImage(
      source,
      layout.contentX,
      layout.contentY,
      layout.contentWidth,
      layout.contentHeight
    );
  }

  // Draw PDF-style sentence highlight while mouse key is pressed
  if (effects?.highlightDrag?.active) {
    const lineH = Math.max(18, Math.round(layout.contentHeight * 0.036));
    const boxes = computePdfSentenceHighlightRects(
      effects.highlightDrag,
      layout.contentWidth,
      layout.contentHeight,
      lineH
    );
    if (boxes.length > 0) {
      const color = HIGHLIGHT_COLOR_RGBA[effects.highlightColor ?? 'amber'];
      ctx.save();
      ctx.fillStyle = color;
      for (const box of boxes) {
        ctx.beginPath();
        ctx.roundRect(layout.contentX + box.x, layout.contentY + box.y, box.width, box.height, 4);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  ctx.restore();

  // 4. Crisp 1px inner border around frame
  ctx.save();
  drawRoundedRectPath(
    ctx,
    layout.frameX + 0.5,
    layout.frameY + 0.5,
    layout.frameWidth - 1,
    layout.frameHeight - 1,
    layout.effectiveRadius
  );
  ctx.strokeStyle =
    settings.frameStyle === 'macos-light'
      ? 'rgba(255, 255, 255, 0.55)'
      : 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  return layout;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode screenshot as PNG.'));
          return;
        }
        resolve(blob);
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Generates a crisp deterministic sample workspace canvas so users can preview
 * backgrounds, padding, corners, chrome, and instant clipboard export immediately.
 */
export function createSamplePreviewCanvas(width = 1280, height = 760): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // App surface background
  ctx.fillStyle = '#0F1219';
  ctx.fillRect(0, 0, width, height);

  // Left sidebar inside sample app
  ctx.fillStyle = '#141822';
  ctx.fillRect(0, 0, 230, height);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(229, 0, 1, height);

  // Sidebar brand
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Northstar Metrics', 24, 42);

  // Sidebar items
  const navItems = ['Overview', 'Revenue', 'Deployments', 'Latency', 'Team'];
  navItems.forEach((label, idx) => {
    const y = 92 + idx * 42;
    if (idx === 0) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.16)';
      ctx.beginPath();
      ctx.roundRect(14, y - 22, 202, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#A5B4FC';
    } else {
      ctx.fillStyle = '#94A3B8';
    }
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(label, 28, y);
  });

  // Main header inside sample app
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Production Release · Q4 Cohort', 274, 54);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Last 30 days · 99.98% uptime · Region ap-southeast-1', 274, 78);

  // 3 KPI cards
  const kpis = [
    { label: 'Active Sessions', value: '48,290', delta: '+14.2%' },
    { label: 'Median Render', value: '18.4 ms', delta: '-6.1%' },
    { label: 'Export Success', value: '99.94%', delta: '+0.4%' },
  ];
  kpis.forEach((kpi, idx) => {
    const x = 274 + idx * 326;
    const y = 112;
    ctx.fillStyle = '#161B26';
    ctx.beginPath();
    ctx.roundRect(x, y, 306, 114, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(kpi.label, x + 22, y + 34);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 28px "JetBrains Mono", monospace';
    ctx.fillText(kpi.value, x + 22, y + 74);

    ctx.fillStyle = '#34D399';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText(kpi.delta, x + 220, y + 74);
  });

  // Chart panel
  ctx.fillStyle = '#161B26';
  ctx.beginPath();
  ctx.roundRect(274, 252, 958, 300, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Throughput & Frame Compositing', 302, 290);

  // Subtle horizontal gridlines
  for (let i = 0; i < 3; i++) {
    const gy = 330 + i * 65;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(302, gy, 902, 1);
  }

  // Vibrant area curve inside sample chart
  const points = [
    [302, 488],
    [410, 456],
    [520, 428],
    [630, 444],
    [740, 380],
    [850, 355],
    [960, 368],
    [1080, 322],
    [1204, 308],
  ];

  const areaGrad = ctx.createLinearGradient(0, 308, 0, 520);
  areaGrad.addColorStop(0, 'rgba(99, 102, 241, 0.38)');
  areaGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
  ctx.beginPath();
  ctx.moveTo(points[0][0], 520);
  points.forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.lineTo(points[points.length - 1][0], 520);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  ctx.beginPath();
  points.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Readable document / release notes panel for PDF-style sentence highlighting & zoom testing
  ctx.fillStyle = '#161B26';
  ctx.beginPath();
  ctx.roundRect(274, 572, 958, 148, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Interactive Recording Notes (Double-click to Zoom · Press & Drag to Highlight)', 302, 606);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '400 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Double-tapping any spot on the canvas zooms the camera smoothly into the selected region and zooms back out on the second tap.',
    302,
    642
  );
  ctx.fillText(
    'Pressing and dragging across any sentence highlights it like a PDF reader, and releasing the mouse key returns the text to normal.',
    302,
    672
  );
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(
    'Use the Video Editor tab to trim clips, cut unwanted middle sections, and mix studio background music before exporting.',
    302,
    700
  );

  return canvas;
}
