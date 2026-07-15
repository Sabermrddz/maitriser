import { useTranslation } from '../context/LanguageContext';

export default function FeatureStrip() {
  const { t } = useTranslation();

  const features = [
    { title: 'landing.features.qcm.title', desc: 'landing.features.qcm.desc' },
    { title: 'landing.features.ecos.title', desc: 'landing.features.ecos.desc' },
    { title: 'landing.features.tracking.title', desc: 'landing.features.tracking.desc' },
  ];

  return (
    <section className="landing-strip" id="comment-ca-marche">
      <div className="landing-section-head reveal">
        <h2>{t('landing.features.title')}</h2>
      </div>
      <div className="landing-strip-grid">
        {features.map((f, i) => (
          <div className="landing-strip-item reveal" key={i}>
            <h3>{t(f.title)}</h3>
            <p>{t(f.desc)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
