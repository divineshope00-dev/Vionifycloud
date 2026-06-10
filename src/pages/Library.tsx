import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { Lock, Play, MoreVertical, Trash2, Edit, HeartOff, ShoppingBag, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db, User, Video, getBunnyUrl, VideoQuality } from '../services/supabaseService';
import { canAccessContent } from '../utils/subscription';
import { useLanguage } from '../contexts/LanguageContext';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

const LibraryVideo: React.FC<{ video: Video, user: User, onClick: () => void, onRemove: (id: string) => void, quality?: VideoQuality }> = ({ video, user, onClick, onRemove, quality = '720p' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const currentUrl = getBunnyUrl(video.rawVideoUrl, quality as VideoQuality);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="group relative flex flex-col gap-3">
      {/* Thumbnail */}
      <div 
        className="relative aspect-video bg-zinc-800 rounded-xl overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        {currentUrl ? (
          <video 
            ref={videoRef}
            src={currentUrl} 
            className="w-full h-full object-cover"
            muted
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
            {video.products && video.products.length > 0 ? (
              <img src={video.products[0].imageUrl} alt="Product" className="w-full h-full object-cover opacity-50" />
            ) : (
              <ShoppingBag className="w-12 h-12 text-zinc-700" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-medium px-4 py-2 bg-black/60 rounded-lg backdrop-blur-sm">
                Collection de produits
              </span>
            </div>
          </div>
        )}
        
        {video.videoUrl && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-5 h-5 text-white ml-1" />
            </div>
          </div>
        )}
        
        {video.videoUrl && duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
            {formatTime(duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden shrink-0">
          {video.entreprisePic ? (
            <img src={video.entreprisePic} alt={video.entrepriseName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-purple-500 font-bold">
              {video.entrepriseName[0]}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 
            className="text-sm font-semibold text-white line-clamp-2 cursor-pointer"
            onClick={onClick}
          >
            {video.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 truncate">{video.entrepriseName}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
            <span className="font-medium text-purple-400">{video.price}€</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
          </div>
          <div className="mt-2">
            <a 
              href={video.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                if (user.type === 'particulier') {
                  db.incrementVideoClicks(video.id, user.id);
                } else {
                  db.incrementVideoClicks(video.id);
                }
              }}
              className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] px-2 py-1 rounded-full font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Découvrir
            </a>
          </div>
        </div>

        <div className="shrink-0 flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove(video.id);
            }}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-red-400 hover:text-red-300"
            title="Retirer des favoris"
          >
            <HeartOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Library() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const adaptiveQuality = useAdaptiveQuality();
  const [favorites, setFavorites] = useState<Video[]>([]);
  const hasAccess = canAccessContent(user);

  useEffect(() => {
    const loadFavorites = async () => {
      if (user.type === 'particulier') {
        const favs = await db.getFavorites(user.id);
        setFavorites(favs.filter(v => v.videoUrl && v.videoUrl.trim() !== ''));
      }
    };
    loadFavorites();
  }, [user.id, user.type]);

  const handleRemoveFavorite = async (videoId: string) => {
    await db.toggleFavorite(user.id, videoId);
    setFavorites(favorites.filter(v => v.id !== videoId));
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-purple-500 font-bold text-6xl mb-6">V</div>
        <h2 className="text-2xl font-bold mb-4">{t('paywall.title')}</h2>
        <p className="text-zinc-400 mb-8">{t('paywall.desc.particulier')}</p>
        <Link 
          to="/app/premium"
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-8 rounded-full transition-all"
        >
          {t('paywall.button')}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)] max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
        <h1 className="text-2xl font-bold">{t('library.title')}</h1>
        <span className="text-sm text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
          {t('library.expireNote')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {favorites.map((video) => (
          <LibraryVideo 
            key={video.id} 
            video={video} 
            user={user}
            onClick={() => navigate(`/app/video/${video.id}`)} 
            onRemove={handleRemoveFavorite} 
            quality={adaptiveQuality}
          />
        ))}
      </div>

      {favorites.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          {t('library.empty')}
        </div>
      )}
    </div>
  );
}
