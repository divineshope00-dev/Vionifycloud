import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TermsOfService() {
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

      <h1 className="text-3xl font-bold mb-8">{t('policy.terms.title')}</h1>
      
      <div className="space-y-8 text-zinc-300 leading-relaxed">
        <section>
          <p>{t('policy.terms.intro')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.1.title')}</h2>
          <p className="mb-2">{t('policy.terms.1.p1')}</p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>{t('policy.terms.1.l1')}</li>
            <li>{t('policy.terms.1.l2')}</li>
            <li>{t('policy.terms.1.l3')}</li>
          </ul>
          <p className="font-medium text-purple-400">{t('policy.terms.1.p2')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.2.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.terms.2.l1')}</li>
            <li>{t('policy.terms.2.l2')}</li>
            <li>{t('policy.terms.2.l3')}</li>
            <li className="text-red-400">{t('policy.terms.2.l4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.3.title')}</h2>
          <p className="mb-2">{t('policy.terms.3.p1')}</p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>{t('policy.terms.3.l1')}</li>
            <li>{t('policy.terms.3.l2')}</li>
          </ul>
          <p className="mb-2 font-medium text-white">{t('policy.terms.3.p2')}</p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>{t('policy.terms.3.t1')}</li>
            <li>{t('policy.terms.3.t2')}</li>
            <li>{t('policy.terms.3.t3')}</li>
          </ul>
          <p className="mb-2">{t('policy.terms.3.p3')}</p>
          <p className="font-medium text-zinc-400">{t('policy.terms.3.p4')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.4.title')}</h2>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>{t('policy.terms.4.l1')}</li>
            <li>{t('policy.terms.4.l2')}</li>
            <li>{t('policy.terms.4.l3')}</li>
          </ul>
          <p>{t('policy.terms.4.p1')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.5.title')}</h2>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>{t('policy.terms.5.l1')}</li>
            <li>{t('policy.terms.5.l2')}</li>
            <li>{t('policy.terms.5.l3')}</li>
          </ul>
          <p className="text-red-400 font-medium">{t('policy.terms.5.p1')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.6.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.terms.6.l1')}</li>
            <li>{t('policy.terms.6.l2')}</li>
            <li>{t('policy.terms.6.l3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.7.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.terms.7.l1')}</li>
            <li>{t('policy.terms.7.l2')}</li>
            <li>{t('policy.terms.7.l3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.8.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.terms.8.l1')}</li>
            <li>{t('policy.terms.8.l2')}</li>
            <li>{t('policy.terms.8.l3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.9.title')}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('policy.terms.9.l1')}</li>
            <li>{t('policy.terms.9.l2')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{t('policy.terms.10.title')}</h2>
          <p>{t('policy.terms.10.p1')}</p>
        </section>

        <div className="pt-8 border-t border-zinc-800 text-sm text-zinc-500 space-y-1">
          <p>{t('policy.terms.footer.date')}</p>
          <p>{t('policy.terms.footer.location')}</p>
          <p>{t('policy.terms.footer.contact')}</p>
        </div>
      </div>
    </div>
  );
}
