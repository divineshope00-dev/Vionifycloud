import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Heart, MessageSquare, Share2, ThumbsUp, ExternalLink, Play, ChevronLeft, ChevronRight, ShoppingBag, MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db, User, Video, Comment, getBunnyUrl, VideoQuality, Product } from '../services/supabaseService';
import { canAccessContent } from '../utils/subscription';
import { useLanguage } from '../contexts/LanguageContext';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

const SidebarVideo: React.FC<{ v: Video, onClick: () => void }> = ({ v, onClick }) => {
  const thumbUrl = v.rawVideoUrl ? `${getBunnyUrl(v.rawVideoUrl, '480p')}#t=0.001` : null;

  return (
    <div 
      className="group relative flex flex-col gap-3 cursor-pointer mb-4"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-zinc-800 rounded-xl overflow-hidden">
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
          {thumbUrl ? (
            <video 
              src={thumbUrl}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
              playsInline
            />
          ) : v.products && v.products.length > 0 ? (
            <img 
              src={v.products[0].imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
              alt="Product" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
              }} 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-black flex items-center justify-center">
               <span className="text-purple-500/50 font-bold text-lg">{v.title.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-4 h-4 text-white ml-1" />
          </div>
        </div>
      </div>
      <div className="flex gap-3 px-2">
        <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
          {v.entreprisePic ? (
            <img src={v.entreprisePic} alt={v.entrepriseName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-purple-500 font-bold">
              {v.entrepriseName?.[0] || '?'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
            {v.title}
          </h4>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-zinc-400 truncate">{v.entrepriseName}</p>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-medium text-purple-400">{v.price}€</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VideoDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId?.trim();
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const adaptiveQuality = useAdaptiveQuality();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [commentUsers, setCommentUsers] = useState<Record<string, User>>({});
  const [monthlyClients, setMonthlyClients] = useState<number>(0);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [hasTrackedMeaningfulView, setHasTrackedMeaningfulView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupSubscription = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Reset tracking state and cleanup subscription when video ID changes
    setHasTrackedMeaningfulView(false);
    setMonthlyClients(0);
    
    return () => {
      if (cleanupSubscription.current) {
        cleanupSubscription.current();
        cleanupSubscription.current = null;
      }
    };
  }, [id]);

  useEffect(() => {
    if (video) {
      // Rebuild URL with current adaptive quality
      const newUrl = getBunnyUrl(video.rawVideoUrl, adaptiveQuality);
      
      if (newUrl !== currentVideoUrl) {
        // Switch quality
        const currentTime = videoRef.current?.currentTime || 0;
        const wasPlaying = videoRef.current ? !videoRef.current.paused : false;
        
        setCurrentVideoUrl(newUrl);
        
        const handleRestore = () => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentTime;
            if (wasPlaying && isWindowFocused) {
              videoRef.current.play().catch(() => {});
            }
            videoRef.current.removeEventListener('loadedmetadata', handleRestore);
          }
        };
        
        if (videoRef.current) {
          videoRef.current.addEventListener('loadedmetadata', handleRestore);
        }
      }
    }
  }, [adaptiveQuality, video?.rawVideoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      if (isWindowFocused) {
        if (currentVideoUrl) {
          videoRef.current.play().catch(() => {
            if (videoRef.current) {
               videoRef.current.muted = true;
               videoRef.current.play().catch(() => {});
            }
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isWindowFocused, currentVideoUrl]);

  const handleTimeUpdate = () => {
    const videoElem = videoRef.current;
    if (videoElem && !hasTrackedMeaningfulView && video) {
      if (videoElem.currentTime >= 5) {
        setHasTrackedMeaningfulView(true);
        db.trackMonthlyClient(video.entrepriseId, user.id);
      }
    }
  };

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

  useEffect(() => {
    if (videoRef.current) {
      if (isWindowFocused) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isWindowFocused]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (!canAccessContent(user)) {
        navigate('/app/premium');
        return;
      }

      try {
        if (!id) {
          console.error('No video ID provided');
          return;
        }

        const found = await db.getVideo(id, user.id);
        
        if (found) {
          await db.incrementVideoViews(id);
          setVideo(found);
          setCurrentVideoUrl(getBunnyUrl(found.rawVideoUrl, adaptiveQuality));
          setLikes(found.likes);
          setIsLiked(found.likedBy?.includes(user.id) || false);
          
          // Use subscription for real-time monthly clients count
          const subscription = db.subscribeToMonthlyClients(found.entrepriseId, (count) => {
            setMonthlyClients(count);
          });
          
          // Cleanup subscription when video or component changes
          cleanupSubscription.current = () => subscription.unsubscribe();
          
          // Update Open Graph meta tags for sharing
          const searchParams = new URLSearchParams(window.location.search);
          const productId = searchParams.get('product');
          const sharedProduct = productId && found.products ? found.products.find(p => p.id === productId) : null;
          
          const title = sharedProduct ? `Vionify - ${sharedProduct.title}` : `Vionify - ${found.title}`;
          const description = sharedProduct ? `Découvrez ce produit sur Vionify` : found.description;
          const image = sharedProduct ? sharedProduct.imageUrl : (found.products && found.products.length > 0 ? found.products[0].imageUrl : '');
          
          document.title = title;
          
          // Helper to update or create meta tags
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
          setMetaTag('og:type', 'video.other');
          if (found.videoUrl && !sharedProduct) {
             setMetaTag('og:video', found.videoUrl);
          }
          
          try {
            const [fav, videoComments, related, allProducts] = await Promise.all([
              db.isFavorite(user.id, found.id).catch(() => false),
              db.getComments(found.id).catch(() => []),
              db.getVideos().then(videos => 
                videos.filter(v => v.id !== found.id && v.entrepriseId !== user.id && (v.category === found.category || (found.title && v.title.includes(found.title.split(' ')[0])))).slice(0, 5)
              ).catch(() => []),
              db.getAllProducts().then(products => {
                // Return a few random products that are NOT the ones already in the video
                const videoProductIds = new Set(found.products?.map(p => p.id) || []);
                return products
                  .filter(p => !videoProductIds.has(p.id))
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 8);
              }).catch(() => [])
            ]);

            setIsFavorite(fav);
            setComments(videoComments);
            setRelatedVideos(related);
            setRecommendedProducts(allProducts);

            // Fetch users for comments
            if (videoComments.length > 0) {
              const userIds = Array.from(new Set(videoComments.map(c => c.userId))) as string[];
              const usersData = await Promise.all(userIds.map(uid => db.getUser(uid).catch(() => null)));
              const usersMap: Record<string, User> = {};
              usersData.forEach(u => {
                if (u) usersMap[u.id] = u;
              });
              setCommentUsers(usersMap);
            }
          } catch (secondaryError) {
            console.error('Error loading secondary data:', secondaryError);
            // Don't navigate away if we already have the video
          }
        } else {
          console.error(`Video with ID ${id} not found in database`);
          navigate('/app/home');
        }
      } catch (error) {
        console.error('Error loading video details:', error);
        navigate('/app/home');
      }
    };

    loadData();
  }, [id, user, navigate]);

  if (!video) return <div className="p-8 text-center text-zinc-500">{t('app.loading')}</div>;

  const handleFavorite = async () => {
    if (!video) return;
    
    // Optimistic UI update
    const previousFavorite = isFavorite;
    setIsFavorite(!previousFavorite);

    try {
      await db.toggleFavorite(user.id, video.id);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Revert on error
      setIsFavorite(previousFavorite);
    }
  };

  const handleLike = async () => {
    if (!video) return;
    
    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const updatedVideo = await db.toggleLike(user.id, video.id);
      if (updatedVideo) {
        setLikes(updatedVideo.likes);
        const liked = await db.isLiked(user.id, video.id);
        setIsLiked(liked);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikes(prev => !newIsLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/video/${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vionify - ${video.title}`,
          text: `Découvrez cette vidéo sur Vionify : ${video.title}`,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papiers !');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !video) return;

    const commentText = newComment.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      videoId: video.id,
      userId: user.id,
      userName: user.name,
      text: commentText,
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update
    setComments([optimisticComment, ...comments]);
    setNewComment('');

    if (!commentUsers[user.id]) {
      setCommentUsers(prev => ({ ...prev, [user.id]: user }));
    }

    try {
      const comment = await db.addComment({
        videoId: video.id,
        userId: user.id,
        userName: user.name,
        text: commentText
      });
      // Replace optimistic comment with the real one
      setComments(prev => prev.map(c => c.id === tempId ? comment : c));
    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert optimistic update on failure
      setComments(prev => prev.filter(c => c.id !== tempId));
    }
  };

  const handleEditCommentSubmit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    const newText = editingCommentText.trim();
    const originalComment = comments.find(c => c.id === commentId);

    // Optimistic UI update
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, text: newText } : c));
    setEditingCommentId(null);
    setEditingCommentText('');
    setActiveCommentMenuId(null);

    try {
      await db.updateComment(commentId, newText);
    } catch (error) {
      console.error('Error updating comment:', error);
      // Revert on failure
      if (originalComment) {
        setComments(prev => prev.map(c => c.id === commentId ? originalComment : c));
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const commentToDelete = comments.find(c => c.id === commentId);
    // Optimistic UI update
    setComments(prev => prev.filter(c => c.id !== commentId));
    setActiveCommentMenuId(null);

    try {
      await db.deleteComment(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Revert on failure
      if (commentToDelete) {
        setComments(prev => [commentToDelete, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    }
  };

  const relatedVideosContent = (
    <>
      <h3 className="font-bold text-lg mb-2">{t('video.similar')}</h3>
      {relatedVideos.map(v => (
        <SidebarVideo 
          key={v.id} 
          v={v} 
          onClick={() => {
            if (user.type === 'particulier') {
              db.updateUserPreferences(user.id, v.category);
            }
            navigate(`/app/video/${v.id}`);
          }} 
        />
      ))}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-0 md:p-6 pb-24 md:pb-12">
      {/* Main Content Area (Video + Info) */}
      <div className="flex-1 min-w-0">
        {/* Sticky Header: Video + Products */}
        <div className="sticky top-0 z-40 bg-black pb-2 md:pb-4 transform-gpu border-b border-zinc-800 md:border-none pt-[env(safe-area-inset-top)]">
          {/* Video Player */}
          <div className="w-full aspect-video bg-black md:rounded-2xl overflow-hidden relative group shadow-lg">
            {currentVideoUrl ? (
              <video 
                ref={videoRef}
                src={currentVideoUrl} 
                controls 
                autoPlay 
                playsInline
                loop
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
                controlsList="nodownload"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                {video?.products && video.products.length > 0 ? (
                  <img 
                    src={video.products[0].imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                    alt="Product" 
                    className="w-full h-full object-contain opacity-50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                    }} 
                  />
                ) : (
                  <ShoppingBag className="w-16 h-16 text-zinc-700" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-medium px-6 py-3 bg-black/60 rounded-xl backdrop-blur-sm text-lg">
                    Collection de produits
                  </span>
                </div>
              </div>
            )}

            {/* Float Product Overlay */}
            {video?.products && video.products.length > 0 && (
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 pointer-events-none group-hover:pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100">
                {video.products.slice(0, 4).map((product, idx) => (
                  <a 
                    key={product.id || idx}
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-lg border-2 border-white/20 shadow-xl overflow-hidden bg-zinc-900 hover:scale-110 aspect-square transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user?.type === 'particulier') {
                        db.incrementProductClicks(product.id, user.id);
                      }
                    }}
                  >
                  <img 
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                    alt="" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('photo-1523275335684-37898b6baf30')) {
                        target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                      }
                    }} 
                  />
                  </a>
                ))}
                {video.products.length > 4 && (
                  <div className="w-12 h-12 rounded-lg border-2 border-white/20 bg-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-xl">
                    +{video.products.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Products Carousel (Below Video Area) */}
        {video.products && video.products.length > 0 && (
          <div className="relative group/carousel pt-6 pb-6 px-4 md:px-0 bg-zinc-950/50 border-b border-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-[0.2em] font-black text-purple-500">
                Découvrir les articles
              </h3>
            </div>
            {/* Left Arrow */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.parentElement?.querySelector('.carousel-content')?.scrollBy({ left: -250, behavior: 'smooth' });
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-20 hidden md:flex hover:bg-black shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="carousel-content flex overflow-x-auto gap-4 scrollbar-hide snap-x px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {video.products.map((product) => {
                return (
                  <div key={product.id} className="shrink-0 w-32 md:w-40 snap-start group/product relative">
                    {/* Product Share Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const url = `${window.location.origin}/app/video/${video.id}?product=${product.id}`;
                        if (navigator.share) {
                          navigator.share({
                            title: `Vionify - ${product.title}`,
                            text: `Découvrez ce produit sur Vionify : ${product.title}`,
                            url: url
                          }).catch(console.error);
                        } else {
                          navigator.clipboard.writeText(url);
                          alert('Lien copié dans le presse-papiers !');
                        }
                      }}
                      className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover/product:opacity-100 transition-opacity border border-white/10"
                      title="Partager ce produit"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <a 
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block aspect-square rounded-xl overflow-hidden shadow-lg bg-zinc-900 border border-white/5"
                      onClick={() => {
                        if (user?.type === 'particulier') {
                          db.incrementProductClicks(product.id, user.id);
                        } else {
                          db.incrementProductClicks(product.id);
                        }
                      }}
                    >
                      <img 
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                        alt={product.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/product:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80') {
                            target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                          }
                        }} 
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/product:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white text-purple-700 text-[8px] font-black px-3 py-1.5 rounded-full shadow-2xl transform translate-y-4 group-hover/product:translate-y-0 transition-transform duration-300 uppercase tracking-widest">
                          Ouvrir
                        </span>
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Right Arrow */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.parentElement?.querySelector('.carousel-content')?.scrollBy({ left: 250, behavior: 'smooth' });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all z-20 hidden md:flex hover:bg-purple-500 shadow-lg border border-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        <div className="px-4 md:px-0 mt-4 md:mt-6">
          {/* Video Info */}
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{video.title}</h1>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 cursor-pointer"
              onClick={() => user?.type === 'particulier' && navigate(`/app/entreprise/${video.entrepriseId}`)}
            >
              {video.entreprisePic ? (
                <img src={video.entreprisePic} alt={video.entrepriseName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-500 font-bold">
                  {video.entrepriseName?.[0] || '?'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 
                  className={`font-semibold text-white ${user?.type === 'particulier' ? 'cursor-pointer hover:text-purple-400 transition-colors' : ''}`}
                  onClick={() => user?.type === 'particulier' && navigate(`/app/entreprise/${video.entrepriseId}`)}
                >
                  {video.entrepriseName}
                </h3>
                <div className="flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  <span className="text-[10px] font-bold text-purple-500">{monthlyClients}</span>
                  <span className="text-[10px] font-semibold text-purple-500">clients mensuels</span>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <a 
              href={video.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full font-medium transition-colors"
              onClick={() => {
                if (user?.type === 'particulier') {
                  db.incrementVideoClicks(video.id, user.id);
                } else {
                  db.incrementVideoClicks(video.id);
                }
              }}
            >
              <ExternalLink className="w-4 h-4" />
              {t('home.discover')}
            </a>
            
            <div className="flex items-center bg-zinc-800 rounded-full overflow-hidden">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 transition-colors border-r border-zinc-700 ${isLiked ? 'text-purple-500' : ''}`}
              >
                <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{likes}</span>
              </button>
            </div>

            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">{t('video.share')}</span>
            </button>

            <button 
              onClick={handleFavorite}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${isFavorite ? 'bg-purple-500/20 text-purple-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium hidden sm:inline">{t('video.favorite')}</span>
            </button>
          </div>
        </div>

        {/* Description Box */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-lg font-bold text-white">{video.price}€</span>
            {video.discount && (
              <span className="text-sm text-purple-400 font-medium bg-purple-500/10 px-2 py-1 rounded">
                -{video.discount}%
              </span>
            )}
            <span className="text-sm text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
              {video.category}
            </span>
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
            {user?.type === 'particulier' && video.description.length > 100 && !isDescriptionExpanded
              ? `${video.description.substring(0, 100)}...`
              : video.description}
          </p>
          {user?.type === 'particulier' && video.description.length > 100 && (
            <button 
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium mt-2 focus:outline-none transition-colors"
            >
              {isDescriptionExpanded ? t('video.showLess') : t('video.readMore')}
            </button>
          )}
        </div>

        {/* Comments Section */}
        <div className="mb-20 md:mb-0">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('video.comments')} ({comments.length})
          </h2>
          
          <form onSubmit={handleCommentSubmit} className="flex gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center shrink-0 overflow-hidden">
              {user.profilePic ? (
                <img src={user.profilePic} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name[0]
              )}
            </div>
            <div className="flex-1">
              <input 
                type="text" 
                placeholder={t('video.addComment')}
                className="w-full bg-transparent border-b border-zinc-700 focus:border-purple-500 pb-2 text-sm outline-none transition-colors"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              {newComment && (
                <div className="flex justify-end mt-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setNewComment('')}
                    className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-zinc-800"
                  >
                    {t('video.cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="text-xs font-medium bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-500"
                  >
                    {t('video.commentBtn')}
                  </button>
                </div>
              )}
            </div>
          </form>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {comments.map((comment) => {
              const commentUser = commentUsers[comment.userId];
              const isOwner = comment.userId === user.id;
              const isEditing = editingCommentId === comment.id;

              return (
                <div key={comment.id} className="relative group">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-bold overflow-hidden">
                      {commentUser?.profilePic ? (
                        <img src={commentUser.profilePic} alt={comment.userName} className="w-full h-full object-cover" />
                      ) : (
                        comment.userName[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm text-white">{comment.userName}</span>
                          <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {isOwner && !isEditing && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeCommentMenuId === comment.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setActiveCommentMenuId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentText(comment.text);
                                      setActiveCommentMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Modifier</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Supprimer</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="mt-2">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full bg-zinc-900 text-white text-sm rounded-lg border border-zinc-700 p-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-zinc-800"
                            >
                              {t('video.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditCommentSubmit(comment.id)}
                              className="text-xs font-medium bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-500"
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-300">{comment.text}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <div className="mt-12 px-4 md:px-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Produits recommandés</h3>
              <button 
                onClick={() => navigate('/app/shopping')}
                className="text-purple-500 text-sm font-medium hover:text-purple-400"
              >
                Tout voir
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recommendedProducts.map((product) => {
                const finalPrice = product.discount 
                  ? product.price * (1 - product.discount / 100) 
                  : product.price;

                return (
                  <div key={product.id} className="group flex flex-col gap-2">
                    <a 
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-zinc-900 border border-white/5"
                      onClick={() => {
                        if (user.type === 'particulier') {
                          db.incrementProductClicks(product.id, user.id);
                        }
                      }}
                    >
                      <img 
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                        alt={product.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                        }}
                      />
                      {product.discount && product.discount > 0 && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                          -{product.discount}%
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-2 pt-8 z-10 text-center">
                        <div className="text-purple-400 font-bold text-xs">
                          {finalPrice.toFixed(2)}€
                        </div>
                      </div>
                    </a>
                    <p className="text-[10px] text-zinc-400 truncate px-1 group-hover:text-white transition-colors">{product.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sidebar (Related Videos) - Mobile Only */}
        <div className="w-full flex flex-col gap-4 px-4 md:px-0 mt-8 lg:hidden">
          {relatedVideosContent}
        </div>
      </div>

      {/* Sidebar (Related Videos) - Desktop Only */}
      <div className="hidden lg:flex w-96 flex-col gap-4 px-4 md:px-0">
        {relatedVideosContent}
      </div>
    </div>
  );
}
