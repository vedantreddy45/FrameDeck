import { Highlighter, Mic, Plus, Trash2, Volume2, ZoomIn } from 'lucide-react';
import {
  AspectRatioPreset,
  AudioSettings,
  BackgroundItem,
  FrameStyle,
  HighlightColorId,
  QualityPresetId,
  RecordingSettings,
  StudioStyleSettings,
  VideoEffectsSettings,
} from '../types/studio';
import { buildBackgroundCss } from '../utils/backgrounds';
import { QUALITY_PRESETS } from '../utils/clipboard';

interface InspectorSidebarProps {
  backgrounds: BackgroundItem[];
  styleSettings: StudioStyleSettings;
  onUpdateStyle: (patch: Partial<StudioStyleSettings>) => void;
  onOpenAddBackground: () => void;
  onDeleteCustomBackground: (id: string) => void;
  audioSettings: AudioSettings;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
  recordingSettings: RecordingSettings;
  onUpdateRecording: (patch: Partial<RecordingSettings>) => void;
  videoEffects: VideoEffectsSettings;
  onUpdateVideoEffects: (patch: Partial<VideoEffectsSettings>) => void;
  micDevices: MediaDeviceInfo[];
  isTestingMic: boolean;
  micTestLevel: number;
  onToggleMicTest: () => void;
  isRecording: boolean;
}

const ASPECT_OPTIONS: { id: AspectRatioPreset; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: '16:9', label: '16:9' },
  { id: '4:3', label: '4:3' },
  { id: '1:1', label: '1:1' },
  { id: '9:16', label: '9:16' },
];

const FRAME_OPTIONS: { id: FrameStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'macos-dark', label: 'Dark Bar' },
  { id: 'macos-light', label: 'Light Bar' },
];

const QUALITY_IDS: QualityPresetId[] = ['4k-60', '1080p-60', '720p-30'];

const HIGHLIGHT_COLORS: { id: HighlightColorId; label: string; swatch: string }[] = [
  { id: 'amber', label: 'Amber', swatch: '#FACC15' },
  { id: 'cyan', label: 'Cyan', swatch: '#38BDF8' },
  { id: 'rose', label: 'Rose', swatch: '#FB7185' },
  { id: 'mint', label: 'Mint', swatch: '#34D399' },
];

