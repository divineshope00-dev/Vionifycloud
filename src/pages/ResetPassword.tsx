import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { db } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we have an active session (which should happen automatically after clicking the reset link)
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // If not authenticated, we listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            console.log('Password recovery mode enabled.');
          }
        });
        return () => subscription.unsubscribe();
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      await db.updatePassword(password);
      setSuccess(true);
      
      // Redirect to app home after a short delay
      setTimeout(() => {
        navigate('/app/home');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Mot de passe réinitialisé</h2>
          <p className="text-zinc-400 mb-8">Votre mot de passe a été modifié avec succès. Vous allez être redirigé...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-white relative">
      <button 
        onClick={() => navigate('/login')}
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Retour à la connexion</span>
      </button>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6">
          Nouveau <span className="text-purple-500">mot de passe</span>
        </h1>

        <p className="text-center text-sm text-zinc-400 mb-6">
          Veuillez entrer votre nouveau mot de passe ci-dessous.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nouveau mot de passe"
              required
              minLength={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
             <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              required
              minLength={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 rounded-xl mt-6 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Modification...
              </>
            ) : (
              'Modifier le mot de passe'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
