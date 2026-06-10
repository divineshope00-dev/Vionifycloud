import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Crown, Sparkles, Check, ArrowLeft, Bot } from 'lucide-react';
import { User, db } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function VideoIAPremium() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubscribe = (planId: 'basic' | 'pro' | 'unlimited', videos: number, prompts: number) => {
    // Prototype: Set the local quota directly
    const quota = {
      plan: planId,
      videosRemaining: videos,
      promptsRemaining: prompts
    };
    localStorage.setItem(`vionify_ai_quota_${user.id}`, JSON.stringify(quota));
    // Ideally we would route through Paddle checkout here
    alert(`Abonnement ${planId.toUpperCase()} activé avec succès dans le cadre de ce prototype !`);
    navigate('/app/video-ia');
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-6 md:p-8 overflow-y-auto">
      <button 
        onClick={() => navigate('/app/video-ia')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 self-start"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>{t('app.back')}</span>
      </button>

      <div className="max-w-5xl mx-auto w-full text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-6">
          <Crown className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          {t('videoiapremium.title')}
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto whitespace-pre-line">
          {t('videoiapremium.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full pb-12">
        
        {/* Tier 1 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">{t('videoiapremium.basic.title')}</h3>
            <p className="text-zinc-400 text-sm h-10">{t('videoiapremium.basic.desc')}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold">29.99€</span>
              <span className="text-zinc-500">{t('videoiapremium.month')}</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span><strong className="text-white">3</strong> {t('videoiapremium.basic.videos')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span><strong className="text-white">7</strong> {t('videoiapremium.basic.prompts')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span>{t('videoiapremium.basic.length')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span>{t('videoiapremium.basic.format')}</span>
            </li>
          </ul>

          <button
            onClick={() => handleSubscribe('basic', 3, 7)}
            className="w-full py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors"
          >
            {t('videoiapremium.basic.btn')}
          </button>
        </div>

        {/* Tier 2 */}
        <div className="bg-gradient-to-b from-amber-500/10 to-transparent border-2 border-amber-500/50 rounded-3xl p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-4 py-1.5 rounded-bl-xl">
            {t('premium.popular')}
          </div>
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2 text-amber-500">{t('videoiapremium.pro.title')}</h3>
            <p className="text-zinc-400 text-sm h-10">{t('videoiapremium.pro.desc')}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">59.99€</span>
              <span className="text-zinc-500">{t('videoiapremium.month')}</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
             <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-amber-500 shrink-0" />
              <span><strong className="text-white">5</strong> {t('videoiapremium.pro.videos')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-amber-500 shrink-0" />
              <span><strong className="text-white">12</strong> {t('videoiapremium.pro.prompts')}</span>
            </li>
             <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-amber-500 shrink-0" />
              <span>{t('videoiapremium.pro.length')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-amber-500 shrink-0" />
              <span>{t('videoiapremium.pro.format')}</span>
            </li>
          </ul>

          <button
            onClick={() => handleSubscribe('pro', 5, 12)}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold transition-all shadow-lg shadow-amber-500/20"
          >
            {t('videoiapremium.pro.btn')}
          </button>
        </div>

        {/* Tier 3 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">{t('videoiapremium.unlimited.title')}</h3>
            <p className="text-zinc-400 text-sm h-10">{t('videoiapremium.unlimited.desc')}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold">99.99€</span>
              <span className="text-zinc-500">{t('videoiapremium.month')}</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
             <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-purple-500 shrink-0" />
              <span><strong className="text-white">7</strong> {t('videoiapremium.unlimited.videos')}</span>
            </li>
             <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-purple-500 shrink-0" />
              <span><strong className="text-white">18</strong> {t('videoiapremium.unlimited.prompts')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-purple-500 shrink-0" />
              <span>{t('videoiapremium.unlimited.length')}</span>
            </li>
             <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-purple-500 shrink-0" />
              <span>{t('videoiapremium.unlimited.format')}</span>
            </li>
          </ul>

          <button
            onClick={() => handleSubscribe('unlimited', 7, 18)}
            className="w-full py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors"
          >
            {t('videoiapremium.unlimited.btn')}
          </button>
        </div>

      </div>
    </div>
  );
}
