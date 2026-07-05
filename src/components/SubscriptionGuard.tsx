import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, db } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { canAccessContent } from '../utils/subscription';
import PremiumIcon from './PremiumIcon';

interface SubscriptionGuardProps {
  user: User;
  children: React.ReactNode;
}

export default function SubscriptionGuard({ user, children }: SubscriptionGuardProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  // Determine if Video IA sub is active
  const aiQuotaItem = localStorage.getItem(`vionify_ai_quota_${user.id}`);
  const aiQuota = aiQuotaItem ? JSON.parse(aiQuotaItem) : null;
  const hasAiSub = aiQuota && aiQuota.plan && aiQuota.plan !== 'free';

  if (canAccessContent(user) || hasAiSub) {
    return <>{children}</>;
  }

  const handleManualCheck = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setCheckStatus('idle');

    try {
      const freshUser = await db.getUser(user.id);
      if (freshUser) {
        if (canAccessContent(freshUser)) {
          localStorage.setItem('vionify_user', JSON.stringify(freshUser));
          setCheckStatus('success');
          // Dispatch event to notify layout & route guards
          window.dispatchEvent(new Event('user-changed'));
          return;
        }
      }
      // Wait a moment for UX feeling of loading state
      await new Promise(resolve => setTimeout(resolve, 1200));
      setCheckStatus('failed');
    } catch (error) {
      console.error('Error verifying activation:', error);
      setCheckStatus('failed');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSimulateActivation = async (isAnnualVal: boolean) => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const response = await fetch('/api/simulate-activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planId: 'unlimited',
          isAnnual: isAnnualVal
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error status during simulation');
      }

      const resData = await response.json();
      if (resData.success) {
        // Fetch fresh user profile from DB to ensure local state is 100% in sync
        const freshUser = await db.getUser(user.id);
        if (freshUser) {
          localStorage.setItem('vionify_user', JSON.stringify(freshUser));
          setCheckStatus('success');
          // Dispatch event to notify layout & route guards
          window.dispatchEvent(new Event('user-changed'));
          return;
        }
      }
      throw new Error('Simulation failed or database was not updated');
    } catch (e) {
      console.error('Failed to simulate activation:', e);
      setCheckStatus('failed');
    } finally {
      setIsChecking(false);
    }
  };

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

            {/* Manual Check Button */}
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className={`w-full mt-3 py-3 rounded-2xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                isChecking 
                  ? 'border-zinc-800 bg-zinc-800/20 text-zinc-500 cursor-not-allowed' 
                  : checkStatus === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900/50 text-zinc-400 hover:text-white active:scale-98'
              }`}
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{language === 'fr' ? 'Vérification en cours...' : 'Verifying...'}</span>
                </>
              ) : checkStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'fr' ? 'Abonnement activé !' : 'Subscription activated!'}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    {language === 'fr' 
                      ? "J'ai payé, vérifier mon statut" 
                      : "I paid, verify my status"
                    }
                  </span>
                </>
              )}
            </button>
            {checkStatus === 'failed' && (
              <div className="w-full mt-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-left">
                <p className="text-xs text-red-400/80 leading-relaxed mb-3">
                  {language === 'fr'
                    ? "Le paiement n'a pas encore été reçu. Si vous testez l'application, configurez l'URL du webhook dans Lemon Squeezy, ou utilisez les boutons ci-dessous pour forcer l'activation."
                    : "Payment not received yet. If testing, configure the Webhook URL in Lemon Squeezy, or use the buttons below to bypass and force activate."}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateActivation(false)}
                    className="w-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {language === 'fr' ? 'Activer Mensuel (Mode Test)' : 'Activate Monthly (Test Mode)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateActivation(true)}
                    className="w-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {language === 'fr' ? 'Activer Annuel (Mode Test)' : 'Activate Annual (Test Mode)'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
  );
}
