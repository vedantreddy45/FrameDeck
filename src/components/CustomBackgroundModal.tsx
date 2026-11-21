import React, { useRef, useState } from 'react';
import { ImagePlus, Palette, Upload, X } from 'lucide-react';
import { BackgroundItem } from '../types/studio';
import {
  createCustomGradientBackground,
  validateCustomGradientInput,
} from '../utils/backgrounds';

interface CustomBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBackground: (bg: BackgroundItem) => Promise<void>;
}

export function CustomBackgroundModal({
  isOpen,
  onClose,
  onAddBackground,
}: CustomBackgroundModalProps) {
  const [mode, setMode] = useState<'image' | 'gradient'>('image');
  const [name, setName] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>(['#4F46E5', '#EC4899', '#F59E0B']);
  const [useThirdStop, setUseThirdStop] = useState(true);
  const [angle, setAngle] = useState(135);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activeColors = useThirdStop ? colors : colors.slice(0, 2);

  const handleFileSelected = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid PNG, JPG, or WebP image file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Image size must be under 15 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        setError('Could not read the selected image.');
        return;
      }
      setImagePreviewUrl(result);
      if (!name.trim()) {
        const cleanFileName = file.name.replace(/\.[^/.]+$/, '').slice(0, 32);
        setName(cleanFileName || 'Custom Wallpaper');
      }
    };
    reader.onerror = () => setError('Failed to read image file.');
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'image') {
      if (!imagePreviewUrl) {
        setError('Please choose an image file to upload.');
        return;
      }
      const cleanName = name.trim() || 'Custom Wallpaper';
      setIsSaving(true);
      try {
        await onAddBackground({
          id: `custom-img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: cleanName,
          kind: 'image',
          isCustom: true,
          imageUrl: imagePreviewUrl,
          createdAt: Date.now(),
        });
        setName('');
        setImagePreviewUrl(null);
        onClose();
      } catch {
        setError('Failed to save background locally.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const validation = validateCustomGradientInput(name, activeColors, angle);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid gradient settings.');
      return;
    }

    setIsSaving(true);
    try {
      const bg = createCustomGradientBackground(name, activeColors, angle);
      await onAddBackground(bg);
      setName('');
      onClose();
    } catch {
      setError('Failed to save custom gradient.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-bg-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#141822] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h2 id="custom-bg-modal-title" className="text-base font-semibold text-white">
            Add Custom Background
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add background modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B0D12] rounded-lg border border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setMode('image');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                mode === 'image'
                  ? 'bg-[#1D2230] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload Image</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('gradient');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                mode === 'gradient'
                  ? 'bg-[#1D2230] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create Gradient</span>
            </button>
          </div>

          <div>
            <label htmlFor="custom-bg-name" className="block text-xs font-medium text-slate-300 mb-1.5">
              Background Name
            </label>
            <input
              id="custom-bg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'image' ? 'e.g. Studio Desk Wallpaper' : 'e.g. Electric Sunset'}
              className="w-full px-3 py-2 text-sm bg-[#0B0D12] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {mode === 'image' ? (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-xl border border-dashed transition-colors p-6 text-center ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-500/10'
                    : 'border-white/15 bg-[#0B0D12]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                  className="sr-only"
                  aria-label="Upload custom background image"
                />

                {imagePreviewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreviewUrl}
                      alt="Custom background preview"
                      className="w-full h-40 object-cover rounded-lg border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      Choose a different image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="mx-auto w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-300">
                      <Upload className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="text-sm text-slate-200">
                      Drag and drop an image here, or{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2"
                      >
                        browse files
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      PNG, JPG, or WebP up to 15 MB · Stored locally in your browser
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Live Gradient Preview */}
              <div
                className="w-full h-32 rounded-xl border border-white/10"
                style={{
                  backgroundImage: `linear-gradient(${angle}deg, ${activeColors.join(', ')})`,
                }}
                aria-label="Gradient preview"
              />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Color Stops</span>
                  <button
                    type="button"
                    onClick={() => setUseThirdStop((v) => !v)}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    {useThirdStop ? 'Use 2 colors' : '+ Add 3rd color'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {activeColors.map((col, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#0B0D12] border border-white/10 cursor-pointer"
                    >
                      <input
                        type="color"
                        value={col}
                        onChange={(e) => {
                          const next = [...colors];
                          next[idx] = e.target.value.toUpperCase();
                          setColors(next);
                        }}
                        className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
                        aria-label={`Color stop ${idx + 1}`}
                      />
                      <span className="text-xs font-mono text-slate-200 tabular-nums">{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="gradient-angle" className="font-medium text-slate-300">
                    Gradient Angle
                  </label>
                  <span className="font-mono tabular-nums text-slate-400">{angle}°</span>
                </div>
                <input
                  id="gradient-angle"
                  type="range"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-rose-400 font-medium">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Background'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
