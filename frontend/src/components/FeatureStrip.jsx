import { useTranslation } from '../context/LanguageContext';

export default function FeatureStrip() {
  const { t } = useTranslation();

  const features = [
    {
      title: 'landing.features.qcm.title',
      desc: 'landing.features.qcm.desc',
      img: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=280&fit=crop&auto=format',
      alt: 'Classical anatomy drawing',
    },
    {
      title: 'landing.features.ecos.title',
      desc: 'landing.features.ecos.desc',
      img: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=280&fit=crop&auto=format',
      alt: 'Medical study illustration',
    },
    {
      title: 'landing.features.tracking.title',
      desc: 'landing.features.tracking.desc',
      img: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=400&h=280&fit=crop&auto=format',
      alt: 'Anatomy chart painting',
    },
  ];

  return (
    <section className="landing-strip" id="comment-ca-marche">
      <div className="landing-section-head reveal">
        <h2>{t('landing.features.title')}</h2>
      </div>
      <div className="landing-strip-grid">
        {features.map((f, i) => (
          <div className="landing-strip-item reveal" key={i}>
            <div className="landing-strip-img">
              <img src={f.img} alt={f.alt} loading="lazy" />
            </div>
            <h3>{t(f.title)}</h3>
            <p>{t(f.desc)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
