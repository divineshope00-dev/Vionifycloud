import React from 'react';
import { ArrowLeft, Video, PenTool, BarChart2, Briefcase, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function NoticeEntreprise() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="h-[100dvh] overflow-y-auto bg-black text-white relative scroll-smooth pb-16">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">{t('noticeEnt.title')}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 pb-32">
        <div className="mb-8">
          <p className="text-zinc-400 text-lg leading-relaxed">
            {t('noticeEnt.intro')}
          </p>
        </div>

        {/* Section: Accueil & Visionnage */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] -mt-10 -mr-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 fill-current" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('noticeEnt.home.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('noticeEnt.home.desc')}</p>
            <ul className="list-disc pl-5 space-y-3 marker:text-purple-500">
              <li><strong>{t('noticeEnt.home.inspire').split(':')[0]} :</strong>{t('noticeEnt.home.inspire').split(':')[1]}</li>
              <li><strong>{t('noticeEnt.home.analysis').split(':')[0]} :</strong>{t('noticeEnt.home.analysis').split(':')[1]}</li>
            </ul>
          </div>
        </section>

        {/* Section: Publication & Produits */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] -mt-10 -mr-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('noticeEnt.publish.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('noticeEnt.publish.desc')}</p>
            <ul className="list-disc pl-5 space-y-3 marker:text-amber-500">
              <li><strong>{t('noticeEnt.publish.video').split(':')[0]} :</strong>{t('noticeEnt.publish.video').split(':')[1]}</li>
              <li><strong>{t('noticeEnt.publish.ai').split(':')[0]} :</strong>{t('noticeEnt.publish.ai').split(':').slice(1).join(':')}</li>
              <li><strong>{t('noticeEnt.publish.products').split(':')[0]} :</strong>{t('noticeEnt.publish.products').split(':').slice(1).join(':')}</li>
            </ul>
          </div>
        </section>

        {/* Section: Studio/Tableau de Bord */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/10 blur-[50px] -mt-10 -ml-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('noticeEnt.studio.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('noticeEnt.studio.desc')}</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-green-500">
              <li><strong>{t('noticeEnt.studio.manage').split(':')[0]} :</strong>{t('noticeEnt.studio.manage').split(':')[1]}</li>
              <li><strong>{t('noticeEnt.studio.stats').split(':')[0]} :</strong>{t('noticeEnt.studio.stats').split(':')[1]}</li>
            </ul>
          </div>
        </section>

        {/* Section: Statistiques */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] -mb-10 -mr-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('noticeEnt.stats.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('noticeEnt.stats.desc')}</p>
            <ul className="list-disc pl-5 space-y-3 marker:text-blue-500">
              <li><strong>{t('noticeEnt.stats.detail').split(':')[0]} :</strong>{t('noticeEnt.stats.detail').split(':')[1]}</li>
              <li><strong>{t('noticeEnt.stats.products').split(':')[0]} :</strong>{t('noticeEnt.stats.products').split(':')[1]}</li>
              <li><strong>{t('noticeEnt.stats.leads').split(':')[0]} :</strong>{t('noticeEnt.stats.leads').split(':')[1]}</li>
            </ul>
          </div>
        </section>
        
        {/* Footer info */}
        <div className="text-center py-6 text-zinc-500 text-sm">
          <p>{t('noticeEnt.footer')}</p>
        </div>

      </div>
    </div>
  );
}
