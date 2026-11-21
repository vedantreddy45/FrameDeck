import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CapturesView } from './components/CapturesView';
import { CustomBackgroundModal } from './components/CustomBackgroundModal';
import { ExtensionView } from './components/ExtensionView';
import { InspectorSidebar } from './components/InspectorSidebar';
import { ShortcutsView } from './components/ShortcutsView';
import { StudioStage } from './components/StudioStage';
import { TopBar } from './components/TopBar';
import { VideoEditorView } from './components/VideoEditorView';
import {
  AudioSettings,
  BackgroundItem,
  CaptureItem,
  CaptureMode,
  RecordingSettings,
  ShortcutBinding,
  StudioStyleSettings,
  StudioTab,
  VideoEffectsSettings,
} from './types/studio';
import { AudioMixerSession, createAudioMixerSession } from './utils/audioMixer';
import { BUILTIN_BACKGROUNDS } from './utils/backgrounds';
import {
  canvasToPngBlob,
  computeCanvasLayout,
  createSamplePreviewCanvas,
  renderCompositedFrame,
} from './utils/canvasCompositor';
import {
  QUALITY_PRESETS,
  copyPngBlobToClipboard,
  pickSupportedRecorderMimeType,
  triggerBlobDownload,
} from './utils/clipboard';
import { matchesShortcut } from './utils/shortcuts';
import {
  deleteCapture,
  deleteCustomBackground,
  loadAudioSettings,
  loadCaptures,
  loadCustomBackgrounds,
  loadRecordingSettings,
  loadShortcuts,
  loadStyleSettings,
  loadVideoEffectsSettings,
  saveAudioSettings,
  saveCapture,
  saveCustomBackground,
  saveRecordingSettings,
  saveShortcuts,
  saveStyleSettings,
  saveVideoEffectsSettings,
} from './utils/storage';
import {
  HighlightDragState,
  ZoomCameraState,
  clamp01,
  createInitialHighlightDrag,
  createInitialZoomCamera,
  stepZoomCamera,
  toggleZoomAtPoint,
} from './utils/videoEffects';

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('screenshot');

  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundItem[]>([]);
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [styleSettings, setStyleSettings] = useState<StudioStyleSettings>(loadStyleSettings);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>(
    loadRecordingSettings
  );
  const [videoEffects, setVideoEffects] = useState<VideoEffectsSettings>(
    loadVideoEffectsSettings
  );
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>(loadShortcuts);

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [isAddBgOpen, setIsAddBgOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    kind: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Source image currently displayed in Studio (null = deterministic sample preview)
  const [capturedSourceImg, setCapturedSourceImg] = useState<HTMLImageElement | null>(null);
  const [capturedRawBlob, setCapturedRawBlob] = useState<Blob | null>(null);

  // Interactive zoom & PDF-style highlight state
  const [isZoomed, setIsZoomed] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState({ mic: 0, system: 0 });

  // Mic devices & mic test state
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);

  // Refs
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [bgImageTick, setBgImageTick] = useState(0);

  // Interactive camera & highlight refs
  const videoEffectsRef = useRef<VideoEffectsSettings>(videoEffects);
  videoEffectsRef.current = videoEffects;
  const zoomCameraRef = useRef<ZoomCameraState>(createInitialZoomCamera());
  const highlightDragRef = useRef<HighlightDragState>(createInitialHighlightDrag());
  const previewZoomRafRef = useRef<number | null>(null);
  const lastZoomFrameTsRef = useRef<number>(0);

  // Active recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioMixerRef = useRef<AudioMixerSession | null>(null);
  const recordingVideoElRef = useRef<HTMLVideoElement | null>(null);
  const recordingRafRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const recordingSecondsRef = useRef<number>(0);

  // Mic test refs
  const micTestStreamRef = useRef<MediaStream | null>(null);
  const micTestMixerRef = useRef<AudioMixerSession | null>(null);
  const micTestRafRef = useRef<number | null>(null);

  const allBackgrounds = useMemo(
    () => [...customBackgrounds, ...BUILTIN_BACKGROUNDS],
    [customBackgrounds]
  );

  const activeBackground = useMemo(
    () =>
      allBackgrounds.find((b) => b.id === styleSettings.backgroundId) ??
      BUILTIN_BACKGROUNDS[0],
    [allBackgrounds, styleSettings.backgroundId]
  );

  // Initial IndexedDB load
  useEffect(() => {
    void (async () => {
      const [loadedBgs, loadedCaptures] = await Promise.all([
        loadCustomBackgrounds(),
        loadCaptures(),
      ]);
      setCustomBackgrounds(loadedBgs);
      setCaptures(loadedCaptures);
    })();
  }, []);

  // Enumerate microphone devices
  const refreshMicDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicDevices(devices.filter((d) => d.kind === 'audioinput'));
    } catch {
      // Ignore enumeration denial
    }
  }, []);

  useEffect(() => {
    void refreshMicDevices();
  }, [refreshMicDevices]);

  // Persist settings
  const handleUpdateStyle = useCallback((patch: Partial<StudioStyleSettings>) => {
    setStyleSettings((prev) => {
      const next = { ...prev, ...patch };
      saveStyleSettings(next);
      return next;
    });
  }, []);

  const handleUpdateAudio = useCallback((patch: Partial<AudioSettings>) => {
    setAudioSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAudioSettings(next);
      if (audioMixerRef.current) {
        if (typeof patch.micVolume === 'number') {
          audioMixerRef.current.setMicVolume(patch.micVolume);
        }
        if (typeof patch.systemVolume === 'number') {
          audioMixerRef.current.setSystemVolume(patch.systemVolume);
        }
      }
      return next;
    });
  }, []);

  const handleUpdateRecording = useCallback((patch: Partial<RecordingSettings>) => {
    setRecordingSettings((prev) => {
      const next = { ...prev, ...patch };
      saveRecordingSettings(next);
      return next;
    });
  }, []);

  const handleUpdateVideoEffects = useCallback((patch: Partial<VideoEffectsSettings>) => {
    setVideoEffects((prev) => {
      const next = { ...prev, ...patch };
      saveVideoEffectsSettings(next);
      return next;
    });
  }, []);

  const handleUpdateShortcuts = useCallback((next: ShortcutBinding[]) => {
    setShortcuts(next);
    saveShortcuts(next);
  }, []);

  // Preload active image background when needed
  useEffect(() => {
    if (activeBackground.kind !== 'image' || !activeBackground.imageUrl) return;
    const url = activeBackground.imageUrl;
    const cached = bgImageCacheRef.current.get(url);
    if (cached && cached.complete) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageCacheRef.current.set(url, img);
      setBgImageTick((t) => t + 1);
    };
    img.src = url;
  }, [activeBackground]);

  const getActiveBgImage = useCallback((): HTMLImageElement | null => {
    if (activeBackground.kind !== 'image' || !activeBackground.imageUrl) return null;
    const cached = bgImageCacheRef.current.get(activeBackground.imageUrl);
    return cached && cached.complete ? cached : null;
  }, [activeBackground, bgImageTick]);

  // Compute current output dimensions for HUD readout
  const outputDimensions = useMemo(() => {
    const srcW = capturedSourceImg ? capturedSourceImg.naturalWidth : 1280;
    const srcH = capturedSourceImg ? capturedSourceImg.naturalHeight : 760;
    const layout = computeCanvasLayout({
      sourceWidth: srcW,
      sourceHeight: srcH,
      aspectRatio: styleSettings.aspectRatio,
      padding: styleSettings.padding,
      cornerRadius: styleSettings.cornerRadius,
      frameStyle: styleSettings.frameStyle,
    });
    return { width: layout.canvasWidth, height: layout.canvasHeight };
  }, [capturedSourceImg, styleSettings]);

  // Draw static Studio canvas with current zoom & highlight effects
  const drawCurrentStaticStage = useCallback(() => {
    if (activeTab !== 'studio' || isRecording) return;
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!sampleCanvasRef.current) {
      sampleCanvasRef.current = createSamplePreviewCanvas(1280, 760);
    }

    const source = capturedSourceImg ?? sampleCanvasRef.current;
    const srcW = capturedSourceImg ? capturedSourceImg.naturalWidth : sampleCanvasRef.current.width;
    const srcH = capturedSourceImg ? capturedSourceImg.naturalHeight : sampleCanvasRef.current.height;

    renderCompositedFrame(
      ctx,
      source,
      srcW,
      srcH,
      styleSettings,
      activeBackground,
      getActiveBgImage(),
      {
        zoomCamera: zoomCameraRef.current,
        highlightDrag: highlightDragRef.current,
        highlightColor: videoEffects.highlightColor,
      }
    );
  }, [
    activeTab,
    isRecording,
    capturedSourceImg,
    styleSettings,
    activeBackground,
    getActiveBgImage,
    videoEffects.highlightColor,
    bgImageTick,
  ]);

  // Render static Studio canvas whenever style, background, or source changes (when not recording)
  useEffect(() => {
    drawCurrentStaticStage();
  }, [drawCurrentStaticStage]);

  // Smooth zoom easing animation loop for static preview stage
  const startZoomPreviewAnimation = useCallback(() => {
    if (isRecording) return;
    if (previewZoomRafRef.current !== null) {
      cancelAnimationFrame(previewZoomRafRef.current);
      previewZoomRafRef.current = null;
    }
    lastZoomFrameTsRef.current = performance.now();

    const tick = (now: number) => {
      const dtMs = Math.max(8, now - lastZoomFrameTsRef.current);
      lastZoomFrameTsRef.current = now;

      const stepped = stepZoomCamera(zoomCameraRef.current, dtMs);
      zoomCameraRef.current = stepped;
      drawCurrentStaticStage();

      const settled =
        Math.abs(stepped.currentScale - stepped.targetScale) < 0.002 &&
        Math.abs(stepped.currentFocalX - stepped.targetFocalX) < 0.001 &&
        Math.abs(stepped.currentFocalY - stepped.targetFocalY) < 0.001;

      if (!settled) {
        previewZoomRafRef.current = requestAnimationFrame(tick);
      } else {
        previewZoomRafRef.current = null;
      }
    };

    previewZoomRafRef.current = requestAnimationFrame(tick);
  }, [drawCurrentStaticStage, isRecording]);

  const clientToContentNormalized = useCallback(
    (clientX: number, clientY: number): { nx: number; ny: number } => {
      const canvas = stageCanvasRef.current;
      if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
        return { nx: 0.5, ny: 0.5 };
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return { nx: 0.5, ny: 0.5 };
      }

      const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
      const renderedW = canvas.width * scale;
      const renderedH = canvas.height * scale;
      const offsetX = (rect.width - renderedW) / 2;
      const offsetY = (rect.height - renderedH) / 2;

      const canvasX = (clientX - rect.left - offsetX) / scale;
      const canvasY = (clientY - rect.top - offsetY) / scale;

      const srcW = capturedSourceImg
        ? capturedSourceImg.naturalWidth
        : sampleCanvasRef.current?.width ?? 1280;
      const srcH = capturedSourceImg
        ? capturedSourceImg.naturalHeight
        : sampleCanvasRef.current?.height ?? 760;

      const layout = computeCanvasLayout({
        sourceWidth: srcW,
        sourceHeight: srcH,
        aspectRatio: styleSettings.aspectRatio,
        padding: styleSettings.padding,
        cornerRadius: styleSettings.cornerRadius,
        frameStyle: styleSettings.frameStyle,
      });

      const nx = clamp01((canvasX - layout.contentX) / Math.max(1, layout.contentWidth));
      const ny = clamp01((canvasY - layout.contentY) / Math.max(1, layout.contentHeight));
      return { nx, ny };
    },
    [capturedSourceImg, styleSettings]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!videoEffects.doubleTapZoomEnabled) return;
      const { nx, ny } = clientToContentNormalized(e.clientX, e.clientY);
      const nextCam = toggleZoomAtPoint(zoomCameraRef.current, nx, ny, videoEffects.zoomScale);
      zoomCameraRef.current = nextCam;
      setIsZoomed(nextCam.isZoomed);
      if (!isRecording) {
        startZoomPreviewAnimation();
      }
    },
    [
      clientToContentNormalized,
      isRecording,
      startZoomPreviewAnimation,
      videoEffects.doubleTapZoomEnabled,
      videoEffects.zoomScale,
    ]
  );

  const handleResetZoom = useCallback(() => {
    zoomCameraRef.current = {
      ...zoomCameraRef.current,
      isZoomed: false,
      targetScale: 1,
    };
    setIsZoomed(false);
    if (!isRecording) {
      startZoomPreviewAnimation();
    }
  }, [isRecording, startZoomPreviewAnimation]);

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0 || !videoEffects.sentenceHighlightEnabled) return;
      const { nx, ny } = clientToContentNormalized(e.clientX, e.clientY);
      highlightDragRef.current = {
        active: true,
        startX: nx,
        startY: ny,
        currentX: nx,
        currentY: ny,
      };
      setIsHighlighting(true);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
      if (!isRecording) {
        drawCurrentStaticStage();
      }
    },
    [clientToContentNormalized, drawCurrentStaticStage, isRecording, videoEffects.sentenceHighlightEnabled]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!highlightDragRef.current.active) return;
      const { nx, ny } = clientToContentNormalized(e.clientX, e.clientY);
      highlightDragRef.current = {
        ...highlightDragRef.current,
        currentX: nx,
        currentY: ny,
      };
      if (!isRecording) {
        drawCurrentStaticStage();
      }
    },
    [clientToContentNormalized, drawCurrentStaticStage, isRecording]
  );

  const handleCanvasPointerUp = useCallback(() => {
    if (!highlightDragRef.current.active) return;
    highlightDragRef.current = createInitialHighlightDrag();
    setIsHighlighting(false);
    if (!isRecording) {
      drawCurrentStaticStage();
    }
  }, [drawCurrentStaticStage, isRecording]);

  // Copy canvas PNG directly to clipboard
  const handleCopyCanvasPng = useCallback(async () => {
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    try {
      const blob = await canvasToPngBlob(canvas);
      const res = await copyPngBlobToClipboard(blob);
      if (res.ok) {
        setCopySuccess(true);
        setStatusBanner({
          kind: 'success',
          message: 'Screenshot copied directly to your clipboard.',
        });
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        setStatusBanner({
          kind: 'error',
          message: `Could not write to clipboard automatically (${res.reason ?? 'permission required'}). Click Copy PNG to try again.`,
        });
      }
    } catch {
      setStatusBanner({ kind: 'error', message: 'Failed to export PNG for clipboard.' });
    }
  }, []);

  // Download current studio canvas PNG
  const handleDownloadCanvasPng = useCallback(async () => {
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    try {
      const blob = await canvasToPngBlob(canvas);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      triggerBlobDownload(blob, `framedeck-${stamp}.png`);
      setStatusBanner({ kind: 'success', message: 'PNG saved to your Downloads folder.' });
    } catch {
      setStatusBanner({ kind: 'error', message: 'Failed to download PNG.' });
    }
  }, []);

  // Save current studio canvas (sample or active frame) as a Capture & copy to clipboard
  const saveCanvasFrameAsCapture = useCallback(
    async (
      sourceCanvasOrImg: HTMLCanvasElement | HTMLImageElement,
      sourceW: number,
      sourceH: number,
      rawSourceBlob: Blob | undefined,
      labelPrefix: string
    ) => {
      const offscreen = document.createElement('canvas');
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      const effectsPayload = {
        zoomCamera: zoomCameraRef.current,
        highlightDrag: highlightDragRef.current,
        highlightColor: videoEffectsRef.current.highlightColor,
      };

      const layout = renderCompositedFrame(
        ctx,
        sourceCanvasOrImg,
        sourceW,
        sourceH,
        styleSettings,
        activeBackground,
        getActiveBgImage(),
        effectsPayload
      );

      // Also sync stage canvas immediately
      if (stageCanvasRef.current) {
        const stageCtx = stageCanvasRef.current.getContext('2d');
        if (stageCtx) {
          renderCompositedFrame(
            stageCtx,
            sourceCanvasOrImg,
            sourceW,
            sourceH,
            styleSettings,
            activeBackground,
            getActiveBgImage(),
            effectsPayload
          );
        }
      }

      const compositedBlob = await canvasToPngBlob(offscreen);
      const item: CaptureItem = {
        id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'screenshot',
        name: `${labelPrefix} · ${activeBackground.name}`,
        mimeType: 'image/png',
        width: layout.canvasWidth,
        height: layout.canvasHeight,
        sizeBytes: compositedBlob.size,
        backgroundName: activeBackground.name,
        createdAt: Date.now(),
        blob: compositedBlob,
        rawSourceBlob,
      };

      await saveCapture(item);
      setCaptures((prev) => [item, ...prev]);

      const clipRes = await copyPngBlobToClipboard(compositedBlob);
      if (clipRes.ok) {
        setCopySuccess(true);
        setStatusBanner({
          kind: 'success',
          message: 'Screenshot captured, saved to Captures, and copied directly to clipboard.',
        });
        setTimeout(() => setCopySuccess(false), 2200);
      } else {
        setStatusBanner({
          kind: 'info',
          message: 'Screenshot captured & saved! Click "Copy PNG" (Alt+C) to place it on your clipboard.',
        });
      }
    },
    [activeBackground, getActiveBgImage, styleSettings]
  );

  // Capture Sample Frame (always works without OS display dialog)
  const handleCaptureSample = useCallback(async () => {
    setActiveTab('studio');
    setCaptureMode('screenshot');
    if (!sampleCanvasRef.current) {
      sampleCanvasRef.current = createSamplePreviewCanvas(1280, 760);
    }
    const source = capturedSourceImg ?? sampleCanvasRef.current;
    const w = capturedSourceImg ? capturedSourceImg.naturalWidth : sampleCanvasRef.current.width;
    const h = capturedSourceImg ? capturedSourceImg.naturalHeight : sampleCanvasRef.current.height;
    const rawBlob = capturedRawBlob ?? (await canvasToPngBlob(sampleCanvasRef.current));
    await saveCanvasFrameAsCapture(source, w, h, rawBlob, 'Studio Frame');
  }, [capturedRawBlob, capturedSourceImg, saveCanvasFrameAsCapture]);

  // High-Quality Screen / Window / Tab Screenshot via getDisplayMedia
  const handleTakeScreenshot = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatusBanner({
        kind: 'error',
        message: 'Screen capture is not supported in this browser. Try Chrome, Edge, or Firefox on desktop.',
      });
      return;
    }

    setActiveTab('studio');
    setCaptureMode('screenshot');

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60 },
        },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          void video.play().then(() => resolve()).catch(reject);
        };
        video.onerror = () => reject(new Error('Video stream failed to load.'));
      });

      // Wait two animation frames so the OS picker closes cleanly before grabbing frame
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const rawCanvas = document.createElement('canvas');
      rawCanvas.width = video.videoWidth || 1920;
      rawCanvas.height = video.videoHeight || 1080;
      const rawCtx = rawCanvas.getContext('2d');
      if (!rawCtx) throw new Error('Could not initialize capture canvas.');
      rawCtx.drawImage(video, 0, 0, rawCanvas.width, rawCanvas.height);

      // Stop display tracks immediately after grabbing the frame
      stream.getTracks().forEach((t) => t.stop());
      stream = null;

      const rawBlob = await canvasToPngBlob(rawCanvas);
      const rawUrl = URL.createObjectURL(rawBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Captured frame failed to decode.'));
        img.src = rawUrl;
      });
      URL.revokeObjectURL(rawUrl);

      setCapturedSourceImg(img);
      setCapturedRawBlob(rawBlob);

      await saveCanvasFrameAsCapture(
        img,
        img.naturalWidth,
        img.naturalHeight,
        rawBlob,
        'Screen Shot'
      );
    } catch (err) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
        setStatusBanner({
          kind: 'info',
          message: 'Screen selection cancelled.',
        });
        return;
      }
      setStatusBanner({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to capture screen.',
      });
    }
  }, [saveCanvasFrameAsCapture]);

  // Stop mic test helper
  const stopMicTest = useCallback(() => {
    if (micTestRafRef.current !== null) {
      cancelAnimationFrame(micTestRafRef.current);
      micTestRafRef.current = null;
    }
    micTestMixerRef.current?.dispose();
    micTestMixerRef.current = null;
    micTestStreamRef.current?.getTracks().forEach((t) => t.stop());
    micTestStreamRef.current = null;
    setIsTestingMic(false);
    setMicTestLevel(0);
  }, []);

  const handleToggleMicTest = useCallback(async () => {
    if (isTestingMic) {
      stopMicTest();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusBanner({ kind: 'error', message: 'Microphone access is unavailable in this browser.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId:
            audioSettings.micDeviceId && audioSettings.micDeviceId !== 'default'
              ? { exact: audioSettings.micDeviceId }
              : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      void refreshMicDevices();
      micTestStreamRef.current = stream;
      const mixer = createAudioMixerSession({
        displayStream: null,
        micStream: stream,
        systemVolume: 0,
        micVolume: audioSettings.micVolume,
      });
      micTestMixerRef.current = mixer;
      setIsTestingMic(true);

      const tick = () => {
        if (!micTestMixerRef.current) return;
        const levels = micTestMixerRef.current.getLevels();
        setMicTestLevel(levels.mic);
        micTestRafRef.current = requestAnimationFrame(tick);
      };
      micTestRafRef.current = requestAnimationFrame(tick);
    } catch {
      setStatusBanner({
        kind: 'error',
        message: 'Microphone permission was denied. Allow microphone access in your browser settings.',
      });
    }
  }, [audioSettings.micDeviceId, audioSettings.micVolume, isTestingMic, refreshMicDevices, stopMicTest]);

  // Cleanup recording resources
  const cleanupRecordingResources = useCallback(() => {
    if (recordingRafRef.current !== null) {
      cancelAnimationFrame(recordingRafRef.current);
      recordingRafRef.current = null;
    }
    audioMixerRef.current?.dispose();
    audioMixerRef.current = null;
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (recordingVideoElRef.current) {
      recordingVideoElRef.current.srcObject = null;
      recordingVideoElRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevels({ mic: 0, system: 0 });
  }, []);

  // Recording elapsed timer
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const id = window.setInterval(() => {
      setRecordingSeconds((s) => {
        const next = s + 1;
        recordingSecondsRef.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRecording, isPaused]);

  const handleStopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      cleanupRecordingResources();
    }
  }, [cleanupRecordingResources]);

  const handleTogglePauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      setIsPaused(true);
    } else if (recorder.state === 'paused') {
      recorder.resume();
      setIsPaused(false);
    }
  }, []);

  // Start high-quality screen recording with simultaneous system + mic audio
  const handleStartRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatusBanner({
        kind: 'error',
        message: 'Screen recording is not supported in this browser.',
      });
      return;
    }
    stopMicTest();
    setActiveTab('studio');
    setCaptureMode('video');

    const preset = QUALITY_PRESETS[recordingSettings.qualityPreset];

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.fps },
        },
        audio: audioSettings.systemAudioEnabled,
      });
      displayStreamRef.current = displayStream;

      let micStream: MediaStream | null = null;
      if (audioSettings.micEnabled && navigator.mediaDevices?.getUserMedia) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId:
                audioSettings.micDeviceId && audioSettings.micDeviceId !== 'default'
                  ? { exact: audioSettings.micDeviceId }
                  : undefined,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          micStreamRef.current = micStream;
          void refreshMicDevices();
        } catch {
          setStatusBanner({
            kind: 'info',
            message: 'Microphone unavailable — recording screen without mic input.',
          });
        }
      }

      const mixer = createAudioMixerSession({
        displayStream,
        micStream,
        systemVolume: audioSettings.systemVolume,
        micVolume: audioSettings.micVolume,
      });
      audioMixerRef.current = mixer;

      const videoEl = document.createElement('video');
      videoEl.srcObject = displayStream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          void videoEl.play().then(() => resolve()).catch(() => resolve());
        };
      });
      recordingVideoElRef.current = videoEl;

      const srcW = videoEl.videoWidth || 1920;
      const srcH = videoEl.videoHeight || 1080;

      if (previewZoomRafRef.current !== null) {
        cancelAnimationFrame(previewZoomRafRef.current);
        previewZoomRafRef.current = null;
      }

      // Render live frames onto stage canvas (with smooth double-tap zoom & PDF sentence highlight FX)
      const stageCanvas = stageCanvasRef.current;
      let lastLoopTs = performance.now();
      const renderLoop = (now: number) => {
        if (!recordingVideoElRef.current || !stageCanvas) return;
        const dtMs = Math.max(8, now - lastLoopTs);
        lastLoopTs = now;
        zoomCameraRef.current = stepZoomCamera(zoomCameraRef.current, dtMs);

        const ctx = stageCanvas.getContext('2d');
        if (ctx) {
          renderCompositedFrame(
            ctx,
            recordingVideoElRef.current,
            srcW,
            srcH,
            styleSettings,
            activeBackground,
            getActiveBgImage(),
            {
              zoomCamera: zoomCameraRef.current,
              highlightDrag: highlightDragRef.current,
              highlightColor: videoEffectsRef.current.highlightColor,
            }
          );
        }
        if (audioMixerRef.current) {
          setAudioLevels(audioMixerRef.current.getLevels());
        }
        recordingRafRef.current = requestAnimationFrame(renderLoop);
      };
      recordingRafRef.current = requestAnimationFrame(renderLoop);

      let outputVideoTrack: MediaStreamTrack;
      if (recordingSettings.compositeBackground && stageCanvas) {
        const canvasStream = stageCanvas.captureStream(preset.fps);
        outputVideoTrack = canvasStream.getVideoTracks()[0];
      } else {
        outputVideoTrack = displayStream.getVideoTracks()[0];
      }

      const combinedStream = new MediaStream([
        outputVideoTrack,
        ...mixer.mixedAudioTracks,
      ]);

      const mimeType = pickSupportedRecorderMimeType();
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: preset.videoBitsPerSecond,
      });
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recordingStartRef.current = Date.now();
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsPaused(false);
      setIsRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const duration = Math.max(1, recordingSecondsRef.current);
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const outW = stageCanvas?.width ?? srcW;
        const outH = stageCanvas?.height ?? srcH;

        cleanupRecordingResources();

        if (blob.size > 0) {
          const item: CaptureItem = {
            id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kind: 'video',
            name: `Recording · ${preset.shortLabel}`,
            mimeType,
            width: outW,
            height: outH,
            sizeBytes: blob.size,
            durationSeconds: duration,
            backgroundName: recordingSettings.compositeBackground
              ? activeBackground.name
              : 'Raw Screen',
            createdAt: Date.now(),
            blob,
          };
          await saveCapture(item);
          setCaptures((prev) => [item, ...prev]);
          setStatusBanner({
            kind: 'success',
            message: 'Screen recording saved to your Captures library.',
          });
        }
      };

      // Stop gracefully if user clicks browser's native "Stop sharing" button
      const displayVideoTrack = displayStream.getVideoTracks()[0];
      if (displayVideoTrack) {
        displayVideoTrack.onended = () => {
          handleStopRecording();
        };
      }

      recorder.start(500);
    } catch (err) {
      cleanupRecordingResources();
      if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
        setStatusBanner({ kind: 'info', message: 'Screen recording cancelled.' });
        return;
      }
      setStatusBanner({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to start screen recording.',
      });
    }
  }, [
    activeBackground,
    audioSettings,
    cleanupRecordingResources,
    getActiveBgImage,
    handleStopRecording,
    recordingSettings,
    refreshMicDevices,
    stopMicTest,
    styleSettings,
  ]);

  // Custom Background handlers
  const handleAddCustomBackground = useCallback(
    async (bg: BackgroundItem) => {
      await saveCustomBackground(bg);
      setCustomBackgrounds((prev) => [bg, ...prev]);
      handleUpdateStyle({ backgroundId: bg.id });
      setStatusBanner({
        kind: 'success',
        message: `Added custom background "${bg.name}".`,
      });
    },
    [handleUpdateStyle]
  );

  const handleDeleteCustomBackground = useCallback(
    async (id: string) => {
      await deleteCustomBackground(id);
      setCustomBackgrounds((prev) => prev.filter((b) => b.id !== id));
      if (styleSettings.backgroundId === id) {
        handleUpdateStyle({ backgroundId: BUILTIN_BACKGROUNDS[0].id });
      }
    },
    [handleUpdateStyle, styleSettings.backgroundId]
  );

  // Capture Library handlers
  const handleCopySavedScreenshot = useCallback(async (item: CaptureItem) => {
    const res = await copyPngBlobToClipboard(item.blob);
    if (res.ok) {
      setStatusBanner({ kind: 'success', message: `"${item.name}" copied to clipboard.` });
    } else {
      setStatusBanner({
        kind: 'error',
        message: `Clipboard copy failed: ${res.reason ?? 'permission required.'}`,
      });
    }
  }, []);

  const handleDownloadSavedCapture = useCallback((item: CaptureItem) => {
    const ext = item.kind === 'screenshot' ? 'png' : item.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const safeName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerBlobDownload(item.blob, `${safeName}.${ext}`);
  }, []);

  const handleDeleteSavedCapture = useCallback(async (id: string) => {
    await deleteCapture(id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleRestyleInStudio = useCallback((item: CaptureItem) => {
    const blobToLoad = item.rawSourceBlob ?? item.blob;
    const url = URL.createObjectURL(blobToLoad);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setCapturedSourceImg(img);
      setCapturedRawBlob(blobToLoad);
      setCaptureMode('screenshot');
      setActiveTab('studio');
    };
    img.src = url;
  }, []);

  // Global Hotkeys listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Quick 1-9 vibrant background switching when no modifiers are pressed
      if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && /^Digit[1-9]$/.test(e.code)) {
        const index = Number(e.code.replace('Digit', '')) - 1;
        if (allBackgrounds[index]) {
          e.preventDefault();
          handleUpdateStyle({ backgroundId: allBackgrounds[index].id });
        }
        return;
      }

      for (const binding of shortcuts) {
        if (!matchesShortcut(e, binding)) continue;
        e.preventDefault();

        switch (binding.id) {
          case 'screenshot':
            void handleTakeScreenshot();
            break;
          case 'recordToggle':
            if (isRecording) handleStopRecording();
            else void handleStartRecording();
            break;
          case 'recordPause':
            if (isRecording) handleTogglePauseRecording();
            break;
          case 'copyLatest':
            void handleCopyCanvasPng();
            break;
          case 'downloadLatest':
            void handleDownloadCanvasPng();
            break;
          case 'sampleCapture':
            void handleCaptureSample();
            break;
        }
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    allBackgrounds,
    handleCaptureSample,
    handleCopyCanvasPng,
    handleDownloadCanvasPng,
    handleStartRecording,
    handleStopRecording,
    handleTakeScreenshot,
    handleTogglePauseRecording,
    handleUpdateStyle,
    isRecording,
    shortcuts,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewZoomRafRef.current !== null) {
        cancelAnimationFrame(previewZoomRafRef.current);
      }
      stopMicTest();
      cleanupRecordingResources();
    };
  }, [cleanupRecordingResources, stopMicTest]);

  const handlePrimaryHeaderAction = () => {
    if (isRecording) {
      handleStopRecording();
    } else if (captureMode === 'video' && activeTab === 'studio') {
      void handleStartRecording();
    } else {
      void handleTakeScreenshot();
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#0B0D12] text-slate-100 lg:overflow-hidden">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        captureCount={captures.length}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onPrimaryCaptureAction={handlePrimaryHeaderAction}
      />

      {activeTab === 'studio' && (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:overflow-hidden">
          <StudioStage
            canvasRef={stageCanvasRef}
            captureMode={captureMode}
            onChangeMode={setCaptureMode}
            styleSettings={styleSettings}
            activeBackground={activeBackground}
            outputDimensions={outputDimensions}
            hasCapturedSource={capturedSourceImg !== null}
            onResetToSample={() => {
              setCapturedSourceImg(null);
              setCapturedRawBlob(null);
            }}
            onTakeScreenshot={() => void handleTakeScreenshot()}
            onCaptureSample={() => void handleCaptureSample()}
            onCopyCanvasPng={() => void handleCopyCanvasPng()}
            onDownloadCanvasPng={() => void handleDownloadCanvasPng()}
            copySuccess={copySuccess}
            isRecording={isRecording}
            isPaused={isPaused}
            recordingSeconds={recordingSeconds}
            audioLevels={audioLevels}
            audioSettings={audioSettings}
            recordingSettings={recordingSettings}
            onStartRecording={() => void handleStartRecording()}
            onTogglePauseRecording={handleTogglePauseRecording}
            onStopRecording={handleStopRecording}
            shortcuts={shortcuts}
            statusBanner={statusBanner}
            onDismissBanner={() => setStatusBanner(null)}
            isZoomed={isZoomed}
            zoomScale={videoEffects.zoomScale}
            isHighlighting={isHighlighting}
            onCanvasDoubleClick={handleCanvasDoubleClick}
            onCanvasPointerDown={handleCanvasPointerDown}
            onCanvasPointerMove={handleCanvasPointerMove}
            onCanvasPointerUp={handleCanvasPointerUp}
            onResetZoom={handleResetZoom}
          />

          <InspectorSidebar
            backgrounds={allBackgrounds}
            styleSettings={styleSettings}
            onUpdateStyle={handleUpdateStyle}
            onOpenAddBackground={() => setIsAddBgOpen(true)}
            onDeleteCustomBackground={(id) => void handleDeleteCustomBackground(id)}
            audioSettings={audioSettings}
            onUpdateAudio={handleUpdateAudio}
            recordingSettings={recordingSettings}
            onUpdateRecording={handleUpdateRecording}
            videoEffects={videoEffects}
            onUpdateVideoEffects={handleUpdateVideoEffects}
            micDevices={micDevices}
            isTestingMic={isTestingMic}
            micTestLevel={micTestLevel}
            onToggleMicTest={() => void handleToggleMicTest()}
            isRecording={isRecording}
          />
        </div>
      )}

      {activeTab === 'captures' && (
        <CapturesView
          captures={captures}
          onCopyScreenshot={handleCopySavedScreenshot}
          onDownloadCapture={handleDownloadSavedCapture}
          onDeleteCapture={handleDeleteSavedCapture}
          onRestyleInStudio={handleRestyleInStudio}
          onEditVideo={(item) => {
            setEditingVideoId(item.id);
            setActiveTab('editor');
          }}
          onSwitchToStudio={() => setActiveTab('studio')}
        />
      )}

      {activeTab === 'editor' && (
        <VideoEditorView
          videoCaptures={captures.filter((c) => c.kind === 'video')}
          initialVideoId={editingVideoId}
          onSaveEditedVideo={async (item) => {
            await saveCapture(item);
            setCaptures((prev) => [item, ...prev]);
          }}
        />
      )}

      {activeTab === 'extension' && <ExtensionView />}

      {activeTab === 'shortcuts' && (
        <ShortcutsView shortcuts={shortcuts} onUpdateShortcuts={handleUpdateShortcuts} />
      )}

      <CustomBackgroundModal
        isOpen={isAddBgOpen}
        onClose={() => setIsAddBgOpen(false)}
        onAddBackground={handleAddCustomBackground}
      />
    </div>
  );
}
