import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="h-[100dvh] overflow-y-auto bg-black text-white p-6 md:p-8 max-w-3xl mx-auto pb-16 scroll-smooth">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        {t('app.back')}
      </button>

      <h1 className="text-3xl font-bold mb-8">{t('policy.privacy.title')}</h1>
      
      <div className="space-y-8 text-zinc-300 leading-relaxed">
        <section>
          <p>{t('policy.privacy.intro')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.data.title')}</h2>
          <p className="mb-2">{t('policy.privacy.data.intro')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>{t('policy.privacy.data.id.label')}</strong> {t('policy.privacy.data.id.desc')}</li>
            <li><strong>{t('policy.privacy.data.loc.label')}</strong> {t('policy.privacy.data.loc.desc')}</li>
            <li><strong>{t('policy.privacy.data.usage.label')}</strong> {t('policy.privacy.data.usage.desc')}</li>
            <li><strong>{t('policy.privacy.data.tech.label')}</strong> {t('policy.privacy.data.tech.desc')}</li>
            <li><strong>{t('policy.privacy.data.payment.label')}</strong> {t('policy.privacy.data.payment.desc')}</li>
          </ul>
          <p className="mt-4 text-zinc-400 italic">{t('policy.privacy.data.sensitive')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.use.title')}</h2>
          <p className="mb-2">{t('policy.privacy.use.intro')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.privacy.use.manage')}</li>
            <li>{t('policy.privacy.use.display')}</li>
            <li>{t('policy.privacy.use.payment')}</li>
            <li>{t('policy.privacy.use.improve')}</li>
            <li>{t('policy.privacy.use.communicate')}</li>
          </ul>
          <p className="mt-4 font-medium text-white">{t('policy.privacy.use.noSell')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.share.title')}</h2>
          <p className="mb-2">{t('policy.privacy.share.intro')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.privacy.share.tech')}</li>
            <li>{t('policy.privacy.share.legal')}</li>
            <li>{t('policy.privacy.share.public')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.security.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.privacy.security.storage')}</li>
            <li>{t('policy.privacy.security.access')}</li>
            <li>{t('policy.privacy.security.sessions')}</li>
            <li>{t('policy.privacy.security.backup')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.rights.title')}</h2>
          <p className="mb-2">{t('policy.privacy.rights.intro')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.privacy.rights.access')}</li>
            <li>{t('policy.privacy.rights.opposition')}</li>
          </ul>
          <div className="mt-4 space-y-1">
            <p><strong>{t('policy.privacy.rights.contact.label')}</strong> {t('policy.privacy.rights.contact.desc')}</p>
            <p><strong>{t('policy.privacy.rights.delay.label')}</strong> {t('policy.privacy.rights.delay.desc')}</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.cookies.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.privacy.cookies.essential')}</li>
            <li>{t('policy.privacy.cookies.pwa')}</li>
            <li>{t('policy.privacy.cookies.tracking')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.retention.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>{t('policy.privacy.retention.accounts.label')}</strong> {t('policy.privacy.retention.accounts.desc')}</li>
            <li><strong>{t('policy.privacy.retention.favorites.label')}</strong> {t('policy.privacy.retention.favorites.desc')}</li>
            <li><strong>{t('policy.privacy.retention.videos.label')}</strong> {t('policy.privacy.retention.videos.desc')}</li>
            <li><strong>{t('policy.privacy.retention.payments.label')}</strong> {t('policy.privacy.retention.payments.desc')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.privacy.changes.title')}</h2>
          <p>{t('policy.privacy.changes.desc')}</p>
        </section>

        <div className="pt-8 border-t border-zinc-800 text-sm text-zinc-500">
          <p>{t('policy.privacy.footer.date')}</p>
          <p>{t('policy.privacy.footer.location')}</p>
        </div>
      </div>
    </div>
  );
}
