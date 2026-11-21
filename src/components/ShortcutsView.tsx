import { useEffect, useState } from 'react';
import { Keyboard, RotateCcw } from 'lucide-react';
import { ShortcutActionId, ShortcutBinding } from '../types/studio';
import {
  DEFAULT_SHORTCUTS,
  findShortcutConflict,
  formatShortcutParts,
  hasAnyModifier,
  isModifierOnlyKey,
} from '../utils/shortcuts';

interface ShortcutsViewProps {
  shortcuts: ShortcutBinding[];
  onUpdateShortcuts: (next: ShortcutBinding[]) => void;
}

export function ShortcutsView({ shortcuts, onUpdateShortcuts }: ShortcutsViewProps) {
  const [recordingId, setRecordingId] = useState<ShortcutActionId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setRecordingId(null);
        setErrorMsg(null);
        return;
      }

      if (isModifierOnlyKey(e.code)) {
        return;
      }

      const candidate = {
        code: e.code,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
      };

      if (!hasAnyModifier(candidate)) {
        setErrorMsg('Include at least one modifier key (Alt, Ctrl, Shift, or Cmd).');
        return;
      }

      const conflict = findShortcutConflict(candidate, shortcuts, recordingId);
      if (conflict) {
        setErrorMsg(`Already assigned to "${conflict.label}". Choose a different combination.`);
        return;
      }

      const next = shortcuts.map((item) =>
        item.id === recordingId ? { ...item, ...candidate } : item
      );
      onUpdateShortcuts(next);
      setRecordingId(null);
      setErrorMsg(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingId, shortcuts, onUpdateShortcuts]);

  return (
    <main className="flex-1 overflow-y-auto bg-[#0B0D12] p-6 sm:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Keyboard Shortcuts
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Trigger captures, control recording, and copy screenshots while FrameDeck is focused.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onUpdateShortcuts(DEFAULT_SHORTCUTS);
              setRecordingId(null);
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-medium text-rose-300"
          >
            {errorMsg}
          </div>
        )}

        <div className="rounded-xl border border-white/[0.08] bg-[#11141C] divide-y divide-white/[0.06]">
          {shortcuts.map((item) => {
            const isRecording = recordingId === item.id;
            const parts = formatShortcutParts(item, isMac);

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-100">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5" aria-label={`Current shortcut: ${parts.join(' + ')}`}>
                    {parts.map((part, idx) => (
                      <kbd
                        key={idx}
                        className="min-w-[28px] h-7 px-2 inline-flex items-center justify-center rounded-md bg-[#0B0D12] border border-white/15 text-xs font-mono font-medium text-slate-200"
                      >
                        {part}
                      </kbd>
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-label={isRecording ? `Cancel rebinding ${item.label}` : `Rebind ${item.label}`}
                    onClick={() => {
                      setErrorMsg(null);
                      setRecordingId(isRecording ? null : item.id);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      isRecording
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {isRecording ? 'Press keys… (Esc)' : 'Rebind'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#11141C] p-5 flex items-start gap-3.5">
          <Keyboard className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-xs text-slate-400 leading-relaxed">
            <p className="text-sm font-medium text-slate-200">Quick Tips for Instant Laptop Access</p>
            <p>
              Press number keys <kbd className="px-1.5 py-0.5 rounded bg-[#0B0D12] border border-white/10 font-mono text-slate-200">1</kbd> through{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-[#0B0D12] border border-white/10 font-mono text-slate-200">9</kbd>{' '}
              anytime in the Studio to switch between your top vibrant backgrounds instantly.
            </p>
            <p>
              For one-click desktop window behavior, use your browser&apos;s <strong className="text-slate-300 font-medium">Install App / Create Shortcut</strong> menu option so FrameDeck opens in its own standalone laptop window.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
