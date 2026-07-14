import React from 'react';
import { ArrowLeft, Play, Link as LinkIcon, Download, Info, Star, Search, CreditCard, ChevronRight, Compass, ShoppingBag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Notice() {
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
          <h1 className="text-xl font-bold">{t('notice.title')}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 pb-32">
        <div className="mb-8">
          <p className="text-zinc-400 text-lg leading-relaxed">
            {t('notice.intro')}
          </p>
        </div>

        {/* Section: Accueil & Visionnage */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] -mt-10 -mr-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('notice.home.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('notice.home.desc')}</p>
            <ul className="list-disc pl-5 space-y-3 marker:text-purple-500">
              <li><strong>{t('notice.home.discover').split(':')[0]} :</strong>{t('notice.home.discover').split(':')[1]}</li>
              <li><strong>{t('notice.home.interactions').split(':')[0]} :</strong>{t('notice.home.interactions').split(':')[1]}</li>
              <li><strong>{t('notice.home.products').split(':')[0]} :</strong>{t('notice.home.products').split(':')[1]}</li>
            </ul>
          </div>
        </section>

        {/* Section: Achat et Liens de Produits */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] -mt-10 -mr-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <LinkIcon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('notice.shopping.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('notice.shopping.desc')}</p>
            <ol className="list-decimal pl-5 space-y-3 marker:text-amber-500">
              <li>{t('notice.shopping.step1')}</li>
              <li>{t('notice.shopping.step2')}</li>
              <li>{t('notice.shopping.step3')}</li>
              <li>{t('notice.shopping.step4')}</li>
            </ol>
          </div>
        </section>

        {/* Section: Recherche & Categories */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/10 blur-[50px] -mt-10 -ml-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('notice.search.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('notice.search.desc')}</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-green-500">
              <li><strong>{t('notice.search.bar').split(':')[0]} :</strong>{t('notice.search.bar').split(':')[1]}</li>
              <li><strong>{t('notice.search.categories').split(':')[0]} :</strong>{t('notice.search.categories').split(':')[1]}</li>
            </ul>
          </div>
        </section>

        {/* Section: Shopping */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 blur-[50px] -mb-10 -ml-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-500 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('notice.shop.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('notice.shop.desc')}</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-pink-500">
              <li><strong>{t('notice.shop.brands').split(':')[0]} :</strong>{t('notice.shop.brands').split(':')[1]}</li>
              <li><strong>{t('notice.shop.discover').split(':')[0]} :</strong>{t('notice.shop.discover').split(':')[1]}</li>
            </ul>
          </div>
        </section>

        {/* Section: Club & Premium */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[50px] -mt-10 -mr-10 rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('notice.club.title')}</h2>
          </div>
          
          <div className="space-y-4 text-zinc-300">
            <p>{t('notice.club.desc')}</p>
            <ul className="list-disc pl-5 space-y-3 marker:text-yellow-500">
              <li><strong>{t('notice.club.discounts').split(':')[0]} :</strong>{t('notice.club.discounts').split(':')[1]}</li>
              <li><strong>{t('notice.club.products').split(':')[0]} :</strong>{t('notice.club.products').split(':')[1]}</li>
              <li><strong>{t('notice.club.badge').split(':')[0]} :</strong>{t('notice.club.badge').split(':')[1]}</li>
              <li><strong>{t('notice.club.connect').split(':')[0]} :</strong>{t('notice.club.connect').split(':')[1]}</li>
              <li><strong>{t('notice.club.4k').split(':')[0]} :</strong>{t('notice.club.4k').split(':')[1]}</li>
            </ul>
          </div>
        </section>
        
        {/* Footer info */}
        <div className="text-center py-6 text-zinc-500 text-sm">
          <p>{t('notice.footer')}</p>
        </div>

      </div>
    </div>
  );
}
