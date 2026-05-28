import React, { useRef, useState, useEffect } from 'react';
import { TimestampedWord, CaptionConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Rewind, Expand } from 'lucide-react';

interface Props {
  videoUrl: string;
  transcript: TimestampedWord[];
  config: CaptionConfig;
  onChange: (config: CaptionConfig) => void;
  onTimeUpdate: (time: number) => void;
  seekToTime: number | null;
}

export function VideoPlayer({ videoUrl, transcript, config, onChange, onTimeUpdate, seekToTime }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null);

  useEffect(() => {
    setAnalyzedUrl(null);
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate(video.currentTime);
    };
    video.addEventListener('timeupdate', updateTime);
    return () => video.removeEventListener('timeupdate', updateTime);
  }, [onTimeUpdate]);

  useEffect(() => {
    if (seekToTime !== null && videoRef.current) {
      videoRef.current.currentTime = seekToTime;
    }
  }, [seekToTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 1. Group words into phrases for the phrase mode
  const phrases = React.useMemo(() => {
    if (!transcript || transcript.length === 0) return [];
    const result: { words: TimestampedWord[]; start: number; end: number }[] = [];
    let current: TimestampedWord[] = [];
    const MAX_WORDS = 5;
    const MAX_GAP = 0.8; // seconds

    for (const w of transcript) {
      if (current.length === 0) {
        current.push(w);
      } else {
        const last = current[current.length - 1];
        const gap = w.start - last.end;
        if (current.length >= MAX_WORDS || gap > MAX_GAP) {
          result.push({
            words: current,
            start: current[0].start,
            end: last.end
          });
          current = [w];
        } else {
          current.push(w);
        }
      }
    }
    if (current.length > 0) {
      result.push({
        words: current,
        start: current[0].start,
        end: current[current.length - 1].end
      });
    }
    return result;
  }, [transcript]);

  // 2. Select current words to show based on standard current time
  const currentWords = React.useMemo(() => {
    if (!transcript || transcript.length === 0) return [];

    if (config.displayRange === 'single') {
      // Find active word
      const active = transcript.find(w => currentTime >= w.start && currentTime <= w.end);
      if (active) return [active];

      // Sustain last spoken word for 0.4s to prevent jumpy flickering during gaps
      const pastWord = [...transcript]
        .reverse()
        .find(w => currentTime > w.end && currentTime - w.end <= 0.4);
      if (pastWord) return [pastWord];

      return [];
    } else {
      // Find active phrase
      const activePhrase = phrases.find(p => currentTime >= p.start && currentTime <= p.end);
      if (activePhrase) return activePhrase.words;

      // Sustain last spoken phrase for 0.4s as well
      const pastPhrase = [...phrases]
        .reverse()
        .find(p => currentTime > p.end && currentTime - p.end <= 0.4);
      if (pastPhrase) return pastPhrase.words;

      return [];
    }
  }, [transcript, phrases, currentTime, config.displayRange]);

  const activeWordIndex = currentWords.findIndex(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  const getPositionClasses = () => {
    switch (config.position) {
      case 'top': return 'top-10 items-center';
      case 'center': return 'top-1/2 -translate-y-1/2 items-center';
      case 'bottom': return 'bottom-20 items-center';
    }
  };

  const toggleFullScreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-8 bg-zinc-950 overflow-hidden w-full h-full">
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl aspect-[16/9] bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20 flex-shrink-0 group"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (!w || !h || analyzedUrl === videoUrl) return;
            
            setAnalyzedUrl(videoUrl);
            const isVertical = w < h;
            
            // Auto analyze video dimension to pick the best caption placement "sweet spot"
            // For standard horizontal content, 36px font & 80% vertical position is best.
            // For vertical shorts, 46px font & 70% vertical position is highly optimal.
            const calculatedFontSize = isVertical ? 46 : 36;
            const calculatedPosY = isVertical ? 70 : 80;
            
            onChange({
              ...config,
              fontSize: calculatedFontSize,
              positionY: calculatedPosY,
              positionX: 50,
            });
          }}
        />
        
        {/* Caption Overlay */}
        {hasCaptionsToRender(currentWords, activeWordIndex) && (
          <div 
            style={{
              position: 'absolute',
              left: `${config.positionX}%`,
              top: `${config.positionY}%`,
              transform: `translate(-50%, -50%) rotate(${config.rotate || 0}deg)`,
            }}
            className="absolute z-20 pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 active:border-indigo-500/40 active:bg-indigo-500/5 transition-[background-color,border-color] duration-150 group/caption"
            onPointerDown={(e) => {
              e.preventDefault();
              const el = e.currentTarget;
              const parent = containerRef.current;
              if (!parent) return;

              const parentRect = parent.getBoundingClientRect();
              const startX = e.clientX;
              const startY = e.clientY;
              const startPX = config.positionX ?? 50;
              const startPY = config.positionY ?? 80;
              
              try {
                el.setPointerCapture(e.pointerId);
              } catch (err) {}

              const handlePointerMove = (moveEvent: PointerEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                
                let posX = Math.round(startPX + (deltaX / parentRect.width) * 100);
                let posY = Math.round(startPY + (deltaY / parentRect.height) * 100);
                
                posX = Math.max(0, Math.min(100, posX));
                posY = Math.max(0, Math.min(100, posY));
                
                onChange({
                  ...config,
                  positionX: posX,
                  positionY: posY
                });
              };

              const handlePointerUp = (upEvent: PointerEvent) => {
                try {
                  el.releasePointerCapture(upEvent.pointerId);
                } catch (err) {}
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
              };

              window.addEventListener('pointermove', handlePointerMove);
              window.addEventListener('pointerup', handlePointerUp);
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md rounded-md px-2 py-0.5 text-[9px] text-white/60 opacity-0 group-hover/caption:opacity-100 group-active/caption:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-white/5 font-mono shadow-md">
              Drag to position ({config.positionX}%, {config.positionY}%)
            </div>
            
            <AnimatePresence mode="popLayout">
               <motion.div 
                 key={currentWords.map(w => w.word).join('-')}
                 className="flex flex-wrap justify-center gap-x-2 gap-y-1"
               >
                 {currentWords.map((word, idx) => {
                   const isActive = currentTime >= word.start && currentTime <= word.end;
                   const isPast = currentTime > word.end;
                   
                   return (
                     <WordRenderer 
                       key={idx}
                       word={word.word}
                       isActive={isActive}
                       isPast={isPast}
                       config={config}
                     />
                   );
                 })}
               </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Video Controls overlay on Hover */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-4">
          <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left;
                 const percent = x / rect.width;
                 if (videoRef.current) {
                   videoRef.current.currentTime = percent * videoRef.current.duration;
                 }
               }}
          >
            <div 
              className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full" 
              style={{ width: `${(currentTime / (videoRef.current?.duration || 1)) * 100}%` }}
            />
          </div>
          
          <button onClick={toggleFullScreen} className="text-white hover:text-blue-400 transition-colors">
            <Expand className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function hasCaptionsToRender(words: TimestampedWord[], activeIndex: number) {
  return words.length > 0;
}

interface WordRendererProps {
  key?: React.Key;
  word: string;
  isActive: boolean;
  isPast: boolean;
  config: CaptionConfig;
}

function WordRenderer({ word, isActive, isPast, config }: WordRendererProps) {
  let animateProps = {};
  let initialProps = {};
  
  if (config.animationStyle === 'pop') {
    initialProps = { scale: 0.8, opacity: 0 };
    animateProps = { scale: isActive ? 1.2 : 1, opacity: 1, y: isActive ? -5 : 0 };
  } else if (config.animationStyle === 'bounce') {
    initialProps = { y: 20, opacity: 0 };
    animateProps = { y: isActive ? -15 : 0, opacity: 1 };
  } else if (config.animationStyle === 'fade') {
    initialProps = { opacity: 0 };
    animateProps = { opacity: 1 };
  } else {
    // highlight or none
    initialProps = { opacity: 1 };
    animateProps = { scale: isActive && config.animationStyle === 'highlight' ? 1.1 : 1 };
  }

  const isPill = config.displayMode === 'pill';
  const isSolidBg = config.backgroundColor && config.backgroundColor !== '#00000000' && config.backgroundColor !== 'transparent';
  
  let textColor = config.color || '#ffffff';
  let backdropColor = 'transparent';

  if (isPill) {
    if (isActive) {
      // In pill mode, the active word gets the solid background color
      backdropColor = isSolidBg ? config.backgroundColor : '#4F46E5';
      
      const configColorLower = (config.color || '#ffffff').toLowerCase();
      // If text color configuration is default or plain white/black, we automatically choose the most readable contrast color
      if (configColorLower === '#ffffff' || configColorLower === '#fff' || configColorLower === '#000000' || configColorLower === '#000') {
        const bgLower = backdropColor.toLowerCase();
        const isBgWhiteOrLight = bgLower === '#ffffff' || bgLower === '#ffff00' || bgLower === '#00ffff' || bgLower === '#39ff14';
        textColor = isBgWhiteOrLight ? '#000000' : '#ffffff';
      } else {
        // Otherwise, prioritize the user's custom chosen text color
        textColor = config.color;
      }
    } else {
      // Inactive word in pill mode: dark semi-transparent backdrop
      backdropColor = 'rgba(0,0,0,0.5)';
      textColor = config.color || '#ffffff';
    }
  } else {
    // Text mode (no backdrop pill box)
    if (isActive) {
      // The active word gets a bright high-contrast color that stands out
      // Either a custom chosen color (config.backgroundColor if provided, solid and NOT black/dark gray),
      // or we auto-select a unique color distinct from the base text color (config.color)
      const isBgBlackOrDark = config.backgroundColor && (config.backgroundColor.toLowerCase() === '#000000' || config.backgroundColor.toLowerCase() === '#1a1a1a');
      if (isSolidBg && !isBgBlackOrDark) {
        textColor = config.backgroundColor;
      } else {
        // Automatically determine a brilliant contrasting accent based on current base color
        const baseLower = (config.color || '#ffffff').toLowerCase();
        if (baseLower === '#ffffff' || baseLower === '#fff') {
          textColor = '#FFFF00'; // Yellow
        } else if (baseLower === '#ffff00') {
          textColor = '#00FFFF'; // Cyan
        } else if (baseLower === '#00ffff') {
          textColor = '#FF3366'; // Pink
        } else {
          textColor = '#FFFF00'; // Default highlight
        }
      }
    } else {
      // Inactive text has the custom base text color
      textColor = config.color || '#ffffff';
    }
  }

  const baseStyle: React.CSSProperties = {
    fontFamily: config.fontFamily,
    fontSize: `${config.fontSize}px`,
    fontWeight: config.fontWeight,
    color: textColor,
    backgroundColor: backdropColor,
    padding: isPill ? '0.15em 0.4em' : '0',
    borderRadius: isPill ? '0.35em' : '0',
    textTransform: config.uppercase ? 'uppercase' as const : 'none' as const,
    WebkitTextStroke: (!isPill && config.shadow) ? `2.5px #000000` : 'none',
    filter: config.shadow ? 'drop-shadow(2px 4px 6px rgba(0,0,0,0.8))' : 'none',
    transition: 'color 0.15s, font-size 0.15s, background-color 0.15s, opacity 0.15s',
  };

  return (
    <motion.span
      initial={initialProps}
      animate={animateProps}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={baseStyle}
      className={`inline-block mx-1 ${isActive ? 'z-10' : 'z-0'} ${
        !isActive ? 'opacity-70' : 'opacity-100 font-bold'
      } ${isPast && config.animationStyle === 'highlight' && !isPill ? 'opacity-40' : ''}`}
    >
      {word}
    </motion.span>
  );
}
