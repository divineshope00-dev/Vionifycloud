import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, BarChart2, Eye, ThumbsUp, MousePointer2, ExternalLink, TrendingUp } from 'lucide-react';
import { db, User, Video } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function Statistics() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalVideoClicks, setTotalVideoClicks] = useState(0);
  const [totalProductClicks, setTotalProductClicks] = useState(0);

  useEffect(() => {
    if (user.type !== 'entreprise') {
      navigate('/app/profile');
      return;
    }

    const loadStats = async () => {
      const enterpriseVideos = await db.getVideosByEntreprise(user.id);
      setVideos(enterpriseVideos);

      let views = 0;
      let likes = 0;
      let vClicks = 0;
      let pClicks = 0;
      enterpriseVideos.forEach(v => {
        views += (v.views || 0);
        likes += (v.likes || 0);
        vClicks += (v.clicks || 0);
        v.products?.forEach(p => {
          pClicks += (p.clicks || 0);
        });
      });
      setTotalViews(views);
      setTotalLikes(likes);
      setTotalVideoClicks(vClicks);
      setTotalProductClicks(pClicks);
    };

    loadStats();
    const interval = setInterval(loadStats, 2000); // Real-time updates every 2s
    return () => clearInterval(interval);
  }, [user.id, user.type, navigate]);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24 md:pb-8">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 border-b border-zinc-800 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-purple-500" />
          {t('statistics.title')}
        </h1>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center">
            <Eye className="w-6 h-6 text-blue-500 mb-1" />
            <div className="text-xl font-bold">{totalViews}</div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{t('statistics.totalViews')}</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center">
            <ThumbsUp className="w-6 h-6 text-purple-500 mb-1" />
            <div className="text-xl font-bold">{totalLikes}</div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{t('statistics.totalLikes')}</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center">
            <ExternalLink className="w-6 h-6 text-green-500 mb-1" />
            <div className="text-xl font-bold">{totalVideoClicks}</div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Lien Vidéo</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center">
            <MousePointer2 className="w-6 h-6 text-orange-500 mb-1" />
            <div className="text-xl font-bold">{totalProductClicks}</div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Lien Produit</div>
          </div>
        </div>

        <h2 className="text-lg font-bold mt-8 mb-4">{t('statistics.details')}</h2>
        <div className="space-y-4">
          {videos.map(video => {
            const totalVideoClicks = (video.clicks || 0) + (video.products?.reduce((acc, p) => acc + (p.clicks || 0), 0) || 0);
            
            return (
              <div key={video.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                    {video.videoUrl ? (
                      <video src={video.videoUrl} className="w-full h-full object-cover" />
                    ) : video.products && video.products.length > 0 ? (
                      <img 
                        src={video.products[0].imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                        }} 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">{t('statistics.noMedia')}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{video.title}</h3>
                    <p className="text-sm text-zinc-400 truncate">{new Date(video.createdAt).toLocaleDateString()}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-blue-400">
                        <Eye className="w-4 h-4" />
                        {video.views || 0}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-purple-400">
                        <ThumbsUp className="w-4 h-4" />
                        {video.likes || 0}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-green-400">
                        <ExternalLink className="w-4 h-4" />
                        {video.clicks || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Performance Section */}
                {video.products && video.products.length > 0 && (
                  <div className="pt-4 border-t border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" />
                      {t('statistics.performance')}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {video.products.map(product => {
                        const productClicks = product.clicks || 0;
                        const totalProductsClicks = video.products?.reduce((acc, p) => acc + (p.clicks || 0), 0) || 0;
                        const percentage = totalProductsClicks > 0 
                          ? Math.round((productClicks / totalProductsClicks) * 100) 
                          : 0;

                        return (
                          <div key={product.id} className="flex items-center gap-3 bg-black/30 p-2 rounded-lg border border-zinc-800/50">
                            <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden shrink-0">
                               <img 
                                 src={product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                                 alt={product.title} 
                                 className="w-full h-full object-cover"
                                 onError={(e) => {
                                   (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                                 }} 
                               />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-white truncate">{product.title}</div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                                  <ExternalLink className="w-3 h-3" />
                                  {productClicks} {t('statistics.productClicks')}
                                </div>
                                <div className="text-[10px] font-bold text-purple-400">
                                  {percentage}%
                                </div>
                              </div>
                              {/* Progress Bar */}
                              <div className="w-full bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
                                <div 
                                  className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {videos.length === 0 && (
            <div className="text-center text-zinc-500 py-8">{t('statistics.noPublications')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
