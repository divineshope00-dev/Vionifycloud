import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { canAccessContent } from '../utils/subscription';
import PremiumIcon from './PremiumIcon';

interface SubscriptionGuardProps {
  user: User;
  children: React.ReactNode;
}

export default function SubscriptionGuard({ user, children }: SubscriptionGuardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Determine if Video IA sub is active
  const aiQuotaItem = localStorage.getItem(`vionify_ai_quota_${user.id}`);
  const aiQuota = aiQuotaItem ? JSON.parse(aiQuotaItem) : null;
  const hasAiSub = aiQuota && aiQuota.plan && aiQuota.plan !== 'free';

  if (canAccessContent(user) || hasAiSub) {
    return <>{children}</>;
  }

  return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-full md:max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 z-[70] shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mt-2">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">
              {t('subscription.guard.title')}
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed text-sm">
              {t('subscription.guard.desc')}
            </p>
            <button
              onClick={() => navigate('/app/premium')}
              className="w-full bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-600/20 hover:shadow-purple-600/40 hover:-translate-y-1 active:scale-95 group"
            >
              <PremiumIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="text-base">{t('subscription.guard.button')}</span>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
  );
}
