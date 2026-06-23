import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, PlusSquare, Library as LibraryIcon, Crown, User as UserIcon, Star, X, AlertCircle, ShoppingBag, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { isTrialExpired, hasActiveSubscription } from '../utils/subscription';
import EnterpriseOnboarding from './EnterpriseOnboarding';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [expiryMessage, setExpiryMessage] = useState('');
  const [isTrialWarning, setIsTrialWarning] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleUserChange = () => {
      const updatedUser = db.getCurrentUser();
      setUser(updatedUser);
    };

    window.addEventListener('user-changed', handleUserChange);
    
    const currentUser = db.getCurrentUser();
    if (!currentUser) {
      // Save the current path to redirect back after login/signup
      const currentPath = location.pathname + location.search;
      navigate(`/role-selection?redirect=${encodeURIComponent(currentPath)}`);
    } else {
      setUser(currentUser);
      
      // Show onboarding for enterprise users who haven't completed it
      const localOnboarding = localStorage.getItem(`vionify_onboarding_${currentUser.id}`);
      if (currentUser.type === 'entreprise' && !currentUser.onboardingCompleted && localOnboarding !== 'completed') {
        setShowOnboarding(true);
      }

      // Check for subscription/trial expiry warning
      if (currentUser.type === 'entreprise') {
        const warningKey = `vionify_expiry_warning_${currentUser.id}`;
        const hasSeenWarning = localStorage.getItem(warningKey);

        if (!hasSeenWarning) {
          let endDate: Date | null = null;
          let isTrial = false;

          if (currentUser.subscriptionStatus === 'active' && currentUser.subscription?.endDate) {
            endDate = new Date(currentUser.subscription.endDate);
          } else {
            isTrial = true;
            if (currentUser.trialEndsAt) {
              endDate = new Date(currentUser.trialEndsAt);
            } else if (currentUser.trialStartDate) {
              endDate = new Date(currentUser.trialStartDate);
              endDate.setDate(endDate.getDate() + 7);
            }
          }

          if (endDate) {
            const now = new Date();
            const diffTime = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Show warning if 2 days or less remaining
            if (diffDays <= 2 && diffDays >= 0) {
              setIsTrialWarning(isTrial);
              setExpiryMessage(
                isTrial 
                  ? `Votre essai gratuit se termine dans ${diffDays} jour${diffDays > 1 ? 's' : ''}. Veuillez choisir un abonnement à votre choix pour continuer.`
                  : `Votre abonnement se termine dans ${diffDays} jour${diffDays > 1 ? 's' : ''}. Veuillez le renouveler pour éviter toute interruption.`
              );
              setShowExpiryWarning(true);
            }
          }
        }
      }
    }

    return () => {
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, [navigate, location.pathname, location.search]);

  const closeExpiryWarning = () => {
    if (user) {
      localStorage.setItem(`vionify_expiry_warning_${user.id}`, 'true');
    }
    setShowExpiryWarning(false);
  };

  if (!user) return null;

  const isEntreprise = user.type === 'entreprise';

  if (showOnboarding && user) {
    return (
      <EnterpriseOnboarding 
        user={user} 
        onComplete={() => {
          setShowOnboarding(false);
          // Refresh user data from local storage (updated by db.updateUser)
          setUser(db.getCurrentUser());
        }} 
      />
    );
  }

  const ProfileIcon = ({ className }: { className?: string }) => {
    if (user?.profilePic) {
      return (
        <img 
          src={user.profilePic} 
          alt="Profile" 
          className={`rounded-full object-cover ${className}`} 
        />
      );
    }
    return (
      <div className={`rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 ${className}`}>
        {user?.name ? <span className="text-xs font-bold text-zinc-400">{user.name.charAt(0).toUpperCase()}</span> : <UserIcon className="w-4 h-4 text-zinc-400" />}
      </div>
    );
  };

  const navItems = [
    { path: '/app/home', icon: Home, label: t('nav.home') },
    ...(isEntreprise 
      ? [
          { path: '/app/publish', icon: PlusSquare, label: t('nav.publish') },
        ]
      : [
          { path: '/app/search', icon: Search, label: t('nav.search') },
          { path: '/app/club', icon: Star, label: t('nav.club') }
        ]
    ),
    { path: '/app/premium', icon: Crown, label: t('nav.premium') },
    { path: '/app/profile', icon: ProfileIcon, label: '' },
  ];

  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 md:pl-24 overscroll-none scroll-smooth">
        <div className="max-w-[2000px] mx-auto min-h-full">
          <Outlet context={{ user }} />
        </div>
      </main>

      {/* Expiry Warning Modal (Pull-up) */}
      <AnimatePresence>
        {showExpiryWarning && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={closeExpiryWarning}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-3xl p-6 z-[70] shadow-2xl"
            >
              <button 
                onClick={closeExpiryWarning}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
                  <span className="text-purple-500 font-bold text-3xl">V</span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  {isTrialWarning ? 'Fin de l\'essai gratuit' : 'Renouvellement requis'}
                </h3>
                
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                  {expiryMessage}
                </p>
                
                <button
                  onClick={() => {
                    closeExpiryWarning();
                    navigate('/app/premium');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-purple-600/20"
                >
                  {isTrialWarning ? 'Choisir un abonnement' : 'Renouveler mon abonnement'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-lg border-t border-zinc-800 px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-between items-center z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex flex-col items-center gap-1 ${isActive ? 'text-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icon className={item.path === '/app/profile' ? "w-7 h-7 ring-2 ring-transparent transition-all hover:ring-purple-500/50" : "w-6 h-6"} />
              {item.label && <span className="text-[10px] font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Side Navigation (Desktop) */}
      <nav className="hidden md:flex fixed top-0 bottom-0 left-0 w-24 bg-zinc-900 border-r border-zinc-800 flex-col items-center py-8 px-2 gap-8 z-50">
        <div className="text-purple-500 font-bold text-2xl mb-4">V</div>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex flex-col items-center gap-1.5 p-2 w-full rounded-xl transition-colors ${isActive ? 'bg-purple-500/10 text-purple-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              title={item.label}
            >
              <Icon className={item.path === '/app/profile' ? "w-8 h-8 md:w-9 md:h-9 ring-2 ring-transparent transition-all group-hover:ring-purple-500/50" : "w-6 h-6"} />
              {item.label && <span className="text-[10px] font-medium text-center leading-tight px-1">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
