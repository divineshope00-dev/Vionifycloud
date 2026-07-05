import { supabase } from '../lib/supabase';

export type UserType = 'entreprise' | 'particulier';

export interface User {
  id: string;
  type: UserType;
  isGuest?: boolean;
  email: string;
  name: string;
  country: string;
  profilePic?: string;
  language?: string;
  trialStartDate: string;
  trialEndsAt: string;
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  subscription?: {
    plan: 'starter' | 'pro' | 'unlimited' | 'premium';
    endDate: string;
    isAnnual?: boolean;
    paddleSubscriptionId?: string;
    paymentMethod?: {
      last4: string;
      brand: string;
      expiryDate: string;
    };
  };
  preferredCategories?: Record<string, number>;
  onboardingCompleted?: boolean;
  firstPublishDate?: string;
  peakMonthlyClients?: number;
}

export interface Product {
  id: string;
  video_id: string;
  title: string;
  imageUrl: string;
  link: string;
  price: number;
  discount?: number;
  clicks?: number;
}

export interface Video {
  id: string;
  entrepriseId: string;
  entrepriseName: string;
  entreprisePic?: string;
  videoUrl: string;
  rawVideoUrl: string;
  title: string;
  price: number;
  discount?: number;
  link: string;
  category: string;
  description: string;
  createdAt: string;
  likes: number;
  likedBy?: string[];
  products?: Product[];
  views?: number;
  clicks?: number;
  entrepriseMonthlyClients?: number;
  entrepriseCountry?: string;
  addedAt?: string;
}

export interface Favorite {
  user_id: string;
  video_id: string;
  added_at: string;
}

export interface ProductFavorite {
  user_id: string;
  product_id: string;
  added_at: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

const BUNNY_CDN_URL = 'https://vionify.b-cdn.net';

export type VideoQuality = '720p' | '480p';

export const getBunnyUrl = (url: string | undefined, quality?: VideoQuality): string => {
  if (!url) return '';
  if (url.startsWith('data:')) return url; // Pass through base64 fallback
  return url;
};

const isActiveEntreprise = (data: any): boolean => {
  if (!data) return true; // fallback if no data
  if (data.type === 'particulier') return true;
  
  const now = new Date().getTime();
  
  // check trial
  let trialActive = false;
  if (data.trial_ends_at) {
    trialActive = now <= new Date(data.trial_ends_at).getTime();
  } else if (data.trial_start_date) {
    const trialStart = new Date(data.trial_start_date);
    const trialEnds = new Date(trialStart);
    trialEnds.setDate(trialStart.getDate() + 7);
    trialActive = now <= trialEnds.getTime();
  } else {
    // If we don't have trial info but it's an entreprise, we default to true to not block everything 
    // when database schema is partially seeded.
    trialActive = true; 
  }

  // check sub
  let subActive = false;
  if (data.subscription_status === 'active' && (data.subscription_end_date || data.subscription_plan)) {
    if (data.subscription_end_date) {
      subActive = now <= new Date(data.subscription_end_date).getTime();
    } else {
      subActive = true;
    }
  }

  return trialActive || subActive;
};

// Robust helper to load products separately for a list of videos if relational query fails
const attachProductsToVideos = async (videos: any[]): Promise<any[]> => {
  if (!videos || videos.length === 0) return [];
  
  const videoIds = videos.filter(v => v && v.id).map(v => v.id);
  if (videoIds.length === 0) return videos;

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .in('video_id', videoIds);

    if (error) {
      console.warn('Error fetching products separately:', error);
      return videos.map(v => ({ ...v, products: v.products || [] }));
    }

    const productsByVideoId: Record<string, any[]> = {};
    if (products && products.length > 0) {
      // Group products by video_id
      products.forEach(p => {
        if (!productsByVideoId[p.video_id]) {
          productsByVideoId[p.video_id] = [];
        }
        productsByVideoId[p.video_id].push(p);
      });
    }

    // Attach to videos
    return videos.map(v => ({
      ...v,
      products: productsByVideoId[v.id] || []
    }));
  } catch (err) {
    console.error('Failed in attachProductsToVideos:', err);
  }

  return videos.map(v => ({ ...v, products: v.products || [] }));
};

// Safe request wrapper for network resilience and auth errors
const safeRequest = async <T = any>(request: any): Promise<{ data: T | null; error: any }> => {
  try {
    const result = await request;
    
    // Check for "Invalid Refresh Token" in the result error
    if (result.error && (
      (result.error as any).message?.includes('Refresh Token Not Found') || 
      (result.error as any).message?.includes('refresh_token_not_found') ||
      (result.error as any).status === 401
    )) {
      console.warn('Auth session invalid, clearing session...');
      localStorage.removeItem('vionify_user');
      window.dispatchEvent(new Event('user-changed'));
    }
    
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'Failed to fetch') {
      console.warn('Network error: Failed to fetch. Retrying in 1s...');
      await new Promise(r => setTimeout(r, 1000));
      try {
        const retryResult = await request;
        return retryResult;
      } catch (retryError) {
        return { data: null, error: retryError };
      }
    }
    return { data: null, error };
  }
};

// Helper to map Supabase user to our User interface
const mapUser = (data: any): User => ({
  id: data.id,
  type: data.type,
  email: data.email,
  name: data.name,
  country: data.country,
  profilePic: data.profile_pic,
  language: data.language,
  trialStartDate: data.trial_start_date,
  trialEndsAt: data.trial_ends_at,
  subscriptionStatus: data.subscription_status,
  subscription: data.subscription_plan ? {
    plan: data.subscription_plan,
    endDate: data.subscription_end_date,
    isAnnual: data.is_annual,
    paddleSubscriptionId: data.paddle_subscription_id,
    paymentMethod: data.payment_method ? JSON.parse(data.payment_method) : undefined
  } : undefined,
  preferredCategories: data.preferred_categories || {},
  onboardingCompleted: data.onboarding_completed || false,
  firstPublishDate: data.first_publish_date,
  peakMonthlyClients: data.peak_monthly_clients || 0
});

