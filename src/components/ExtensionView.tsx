import { useState } from 'react';
import JSZip from 'jszip';
import { Check, Chrome, Download, Laptop, MousePointerClick, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { triggerBlobDownload } from '../utils/clipboard';

const EXTENSION_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'README.md',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

export function ExtensionView() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isZipping, setIsZipping] = useState(false);
  const [zipDone, setZipDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownloadExtensionZip = async () => {
    setIsZipping(true);
    setErrorMsg(null);
    try {
      const zip = new JSZip();
      const folder = zip.folder('framedeck-chrome-extension');
      if (!folder) throw new Error('Could not initialize zip archive.');

      await Promise.all(
        EXTENSION_FILES.map(async (relPath) => {
          const res = await fetch(`/extension/${relPath}`);
          if (!res.ok) throw new Error(`Missing extension file: ${relPath}`);
          const blob = await res.blob();
          folder.file(relPath, blob);
        })
      );

      const archive = await zip.generateAsync({ type: 'blob' });
      triggerBlobDownload(archive, 'framedeck-chrome-extension.zip');
      setZipDone(true);
      setTimeout(() => setZipDone(false), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to build extension archive.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#0B0D12] p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="border-b border-white/[0.08] pb-5">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Desktop App &amp; Chrome Extension
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Run FrameDeck as a standalone laptop app or install the Chrome Extension for 1-click tab capture and live webpage zoom &amp; sentence highlighting.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-medium text-rose-300"
          >
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Standalone Desktop App (PWA) */}
          <section className="rounded-xl border border-white/[0.08] bg-[#11141C] p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <Laptop className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Desktop Studio App</h2>
                  <p className="text-xs text-slate-400">macOS · Windows · Linux Standalone Window</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Install FrameDeck directly onto your laptop dock or Start Menu as an offline-capable standalone desktop application with full 4K screen recording, simultaneous Mic + System Audio, and Video Editor.
              </p>

              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Runs in its own clean window without browser tabs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Offline-ready with Service Worker &amp; IndexedDB library</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>
                    Fast keyboard shortcuts (<code className="text-slate-200 font-mono">Alt+S</code>,{' '}
                    <code className="text-slate-200 font-mono">Alt+R</code>,{' '}
                    <code className="text-slate-200 font-mono">Alt+C</code>)
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-white/[0.07]">
              {isInstalled ? (
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Running in Desktop Standalone Mode</span>
                </div>
              ) : isInstallable ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Install FrameDeck Desktop App</span>
                </button>
              ) : isIOS ? (
                <p className="text-xs text-slate-400">
                  In Safari, tap <strong className="text-slate-200">Share</strong> and choose{' '}
                  <strong className="text-slate-200">Add to Home Screen</strong>.
                </p>
              ) : (
                <div className="text-xs text-slate-400 leading-relaxed">
                  Open this page in its own browser tab and click the{' '}
                  <strong className="text-slate-200">Install FrameDeck</strong> icon in the Chrome/Edge address bar (or menu →{' '}
                  <strong className="text-slate-200">Cast, save, and share → Install</strong>).
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Chrome Browser Extension (Manifest V3) */}
          <section className="rounded-xl border border-white/[0.08] bg-[#11141C] p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <Chrome className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Chrome Browser Extension</h2>
                  <p className="text-xs text-slate-400">Manifest V3 · Webpage Zoom &amp; PDF Highlight</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Download the ready-to-load Chrome Extension package to capture any tab straight to your clipboard and inject live interactive recording effects onto any webpage you record.
              </p>

              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <MousePointerClick className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                  <span>Double-click any webpage spot to zoom in smoothly and double-click to zoom out</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>Hold &amp; drag mouse to highlight sentences like a PDF; clears on mouse release</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>
                    Global Chrome shortcut (<code className="text-slate-200 font-mono">Alt+S</code>) copies visible tab PNG to clipboard
                  </span>
                </li>
              </ul>

              <div className="rounded-lg bg-[#0B0D12] border border-white/[0.07] p-3.5 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-slate-200">Quick Install (Unpacked):</div>
                <div>1. Download &amp; unzip the extension bundle below.</div>
                <div>
                  2. Open <code className="text-indigo-300">chrome://extensions</code> and enable{' '}
                  <strong className="text-white">Developer mode</strong>.
                </div>
                <div>
                  3. Click <strong className="text-white">Load unpacked</strong> and select the{' '}
                  <code className="text-indigo-300">framedeck-chrome-extension</code> folder.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.07]">
              <button
                type="button"
                disabled={isZipping}
                onClick={() => void handleDownloadExtensionZip()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {zipDone ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Downloaded framedeck-chrome-extension.zip</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {isZipping ? 'Packaging Extension...' : 'Download Chrome Extension (.zip)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
