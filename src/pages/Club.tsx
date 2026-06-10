import { useOutletContext, useNavigate } from 'react-router-dom';
import { Star, Gift, Shield, Zap, Crown } from 'lucide-react';
import { User } from '../services/supabaseService';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Club() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isFounder = user.subscriptionStatus === 'active' && user.type === 'particulier';

  if (!isFounder) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 text-center bg-black">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl"
        >
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Star className="w-10 h-10 text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">{t('club.access.title')}</h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            {t('club.access.desc')}
          </p>
          <button 
            onClick={() => navigate('/app/premium')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            {t('club.access.button')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)] max-w-5xl mx-auto pb-24">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-1.5 rounded-full text-sm font-bold mb-4 border border-orange-500/20">
          <Star className="w-4 h-4 fill-current" />
          {t('club.status.founder')}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
          {t('club.welcome').replace('{{name}}', user.name)}
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          {t('club.subtitle')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl hover:border-purple-500/50 transition-colors group">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">{t('club.feat.badge.title')}</h3>
          <p className="text-zinc-400">
            {t('club.feat.badge.desc')}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl hover:border-purple-500/50 transition-colors group">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">{t('club.feat.price.title')}</h3>
          <p className="text-zinc-400">
            {t('club.feat.price.desc')}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl hover:border-purple-500/50 transition-colors group">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Gift className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">{t('club.feat.privilege.title')}</h3>
          <p className="text-zinc-400">
            {t('club.feat.privilege.desc')}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl hover:border-purple-500/50 transition-colors group">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Star className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">{t('club.feat.innovation.title')}</h3>
          <p className="text-zinc-400">
            {t('club.feat.innovation.desc')}
          </p>
        </div>
      </div>

      <div className="mt-12 bg-purple-600/10 border border-purple-500/20 rounded-3xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">{t('club.footer.title')}</h2>
        <p className="text-purple-200">
          {t('club.footer.desc')}
        </p>
      </div>
    </div>
  );
}
