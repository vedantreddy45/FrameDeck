import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCanvasLayout } from './canvasCompositor';

test('computeCanvasLayout computes auto aspect ratio with exact padding and no chrome', () => {
  const layout = computeCanvasLayout({
    sourceWidth: 1920,
    sourceHeight: 1080,
    aspectRatio: 'auto',
    padding: 80,
    cornerRadius: 20,
    frameStyle: 'none',
  });

  assert.equal(layout.canvasWidth, 2080);
  assert.equal(layout.canvasHeight, 1240);
  assert.equal(layout.frameX, 80);
  assert.equal(layout.frameY, 80);
  assert.equal(layout.frameWidth, 1920);
  assert.equal(layout.frameHeight, 1080);
  assert.equal(layout.chromeHeight, 0);
  assert.equal(layout.effectiveRadius, 20);
});

test('computeCanvasLayout expands height to preserve 1:1 square aspect ratio', () => {
  const layout = computeCanvasLayout({
    sourceWidth: 1200,
    sourceHeight: 600,
    aspectRatio: '1:1',
    padding: 50,
    cornerRadius: 16,
    frameStyle: 'none',
  });

  assert.equal(layout.canvasWidth, 1300);
  assert.equal(layout.canvasHeight, 1300);
  assert.equal(layout.frameX, 50);
  assert.equal(layout.frameY, 350);
});

test('computeCanvasLayout accounts for macOS window chrome height and clamps excessive corner radius', () => {
  const layout = computeCanvasLayout({
    sourceWidth: 400,
    sourceHeight: 200,
    aspectRatio: 'auto',
    padding: 20,
    cornerRadius: 999,
    frameStyle: 'macos-dark',
  });

  assert.ok(layout.chromeHeight >= 28);
  assert.equal(layout.contentHeight, 200);
  assert.equal(layout.frameHeight, 200 + layout.chromeHeight);
  assert.ok(layout.effectiveRadius <= Math.floor(layout.frameHeight / 2));
});

test('computeCanvasLayout handles 9:16 portrait export cleanly', () => {
  const layout = computeCanvasLayout({
    sourceWidth: 1000,
    sourceHeight: 1000,
    aspectRatio: '9:16',
    padding: 60,
    cornerRadius: 18,
    frameStyle: 'macos-light',
  });

  const ratio = layout.canvasWidth / layout.canvasHeight;
  assert.ok(Math.abs(ratio - 9 / 16) < 0.01);
  assert.ok(layout.frameX >= 60);
  assert.ok(layout.frameY >= 60);
});
