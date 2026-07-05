-- ==============================================================================
-- SCRIPT SQL DE MISE À JOUR / ACTIVATION MANUELLE DE L'ABONNEMENT POUR UN UTILISATEUR
-- ==============================================================================
--
-- INSTRUCTIONS :
-- 1. Copiez tout ce code et collez-le dans l'éditeur SQL de Supabase (SQL Editor).
-- 2. Remplacez 'VOTRE_USER_UUID_ICI' par l'UUID de l'utilisateur (disponible dans 
--    l'onglet Authentication ou la table public.users).
-- 3. Si vous laissez 'VOTRE_USER_UUID_ICI', le script va automatiquement essayer 
--    d'activer le dernier utilisateur inscrit pour vous faciliter la tâche !
-- 4. Définissez 'is_annual_subscription' sur TRUE (pour Annuel) ou FALSE (pour Mensuel).

DO $$
DECLARE
    -- === CONFIGURATION ===
    target_user_input TEXT := 'VOTRE_USER_UUID_ICI'; -- <--- METTEZ L'UUID DE L'UTILISATEUR ICI (ou laissez tel quel pour le dernier inscrit)
    is_annual_subscription BOOLEAN := TRUE;         -- <--- TRUE pour Annuel, FALSE pour Mensuel
    plan_name TEXT := 'unlimited';                  -- <--- 'starter', 'pro', ou 'unlimited'
    -- =====================
    
    target_user_id UUID;
    end_interval INTERVAL;
    user_email TEXT;
BEGIN
    -- Détermination de la date de fin (1 an pour Annuel, 1 mois pour Mensuel)
    IF is_annual_subscription THEN
        end_interval := INTERVAL '1 year';
    ELSE
        end_interval := INTERVAL '1 month';
    END IF;

    -- Résolution de l'UUID de l'utilisateur
    IF target_user_input = 'VOTRE_USER_UUID_ICI' OR target_user_input IS NULL OR target_user_input = '' THEN
        -- Essayer de récupérer le dernier utilisateur inscrit dans la table public.users
        SELECT id, email INTO target_user_id, user_email
        FROM public.users
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1;
        
        IF target_user_id IS NULL THEN
            RAISE EXCEPTION 'Aucun utilisateur trouvé dans la table public.users. Veuillez inscrire un utilisateur d''abord.';
        ELSE
            RAISE NOTICE '--- MODE RECHERCHE AUTOMATIQUE ---';
            RAISE NOTICE 'Aucun UUID spécifié. Le dernier utilisateur inscrit a été sélectionné : % (%)', user_email, target_user_id;
        END IF;
    ELSE
        -- Vérifier si l'input est un UUID valide
        BEGIN
            target_user_id := target_user_input::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'L''identifiant fourni "%" n''est pas un UUID valide. Un UUID ressemble à : abc123e4-e89b-12d3-a456-426614174000', target_user_input;
        END;
    END IF;

    -- Vérification finale si l'utilisateur existe dans la table
    IF EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
        
        -- Récupération de l'email pour confirmation
        SELECT email INTO user_email FROM public.users WHERE id = target_user_id;

        -- Mise à jour complète de l'abonnement dans Supabase
        UPDATE public.users
        SET 
            subscription_status = 'active',
            subscription_plan = plan_name,
            subscription_end_date = NOW() + end_interval,
            is_annual = is_annual_subscription,
            payment_method = '{"brand": "Visa", "last4": "4242", "expiryDate": "12/28"}', -- Mode de paiement structuré JSON
            paddle_subscription_id = 'ls_manual_' || (CASE WHEN is_annual_subscription THEN 'annual_' ELSE 'monthly_' END) || substring(target_user_id::text from 1 for 8)
        WHERE id = target_user_id;
        
        RAISE NOTICE '================================================================';
        RAISE NOTICE 'ACTIVATION RÉUSSIE !';
        RAISE NOTICE 'Utilisateur : %', user_email;
        RAISE NOTICE 'UUID        : %', target_user_id;
        RAISE NOTICE 'Plan        : % (% de type %)', plan_name, (CASE WHEN is_annual_subscription THEN 'ANNUEL' ELSE 'MENSUEL' END), plan_name;
        RAISE NOTICE 'Date de fin : %', (NOW() + end_interval)::TEXT;
        RAISE NOTICE '================================================================';
    ELSE
        RAISE EXCEPTION 'L''utilisateur avec l''ID % n''a pas été trouvé dans la table public.users.', target_user_id;
    END IF;
END $$;
