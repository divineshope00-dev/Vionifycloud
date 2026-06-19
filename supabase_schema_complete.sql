-- Copiez et exécutez ce script dans l'éditeur SQL de Supabase
-- Ce script regroupe toutes les tables et relations pour la plateforme

-- 1. Table Utilisateurs (users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT,
  type TEXT,
  profile_pic TEXT,
  country TEXT,
  language TEXT,
  first_publish_date TIMESTAMPTZ,
  trial_start_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  subscription_status TEXT,
  subscription_plan TEXT,
  subscription_end_date TIMESTAMPTZ,
  is_annual BOOLEAN DEFAULT FALSE,
  paddle_subscription_id TEXT,
  payment_method TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  peak_monthly_clients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  preferred_categories JSONB DEFAULT '{}'::jsonb
);

-- Ajout des colonnes manquantes au cas où la table existe déjà (mise à jour)
DO $$
BEGIN
    BEGIN ALTER TABLE public.users ADD COLUMN country TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN language TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN first_publish_date TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN trial_start_date TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN trial_ends_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN subscription_status TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN subscription_plan TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN subscription_end_date TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN is_annual BOOLEAN; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN paddle_subscription_id TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN payment_method TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN onboarding_completed BOOLEAN; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN peak_monthly_clients INTEGER; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.users ADD COLUMN preferred_categories JSONB DEFAULT '{}'::jsonb; EXCEPTION WHEN duplicate_column THEN END;
END $$;


-- 2. Table Vidéos (videos)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entreprise_name TEXT,
  entreprise_pic TEXT,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC,
  discount NUMERIC,
  link TEXT,
  category TEXT,
  description TEXT,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajout des colonnes pour videos (mise à jour)
DO $$
BEGIN
    BEGIN ALTER TABLE public.videos ADD COLUMN entreprise_name TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN entreprise_pic TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN price NUMERIC; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN discount NUMERIC; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN link TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN category TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN views INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN clicks INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
END $$;


-- 3. Table Produits (products)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT,
  price NUMERIC,
  discount NUMERIC,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table Likes (likes) - Likes sur les vidéos
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 5. Table Favoris Vidéos (favorites)
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 6. Table Favoris Produits (product_favorites)
CREATE TABLE IF NOT EXISTS public.product_favorites (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- 7. Table Commentaires (comments)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table Atteinte Mensuelle Entreprise (business_monthly_reach)
CREATE TABLE IF NOT EXISTS public.business_monthly_reach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  clients_reached INTEGER DEFAULT 0,
  UNIQUE (entreprise_id, month)
);

-- Configuration des règles RLS (Row Level Security) Optionnelle (Recommandée)
-- Permet au client de lire publiquement mais seules les entreprises connectées peuvent insérer leurs vidéos
-- (A décommenter si besoin)
-- ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Videos are viewable by everyone" ON public.videos FOR SELECT USING (true);
-- CREATE POLICY "Users can insert their own videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = entreprise_id);
-- CREATE POLICY "Users can update their own videos" ON public.videos FOR UPDATE USING (auth.uid() = entreprise_id);
-- CREATE POLICY "Users can delete their own videos" ON public.videos FOR DELETE USING (auth.uid() = entreprise_id);
