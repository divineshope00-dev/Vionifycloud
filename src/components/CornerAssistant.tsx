import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flower2, Send, X, MessageCircle, Sparkles, ExternalLink, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../services/supabaseService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function CornerAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  const suggestions = [
    { id: 'resume', textFr: 'Résume la vidéo', textEn: 'Summarize the video' },
    { id: 'recommande', textFr: 'Recommande du contenu associé', textEn: 'Recommend related content' },
    { id: 'pourquoi_plan', textFr: 'Pourquoi utiliser Vionify ?', textEn: 'Why use Vionify?' },
    { id: 'club', textFr: 'Qu\'est-ce que le Club Privé ?', textEn: 'What is the Private Club?' },
  ];

  const [chatHistory, setChatHistory] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('vionify_corner_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('vionify_corner_chat_history', JSON.stringify(chatHistory));
    } catch (err) {
      console.warn('Failed to save chat history to localStorage:', err);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const currentUser = db.getCurrentUser();

    try {
      const response = await fetch('/api/corner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          language,
          userId: currentUser?.id,
          userName: currentUser?.name,
          userEmail: currentUser?.email
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: t('corner.error.generic') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;

    // Matches [text](url)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const text = match[1];
      const url = match[2];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      if (url.startsWith('/app/')) {
        parts.push(
          <button
            key={matchIndex}
            type="button"
            onClick={() => {
              navigate(url);
              setIsOpen(false);
            }}
            className="text-purple-300 hover:text-white font-semibold underline inline-flex items-center gap-1 px-2 py-0.5 roundedbg bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 my-0.5 transition-all cursor-pointer text-[12px] text-left"
          >
            <Play className="w-3 h-3 text-purple-400 fill-purple-400 inline" />
            {text}
          </button>
        );
      } else {
        parts.push(
          <a
            key={matchIndex}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-white font-semibold underline inline-flex items-center gap-1 px-2 py-0.5 roundedbg bg-white/5 hover:bg-white/15 border border-white/10 my-0.5 transition-all text-[12px]"
          >
            {text}
            <ExternalLink className="w-3 h-3 opacity-60 inline" />
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    if (parts.length === 0) {
      return <p className="whitespace-pre-line">{content}</p>;
    }

    return (
      <span className="whitespace-pre-line">
        {parts.map((part, i) => (
          <React.Fragment key={i}>{part}</React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-5 md:left-5 md:right-auto md:bottom-28 z-[45] w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20 group border-2 border-purple-100 hover:border-purple-400 transition-all overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <Flower2 className="w-10 h-10 text-purple-200 transform rotate-45" />
        </div>
        <div className="relative flex flex-wrap items-center justify-center gap-0.5 w-8 h-8">
          <Flower2 className="w-3.5 h-3.5 text-purple-600" />
          <Flower2 className="w-3.5 h-3.5 text-purple-400" />
          <Flower2 className="w-3.5 h-3.5 text-purple-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-2 h-2 text-amber-400 animate-pulse" />
          </div>
        </div>
      </motion.button>

      {/* Chat Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed inset-0 md:left-20 z-[120] bg-black flex flex-col h-full overflow-hidden"
            >
              <div className="px-6 py-3 flex items-center justify-between border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                    Corner
                  </h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 md:px-20 py-8 space-y-12 scrollbar-hide bg-black"
              >
                {/* Initial Welcome Message */}
                {chatHistory.length === 0 && (
                  <div className="max-w-4xl mx-auto space-y-12 py-12">
                    <div className="space-y-6">
                      <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter"
                      >
                        {language === 'fr' 
                          ? 'Bienvenue dans Corner.\nComment puis-je vous aider ?' 
                          : 'Welcome to Corner.\nHow can I help you?'}
                      </motion.h1>
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-zinc-400 text-lg md:text-2xl font-medium max-w-2xl"
                      >
                        {language === 'fr'
                          ? 'L\'intelligence artificielle au cœur de votre expérience de streaming et du Club Privé.'
                          : 'Artificial intelligence at the heart of your streaming and Private Club experience.'}
                      </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.map((s, idx) => (
                        <motion.button
                          key={s.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                          onClick={() => {
                            const txt = language === 'fr' ? s.textFr : s.textEn;
                            setMessage(txt);
                          }}
                          className="p-8 rounded-[32px] border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-800/80 text-left transition-all group backdrop-blur-sm"
                        >
                          <p className="text-zinc-100 font-bold text-lg mb-2 group-hover:text-purple-400 transition-colors">
                            {language === 'fr' ? s.textFr : s.textEn}
                          </p>
                          <p className="text-zinc-500 text-sm font-medium">
                            {language === 'fr' 
                              ? 'Demandez plus de détails à l\'assistant' 
                              : 'Ask the assistant for more details'}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="max-w-4xl mx-auto space-y-10 pb-12">
                  {chatHistory.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`px-8 py-5 rounded-[32px] max-w-[90%] leading-relaxed text-lg shadow-2xl ${
                        msg.role === 'user'
                          ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 font-medium'
                          : 'text-zinc-200 bg-transparent px-0 border-none'
                      }`}>
                        {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 text-zinc-500 px-4"
                    >
                      <div className="flex gap-1.5 items-center bg-zinc-900/50 px-6 py-4 rounded-full border border-zinc-800">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Input area */}
              <div className="px-6 md:px-20 py-4 bg-black border-t border-white/5">
                <form 
                  onSubmit={handleSendMessage}
                  className="max-w-4xl mx-auto"
                >
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={language === 'fr' ? 'Écrivez votre message...' : 'Type your message...'}
                      className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-full py-3.5 pl-6 pr-14 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/30 transition-all text-base backdrop-blur-xl"
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-20"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
