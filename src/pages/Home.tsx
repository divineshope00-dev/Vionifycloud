import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { Lock, Play, MoreVertical, Trash2, Edit, ExternalLink, ThumbsUp, Search as SearchIcon, X, Loader2, ChevronLeft, ChevronRight, Upload, Image as ImageIcon, Plus, Volume2, VolumeX, ShoppingBag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db, User, Video, Product, getBunnyUrl, VideoQuality } from '../services/supabaseService';
import { canAccessContent } from '../utils/subscription';
import { useLanguage } from '../contexts/LanguageContext';
import { CATEGORIES } from '../constants';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

// Cache for particulier feed to preserve state across navigation
let cachedParticulierVideos: Video[] | null = null;
let cachedParticulierVisibleCount = 12;
let cachedParticulierScrollY = 0;

const FeedVideo: React.FC<{ 
  video: Video, 
  isEntreprise: boolean, 
  hasAccess: boolean, 
  onClick: () => void,
  isPlaying?: boolean,
  isMuted?: boolean,
  onToggleMute?: (e: React.MouseEvent) => void,
  viewerId?: string,
  quality?: VideoQuality
}> = ({ video, isEntreprise, hasAccess, onClick, isPlaying = false, isMuted = true, onToggleMute, viewerId, quality = '720p' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [hasTracked, setHasTracked] = useState(false);
  const currentUrl = getBunnyUrl(video.rawVideoUrl, quality as VideoQuality);

  useEffect(() => {
    // When quality changes, try to stay at the same time
    if (videoRef.current && isPlaying) {
      const time = videoRef.current.currentTime;
      const handleLoaded = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          videoRef.current.play().catch(() => {});
          videoRef.current.removeEventListener('loadedmetadata', handleLoaded);
        }
      };
      // We don't necessarily NEED to restore time for 2-second previews, 
      // but if the video is playing longer, it's better.
      // However, FeedVideo restarts on loop, so it's less critical.
    }
  }, [quality]);

  useEffect(() => {
    // Reset tracker when video changes or starts/stops playing
    setHasTracked(false);
  }, [video.id]);
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Auto-play was prevented
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setTimeLeft(Math.max(0, videoRef.current.duration - videoRef.current.currentTime));
      
      // Track meaningful view after 5 seconds
      if (!hasTracked && videoRef.current.currentTime >= 5 && viewerId) {
        setHasTracked(true);
        db.trackMonthlyClient(video.entrepriseId, viewerId);
      }
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

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleMute) {
      onToggleMute(e);
    }
  };

  return (
    <div 
      className="relative aspect-video bg-zinc-800 rounded-none md:rounded-xl overflow-hidden cursor-pointer group/video feed-video-container"
      data-video-id={video.id}
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
          preload={isPlaying ? "auto" : "none"}
          onTimeUpdate={handleTimeUpdate}
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
      
      {!hasAccess && !isEntreprise && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Lock className="w-12 h-12 text-purple-500" />
        </div>
      )}
      
      {!isEntreprise && video.videoUrl && (
        <button 
          onClick={handleToggleMute}
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

export default function Home() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const adaptiveQuality = useAdaptiveQuality();
  const isEntreprise = user.type === 'entreprise';
  const [videos, setVideos] = useState<Video[]>(!isEntreprise && cachedParticulierVideos ? cachedParticulierVideos : []);
  const [isLoading, setIsLoading] = useState(!isEntreprise && cachedParticulierVideos ? false : true);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    price: '',
    discount: '',
    link: '',
    category: '',
    description: ''
  });
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editVideoPreview, setEditVideoPreview] = useState<string>('');
  const [editProducts, setEditProducts] = useState<Array<{
    id: string;
    title: string;
    imageFile: File | null;
    imageUrl: string;
    link: string;
    price: string;
    discount: string;
  }>>([]);
  const [editError, setEditError] = useState('');
  const [isEditLoading, setIsEditLoading] = useState(false);
  const hasAccess = canAccessContent(user);

  // Menu and modal states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  // Video playback state
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const visibleVideosRef = useRef<Map<string, number>>(new Map());
  const viewedVideosRef = useRef<Set<string>>(new Set());

  // Infinite scroll & pull-to-refresh state
  const [visibleCount, setVisibleCount] = useState(!isEntreprise && cachedParticulierVisibleCount ? cachedParticulierVisibleCount : 12);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  useEffect(() => {
    if (playingVideoId && !viewedVideosRef.current.has(playingVideoId)) {
      viewedVideosRef.current.add(playingVideoId);
      db.incrementVideoViews(playingVideoId);
    }
  }, [playingVideoId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!isEntreprise && cachedParticulierVideos) {
        // We already set the initial state, just restore scroll position
        setTimeout(() => {
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTop = cachedParticulierScrollY;
          }
        }, 100);
        return;
      }

      setIsLoading(true);
      try {
        if (isEntreprise) {
          const data = await db.getVideosByEntreprise(user.id, user.id);
          setVideos((data as any).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else {
          const recommended = await db.getRecommendedVideos(user.id);
          const filtered = (recommended as any[])
            .filter(v => v.videoUrl && v.videoUrl.trim() !== '');
          const shuffled = shuffleArray(filtered);
          setVideos(shuffled);
          cachedParticulierVideos = shuffled;
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, [user.id, isEntreprise]);

  // Sync state to cache
  useEffect(() => {
    if (!isEntreprise) {
      cachedParticulierVideos = videos;
    }
  }, [videos, isEntreprise]);

  useEffect(() => {
    if (!isEntreprise) {
      cachedParticulierVisibleCount = visibleCount;
    }
  }, [visibleCount, isEntreprise]);

  // Track scroll position
  useEffect(() => {
    const mainElement = document.querySelector('main');
    const handleScroll = () => {
      if (!isEntreprise && mainElement) {
        cachedParticulierScrollY = mainElement.scrollTop;
      }
    };
    
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isEntreprise]);

  // Window focus state for pausing videos when tab is inactive or a link is opened
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Intersection Observer for auto-playing videos
  useEffect(() => {
    if (isEntreprise) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const videoId = entry.target.getAttribute('data-video-id');
          if (!videoId) return;

          if (entry.intersectionRatio > 0) {
            visibleVideosRef.current.set(videoId, entry.intersectionRatio);
          } else {
            visibleVideosRef.current.delete(videoId);
          }
        });

        let maxRatio = 0;
        let bestVideoId: string | null = null;
        
        visibleVideosRef.current.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            bestVideoId = id;
          }
        });

        if (bestVideoId && maxRatio > 0.3) {
          setPlayingVideoId(bestVideoId);
        } else if (visibleVideosRef.current.size === 0) {
          setPlayingVideoId(null);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1.0] }
    );

    const videoElements = document.querySelectorAll('.feed-video-container');
    videoElements.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [videos, visibleCount, isEntreprise]);

  // Set initial playing video
  useEffect(() => {
    if (!isEntreprise && videos.length > 0 && !playingVideoId && visibleVideosRef.current.size === 0) {
      setPlayingVideoId(videos[0].id);
    }
  }, [videos, isEntreprise, playingVideoId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [videos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEntreprise) return;
    const mainElement = document.querySelector('main');
    if (mainElement && mainElement.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isEntreprise || startY.current === 0) return;
    
    const y = e.touches[0].clientY;
    const dy = y - startY.current;
    
    if (dy > 0) {
      setPullY(Math.min(dy * 0.4, 80));
    } else {
      startY.current = 0;
      setPullY(0);
    }
  };

  const handleTouchEnd = () => {
    if (isEntreprise) return;
    
    if (pullY > 60 && !isRefreshing) {
      refreshFeed();
    } else {
      setPullY(0);
    }
    startY.current = 0;
  };

  const refreshFeed = async () => {
    setIsRefreshing(true);
    setPullY(60); // Keep spinner visible while refreshing
    
    try {
      const recommended = await db.getRecommendedVideos(user.id);
      const filtered = recommended.filter(v => v.videoUrl && v.videoUrl.trim() !== '');
      const shuffled = shuffleArray(filtered);
      setVideos(shuffled);
      setVisibleCount(12);
      if (!isEntreprise) {
        cachedParticulierVideos = shuffled;
        cachedParticulierVisibleCount = 12;
        cachedParticulierScrollY = 0;
      }
    } catch (err) {
      console.error('Failed to refresh feed:', err);
    } finally {
      setIsRefreshing(false);
      setPullY(0);
    }
  };

  const handleDeleteClick = (id: string) => {
    setVideoToDelete(id);
    setActiveMenuId(null);
  };

  const confirmDelete = async () => {
    if (videoToDelete) {
      try {
        await db.deleteVideo(videoToDelete);
        setVideos(videos.filter(v => v.id !== videoToDelete));
        setVideoToDelete(null);
      } catch (err) {
        console.error('Failed to delete video:', err);
      }
    }
  };

  const cancelDelete = () => {
    setVideoToDelete(null);
  };

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
        setVideos(currentVideos => currentVideos.map(v => v.id === videoId ? updatedVideo : v));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleEditClick = (video: Video) => {
    setEditingVideo(video);
    setEditVideoPreview(video.videoUrl || '');
    setEditVideoFile(null);
    setEditFormData({
      title: video.title || '',
      price: video.price !== undefined && video.price !== null ? video.price.toString() : '',
      discount: video.discount !== undefined && video.discount !== null ? video.discount.toString() : '',
      link: video.link || '',
      category: video.category || '',
      description: video.description || ''
    });
    setEditProducts(video.products ? video.products.map(p => ({
      id: p.id,
      title: p.title || '',
      imageFile: null,
      imageUrl: p.imageUrl || '',
      link: p.link || '',
      price: p.price !== undefined && p.price !== null ? p.price.toString() : '',
      discount: p.discount !== undefined && p.discount !== null ? p.discount.toString() : ''
    })) : []);
    setEditError('');
  };

  const handleEditVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setEditError('Veuillez sélectionner un fichier vidéo valide.');
        return;
      }
      setEditVideoFile(file);
      setEditVideoPreview(URL.createObjectURL(file) + '#t=0.1');
      setEditError('');
    }
  };

  const handleEditAddProduct = () => {
    if (editProducts.length >= 5) return;
    setEditProducts([...editProducts, {
      id: Math.random().toString(36).substring(7),
      title: '',
      imageFile: null,
      imageUrl: '',
      link: '',
      price: '',
      discount: ''
    }]);
  };

  const handleEditRemoveProduct = (id: string) => {
    setEditProducts(editProducts.filter(p => p.id !== id));
  };

  const handleEditProductChange = (id: string, field: string, value: any) => {
    setEditProducts(editProducts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleEditProductImageChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setEditError('Veuillez sélectionner une image valide pour le produit.');
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setEditProducts(editProducts.map(p => p.id === id ? { ...p, imageFile: file, imageUrl } : p));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    if (!editVideoPreview) {
      setEditError('Veuillez sélectionner une vidéo.');
      return;
    }

    for (const p of editProducts) {
      if (!p.title || !p.imageUrl || !p.link || !p.price) {
        setEditError('Veuillez remplir tous les champs obligatoires pour chaque produit (Titre, Image, Lien, Prix).');
        return;
      }
    }

    const formattedProducts: Product[] = [];
    for (const p of editProducts) {
      let finalProductImageUrl = p.imageUrl;
      
      // If there's a file, upload it to Supabase Storage
      if (p.imageFile) {
        const fileName = `${Date.now()}-product-${p.id}-${p.imageFile.name}`;
        finalProductImageUrl = await db.uploadFile('vionify-assets', `products/${fileName}`, p.imageFile);
      } else if (p.imageUrl.startsWith('data:')) {
        // Fallback for base64 if needed
        const response = await fetch(p.imageUrl);
        const blob = await response.blob();
        const fileName = `${Date.now()}-product-${p.id}.jpg`;
        finalProductImageUrl = await db.uploadFile('vionify-assets', `products/${fileName}`, blob);
      }

      formattedProducts.push({
        id: p.id,
        video_id: editingVideo.id,
        title: p.title,
        imageUrl: finalProductImageUrl,
        link: p.link,
        price: parseFloat(p.price),
        discount: p.discount ? parseFloat(p.discount) : undefined
      });
    }

    setIsEditLoading(true);
    try {
      let finalVideoUrl = editVideoPreview;
      if (editVideoFile) {
        const fileName = `${Date.now()}-${editVideoFile.name}`;
        finalVideoUrl = await db.uploadFile('vionify-assets', `videos/${fileName}`, editVideoFile);
      }

      const updatedVideo = await db.updateVideo(editingVideo.id, {
        videoUrl: finalVideoUrl,
        title: editFormData.title,
        price: parseFloat(editFormData.price),
        discount: editFormData.discount ? parseFloat(editFormData.discount) : undefined,
        link: editFormData.link,
        category: editFormData.category,
        description: editFormData.description,
        products: formattedProducts.length > 0 ? formattedProducts : undefined
      });

      if (updatedVideo) {
        setVideos(videos.map(v => v.id === updatedVideo.id ? updatedVideo : v));
      }
      setEditingVideo(null);
      setIsEditLoading(false);
    } catch (err) {
      setEditError('Failed to update video.');
      setIsEditLoading(false);
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const filteredVideos = selectedCategory 
    ? videos.filter(v => v.category === selectedCategory) 
    : videos;

  if (!hasAccess && isEntreprise) {
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

  return (
    <div 
      className="px-0 py-0 md:p-8 max-w-7xl mx-auto relative min-h-[100dvh] pb-12"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {!isEntreprise && (pullY > 0 || isRefreshing) && (
        <div 
          className="absolute left-0 right-0 flex justify-center z-50 transition-all duration-200 pointer-events-none"
          style={{ top: `${Math.max(pullY - 20, 16)}px`, opacity: Math.min(pullY / 40, 1) }}
        >
          <div className="bg-zinc-800 p-2 rounded-full shadow-xl border border-zinc-700">
            <Loader2 
              className={`w-6 h-6 text-purple-500 ${isRefreshing ? 'animate-spin' : ''}`} 
              style={{ transform: isRefreshing ? 'none' : `rotate(${pullY * 3}deg)` }} 
            />
          </div>
        </div>
      )}

      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between px-4 md:px-0">
          <h1 className="text-2xl font-bold">
            {isEntreprise ? t('home.title.entreprise') : t('home.title.particulier')}
          </h1>
          {!isEntreprise && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/app/shopping')}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors border border-zinc-800"
              >
                <ShoppingBag className="w-5 h-5 text-zinc-400" />
              </button>
              <button 
                onClick={() => navigate('/app/search')}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors border border-zinc-800"
              >
                <SearchIcon className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          )}
        </div>

        {!isEntreprise && (
          <div className="relative group/categories px-4">
            {/* Left Arrow (Desktop only) */}
            <button 
              onClick={() => scrollCategories('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-900/90 text-white rounded-full items-center justify-center opacity-0 group-hover/categories:opacity-100 transition-opacity z-10 hidden md:flex hover:bg-zinc-800 border border-zinc-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div 
              ref={categoryScrollRef}
              className="flex overflow-x-auto gap-2 scrollbar-hide py-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  selectedCategory === null 
                    ? 'bg-purple-600 border-purple-600 text-white' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                Tous
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selectedCategory === cat
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Right Arrow (Desktop only) */}
            <button 
              onClick={() => scrollCategories('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-900/90 text-white rounded-full items-center justify-center opacity-0 group-hover/categories:opacity-100 transition-opacity z-10 hidden md:flex hover:bg-zinc-800 border border-zinc-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-6 px-0 md:px-0">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="group relative flex flex-col gap-3 animate-pulse">
              <div className="aspect-video bg-zinc-800 rounded-none md:rounded-xl" />
              <div className="space-y-2 px-4 md:px-0">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (
          filteredVideos.slice(0, visibleCount).map((video) => (
            <div key={video.id} className="group relative flex flex-col gap-3">
            {/* Thumbnail */}
            <FeedVideo 
              video={video} 
              isEntreprise={isEntreprise} 
              hasAccess={hasAccess} 
              onClick={() => {
                if (hasAccess) {
                  if (!isEntreprise) {
                    db.updateUserPreferences(user.id, video.category);
                  }
                  navigate(`/app/video/${video.id}`);
                } else {
                  navigate('/app/premium');
                }
              }} 
              isPlaying={!isEntreprise && isWindowFocused && playingVideoId === video.id}
              isMuted={isGlobalMuted}
              onToggleMute={() => setIsGlobalMuted(!isGlobalMuted)}
              viewerId={user.id}
              quality={adaptiveQuality}
            />

            {/* Products Carousel */}
            {video.products && video.products.length > 0 && (
              <div className="relative group/carousel px-4 md:px-0 pb-2">
                {/* Left Arrow (Desktop only) */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.parentElement?.querySelector('.carousel-content')?.scrollBy({ left: -200, behavior: 'smooth' });
                  }}
                  className="absolute left-4 md:left-0 top-12 -translate-y-1/2 w-8 h-8 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 hidden md:flex hover:bg-black"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="carousel-content flex overflow-x-auto gap-3 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {video.products.map((product) => {
                    const finalPrice = product.discount 
                      ? product.price * (1 - product.discount / 100) 
                      : product.price;
                    
                    return (
                      <div key={product.id} className="shrink-0 w-24 snap-start group/product">
                        <a 
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block w-24 h-24 rounded-lg overflow-hidden shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user.type === 'particulier') {
                              db.incrementProductClicks(product.id, user.id);
                            } else {
                              db.incrementProductClicks(product.id);
                            }
                          }}
                        >
                          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover transition-transform group-hover/product:scale-110" />
                          
                          {/* Discount Badge */}
                          {product.discount && (
                            <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                              -{product.discount}%
                            </div>
                          )}
                          
                          {/* Price Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-6">
                            <div className="text-purple-400 font-bold text-xs text-center">
                              {finalPrice.toFixed(2)}€
                            </div>
                          </div>
                        </a>
                        <p className="text-xs text-zinc-300 mt-1.5 truncate text-center font-medium px-1" title={product.title}>
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
                    e.currentTarget.parentElement?.querySelector('.carousel-content')?.scrollBy({ left: 200, behavior: 'smooth' });
                  }}
                  className="absolute right-4 md:right-0 top-12 -translate-y-1/2 w-8 h-8 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 hidden md:flex hover:bg-black"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Info */}
            <div className="flex gap-3 px-4 md:px-0">
              {!isEntreprise && (
                <div 
                  className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/entreprise/${video.entrepriseId}`);
                  }}
                >
                  {video.entreprisePic ? (
                    <img src={video.entreprisePic} alt={video.entrepriseName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-500 font-bold">
                      {video.entrepriseName[0]}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 
                    className="text-sm font-semibold text-white line-clamp-2 cursor-pointer"
                    onClick={() => hasAccess ? navigate(`/app/video/${video.id}`) : navigate('/app/premium')}
                  >
                    {video.title}
                  </h3>
                  {!isEntreprise && (
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
                        className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] px-2 py-1 rounded-full font-medium transition-colors flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (user.type === 'particulier') {
                            db.incrementVideoClicks(video.id, user.id);
                          } else {
                            db.incrementVideoClicks(video.id);
                          }
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t('home.discover')}
                      </a>
                    </div>
                  )}
                </div>
                {!isEntreprise && (
                  <div className="flex items-center gap-2 mt-1">
                    <p 
                      className="text-xs text-zinc-400 truncate cursor-pointer hover:text-zinc-300 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/entreprise/${video.entrepriseId}`);
                      }}
                    >
                      {video.entrepriseName}
                    </p>
                    {video.entrepriseMonthlyClients !== undefined && video.entrepriseMonthlyClients > 0 && (
                      <div className="flex items-center gap-0.5 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20 shrink-0">
                        <span className="text-[9px] font-bold text-purple-500">{video.entrepriseMonthlyClients}</span>
                        <span className="text-[9px] font-semibold text-purple-500">clients mensuels</span>
                      </div>
                    )}
                  </div>
                )}
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

              {isEntreprise && (
                <div className="relative menu-container">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === video.id ? null : video.id);
                    }}
                    className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {activeMenuId === video.id && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-800 rounded-lg shadow-xl z-10 overflow-hidden border border-zinc-700">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          handleEditClick(video);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" /> {t('home.edit')}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(video.id);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition-colors border-t border-zinc-700/50"
                      >
                        <Trash2 className="w-4 h-4" /> {t('home.delete')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )))}
      </div>

      {/* Infinite Scroll Observer Target */}
      {videos.length > visibleCount && (
        <div ref={observerTarget} className="h-20 flex items-center justify-center mt-4">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {videos.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          {isEntreprise ? t('home.empty.entreprise') : t('home.empty.particulier')}
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-800">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">{t('edit.title')}</h2>
              <button 
                onClick={() => setEditingVideo(null)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-4 md:p-6 space-y-6">
              {editError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
                  {editError}
                </div>
              )}

              {/* Video Upload Zone */}
              <div className="relative w-full aspect-video bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-2xl overflow-hidden group hover:border-purple-500 transition-colors">
                {editVideoPreview ? (
                  <>
                    <video src={editVideoPreview} className="w-full h-full object-cover" controls />
                    <button 
                      type="button"
                      onClick={() => {
                        setEditVideoFile(null);
                        setEditVideoPreview('');
                      }}
                      className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-12 h-12 text-zinc-500 group-hover:text-purple-500 mb-4 transition-colors" />
                    <p className="text-zinc-400 font-medium">Cliquez pour ajouter une vidéo</p>
                    <input 
                      type="file" 
                      accept="video/mp4,video/x-m4v,video/*" 
                      className="hidden" 
                      onChange={handleEditVideoChange}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.videoTitle')}</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.price')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.discount')}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    value={editFormData.discount}
                    onChange={(e) => setEditFormData({ ...editFormData, discount: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.link')}</label>
                  <input
                    type="url"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    value={editFormData.link}
                    onChange={(e) => setEditFormData({ ...editFormData, link: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('publish.category')}</label>
                  <select
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors appearance-none"
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
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
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Products Section */}
              <div className="border-t border-zinc-800 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Produits associés</h3>
                    <p className="text-sm text-zinc-500">Modifiez ou ajoutez jusqu'à 5 images de produits.</p>
                  </div>
                  {editProducts.length < 5 && (
                    <button
                      type="button"
                      onClick={handleEditAddProduct}
                      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un produit
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {editProducts.map((product, index) => (
                    <div key={product.id} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 relative">
                      <button
                        type="button"
                        onClick={() => handleEditRemoveProduct(product.id)}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      
                      <h4 className="font-medium mb-4">Produit {index + 1}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Image Upload */}
                        <div className="md:col-span-3">
                          <div className="relative w-full aspect-square bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-xl overflow-hidden group hover:border-purple-500 transition-colors">
                            {product.imageUrl ? (
                              <>
                                <img src={product.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                  <ImageIcon className="w-6 h-6 text-white" />
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleEditProductImageChange(product.id, e)}
                                  />
                                </label>
                              </>
                            ) : (
                              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                                <ImageIcon className="w-8 h-8 text-zinc-500 group-hover:text-purple-500 mb-2 transition-colors" />
                                <span className="text-xs text-zinc-500">Image requise</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleEditProductImageChange(product.id, e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Titre du produit *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: T-shirt noir"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                              value={product.title}
                              onChange={(e) => handleEditProductChange(product.id, 'title', e.target.value)}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Lien du produit *</label>
                            <input
                              type="url"
                              required
                              placeholder="https://..."
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                              value={product.link}
                              onChange={(e) => handleEditProductChange(product.id, 'link', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Prix (€) *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                              value={product.price}
                              onChange={(e) => handleEditProductChange(product.id, 'price', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Réduction (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                              value={product.discount}
                              onChange={(e) => handleEditProductChange(product.id, 'discount', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="flex-1 py-3 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  {t('edit.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isEditLoading}
                  className="flex-1 py-3 rounded-xl font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isEditLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('common.processing') || 'Enregistrement...'}
                    </>
                  ) : (
                    t('edit.save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md p-6 border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-center mb-2">{t('home.deleteConfirm') || 'Supprimer la vidéo ?'}</h2>
            <p className="text-zinc-400 text-center mb-6">
              Cette action est irréversible. La vidéo et tous les produits associés seront supprimés de la plateforme.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 py-3 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
