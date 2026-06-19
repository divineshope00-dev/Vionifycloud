import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link, useLocation } from 'react-router-dom';
import { Upload, X, Plus, Image as ImageIcon, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { db, User, Product } from '../services/supabaseService';
import { canAccessContent } from '../utils/subscription';
import { useLanguage } from '../contexts/LanguageContext';
import { CATEGORIES } from '../constants';

import { supabase } from '../lib/supabase';

export default function Publish() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const location = useLocation();
  const hasAccess = canAccessContent(user);
  const { t } = useLanguage();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>(location.state?.importedVideoUrl || '');
  const [isImportedVideo, setIsImportedVideo] = useState<boolean>(!!location.state?.importedVideoUrl);

  useEffect(() => {
    if (location.state?.importedVideoUrl) {
      setVideoPreview(location.state.importedVideoUrl);
      setIsImportedVideo(true);
    }
  }, [location.state]);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    discount: '',
    link: '',
    category: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoCount, setVideoCount] = useState<number | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const getPlanLimit = () => {
    if (!user.subscription) return 0;
    const plan = user.subscription.plan;
    const isAnnual = user.subscription.isAnnual;

    if (plan === 'starter') return 5;
    if (plan === 'pro') return 10;
    if (plan === 'unlimited') return isAnnual ? 40 : 30;
    return 0;
  };

  const limit = getPlanLimit();

  useEffect(() => {
    if (user.type === 'entreprise') {
      db.getVideoCountInLast30Days(user.id).then(count => {
        setVideoCount(count);
        if (count >= limit && limit > 0) {
          setShowLimitModal(true);
        }
      });
    }
  }, [user.id, limit]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-purple-500 font-bold text-6xl mb-6">V</div>
        <h2 className="text-2xl font-bold mb-4">{t('paywall.title')}</h2>
        <p className="text-zinc-400 mb-8">{t('paywall.desc.entreprise')}</p>
        <Link 
          to="/app/premium"
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-8 rounded-full transition-all"
        >
          {t('paywall.button')}
        </Link>
      </div>
    );
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoCount !== null && videoCount >= limit && limit > 0) {
      setShowLimitModal(true);
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Veuillez sélectionner un fichier vidéo valide.');
        return;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError('La vidéo dépasse 50Mo. Veuillez compresser votre vidéo (qualité min 720p).');
        return;
      }

      // Check duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 60) {
          setError('La durée de la vidéo dépasse 60 secondes donc 1 minute.');
          setVideoFile(null);
          setVideoPreview('');
        }
      };
      video.src = URL.createObjectURL(file);
      
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Re-check limit
    const currentCount = await db.getVideoCountInLast30Days(user.id);
    if (currentCount >= limit && limit > 0) {
      setShowLimitModal(true);
      return;
    }

    if (!videoPreview) {
      setError('Veuillez ajouter une vidéo.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let finalVideoUrl = videoPreview;
      
      // 1. Upload Video if exists
      if (videoFile) {
        const fileName = `${Date.now()}-${videoFile.name}`;
        finalVideoUrl = await db.uploadFile('vionify-assets', `videos/${fileName}`, videoFile);
      }

      // 2. Add Video to DB
      const addedVideo = await db.addVideo({
        entrepriseId: user.id,
        entrepriseName: user.name,
        entreprisePic: user.profilePic,
        videoUrl: finalVideoUrl,
        rawVideoUrl: finalVideoUrl,
        title: formData.title,
        price: parseFloat(formData.price),
        discount: formData.discount ? parseFloat(formData.discount) : undefined,
        link: formData.link,
        category: formData.category,
        description: formData.description
      });

      // Automatically check for offensive content via the backend module 
      // which deletes it 30 sec later if flagged.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        fetch('/api/moderate-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData?.session?.access_token ? { 'Authorization': `Bearer ${sessionData.session.access_token}` } : {})
          },
          body: JSON.stringify({
            videoId: addedVideo.id,
            title: formData.title,
            description: formData.description
          })
        }).catch(modErr => console.error('Moderation queue failed:', modErr));
      } catch (e) {
        console.error('Failed to init moderation:', e);
      }

      navigate('/app/home');
    } catch (err: any) {
      console.error('Publish error:', err);
      // Display the actual error message from Supabase to help debugging
      setError(`Erreur lors de la publication: ${err?.message || 'Vérifiez la connexion.'}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)] max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('publish.title')}</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">{t('publish.limit.title')}</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              {t('publish.limit.desc').replace('{{limit}}', limit.toString())}
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                to="/app/premium"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold transition-all"
              >
                {t('publish.limit.upgrade')}
              </Link>
              <button 
                onClick={() => navigate('/app/home')}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-bold transition-all"
              >
                {t('publish.limit.wait')}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video Upload Zone */}
        <div className="relative w-full aspect-video bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl overflow-hidden group hover:border-purple-500 transition-colors">
          {videoPreview ? (
            <>
              <video 
                src={videoPreview} 
                className="w-full h-full object-cover" 
                controls 
                playsInline
                muted
                autoPlay
                loop
                onError={() => setError('Impossible de charger l\'aperçu de la vidéo. Le format n\'est peut-être pas supporté par votre appareil.')}
              />
              <button 
                type="button"
                onClick={() => {
                  if (videoPreview && !isImportedVideo) URL.revokeObjectURL(videoPreview);
                  setVideoFile(null);
                  setVideoPreview('');
                  setIsImportedVideo(false);
                }}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : hasAccess ? (
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
              <Upload className="w-12 h-12 text-zinc-500 group-hover:text-purple-500 mb-4 transition-colors" />
              <p className="text-zinc-400 font-medium">{t('publish.clickToUpload')}</p>
              <p className="text-zinc-500 text-sm mt-2">Maximum 60 secondes donc 1 minute, format MP4</p>
              <p className="text-zinc-500 text-sm">Max 50Mo. Qualité min 720p. Si &gt; 50Mo, veuillez compresser la vidéo.</p>
              <input 
                type="file" 
                accept="video/mp4,video/x-m4v,video/*" 
                className="hidden" 
                onChange={handleVideoChange}
              />
            </label>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
              <p className="text-zinc-300 font-medium">Abonnement Premium Requis</p>
              <p className="text-zinc-500 text-sm mt-2">
                Vous n'avez pas l'abonnement standard pour importer des vidéos depuis votre appareil. {/* Vous pouvez publier des vidéos générées par IA via Vionify Video IA. */}
              </p>
              {/* <button 
                type="button"
                onClick={() => navigate('/app/video-ia')}
                className="mt-4 px-4 py-2 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                Générer avec l'IA
              </button> */}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.videoTitle')}</label>
            <input
              type="text"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.price')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.discount')}</label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.link')}</label>
            <input
              type="url"
              required
              placeholder="https://..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.category')}</label>
            <select
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors appearance-none"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="" disabled>Sélectionner une catégorie</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.desc')}</label>
            <textarea
              required
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('publish.uploading')}
            </>
          ) : (
            t('publish.submit')
          )}
        </button>
      </form>
    </div>
  );
}
