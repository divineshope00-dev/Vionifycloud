import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Search as SearchIcon, Lock, Play, ExternalLink, ThumbsUp, ShoppingBag, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db, User, Video, getBunnyUrl, VideoQuality } from '../services/supabaseService';
import { canAccessContent } from '../utils/subscription';
import { useLanguage } from '../contexts/LanguageContext';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

const SearchVideo: React.FC<{ video: Video, hasAccess: boolean, onClick: () => void, onLike: (e: React.MouseEvent, id: string) => void, user: User, quality?: VideoQuality }> = ({ video, hasAccess, onClick, onLike, user, quality = '720p' }) => {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number>(0);
  let currentUrl = getBunnyUrl(video.rawVideoUrl, quality as VideoQuality);
  const isEntreprise = user?.type === 'entreprise';

  // Add time fragment to force thumbnail rendering
  if (currentUrl && !currentUrl.includes('#t=')) {
    currentUrl += '#t=0.001';
  }

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
        className="relative aspect-video bg-zinc-800 rounded-none md:rounded-xl overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        {currentUrl ? (
          <video 
            ref={videoRef}
            src={currentUrl} 
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
            {isEntreprise && video.products && video.products.length > 0 ? (
              <img 
                src={video.products[0].imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                alt="Product" 
                className="w-full h-full object-cover opacity-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                }} 
              />
            ) : (
              <Play className="w-12 h-12 text-zinc-700 fill-zinc-700/20" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-medium px-4 py-2 bg-black/60 rounded-lg backdrop-blur-sm">
                {isEntreprise ? "Collection de produits" : "Vionify"}
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
        
        {!hasAccess && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Lock className="w-12 h-12 text-purple-500" />
          </div>
        )}
        
        {video.videoUrl && duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
            {formatTime(duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex gap-3 px-4 md:px-0">
        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden shrink-0">
          {video.entreprisePic ? (
            <img src={video.entreprisePic} alt={video.entrepriseName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-purple-500 font-bold">
              {video.entrepriseName?.[0] || '?'}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 
              className="text-sm font-semibold text-white line-clamp-2 cursor-pointer"
              onClick={onClick}
            >
              {video.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={(e) => onLike(e, video.id)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${video.likedBy?.includes(user.id) ? 'text-purple-500' : 'text-zinc-400 hover:text-white'}`}
              >
                <ThumbsUp className={`w-3 h-3 ${video.likedBy?.includes(user.id) ? 'fill-current' : ''}`} />
                {video.likes}
              </button>
              <a 
                href={video.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (user?.isGuest) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('vionify-guest-warning', {
                      detail: {
                        title: language === 'fr' ? 'Découvrir' : 'Discover',
                        message: language === 'fr' 
                          ? "Le bouton Découvrir ne s'ouvre que pour ceux qui ont créé un compte. Créez votre compte particulier dès maintenant !"
                          : "The Discover button is only available for registered users. Create your individual account now!"
                      }
                    }));
                    return;
                  }
                  if (user.type === 'particulier') {
                    db.incrementVideoClicks(video.id, user.id);
                  } else {
                    db.incrementVideoClicks(video.id);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] px-2 py-1 rounded-full font-medium transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Découvrir
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Link 
                to={`/app/entreprise/${video.entrepriseId}`}
                className="hover:text-white transition-colors truncate"
              >
                {video.entrepriseName}
              </Link>
              <span>•</span>
              <span className="font-medium text-purple-400">{video.price}€</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Search() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const adaptiveQuality = useAdaptiveQuality();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasAccess = canAccessContent(user);

  useEffect(() => {
    let ignore = false;
    const handler = setTimeout(async () => {
      // Use the raw query but trim for database efficiency
      const searchTerm = query.trim();
      
      if (searchTerm.length > 0) {
        setIsLoading(true);
        try {
          // Perform search
          const searchResults = await db.searchVideos(searchTerm, user?.id);
          
          if (!ignore) {
            setResults(searchResults);
          }
        } catch (error) {
          console.error('Search UI error:', error);
          if (!ignore) setResults([]);
        } finally {
          if (!ignore) setIsLoading(false);
        }
      } else {
        setResults([]);
        setIsLoading(false);
      }
    }, 100); // Optimized for "instant" feel while maintaining stability

    return () => {
      ignore = true;
      clearTimeout(handler);
    };
  }, [query, user.id, user.type]);

  const handleLike = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (user?.isGuest) {
      window.dispatchEvent(new CustomEvent('vionify-guest-warning', {
        detail: {
          title: language === 'fr' ? 'Aimer la vidéo' : 'Like video',
          message: language === 'fr' 
            ? "Pour aimer des vidéos, créez un compte particulier. Créez votre compte particulier dès maintenant !"
            : "To like videos, please create an individual account. Create your account now!"
        }
      }));
      return;
    }
    if (!hasAccess) {
      navigate('/app/premium');
      return;
    }

    // Optimistic update
    setResults(currentResults => currentResults.map(v => {
      if (v.id === videoId) {
        const isLiked = v.likedBy?.includes(user.id);
        const newLikedBy = isLiked 
          ? (v.likedBy || []).filter(id => id !== user.id)
          : [...(v.likedBy || []), user.id];
        return {
          ...v,
          likes: isLiked ? Math.max(0, v.likes - 1) : v.likes + 1,
          likedBy: newLikedBy
        };
      }
      return v;
    }));

    try {
      const updatedVideo = await db.toggleLike(user.id, videoId);
      if (updatedVideo) {
        setResults(currentResults => currentResults.map(v => 
          v.id === videoId ? { ...v, likes: updatedVideo.likes, likedBy: updatedVideo.likedBy } : v
        ));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  return (
    <div className="px-0 py-0 md:p-8 max-w-7xl mx-auto relative pb-24 md:pb-12">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 md:px-0 mb-6 border-b border-zinc-800 md:border-none">
        <h1 className="text-2xl font-bold mb-4">{t('search.title')}</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            autoFocus
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-6 px-0 md:px-0">
        {results.map((video, index) => (
          <SearchVideo 
            key={`${video.id}-${index}`} 
            video={video} 
            hasAccess={hasAccess} 
            onClick={() => hasAccess ? navigate(`/app/video/${video.id}`) : navigate('/app/premium')} 
            onLike={handleLike} 
            user={user} 
            quality={adaptiveQuality}
          />
        ))}
      </div>

      {query.trim() && results.length === 0 && !isLoading && (
        <div className="text-center py-20 text-zinc-500">
          {t('search.noResults')}
        </div>
      )}
    </div>
  );
}
