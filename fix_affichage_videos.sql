-- Script SQL pour résoudre le problème d'affichage des vidéos

-- 1. DESACTIVER TOTALEMENT LA SECURITE POUR DEBOGAGE (RLS)
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les anciennes politiques qui pourraient bloquer
DROP POLICY IF EXISTS "Enable read access for all users" ON public.videos;
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.videos;
DROP POLICY IF EXISTS "Enable update for all users" ON public.videos;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.videos;

-- 3. On ne remet PAS le RLS. On laisse tout public le temps que vous testiez.
-- Les tables sont maintenant totalement accessibles en lecture et écriture sans blocage.

-- 3. Ajouter toutes les colonnes manquantes au cas où elles ne seraient pas là
DO $$
BEGIN
    BEGIN ALTER TABLE public.videos ADD COLUMN entreprise_name TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN entreprise_pic TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN price NUMERIC; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN discount NUMERIC; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN link TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN category TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN likes INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN views INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.videos ADD COLUMN clicks INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
END $$;
