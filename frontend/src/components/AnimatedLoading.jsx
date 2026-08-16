import BrandLogo from './BrandLogo';

export default function AnimatedLoading() {
  return (
    <div className="loading-wrapper">
      <div className="loading-inner">
        <div className="loading-logo">
          <BrandLogo width={80} height={50} />
        </div>
        <span className="loading-brand brand-name">MAITRISEZ</span>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" />
        </div>
      </div>
    </div>
  );
}
