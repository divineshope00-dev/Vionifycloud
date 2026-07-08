import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleWatchWithoutAccount = () => {
    localStorage.setItem('vionify_user', JSON.stringify({
      id: 'guest',
      type: 'particulier',
      isGuest: true,
      name: 'Visitor',
      email: 'guest@vionify.com',
      subscriptionStatus: 'inactive'
    }));
    window.dispatchEvent(new Event('user-changed'));
    navigate('/app/home');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-950 via-[#0a0502] to-black flex flex-col items-center justify-between p-6 text-white overflow-hidden notranslate" translate="no">
      {/* Spacer to push content to middle */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md gap-12 z-10 text-center my-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <h1 className="text-6xl font-bold tracking-tight">
            <span className="text-purple-500">V</span>ionify
          </h1>
          <h2 className="text-4xl md:text-5xl font-extrabold mt-6 leading-tight tracking-tight">
            Let your video <br />
            <span className="text-purple-400 italic font-serif">sell for you</span>
          </h2>
        </motion.div>

        {/* Buttons / Actions Block */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full flex flex-col items-center gap-4 px-2"
        >
          <Link 
            to="/role-selection"
            className="w-full bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold py-4 rounded-full text-center transition-all duration-300 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 hover:scale-[1.01]"
          >
            Sign Up
          </Link>

          <Link 
            to="/login"
            className="w-full bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-white text-lg font-semibold py-4 rounded-full text-center transition-all duration-300 hover:scale-[1.01]"
          >
            Log In
          </Link>

          <button
            onClick={handleWatchWithoutAccount}
            className="flex items-center gap-2 px-5 py-2.5 mt-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/30 rounded-full text-xs font-medium text-purple-300 hover:text-purple-200 transition-all cursor-pointer group"
          >
            <div className="w-5 h-5 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center group-hover:bg-purple-500/30 group-hover:scale-105 transition-all">
              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
            </div>
            Accéder sans compte (Visiteur)
          </button>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs flex flex-col items-center gap-3 py-4 mt-auto text-xs text-zinc-500"
      >
        <div className="flex items-center justify-center gap-4">
          <Link to="/privacy-policy" className="hover:text-purple-400 hover:underline transition-colors">Politique de confidentialité</Link>
          <span className="text-zinc-700">•</span>
          <Link to="/terms-of-service" className="hover:text-purple-400 hover:underline transition-colors">CGU</Link>
        </div>
      </motion.div>
    </div>
  );
}
