import React from 'react';
import { CaptionConfig, TimestampedWord } from '../types';
import { Settings2, Type, Palette, AlignLeft, PaintBucket, DownloadCloud, FileJson, FileText, Film, Sparkles } from 'lucide-react';

interface Props {
  config: CaptionConfig;
  onChange: (newConfig: CaptionConfig) => void;
  isProcessing: boolean;
  processingStatus?: string;
  onTranscribe: () => void;
  hasTranscript: boolean;
  transcript: TimestampedWord[];
  onOpenExport: () => void;
}

const CAPTION_PRESETS = [
  {
    name: 'TikTok Viral',
    icon: '🎵',
    style: {
      fontFamily: 'Anton',
      fontSize: 48,
      color: '#FFFF00',
      backgroundColor: '#00000000',
      animationStyle: 'pop',
      displayMode: 'text',
      fontWeight: '900',
      shadow: true,
      uppercase: true,
      displayRange: 'single',
    }
  },
  {
    name: 'Netflix Classic',
    icon: '🎬',
    style: {
      fontFamily: 'Inter',
      fontSize: 24,
      color: '#FFFFFF',
      backgroundColor: '#000000CC',
      animationStyle: 'none',
      displayMode: 'pill',
      fontWeight: '500',
      shadow: false,
      uppercase: false,
      displayRange: 'phrase',
    }
  },
  {
    name: 'Neon Rebel',
    icon: '⚡',
    style: {
      fontFamily: 'Bangers',
      fontSize: 50,
      color: '#00FFFF',
      backgroundColor: '#FF3366',
      animationStyle: 'bounce',
      displayMode: 'pill',
      fontWeight: '900',
      shadow: true,
      uppercase: true,
      displayRange: 'single',
    }
  },
  {
    name: 'Bubble Play',
    icon: '🎈',
    style: {
      fontFamily: 'Fredoka',
      fontSize: 32,
      color: '#FFFFFF',
      backgroundColor: '#4F46E5',
      animationStyle: 'bounce',
      displayMode: 'pill',
      fontWeight: '700',
      shadow: false,
      uppercase: true,
      displayRange: 'single',
    }
  }
];

