import { ShortcutActionId, ShortcutBinding } from '../types/studio';

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  {
    id: 'screenshot',
    label: 'Take Screenshot',
    description: 'Open screen picker, composite vibrant background, and copy PNG to clipboard',
    code: 'KeyS',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
  },
  {
    id: 'recordToggle',
    label: 'Start / Stop Recording',
    description: 'Begin or finish high-quality screen video recording with audio',
    code: 'KeyR',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
  },
  {
    id: 'recordPause',
    label: 'Pause / Resume Video',
    description: 'Pause or resume the active video recording stream',
    code: 'KeyP',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
  },
  {
    id: 'copyLatest',
    label: 'Copy to Clipboard',
    description: 'Copy the current composited PNG frame directly to your clipboard',
    code: 'KeyC',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
  },
  {
    id: 'downloadLatest',
    label: 'Download Capture',
    description: 'Save the current composited screenshot or latest video to disk',
    code: 'KeyD',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
  },
  {
    id: 'sampleCapture',
    label: 'Capture Sample Frame',
    description: 'Render the studio canvas to Captures and copy to clipboard',
    code: 'KeyF',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
  },
];

const MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
]);

export function isModifierOnlyKey(code: string): boolean {
  return MODIFIER_CODES.has(code);
}

export function formatKeyCodeLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Space';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'Backquote') return '`';
  if (code === 'Minus') return '-';
  if (code === 'Equal') return '=';
  return code;
}

export function formatShortcutParts(
  binding: Pick<ShortcutBinding, 'code' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'>,
  isMac = false
): string[] {
  const parts: string[] = [];
  if (binding.ctrlKey) parts.push('Ctrl');
  if (binding.altKey) parts.push(isMac ? '⌥' : 'Alt');
  if (binding.shiftKey) parts.push('Shift');
  if (binding.metaKey) parts.push(isMac ? '⌘' : 'Win');
  parts.push(formatKeyCodeLabel(binding.code));
  return parts;
}

export function matchesShortcut(
  event: {
    code: string;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
  },
  binding: ShortcutBinding
): boolean {
  return (
    event.code === binding.code &&
    Boolean(event.altKey) === Boolean(binding.altKey) &&
    Boolean(event.ctrlKey) === Boolean(binding.ctrlKey) &&
    Boolean(event.shiftKey) === Boolean(binding.shiftKey) &&
    Boolean(event.metaKey) === Boolean(binding.metaKey)
  );
}

export function findShortcutConflict(
  candidate: Pick<ShortcutBinding, 'code' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'>,
  bindings: ShortcutBinding[],
  excludeId: ShortcutActionId
): ShortcutBinding | null {
  for (const existing of bindings) {
    if (existing.id === excludeId) continue;
    if (matchesShortcut(candidate, existing)) {
      return existing;
    }
  }
  return null;
}

export function hasAnyModifier(
  binding: Pick<ShortcutBinding, 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'>
): boolean {
  return binding.altKey || binding.ctrlKey || binding.shiftKey || binding.metaKey;
}
