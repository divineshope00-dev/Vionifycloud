import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export default function Contact() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.warn('No active user session found, redirecting...');
          navigate('/login', { replace: true });
          return;
        }
        setEmail(user.email || '');
      } catch (err) {
        console.error('Error fetching auth user:', err);
        navigate('/login', { replace: true });
      } finally {
        setIsLoadingUser(false);
      }
    }
    loadUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, message }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setIsSuccess(true);
      setMessage('');
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMsg(
        language === 'fr'
          ? `Une erreur est survenue lors de l'envoi : ${err.message || 'veuillez réessayer.'}`
          : `An error occurred while sending: ${err.message || 'please try again.'}`
      );
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm font-medium text-zinc-500">
            {language === 'fr' ? 'Chargement de votre session...' : 'Loading your session...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="contact-container" className="h-[100dvh] overflow-y-auto bg-zinc-50 text-zinc-900 relative scroll-smooth pb-16 flex flex-col">
      {/* Header */}
      <div id="contact-header" className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            id="contact-back-button"
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-zinc-900">
            {language === 'fr' ? 'Support Client' : 'Customer Support'}
          </h1>
        </div>
      </div>

      <div className="flex-1 max-w-xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        <div id="contact-card" className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl p-6 md:p-8 space-y-6">
          
          <div className="text-center space-y-2">
            <h2 id="contact-title" className="text-2xl font-extrabold tracking-tight text-zinc-900">
              {language === 'fr' ? 'Contacter le support Vionify' : 'Contact Vionify Support'}
            </h2>
            <p id="contact-description" className="text-zinc-500 text-sm leading-relaxed max-w-md mx-auto">
              {language === 'fr'
                ? 'Une question ou un problème ? Notre équipe officielle vous répond directement sous 24h.'
                : 'A question or a problem? Our official team answers you directly within 24 hours.'}
            </p>
          </div>

          {isSuccess ? (
            <div id="contact-success-state" className="py-6 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-md">
                <p id="contact-success-title" className="text-emerald-800 font-semibold text-lg">
                  {language === 'fr' ? 'Message envoyé !' : 'Message Sent!'}
                </p>
                <p id="contact-success-text" className="text-zinc-600 text-sm leading-relaxed">
                  {language === 'fr'
                    ? '✓ Votre message a bien été transmis à l\'équipe de support Vionify. Un e-mail de confirmation vient de vous être envoyé. Merci pour votre confiance !'
                    : '✓ Your message has been successfully sent to the Vionify support team. A confirmation email has been sent to you. Thank you for your trust!'}
                </p>
              </div>
              <button
                id="contact-reset-button"
                onClick={() => setIsSuccess(false)}
                className="mt-4 px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl text-sm transition-colors cursor-pointer"
              >
                {language === 'fr' ? 'Envoyer un autre message' : 'Send another message'}
              </button>
            </div>
          ) : (
            <form id="contact-form" onSubmit={handleSubmit} className="space-y-5">
              
              {/* Field 1: Email (Disabled / ReadOnly) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Adresse E-mail' : 'Email Address'}
                </label>
                <input
                  id="contact-email-input"
                  type="email"
                  value={email}
                  disabled
                  readOnly
                  className="w-full bg-zinc-100/80 text-zinc-500 border border-zinc-200/80 rounded-2xl px-4 py-3.5 outline-none cursor-not-allowed text-sm font-medium transition-colors"
                />
              </div>

              {/* Field 2: Message Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Votre Message' : 'Your Message'}
                </label>
                <textarea
                  id="contact-message-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    language === 'fr'
                      ? 'Décrivez votre demande en détail ici...'
                      : 'Describe your request in detail here...'
                  }
                  required
                  rows={6}
                  className="w-full bg-white text-zinc-900 border border-zinc-200 rounded-2xl px-4 py-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-sm leading-relaxed resize-none transition-all placeholder:text-zinc-400"
                />
              </div>

              {errorMsg && (
                <div id="contact-error-message" className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-medium leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {/* Button */}
              <div className="flex justify-center pt-2">
                <button
                  id="contact-submit-button"
                  type="submit"
                  disabled={isSending || !message.trim()}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-400 text-white font-semibold rounded-2xl shadow-lg shadow-purple-600/10 hover:shadow-purple-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm select-none cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{language === 'fr' ? 'Envoi en cours...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{language === 'fr' ? 'Envoyer le message' : 'Envoyer le message'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
