import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

export default function FaqSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: 'landing.faq.q1.q', a: 'landing.faq.q1.a' },
    { q: 'landing.faq.q2.q', a: 'landing.faq.q2.a' },
    { q: 'landing.faq.q3.q', a: 'landing.faq.q3.a' },
    { q: 'landing.faq.q4.q', a: 'landing.faq.q4.a' },
  ];

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section className="landing-faq" id="faq">
      <div className="landing-section-head reveal">
        <h2>{t('landing.faq.title')}</h2>
      </div>

      <div className="landing-faq-list">
        {faqs.map((item, i) => (
          <div className={`landing-faq-item${openIndex === i ? ' open' : ''}`} key={i}>
            <button className="landing-faq-q" onClick={() => toggle(i)} aria-expanded={openIndex === i} aria-controls={`faq-a-${i}`}>
              <span>{t(item.q)}</span>
              <span className="landing-plus"></span>
            </button>
            <div className="landing-faq-a" id={`faq-a-${i}`} style={{ maxHeight: openIndex === i ? '1000px' : '0' }}>
              <p>{t(item.a)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
