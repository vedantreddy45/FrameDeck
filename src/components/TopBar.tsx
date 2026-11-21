import { Camera, Square } from 'lucide-react';
import { StudioTab } from '../types/studio';
import { formatDuration } from '../utils/clipboard';

interface TopBarProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  captureCount: number;
  isRecording: boolean;
  recordingSeconds: number;
  onPrimaryCaptureAction: () => void;
}

export function TopBar({
  activeTab,
  onSelectTab,
  captureCount,
  isRecording,
  recordingSeconds,
  onPrimaryCaptureAction,
}: TopBarProps) {
  return (
    <header className="h-14 border-b border-white/[0.08] bg-[#0E1118] px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-8 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <button
        type="button"
        onClick={() => onSelectTab('studio')}
        className="text-base sm:text-lg font-bold tracking-tight text-slate-100 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
      >
        FrameDeck
      </button>

      {/* Zone 2: Clean single-line navigation links */}
      <nav aria-label="Primary navigation" className="flex items-center gap-2.5 sm:gap-5 overflow-x-auto">
        <button
          type="button"
          onClick={() => onSelectTab('studio')}
          aria-current={activeTab === 'studio' ? 'page' : undefined}
          className={`py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeTab === 'studio'
              ? 'text-white border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Studio
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('captures')}
          aria-current={activeTab === 'captures' ? 'page' : undefined}
          className={`py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeTab === 'captures'
              ? 'text-white border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Captures{captureCount > 0 ? ` (${captureCount})` : ''}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('editor')}
          aria-current={activeTab === 'editor' ? 'page' : undefined}
          className={`py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeTab === 'editor'
              ? 'text-white border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Editor
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('shortcuts')}
          aria-current={activeTab === 'shortcuts' ? 'page' : undefined}
          className={`py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeTab === 'shortcuts'
              ? 'text-white border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Shortcuts
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('extension')}
          aria-current={activeTab === 'extension' ? 'page' : undefined}
          className={`py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeTab === 'extension'
              ? 'text-white border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Extension
        </button>
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center shrink-0">
        {isRecording ? (
          <button
            type="button"
            onClick={onPrimaryCaptureAction}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span className="hidden sm:inline">Stop Recording</span>
            <span className="sm:hidden">Stop</span>
            <span className="font-mono tabular-nums text-rose-100">
              {formatDuration(recordingSeconds)}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPrimaryCaptureAction}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Capture Screen</span>
            <span className="sm:hidden">Capture</span>
          </button>
        )}
      </div>
    </header>
  );
}
