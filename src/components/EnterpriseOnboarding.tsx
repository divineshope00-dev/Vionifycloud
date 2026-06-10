import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, ShoppingBag, Rocket, CheckCircle2, ArrowRight } from 'lucide-react';
import { db, User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';

interface EnterpriseOnboardingProps {
  user: User;
  onComplete: () => void;
}

export default function EnterpriseOnboarding({ user, onComplete }: EnterpriseOnboardingProps) {
  const [step, setStep] = useState(1);
  const { t } = useLanguage();

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else {
      try {
        await db.updateUser({ onboardingCompleted: true });
        // Backup in localStorage in case DB update has issues with schema
        localStorage.setItem(`vionify_onboarding_${user.id}`, 'completed');
        onComplete();
      } catch (error) {
        console.error('Error completing onboarding:', error);
        localStorage.setItem(`vionify_onboarding_${user.id}`, 'completed');
        onComplete();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]" />

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-12 text-center relative z-10"
          >
            <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Rocket className="w-10 h-10 text-purple-500" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('onboarding.welcome.title')}
            </h1>
            
            <p className="text-lg text-zinc-300 mb-10 leading-relaxed">
              {t('onboarding.welcome.desc')}
              <span className="block mt-4 font-semibold text-purple-400">
                {t('onboarding.welcome.highlight')}
              </span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
              <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <Video className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300">{t('onboarding.welcome.feat1')}</p>
              </div>
              <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <ShoppingBag className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300">{t('onboarding.welcome.feat2')}</p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group"
            >
              {t('onboarding.next')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-2xl w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-12 text-center relative z-10"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('onboarding.trial.title')}
            </h2>
            
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-8 mb-10">
              <p className="text-2xl md:text-3xl font-bold text-white mb-4">
                {t('onboarding.trial.message')}
              </p>
              <p className="text-zinc-400">
                {t('onboarding.trial.desc')}
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group"
            >
              {t('onboarding.access')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
