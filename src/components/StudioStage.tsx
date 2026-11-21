import React from 'react';
import {
  Camera,
  Check,
  ClipboardCopy,
  Download,
  Film,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
} from 'lucide-react';
import {
  AudioSettings,
  BackgroundItem,
  CaptureMode,
  RecordingSettings,
  ShortcutBinding,
  StudioStyleSettings,
} from '../types/studio';
import { QUALITY_PRESETS, formatDuration } from '../utils/clipboard';
import { formatShortcutParts } from '../utils/shortcuts';

interface StudioStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  captureMode: CaptureMode;
  onChangeMode: (mode: CaptureMode) => void;
  styleSettings: StudioStyleSettings;
  activeBackground: BackgroundItem;
  outputDimensions: { width: number; height: number };
  hasCapturedSource: boolean;
  onResetToSample: () => void;
  onTakeScreenshot: () => void;
  onCaptureSample: () => void;
  onCopyCanvasPng: () => void;
  onDownloadCanvasPng: () => void;
  copySuccess: boolean;
  isRecording: boolean;
  isPaused: boolean;
  recordingSeconds: number;
  audioLevels: { mic: number; system: number };
  audioSettings: AudioSettings;
  recordingSettings: RecordingSettings;
  onStartRecording: () => void;
  onTogglePauseRecording: () => void;
  onStopRecording: () => void;
  shortcuts: ShortcutBinding[];
  statusBanner: { kind: 'info' | 'success' | 'error'; message: string } | null;
  onDismissBanner: () => void;
  isZoomed: boolean;
  zoomScale: number;
  isHighlighting: boolean;
  onCanvasDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onCanvasPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onCanvasPointerUp: () => void;
  onResetZoom: () => void;
}

export function StudioStage({
  canvasRef,
  captureMode,
  onChangeMode,
  styleSettings,
  activeBackground,
  outputDimensions,
  hasCapturedSource,
  onResetToSample,
  onTakeScreenshot,
  onCaptureSample,
  onCopyCanvasPng,
  onDownloadCanvasPng,
  copySuccess,
  isRecording,
  isPaused,
  recordingSeconds,
  audioLevels,
  audioSettings,
  recordingSettings,
  onStartRecording,
  onTogglePauseRecording,
  onStopRecording,
  shortcuts,
  statusBanner,
  onDismissBanner,
  isZoomed,
  zoomScale,
  isHighlighting,
  onCanvasDoubleClick,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onResetZoom,
}: StudioStageProps) {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

  const getShortcutLabel = (id: ShortcutBinding['id']) => {
    const found = shortcuts.find((s) => s.id === id);
    return found ? formatShortcutParts(found, isMac).join('+') : '';
  };

  const qualityConfig = QUALITY_PRESETS[recordingSettings.qualityPreset];
  const audioSummaryParts: string[] = [];
  if (audioSettings.systemAudioEnabled) audioSummaryParts.push('System Audio');
  if (audioSettings.micEnabled) audioSummaryParts.push('Microphone');
  const audioSummary =
    audioSummaryParts.length > 0 ? audioSummaryParts.join(' + ') : 'No Audio';

  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-[420px] lg:min-h-0 bg-[#0B0D12] lg:overflow-hidden">
      {/* Contextual Stage Bar */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-4 shrink-0 bg-[#0D1017]">
        <div
          role="tablist"
          aria-label="Capture mode"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#141822] border border-white/[0.08]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={captureMode === 'screenshot'}
            onClick={() => onChangeMode('screenshot')}
            disabled={isRecording}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
              captureMode === 'screenshot'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Screenshot</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={captureMode === 'video'}
            onClick={() => onChangeMode('video')}
            disabled={isRecording}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
              captureMode === 'video'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Record Video</span>
          </button>
        </div>

        {/* Clean unboxed metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
          <span className="font-mono text-slate-300">
            {outputDimensions.width} × {outputDimensions.height}
          </span>
          <span aria-hidden="true">·</span>
          <span>{styleSettings.aspectRatio === 'auto' ? 'Auto Aspect' : styleSettings.aspectRatio}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate max-w-[160px] text-slate-300">{activeBackground.name}</span>
          {isZoomed && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onResetZoom}
                className="text-cyan-300 hover:text-cyan-200 font-medium whitespace-nowrap shrink-0"
              >
                Zoom {zoomScale.toFixed(2)}× (Reset)
              </button>
            </>
          )}
          {hasCapturedSource && !isRecording && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onResetToSample}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Reset Preview</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feedback Banner (only shown when clipboard/capture action occurs or error arises) */}
      {statusBanner && (
        <div
          role={statusBanner.kind === 'error' ? 'alert' : 'status'}
          className={`mx-5 mt-3 px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 shrink-0 ${
            statusBanner.kind === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : statusBanner.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
          }`}
        >
          <span className="font-medium">{statusBanner.message}</span>
          <button
            type="button"
            onClick={onDismissBanner}
            className="text-current opacity-75 hover:opacity-100 underline underline-offset-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Center Canvas Stage */}
      <div className="flex-1 min-h-0 p-4 sm:p-6 flex items-center justify-center relative overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            data-testid="studio-canvas"
            data-zoomed={isZoomed ? 'true' : 'false'}
            data-highlighting={isHighlighting ? 'true' : 'false'}
            onDoubleClick={onCanvasDoubleClick}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
            onPointerLeave={onCanvasPointerUp}
            aria-label="Composited screen capture preview canvas"
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl border border-white/[0.06] cursor-crosshair select-none touch-none"
          />
        </div>
      </div>

      {/* Bottom Studio Control Dock */}
      <div className="px-5 py-3.5 border-t border-white/[0.08] bg-[#0E1118] flex flex-wrap items-center justify-between gap-3 shrink-0">
        {captureMode === 'screenshot' ? (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onTakeScreenshot}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Take Screenshot</span>
                <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/25 rounded text-indigo-100">
                  {getShortcutLabel('screenshot')}
                </kbd>
              </button>

              <button
                type="button"
                onClick={onCaptureSample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#181D29] hover:bg-[#212838] border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                <span>Save Sample Frame</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopyCanvasPng}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#181D29] hover:bg-[#212838] border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">Copied PNG</span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                    <span>Copy PNG</span>
                    <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/30 rounded text-slate-400">
                      {getShortcutLabel('copyLatest')}
                    </kbd>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onDownloadCanvasPng}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#181D29] hover:bg-[#212838] border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                <span>Download PNG</span>
              </button>
            </div>
          </>
        ) : isRecording ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-white">
                  {isPaused ? 'Paused' : 'Recording'}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-100 tabular-nums ml-1">
                  {formatDuration(recordingSeconds)}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
                {audioSettings.systemAudioEnabled && (
                  <div className="flex items-center gap-2">
                    <span>System</span>
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 transition-[width] duration-75"
                        style={{ width: `${Math.round(audioLevels.system * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {audioSettings.micEnabled && (
                  <div className="flex items-center gap-2">
                    <span>Mic</span>
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-[width] duration-75"
                        style={{ width: `${Math.round(audioLevels.mic * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTogglePauseRecording}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#181D29] hover:bg-[#212838] border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onStopRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Stop &amp; Save</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onStartRecording}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <Film className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Start Screen Recording</span>
                <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/25 rounded text-rose-100">
                  {getShortcutLabel('recordToggle')}
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
              <span className="text-slate-300 font-medium">{qualityConfig.shortLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{recordingSettings.compositeBackground ? 'With Background' : 'Raw Screen'}</span>
              <span aria-hidden="true">·</span>
              <span>{audioSummary}</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
