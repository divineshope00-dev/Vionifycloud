import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, MoreVertical, MonitorDown, Smartphone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type DeviceType = 'ios' | 'android' | 'desktop' | null;

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    // Check if already installed or dismissed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const hasDismissed = localStorage.getItem('vionify_install_dismissed');

    if (isStandalone || hasDismissed) {
      return;
    }

    // Detect device
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      setDeviceType('ios');
    } else if (isAndroid) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // Show prompt after a short delay so it doesn't interrupt immediate loading
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    // Listen for native install prompt (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('vionify_install_dismissed', 'true');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isVisible || !deviceType) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-96 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="bg-zinc-900 border border-purple-500/30 shadow-2xl shadow-purple-500/10 rounded-2xl p-5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-1.5 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0 border border-purple-500/30">
            <Smartphone className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight mb-1">
              {t('install.title')}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('install.desc')}
            </p>
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50">
          {deviceType === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0">
                  <Share className="w-4 h-4 text-blue-400" />
                </div>
                <span>1. {t('install.ios.step1')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0">
                  <PlusSquare className="w-4 h-4 text-zinc-200" />
                </div>
                <span>2. {t('install.ios.step2')}</span>
              </div>
            </div>
          )}

          {deviceType === 'android' && !deferredPrompt && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0">
                  <MoreVertical className="w-4 h-4 text-zinc-200" />
                </div>
                <span>1. {t('install.android.step1')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0">
                  <PlusSquare className="w-4 h-4 text-zinc-200" />
                </div>
                <span>2. {t('install.android.step2')}</span>
              </div>
            </div>
          )}

          {deviceType === 'desktop' && !deferredPrompt && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0">
                  <MonitorDown className="w-4 h-4 text-zinc-200" />
                </div>
                <span>1. {t('install.desktop.step1')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0">
                  <PlusSquare className="w-4 h-4 text-zinc-200" />
                </div>
                <span>2. {t('install.desktop.step2')}</span>
              </div>
            </div>
          )}

          {deferredPrompt && (
            <button 
              onClick={handleInstall}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <MonitorDown className="w-4 h-4" />
              {t('install.button')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
