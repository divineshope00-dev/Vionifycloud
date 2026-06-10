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
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-red-900/10">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">
          {t('subscription.guard.title')}
        </h2>
        
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Votre période d'essai ou votre abonnement a expiré. Pour continuer, choisissez un de nos forfaits.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/app/premium')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            Abonnement Standard
          </button>
          
          <button
            onClick={() => navigate('/app/video-ia')}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-4 rounded-xl font-bold text-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Bot className="w-5 h-5" />
            Vionify Video IA
          </button>
        </div>
      </div>
    </div>
  );
}
