export interface AudioMixerSession {
  mixedAudioTracks: MediaStreamTrack[];
  setMicVolume: (vol: number) => void;
  setSystemVolume: (vol: number) => void;
  getLevels: () => { mic: number; system: number };
  hasMicTrack: boolean;
  hasSystemTrack: boolean;
  dispose: () => void;
}

function readPeakLevel(analyser: AnalyserNode | null, buffer: Uint8Array<ArrayBuffer>): number {
  if (!analyser) return 0;
  analyser.getByteTimeDomainData(buffer);
  let maxDeviation = 0;
  for (let i = 0; i < buffer.length; i++) {
    const dev = Math.abs(buffer[i] - 128) / 128;
    if (dev > maxDeviation) maxDeviation = dev;
  }
  return Math.min(1, maxDeviation * 2.2);
}

export function createAudioMixerSession(options: {
  displayStream: MediaStream | null;
  micStream: MediaStream | null;
  systemVolume: number;
  micVolume: number;
}): AudioMixerSession {
  const displayAudioTracks = options.displayStream?.getAudioTracks() ?? [];
  const micAudioTracks = options.micStream?.getAudioTracks() ?? [];

  const hasSystemTrack = displayAudioTracks.length > 0;
  const hasMicTrack = micAudioTracks.length > 0;

  if (!hasSystemTrack && !hasMicTrack) {
    return {
      mixedAudioTracks: [],
      setMicVolume: () => {},
      setSystemVolume: () => {},
      getLevels: () => ({ mic: 0, system: 0 }),
      hasMicTrack: false,
      hasSystemTrack: false,
      dispose: () => {},
    };
  }

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const destination = ctx.createMediaStreamDestination();

  let systemGain: GainNode | null = null;
  let systemAnalyser: AnalyserNode | null = null;
  if (hasSystemTrack) {
    const sysOnlyStream = new MediaStream(displayAudioTracks);
    const sysSource = ctx.createMediaStreamSource(sysOnlyStream);
    systemGain = ctx.createGain();
    systemGain.gain.value = options.systemVolume;
    systemAnalyser = ctx.createAnalyser();
    systemAnalyser.fftSize = 256;
    sysSource.connect(systemGain);
    systemGain.connect(systemAnalyser);
    systemGain.connect(destination);
  }

  let micGain: GainNode | null = null;
  let micAnalyser: AnalyserNode | null = null;
  if (hasMicTrack) {
    const micOnlyStream = new MediaStream(micAudioTracks);
    const micSource = ctx.createMediaStreamSource(micOnlyStream);
    micGain = ctx.createGain();
    micGain.gain.value = options.micVolume;
    micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 256;
    micSource.connect(micGain);
    micGain.connect(micAnalyser);
    micGain.connect(destination);
  }

  const sysBuffer = new Uint8Array(new ArrayBuffer(128));
  const micBuffer = new Uint8Array(new ArrayBuffer(128));

  return {
    mixedAudioTracks: destination.stream.getAudioTracks(),
    setMicVolume: (vol: number) => {
      if (micGain) micGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.02);
    },
    setSystemVolume: (vol: number) => {
      if (systemGain) systemGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.02);
    },
    getLevels: () => ({
      mic: readPeakLevel(micAnalyser, micBuffer),
      system: readPeakLevel(systemAnalyser, sysBuffer),
    }),
    hasMicTrack,
    hasSystemTrack,
    dispose: () => {
      micAudioTracks.forEach((t) => t.stop());
      void ctx.close().catch(() => {});
    },
  };
}
