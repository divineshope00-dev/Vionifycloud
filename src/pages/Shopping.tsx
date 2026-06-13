import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ShoppingBag, Share2, ChevronLeft, Search, X, ChevronRight, Heart } from 'lucide-react';
import { db, Product, User } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { CATEGORIES } from '../constants';

interface ProductWithVideo extends Product {
  videoId: string;
  category: string;
}

export default function Shopping() {
  const { user } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [products, setProducts] = useState<ProductWithVideo[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithVideo[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      const videos = await db.getVideos();
      let allProducts: ProductWithVideo[] = [];
      
      videos.forEach(video => {
        if (video.products && video.products.length > 0) {
          video.products.forEach(product => {
            allProducts.push({ ...product, videoId: video.id, category: video.category });
          });
        }
      });

      // Shuffle array
      for (let i = allProducts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allProducts[i], allProducts[j]] = [allProducts[j], allProducts[i]];
      }

      setProducts(allProducts);
      setFilteredProducts(allProducts);

      // Load favorites
      if (user && user.type === 'particulier') {
        const favs = await db.getProductFavorites(user.id);
        setFavoriteProductIds(new Set(favs.map(f => f.id)));
      }
    };
    loadProducts();
  }, [user]);

  useEffect(() => {
    let result = products;

    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lowerCaseQuery));
    }

    setFilteredProducts(result);
  }, [selectedCategory, searchQuery, products]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filtering is handled by useEffect
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

  const handleShare = async (e: React.MouseEvent, product: ProductWithVideo) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Share the link to the video containing the product
    const shareUrl = `${window.location.origin}/app/video/${product.videoId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Découvrez ce produit : ${product.title}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Lien copié dans le presse-papier !');
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || user.type !== 'particulier') return;

    await db.toggleProductFavorite(user.id, productId);
    
    setFavoriteProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-32 md:pb-12">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-20 flex flex-col bg-black/80 backdrop-blur-md border-b border-zinc-800">
        {/* Header */}
        <div className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors shrink-0"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            {isSearching ? (
              <form onSubmit={handleSearch} className="flex-1 flex items-center bg-zinc-900 rounded-full px-4 py-2 border border-zinc-800">
                <Search className="w-4 h-4 text-zinc-400 mr-2" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-white w-full text-sm"
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                  }}
                  className="p-1 hover:bg-zinc-800 rounded-full transition-colors ml-2"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </form>
            ) : (
              <h1 className="text-xl font-bold flex items-center gap-2 flex-1">
                <ShoppingBag className="w-5 h-5 text-purple-500" />
                {t('nav.shopping') || 'Shopping'}
              </h1>
            )}
          </div>
          
          {!isSearching && (
            <button 
              onClick={() => setIsSearching(true)}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors shrink-0"
            >
              <Search className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Categories Carousel */}
        <div className="relative group/categories px-4 pb-4">
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
              Tout
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
      </div>

      {/* Product Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredProducts.map((product, index) => {
            const finalPrice = product.discount 
              ? product.price * (1 - product.discount / 100) 
              : product.price;
            const isLiked = favoriteProductIds.has(product.id);

            return (
              <div key={`${product.id}-${index}`} className="flex flex-col gap-1.5 group">
                <a 
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (user.type === 'particulier') {
                      db.incrementProductClicks(product.id, user.id);
                    } else {
                      db.incrementProductClicks(product.id);
                    }
                  }}
                  className="relative block aspect-[3/4] rounded-lg overflow-hidden shadow-lg bg-zinc-900"
                >
                  <img 
                    src={product.imageUrl} 
                    alt={product.title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                  />
                  
                  {/* Discount Badge */}
                  {product.discount && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      -{product.discount}%
                    </div>
                  )}
                  
                  {/* Heart Button Overlay */}
                  {user && user.type === 'particulier' && (
                    <button 
                      onClick={(e) => toggleFavorite(e, product.id)}
                      className="absolute top-1 left-1 p-1.5 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-all group-hover:scale-110"
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>
                  )}
                  
                  {/* Price Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-6">
                    <div className="text-purple-400 font-bold text-xs text-center">
                      {finalPrice.toFixed(2)}€
                    </div>
                  </div>
                </a>
                
                <div className="flex items-start justify-between gap-1 px-1">
                  <p className="text-xs text-zinc-300 truncate font-medium flex-1" title={product.title}>
                    {product.title}
                  </p>
                  <button 
                    onClick={(e) => handleShare(e, product)}
                    className="p-1 hover:bg-zinc-800 rounded-full transition-colors shrink-0 text-zinc-400 hover:text-white"
                    title="Partager"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center text-zinc-500 mt-12">
            {searchQuery || selectedCategory ? 'Aucun produit trouvé pour cette sélection.' : 'Aucun produit disponible pour le moment.'}
          </div>
        )}
      </div>
    </div>
  );
}
