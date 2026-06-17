import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Crown, Bot } from 'lucide-react';
import { User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { canAccessContent } from '../utils/subscription';

interface SubscriptionGuardProps {
  user: User;
  children: React.ReactNode;
}

export default function SubscriptionGuard({ user, children }: SubscriptionGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Determine if Video IA sub is active
  const aiQuotaItem = localStorage.getItem(`vionify_ai_quota_${user.id}`);
  const aiQuota = aiQuotaItem ? JSON.parse(aiQuotaItem) : null;
  // It's active if plan exists and is NOT 'free' (or maybe if they still have free credits? No, "actif" implies premium for all menus to open)
  // Wait, if they have 'free' plan, do they bypass the guard? No, only paid AI plan opens things.
  // Actually, wait, if they have 'free' plan, they can use the 3 free prompts, but do those 3 free prompts open ALL menus? 
  // User: "si son abonnement de génération de videoia est actif alors tous les menu sont actif même celui du menu publier"
  // Let's assume paid AI sub = unlocked menus. So plan !== 'free'
  const hasAiSub = aiQuota && aiQuota.plan && aiQuota.plan !== 'free';

  if (canAccessContent(user) || hasAiSub) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      
      <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 max-w-md w-full text-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative z-10">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-red-600/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">
          {t('subscription.guard.title')}
        </h2>
        
        <p className="text-zinc-400 mb-10 leading-relaxed text-sm font-medium">
          {t('subscription.guard.desc')}
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/app/premium')}
            className="w-full bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-600/20 hover:shadow-purple-600/40 hover:-translate-y-1 active:scale-95 group"
          >
            <Crown className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-base">{t('subscription.guard.button')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
