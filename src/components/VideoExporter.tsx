import React, { useState, useRef, useEffect } from 'react';
import { TimestampedWord, CaptionConfig } from '../types';
import { Sparkles, X, Download, Play, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  videoUrl: string;
  transcript: TimestampedWord[];
  config: CaptionConfig;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoExporter({ videoUrl, transcript, config, isOpen, onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'rendering' | 'completed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderLoopRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (renderLoopRef.current) {
        cancelAnimationFrame(renderLoopRef.current);
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  if (!isOpen) return null;

  const startExport = async () => {
    const video = hiddenVideoRef.current;
    const canvas = hiddenCanvasRef.current;
    if (!video || !canvas) {
      setStatus('error');
      setErrorMsg('Failed to initialize local exporter engine.');
      return;
    }

    try {
      setExporting(true);
      setStatus('rendering');
      setProgress(0);
      chunksRef.current = [];

      // Make sure video is loaded and ready
      if (video.readyState < 2) {
        await new Promise((resolve) => {
          video.onloadeddata = resolve;
        });
      }

      // Configure high resolution canvas to match the actual video dimensions
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Canvas 2D context is not supported.');
      }

      // Reset video to start
      video.currentTime = 0;
      video.playbackRate = 1.0; // Play at normal speed so the MediaRecorder records steady frame rates
      video.muted = false; // We need audio track to be active

      // 1. Capture stream with Audio
      let capturedStream: MediaStream;
      if ((video as any).captureStream) {
        capturedStream = (video as any).captureStream();
      } else if ((video as any).mozCaptureStream) {
        capturedStream = (video as any).mozCaptureStream();
      } else {
        capturedStream = new MediaStream();
      }

      const canvasStream = canvas.captureStream(30); // 30 FPS stream
      const combinedStream = new MediaStream();

      // Add high-end canvas video track
      canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

      // Add original video audio tracks
      capturedStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));

      // 2. Setup recorder with a robust mimetype
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(
        combinedStream,
        selectedMime ? { mimeType: selectedMime } : undefined
      );
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: selectedMime || 'video/webm' });
        const finishedUrl = URL.createObjectURL(videoBlob);
        setDownloadUrl(finishedUrl);
        setStatus('completed');
        setExporting(false);
      };

      // Pre-group phrases for exporter
      const phrasesList: { words: TimestampedWord[]; start: number; end: number }[] = [];
      let tempPhrase: TimestampedWord[] = [];
      const MAX_WORDS = 5;
      const MAX_GAP = 0.8; // seconds

      for (const w of transcript) {
        if (tempPhrase.length === 0) {
          tempPhrase.push(w);
        } else {
          const last = tempPhrase[tempPhrase.length - 1];
          const gap = w.start - last.end;
          if (tempPhrase.length >= MAX_WORDS || gap > MAX_GAP) {
            phrasesList.push({
              words: tempPhrase,
              start: tempPhrase[0].start,
              end: last.end
            });
            tempPhrase = [w];
          } else {
            tempPhrase.push(w);
          }
        }
      }
      if (tempPhrase.length > 0) {
        phrasesList.push({
          words: tempPhrase,
          start: tempPhrase[0].start,
          end: tempPhrase[tempPhrase.length - 1].end
        });
      }

      // Start actual execution
      video.play();
      recorder.start();

      // 3. Render frame loop
      const renderFrame = () => {
        if (video.paused || video.ended) {
          if (video.ended) {
            recorder.stop();
          }
          return;
        }

        // Draw background video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Find active subtitles with high accuracy
        const currentTime = video.currentTime;
        let currentWords: TimestampedWord[] = [];

        if (config.displayRange === 'single') {
          // Find active word
          const active = transcript.find(w => currentTime >= w.start && currentTime <= w.end);
          if (active) {
            currentWords = [active];
          } else {
            // Sustain last spoken word for 0.4s to avoid flickering
            const pastWord = [...transcript]
              .reverse()
              .find(w => currentTime > w.end && currentTime - w.end <= 0.4);
            if (pastWord) {
              currentWords = [pastWord];
            }
          }
        } else {
          // Find active phrase
          const activePhrase = phrasesList.find(p => currentTime >= p.start && currentTime <= p.end);
          if (activePhrase) {
            currentWords = activePhrase.words;
          } else {
            // Sustain last spoken phrase for 0.4s
            const pastPhrase = [...phrasesList]
              .reverse()
              .find(p => currentTime > p.end && currentTime - p.end <= 0.4);
            if (pastPhrase) {
              currentWords = pastPhrase.words;
            }
          }
        }

        const activeWordIndex = currentWords.findIndex(
          (w) => currentTime >= w.start && currentTime <= w.end
        );

        if (currentWords.length > 0) {
          ctx.save();

          // Subtitle Position
          const targetX = (config.positionX / 100) * width;
          const targetY = (config.positionY / 100) * height;

          ctx.translate(targetX, targetY);
          if (config.rotate !== 0) {
            ctx.rotate((config.rotate * Math.PI) / 180);
          }

          // Scale Font Size relative to video resolution (based on 800px standard preview width)
          const multiplier = width / 850;
          const finalFontSize = Math.max(14, config.fontSize * multiplier);
          const weightPrefix = config.fontWeight === '900' ? '900' : '500';
          
          ctx.font = `${weightPrefix} ${finalFontSize}px ${config.fontFamily}, system-ui, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';

          const wordsTexts = currentWords.map((w) =>
            config.uppercase ? w.word.toUpperCase() : w.word
          );

          // Calculate layout boundaries
          const spaceWidth = ctx.measureText(' ').width;
          const wordWidths = wordsTexts.map((txt) => ctx.measureText(txt).width);
          const totalWidth = wordWidths.reduce((sum, w) => sum + w, 0) + (wordsTexts.length - 1) * spaceWidth;

          let startXOffset = -totalWidth / 2;

          // Render Backdrop/Pill Mode if configured
          if (config.displayMode === 'pill') {
            currentWords.forEach((wordObj, idx) => {
              const rectW = wordWidths[idx];
              const isActive = currentTime >= wordObj.start && currentTime <= wordObj.end;
              const textWord = wordsTexts[idx];

              const padX = finalFontSize * 0.4;
              const padY = finalFontSize * 0.15;

              if (isActive) {
                ctx.fillStyle = config.backgroundColor || '#4F46E5';
                
                // Draw rounded rect border
                ctx.beginPath();
                const rx = startXOffset - padX;
                const ry = -finalFontSize/2 - padY;
                const rw = rectW + padX * 2;
                const rh = finalFontSize + padY * 2;
                const rad = finalFontSize * 0.25;

                // Simple Canvas roundRect helper fallback
                if (ctx.roundRect) {
                  ctx.roundRect(rx, ry, rw, rh, rad);
                } else {
                  ctx.rect(rx, ry, rw, rh);
                }
                ctx.fill();
              } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                const rx = startXOffset - padX;
                const ry = -finalFontSize/2 - padY;
                const rw = rectW + padX * 2;
                const rh = finalFontSize + padY * 2;
                const rad = finalFontSize * 0.25;
                if (ctx.roundRect) {
                  ctx.roundRect(rx, ry, rw, rh, rad);
                } else {
                  ctx.rect(rx, ry, rw, rh);
                }
                ctx.fill();
              }

              // Text
              ctx.lineWidth = 0;
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(textWord, startXOffset + rectW / 2, 0);

              startXOffset += rectW + spaceWidth;
            });
          } else {
            // Text Mode
            currentWords.forEach((wordObj, idx) => {
              const rectW = wordWidths[idx];
              const isActive = currentTime >= wordObj.start && currentTime <= wordObj.end;
              const textWord = wordsTexts[idx];

              ctx.save();
              
              // Apply High-End shadow and stroke properties
              if (config.shadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
                ctx.shadowBlur = finalFontSize * 0.2;
                ctx.shadowOffsetX = finalFontSize * 0.05;
                ctx.shadowOffsetY = finalFontSize * 0.08;

                ctx.strokeStyle = isActive ? '#FFFFFF' : '#000000';
                ctx.lineWidth = Math.max(2, finalFontSize * 0.08);
                ctx.strokeText(textWord, startXOffset + rectW / 2, 0);
              }

              if (isActive) {
                ctx.fillStyle = config.backgroundColor && config.backgroundColor !== '#00000000' && config.backgroundColor !== 'transparent'
                  ? config.backgroundColor 
                  : '#FFFF00'; // Flashy karaoke default if no backdrop preset requested
              } else {
                ctx.fillStyle = config.color || '#FFFFFF';
              }

              ctx.fillText(textWord, startXOffset + rectW / 2, 0);
              ctx.restore();

              startXOffset += rectW + spaceWidth;
            });
          }

          ctx.restore();
        }

        // Update progress percentage
        if (video.duration) {
          const currentProgress = Math.min(99, Math.round((video.currentTime / video.duration) * 100));
          setProgress(currentProgress);
        }

        renderLoopRef.current = requestAnimationFrame(renderFrame);
      };

      video.onended = () => {
        setProgress(100);
        if (renderLoopRef.current) {
          cancelAnimationFrame(renderLoopRef.current);
        }
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      };

      // Start the render loop
      renderLoopRef.current = requestAnimationFrame(renderFrame);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Error occurred while encoding subtitle overlays.');
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `captioned_video_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-md font-bold text-white">Export Video</h2>
              <p className="text-[11px] text-zinc-400 leading-none">Bakes styles directly into video</p>
            </div>
          </div>
          {!exporting && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Box */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[220px]">
          {status === 'idle' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-3xl">
                🎬
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Ready to Export Caption Overlays</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  This compiles subtitles, styles, animations and positions directly into the video file inside your browser. No server uploading needed!
                </p>
              </div>
              <button
                onClick={startExport}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-xs px-5 py-2.5 rounded-xl transition-transform active:scale-95 shadow-lg shadow-indigo-600/25"
              >
                <Play className="w-4 h-4 fill-current" /> Start Encoding
              </button>
            </div>
          )}

          {status === 'rendering' && (
            <div className="w-full text-center space-y-5 py-4">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                {/* Circular path spinner */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-indigo-500 transition-all duration-300"
                    strokeDasharray={`${progress}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-sm font-black font-mono text-white">{progress}%</span>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-white animate-pulse">Baking styled subtitles into video frames...</h3>
                <p className="text-xs text-zinc-400 mt-1">Please keep this window open and wait. Playing at 1x speed to secure stable frame rate.</p>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-md font-bold text-white">Rendering Completed!</h3>
                <p className="text-xs text-zinc-400 mt-1">Your high-resolution captioned video has been compiled successfully.</p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-xs px-5 py-2.5 rounded-xl transition-transform active:scale-95 shadow-md"
                >
                  <Download className="w-4 h-4" /> Save Video File
                </button>
                <button
                  onClick={onClose}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Export Failed</h3>
                <p className="text-xs text-red-300 mt-1 max-w-sm leading-relaxed">{errorMsg}</p>
              </div>
              <div className="flex gap-2.5 justify-center pt-2">
                <button
                  onClick={startExport}
                  className="bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-xs px-4 py-2 rounded-xl transition-all"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs px-4 py-2 rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Elements required for background execution */}
        <div className="hidden">
          <video
            ref={hiddenVideoRef}
            src={videoUrl}
            preload="auto"
            crossOrigin="anonymous"
          />
          <canvas ref={hiddenCanvasRef} />
        </div>
      </div>
    </div>
  );
}
