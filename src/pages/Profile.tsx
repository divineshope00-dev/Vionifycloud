import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { LogOut, Globe, FileText, Shield, User as UserIcon, Camera, X, BarChart2, Loader2, Star, Users, Info } from 'lucide-react';
import { db, User } from '../services/supabaseService';
import { countries } from '../utils/countries';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';
import { isTrialExpired, isSubscriptionExpired } from '../utils/subscription';
import PremiumIcon from '../components/PremiumIcon';

export default function Profile() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [monthlyClients, setMonthlyClients] = useState<number>(user.peakMonthlyClients || 0);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: user.name || '',
    country: user.country || '',
    profilePic: user.profilePic || ''
  });

  useEffect(() => {
    setFormData({
      name: user.name || '',
      country: user.country || '',
      profilePic: user.profilePic || ''
    });
    setProfileFile(null);
  }, [user]);

  useEffect(() => {
    if (user.type === 'entreprise') {
      const subscription = db.subscribeToMonthlyClients(user.id, (count) => {
        setMonthlyClients(count);
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user.id, user.type]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await db.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalProfilePic = formData.profilePic;
      if (profileFile) {
        const fileName = `${user.id}-profile-${Date.now()}`;
        finalProfilePic = await db.uploadFile('vionify-assets', `profiles/${fileName}`, profileFile);
      }
      
      await db.updateUser({ ...formData, profilePic: finalProfilePic });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setProfileFile(null);
    } catch (error) {
      console.error('Update user error:', error);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePic: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 md:p-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)] max-w-3xl mx-auto pb-32 md:pb-12">
      <h1 className="text-2xl font-bold mb-8">{t('profile.title')}</h1>

      {/* Profile Header */}
      <div className="bg-zinc-900 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-6 border border-zinc-800">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-purple-500">
            {formData.profilePic ? (
              <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-purple-500">
                <UserIcon className="w-10 h-10" />
              </div>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full cursor-pointer hover:bg-purple-500 transition-colors shadow-lg">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          {isEditing ? (
            <div className="space-y-3">
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:border-purple-500 outline-none"
              />
              <select 
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:border-purple-500 outline-none"
              >
                <option value="" disabled>Select Country</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center sm:justify-start">
                <div className="relative inline-flex items-center">
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  {user.type === 'entreprise' && (
                    <div className="absolute left-full ml-3 flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20 whitespace-nowrap">
                        <span className="text-xs font-bold text-purple-500">{monthlyClients}</span>
                        <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide">{t('profile.monthlyClients')}</span>
                      </div>
                      {(user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') && (
                        <div className="bg-purple-500/10 p-1 rounded-full border border-purple-500/20 whitespace-nowrap" title="Entreprise Premium">
                          <PremiumIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )}
                  {user.type === 'particulier' && user.subscriptionStatus === 'active' && (
                    <div className="absolute left-full ml-3 bg-purple-500/10 p-1 rounded-full border border-purple-500/20 whitespace-nowrap" title="Membre Premium">
                      <PremiumIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-zinc-400">{user.email}</p>
              <p className="text-sm text-purple-400 mt-1 capitalize">{user.type} • {user.country}</p>
            </>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {isEditing ? (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-medium transition-colors flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('profile.save')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-green-500 text-sm font-medium animate-in fade-in slide-in-from-right-4">
                  Enregistré !
                </span>
              )}
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-full font-medium transition-colors border border-zinc-700"
              >
                {t('profile.edit')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Info */}
      {(user.type === 'entreprise' || user.subscriptionStatus === 'active') && (
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6 border border-zinc-800">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <PremiumIcon className="w-5 h-5" />
            {t('profile.subscription')}
          </h3>
          {user.subscription ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-white">{t('profile.plan')} {user.subscription.plan}</p>
                  <p className="text-sm text-zinc-400">{t('profile.renewal')} {new Date(user.subscription.endDate).toLocaleDateString()}</p>
                </div>
                {isSubscriptionExpired(user) ? (
                  <button 
                    onClick={() => navigate('/app/premium')}
                    className="bg-red-500/20 text-red-500 hover:bg-red-500/30 px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer"
                  >
                    Terminé
                  </button>
                ) : (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium cursor-default">
                    {t('profile.active')}
                  </span>
                )}
              </div>
              
              {user.subscription.paymentMethod && (
                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-bold">Méthode de paiement</p>
                  <div className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-xl border border-zinc-700">
                    <div className="w-10 h-6 bg-zinc-700 rounded flex items-center justify-center text-[10px] font-bold uppercase text-zinc-400">
                      {user.subscription.paymentMethod.brand}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">•••• •••• •••• {user.subscription.paymentMethod.last4}</p>
                      <p className="text-[10px] text-zinc-500">Expire: {user.subscription.paymentMethod.expiryDate}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : user.type === 'entreprise' && (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-white">{t('profile.trial.entreprise')}</p>
                <p className="text-sm text-zinc-400">
                  {t('profile.endsOn')} {
                    user.trialEndsAt 
                      ? new Date(user.trialEndsAt).toLocaleDateString() 
                      : (() => {
                          const d = new Date(user.trialStartDate);
                          d.setDate(d.getDate() + 7);
                          return d.toLocaleDateString();
                        })()
                  }
                </p>
              </div>
              {isTrialExpired(user) ? (
                <button 
                  onClick={() => navigate('/app/premium')}
                  className="bg-red-500/20 text-red-500 hover:bg-red-500/30 px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer"
                >
                  Terminé
                </button>
              ) : (
                <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-sm font-medium cursor-default">
                  En cours
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 mb-6">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-zinc-400" />
            <span className="font-medium">{t('profile.language')}</span>
          </div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 focus:border-purple-500 outline-none text-sm"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>

        <button onClick={() => navigate('/privacy-policy')} className="w-full p-4 border-b border-zinc-800 flex items-center gap-3 hover:bg-zinc-800 transition-colors">
          <Shield className="w-5 h-5 text-zinc-400" />
          <span className="font-medium">{t('profile.privacy')}</span>
        </button>

        <button onClick={() => navigate('/terms-of-service')} className="w-full p-4 flex items-center gap-3 hover:bg-zinc-800 transition-colors">
          <FileText className="w-5 h-5 text-zinc-400" />
          <span className="font-medium">{t('profile.terms')}</span>
        </button>

        {user.type === 'particulier' && (
          <button onClick={() => navigate('/app/notice')} className="w-full p-4 border-t border-zinc-800 flex items-center gap-3 hover:bg-zinc-800 transition-colors">
            <Info className="w-5 h-5 text-zinc-400" />
            <span className="font-medium">{t('profile.notice')}</span>
          </button>
        )}

        {user.type === 'entreprise' && (
          <>
            <button onClick={() => navigate('/app/statistics')} className="w-full p-4 border-t border-zinc-800 flex items-center gap-3 hover:bg-zinc-800 transition-colors">
              <BarChart2 className="w-5 h-5 text-zinc-400" />
              <span className="font-medium">{t('profile.statistics')}</span>
            </button>
            <button onClick={() => navigate('/app/notice-entreprise')} className="w-full p-4 border-t border-zinc-800 flex items-center gap-3 hover:bg-zinc-800 transition-colors">
              <Info className="w-5 h-5 text-zinc-400" />
              <span className="font-medium">{t('profile.noticeEntreprise')}</span>
            </button>
          </>
        )}
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-4 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mb-6"
      >
        {isLoggingOut ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <LogOut className="w-5 h-5" />
        )}
        {isLoggingOut ? t('profile.loggingOut') || 'Logging out...' : t('profile.logout')}
      </button>

      {/* Profile Link (Enterprise Only) */}
      {user.type === 'entreprise' && (
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-500" />
            Lien du profil
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Partagez ce lien pour permettre aux utilisateurs de découvrir vos vidéos et produits.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                const url = `${window.location.origin}/app/entreprise/${user.id}`;
                navigator.clipboard.writeText(url);
                alert('Lien copié dans le presse-papiers !');
              }}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl font-medium transition-colors border border-zinc-700 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Copier le lien
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/app/entreprise/${user.id}`;
                if (navigator.share) {
                  navigator.share({
                    title: `Vionify - ${user.name}`,
                    text: `Découvrez les vidéos et produits de ${user.name} sur Vionify !`,
                    url: url
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(url);
                  alert('Lien copié dans le presse-papiers !');
                }
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <Globe className="w-4 h-4" />
              Partager
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