export function SidebarControls({ config, onChange, isProcessing, processingStatus, onTranscribe, hasTranscript, transcript, onOpenExport }: Props) {
  const update = (key: keyof CaptionConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
  };

  const downloadSrt = () => {
    let srtData = '';
    transcript.forEach((w, i) => {
      srtData += `${i + 1}\n`;
      srtData += `${formatTime(w.start)} --> ${formatTime(w.end)}\n`;
      srtData += `${w.word}\n\n`;
    });
    
    const blob = new Blob([srtData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'captions.srt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJson = () => {
    const jsonStr = JSON.stringify(transcript, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'captions.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-80 bg-zinc-900/80 backdrop-blur-xl border-l border-white/10 h-full flex flex-col items-stretch overflow-y-auto custom-scrollbar">
      <div className="p-6 border-b border-white/5 top-0 sticky bg-zinc-900/90 z-10 backdrop-blur-xl">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Settings2 className="w-5 h-5 text-blue-400" />
          Settings
        </h2>
        
        {!hasTranscript ? (
          <button
            onClick={onTranscribe}
            disabled={isProcessing}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs truncate">{processingStatus || 'Processing...'}</span>
              </>
            ) : (
              'Auto-Generate Captions'
            )}
          </button>
        ) : (
          <div className="mt-6 flex flex-col gap-2 bg-gradient-to-br from-zinc-800/20 to-indigo-950/20 p-4 py-3 rounded-2xl border border-white/5 shadow-inner">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
               <DownloadCloud className="w-4 h-4 text-indigo-400" /> Export Options
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={downloadSrt}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold py-2 px-3 border border-white/10 rounded-xl transition-colors"
                title="Download standard SubRip Subtitle file"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" /> .SRT
              </button>
              <button 
                onClick={downloadJson}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold py-2 px-3 border border-white/10 rounded-xl transition-colors"
                title="Download JSON containing exact word timestamps"
              >
                <FileJson className="w-3.5 h-3.5 text-zinc-400" /> .JSON
              </button>
            </div>
            
            <button 
              onClick={onOpenExport}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-transform active:scale-95 shadow-md shadow-indigo-600/20 border border-indigo-500/30"
              title="Render and download high resolution video with subtitles burned in"
            >
              <Film className="w-4 h-4" /> Export Video with Subtitles
            </button>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col gap-8 flex-1">
        
        {/* Style Presets */}
        <section className="bg-black/20 p-4 rounded-2xl border border-white/5">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> One-Click Vibe Presets
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {CAPTION_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  onChange({
                    ...config,
                    ...p.style
                  } as any);
                }}
                className="flex items-center gap-2 bg-black/45 hover:bg-black/75 border border-white/5 hover:border-indigo-500/30 p-2 text-left transition-all active:scale-95 group rounded-xl"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">{p.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-white leading-tight truncate">{p.name}</div>
                  <div className="text-[8px] text-zinc-400 font-mono tracking-tighter truncate">{p.style.fontFamily}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Style Section */}
        <section>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Type className="w-4 h-4" /> Typography
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/80 block mb-2">Font Family</label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors appearance-none text-xs"
                value={config.fontFamily}
                onChange={(e) => update('fontFamily', e.target.value)}
              >
                <option value="Inter">Inter (Sans)</option>
                <option value="Space Grotesk">Space Grotesk (Tech)</option>
                <option value="Outfit">Outfit (Smooth Sans)</option>
                <option value="Montserrat">Montserrat (Geometric)</option>
                <option value="Playfair Display">Playfair Display (Serif Elegance)</option>
                <option value="Bangers">Bangers (Comic)</option>
                <option value="Anton">Anton (Bold Heavy)</option>
                <option value="Fredoka">Fredoka (Bubble Soft)</option>
                <option value="Caveat">Caveat (Scribble Hand)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-white/80 block mb-2 flex justify-between">
                <span>Font Size</span>
                <span className="text-blue-400">{config.fontSize}px</span>
              </label>
              <input
                type="range"
                min="16"
                max="120"
                value={config.fontSize}
                onChange={(e) => update('fontSize', parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg cursor-pointer border border-white/5 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={config.fontWeight === '900'}
                  onChange={(e) => update('fontWeight', e.target.checked ? '900' : '500')}
                  className="rounded text-blue-500 focus:ring-blue-500 outline-none"
                />
                <span className="text-sm text-white">Bold</span>
              </label>
              <label className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg cursor-pointer border border-white/5 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={config.uppercase}
                  onChange={(e) => update('uppercase', e.target.checked)}
                  className="rounded text-blue-500 focus:ring-blue-500 outline-none"
                />
                <span className="text-sm text-white">ALL CAPS</span>
              </label>
            </div>
          </div>
        </section>

        {/* Colors Section */}
        <section>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Colors
          </h3>
          
          <div className="space-y-5">
            {/* Text Color Input Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/80 font-medium">Text Color</label>
                <span className="text-[10px] font-mono text-zinc-400 uppercase bg-black/40 px-2 py-0.5 rounded border border-white/5">
                  {config.color}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                {[
                  { value: '#FFFFFF', label: 'White' },
                  { value: '#FFFF00', label: 'Yellow' },
                  { value: '#00FFFF', label: 'Cyan' },
                  { value: '#39FF14', label: 'Neon Green' },
                  { value: '#FF3366', label: 'Hot Pink' },
                  { value: '#FF9900', label: 'Orange' },
                ].map((preset) => {
                  const isSelected = config.color.toUpperCase() === preset.value.toUpperCase();
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => update('color', preset.value)}
                      title={preset.label}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center relative shadow-md ${
                        isSelected ? 'border-indigo-400 scale-105' : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ backgroundColor: preset.value }}
                    >
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-black shadow-sm" />
                      )}
                    </button>
                  );
                })}
                
                {/* Custom Color Input */}
                <label className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 hover:border-white/50 transition-colors flex items-center justify-center cursor-pointer relative hover:scale-110 active:scale-95" title="Pick custom color">
                  <input
                    type="color"
                    value={config.color}
                    onChange={(e) => update('color', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="w-5 h-5 rounded-full shadow-inner"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="absolute text-[9px] font-bold text-white/85 pointer-events-none">+</span>
                </label>
              </div>
            </div>

            {/* Highlight (Bg) Input Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/80 font-medium">
                  {config.displayMode === 'pill' ? 'Active Pill Backdrop' : 'Active Word Highlight'}
                </label>
                <span className="text-[10px] font-mono text-zinc-400 uppercase bg-black/40 px-2 py-0.5 rounded border border-white/5">
                  {config.backgroundColor === '#00000000' || config.backgroundColor === 'transparent' ? 'Dynamic' : config.backgroundColor}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                {[
                  { value: '#FFFF00', label: 'Yellow' },
                  { value: '#00FFFF', label: 'Cyan' },
                  { value: '#FF3366', label: 'Hot Pink' },
                  { value: '#39FF14', label: 'Neon Green' },
                  { value: '#059669', label: 'Sleek Green' },
                ].map((preset) => {
                  const isSelected = config.backgroundColor.toUpperCase() === preset.value.toUpperCase();
                  return (
                    <button
                       key={preset.value}
                       type="button"
                       onClick={() => update('backgroundColor', preset.value)}
                       title={preset.label}
                       className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center relative shadow-md ${
                         isSelected ? 'border-indigo-400 scale-105' : 'border-white/10 hover:border-white/30'
                       }`}
                       style={{ backgroundColor: preset.value }}
                    >
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-black shadow-sm" />
                      )}
                    </button>
                  );
                })}

                {/* No background/highlight override button */}
                <button
                  type="button"
                  onClick={() => update('backgroundColor', '#00000000')}
                  title="Dynamic contrasting color"
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center relative shadow-md overflow-hidden bg-zinc-800 ${
                    config.backgroundColor === '#00000000' || config.backgroundColor === 'transparent'
                      ? 'border-indigo-400 scale-105'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="absolute w-full h-0.5 bg-red-500/80 rotate-45 transform" />
                  <span className="text-[9px] font-semibold text-white/50">Auto</span>
                </button>
                
                {/* Custom Highlight Bg Color Input */}
                <label className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 hover:border-white/50 transition-colors flex items-center justify-center cursor-pointer relative hover:scale-110 active:scale-95" title="Pick custom backdrop">
                  <input
                    type="color"
                    value={config.backgroundColor === '#00000000' || config.backgroundColor === 'transparent' ? '#000000' : config.backgroundColor}
                    onChange={(e) => update('backgroundColor', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="w-5 h-5 rounded-full shadow-inner"
                    style={{ backgroundColor: config.backgroundColor === '#00000000' || config.backgroundColor === 'transparent' ? '#000000' : config.backgroundColor }}
                  />
                  <span className="absolute text-[9px] font-bold text-white/85 pointer-events-none">+</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Animation & Layout */}
        <section>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <PaintBucket className="w-4 h-4" /> Animation & Layout
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/80 block mb-2">Word Animation</label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors appearance-none"
                value={config.animationStyle}
                onChange={(e) => update('animationStyle', e.target.value as any)}
              >
                <option value="none">None (Static)</option>
                <option value="highlight">Karaoke Highlight</option>
                <option value="pop">Pop In</option>
                <option value="fade">Fade In</option>
                <option value="bounce">Word Bounce</option>
              </select>
            </div>

            <div className="flex p-1 bg-black/40 border border-white/10 rounded-lg">
              {['text', 'pill'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => update('displayMode', mode)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    config.displayMode === mode ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {mode} Mode
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm text-white/80 block mb-2 font-medium">Display Quantity</label>
              <div className="flex p-1 bg-black/40 border border-white/10 rounded-lg">
                {[
                  { key: 'single', label: 'One Word' },
                  { key: 'phrase', label: 'Full Phrase' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => update('displayRange', item.key)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      config.displayRange === item.key ? 'bg-indigo-600 text-white shadow' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-white/80 block mb-2 flex justify-between">
                <span>Rotation</span>
                <span className="text-blue-400">{config.rotate}°</span>
              </label>
              <input
                type="range"
                min="-45"
                max="45"
                value={config.rotate}
                onChange={(e) => update('rotate', parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-white/80 block mb-2 font-medium">Position Presets</label>
              <div className="flex p-1 bg-black/40 border border-white/10 rounded-lg">
                {[
                  { key: 'top', label: 'Top', x: 50, y: 15 },
                  { key: 'center', label: 'Center', x: 50, y: 50 },
                  { key: 'bottom', label: 'Bottom', x: 50, y: 80 }
                ].map((pos) => {
                  const isActive = Math.abs(config.positionY - pos.y) < 10 && Math.abs(config.positionX - pos.x) < 10;
                  return (
                    <button
                      key={pos.key}
                      type="button"
                      onClick={() => {
                        update('position', pos.key);
                        update('positionX', pos.x);
                        update('positionY', pos.y);
                      }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                        isActive ? 'bg-indigo-600 text-white shadow' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm text-white/80 block mb-2 flex justify-between">
                <span>Horizontal (X Coordinate)</span>
                <span className="text-indigo-400">{config.positionX}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.positionX}
                onChange={(e) => update('positionX', parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-sm text-white/80 block mb-2 flex justify-between">
                <span>Vertical (Y Coordinate)</span>
                <span className="text-indigo-400">{config.positionY}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.positionY}
                onChange={(e) => update('positionY', parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <label className="flex items-center gap-2 bg-black/20 px-3 py-3 rounded-lg cursor-pointer border border-white/5 hover:bg-white/5">
              <input
                type="checkbox"
                checked={config.shadow}
                onChange={(e) => update('shadow', e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500 outline-none"
              />
              <span className="text-sm text-white">Text Stroke/Shadow Drop</span>
            </label>
          </div>
        </section>

      </div>
    </div>
  );
}
