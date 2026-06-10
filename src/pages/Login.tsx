import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { db } from '../services/supabaseService';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/app/home';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const user = await db.login(email, password);
      if (user) {
        navigate(redirectUrl);
      } else {
        setError('Email ou mot de passe invalide. Veuillez réessayer ou vous inscrire.');
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre adresse e-mail pour réinitialiser votre mot de passe.');
      return;
    }
    
    setError('');
    setSuccessMsg('');
    setIsResetting(true);
    
    try {
      await db.resetPasswordForEmail(email);
      setSuccessMsg('Un e-mail de réinitialisation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.');
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue lors de la demande de réinitialisation.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-white relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Retour</span>
      </button>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6">
          Welcome Back to <span className="text-purple-500">Vionify</span>
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-lg mb-6 text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email address"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
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
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition-colors focus:outline-none disabled:opacity-50 mt-1"
              >
                {isResetting ? 'Envoi...' : 'Mot de passe oublié ?'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isResetting}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 rounded-xl mt-6 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Logging In...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>
        
        <p className="text-center text-sm text-zinc-500 mt-6">
          Don't have an account? <Link to={`/role-selection${redirectUrl !== '/app/home' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="text-purple-400 hover:underline">Sign up</Link>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-6 text-xs text-center border-t border-zinc-800/50 pt-6">
          <Link to="/privacy-policy" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">Politique de confidentialité</Link>
          <span className="hidden sm:inline text-zinc-600">•</span>
          <Link to="/terms-of-service" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">CGU</Link>
        </div>
      </div>
    </div>
  );
}
