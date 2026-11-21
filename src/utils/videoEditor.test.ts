import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeKeptSegments,
  findNextPlaybackTime,
  mapEditedTimeToSourceTime,
} from './videoEditor';

test('computeKeptSegments subtracts and merges overlapping cut ranges cleanly', () => {
  const { segments, totalDurationSec } = computeKeptSegments(20, 2, 18, [
    { id: 'c1', startSec: 5, endSec: 8 },
    { id: 'c2', startSec: 7.5, endSec: 10 },
    { id: 'c3', startSec: 13, endSec: 15 },
  ]);

  assert.deepEqual(segments, [
    { startSec: 2, endSec: 5 },
    { startSec: 10, endSec: 13 },
    { startSec: 15, endSec: 18 },
  ]);
  assert.equal(totalDurationSec, 9);
});

test('mapEditedTimeToSourceTime translates edited playhead across cuts', () => {
  const { segments } = computeKeptSegments(20, 0, 20, [{ id: 'c1', startSec: 5, endSec: 15 }]);
  assert.equal(mapEditedTimeToSourceTime(2, segments), 2);
  assert.equal(mapEditedTimeToSourceTime(6, segments), 16);
});

test('findNextPlaybackTime jumps over cut segments and detects end of clip', () => {
  const { segments } = computeKeptSegments(20, 1, 16, [{ id: 'c1', startSec: 5, endSec: 10 }]);
  assert.deepEqual(findNextPlaybackTime(0.5, segments), { nextTime: 1, ended: false });
  assert.deepEqual(findNextPlaybackTime(6.2, segments), { nextTime: 10, ended: false });
  assert.deepEqual(findNextPlaybackTime(16.0, segments), { nextTime: 1, ended: true });
});
