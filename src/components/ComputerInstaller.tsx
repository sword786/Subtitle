import React, { useState, useEffect } from 'react';
import { Laptop, Monitor, Download, X, HelpCircle, ArrowUpRight, Share, CheckCircle, Smartphone } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ComputerInstaller({ isOpen, onClose }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'chrome' | 'safari' | 'edge' | 'mobile'>('chrome');

  useEffect(() => {
    // Detect if app is already running under standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Platform detection for matching instructions
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      setActivePlatform('safari');
    } else if (userAgent.includes('edg/')) {
      setActivePlatform('edge');
    } else if (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
      setActivePlatform('mobile');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const triggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-md font-bold text-white">Install Captify AI on Computer</h2>
              <p className="text-[11px] text-zinc-400 leading-none">Instant launch from desktop & dock, raw performance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          
          {/* Quick Note about Iframe Preview sandbox */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-left">
            <span className="text-xl leading-none">⚠️</span>
            <div className="text-xs text-amber-200/95 leading-relaxed">
              <strong>Web Sandbox Note:</strong> Because this app is running in the AI Studio preview window, the browser blocks standard native click-to-install prompt triggers inside frames. To install successfully, click the <span className="underline font-bold">Open App in New Tab</span> button or open the Shared URL on any browser!
            </div>
          </div>

          {/* Installed Success Screen */}
          {isInstalled ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-md font-bold text-white">Captify AI is Already Installed!</h3>
                <p className="text-xs text-zinc-400 mt-1">Check your desktop or Applications folder to launch directly.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Native Prompt Trigger when available */}
              {deferredPrompt ? (
                <div className="bg-zinc-800/50 p-5 rounded-2xl border border-white/5 flex flex-col items-center text-center space-y-3">
                  <Monitor className="w-10 h-10 text-indigo-400" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Native App Launch Engine Detected</h3>
                    <p className="text-xs text-zinc-400">One-click immediate desktop installation setup is fully optimized.</p>
                  </div>
                  <button
                    onClick={triggerNativeInstall}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs px-6 py-2.5 rounded-xl transition-transform active:scale-95 shadow-md shadow-indigo-600/25"
                  >
                    <Download className="w-4 h-4" /> Install Directly on Computer
                  </button>
                </div>
              ) : (
                /* Guided instructions selector tabs */
                <div className="space-y-4">
                  <div className="flex border-b border-white/5 text-xs">
                    {[
                      { id: 'chrome', label: 'Google Chrome', icon: '🌐' },
                      { id: 'edge', label: 'Microsoft Edge', icon: '🧭' },
                      { id: 'safari', label: 'Apple Safari', icon: '🍎' },
                      { id: 'mobile', label: 'Phone/Mobile', icon: '📱' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActivePlatform(tab.id as any)}
                        className={`flex-1 pb-3 text-center transition-all border-b-2 font-medium ${
                          activePlatform === tab.id
                            ? 'border-indigo-500 text-white font-bold'
                            : 'border-transparent text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="mr-1.5">{tab.icon}</span> {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Guides body */}
                  <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 border border-white/5 rounded-2xl p-5 space-y-4 text-left">
                    {activePlatform === 'chrome' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> Chrome Computer Guidelines:
                        </h4>
                        <ol className="list-decimal pl-4 space-y-2 text-zinc-400">
                          <li>Click the <strong className="text-white">Open in New Tab</strong> icon on the top right.</li>
                          <li>On the top right of Chrome's URL search bar, look for the official <strong className="text-white">Install App (PWA) button</strong> (represented as a 3-monitor monitor/down-arrow icon 📥).</li>
                          <li>Click <strong className="text-white">Install</strong> when prompted.</li>
                          <li>It instantly adds a dedicated launcher shortcut to your desktop, startup bar, and applications list!</li>
                        </ol>
                      </div>
                    )}

                    {activePlatform === 'edge' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> Edge Browser Guidelines:
                        </h4>
                        <ol className="list-decimal pl-4 space-y-2 text-zinc-400">
                          <li>Open the web app in a dedicated tab outside this preview.</li>
                          <li>Look at the top URL bar. Click the <strong className="text-white">App Available icon</strong> (a squares icon ⊞ with a '+' mark).</li>
                          <li>Alternatively, go to <strong className="text-white">Settings (...) &gt; Apps &gt; Install Captify AI</strong>.</li>
                          <li>Pin it to your status taskbar or launchpad for raw startup speed.</li>
                        </ol>
                      </div>
                    )}

                    {activePlatform === 'safari' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> Safari (Mac Desktop) Guidelines:
                        </h4>
                        <ol className="list-decimal pl-4 space-y-2 text-zinc-400">
                          <li>Ensure you are viewing on macOS Sonoma or later inside Safari.</li>
                          <li>Click the <strong className="text-white">File</strong> menu on Safari's header menu bar.</li>
                          <li>Select <strong className="text-white">Add to Dock...</strong>.</li>
                          <li>Choose a sleek name and click Add. It acts exactly like a native Mac Application with fully integrated keyboard shortcuts and dedicated process resources!</li>
                        </ol>
                      </div>
                    )}

                    {activePlatform === 'mobile' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-emerald-400" /> iOS & Android Guidelines:
                        </h4>
                        <ol className="list-decimal pl-4 space-y-2 text-zinc-400">
                          <li><span className="text-white font-semibold">For iOS (iPhone/iPad):</span> Open in Safari &gt; Tap the <strong className="text-white">Share</strong> icon (sheet with up-arrow) &gt; Choose <strong className="text-white">Add to Home Screen</strong>.</li>
                          <li><span className="text-white font-semibold">For Android:</span> Open in Chrome &gt; Tap the <strong className="text-white">Three Dots (...)</strong> menu on the top right &gt; Select <strong className="text-white">Add to Home Screen</strong> or Install App.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Features Highlight of Desktop Launch */}
          <div className="border-t border-white/5 pt-5 space-y-3 text-left">
            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Why Install as Desktop App?</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { title: '⚡ Fast Processing Speed', desc: 'Direct secure memory channels with the hardware acceleration system.' },
                { title: '📁 Drag and Drop Anywhere', desc: 'Seamlessly drag video files direct to app frame from folder explorer.' },
                { title: '🔒 Local Rendering Security', desc: 'Saves your exported subtitle clips locally at high fidelity.' },
                { title: '🚫 Zero Browser Clutter', desc: 'Hides tabs, navigation, location controls to focus entirely on editing.' },
              ].map((f, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">✓</div>
                  <div>
                    <h5 className="text-[12px] font-semibold text-white/95">{f.title}</h5>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/5 bg-zinc-950/60 backdrop-blur-md flex justify-between items-center">
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
          >
            Open App in New Tab <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs px-5 py-2 rounded-xl transition-transform active:scale-95 shadow-md"
          >
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
}
