export default function BrandLogo({ width, height, color }) {
  return (
    <span
      role="img"
      aria-label="MAITRISEZ"
      style={{
        display: 'inline-block',
        width: width || 38,
        height: height || 24,
        backgroundColor: color || 'currentColor',
        WebkitMaskImage: 'url(/logo.svg)',
        maskImage: 'url(/logo.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
