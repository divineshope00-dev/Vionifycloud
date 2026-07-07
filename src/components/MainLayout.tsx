import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, PlusSquare, Library as LibraryIcon, User as UserIcon, Star, X, AlertCircle, ShoppingBag, Search, BarChart3, RotateCw, Globe, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { isTrialExpired, hasActiveSubscription } from '../utils/subscription';
import EnterpriseOnboarding from './EnterpriseOnboarding';
import VLogo from './VLogo';
import PremiumIcon from './PremiumIcon';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [expiryMessage, setExpiryMessage] = useState('');
  const [isTrialWarning, setIsTrialWarning] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [guestWarningMessage, setGuestWarningMessage] = useState('');
  const [guestWarningTitle, setGuestWarningTitle] = useState('');
  const { t, language } = useLanguage();

  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState<number>(0);

  useEffect(() => {
    // Override window.open to intercept external links and open in webview
    const originalWindowOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        const urlObj = new URL(url, window.location.href);
        if (urlObj.hostname !== window.location.hostname) {
          setWebViewUrl(url);
          return null;
        }
      }
      return originalWindowOpen.call(window, url, target, features);
    };

    // Expose the original window.open for bypass inside the webview UI
    (window as any)._originalWindowOpen = originalWindowOpen;

    const handleGlobalClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }

      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          const urlObj = new URL(href, window.location.href);
          if (urlObj.hostname !== window.location.hostname) {
            e.preventDefault();
            e.stopPropagation();
            setWebViewUrl(href);
          }
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, true);

    const handleUserChange = () => {
      const updatedUser = db.getCurrentUser();
      setUser(updatedUser);
    };

    const handleGuestWarningEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; message: string }>;
      if (customEvent.detail) {
        setGuestWarningTitle(customEvent.detail.title);
        setGuestWarningMessage(customEvent.detail.message);
        setShowGuestWarning(true);
      }
    };

    window.addEventListener('user-changed', handleUserChange);
    window.addEventListener('vionify-guest-warning', handleGuestWarningEvent as EventListener);
    
    const currentUser = db.getCurrentUser();
    if (!currentUser) {
      if (location.pathname.startsWith('/app/video/')) {
        const guestUser = {
          id: 'guest',
          type: 'particulier',
          isGuest: true,
          name: 'Visitor',
          email: 'guest@vionify.com',
          subscriptionStatus: 'inactive'
        };
        localStorage.setItem('vionify_user', JSON.stringify(guestUser));
        setUser(guestUser as User);
        window.dispatchEvent(new Event('user-changed'));
      } else {
        // Save the current path to redirect back after login/signup
        const currentPath = location.pathname + location.search;
        navigate(`/role-selection?redirect=${encodeURIComponent(currentPath)}`);
      }
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
      window.open = originalWindowOpen;
      document.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('user-changed', handleUserChange);
      window.removeEventListener('vionify-guest-warning', handleGuestWarningEvent as EventListener);
    };
  }, [navigate, location.pathname, location.search]);

  // Sync user profile in background on navigation/mount to catch webhook updates
  useEffect(() => {
    const syncUserProfile = async () => {
      const currentUser = db.getCurrentUser();
      if (currentUser && !currentUser.isGuest) {
        try {
          const freshUser = await db.getUser(currentUser.id);
          if (freshUser) {
            const statusChanged = freshUser.subscriptionStatus !== currentUser.subscriptionStatus;
            const planChanged = freshUser.subscription?.plan !== currentUser.subscription?.plan;
            const endDateChanged = freshUser.subscription?.endDate !== currentUser.subscription?.endDate;
            const onboardingChanged = freshUser.onboardingCompleted !== currentUser.onboardingCompleted;

            if (statusChanged || planChanged || endDateChanged || onboardingChanged) {
              console.log('Background Sync: User subscription/onboarding updated from database. Refreshing state.');
              localStorage.setItem('vionify_user', JSON.stringify(freshUser));
              window.dispatchEvent(new Event('user-changed'));
            }
          }
        } catch (error) {
          console.error('Error syncing user profile in background:', error);
        }
      }
    };

    syncUserProfile();

    // Set up polling interval of 6 seconds to automatically detect subscription updates (webhooks)
    const intervalId = setInterval(syncUserProfile, 6000);

    return () => {
      clearInterval(intervalId);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (user?.isGuest) {
      if (location.pathname === '/app/club') {
        setGuestWarningTitle(language === 'fr' ? 'Accès au Club Privé' : 'Private Club Access');
        setGuestWarningMessage(
          language === 'fr' 
            ? 'Pour avoir accès au club, créez un compte particulier.' 
            : 'To get access to the club, please create a personal account.'
        );
        setShowGuestWarning(true);
      } else if (location.pathname === '/app/profile') {
        setGuestWarningTitle(language === 'fr' ? 'Avantages du Compte Particulier' : 'Individual Account Benefits');
        setGuestWarningMessage(
          language === 'fr' 
            ? 'Créez un compte particulier pour sauvegarder vos vidéos favorites, poster des commentaires, rejoindre le Club Privé exclusif et accéder à toutes nos fonctionnalités !' 
            : 'Create a personal account to save your favorite videos, post comments, join the exclusive Private Club, and unlock premium features!'
        );
        setShowGuestWarning(true);
      } else {
        setShowGuestWarning(false);
      }
    } else {
      setShowGuestWarning(false);
    }
  }, [location.pathname, user?.isGuest, language]);

  const closeExpiryWarning = () => {
    if (user) {
      localStorage.setItem(`vionify_expiry_warning_${user.id}`, 'true');
    }
    setShowExpiryWarning(false);
  };

  const closeGuestWarning = () => {
    setShowGuestWarning(false);
    if (location.pathname === '/app/club' || location.pathname === '/app/profile') {
      navigate('/app/home');
    }
  };

  const handleCreateAccountFromGuest = () => {
    setShowGuestWarning(false);
    localStorage.removeItem('vionify_user');
    window.dispatchEvent(new Event('user-changed'));
    navigate('/role-selection');
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
          { path: '/app/statistics', icon: BarChart3, label: t('nav.statistics') },
        ]
      : [
          { path: '/app/search', icon: Search, label: t('nav.search') },
          { path: '/app/club', icon: Star, label: t('nav.club') }
        ]
    ),
    { path: '/app/premium', icon: PremiumIcon, label: t('nav.premium') },
    { path: '/app/profile', icon: ProfileIcon, label: '' },
  ];

  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-32 overscroll-none scroll-smooth">
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
              className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-full md:max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 z-[70] shadow-2xl"
            >
              <button 
                onClick={closeExpiryWarning}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
                  <VLogo className="w-8 h-8 text-purple-500" />
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

      {/* Guest Warning Modal (Pull-up) */}
      <AnimatePresence>
        {showGuestWarning && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={closeGuestWarning}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-full md:max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 z-[70] shadow-2xl"
            >
              <button 
                onClick={closeGuestWarning}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
                  <PremiumIcon className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  {guestWarningTitle}
                </h3>
                
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                  {guestWarningMessage}
                </p>
                
                <button
                  onClick={handleCreateAccountFromGuest}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 transform hover:-translate-y-0.5"
                >
                  Create an account
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

      {/* Bottom Floating Navigation (Desktop) */}
      <nav className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-lg border border-zinc-800 px-6 py-2 rounded-2xl items-center gap-6 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="mr-2 pr-4 border-r border-zinc-800 flex items-center justify-center">
          <VLogo className="w-6 h-6 text-purple-500" />
        </div>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${isActive ? 'bg-purple-500/10 text-purple-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              title={item.label}
            >
              <Icon className={item.path === '/app/profile' ? "w-6 h-6 ring-2 ring-transparent transition-all rounded-full" : "w-5 h-5"} />
              {item.label && <span className="text-xs font-semibold leading-none">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Custom In-App Web View Modal */}
      <AnimatePresence>
        {webViewUrl && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[80] backdrop-blur-sm"
              onClick={() => setWebViewUrl(null)}
            />
            {/* WebView Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 30, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 top-[10%] md:top-[8%] md:inset-x-8 md:bottom-6 bg-zinc-950 border border-zinc-800 rounded-t-3xl md:rounded-2xl z-[90] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header / Address Bar */}
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setWebViewUrl(null)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                    title="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-full max-w-xs md:max-w-md">
                    <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate font-mono select-all">
                      {webViewUrl}
                    </span>
                  </div>
                </div>

                <div className="flex-1 text-center font-semibold text-sm truncate max-w-[45%] text-zinc-200">
                  Aperçu Web Vionify
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWebViewKey(prev => prev + 1)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                    title="Actualiser"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const original = (window as any)._originalWindowOpen || window.open;
                      original(webViewUrl, '_blank');
                    }}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-md shadow-purple-600/10"
                    title="Ouvrir dans le navigateur"
                  >
                    <span className="hidden sm:inline">Navigateur</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* WebView content warning / info for unrenderable sites */}
              <div className="bg-zinc-900/50 px-4 py-1.5 text-center text-[10px] text-zinc-400 border-b border-zinc-900/50 shrink-0">
                Si le site refuse de s'afficher ou rencontre des blocages, cliquez sur "Navigateur" en haut à droite.
              </div>

              {/* Iframe Body */}
              <div className="flex-1 bg-white relative">
                <iframe
                  key={`${webViewUrl}-${webViewKey}`}
                  src={webViewUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
