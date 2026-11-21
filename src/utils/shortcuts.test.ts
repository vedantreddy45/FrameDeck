import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHORTCUTS,
  findShortcutConflict,
  formatKeyCodeLabel,
  formatShortcutParts,
  hasAnyModifier,
  isModifierOnlyKey,
  matchesShortcut,
} from './shortcuts';

test('DEFAULT_SHORTCUTS have unique key combinations', () => {
  for (const s of DEFAULT_SHORTCUTS) {
    const conflict = findShortcutConflict(s, DEFAULT_SHORTCUTS, s.id);
    assert.equal(conflict, null, `Duplicate default shortcut found for ${s.id}`);
  }
});

test('matchesShortcut requires exact key code and modifier match', () => {
  const screenshot = DEFAULT_SHORTCUTS.find((s) => s.id === 'screenshot')!;
  assert.equal(
    matchesShortcut(
      { code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
      screenshot
    ),
    true
  );
  assert.equal(
    matchesShortcut(
      { code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false },
      screenshot
    ),
    false
  );
});

test('formatShortcutParts formats Windows/Linux and macOS labels cleanly', () => {
  const partsWin = formatShortcutParts(
    { code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false },
    false
  );
  assert.deepEqual(partsWin, ['Alt', 'Shift', 'S']);

  const partsMac = formatShortcutParts(
    { code: 'Digit4', altKey: true, ctrlKey: false, shiftKey: false, metaKey: true },
    true
  );
  assert.deepEqual(partsMac, ['⌥', '⌘', '4']);
});

test('findShortcutConflict detects conflicting action when rebinding', () => {
  const conflict = findShortcutConflict(
    { code: 'KeyR', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    DEFAULT_SHORTCUTS,
    'screenshot'
  );
  assert.ok(conflict);
  assert.equal(conflict.id, 'recordToggle');
});

test('isModifierOnlyKey and formatKeyCodeLabel behave accurately', () => {
  assert.equal(isModifierOnlyKey('ShiftLeft'), true);
  assert.equal(isModifierOnlyKey('KeyX'), false);
  assert.equal(formatKeyCodeLabel('KeyX'), 'X');
  assert.equal(formatKeyCodeLabel('Space'), 'Space');
  assert.equal(hasAnyModifier({ altKey: false, ctrlKey: false, shiftKey: false, metaKey: false }), false);
  assert.equal(hasAnyModifier({ altKey: true, ctrlKey: false, shiftKey: false, metaKey: false }), true);
});
