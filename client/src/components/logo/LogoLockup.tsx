import LogoMark from "./LogoMark";

interface LogoLockupProps {
  iconSize: number; // px height passed to LogoMark
  className?: string; // default applied by caller (e.g. "landing-hero")
}

// Hero lockup: decorative icon (the wordmark <span> carries the SR name) +
// the "toepify" wordmark. Gap/font-size are CSS-driven via className so 480px
// rules can override.
export default function LogoLockup({ iconSize, className }: LogoLockupProps) {
  return (
    <div className={className}>
      <LogoMark decorative className="landing-hero-icon" size={iconSize} />
      <span className="landing-hero-wordmark">toepify</span>
    </div>
  );
}