// Helper to map Supabase product to our Product interface
const mapProduct = (p: any): Product => {
  if (!p) return {} as Product;
  // Deeply resilient mapping that checks both underscore and camelCase variants
  return {
    id: p.id,
    video_id: p.video_id,
    title: p.title || 'Produit sans titre',
    imageUrl: p.image_url || p.imageUrl || '',
    link: p.link || '#',
    price: typeof p.price === 'number' ? p.price : parseFloat(p.price || 0),
    discount: typeof p.discount === 'number' ? p.discount : (p.discount ? parseFloat(p.discount) : undefined),
    clicks: p.clicks || 0
  };
};

// Helper to map Supabase video to our Video interface
const mapVideo = (data: any): Video => {
  if (!data) return {} as Video;
  const rawUrl = data.video_url || '';
  const finalUrl = getBunnyUrl(rawUrl);
  
  const entrepriseData = data.entreprise || data.users;

  // Handle nested products
  let products: Product[] = [];
  if (Array.isArray(data.products)) {
    products = data.products.map(mapProduct);
  } else if (data.products && typeof data.products === 'object') {
    products = [mapProduct(data.products)];
  }

  return {
    id: data.id,
    entrepriseId: data.entreprise_id,
    entrepriseName: data.entreprise_name,
    entreprisePic: data.entreprise_pic,
    entrepriseMonthlyClients: entrepriseData?.peak_monthly_clients || data.entreprise_peak_monthly_clients || 0,
    entrepriseCountry: entrepriseData?.country || data.entreprise_country || '',
    videoUrl: finalUrl || rawUrl,
    rawVideoUrl: rawUrl,
    title: data.title,
    price: data.price,
    discount: data.discount,
    link: data.link,
    category: data.category,
    description: data.description,
    createdAt: data.created_at,
    likes: data.likes || 0,
    views: data.views || 0,
    clicks: data.clicks || 0,
    likedBy: [], 
    products: products
  };
};

