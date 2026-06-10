import React, { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { countries } from '../utils/countries';
import { db, UserType } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function Signup() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage } = useLanguage();
  const isEntreprise = role === 'entreprise';

  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/app/home';
  const redirectQuery = searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : '';

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    country: '',
    password: '',
    confirmPassword: '',
    profilePic: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePic: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isEntreprise && !formData.profilePic) {
      setError('Profile photo is required for Entreprise accounts.');
      setIsLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the terms and conditions.');
      setIsLoading(false);
      return;
    }

    try {
      let profilePicUrl = formData.profilePic;
      
      // If there's a file, upload it to Supabase Storage
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = fileInput?.files?.[0];
      if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        profilePicUrl = await db.uploadFile('vionify-assets', `profiles/${fileName}`, file);
      }

      await db.register({
        type: role as UserType,
        email: formData.email,
        name: formData.name,
        country: formData.country,
        profilePic: profilePicUrl,
      }, formData.password);

      // Set language based on selected country
      const frenchSpeakingCountries = [
        "Cameroon", "Benin", "Côte d'Ivoire", "Congo", "Democratic Republic of the Congo",
        "Gabon", "Guinea", "Niger", "Senegal", "Togo", "France", "Guadeloupe", 
        "Martinique", "Réunion", "Monaco"
      ];
      
      if (frenchSpeakingCountries.includes(formData.country)) {
        setLanguage('fr');
      } else {
        setLanguage('en');
      }

      navigate(redirectUrl);
    } catch (err: any) {
      console.error('Signup error:', err);
      const errorMessage = err.message || '';
      
      if (errorMessage.includes('already registered') || errorMessage.includes('exists') || errorMessage.includes('Email already in use')) {
        setError(
          <div className="flex flex-col gap-1 items-center">
            <span>Ce compte existe déjà.</span>
            <Link to={`/login${redirectQuery}`} className="text-purple-400 font-bold hover:underline">
              Se connecter ici
            </Link>
          </div>
        );
      } else if (errorMessage.includes('database') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
        setError('Erreur de connexion à la base de données. Veuillez vérifier votre connexion internet ou réessayer plus tard.');
      } else if (errorMessage.includes('Password should be at least')) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else {
        setError(`L'inscription a échoué: ${errorMessage || 'Veuillez vérifier vos informations.'}`);
      }
    } finally {
      setIsLoading(false);
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
          Create <span className="text-purple-500 capitalize">{role}</span> Account
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center mb-6">
            <label className="relative cursor-pointer group">
              <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${formData.profilePic ? 'border-purple-500' : 'border-zinc-700 group-hover:border-purple-500'}`}>
                {formData.profilePic ? (
                  <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-zinc-500 group-hover:text-purple-500" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
                required={isEntreprise}
              />
            </label>
            <span className="text-xs text-zinc-500 mt-2">
              {isEntreprise ? 'Required photo' : 'Optional photo'}
            </span>
          </div>

          <div>
            <input
              type="text"
              placeholder={isEntreprise ? "Company Name" : "Full Name"}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <input
              type="email"
              placeholder="Email address"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <select
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors appearance-none"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            >
              <option value="" disabled>Select Country</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms"
              required
              className="mt-1 rounded bg-zinc-800 border-zinc-700 text-purple-500 focus:ring-purple-500"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <label htmlFor="terms" className="text-sm text-zinc-400">
              I accept the{' '}
              <Link to="/privacy-policy" className="text-purple-400 hover:underline">Politique de confidentialité</Link>
              {' '}and{' '}
              <Link to="/terms-of-service" className="text-purple-400 hover:underline">CGU</Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 rounded-xl mt-6 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Subscribing...
              </>
            ) : (
              'Subscribe'
            )}
          </button>
        </form>
        
        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account? <Link to={`/login${redirectQuery}`} className="text-purple-400 hover:underline">Log in</Link>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-6 text-xs">
          <Link to="/privacy-policy" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">Politique de confidentialité</Link>
          <span className="hidden sm:inline text-zinc-600">•</span>
          <Link to="/terms-of-service" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">Conditions Générales d'Utilisation (CGU)</Link>
        </div>
      </div>
    </div>
  );
}
