import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Lock, Play, ExternalLink, ThumbsUp, ArrowLeft, Volume2, VolumeX, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db, User, Video, getBunnyUrl, VideoQuality } from '../services/supabaseService';
import { canAccessContent } from '../utils/subscription';
import { useLanguage } from '../contexts/LanguageContext';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

const FeedVideo: React.FC<{ video: Video, hasAccess: boolean, onClick: () => void, quality?: VideoQuality, isEntreprise?: boolean }> = ({ video, hasAccess, onClick, quality = '720p', isEntreprise = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(true);
  let currentUrl = getBunnyUrl(video.rawVideoUrl, quality as VideoQuality);

  // Add time fragment to force thumbnail rendering on mobile/Safari
  if (currentUrl && !currentUrl.includes('#t=')) {
    currentUrl += '#t=0.001';
  }

  useEffect(() => {
    // When quality changes, try to stay at the same time
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      const handleLoaded = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          videoRef.current.play().catch(() => {});
          videoRef.current.removeEventListener('loadedmetadata', handleLoaded);
        }
      };
      // For auto-playing previews
    }
  }, [quality]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setTimeLeft(Math.max(0, videoRef.current.duration - videoRef.current.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setTimeLeft(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <div 
      className="relative aspect-video bg-zinc-800 rounded-none md:rounded-xl overflow-hidden cursor-pointer group/video"
      onClick={onClick}
    >
      {currentUrl ? (
        <video 
          ref={videoRef}
          src={currentUrl} 
          className="w-full h-full object-cover"
          playsInline
          loop
          muted={isMuted}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
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
      
      {!hasAccess && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Lock className="w-12 h-12 text-purple-500" />
        </div>
      )}
      
      {video.videoUrl && (
        <button 
          onClick={toggleMute}
          className="absolute top-2 left-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors z-10"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}

      {video.videoUrl && (
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium z-10">
          {formatTime(timeLeft)}
        </div>
      )}
    </div>
  );
};

export default function EntrepriseProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const adaptiveQuality = useAdaptiveQuality();
  const isEntreprise = user?.type === 'entreprise';
  
  const [entreprise, setEntreprise] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [monthlyClients, setMonthlyClients] = useState<number>(0);
  const hasAccess = canAccessContent(user);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    
    const loadData = async () => {
      if (!id) return;
      
      const foundUser = await db.getUser(id);
      if (foundUser && foundUser.type === 'entreprise') {
        setEntreprise(foundUser);
        
        // Use subscription for real-time monthly clients
        subscription = db.subscribeToMonthlyClients(id, (count) => {
          setMonthlyClients(count);
        });

        const entrepriseVideos = await db.getVideosByEntreprise(id, user.id);
        setVideos(entrepriseVideos);
        
        // Update Open Graph meta tags for sharing
        const title = `Vionify - ${foundUser.name}`;
        const description = `Découvrez les vidéos et produits de ${foundUser.name} sur Vionify !`;
        const image = foundUser.profilePic || '';
        
        document.title = title;
        
        const setMetaTag = (property: string, content: string) => {
          let meta = document.querySelector(`meta[property="${property}"]`);
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', content);
        };
        
        setMetaTag('og:title', title);
        setMetaTag('og:description', description);
        if (image) setMetaTag('og:image', image);
        setMetaTag('og:url', window.location.href);
        setMetaTag('og:type', 'profile');
      } else {
        navigate('/app/home');
      }
    };
    loadData();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [id, navigate, user.id]);

  const handleLike = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (!hasAccess) {
      navigate('/app/premium');
      return;
    }
    
    // Optimistic update
    setVideos(currentVideos => currentVideos.map(v => {
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
        setVideos(currentVideos => currentVideos.map(v => 
          v.id === videoId ? { ...v, likes: updatedVideo.likes, likedBy: updatedVideo.likedBy } : v
        ));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  if (!entreprise) return <div className="p-8 text-center text-zinc-500">{t('app.loading')}</div>;

  return (
    <div className="px-0 py-0 md:p-8 max-w-7xl mx-auto relative">
      {/* Back Button */}
      <div className="px-4 md:px-0 mb-6 mt-4 md:mt-0">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('app.back')}
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-zinc-900 md:rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center gap-6 border-b md:border border-zinc-800">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-zinc-800 overflow-hidden shrink-0 border-4 border-zinc-950 shadow-xl">
          {entreprise.profilePic ? (
            <img src={entreprise.profilePic} alt={entreprise.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-purple-500 font-bold text-4xl">
              {entreprise.name[0]}
            </div>
          )}
        </div>
        <div className="text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{entreprise.name}</h1>
            <div className="flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              <span className="text-sm font-bold text-purple-500">{monthlyClients}</span>
              <span className="text-xs font-semibold text-purple-500">clients mensuels</span>
            </div>
          </div>
          <p className="text-zinc-400">{videos.length} {videos.length > 1 ? t('entreprise.videosCountPlural') : t('entreprise.videosCountSingle')}</p>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-6 px-0 md:px-0">
        {videos.map((video) => (
          <div key={video.id} className="group relative flex flex-col gap-3">
            {/* Thumbnail */}
            <FeedVideo 
              video={video} 
              hasAccess={hasAccess} 
              onClick={() => hasAccess ? navigate(`/app/video/${video.id}`) : navigate('/app/premium')} 
              quality={adaptiveQuality}
              isEntreprise={isEntreprise}
            />

            {/* Products Carousel */}
            {isEntreprise && video.products && video.products.length > 0 && (
              <div className="relative group/carousel px-4 md:px-0 pb-4">
                {/* Left Arrow (Desktop only) */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.parentElement?.querySelector('.carousel-content')?.scrollBy({ left: -240, behavior: 'smooth' });
                  }}
                  className="absolute left-4 md:left-2 top-14 -translate-y-1/2 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 hidden md:flex hover:bg-black shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
  
                <div className="carousel-content flex overflow-x-auto gap-4 scrollbar-hide snap-x pt-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {video.products.map((product) => {
                    const finalPrice = product.discount 
                      ? product.price * (1 - product.discount / 100) 
                      : product.price;
                    
                    return (
                      <div key={product.id} className="shrink-0 w-28 snap-start group/product">
                        <a 
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block w-28 h-28 rounded-xl overflow-hidden shadow-xl border border-white/5 bg-zinc-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user.type === 'particulier') {
                              db.incrementProductClicks(product.id, user.id);
                            } else {
                              db.incrementProductClicks(product.id);
                            }
                          }}
                        >
                          <img 
                            src={product.imageUrl || 'https://images.unsplash.com/photo-1417325384643-aac51acc9e5d?w=400&q=80'} 
                            alt={product.title} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/product:scale-110" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1417325384643-aac51acc9e5d?w=400&q=80';
                            }}
                          />
                          
                          {/* Discount Badge */}
                          {product.discount && product.discount > 0 && (
                            <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">
                              -{product.discount}%
                            </div>
                          )}
                          
                          {/* Price Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2 pt-8 z-10">
                            <div className="text-purple-400 font-bold text-sm text-center drop-shadow-md">
                              {finalPrice.toFixed(2)}€
                            </div>
                          </div>
  
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover/product:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover/product:translate-y-0 transition-transform">
                              Voir l'article
                            </div>
                          </div>
                        </a>
                        <p className="text-[11px] text-zinc-300 mt-2 truncate text-center font-medium px-1" title={product.title}>
                          {product.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
  
                {/* Right Arrow (Desktop only) */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.parentElement?.querySelector('.carousel-content')?.scrollBy({ left: 240, behavior: 'smooth' });
                  }}
                  className="absolute right-4 md:right-2 top-14 -translate-y-1/2 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 hidden md:flex hover:bg-black shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Info */}
            <div className="flex gap-3 px-4 md:px-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 
                    className="text-sm font-semibold text-white line-clamp-2 cursor-pointer"
                    onClick={() => hasAccess ? navigate(`/app/video/${video.id}`) : navigate('/app/premium')}
                  >
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => handleLike(e, video.id)}
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
                      {t('home.discover')}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="font-medium text-purple-400">
                      {video.price}€
                      {video.discount && <span className="text-red-400 ml-1">-{video.discount}%</span>}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          {t('entreprise.noVideos')}
        </div>
      )}
    </div>
  );
}
