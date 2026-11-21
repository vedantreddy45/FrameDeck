import { BuiltinMusicTrack } from '../types/studio';

export const BUILTIN_MUSIC_TRACKS: BuiltinMusicTrack[] = [
  {
    id: 'lofi-focus',
    name: 'Lo-Fi Focus Rhodes',
    bpm: 84,
    mood: 'Warm · Mellow',
    durationSec: 16,
  },
  {
    id: 'ambient-pulse',
    name: 'Studio Ambient Pad',
    bpm: 96,
    mood: 'Clean · Atmospheric',
    durationSec: 16,
  },
  {
    id: 'upbeat-pluck',
    name: 'Indigo Tech Pluck',
    bpm: 112,
    mood: 'Bright · Crisp',
    durationSec: 16,
  },
];

/**
 * Synthesizes a seamless loopable AudioBuffer offline so built-in background music
 * works 100% locally without broken external CDN audio URLs.
 */
export async function synthesizeMusicBuffer(
  trackId: string,
  sampleRate = 44100
): Promise<AudioBuffer> {
  const track = BUILTIN_MUSIC_TRACKS.find((t) => t.id === trackId) ?? BUILTIN_MUSIC_TRACKS[0];
  const duration = track.durationSec;
  const offline = new OfflineAudioContext(2, Math.floor(sampleRate * duration), sampleRate);

  const master = offline.createGain();
  master.gain.value = 0.42;
  master.connect(offline.destination);

  const chords =
    track.id === 'upbeat-pluck'
      ? [
          [261.63, 329.63, 392.0, 493.88],
          [220.0, 261.63, 329.63, 392.0],
          [174.61, 220.0, 261.63, 349.23],
          [196.0, 246.94, 293.66, 392.0],
        ]
      : track.id === 'ambient-pulse'
      ? [
          [196.0, 293.66, 392.0, 440.0],
          [174.61, 261.63, 349.23, 440.0],
          [146.83, 220.0, 293.66, 392.0],
          [164.81, 246.94, 329.63, 440.0],
        ]
      : [
          [220.0, 261.63, 329.63, 392.0],
          [174.61, 220.0, 261.63, 329.63],
          [196.0, 246.94, 293.66, 349.23],
          [164.81, 246.94, 329.63, 392.0],
        ];

  const barDuration = duration / chords.length;

  chords.forEach((notes, barIdx) => {
    const start = barIdx * barDuration;
    notes.forEach((freq, noteIdx) => {
      const osc = offline.createOscillator();
      const gain = offline.createGain();
      osc.type = track.id === 'upbeat-pluck' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      const noteGain = track.id === 'ambient-pulse' ? 0.14 : 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(noteGain, start + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, start + barDuration - 0.05);

      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + barDuration);

      // Gentle rhythmic pluck arpeggio for upbeat/lofi tracks
      if (track.id !== 'ambient-pulse') {
        const subStep = barDuration / 4;
        for (let step = 0; step < 4; step++) {
          if (step % 2 !== noteIdx % 2) continue;
          const pStart = start + step * subStep;
          const pOsc = offline.createOscillator();
          const pGain = offline.createGain();
          pOsc.type = 'triangle';
          pOsc.frequency.setValueAtTime(freq * 2, pStart);
          pGain.gain.setValueAtTime(0.0001, pStart);
          pGain.gain.linearRampToValueAtTime(0.06, pStart + 0.02);
          pGain.gain.exponentialRampToValueAtTime(0.0008, pStart + subStep * 0.85);
          pOsc.connect(pGain);
          pGain.connect(master);
          pOsc.start(pStart);
          pOsc.stop(pStart + subStep);
        }
      }
    });
  });

  return offline.startRendering();
}
