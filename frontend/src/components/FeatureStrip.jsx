import { useTranslation } from '../context/LanguageContext';
import { FaClipboardList, FaStethoscope, FaChartLine } from 'react-icons/fa';

export default function FeatureStrip() {
  const { t } = useTranslation();

  const features = [
    {
      title: 'landing.features.qcm.title',
      desc: 'landing.features.qcm.desc',
      icon: FaClipboardList,
    },
    {
      title: 'landing.features.ecos.title',
      desc: 'landing.features.ecos.desc',
      icon: FaStethoscope,
    },
    {
      title: 'landing.features.tracking.title',
      desc: 'landing.features.tracking.desc',
      icon: FaChartLine,
    },
  ];

  return (
    <section className="landing-strip" id="comment-ca-marche">
      <div className="landing-section-head reveal">
        <h2>{t('landing.features.title')}</h2>
      </div>
      <div className="landing-strip-grid">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div className="landing-strip-item reveal" key={i}>
              <div className="landing-strip-icon" aria-hidden="true">
                <Icon size={30} />
              </div>
              <h3>{t(f.title)}</h3>
              <p>{t(f.desc)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