export function InspectorSidebar({
  backgrounds,
  styleSettings,
  onUpdateStyle,
  onOpenAddBackground,
  onDeleteCustomBackground,
  audioSettings,
  onUpdateAudio,
  recordingSettings,
  onUpdateRecording,
  videoEffects,
  onUpdateVideoEffects,
  micDevices,
  isTestingMic,
  micTestLevel,
  onToggleMicTest,
  isRecording,
}: InspectorSidebarProps) {
  const activeBg =
    backgrounds.find((b) => b.id === styleSettings.backgroundId) ?? backgrounds[0];

  return (
    <aside
      aria-label="Studio Inspector"
      className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#11141C] overflow-y-auto divide-y divide-white/[0.07]"
    >
      {/* 1. Vibrant Backgrounds */}
      <section className="p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Vibrant Backgrounds</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Active: {activeBg?.name ?? 'Default'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddBackground}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Custom</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Background presets">
          {backgrounds.map((bg) => {
            const isSelected = bg.id === styleSettings.backgroundId;
            return (
              <div key={bg.id} className="relative group">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Select ${bg.name} background`}
                  title={bg.name}
                  onClick={() => onUpdateStyle({ backgroundId: bg.id })}
                  className={`w-full aspect-[16/10] rounded-lg border overflow-hidden transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    isSelected
                      ? 'border-indigo-400 ring-2 ring-indigo-500/70 scale-[1.02]'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  style={{
                    background: buildBackgroundCss(bg),
                  }}
                />
                {bg.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomBackground(bg.id);
                    }}
                    aria-label={`Delete custom background ${bg.name}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0B0D12] border border-white/20 text-slate-300 hover:text-rose-400 flex items-center justify-center opacity-85 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-2.5 h-2.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Frame & Canvas Geometry */}
      <section className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Canvas &amp; Frame</h2>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">Aspect Ratio</span>
          <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-[#0B0D12] border border-white/[0.06]">
            {ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateStyle({ aspectRatio: opt.id })}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  styleSettings.aspectRatio === opt.id
                    ? 'bg-[#1E2433] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">Window Chrome</span>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B0D12] border border-white/[0.06]">
            {FRAME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateStyle({ frameStyle: opt.id })}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  styleSettings.frameStyle === opt.id
                    ? 'bg-[#1E2433] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="slider-padding" className="text-slate-300 font-medium">
                Padding
              </label>
              <span className="font-mono tabular-nums text-slate-400">
                {styleSettings.padding} px
              </span>
            </div>
            <input
              id="slider-padding"
              type="range"
              min={0}
              max={140}
              step={4}
              value={styleSettings.padding}
              onChange={(e) => onUpdateStyle({ padding: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="slider-radius" className="text-slate-300 font-medium">
                Corner Radius
              </label>
              <span className="font-mono tabular-nums text-slate-400">
                {styleSettings.cornerRadius} px
              </span>
            </div>
            <input
              id="slider-radius"
              type="range"
              min={0}
              max={36}
              step={2}
              value={styleSettings.cornerRadius}
              onChange={(e) => onUpdateStyle({ cornerRadius: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="slider-shadow" className="text-slate-300 font-medium">
                Drop Shadow
              </label>
              <span className="font-mono tabular-nums text-slate-400">
                {styleSettings.shadowIntensity}%
              </span>
            </div>
            <input
              id="slider-shadow"
              type="range"
              min={0}
              max={100}
              step={5}
              value={styleSettings.shadowIntensity}
              onChange={(e) => onUpdateStyle({ shadowIntensity: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* 3. High-Quality Video & Simultaneous Audio Mixer */}
      <section className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Video &amp; Audio Recording</h2>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">Capture Quality</span>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B0D12] border border-white/[0.06]">
            {QUALITY_IDS.map((qid) => {
              const preset = QUALITY_PRESETS[qid];
              return (
                <button
                  key={qid}
                  type="button"
                  disabled={isRecording}
                  onClick={() => onUpdateRecording({ qualityPreset: qid })}
                  className={`py-1.5 px-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50 ${
                    recordingSettings.qualityPreset === qid
                      ? 'bg-[#1E2433] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
          <span className="text-xs font-medium text-slate-300">
            Include Vibrant Background in Video
          </span>
          <input
            type="checkbox"
            disabled={isRecording}
            checked={recordingSettings.compositeBackground}
            onChange={(e) => onUpdateRecording({ compositeBackground: e.target.checked })}
            className="w-4 h-4 rounded border-white/20 bg-[#0B0D12] accent-indigo-600"
          />
        </label>

        {/* Interactive Recording FX: Double-Tap Zoom + Hold-Drag Sentence Highlight */}
        <div className="pt-2 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="toggle-double-tap-zoom"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>Double-Tap Mouse Zoom</span>
            </label>
            <input
              id="toggle-double-tap-zoom"
              type="checkbox"
              checked={videoEffects.doubleTapZoomEnabled}
              onChange={(e) =>
                onUpdateVideoEffects({ doubleTapZoomEnabled: e.target.checked })
              }
              className="w-4 h-4 rounded border-white/20 bg-[#0B0D12] accent-indigo-600"
            />
          </div>

          {videoEffects.doubleTapZoomEnabled && (
            <div className="pl-5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="zoom-scale-slider" className="text-slate-400">
                  Zoom Depth
                </label>
                <span className="font-mono tabular-nums text-slate-400">
                  {videoEffects.zoomScale.toFixed(2)}×
                </span>
              </div>
              <input
                id="zoom-scale-slider"
                type="range"
                min={1.4}
                max={2.6}
                step={0.05}
                value={videoEffects.zoomScale}
                onChange={(e) =>
                  onUpdateVideoEffects({ zoomScale: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <label
              htmlFor="toggle-sentence-highlight"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>PDF Sentence Highlight (Hold)</span>
            </label>
            <input
              id="toggle-sentence-highlight"
              type="checkbox"
              checked={videoEffects.sentenceHighlightEnabled}
              onChange={(e) =>
                onUpdateVideoEffects({ sentenceHighlightEnabled: e.target.checked })
              }
              className="w-4 h-4 rounded border-white/20 bg-[#0B0D12] accent-indigo-600"
            />
          </div>

          {videoEffects.sentenceHighlightEnabled && (
            <div className="pl-5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">Highlight Color</span>
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Set highlight color to ${c.label}`}
                    aria-pressed={videoEffects.highlightColor === c.id}
                    onClick={() => onUpdateVideoEffects({ highlightColor: c.id })}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      videoEffects.highlightColor === c.id
                        ? 'border-white scale-110'
                        : 'border-white/20 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.swatch }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Audio Channel */}
        <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <label htmlFor="toggle-system-audio" className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
              <span>System Audio</span>
            </label>
            <input
              id="toggle-system-audio"
              type="checkbox"
              disabled={isRecording}
              checked={audioSettings.systemAudioEnabled}
              onChange={(e) => onUpdateAudio({ systemAudioEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-[#0B0D12] accent-indigo-600"
            />
          </div>

          {audioSettings.systemAudioEnabled && (
            <div className="space-y-1.5 pl-5">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="sys-gain" className="text-slate-400">
                  System Gain
                </label>
                <span className="font-mono tabular-nums text-slate-400">
                  {Math.round(audioSettings.systemVolume * 100)}%
                </span>
              </div>
              <input
                id="sys-gain"
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={audioSettings.systemVolume}
                onChange={(e) => onUpdateAudio({ systemVolume: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Microphone Channel */}
        <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <label htmlFor="toggle-mic-audio" className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
              <Mic className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Microphone</span>
            </label>
            <input
              id="toggle-mic-audio"
              type="checkbox"
              disabled={isRecording}
              checked={audioSettings.micEnabled}
              onChange={(e) => onUpdateAudio({ micEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-[#0B0D12] accent-indigo-600"
            />
          </div>

          {audioSettings.micEnabled && (
            <div className="space-y-2.5 pl-5">
              {micDevices.length > 0 && (
                <div>
                  <label htmlFor="mic-device-select" className="sr-only">
                    Microphone input device
                  </label>
                  <select
                    id="mic-device-select"
                    disabled={isRecording}
                    value={audioSettings.micDeviceId}
                    onChange={(e) => onUpdateAudio({ micDeviceId: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D12] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="default">System Default Microphone</option>
                    {micDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Microphone (${dev.deviceId.slice(0, 6)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <label htmlFor="mic-gain" className="text-slate-400">
                    Mic Gain
                  </label>
                  <span className="font-mono tabular-nums text-slate-400">
                    {Math.round(audioSettings.micVolume * 100)}%
                  </span>
                </div>
                <input
                  id="mic-gain"
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={audioSettings.micVolume}
                  onChange={(e) => onUpdateAudio({ micVolume: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={onToggleMicTest}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    isTestingMic
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {isTestingMic ? 'Stop Mic Check' : 'Test Mic'}
                </button>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden" aria-label="Microphone level meter">
                  <div
                    className="h-full bg-emerald-400 transition-[width] duration-75"
                    style={{ width: `${Math.round(micTestLevel * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
          To capture laptop system audio alongside your mic, check &ldquo;Also share system/tab audio&rdquo; in the screen picker dialog.
        </p>
      </section>
    </aside>
  );
}
