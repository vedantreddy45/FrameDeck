import { BackgroundItem } from '../types/studio';

export const BUILTIN_BACKGROUNDS: BackgroundItem[] = [
  {
    id: 'wall-aurora-prism',
    name: 'Aurora Prism',
    kind: 'image',
    isCustom: false,
    imageUrl: '/src/assets/images/bg_aurora_prism_1795255573767.jpg',
    createdAt: 1,
  },
  {
    id: 'wall-sunset-mesh',
    name: 'Sunset Mesh',
    kind: 'image',
    isCustom: false,
    imageUrl: '/src/assets/images/bg_sunset_mesh_1795255574092.jpg',
    createdAt: 2,
  },
  {
    id: 'wall-emerald-ocean',
    name: 'Emerald Ocean',
    kind: 'image',
    isCustom: false,
    imageUrl: '/src/assets/images/bg_emerald_ocean_1795255574357.jpg',
    createdAt: 3,
  },
  {
    id: 'wall-velvet-nebula',
    name: 'Velvet Nebula',
    kind: 'image',
    isCustom: false,
    imageUrl: '/src/assets/images/bg_velvet_nebula_1795255573581.jpg',
    createdAt: 4,
  },
  {
    id: 'grad-solar-flare',
    name: 'Solar Flare',
    kind: 'gradient',
    isCustom: false,
    colors: ['#FF4D4D', '#F97316', '#FACC15'],
    angle: 135,
    createdAt: 5,
  },
  {
    id: 'grad-electric-cobalt',
    name: 'Electric Cobalt',
    kind: 'gradient',
    isCustom: false,
    colors: ['#1D4ED8', '#06B6D4', '#38BDF8'],
    angle: 130,
    createdAt: 6,
  },
  {
    id: 'grad-orchid-bloom',
    name: 'Orchid Bloom',
    kind: 'gradient',
    isCustom: false,
    colors: ['#6366F1', '#EC4899', '#FB7185'],
    angle: 140,
    createdAt: 7,
  },
  {
    id: 'grad-nordic-mint',
    name: 'Nordic Mint',
    kind: 'gradient',
    isCustom: false,
    colors: ['#0D9488', '#10B981', '#A3E635'],
    angle: 125,
    createdAt: 8,
  },
  {
    id: 'grad-crimson-dusk',
    name: 'Crimson Dusk',
    kind: 'gradient',
    isCustom: false,
    colors: ['#4C1D95', '#BE185D', '#F43F5E'],
    angle: 145,
    createdAt: 9,
  },
  {
    id: 'grad-tangerine-sky',
    name: 'Tangerine Sky',
    kind: 'gradient',
    isCustom: false,
    colors: ['#7C3AED', '#F97316', '#FDE047'],
    angle: 120,
    createdAt: 10,
  },
  {
    id: 'grad-arctic-glass',
    name: 'Arctic Glass',
    kind: 'gradient',
    isCustom: false,
    colors: ['#0F172A', '#0284C7', '#67E8F9'],
    angle: 135,
    createdAt: 11,
  },
  {
    id: 'grad-obsidian-studio',
    name: 'Obsidian Studio',
    kind: 'gradient',
    isCustom: false,
    colors: ['#0F172A', '#1E293B', '#334155'],
    angle: 135,
    createdAt: 12,
  },
];

export function buildBackgroundCss(bg: BackgroundItem): string {
  if (bg.kind === 'image' && bg.imageUrl) {
    return `url("${bg.imageUrl}") center / cover no-repeat`;
  }
  const colors = bg.colors && bg.colors.length >= 2 ? bg.colors : ['#1D4ED8', '#06B6D4'];
  const angle = typeof bg.angle === 'number' ? bg.angle : 135;
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
}

export function computeGradientEndpoints(
  width: number,
  height: number,
  angleDeg: number
): { x0: number; y0: number; x1: number; y1: number } {
  const normalized = ((angleDeg % 360) + 360) % 360;
  // CSS linear-gradient 0deg points up (0, -1), 90deg points right (1, 0)
  const rad = ((normalized - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;
  const halfLen = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  return {
    x0: cx - dx * halfLen,
    y0: cy - dy * halfLen,
    x1: cx + dx * halfLen,
    y1: cy + dy * halfLen,
  };
}

export function computeCoverDrawRect(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): { sx: number; sy: number; sw: number; sh: number } {
  if (imgWidth <= 0 || imgHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(1, imgWidth), sh: Math.max(1, imgHeight) };
  }
  const imgRatio = imgWidth / imgHeight;
  const targetRatio = targetWidth / targetHeight;
  if (imgRatio > targetRatio) {
    const sw = imgHeight * targetRatio;
    const sx = (imgWidth - sw) / 2;
    return { sx, sy: 0, sw, sh: imgHeight };
  }
  const sh = imgWidth / targetRatio;
  const sy = (imgHeight - sh) / 2;
  return { sx: 0, sy, sw: imgWidth, sh };
}

export function validateCustomGradientInput(
  name: string,
  colors: string[],
  angle: number
): { valid: boolean; error?: string } {
  if (!name.trim()) {
    return { valid: false, error: 'Please enter a background name.' };
  }
  if (!Array.isArray(colors) || colors.length < 2) {
    return { valid: false, error: 'At least two color stops are required.' };
  }
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  for (const color of colors) {
    if (!hexRegex.test(color)) {
      return { valid: false, error: `Invalid hex color: ${color}` };
    }
  }
  if (!Number.isFinite(angle) || angle < 0 || angle > 360) {
    return { valid: false, error: 'Angle must be between 0 and 360 degrees.' };
  }
  return { valid: true };
}

export function createCustomGradientBackground(
  name: string,
  colors: string[],
  angle: number
): BackgroundItem {
  const cleanName = name.trim() || 'Custom Gradient';
  return {
    id: `custom-grad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    kind: 'gradient',
    isCustom: true,
    colors: [...colors],
    angle: Math.round(angle),
    createdAt: Date.now(),
  };
}
