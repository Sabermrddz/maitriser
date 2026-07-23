import BrandLogo from './BrandLogo';

const LETTERS = 'MAITRISEZ'.split('');

export default function AnimatedLoading() {
  return (
    <div className="loading-wrapper">
      <div className="loading-inner">
        <div className="loading-logo">
          <BrandLogo width={100} height={63} />
        </div>
        <div className="loading-text brand-name">
          {LETTERS.map((ch, i) => (
            <span key={i} className="loading-letter" style={{ animationDelay: `${i * 0.12}s` }}>
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
