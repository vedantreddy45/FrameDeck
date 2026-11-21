import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_BACKGROUNDS,
  buildBackgroundCss,
  computeCoverDrawRect,
  computeGradientEndpoints,
  createCustomGradientBackground,
  validateCustomGradientInput,
} from './backgrounds';

test('BUILTIN_BACKGROUNDS includes generated wallpapers and vibrant gradients', () => {
  const images = BUILTIN_BACKGROUNDS.filter((b) => b.kind === 'image');
  const gradients = BUILTIN_BACKGROUNDS.filter((b) => b.kind === 'gradient');
  assert.equal(images.length, 4);
  assert.ok(gradients.length >= 6);
  for (const bg of BUILTIN_BACKGROUNDS) {
    assert.equal(bg.isCustom, false);
    assert.ok(bg.name.length > 0);
  }
});

test('buildBackgroundCss formats gradients and image URLs', () => {
  const gradCss = buildBackgroundCss({
    id: 'g1',
    name: 'Test',
    kind: 'gradient',
    isCustom: false,
    colors: ['#FF0000', '#0000FF'],
    angle: 90,
    createdAt: 1,
  });
  assert.equal(gradCss, 'linear-gradient(90deg, #FF0000, #0000FF)');

  const imgCss = buildBackgroundCss({
    id: 'i1',
    name: 'Img',
    kind: 'image',
    isCustom: false,
    imageUrl: '/src/assets/images/test.jpg',
    createdAt: 1,
  });
  assert.equal(imgCss, 'url("/src/assets/images/test.jpg") center / cover no-repeat');
});

test('computeGradientEndpoints maps 90deg left-to-right and 180deg top-to-bottom', () => {
  const lr = computeGradientEndpoints(1000, 500, 90);
  assert.ok(Math.abs(lr.x0 - 0) < 1e-6);
  assert.ok(Math.abs(lr.x1 - 1000) < 1e-6);

  const tb = computeGradientEndpoints(1000, 500, 180);
  assert.ok(Math.abs(tb.y0 - 0) < 1e-6);
  assert.ok(Math.abs(tb.y1 - 500) < 1e-6);
});

test('computeCoverDrawRect crops wider image horizontally to match target aspect', () => {
  const rect = computeCoverDrawRect(1920, 1080, 1000, 1000);
  assert.equal(rect.sh, 1080);
  assert.equal(rect.sw, 1080);
  assert.equal(rect.sx, 420);
  assert.equal(rect.sy, 0);
});

test('validateCustomGradientInput validates name, hex colors, and angle', () => {
  assert.equal(validateCustomGradientInput('', ['#FF0000', '#00FF00'], 135).valid, false);
  assert.equal(validateCustomGradientInput('My Bg', ['#FF0000'], 135).valid, false);
  assert.equal(validateCustomGradientInput('My Bg', ['red', '#00FF00'], 135).valid, false);
  assert.equal(validateCustomGradientInput('My Bg', ['#FF0000', '#00FF00'], 400).valid, false);
  assert.equal(validateCustomGradientInput('Vibrant', ['#FF0000', '#00FF00'], 135).valid, true);
});

test('createCustomGradientBackground marks item as custom', () => {
  const bg = createCustomGradientBackground('  Neon Berry ', ['#EC4899', '#6366F1'], 120.4);
  assert.equal(bg.name, 'Neon Berry');
  assert.equal(bg.isCustom, true);
  assert.equal(bg.angle, 120);
  assert.deepEqual(bg.colors, ['#EC4899', '#6366F1']);
});
