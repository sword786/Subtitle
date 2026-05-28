/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { VideoPlayer } from './components/VideoPlayer';
import { SidebarControls } from './components/SidebarControls';
import { SubtitleManager } from './components/SubtitleManager';
import { VideoExporter } from './components/VideoExporter';
import { ComputerInstaller } from './components/ComputerInstaller';
import { extractAudioToWav } from './utils/audioExtractor';
import { CaptionConfig, TimestampedWord } from './types';
import { Sparkles, Laptop } from 'lucide-react';

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [transcript, setTranscript] = useState<TimestampedWord[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);
  
  const [config, setConfig] = useState<CaptionConfig>({
    fontFamily: 'Inter',
    fontSize: 48,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    animationStyle: 'pop',
    position: 'center',
    textAlign: 'center',
    fontWeight: '900',
    shadow: true,
    uppercase: true,
    displayMode: 'text',
    rotate: 0,
    displayRange: 'phrase',
    positionX: 50,
    positionY: 80,
  });

  const [activeTab, setActiveTab] = useState<'preview' | 'style' | 'editor'>('preview');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isInstallerOpen, setIsInstallerOpen] = useState(false);

  const handleVideoSelect = (file: File) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setTranscript([]);
    setCurrentTime(0);
    setSeekToTime(null);
    setActiveTab('preview'); // Reset tab view on new upload
  };

  const handleTranscribe = async () => {
    if (!videoFile) return;
    setIsProcessing(true);
    setProcessingStatus('Initializing extraction...');
    
    try {
      let audioBlob: Blob;
      let uploadFileName = 'audio.wav';
      
      try {
        setProcessingStatus('Extracting Audio track...');
        audioBlob = await extractAudioToWav(videoFile, (msg) => {
          setProcessingStatus(msg);
        });
      } catch (audioErr) {
        console.warn('Browser offline audio extraction failed, using original video file instead', audioErr);
        audioBlob = videoFile;
        uploadFileName = videoFile.name;
      }

      setProcessingStatus('Uploading audio to AI Server...');
      const formData = new FormData();
      formData.append('video', audioBlob, uploadFileName);

      // Resolve endpoint URL
      // If we are in Capacitor (mobile), Electron (desktop), or file:// protocol, we fall back to the absolute PRODUCTION_API.
      // Otherwise, we leverage the relative '/api/transcribe' path (ideal for localhost, Vercel, and Cloud Run deployments).
      const isShellRuntime = typeof (window as any).Capacitor !== 'undefined' || 
                             navigator.userAgent.toLowerCase().includes('electron') || 
                             window.location.protocol === 'file:';
      
      const PRODUCTION_API = 'https://ais-pre-niaxytdciqzqhemoqa7deh-6307712061.asia-southeast1.run.app';
      
      let fetchUrl = '/api/transcribe';
      if (isShellRuntime) {
        fetchUrl = `${PRODUCTION_API}/api/transcribe`;
      }

      setProcessingStatus('Transcribing speech via Gemini...');
      const response = await fetch(fetchUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMsg = 'Transcription failed';
        try {
          const err = await response.json();
          errMsg = err.error || errMsg;
        } catch (_) {
          try {
            const txt = await response.text();
            // Fallback to error status or a short snippet of the HTML response
            errMsg = txt.slice(0, 150).trim() || `API error (${response.status})`;
          } catch (__) {
            errMsg = `API error with status ${response.status}`;
          }
        }
        throw new Error(errMsg);
      }

      setProcessingStatus('Decoding subtitles...');
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error("Server returned an invalid response (expected JSON, but got HTML or text instead). Please ensure your API is properly deployed and reachable.");
      }
      
      setTranscript(data.words);
      setActiveTab('editor'); // Automatically switch to Editor tab on mobile for instant editing!
    } catch (error: any) {
      console.error(error);
      alert('Error generating captions: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleSeek = (time: number) => {
    setSeekToTime(time);
    setTimeout(() => setSeekToTime(null), 50);
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setTranscript([]);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-white font-sans overflow-hidden">
      {/* High-end Header bar for both computer and mobile */}
      <header className="flex h-16 w-full items-center justify-between border-b border-white/5 bg-zinc-900/60 px-6 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Captify AI
            </h1>
            <span className="hidden sm:inline text-[10px] text-white/40 uppercase tracking-widest font-mono">Auto Captions Editor</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInstallerOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs py-2 px-3 border border-indigo-500/20 rounded-xl transition-all"
            title="Install app locally on computer"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-semibold">Install on Computer</span>
          </button>

          {videoUrl && (
            <button
              onClick={clearVideo}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs py-2 px-3.5 border border-white/10 rounded-xl transition-all"
            >
              ← Change Video
            </button>
          )}
        </div>
      </header>

      {/* Main layout contents */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        {videoUrl ? (
          <React.Fragment>
            {/* COMPUTER / TABLET LAYOUT: Shown side-by-side on md and larger */}
            <div className="hidden md:flex w-full h-full">
              {/* Left sidebar: style configurations */}
              <div className="w-80 border-r border-white/5 bg-zinc-900/50 flex-shrink-0">
                <SidebarControls 
                  config={config} 
                  onChange={setConfig} 
                  isProcessing={isProcessing}
                  processingStatus={processingStatus}
                  onTranscribe={handleTranscribe}
                  hasTranscript={transcript.length > 0}
                  transcript={transcript}
                  onOpenExport={() => setIsExportOpen(true)}
                />
              </div>

              {/* Center: Video playback stage */}
              <div className="flex-1 flex flex-col h-full bg-zinc-950">
                <VideoPlayer 
                  videoUrl={videoUrl} 
                  transcript={transcript} 
                  config={config} 
                  onChange={setConfig}
                  onTimeUpdate={setCurrentTime}
                  seekToTime={seekToTime}
                />
              </div>

              {/* Right panel: Subtitle / Word-by-word editor */}
              <div className="w-80 border-l border-white/10 bg-zinc-900/50 flex-shrink-0">
                {transcript.length > 0 ? (
                  <SubtitleManager
                    transcript={transcript}
                    onTranscriptChange={setTranscript}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-white/40 text-sm italic">
                    <div className="mb-3 p-4 bg-indigo-500/10 rounded-full text-indigo-400">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    Generate subtitles to edit words individually.
                  </div>
                )}
              </div>
            </div>

            {/* ANDROID / MOBILE PORTRAIT LAYOUT: Switch between tabs to keep UI beautiful & tidy */}
            <div className="flex md:hidden flex-col flex-1 h-full relative overflow-hidden">
              {/* Active Tab Screen */}
              <div className="flex-1 overflow-y-auto w-full h-full pb-4">
                {activeTab === 'preview' && (
                  <div className="flex flex-col h-full justify-between p-4">
                    <VideoPlayer 
                      videoUrl={videoUrl} 
                      transcript={transcript} 
                      config={config} 
                      onChange={setConfig}
                      onTimeUpdate={setCurrentTime}
                      seekToTime={seekToTime}
                    />
                    
                    {transcript.length === 0 && (
                      <div className="mt-4 p-5 bg-zinc-900/80 border border-white/5 rounded-2xl text-center">
                        <p className="text-sm text-white/70 mb-3">Your video is loaded. Generate high-quality word captions now!</p>
                        <button
                          onClick={handleTranscribe}
                          disabled={isProcessing}
                          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{processingStatus || 'Generating...'}</span>
                            </>
                          ) : 'Generate AI Subtitles'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'style' && (
                  <div className="h-full bg-zinc-900/40">
                    <SidebarControls 
                      config={config} 
                      onChange={setConfig} 
                      isProcessing={isProcessing}
                      processingStatus={processingStatus}
                      onTranscribe={handleTranscribe}
                      hasTranscript={transcript.length > 0}
                      transcript={transcript}
                      onOpenExport={() => setIsExportOpen(true)}
                    />
                  </div>
                )}

                {activeTab === 'editor' && (
                  <div className="h-full bg-zinc-900/40">
                    <SubtitleManager
                      transcript={transcript}
                      onTranscriptChange={setTranscript}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                    />
                  </div>
                )}
              </div>

              {/* Mobile Tab Swapper Navigation Rules */}
              <nav className="flex h-16 border-t border-white/5 bg-zinc-950/90 backdrop-blur-xl px-2 py-1 justify-around items-center z-20">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex flex-col items-center justify-center flex-1 py-1 px-3.5 rounded-xl transition-all ${
                    activeTab === 'preview' ? 'text-indigo-400 bg-white/5' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  <span className="text-lg">🎬</span>
                  <span className="text-[10px] font-medium leading-none mt-1">Playback</span>
                </button>

                <button
                  onClick={() => setActiveTab('style')}
                  className={`flex flex-col items-center justify-center flex-1 py-1 px-3.5 rounded-xl transition-all ${
                    activeTab === 'style' ? 'text-indigo-400 bg-white/5' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  <span className="text-lg">🎨</span>
                  <span className="text-[10px] font-medium leading-none mt-1">Styles</span>
                </button>

                <button
                  onClick={() => {
                    if (transcript.length > 0) {
                      setActiveTab('editor');
                    } else {
                      alert("Please generate subtitles first!");
                    }
                  }}
                  className={`flex flex-col items-center justify-center flex-1 py-1 px-3.5 rounded-xl transition-all ${
                    activeTab === 'editor' ? 'text-indigo-400 bg-white/5' : 'text-white/40 hover:text-white/80'
                  } ${transcript.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <span className="text-lg">✏️</span>
                  <span className="text-[10px] font-medium leading-none mt-1">Words</span>
                </button>
              </nav>
            </div>
          </React.Fragment>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-6">
            <VideoUploader onVideoSelect={handleVideoSelect} />
          </div>
        )}
      </div>

      {videoUrl && (
        <VideoExporter
          videoUrl={videoUrl}
          transcript={transcript}
          config={config}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      <ComputerInstaller
        isOpen={isInstallerOpen}
        onClose={() => setIsInstallerOpen(false)}
      />
    </div>
  );
}
