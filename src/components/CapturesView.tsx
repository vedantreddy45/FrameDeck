import { useEffect, useMemo, useState } from 'react';
import { Camera, Check, ClipboardCopy, Download, Film, Scissors, Sliders, Trash2 } from 'lucide-react';
import { CaptureItem } from '../types/studio';
import { formatBytes, formatDuration, formatRelativeTime } from '../utils/clipboard';

interface CapturesViewProps {
  captures: CaptureItem[];
  onCopyScreenshot: (item: CaptureItem) => Promise<void>;
  onDownloadCapture: (item: CaptureItem) => void;
  onDeleteCapture: (id: string) => Promise<void>;
  onRestyleInStudio: (item: CaptureItem) => void;
  onEditVideo: (item: CaptureItem) => void;
  onSwitchToStudio: () => void;
}

export function CapturesView({
  captures,
  onCopyScreenshot,
  onDownloadCapture,
  onDeleteCapture,
  onRestyleInStudio,
  onEditVideo,
  onSwitchToStudio,
}: CapturesViewProps) {
  const [filter, setFilter] = useState<'all' | 'screenshot' | 'video'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    for (const item of captures) {
      nextUrls[item.id] = URL.createObjectURL(item.blob);
    }
    setObjectUrls(nextUrls);
    return () => {
      Object.values(nextUrls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [captures]);

  const filtered = useMemo(() => {
    if (filter === 'all') return captures;
    return captures.filter((c) => c.kind === filter);
  }, [captures, filter]);

  const handleCopy = async (item: CaptureItem) => {
    await onCopyScreenshot(item);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 2000);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#0B0D12] p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Captures Library</h1>
            <p className="text-sm text-slate-400 mt-1">
              Screenshots and screen recordings saved locally in your browser.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter captures"
            className="flex items-center gap-1 p-1 bg-[#11141C] border border-white/[0.08] rounded-lg"
          >
            {(['all', 'screenshot', 'video'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={filter === tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab
                    ? 'bg-[#1D2230] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'all' ? 'All Captures' : tab === 'screenshot' ? 'Screenshots' : 'Videos'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#11141C] py-16 px-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-300">
              {filter === 'video' ? (
                <Film className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Camera className="w-6 h-6" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">
                {captures.length === 0
                  ? 'No captures saved yet'
                  : `No ${filter}s in your library`}
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Take a crisp screenshot directly to your clipboard or record a high-quality video with vibrant backgrounds in the Studio.
              </p>
            </div>
            <button
              type="button"
              onClick={onSwitchToStudio}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Studio</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((item) => {
              const url = objectUrls[item.id];
              const isCopied = copiedId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-white/[0.08] bg-[#11141C] overflow-hidden flex flex-col"
                >
                  <div className="aspect-video bg-[#080A0F] relative overflow-hidden border-b border-white/[0.06]">
                    {url && item.kind === 'screenshot' && (
                      <img
                        src={url}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                    {url && item.kind === 'video' && (
                      <video
                        src={url}
                        controls
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 truncate">{item.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-1 tabular-nums">
                        <span>{item.kind === 'screenshot' ? 'Screenshot' : 'Video'}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {item.width} × {item.height}
                        </span>
                        {typeof item.durationSeconds === 'number' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{formatDuration(item.durationSeconds)}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{formatBytes(item.sizeBytes)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5">
                        {item.kind === 'screenshot' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleCopy(item)}
                              aria-label={`Copy ${item.name} to clipboard`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-colors whitespace-nowrap shrink-0"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Copy PNG</span>
                                </>
                              )}
                            </button>

                            {item.rawSourceBlob && (
                              <button
                                type="button"
                                onClick={() => onRestyleInStudio(item)}
                                aria-label={`Re-style ${item.name} in Studio`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.09] transition-colors whitespace-nowrap shrink-0"
                              >
                                <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Re-style</span>
                              </button>
                            )}
                          </>
                        )}

                        {item.kind === 'video' && (
                          <button
                            type="button"
                            onClick={() => onEditVideo(item)}
                            aria-label={`Edit ${item.name} in Video Editor`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit Video</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDownloadCapture(item)}
                          aria-label={`Download ${item.name}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.09] transition-colors whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Save</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void onDeleteCapture(item.id)}
                        aria-label={`Delete ${item.name}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
