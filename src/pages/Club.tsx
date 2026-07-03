import { useOutletContext, useNavigate } from 'react-router-dom';
import { Star, Gift } from 'lucide-react';
import { User } from '../services/supabaseService';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import PremiumIcon from '../components/PremiumIcon';

export default function Club() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // 30 days trial logic for particulier
  const isSubscriber = user.subscriptionStatus === 'active' && user.type === 'particulier';
  const signupDate = user.trialStartDate ? new Date(user.trialStartDate) : new Date();
  const trialEndDate = new Date(signupDate);
  trialEndDate.setDate(trialEndDate.getDate() + 30);
  
  const isWithinTrial = new Date() < trialEndDate;
  const isTrialUser = user.type === 'particulier' && !isSubscriber;

  const partners = [
    { name: 'Economicbooking', logo: 'https://logo.clearbit.com/economybookings.com?size=256', link: 'https://sovrn.co/9chsaoz' },
    { name: 'AATU', logo: 'https://logo.clearbit.com/aatu.co.uk?size=256', link: 'https://sovrn.co/1k0pbza' },
    { name: 'Befitfood', logo: 'https://logo.clearbit.com/befitfood.com.au?size=256', link: 'https://sovrn.co/t199jjm' },
    { name: '1INCOFFE', logo: 'https://logo.clearbit.com/1stincoffee.com?size=256', link: 'https://sovrn.co/1e3y2o4' },
    { name: '11teamsports', logo: 'https://logo.clearbit.com/11teamsports.com?size=256', link: 'https://sovrn.co/1kgoyo5' },
    { name: 'Shein', logo: 'https://logo.clearbit.com/shein.com?size=256', link: 'https://sovrn.co/1o5nylt' },
    { name: 'Luxoliving', logo: 'https://logo.clearbit.com/luxoliving.com.au?size=256', link: 'https://sovrn.co/13zsxi1' },
    { name: 'Doona', logo: 'https://logo.clearbit.com/doona.com?size=256', link: 'https://sovrn.co/1iqdbgr' },
    { name: 'Agoda', logo: 'https://logo.clearbit.com/agoda.com?size=256', link: 'https://sovrn.co/1andbi6' },
    { name: '100x100Fitness', logo: 'https://logo.clearbit.com/100x100fitness.com?size=256', link: 'https://sovrn.co/6tswpnc' },
    { name: '12-Travelde', logo: 'https://logo.clearbit.com/12-travel.de?size=256', link: 'https://sovrn.co/1fo6ejq' },
    { name: '10THMONTAIN WHISKY', logo: 'https://logo.clearbit.com/10thwhiskey.com?size=256', link: 'https://sovrn.co/cfnzu1g' },
    { name: 'Luxunfiltered', logo: 'https://logo.clearbit.com/luxunfiltered.com?size=256', link: 'https://sovrn.co/1lm6n0g' },
    { name: '1000Farmacie.it', logo: 'https://logo.clearbit.com/1000farmacie.it?size=256', link: 'https://sovrn.co/0hzk932' },
    { name: 'Walmart', logo: 'https://logo.clearbit.com/walmart.com?size=256', link: 'https://sovrn.co/u8qwspk' },
    { name: '1000Livres', logo: 'https://logo.clearbit.com/1000livres.fr?size=256', link: 'https://sovrn.co/umn6mbm' },
    { name: '107Beauty', logo: 'https://logo.clearbit.com/107beauty.com?size=256', link: 'https://sovrn.co/1ogkw98' },
    { name: '111Skin', logo: 'https://logo.clearbit.com/111skin.com?size=256', link: 'https://sovrn.co/1hu4y5e' },
    { name: '123Optique', logo: 'https://logo.clearbit.com/123optic.com?size=256', link: 'https://sovrn.co/y220dbi' },
    { name: '1Up nutrition', logo: 'https://logo.clearbit.com/1upnutrition.com?size=256', link: 'https://sovrn.co/132pdg7' },
    { name: '2Jeux', logo: 'https://logo.clearbit.com/2jeux.fr?size=256', link: 'https://sovrn.co/k9joiln' },
    { name: '247Tikets Global', logo: 'https://logo.clearbit.com/247tickets.com?size=256', link: 'https://sovrn.co/1jf85qs' },
    { name: 'Manicure en 14 jours', logo: 'https://logo.clearbit.com/14daymanicure.com?size=256', link: 'https://sovrn.co/14ljti5' },
    { name: 'Supplement Needs', logo: 'https://logo.clearbit.com/supplementneeds.co.uk?size=256', link: 'https://sovrn.co/1otpooi' },
    { name: 'Supply Life', logo: 'https://logo.clearbit.com/supplylife.com?size=256', link: 'https://sovrn.co/1b2v6ii' },
    { name: 'The drinkshop', logo: 'https://logo.clearbit.com/thedrinkshop.com?size=256', link: 'https://sovrn.co/1bjds6j' },
    { name: 'TripAdvisor', logo: 'https://logo.clearbit.com/tripadvisor.com?size=256', link: 'https://sovrn.co/614x2m0' },
    { name: 'Tuango', logo: 'https://logo.clearbit.com/tuango.ca?size=256', link: 'https://sovrn.co/19rj3z0' },
    { name: 'Ebay', logo: 'https://logo.clearbit.com/ebay.com?size=256', link: 'https://sovrn.co/f9w0if6' },
    { name: 'Grâce Beauty', logo: 'https://logo.clearbit.com/gracebeauty.com?size=256', link: 'https://sovrn.co/yvagnc4' },
  ];

  // If user is not enterprise and doesn't have access (edge case if somehow trialEndDate is invalid)
  const hasAccess = isSubscriber || (user.type === 'particulier' && isWithinTrial);
  const showExpiryPrompt = (isTrialUser && !isWithinTrial) || (!hasAccess && user.type === 'particulier');

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className={`p-4 md:p-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)] max-w-5xl mx-auto pb-32 transition-all duration-500 ${showExpiryPrompt ? 'filter blur-md select-none pointer-events-none opacity-45' : ''}`}>
        {isTrialUser && isWithinTrial && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8 p-4 bg-purple-600/10 border border-purple-500/30 rounded-2xl flex items-center gap-3 text-purple-200 text-sm md:text-base font-medium"
          >
            <Gift className="w-5 h-5 text-purple-500" />
            {t('club.trial.info')}
          </motion.div>
        )}

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12"
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-white">
          {t('club.partners.title')}
        </h1>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-10 gap-x-6 md:gap-x-8">
          {partners.map((partner, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <a 
                href={partner.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-lg border-2 border-zinc-800 hover:border-purple-500 transition-all group"
              >
                <img 
                  src={partner.logo} 
                  alt={partner.name}
                  className="w-[70%] h-[70%] object-contain transition-transform group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('google.com/s2/favicons')) {
                      const domainMatch = partner.logo.match(/logo\.clearbit\.com\/([^?]+)/);
                      const domain = domainMatch ? domainMatch[1] : partner.name;
                      target.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                    } else if (target.src.includes('google.com/s2/favicons')) {
                      target.src = `https://unavatar.io/${partner.name}?size=256&fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name)}&background=random&color=fff&size=256`;
                    }
                  }}
                />
              </a>
              <span className="text-[10px] md:text-sm text-zinc-400 font-medium text-center truncate w-full">
                {partner.name}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>

    {showExpiryPrompt && (
      <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40" />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-full md:max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 z-50 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mt-2">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
              <Star className="w-8 h-8 text-purple-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight uppercase">
              {isTrialUser && !isWithinTrial ? t('club.trial.expired.title') : t('club.access.title')}
            </h3>
            
            <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
              {isTrialUser && !isWithinTrial ? t('club.trial.expired.desc') : t('club.access.desc')}
            </p>
            
            <button
              onClick={() => navigate('/app/premium')}
              className="w-full bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 hover:-translate-y-0.5 active:scale-95 group flex items-center justify-center gap-2"
            >
              <PremiumIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>{t('club.access.button')}</span>
            </button>
          </div>
        </motion.div>
      </>
    )}
  </div>
);
}
