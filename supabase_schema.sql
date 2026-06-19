-- Run this script in your Supabase SQL Editor to establish relationships and add missing columns

-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT,
  type TEXT,
  profile_pic TEXT,
  first_publish_date TIMESTAMPTZ,
  trial_start_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  subscription_status TEXT,
  subscription_end_date TIMESTAMPTZ,
  peak_monthly_clients INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  preferred_categories JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT,
  price NUMERIC,
  discount NUMERIC,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID,
  video_id UUID,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 2. Add missing columns safely if tables ALREADY existed without them
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.videos ADD COLUMN entreprise_name TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.videos ADD COLUMN entreprise_pic TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.videos ADD COLUMN price NUMERIC;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.videos ADD COLUMN discount NUMERIC;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.videos ADD COLUMN link TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.videos ADD COLUMN category TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.users ADD COLUMN preferred_categories JSONB DEFAULT '{}'::jsonb;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.users ADD COLUMN trial_start_date TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.users ADD COLUMN trial_ends_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE public.users ADD COLUMN first_publish_date TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 3. Add Foreign Key Constraints linking the tables together
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_videos_entreprise') THEN
        ALTER TABLE public.videos ADD CONSTRAINT fk_videos_entreprise FOREIGN KEY (entreprise_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_products_video') THEN
        ALTER TABLE public.products ADD CONSTRAINT fk_products_video FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_likes_video') THEN
        ALTER TABLE public.likes ADD CONSTRAINT fk_likes_video FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_likes_user') THEN
        ALTER TABLE public.likes ADD CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;
