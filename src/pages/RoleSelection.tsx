import { Link, useLocation } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RoleSelection() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');
  const redirectQuery = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Choose Account</h1>
          <p className="text-gray-400">Select how you want to use Vionify</p>
        </div>

        <div className="space-y-4">
          <Link 
            to={`/signup/entreprise${redirectQuery}`}
            className="group flex items-center p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-purple-900/20 hover:border-purple-500/50 transition-all"
          >
            <div className="bg-purple-500/10 p-4 rounded-full mr-6 group-hover:bg-purple-500/20 transition-colors">
              <Building2 className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Entreprise</h2>
              <p className="text-sm text-gray-400">Publish videos and sell products</p>
            </div>
          </Link>

          <Link 
            to={`/signup/particulier${redirectQuery}`}
            className="group flex items-center p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-purple-900/20 hover:border-purple-500/50 transition-all"
          >
            <div className="bg-purple-500/10 p-4 rounded-full mr-6 group-hover:bg-purple-500/20 transition-colors">
              <User className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Particulier</h2>
              <p className="text-sm text-gray-400">Discover and buy products</p>
            </div>
          </Link>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-8">
          Already have an account? <Link to={`/login${redirectQuery}`} className="text-purple-400 hover:underline">Log in</Link>
        </p>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-center border-t border-zinc-800/50 pt-6">
          <Link to="/privacy-policy" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">Politique de confidentialité</Link>
          <span className="text-zinc-600">•</span>
          <Link to="/terms-of-service" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">CGU</Link>
        </div>
      </motion.div>
    </div>
  );
}
