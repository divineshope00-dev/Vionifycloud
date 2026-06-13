import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Bot, Crown, Image as ImageIcon, Loader2, Play, Download, PlusSquare, ArrowRight, Scissors } from 'lucide-react';
import { User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function VideoIA() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState('');

  // AI Quota logic (mocked for prototype locally)
  const [quota, setQuota] = useState(() => {
    const saved = localStorage.getItem(`vionify_ai_quota_${user.id}`);
    if (saved) return JSON.parse(saved);
    const newQuota = { plan: 'free', videosRemaining: 1, promptsRemaining: 3 };
    localStorage.setItem(`vionify_ai_quota_${user.id}`, JSON.stringify(newQuota));
    return newQuota;
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) {
      setError(t('videoia.error.image'));
      return;
    }
    if (!prompt) {
      setError(t('videoia.error.prompt'));
      return;
    }
    if (quota.promptsRemaining <= 0 || quota.videosRemaining <= 0) {
      setError(t('videoia.error.quota'));
      return;
    }

    setError('');
    setIsGenerating(true);
    setProgress(0);
    setGeneratedVideo(null);

    try {
      const res = await fetch('/api/generate-video-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, prompt })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to start generation');

      // Deduct prompt quota
      const updatedQuota = { ...quota, promptsRemaining: quota.promptsRemaining - 1 };
      setQuota(updatedQuota);
      localStorage.setItem(`vionify_ai_quota_${user.id}`, JSON.stringify(updatedQuota));

      const taskId = data.id;

      let polling = true;
      while (polling) {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await fetch(`/api/video-ia-status/${taskId}`);
        const statusData = await statusRes.json();
        
        if (statusData.progress) setProgress(statusData.progress * 100);

        if (statusData.status === 'SUCCEEDED') {
          polling = false;
          setGeneratedVideo(statusData.videoUrl);
          
          // Deduct video quota if it's the first successful generation of a flow (simplified here)
          const finalQuota = { ...updatedQuota, videosRemaining: updatedQuota.videosRemaining - 1 };
          setQuota(finalQuota);
          localStorage.setItem(`vionify_ai_quota_${user.id}`, JSON.stringify(finalQuota));
        } else if (statusData.status === 'FAILED') {
          polling = false;
          throw new Error(t('videoia.error.server'));
        }
      }
    } catch (err: any) {
      setError(err.message || t('videoia.error.unexpected'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;
    const a = document.createElement('a');
    a.href = generatedVideo;
    a.download = `videoia-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePublish = () => {
    if (!generatedVideo) return;
    // Pass video and image into the publish page
    navigate('/app/publish', { state: { importedVideoUrl: generatedVideo } });
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-6 md:p-8 relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 border border-purple-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('videoia.title')}</h1>
            <p className="text-sm text-zinc-400">{t('videoia.subtitle')}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/app/video-ia/premium')}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-500 px-4 py-2 rounded-xl hover:from-amber-500/30 hover:to-orange-500/30 transition-colors"
        >
          <Crown className="w-5 h-5" />
          <span className="font-semibold hidden sm:inline">{t('videoia.premium')}</span>
        </button>
      </div>

      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Input */}
        <div className="space-y-6">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-zinc-200">{t('videoia.step1')}</h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-purple-500/50 transition-colors cursor-pointer flex flex-col items-center justify-center relative overflow-hidden"
            >
              {image ? (
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-zinc-500 mb-2" />
                  <span className="text-sm text-zinc-400">{t('videoia.uploadHint')}</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImageSelect} 
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-2 text-zinc-200">{t('videoia.step2')}</h2>
            <p className="text-xs text-zinc-500 mb-4">{t('videoia.formatHint')}</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('videoia.promptPlaceholder') as string}
              className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none placeholder:text-zinc-600 text-white"
            />
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || quota.videosRemaining <= 0 || quota.promptsRemaining <= 0}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('videoia.generate.loading').replace('{{progress}}', Math.round(progress).toString())}
              </>
            ) : (quota.videosRemaining <= 0 || quota.promptsRemaining <= 0) ? (
              t('videoia.generate.required')
            ) : (
              t('videoia.generate.btn')
            )}
          </button>
          
          <div className="flex justify-between items-center text-xs text-zinc-500 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
            <span>{t('videoia.remaining.videos')} <strong className="text-zinc-300">{quota.videosRemaining}</strong></span>
            <span>{t('videoia.remaining.prompts')} <strong className="text-zinc-300">{quota.promptsRemaining}</strong></span>
          </div>


        </div>

        {/* Right Column: Result */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-zinc-200">{t('videoia.result.title')}</h2>
          
          <div className="flex-1 w-full aspect-video rounded-xl bg-black border border-zinc-800 flex items-center justify-center overflow-hidden relative">
            {generatedVideo ? (
              <video 
                src={generatedVideo} 
                className="w-full h-full object-cover"
                controls 
                autoPlay 
                loop 
              />
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <Bot className="w-12 h-12 text-purple-500/50" />
                <span className="text-purple-400/80 font-medium">{t('videoia.result.creating')}</span>
              </div>
            ) : (
              <div className="text-zinc-600 text-center px-6">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t('videoia.result.empty')}</p>
              </div>
            )}
          </div>

          {generatedVideo && (
            <>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button 
                  onClick={handleDownload}
                  className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {t('videoia.download')}
                </button>
                <button 
                  onClick={handlePublish}
                  className="py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                >
                  <PlusSquare className="w-5 h-5" />
                  {t('videoia.publish')}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
