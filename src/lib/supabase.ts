import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  try {
    // 1. Try to access via window if on browser
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    
    // 2. Try direct process.env via dynamic property to bypass static analyzer inlining
    const envObj = typeof process !== 'undefined' ? process.env : null;
    if (envObj && envObj[key]) {
      return envObj[key] as string;
    }
    
    // 3. Try globalThis.process.env
    const globalProcessEnv = (typeof globalThis !== 'undefined' && (globalThis as any).process) 
      ? (globalThis as any).process.env 
      : null;
    if (globalProcessEnv && globalProcessEnv[key]) {
      return globalProcessEnv[key] as string;
    }

    // 4. Try import.meta.env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // Ignore error
  }
  return '';
};

const rawUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://vlrddnnhwtybwhciqkvv.supabase.co';

const getSupabaseUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  // If it already looks like a full domain (contains a dot), just add https
  if (url.includes('.')) return `https://${url}`;
  // Otherwise assume it's just the project reference
  return `https://${url}.supabase.co`;
};

const supabaseUrl = getSupabaseUrl(rawUrl);

const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscmRkbm5od3R5YndoY2lxa3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mzc3NjAsImV4cCI6MjA5MDAxMzc2MH0.qcyEe5GhPcQfAuSGppYSXEfeTy4LrL77Lc1nqNsfAaY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || getEnv('SERVICE_ROLE_KEY');

// Add server-side console logs to verify key detection on serverless platforms
if (typeof window === 'undefined') {
  console.log('[Supabase Initialization] Server environment detected');
  console.log('[Supabase Initialization] URL resolved to:', supabaseUrl);
  if (serviceRoleKey) {
    console.log('[Supabase Initialization] SUCCESS: SUPABASE_SERVICE_ROLE_KEY detected! Admin client will bypass RLS.');
  } else {
    console.warn('[Supabase Initialization] WARNING: No SUPABASE_SERVICE_ROLE_KEY found in server environment! Falling back to anonymous key. Check your environment variables.');
  }
}

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : supabase;


