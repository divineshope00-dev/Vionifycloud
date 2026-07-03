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
  const images = [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=1066&fit=crop', // Fashion
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=1066&fit=crop', // Shoes
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&h=1066&fit=crop', // Tech
    'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=600&h=1066&fit=crop', // Bag
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-900 via-[#0a0502] to-black flex flex-col items-center justify-between p-6 text-white overflow-hidden notranslate" translate="no">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-center z-10"
      >
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-purple-500">V</span>ionify
        </h1>
        <h2 className="text-4xl md:text-6xl font-extrabold mt-6 leading-tight">
          Let your video <br />
          <span className="text-purple-400 italic font-serif">sell for you</span>
        </h2>
      </motion.div>

      {/* Images Grid */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-5xl my-12"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {images.map((src, i) => (
            <div 
              key={i} 
              className={`relative rounded-2xl overflow-hidden aspect-[9/16] shadow-2xl shadow-purple-900/20 ${i % 2 !== 0 ? 'md:mt-12' : ''}`}
            >
              <img 
                src={src} 
                alt={`Product ${i + 1}`} 
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md flex flex-col items-center gap-4 mb-8 z-10"
      >
        <button
          onClick={handleWatchWithoutAccount}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-full text-xs font-medium text-purple-300 hover:text-purple-200 transition-all cursor-pointer group mb-1"
        >
          <div className="w-5 h-5 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center group-hover:bg-purple-500/30 group-hover:scale-105 transition-all">
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          </div>
          Watch without an account
        </button>

        <Link 
          to="/role-selection"
          className="w-full bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold py-4 rounded-full text-center transition-all shadow-lg shadow-purple-600/30"
        >
          Get Started
        </Link>
        <p className="text-sm text-gray-400">
          Already have account?{' '}
          <Link to="/login" className="text-purple-400 font-medium hover:underline">
            Log in
          </Link>
        </p>

        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
          <Link to="/privacy-policy" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">Politique de confidentialité</Link>
          <span className="text-zinc-600">•</span>
          <Link to="/terms-of-service" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">CGU</Link>
        </div>
      </motion.div>
    </div>
  );
}