export const db = {
  // Connection and Session sync
  initialize: () => {
    // Sync Supabase Auth with our custom user object
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase Auth Event:', event);
      
      if (session?.user) {
        // If we have a session but no local profile, or profile mismatch, sync it
        const currentUser = db.getCurrentUser();
        if (!currentUser || currentUser.id !== session.user.id) {
          try {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (profile) {
              const user = mapUser(profile);
              localStorage.setItem('vionify_user', JSON.stringify(user));
              window.dispatchEvent(new Event('user-changed'));
            }
          } catch (err) {
            console.error('Error syncing user profile on auth change:', err);
          }
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        const currentUser = db.getCurrentUser();
        if (currentUser) {
          localStorage.removeItem('vionify_user');
          window.dispatchEvent(new Event('user-changed'));
        }
        
        // If refresh token fails, force sign out to clear stale data
        if (event === 'SIGNED_OUT' && !session) {
           // We might be in a bad refresh token state
           localStorage.removeItem('vionify_user');
        }
      }
    });

    // Handle token refresh errors specifically
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Session refreshed successfully');
      }
    });

    // Proactively check session for invalidity
    supabase.auth.getSession().then(({ data, error }) => {
      if (error && (error.message.includes('Refresh Token Not Found') || error.message.includes('refresh_token_not_found'))) {
        console.warn('Initial session check found invalid refresh token, clearing storage');
        db.logout();
      }
    });

    return db.checkConnection();
  },

  // Connection check
  checkConnection: async () => {
    try {
      const { data, error } = await safeRequest(supabase.from('users').select('count', { count: 'exact', head: true }).limit(1));
      if (error) throw error;
      console.log('Supabase connection successful');
      return true;
    } catch (error) {
      console.error('Supabase connection failed:', error);
      return false;
    }
  },

  register: async (user: Omit<User, 'id' | 'trialStartDate' | 'trialEndsAt' | 'subscriptionStatus'>, password?: string) => {
    // 1. Create Auth User if password provided
    let authId: string | undefined;
    
    if (password) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: password,
          options: {
            data: {
              name: user.name,
              type: user.type
            }
          }
        });

        if (authError) {
          if (authError.message.includes('User already registered')) {
            // If already registered, try to sign in or just report it
            console.warn('User already registered in Auth, checking for profile...');
          } else {
            console.error('Supabase Auth SignUp Error:', authError);
            throw authError;
          }
        }
        authId = authData.user?.id;
      } catch (err: any) {
        if (err.message === 'Load failed') {
          throw new Error('Erreur de connexion. Veuillez vérifier votre connexion internet.');
        }
        throw err;
      }
    }

    const now = new Date();
    const trialEnds = new Date(now);
    
    if (user.type === 'particulier') {
      trialEnds.setMonth(now.getMonth() + 3);
    } else {
      trialEnds.setDate(now.getDate() + 7);
    }

    // 2. Create User Profile in 'users' table
    // Use safeRequest to handle potential RLS errors gracefully
    const { data, error } = await safeRequest(supabase
      .from('users')
      .insert([{
        id: authId,
        email: user.email,
        name: user.name,
        type: user.type,
        country: user.country || '',
        profile_pic: user.profilePic || '',
        language: user.language || (user.type === 'entreprise' ? 'en' : 'fr'),
        trial_start_date: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        subscription_status: 'trialing'
      }])
      .select()
      .maybeSingle());

    if (error) {
      console.error('Supabase Register Profile Error:', error);
      // If it's a RLS error, it usually means the user needs to confirm email first
      // or the record already exists. If we have an authId, we can consider the signup 
      // partially successful and let the login flow handle profile creation.
      if (authId && (error.code === '42501' || error.message?.includes('row-level security'))) {
        console.warn('RLS error during profile creation - this is expected if email confirmation is required.');
        // Create a temporary user object so the UI can proceed if needed, 
        // but normally we should wait for login.
        const tempUser: User = {
          id: authId,
          email: user.email,
          name: user.name,
          type: user.type,
          country: user.country || '',
          trialStartDate: now.toISOString(),
          trialEndsAt: trialEnds.toISOString(),
          subscriptionStatus: 'trialing'
        };
        return tempUser;
      }
      throw error;
    }

    if (!data) {
      // Check if user already exists
      const { data: existingUser } = await safeRequest(supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle());
      
      if (existingUser) {
        return mapUser(existingUser);
      }
      throw new Error('Failed to create user profile');
    }
    
    
    const newUser = mapUser(data);
    localStorage.setItem('vionify_user', JSON.stringify(newUser));
    window.dispatchEvent(new Event('user-changed'));
    return newUser;
  },

  login: async (email: string, password?: string) => {
    try {
      if (password) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          console.error('Supabase Auth Login Error:', authError);
          return null;
        }

        // If auth succeeded, verify we have a profile in the users table
        const { data: profile, error: profileError } = await safeRequest(supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle());

        if (profileError) {
          console.error('Supabase Profile Query Error:', profileError);
          return null;
        }

        if (!profile) {
          console.warn('User profile not found after login, attempting to create it...');
          // Recreate profile from auth metadata
          const metadata = authData.user.user_metadata;
          const userType = metadata?.type || 'particulier';
          const now = new Date();
          const trialEnds = new Date(now);
          if (userType === 'particulier') {
            trialEnds.setMonth(now.getMonth() + 3);
          } else {
            trialEnds.setDate(now.getDate() + 7);
          }

          const { data: newProfile, error: insertError } = await safeRequest(supabase
            .from('users')
            .insert([{
              id: authData.user.id,
              email: authData.user.email || email,
              name: metadata?.name || 'User',
              type: userType,
              country: metadata?.country || '',
              trial_start_date: now.toISOString(),
              trial_ends_at: trialEnds.toISOString(),
              subscription_status: 'trialing'
            }])
            .select()
            .maybeSingle());

          if (insertError || !newProfile) {
            console.error('Failed to recreate profile during login:', insertError);
            const fallbackUser: User = {
              id: authData.user.id,
              email: authData.user.email || email,
              name: metadata?.name || 'User',
              type: userType,
              country: metadata?.country || '',
              trialStartDate: now.toISOString(),
              trialEndsAt: trialEnds.toISOString(),
              subscriptionStatus: 'trialing'
            };
            localStorage.setItem('vionify_user', JSON.stringify(fallbackUser));
            window.dispatchEvent(new Event('user-changed'));
            return fallbackUser;
          }
          
          const user = mapUser(newProfile);
          localStorage.setItem('vionify_user', JSON.stringify(user));
          window.dispatchEvent(new Event('user-changed'));
          return user;
        }

        const user = mapUser(profile);
        localStorage.setItem('vionify_user', JSON.stringify(user));
        window.dispatchEvent(new Event('user-changed'));
        return user;
      }
    } catch (err: any) {
      console.error('Supabase Auth Login Exception:', err);
      if (err.message === 'Load failed') {
        throw new Error('Erreur de connexion. Veuillez vérifier votre connexion internet.');
      }
    }

    // Fallback for cases where password isn't provided (e.g. state restoration)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !data) {
      console.log('Supabase Login Error: User profile for email not found');
      return null;
    }
    
    const user = mapUser(data);
    localStorage.setItem('vionify_user', JSON.stringify(user));
    window.dispatchEvent(new Event('user-changed'));
    return user;
  },

  resetPasswordForEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('vionify_user');
    window.dispatchEvent(new Event('user-changed'));
  },

  getCurrentUser: (): User | null => {
    const saved = localStorage.getItem('vionify_user');
    return saved ? JSON.parse(saved) : null;
  },

  getUser: async (id: string) => {
    const { data, error } = await safeRequest(supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle());

    if (error || !data) {
      console.error('Supabase GetUser Error:', error || 'User not found');
      return null;
    }
    return mapUser(data);
  },

  updateUser: async (updates: Partial<User>) => {
    const currentUser = db.getCurrentUser();
    if (!currentUser) return null;

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.profilePic !== undefined) dbUpdates.profile_pic = updates.profilePic;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.subscriptionStatus !== undefined) dbUpdates.subscription_status = updates.subscriptionStatus;
    if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted;
    if (updates.subscription) {
      dbUpdates.subscription_plan = updates.subscription.plan;
      dbUpdates.subscription_end_date = updates.subscription.endDate;
      dbUpdates.is_annual = updates.subscription.isAnnual;
      dbUpdates.paddle_subscription_id = updates.subscription.paddleSubscriptionId;
      if (updates.subscription.paymentMethod) {
        dbUpdates.payment_method = JSON.stringify(updates.subscription.paymentMethod);
      }
    }

    let { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', currentUser.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.warn('Update failed or user not found, trying upsert to create/sync profile:', error || 'no row updated');
      
      const fullRecord = {
        id: currentUser.id,
        email: currentUser.email || `${currentUser.id}@vionify.com`,
        name: currentUser.name || 'Utilisateur Vionify',
        type: currentUser.type || 'particulier',
        country: currentUser.country || '',
        profile_pic: currentUser.profilePic || '',
        language: currentUser.language || 'fr',
        trial_start_date: currentUser.trialStartDate || new Date().toISOString(),
        trial_ends_at: currentUser.trialEndsAt || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        subscription_status: currentUser.subscriptionStatus || 'trialing',
        ...dbUpdates
      };

      const upsertResult = await supabase
        .from('users')
        .upsert(fullRecord)
        .select()
        .maybeSingle();

      if (upsertResult.error) {
        console.error('Supabase Upsert/UpdateUser Error:', upsertResult.error);
        throw upsertResult.error;
      }
      
      data = upsertResult.data;
    }

    if (!data) {
      throw new Error('User not found and failed to create/update via upsert');
    }
    
    const updatedUser = mapUser(data);
    localStorage.setItem('vionify_user', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('user-changed'));
    return updatedUser;
  },

  addVideo: async (video: Omit<Video, 'id' | 'createdAt' | 'likes' | 'views'>) => {
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert([{
        entreprise_id: video.entrepriseId,
        entreprise_name: video.entrepriseName,
        entreprise_pic: video.entreprisePic,
        video_url: video.videoUrl,
        title: video.title,
        price: video.price,
        discount: video.discount,
        link: video.link,
        category: video.category,
        description: video.description
      }])
      .select()
      .maybeSingle();

    if (videoError || !videoData) {
      console.error('Supabase AddVideo Error:', videoError || 'Failed to create video');
      throw videoError || new Error('Failed to create video');
    }

    // Update first_publish_date if not set
    const { data: userData } = await supabase
      .from('users')
      .select('first_publish_date')
      .eq('id', video.entrepriseId)
      .single();
    
    if (userData && !userData.first_publish_date) {
      await supabase
        .from('users')
        .update({ first_publish_date: new Date().toISOString() })
        .eq('id', video.entrepriseId);
    }

    if (video.products && video.products.length > 0) {
      const productsToInsert = video.products.map(p => ({
        video_id: videoData.id,
        title: p.title || 'Produit',
        image_url: p.imageUrl || '',
        link: p.link || '#',
        price: p.price || 0,
        discount: p.discount
      }));

      const { error: productsError } = await supabase
        .from('products')
        .insert(productsToInsert);
      
      if (productsError) {
        console.error('Supabase AddProducts Error:', productsError);
        // Fallback: try with 'imageUrl' column if 'image_url' failed
        if (productsError.message?.includes('column "image_url" does not exist')) {
          await supabase.from('products').insert(productsToInsert.map(p => ({
            video_id: p.video_id,
            title: p.title,
            imageUrl: p.image_url,
            link: p.link,
            price: p.price,
            discount: p.discount
          })));
        }
      }
    }

    // Fetch the full video and separately attach products to avoid relation errors
    const { data: fullVideo, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoData.id)
      .maybeSingle();

    if (fetchError || !fullVideo) {
      console.error('Supabase FetchFullVideo Error:', fetchError || 'Video not found after creation');
      return mapVideo(videoData); // Fallback to partial data
    }

    const videosWithProducts = await attachProductsToVideos([fullVideo]);
    return mapVideo(videosWithProducts[0]);
  },

  trackMonthlyClient: async (businessId: string, viewerId: string) => {
    if (!businessId || !viewerId || businessId === viewerId) return;

    try {
      // 1. Check if viewer is a 'particulier' (only they count as monthly clients)
      const { data: viewer, error: viewerError } = await supabase
        .from('users')
        .select('type')
        .eq('id', viewerId)
        .single();
      
      if (viewerError || viewer.type !== 'particulier') return;

      // 2. Get business info to find first_publish_date and peak
      const { data: business, error: bizError } = await supabase
        .from('users')
        .select('first_publish_date, peak_monthly_clients')
        .eq('id', businessId)
        .single();
      
      if (bizError || !business.first_publish_date) return;

      const firstPublish = new Date(business.first_publish_date);
      const now = new Date();
      
      // 3. Calculate current 28-day cycle start
      const diffMs = now.getTime() - firstPublish.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const cycleIndex = Math.floor(diffDays / 28);
      
      const cycleStart = new Date(firstPublish);
      cycleStart.setDate(firstPublish.getDate() + (cycleIndex * 28));
      
      // Use YYYY-MM-DD for uniqueness
      const cycleStartStr = cycleStart.toISOString().split('T')[0];

      // 4. Try to record this unique viewer for this cycle
      const { error: reachError } = await supabase
        .from('business_monthly_reach')
        .insert([{
          business_id: businessId,
          viewer_id: viewerId,
          cycle_start_date: cycleStartStr
        }]);

      // If error (like unique constraint violation), it means already counted for this cycle
      if (reachError) return;

      // 5. Update peak if needed
      // Get current count for this cycle
      const { count, error: countError } = await supabase
        .from('business_monthly_reach')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('cycle_start_date', cycleStartStr);

      if (!countError && count !== null) {
        const currentPeak = business.peak_monthly_clients || 0;
        if (count > currentPeak) {
          await supabase
            .from('users')
            .update({ peak_monthly_clients: count })
            .eq('id', businessId);
        }
      }
    } catch (err) {
      console.error('Error tracking monthly client:', err);
    }
  },

  getCurrentMonthlyClients: async (businessId: string) => {
    try {
      const { data: business } = await supabase
        .from('users')
        .select('first_publish_date, peak_monthly_clients')
        .eq('id', businessId)
        .single();
      
      if (!business || !business.first_publish_date) return business?.peak_monthly_clients || 0;

      const firstPublish = new Date(business.first_publish_date);
      const now = new Date();
      const diffMs = now.getTime() - firstPublish.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const cycleIndex = Math.floor(diffDays / 28);
      
      const cycleStart = new Date(firstPublish);
      cycleStart.setDate(firstPublish.getDate() + (cycleIndex * 28));
      const cycleStartStr = cycleStart.toISOString().split('T')[0];

      const { count } = await supabase
        .from('business_monthly_reach')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('cycle_start_date', cycleStartStr);

      // Return the MAX of current cycle reach vs historic peak (as requested)
      return Math.max(count || 0, business.peak_monthly_clients || 0);
    } catch (err) {
      return 0;
    }
  },

  subscribeToMonthlyClients: (businessId: string, callback: (count: number) => void) => {
    // Initial fetch
    db.getCurrentMonthlyClients(businessId).then(callback);

    // Subscribe to new reach records to update the count instantly
    return supabase
      .channel(`monthly_clients_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'business_monthly_reach',
          filter: `business_id=eq.${businessId}`
        },
        async () => {
          const newCount = await db.getCurrentMonthlyClients(businessId);
          callback(newCount);
        }
      )
      .subscribe();
  },

  getVideos: async (limit?: number) => {
    let query = supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: rawVideos, error } = await safeRequest(query);
    if (error) {
      console.error('Supabase GetVideos Error:', error);
      throw error;
    }

    const data = await attachProductsToVideos(rawVideos || []);
    
    console.log('GetVideos raw data:', data);
    return (data as any[] || []).map(mapVideo);
  },

  getVideo: async (id: string, userId?: string) => {
    const { data: rawVideo, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching single video:', error);
      throw error;
    }
    
    if (!rawVideo) {
      console.warn(`No video found with ID: ${id}`);
      return null;
    }

    const withProducts = await attachProductsToVideos([rawVideo]);
    const videoData = withProducts[0] || rawVideo;

    const mapped = mapVideo(videoData);
    
    // If we have a userId, we can also check if they liked it
    if (userId) {
      const { data: liked } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', id)
        .maybeSingle();
      
      mapped.likedBy = liked ? [userId] : [];
    }

    return mapped;
  },

  getRecommendedVideos: async (userId: string, limit?: number) => {
    try {
      // 1. Fetch user preferences
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('preferred_categories, country')
        .eq('id', userId)
        .maybeSingle();
      
      const preferences: Record<string, number> = userData?.preferred_categories || {};
      const userCountry = userData?.country;

      // 2. Fetch all videos
      const videos = await db.getVideos();

      // 2.5 Fetch user likes
      const { data: userLikes } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', userId);
      
      const likedVideoIds = new Set(userLikes?.map(l => l.video_id) || []);

      // 3. Calculate scores
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const scoredVideos = videos.map(video => {
        let score = 0;

        // Preference score: weight by interaction count
        if (video.category && preferences[video.category]) {
          score += preferences[video.category] * 10;
        }

        // Country priority score
        if (userCountry && video.entrepriseCountry && video.entrepriseCountry === userCountry) {
          score += 100;
        }

        // Trending score: 500 views in 7 days + 100 clicks
        const isRecent = new Date(video.createdAt) >= sevenDaysAgo;
        const totalProductClicks = video.products?.reduce((sum, p) => sum + (p.clicks || 0), 0) || 0;
        const totalClicks = (video.clicks || 0) + totalProductClicks;

        if (isRecent && (video.views || 0) >= 500 && totalClicks >= 100) {
          score += 1000; // High priority for trending videos
        }

        return { 
          ...video, 
          score,
          likedBy: likedVideoIds.has(video.id) ? [userId] : []
        };
      });

      // 4. Sort and return
      return scoredVideos
        .sort((a, b) => b.score - a.score)
        .slice(0, limit || scoredVideos.length);
    } catch (error) {
      console.error('Error getting recommended videos:', error);
      return db.getVideos(limit);
    }
  },

  updateUserPreferences: async (userId: string, category: string) => {
    if (!userId || !category) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('preferred_categories')
        .eq('id', userId)
        .maybeSingle();

      const preferences = userData?.preferred_categories || {};
      preferences[category] = (preferences[category] || 0) + 1;

      await supabase
        .from('users')
        .update({ preferred_categories: preferences })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  },

  searchVideos: async (query: string, userId?: string) => {
    const searchTerm = (query || '').trim();
    if (!searchTerm) return [];

    const lowerTerm = searchTerm.toLowerCase();

    try {
      // Direct, fast flat queries:
      const broadOrQuery = supabase
        .from('videos')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,entreprise_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      const titleQuery = supabase
        .from('videos')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      const recentQuery = supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      const [orResult, titleResult, recentResult] = await Promise.all([
        safeRequest(broadOrQuery),
        safeRequest(titleQuery),
        safeRequest(recentQuery)
      ]);

      // Combine and filter results
      let allVideos: any[] = [];
      if (orResult.data && orResult.data.length > 0) {
        allVideos = [...orResult.data];
      }
      if (titleResult.data && titleResult.data.length > 0) {
        allVideos = [...allVideos, ...titleResult.data];
      }

      // If we got nothing from DB queries, filter the recent videos locally as the ultimate safety net
      if (allVideos.length === 0 && recentResult.data && recentResult.data.length > 0) {
        const filteredRecent = recentResult.data.filter((v: any) => 
          (v.title || '').toLowerCase().includes(lowerTerm) ||
          (v.entreprise_name || '').toLowerCase().includes(lowerTerm) ||
          (v.category || '').toLowerCase().includes(lowerTerm) ||
          (v.description || '').toLowerCase().includes(lowerTerm)
        );
        allVideos = filteredRecent;
      }

      // De-duplicate results by ID
      const uniqueVideos = Array.from(new Map(allVideos.map(v => [v.id, v])).values());

      // Attach products to the consolidated list of videos
      const uniqueVideosWithProducts = await attachProductsToVideos(uniqueVideos);

      if (uniqueVideosWithProducts.length === 0) return [];

      // Priority Tuning: Prefix matches first
      uniqueVideosWithProducts.sort((a: any, b: any) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aEnt = (a.entreprise_name || '').toLowerCase();
        const bEnt = (b.entreprise_name || '').toLowerCase();
        
        const aStarts = aTitle.startsWith(lowerTerm) || aEnt.startsWith(lowerTerm);
        const bStarts = bTitle.startsWith(lowerTerm) || bEnt.startsWith(lowerTerm);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return 0; 
      });

      let likedVideoIds = new Set<string>();
      if (userId) {
        try {
          const { data: likes } = await supabase.from('likes').select('video_id').eq('user_id', userId);
          if (likes) likedVideoIds = new Set(likes.map((l: any) => l.video_id));
        } catch (e) {
          console.warn('Liked videos fetch error:', e);
        }
      }

      return uniqueVideosWithProducts.map((v: any) => {
        const mapped = mapVideo(v);
        if (userId && likedVideoIds.has(mapped.id)) {
          mapped.likedBy = [userId];
        }
        return mapped;
      });
    } catch (err) {
      console.error('Unified Search Execution Error:', err);
      return [];
    }
  },

  getVideosByEntreprise: async (entrepriseId: string, userId?: string) => {
    const { data: rawVideos, error } = await safeRequest(supabase
      .from('videos')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('created_at', { ascending: false }));

    if (error) {
      console.error('Supabase GetVideosByEntreprise Error:', error);
      throw error;
    }
    
    // Fetch products separately to ensure they are loaded
    const data = await attachProductsToVideos(rawVideos || []);
    
    let likedVideoIds = new Set<string>();
    if (userId) {
      const { data: userLikes } = await safeRequest(supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', userId));
      likedVideoIds = new Set((userLikes as any[] || [])?.map((l: any) => l.video_id) || []);
    }

    console.log('GetVideosByEntreprise raw data:', data);
    
    return (data as any[] || []).map(v => {
      const mapped = mapVideo(v);
      if (userId && likedVideoIds.has(mapped.id)) {
        mapped.likedBy = [userId];
      }
      return mapped;
    });
  },

  getVideoCountInLast30Days: async (entrepriseId: string) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count, error } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('entreprise_id', entrepriseId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Supabase GetVideoCount Error:', error);
      return 0;
    }
    return count || 0;
  },

  deleteVideo: async (id: string) => {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase DeleteVideo Error:', error);
      throw error;
    }
  },

  updateVideo: async (id: string, updates: Partial<Video>) => {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
    if (updates.link) dbUpdates.link = updates.link;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.videoUrl) dbUpdates.video_url = updates.videoUrl;

    // 1. Update the video record first
    const { error: videoError } = await supabase
      .from('videos')
      .update(dbUpdates)
      .eq('id', id);

    if (videoError) {
      console.error('Supabase UpdateVideo Error:', videoError);
      throw videoError;
    }

    // 2. Handle products update if provided (explicitly check for truthy or empty array)
    if (updates.products !== undefined) {
      // Simplest approach: delete existing products and insert new ones
      const { error: deleteError } = await supabase.from('products').delete().eq('video_id', id);
      if (deleteError) console.error('Error deleting old products:', deleteError);
      
      if (updates.products.length > 0) {
        const productsToInsert = updates.products.map(p => ({
          video_id: id,
          title: p.title || 'Produit',
          image_url: p.imageUrl || '',
          link: p.link || '',
          price: p.price || 0,
          discount: p.discount
        }));

        const { error: productsError } = await supabase
          .from('products')
          .insert(productsToInsert);

        if (productsError) {
          console.error('Supabase UpdateProducts Error:', productsError);
          // Try with fallback column names if error suggests column mismatch
          if (productsError.message?.includes('column "image_url" does not exist')) {
             await supabase.from('products').insert(productsToInsert.map(p => ({
               video_id: p.video_id,
               title: p.title,
               imageUrl: p.image_url,
               link: p.link,
               price: p.price,
               discount: p.discount
             })));
          }
        }
      }
    }

    // 3. Fetch the fully updated video object and attach products separately
    const { data: finalData, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !finalData) {
      console.error('Supabase FetchUpdatedVideo Error:', fetchError);
      throw fetchError || new Error('Failed to fetch video after update');
    }

    const videosWithProducts = await attachProductsToVideos([finalData]);
    return mapVideo(videosWithProducts[0]);
  },

  incrementVideoViews: async (videoId: string) => {
    // Use a RPC or just a simple update if we don't have RPC
    const { data: video } = await supabase.from('videos').select('views').eq('id', videoId).maybeSingle();
    if (video) {
      await supabase.from('videos').update({ views: (video.views || 0) + 1 }).eq('id', videoId);
    }
  },

  incrementVideoClicks: async (videoId: string, userId?: string) => {
    try {
      const { data: video, error: selectError } = await supabase
        .from('videos')
        .select('clicks, category')
        .eq('id', videoId)
        .maybeSingle();
      
      if (selectError) throw selectError;

      if (video) {
        const { error: updateError } = await supabase
          .from('videos')
          .update({ clicks: (video.clicks || 0) + 1 })
          .eq('id', videoId);
        
        if (updateError) throw updateError;
        
        if (userId && video.category) {
          await db.updateUserPreferences(userId, video.category);
        }
      }
    } catch (error) {
      console.error('Error incrementing video clicks:', error);
    }
  },

  incrementProductClicks: async (productId: string, userId?: string) => {
    try {
      const { data: product, error: selectError } = await supabase
        .from('products')
        .select('clicks, video_id')
        .eq('id', productId)
        .maybeSingle();
      
      if (selectError) throw selectError;

      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ clicks: (product.clicks || 0) + 1 })
          .eq('id', productId);
        
        if (updateError) throw updateError;
        
        if (userId) {
          const { data: video, error: videoError } = await supabase
            .from('videos')
            .select('category')
            .eq('id', product.video_id)
            .maybeSingle();
          
          if (!videoError && video?.category) {
            await db.updateUserPreferences(userId, video.category);
          }
        }
      }
    } catch (error) {
      console.error('Error incrementing product clicks:', error);
    }
  },

  toggleFavorite: async (userId: string, videoId: string) => {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching favorite status:', fetchError);
        throw fetchError;
      }

      if (existing) {
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('video_id', videoId);
        
        if (deleteError) throw deleteError;
      } else {
        // Try with added_at first, then created_at is automatic in many DBs
        const now = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('favorites')
          .insert([{ 
            user_id: userId, 
            video_id: videoId,
            added_at: now
          }]);
          
        if (insertError) {
          console.warn('Insert with added_at failed, trying minimal insert:', insertError);
          const { error: fallbackError } = await supabase
            .from('favorites')
            .insert([{ user_id: userId, video_id: videoId }]);
            
          if (fallbackError) throw fallbackError;
        }
      }
    } catch (err) {
      console.error('Catch in toggleFavorite:', err);
      throw err;
    }
  },

  getFavorites: async (userId: string) => {
    try {
      if (!userId) return [];
      
      // Removed 30-day filter and auto-deletion to ensure all favorites are shown
      
      // 1. Fetch links
      // Try ordering by created_at, fallback to added_at if it fails
      let query = supabase
        .from('favorites')
        .select('video_id, created_at, added_at')
        .eq('user_id', userId);
      
      const { data: links, error: linkError } = await safeRequest(query);

      if (linkError) throw linkError;
      if (!links || links.length === 0) return [];

      // Sort in memory to avoid column existence issues in SQL order by
      const sortedLinks = [...links].sort((a, b) => {
        const dateA = new Date(a.created_at || a.added_at || 0).getTime();
        const dateB = new Date(b.created_at || b.added_at || 0).getTime();
        return dateB - dateA;
      });

      // 2. Fetch videos with their products flat and attach separately
      const videoIds = sortedLinks.map(l => l.video_id).filter(Boolean);
      if (videoIds.length === 0) return [];

      const { data: videosData, error: videoError } = await safeRequest(
        supabase
          .from('videos')
          .select('*')
          .in('id', videoIds)
      );

      if (videoError) {
        console.error('Error fetching favorites videos:', videoError);
        throw videoError;
      }

      const withProducts = await attachProductsToVideos(videosData || []);
      const videosMap: Record<string, any> = {};
      withProducts?.forEach(v => { videosMap[v.id] = v; });

      return sortedLinks
        .map(f => {
          const v = videosMap[f.video_id];
          if (!v) return null;
          const mapped = mapVideo(v);
          return {
            ...mapped,
            addedAt: f.created_at || f.added_at
          } as Video;
        })
        .filter((v): v is Video => v !== null && !!v.id);
    } catch (err) {
      console.error('Catch in getFavorites:', err);
      return [];
    }
  },

  isFavorite: async (userId: string, videoId: string) => {
    if (!userId || !videoId) return false;
    try {
      const { data, error } = await safeRequest(
        supabase
          .from('favorites')
          .select('*')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .maybeSingle()
      );

      if (error || !data) return false;

      // Verify it's not older than 30 days
      const dateStr = data.created_at || data.added_at;
      if (dateStr) {
        const addedDate = new Date(dateStr);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (addedDate < thirtyDaysAgo) {
          // Trop ancien, on le supprime (silently)
          supabase.from('favorites').delete().eq('user_id', userId).eq('video_id', videoId).then(() => {});
          return false;
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  },

  addComment: async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        video_id: comment.videoId,
        user_id: comment.userId,
        user_name: comment.userName,
        text: comment.text
      }])
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error('Supabase AddComment Error:', error || 'Failed to add comment');
      throw error || new Error('Failed to add comment');
    }
    return {
      id: data.id,
      videoId: data.video_id,
      userId: data.user_id,
      userName: data.user_name,
      text: data.text,
      createdAt: data.created_at
    };
  },

  updateComment: async (commentId: string, text: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ text })
      .eq('id', commentId);
      
    if (error) {
      console.error('Supabase UpdateComment Error:', error);
      throw error;
    }
  },

  deleteComment: async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
      
    if (error) {
      console.error('Supabase DeleteComment Error:', error);
      throw error;
    }
  },

  getComments: async (videoId: string) => {
    const { data, error } = await safeRequest(supabase
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false }));

    if (error) {
      console.error('Supabase GetComments Error:', error);
      throw error;
    }
    return (data as any[] || []).map(c => ({
      id: c.id,
      videoId: c.video_id,
      userId: c.user_id,
      userName: c.user_name,
      text: c.text,
      createdAt: c.created_at
    }));
  },

  toggleLike: async (userId: string, videoId: string) => {
    const { data: existing } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle();

    const { data: video } = await supabase.from('videos').select('likes, category').eq('id', videoId).maybeSingle();
    let newLikes = video?.likes || 0;

    if (existing) {
      await supabase.from('likes').delete().eq('user_id', userId).eq('video_id', videoId);
      newLikes = Math.max(0, newLikes - 1);
    } else {
      await supabase.from('likes').insert([{ user_id: userId, video_id: videoId }]);
      newLikes += 1;
      
      // Update preferences when liking
      if (video?.category) {
        await db.updateUserPreferences(userId, video.category);
      }
    }

    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({ likes: newLikes })
      .eq('id', videoId)
      .select('*')
      .maybeSingle();

    if (updateError || !updatedVideo) {
      console.error('Supabase toggleLike update error:', updateError);
      // Let's at least get the full video so we don't return an empty husk
      const { data: fullVideo } = await supabase.from('videos').select('*').eq('id', videoId).maybeSingle();
      if (!fullVideo) return null;
      fullVideo.likes = newLikes;
      const withProducts = await attachProductsToVideos([fullVideo]);
      const mapped = mapVideo(withProducts[0] || fullVideo);
      mapped.likedBy = existing ? [] : [userId];
      return mapped;
    }
    
    const withProducts = await attachProductsToVideos([updatedVideo]);
    const mapped = mapVideo(withProducts[0] || updatedVideo);
    mapped.likedBy = existing ? [] : [userId];
    return mapped;
  },

  isLiked: async (userId: string, videoId: string) => {
    const { data } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle();

    return !!data;
  },

  toggleProductFavorite: async (userId: string, productId: string) => {
    const { data: existing } = await supabase
      .from('product_favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      await supabase.from('product_favorites').delete().eq('user_id', userId).eq('product_id', productId);
    } else {
      await supabase.from('product_favorites').insert([{ user_id: userId, product_id: productId }]);
    }
  },

  getProductFavorites: async (userId: string) => {
    try {
      if (!userId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Auto-delete older than 30 days
      try {
        await supabase
          .from('product_favorites')
          .delete()
          .eq('user_id', userId)
          .lt('created_at', thirtyDaysAgo.toISOString());
      } catch (e) { /* silent fail */ }

      let { data, error } = await safeRequest(
        supabase
          .from('product_favorites')
          .select('product_id, created_at, products(*)')
          .eq('user_id', userId)
      );

      if (error || !data) {
        console.warn('Error fetching product favorites with relation, trying separate fetch:', error);
        const { data: rawFavs, error: favError } = await safeRequest(
          supabase
            .from('product_favorites')
            .select('product_id, created_at')
            .eq('user_id', userId)
        );
        if (favError || !rawFavs || rawFavs.length === 0) {
          return [];
        }
        const productIds = rawFavs.map(f => f.product_id).filter(Boolean);
        if (productIds.length > 0) {
          const { data: productsData, error: productsError } = await safeRequest(
            supabase.from('products').select('*').in('id', productIds)
          );
          if (!productsError && productsData) {
            const productsMap = new Map(productsData.map(p => [p.id, p]));
            return rawFavs
              .filter(f => productsMap.has(f.product_id))
              .map(f => {
                const p = mapProduct(productsMap.get(f.product_id));
                return {
                  ...p,
                  added_at: f.created_at
                };
              });
          }
        }
        return [];
      }
      
      return (data || [])
        .filter(f => f.products) // Ensure the joined product exists
        .map(f => {
          const p = mapProduct(f.products);
          return {
            ...p,
            added_at: f.created_at
          };
        });
    } catch (err) {
      console.error('Catch in getProductFavorites:', err);
      return [];
    }
  },

  getAllProducts: async () => {
    let { data, error } = await safeRequest(
      supabase
        .from('products')
        .select('*, videos(id, category, entreprise_id, entreprise_name)')
    );

    if (error || !data) {
      console.warn('Supabase GetAllProducts with relation failed, trying separate fetch:', error);
      
      const { data: productsData, error: productsError } = await safeRequest(
        supabase.from('products').select('*')
      );
      
      if (productsError || !productsData) {
        console.error('Supabase fallback GetAllProducts Error:', productsError);
        return [];
      }
      
      const videoIds = Array.from(new Set(productsData.map((p: any) => p.video_id).filter(Boolean)));
      
      let videosMap = new Map<string, any>();
      if (videoIds.length > 0) {
        const { data: videosData, error: videosError } = await safeRequest(
          supabase
            .from('videos')
            .select('id, category, entreprise_id, entreprise_name')
            .in('id', videoIds)
        );
        if (!videosError && videosData) {
          videosMap = new Map(videosData.map((v: any) => [v.id, v]));
        }
      }
      
      return productsData.map((p: any) => {
        const mapped = mapProduct(p);
        const matchedVideo = videosMap.get(p.video_id);
        let category = 'Autre';
        if (matchedVideo) {
          category = matchedVideo.category;
        } else if (p.category) {
          category = p.category;
        }
        
        return {
          ...mapped,
          videoId: p.video_id,
          category: category
        };
      });
    }

    return (data || []).map((p: any) => {
      const mapped = mapProduct(p);
      let category = 'Autre';
      if (p.videos) {
        category = Array.isArray(p.videos) ? p.videos[0]?.category : p.videos.category;
      } else if (p.category) { // Fallback if product itself has a category
        category = p.category;
      }
      
      return {
        ...mapped,
        videoId: p.video_id,
        category: category
      };
    });
  },

  isProductFavorite: async (userId: string, productId: string) => {
    const { data } = await supabase
      .from('product_favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (!data) return false;

    const dateStr = data.created_at;
    if (dateStr) {
      const addedDate = new Date(dateStr);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (addedDate < thirtyDaysAgo) {
        await supabase.from('product_favorites').delete().eq('user_id', userId).eq('product_id', productId);
        return false;
      }
    }

    return true;
  },

  uploadFile: async (bucket: string, path: string, file: File | Blob) => {
    // Sanitize path to avoid "Invalid key" errors (spaces, accents, etc.)
    const sanitizedPath = path
      .split('/')
      .map(part => part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_'))
      .join('/');

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(sanitizedPath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        // If bucket is missing, RLS policy prevents upload, or key is invalid, we fallback to base64 to avoid blocking the user
        if (
          error.message.includes('not found') || 
          error.message.includes('Bucket') || 
          error.message.includes('policy') ||
          error.message.includes('security') ||
          error.message.includes('Invalid key')
        ) {
          console.warn(`Supabase Storage (${bucket}): ${error.message}. Utilisation du mode Base64 (temporaire).`);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error(`Supabase Upload Error (${bucket}):`, error);
      // Fallback to base64 in case of any upload error
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }
};

