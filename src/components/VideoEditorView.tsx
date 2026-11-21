import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Film,
  Music,
  Pause,
  Play,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { CaptureItem, CutRange } from '../types/studio';
import {
  formatDuration,
  pickSupportedRecorderMimeType,
  triggerBlobDownload,
} from '../utils/clipboard';
import { BUILTIN_MUSIC_TRACKS, synthesizeMusicBuffer } from '../utils/musicSynth';
import {
  computeKeptSegments,
  findNextPlaybackTime,
  mapEditedTimeToSourceTime,
} from '../utils/videoEditor';

interface VideoEditorViewProps {
  videoCaptures: CaptureItem[];
  initialVideoId: string | null;
  onSaveEditedVideo: (item: CaptureItem) => Promise<void>;
}

export function VideoEditorView({
  videoCaptures,
  initialVideoId,
  onSaveEditedVideo,
}: VideoEditorViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialVideoId);
  const [localVideoBlob, setLocalVideoBlob] = useState<{ name: string; blob: Blob } | null>(null);

  const activeSource = useMemo(() => {
    if (localVideoBlob) return localVideoBlob;
    const found =
      videoCaptures.find((v) => v.id === selectedId) ?? videoCaptures[0] ?? null;
    return found ? { name: found.name, blob: found.blob } : null;
  }, [localVideoBlob, selectedId, videoCaptures]);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Trim & Cut state
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(0);
  const [cutRanges, setCutRanges] = useState<CutRange[]>([]);
  const [pendingCutStart, setPendingCutStart] = useState<number | null>(null);

  // Music & Mixing state
  const [musicChoice, setMusicChoice] = useState<string>('none'); // 'none' | builtin id | 'custom'
  const [customMusicName, setCustomMusicName] = useState<string | null>(null);
  const [customMusicBuffer, setCustomMusicBuffer] = useState<AudioBuffer | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.45);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(1.0);
  const [isPreviewingMusic, setIsPreviewingMusic] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileVideoInputRef = useRef<HTMLInputElement | null>(null);
  const fileMusicInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioCtxRef = useRef<AudioContext | null>(null);
  const previewMusicSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (initialVideoId) {
      setSelectedId(initialVideoId);
      setLocalVideoBlob(null);
    }
  }, [initialVideoId]);

  useEffect(() => {
    if (!activeSource) {
      setVideoUrl(null);
      setDurationSec(0);
      return;
    }
    const url = URL.createObjectURL(activeSource.blob);
    setVideoUrl(url);
    setIsPlaying(false);
    setCutRanges([]);
    setPendingCutStart(null);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeSource]);

  const stopPreviewMusic = useCallback(() => {
    try {
      previewMusicSourceRef.current?.stop();
    } catch {
      // Ignore already stopped
    }
    previewMusicSourceRef.current = null;
    if (previewAudioCtxRef.current) {
      void previewAudioCtxRef.current.close().catch(() => {});
      previewAudioCtxRef.current = null;
    }
    setIsPreviewingMusic(false);
  }, []);

  useEffect(() => {
    return () => stopPreviewMusic();
  }, [stopPreviewMusic]);

  const { segments, totalDurationSec } = useMemo(
    () => computeKeptSegments(durationSec, trimStartSec, trimEndSec, cutRanges),
    [durationSec, trimStartSec, trimEndSec, cutRanges]
  );

  const getSelectedMusicBuffer = useCallback(async (): Promise<AudioBuffer | null> => {
    if (musicChoice === 'none') return null;
    if (musicChoice === 'custom') return customMusicBuffer;
    return synthesizeMusicBuffer(musicChoice);
  }, [customMusicBuffer, musicChoice]);

  const startMusicPreview = useCallback(async () => {
    stopPreviewMusic();
    const buf = await getSelectedMusicBuffer();
    if (!buf) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = musicVolume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    previewAudioCtxRef.current = ctx;
    previewMusicSourceRef.current = src;
    setIsPreviewingMusic(true);
  }, [getSelectedMusicBuffer, musicVolume, stopPreviewMusic]);

  const handleTogglePlay = async () => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;

    if (isPlaying) {
      vid.pause();
      stopPreviewMusic();
      setIsPlaying(false);
      return;
    }

    const nextCheck = findNextPlaybackTime(vid.currentTime, segments);
    if (nextCheck.ended || vid.currentTime < trimStartSec || vid.currentTime >= trimEndSec) {
      vid.currentTime = segments[0]?.startSec ?? trimStartSec;
    } else if (Math.abs(nextCheck.nextTime - vid.currentTime) > 0.05) {
      vid.currentTime = nextCheck.nextTime;
    }
    vid.volume = Math.min(1, originalAudioVolume);
    await vid.play();
    setIsPlaying(true);
    if (musicChoice !== 'none') {
      void startMusicPreview();
    }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const t = vid.currentTime;
    setCurrentTimeSec(t);

    if (!isPlaying) return;
    const check = findNextPlaybackTime(t, segments);
    if (check.ended) {
      vid.pause();
      vid.currentTime = segments[0]?.startSec ?? trimStartSec;
      stopPreviewMusic();
      setIsPlaying(false);
      return;
    }
    if (Math.abs(check.nextTime - t) > 0.08) {
      vid.currentTime = check.nextTime;
    }
  };

  const handleAddCutAtPlayhead = () => {
    if (durationSec <= 0.4) return;
    if (pendingCutStart === null) {
      setPendingCutStart(currentTimeSec);
      setStatusMessage(
        `Cut start marked at ${formatDuration(currentTimeSec)}. Scrub ahead and click "Cut End" to remove that section.`
      );
      return;
    }
    const start = Math.min(pendingCutStart, currentTimeSec);
    const end = Math.max(pendingCutStart, currentTimeSec);
    if (end - start < 0.2) {
      setStatusMessage('Cut section must be at least 0.2 seconds long.');
      return;
    }
    setCutRanges((prev) => [
      ...prev,
      { id: `cut-${Date.now()}`, startSec: start, endSec: end },
    ]);
    setPendingCutStart(null);
    setStatusMessage(`Removed ${formatDuration(end - start)} section from timeline.`);
  };

  const handleCreateDemoClip = async () => {
    setStatusMessage('Generating sample studio clip...');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stream = canvas.captureStream(30);
    const mimeType = pickSupportedRecorderMimeType();
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start(100);
    const startMs = performance.now();
    const totalMs = 3600;

    await new Promise<void>((resolve) => {
      const draw = () => {
        const elapsed = performance.now() - startMs;
        const p = Math.min(1, elapsed / totalMs);
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, '#4F46E5');
        grad.addColorStop(0.55, '#06B6D4');
        grad.addColorStop(1, '#EC4899');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        ctx.fillStyle = '#0F1219';
        ctx.beginPath();
        ctx.roundRect(120, 90, 1040, 540, 22);
        ctx.fill();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '600 32px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('FrameDeck Sample Recording', 180, 185);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '400 20px "JetBrains Mono", monospace';
        ctx.fillText(`Timeline Marker · ${(elapsed / 1000).toFixed(2)}s`, 180, 235);

        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.roundRect(180, 290, 920, 24, 12);
        ctx.fill();

        ctx.fillStyle = '#6366F1';
        ctx.beginPath();
        ctx.roundRect(180, 290, Math.max(24, 920 * p), 24, 12);
        ctx.fill();

        if (elapsed < totalMs) {
          requestAnimationFrame(draw);
        } else {
          recorder.stop();
          resolve();
        }
      };
      requestAnimationFrame(draw);
    });

    const blob = await done;
    setLocalVideoBlob({ name: 'Sample Studio Clip', blob });
    setStatusMessage('Sample clip loaded. Trim, cut segments, or add music below.');
  };

  const handleUploadMusic = async (file: File) => {
    try {
      const arrayBuf = await file.arrayBuffer();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      await ctx.close();
      setCustomMusicBuffer(decoded);
      setCustomMusicName(file.name);
      setMusicChoice('custom');
      setStatusMessage(`Loaded music track "${file.name}".`);
    } catch {
      setStatusMessage('Could not decode that audio file. Try an MP3, WAV, or OGG track.');
    }
  };

  // Real-time Export of Edited Video (Clip Cuts + Mixed Music Audio)
  const handleExportEditedVideo = async () => {
    if (!videoUrl || segments.length === 0 || totalDurationSec <= 0.1) {
      setStatusMessage('Nothing to export — adjust trim or cut ranges.');
      return;
    }

    stopPreviewMusic();
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(0);
    setStatusMessage('Rendering edited video with cuts and music...');

    try {
      const srcVideo = document.createElement('video');
      srcVideo.src = videoUrl;
      srcVideo.playsInline = true;
      srcVideo.muted = false;
      await new Promise<void>((resolve, reject) => {
        srcVideo.onloadedmetadata = () => resolve();
        srcVideo.onerror = () => reject(new Error('Failed to load source video for export.'));
      });

      const outW = srcVideo.videoWidth || 1280;
      const outH = srcVideo.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable.');

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();

      // Route original video audio if available via captureStream
      const vidStreamFn = (
        srcVideo as HTMLVideoElement & { captureStream?: () => MediaStream }
      ).captureStream;
      if (typeof vidStreamFn === 'function') {
        const vidMedia = vidStreamFn.call(srcVideo);
        if (vidMedia.getAudioTracks().length > 0) {
          const origSource = audioCtx.createMediaStreamSource(
            new MediaStream(vidMedia.getAudioTracks())
          );
          const origGain = audioCtx.createGain();
          origGain.gain.value = originalAudioVolume;
          origSource.connect(origGain);
          origGain.connect(dest);
        }
      }

      // Mix background music track
      const musicBuf = await getSelectedMusicBuffer();
      let musicSource: AudioBufferSourceNode | null = null;
      if (musicBuf) {
        musicSource = audioCtx.createBufferSource();
        musicSource.buffer = musicBuf;
        musicSource.loop = true;
        const mGain = audioCtx.createGain();
        mGain.gain.value = musicVolume;
        musicSource.connect(mGain);
        mGain.connect(dest);
      }

      const canvasStream = canvas.captureStream(30);
      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = pickSupportedRecorderMimeType();
      const recorder = new MediaRecorder(combined, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const stoppedPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start(250);
      musicSource?.start(0);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        srcVideo.currentTime = seg.startSec;
        await new Promise<void>((resolve) => {
          srcVideo.onseeked = () => resolve();
        });
        await srcVideo.play();

        await new Promise<void>((resolve) => {
          const drawStep = () => {
            ctx.drawImage(srcVideo, 0, 0, outW, outH);
            const completedBefore = segments
              .slice(0, i)
              .reduce((a, s) => a + (s.endSec - s.startSec), 0);
            const currentInSeg = Math.max(0, srcVideo.currentTime - seg.startSec);
            const pct = Math.min(
              99,
              Math.round(((completedBefore + currentInSeg) / totalDurationSec) * 100)
            );
            setExportProgress(pct);

            if (srcVideo.currentTime >= seg.endSec - 0.04 || srcVideo.ended) {
              srcVideo.pause();
              resolve();
              return;
            }
            requestAnimationFrame(drawStep);
          };
          requestAnimationFrame(drawStep);
        });
      }

      recorder.stop();
      musicSource?.stop();
      const exportedBlob = await stoppedPromise;
      await audioCtx.close().catch(() => {});

      const item: CaptureItem = {
        id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'video',
        name: `${activeSource?.name ?? 'Video'} (Edited)`,
        mimeType,
        width: outW,
        height: outH,
        sizeBytes: exportedBlob.size,
        durationSeconds: Math.max(1, Math.round(totalDurationSec)),
        backgroundName: musicChoice !== 'none' ? 'Edited + Music' : 'Edited Cut',
        createdAt: Date.now(),
        blob: exportedBlob,
      };

      await onSaveEditedVideo(item);
      setExportProgress(100);
      setStatusMessage('Edited video saved to Captures! Downloading copy...');
      triggerBlobDownload(exportedBlob, `framedeck-edited-${Date.now()}.webm`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#0B0D12] p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Video Editor</h1>
            <p className="text-sm text-slate-400 mt-1">
              Trim clips, cut out middle sections, and mix background music into your recordings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileVideoInputRef}
              type="file"
              accept="video/webm,video/mp4,video/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setLocalVideoBlob({ name: f.name.replace(/\.[^/.]+$/, ''), blob: f });
              }}
            />
            <button
              type="button"
              onClick={() => fileVideoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#141822] hover:bg-[#1C2230] border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Import Video</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCreateDemoClip()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create Demo Clip</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            role="status"
            className="px-4 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs font-medium text-indigo-200 flex items-center justify-between gap-3"
          >
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {!videoUrl ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#11141C] py-16 px-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-300">
              <Film className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">No video loaded yet</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Record a screen video in the Studio, import a video from your laptop, or generate a quick demo clip to test trimming, clip cuts, and background music.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleCreateDemoClip()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Load Demo Clip</span>
              </button>
              <button
                type="button"
                onClick={() => fileVideoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Import File</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Video Stage + Interactive Clip Cut Timeline */}
            <div className="lg:col-span-2 space-y-4">
              {videoCaptures.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs text-slate-400 shrink-0">Saved Videos:</span>
                  {videoCaptures.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setLocalVideoBlob(null);
                        setSelectedId(v.id);
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
                        !localVideoBlob && (selectedId ?? videoCaptures[0]?.id) === v.id
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-[#141822] border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-white/[0.08] bg-black overflow-hidden aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  onLoadedMetadata={() => {
                    const dur = videoRef.current?.duration;
                    const safeDur = Number.isFinite(dur) && dur ? dur : 4;
                    setDurationSec(safeDur);
                    setTrimStartSec(0);
                    setTrimEndSec(safeDur);
                    setCurrentTimeSec(0);
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => {
                    setIsPlaying(false);
                    stopPreviewMusic();
                  }}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Timeline Scrubber & Cut Bar */}
              <div className="rounded-xl border border-white/[0.08] bg-[#11141C] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handleTogglePlay()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Preview Edit</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddCutAtPlayhead}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        pendingCutStart !== null
                          ? 'bg-rose-600/25 border-rose-500/50 text-rose-200'
                          : 'bg-[#181D29] border-white/10 text-slate-200 hover:bg-[#22293A]'
                      }`}
                    >
                      <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {pendingCutStart !== null
                          ? `Cut End (from ${pendingCutStart.toFixed(1)}s)`
                          : 'Cut Section'}
                      </span>
                    </button>

                    {pendingCutStart !== null && (
                      <button
                        type="button"
                        onClick={() => setPendingCutStart(null)}
                        className="text-xs text-slate-400 hover:text-white underline"
                      >
                        Cancel Cut
                      </button>
                    )}
                  </div>

                  <div className="text-xs font-mono tabular-nums text-slate-300">
                    {currentTimeSec.toFixed(1)}s / {durationSec.toFixed(1)}s
                    <span className="text-slate-500 mx-1.5">·</span>
                    <span className="text-indigo-300">
                      Edited: {totalDurationSec.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Visual Segment Track */}
                <div className="space-y-1.5">
                  <div className="relative h-6 rounded-md bg-[#0B0D12] border border-white/[0.08] overflow-hidden">
                    {durationSec > 0 &&
                      segments.map((seg, i) => {
                        const leftPct = (seg.startSec / durationSec) * 100;
                        const widthPct = ((seg.endSec - seg.startSec) / durationSec) * 100;
                        return (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 bg-indigo-500/45 border-x border-indigo-400/50"
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          />
                        );
                      })}
                    {durationSec > 0 &&
                      cutRanges.map((cut) => {
                        const leftPct = (cut.startSec / durationSec) * 100;
                        const widthPct = ((cut.endSec - cut.startSec) / durationSec) * 100;
                        return (
                          <div
                            key={cut.id}
                            className="absolute top-0 bottom-0 bg-rose-500/35 border-x border-rose-400/60"
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          />
                        );
                      })}
                    {durationSec > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `${(currentTimeSec / durationSec) * 100}%` }}
                      />
                    )}
                  </div>

                  <input
                    type="range"
                    aria-label="Timeline scrubber"
                    min={0}
                    max={Math.max(0.1, durationSec)}
                    step={0.05}
                    value={currentTimeSec}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setCurrentTimeSec(t);
                      if (videoRef.current) videoRef.current.currentTime = t;
                    }}
                    className="w-full"
                  />
                </div>

                {/* Trim Start / End Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <label htmlFor="trim-start" className="text-slate-300 font-medium">
                        Trim Start
                      </label>
                      <span className="font-mono tabular-nums text-slate-400">
                        {trimStartSec.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      id="trim-start"
                      type="range"
                      min={0}
                      max={Math.max(0, trimEndSec - 0.2)}
                      step={0.1}
                      value={trimStartSec}
                      onChange={(e) => setTrimStartSec(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <label htmlFor="trim-end" className="text-slate-300 font-medium">
                        Trim End
                      </label>
                      <span className="font-mono tabular-nums text-slate-400">
                        {trimEndSec.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      id="trim-end"
                      type="range"
                      min={Math.min(durationSec, trimStartSec + 0.2)}
                      max={Math.max(0.2, durationSec)}
                      step={0.1}
                      value={trimEndSec}
                      onChange={(e) => setTrimEndSec(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {cutRanges.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06] space-y-2">
                    <div className="text-xs font-medium text-slate-300">
                      Cut Sections ({cutRanges.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cutRanges.map((cut) => (
                        <div
                          key={cut.id}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs font-mono tabular-nums text-rose-200"
                        >
                          <span>
                            {cut.startSec.toFixed(1)}s – {cut.endSec.toFixed(1)}s
                          </span>
                          <button
                            type="button"
                            aria-label={`Restore cut section ${cut.startSec.toFixed(1)}s to ${cut.endSec.toFixed(1)}s`}
                            onClick={() =>
                              setCutRanges((prev) => prev.filter((c) => c.id !== cut.id))
                            }
                            className="text-rose-300 hover:text-white"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Music Mixer & Export */}
            <aside className="rounded-xl border border-white/[0.08] bg-[#11141C] p-5 space-y-5 h-fit">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-white">Add Background Music</h2>
                </div>
                {musicChoice !== 'none' && (
                  <button
                    type="button"
                    onClick={() =>
                      isPreviewingMusic ? stopPreviewMusic() : void startMusicPreview()
                    }
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    {isPreviewingMusic ? 'Stop Preview' : 'Audition'}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    stopPreviewMusic();
                    setMusicChoice('none');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    musicChoice === 'none'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-[#0B0D12] border-white/[0.07] text-slate-300 hover:border-white/20'
                  }`}
                >
                  No Background Music
                </button>

                {BUILTIN_MUSIC_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setMusicChoice(track.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      musicChoice === track.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-[#0B0D12] border-white/[0.07] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-medium">{track.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      {track.mood} · {track.bpm} BPM
                    </div>
                  </button>
                ))}

                <input
                  ref={fileMusicInputRef}
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUploadMusic(f);
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileMusicInputRef.current?.click()}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    musicChoice === 'custom'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-[#0B0D12] border-dashed border-white/15 text-slate-300 hover:border-white/30'
                  }`}
                >
                  <span className="truncate">
                    {customMusicName ? `Custom: ${customMusicName}` : 'Upload Custom Audio (MP3/WAV)'}
                  </span>
                  <Plus className="w-3.5 h-3.5 shrink-0 ml-2" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/[0.07]">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="orig-audio-vol" className="text-slate-300 font-medium">
                      Original Video Audio
                    </label>
                    <span className="font-mono tabular-nums text-slate-400">
                      {Math.round(originalAudioVolume * 100)}%
                    </span>
                  </div>
                  <input
                    id="orig-audio-vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={originalAudioVolume}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setOriginalAudioVolume(v);
                      if (videoRef.current) videoRef.current.volume = v;
                    }}
                    className="w-full"
                  />
                </div>

                {musicChoice !== 'none' && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <label htmlFor="music-vol" className="text-slate-300 font-medium">
                        Music Volume
                      </label>
                      <span className="font-mono tabular-nums text-slate-400">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>
                    <input
                      id="music-vol"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => void handleExportEditedVideo()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isExporting
                      ? `Rendering ${exportProgress}%...`
                      : 'Export & Save Edited Video'}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Exports kept timeline segments with mixed original audio and background music as a WebM video.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
