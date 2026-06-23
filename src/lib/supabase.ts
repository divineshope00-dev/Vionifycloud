import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.trim() !== '') 
  ? import.meta.env.VITE_SUPABASE_URL 
  : 'https://vlrddnnhwtybwhciqkvv.supabase.co';

const getSupabaseUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  // If it already looks like a full domain (contains a dot), just add https
  if (url.includes('.')) return `https://${url}`;
  // Otherwise assume it's just the project reference
  return `https://${url}.supabase.co`;
};

const supabaseUrl = getSupabaseUrl(rawUrl);

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.trim() !== '') 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscmRkbm5od3R5YndoY2lxa3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mzc3NjAsImV4cCI6MjA5MDAxMzc2MH0.qcyEe5GhPcQfAuSGppYSXEfeTy4LrL77Lc1nqNsfAaY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

