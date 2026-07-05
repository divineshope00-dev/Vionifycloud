import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Check, AlertTriangle, Loader2, Star, Zap, Gift, Shield, Radio } from 'lucide-react';
import { db, User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'motion/react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { isTrialExpired as checkTrialExpired } from '../utils/subscription';
import PremiumIcon from '../components/PremiumIcon';

export default function Premium() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const planIdRef = useRef<string | null>(null);
  const isAnnualRef = useRef(isAnnual);

  // Update ref when state changes
  useEffect(() => {
    isAnnualRef.current = isAnnual;
  }, [isAnnual]);

  // Paddle Configuration (Reserved for Particulier premium checks if any)
  const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'live_2c53c004cf362eb28468635c95f';
  const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV || 'production';

  // Lemon Squeezy checkout configurations for Enterprise (Entreprise)
  const LEMON_SQUEEZY_CHECKOUTS = {
    entreprise: {
      starter: {
        monthly: {
          url: 'https://vionify.lemonsqueezy.com/checkout/buy/a6ac5252-7df8-4402-8ec8-c71b4c8f178f',
          variantId: '1871322'
        },
        annual: {
          url: 'https://vionify.lemonsqueezy.com/checkout/buy/d64d814b-2ad4-40ed-9ba4-37cc1cdf5cb4',
          variantId: '1871335'
        }
      },
      pro: {
        monthly: {
          url: 'https://vionify.lemonsqueezy.com/checkout/buy/16abd228-2ab8-44e3-b3c9-b20614e55ba6',
          variantId: '1871341'
        },
        annual: {
          url: 'https://vionify.lemonsqueezy.com/checkout/buy/a192f6a5-fcc9-440b-9a73-56a02b9602b3',
          variantId: '1871348'
        }
      },
      unlimited: {
        monthly: {
          url: 'https://vionify.lemonsqueezy.com/checkout/buy/3453c352-1a34-49f7-aace-ede5241ac1be',
          variantId: '1871358'
        },
        annual: {
          url: 'https://vionify.lemonsqueezy.com/checkout/buy/93533cdf-a56e-43a2-b72d-eb55bcd75947',
          variantId: '1871361'
        }
      }
    }
  };

  const PRICE_IDS = {
    particulier: {
      monthly: import.meta.env.VITE_PADDLE_PRICE_PARTICULIER_MONTHLY || 'pri_01kkqan8kke83jnncrk7x7tb36',
      annual: import.meta.env.VITE_PADDLE_PRICE_PARTICULIER_ANNUAL || 'pri_01kkqaqcwcx6ypf9h581q99bzh'
    }
  };

  // Check trial status
  const isTrialExpired = checkTrialExpired(user);
  const hasActiveSubscription = user.subscriptionStatus === 'active';

  useEffect(() => {
    // Only initialize Paddle if user is Particulier
    if (user.type === 'particulier') {
      initializePaddle({
        environment: PADDLE_ENV,
        token: PADDLE_CLIENT_TOKEN,
        eventCallback: function(data: any) {
          if (data.name === 'checkout.completed') {
            if (planIdRef.current) {
              // Extract payment method info if available
              let paymentMethod;
              const pm = data.data?.transaction?.details?.payment_method;
              if (pm && pm.type === 'card') {
                paymentMethod = {
                  last4: pm.card.last4,
                  brand: pm.card.brand,
                  expiryDate: `${pm.card.expiry_month}/${pm.card.expiry_year.toString().slice(-2)}`
                };
              }
              handlePaymentSuccess(planIdRef.current, paymentMethod);
            }
          }
        }
      }).then((paddleInstance) => {
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      });
    }
  }, []);

  const handlePaymentSuccess = (planId: string, paymentMethod?: { last4: string; brand: string; expiryDate: string }) => {
    const endDate = new Date();
    const annual = isAnnualRef.current;
    if (annual) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    db.updateUser({
      subscriptionStatus: 'active',
      subscription: {
        plan: planId as any,
        endDate: endDate.toISOString(),
        isAnnual: annual,
        paymentMethod
      }
    });

    navigate('/app/home');
  };

  const handleSubscribe = async (planId: string, priceId?: string) => {
    planIdRef.current = planId;

    if (user.type === 'entreprise') {
      setIsProcessing(true);
      const planKey = planId as 'starter' | 'pro' | 'unlimited';
      const billingKey = isAnnual ? 'annual' : 'monthly';
      const checkoutData = LEMON_SQUEEZY_CHECKOUTS.entreprise[planKey][billingKey];

      try {
        const checkoutUrl = new URL(checkoutData.url);
        // Lemon Squeezy checkout supports passing custom parameters that will be returned in webhook payloads
        // We set both checkout[custom] and checkout[custom_data] namespaces for maximum resilience and safety
        checkoutUrl.searchParams.set('checkout[email]', user.email);
        
        checkoutUrl.searchParams.set('checkout[custom][user_id]', user.id);
        checkoutUrl.searchParams.set('checkout[custom][plan_id]', planId);
        checkoutUrl.searchParams.set('checkout[custom][is_annual]', isAnnual ? 'true' : 'false');
        checkoutUrl.searchParams.set('checkout[custom][variant_id]', checkoutData.variantId);

        checkoutUrl.searchParams.set('checkout[custom_data][user_id]', user.id);
        checkoutUrl.searchParams.set('checkout[custom_data][plan_id]', planId);
        checkoutUrl.searchParams.set('checkout[custom_data][is_annual]', isAnnual ? 'true' : 'false');
        checkoutUrl.searchParams.set('checkout[custom_data][variant_id]', checkoutData.variantId);

        window.open(checkoutUrl.toString(), '_blank');
        alert("L'onglet de paiement Lemon Squeezy a été ouvert. Une fois votre paiement effectué, votre abonnement sera automatiquement activé.");
      } catch (error) {
        console.error("Failed to construct Lemon Squeezy URL:", error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!priceId) {
      // Fallback to mock payment if no Paddle Price ID is configured (for Particulier only)
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      handlePaymentSuccess(planId, { last4: '4242', brand: 'visa', expiryDate: '12/28' });
      setIsProcessing(false);
      return;
    }

    if (paddle) {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: {
          email: user.email,
        },
        customData: {
          userId: user.id,
          userType: user.type,
          planId
        }
      });
    }
  };

  const isEntreprise = user.type === 'entreprise';

  // Get Price IDs from configuration (for Particulier only)
  const getPriceId = (type: 'entreprise' | 'particulier', isAnnual: boolean, planId?: string) => {
    if (type === 'particulier') {
      return isAnnual ? PRICE_IDS.particulier.annual : PRICE_IDS.particulier.monthly;
    }
    return '';
  };

  const plansEntreprise = [
    { 
      id: 'starter', 
      name: t('premium.plan.starter'), 
      monthly: 19.99, 
      features: [`5 ${t('premium.feat.videosPerMonth')}`, t('premium.feat.stats'), t('premium.feat.support')] 
    },
    { 
      id: 'pro', 
      name: t('premium.plan.pro'), 
      monthly: 39.00, 
      features: [`10 ${t('premium.feat.videosPerMonth')}`, t('premium.feat.stats'), t('premium.feat.support')] 
    },
    { 
      id: 'unlimited', 
      name: t('premium.plan.unlimited'), 
      monthly: 59.00, 
      features: [
        isAnnual ? `15 ${t('premium.feat.videosPerMonth')}` : `15 ${t('premium.feat.videosPerMonth')}`, 
        t('premium.feat.stats'), 
        t('premium.feat.support')
      ] 
    },
  ];

  const planParticulier = { 
    name: t('premium.plan.premium'), 
    monthly: 3.99,
    features: [t('premium.feat.allVideos'), t('premium.feat.noAds')]
  };

  const calculatePrice = (monthlyPrice: number) => {
    if (isAnnual) {
      const annualPrice = monthlyPrice * 12 * 0.9; // 10% discount
      return annualPrice.toFixed(2);
    }
    return monthlyPrice.toFixed(2);
  };

  return (
    <div className="p-4 md:p-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)] max-w-5xl mx-auto">
      {isTrialExpired && !hasActiveSubscription && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-[32px] p-8 mb-12 flex flex-col items-center text-center shadow-[0_0_50px_rgba(239,68,68,0.1)] gap-6"
        >
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-red-500/10 blur-3xl rounded-full" />
          
          <div className="bg-red-500/20 p-4 rounded-2xl border border-red-500/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-red-500 mb-2 uppercase tracking-tight">{t('premium.expired.title')}</h2>
            <p className="text-red-200/80 leading-relaxed text-sm font-medium">
              {isEntreprise ? t('premium.expired.desc.entreprise') : t('premium.expired.desc.particulier')}
            </p>
          </div>
        </motion.div>
      )}

      <div className="text-center mb-12">
        <PremiumIcon className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-3xl md:text-5xl font-bold mb-4">{t('premium.title')}</h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          {t('premium.subtitle')}{isEntreprise ? ` ${t('premium.trial.entreprise')}` : ''}
        </p>

        {/* Toggle Billing */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-zinc-500'}`}>{t('premium.monthly')}</span>
          <button 
            className="w-14 h-8 bg-zinc-800 rounded-full p-1 relative transition-colors"
            onClick={() => setIsAnnual(!isAnnual)}
          >
            <div className={`w-6 h-6 bg-purple-500 rounded-full shadow-md transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-medium flex items-center gap-2 ${isAnnual ? 'text-white' : 'text-zinc-500'}`}>
            {t('premium.yearly')} <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded-full">{t('premium.save')}</span>
          </span>
        </div>
      </div>

      {isEntreprise && (
        <div className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 md:p-8 mb-10 shadow-2xl">
          {/* Subtle ambient glow in background */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="shrink-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4 rounded-2xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] relative">
              <div className="absolute inset-0 rounded-2xl bg-purple-500/20 animate-ping opacity-20" />
              <Radio className="w-8 h-8 text-purple-400 relative z-10" />
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-300 mb-3 tracking-tight">
                {t('premium.broadcast.warning.title')}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl mx-auto sm:mx-0">
                {t('premium.broadcast.warning.desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {isEntreprise ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plansEntreprise.map((plan, i) => (
            <div 
              key={plan.name} 
              className={`bg-zinc-900 border rounded-3xl p-8 flex flex-col ${i === 1 ? 'border-purple-500 shadow-2xl shadow-purple-900/20 relative' : 'border-zinc-800'}`}
            >
              {i === 1 && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  {t('premium.popular')}
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{calculatePrice(plan.monthly)}€</span>
                <span className="text-zinc-500">/{isAnnual ? t('premium.year') : t('premium.month')}</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-zinc-300">
                    <Check className="w-5 h-5 text-purple-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSubscribe(plan.id, getPriceId('entreprise', isAnnual, plan.id))}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${i === 1 ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('premium.processing')}
                  </>
                ) : (
                  t('premium.choosePlan')
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {hasActiveSubscription ? (
            <div className="bg-zinc-900 border border-orange-500 rounded-3xl p-8 text-center shadow-2xl shadow-orange-900/20">
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-10 h-10 text-orange-500 fill-current" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">{t('premium.founder.welcome').replace('{{name}}', user.name)}</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                {t('premium.founder.welcome.desc')}
              </p>
              <button 
                onClick={() => navigate('/app/club')}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {t('premium.founder.welcome.button')}
              </button>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-purple-500 rounded-3xl p-8 flex flex-col shadow-2xl shadow-purple-900/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-2xl">
                  <PremiumIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{t('premium.founder.title')}</h3>
                </div>
              </div>
              
              <p className="text-zinc-300 mb-8 leading-relaxed">
                {t('premium.founder.desc')}
              </p>

              <ul className="space-y-6 mb-10">
                <li className="flex items-start gap-4">
                  <div className="mt-1 p-1 bg-orange-500/10 rounded-lg">
                    <Star className="w-5 h-5 text-orange-500 fill-current" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{t('premium.founder.feat.badge.title')}</p>
                    <p className="text-sm text-zinc-400">{t('premium.founder.feat.badge.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 p-1 bg-purple-500/10 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{t('premium.founder.feat.price.title')}</p>
                    <p className="text-sm text-zinc-400">{t('premium.founder.feat.price.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 p-1 bg-purple-500/10 rounded-lg">
                    <Gift className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{t('premium.founder.feat.privilege.title')}</p>
                    <p className="text-sm text-zinc-400">{t('premium.founder.feat.privilege.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 p-1 bg-purple-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{t('premium.founder.feat.innovation.title')}</p>
                    <p className="text-sm text-zinc-400">{t('premium.founder.feat.innovation.desc')}</p>
                  </div>
                </li>
              </ul>

              <div className="mb-8 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-400 font-medium">{t('premium.founder.label')}</span>
                  <span className="text-2xl font-bold text-white">{calculatePrice(planParticulier.monthly)}€<span className="text-sm text-zinc-500 font-normal">/{isAnnual ? t('premium.year') : t('premium.month')}</span></span>
                </div>
                <p className="text-xs text-zinc-500">{t('premium.founder.footer')}</p>
              </div>

              <button 
                onClick={() => handleSubscribe('premium', getPriceId('particulier', isAnnual))}
                disabled={isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {t('premium.processing')}
                  </>
                ) : (
                  t('premium.founder.button')
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
