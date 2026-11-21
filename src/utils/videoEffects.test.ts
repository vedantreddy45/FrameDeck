import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePdfSentenceHighlightRects,
  computeZoomedSourceCrop,
  createInitialHighlightDrag,
  createInitialZoomCamera,
  stepZoomCamera,
  toggleZoomAtPoint,
} from './videoEffects';

test('double-tap zoom toggles in at cursor point and back out to 1x', () => {
  let cam = createInitialZoomCamera();
  assert.equal(cam.isZoomed, false);

  cam = toggleZoomAtPoint(cam, 0.25, 0.75, 2.0);
  assert.equal(cam.isZoomed, true);
  assert.equal(cam.targetScale, 2.0);
  assert.equal(cam.targetFocalX, 0.25);
  assert.equal(cam.targetFocalY, 0.75);

  for (let i = 0; i < 60; i++) {
    cam = stepZoomCamera(cam, 16);
  }
  assert.ok(Math.abs(cam.currentScale - 2.0) < 0.01);

  cam = toggleZoomAtPoint(cam, 0.25, 0.75, 2.0);
  assert.equal(cam.isZoomed, false);
  assert.equal(cam.targetScale, 1);

  for (let i = 0; i < 60; i++) {
    cam = stepZoomCamera(cam, 16);
  }
  assert.ok(Math.abs(cam.currentScale - 1.0) < 0.01);
});

test('computeZoomedSourceCrop keeps zoomed rectangle within source bounds', () => {
  const crop = computeZoomedSourceCrop(1920, 1080, 2.0, 0.9, 0.1);
  assert.equal(crop.sw, 960);
  assert.equal(crop.sh, 540);
  assert.ok(crop.sx >= 0 && crop.sx + crop.sw <= 1920);
  assert.ok(crop.sy >= 0 && crop.sy + crop.sh <= 1080);

  const unzoomed = computeZoomedSourceCrop(1920, 1080, 1.0, 0.5, 0.5);
  assert.deepEqual(unzoomed, { sx: 0, sy: 0, sw: 1920, sh: 1080 });
});

test('computePdfSentenceHighlightRects creates single and multi-line bands only while pressed', () => {
  const idle = createInitialHighlightDrag();
  assert.deepEqual(computePdfSentenceHighlightRects(idle, 1000, 600), []);

  const singleLine = {
    active: true,
    startX: 0.2,
    startY: 0.5,
    currentX: 0.6,
    currentY: 0.5,
  };
  const singleRects = computePdfSentenceHighlightRects(singleLine, 1000, 600, 24);
  assert.equal(singleRects.length, 1);
  assert.equal(singleRects[0].x, 200);
  assert.equal(singleRects[0].width, 400);

  const multiLine = {
    active: true,
    startX: 0.3,
    startY: 0.2,
    currentX: 0.5,
    currentY: 0.35,
  };
  const multiRects = computePdfSentenceHighlightRects(multiLine, 1000, 600, 24);
  assert.ok(multiRects.length >= 3);

  // Releasing mouse clears highlight back to normal
  const released = { ...multiLine, active: false };
  assert.deepEqual(computePdfSentenceHighlightRects(released, 1000, 600, 24), []);
});
