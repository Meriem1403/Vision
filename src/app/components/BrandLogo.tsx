type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  compact?: boolean;
};

export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="brand-bg" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--v-accent, #60A5FA)" />
          <stop offset="1" stopColor="var(--v-accent-2, #1D4ED8)" />
        </linearGradient>
        <linearGradient id="brand-shine" x1="8" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#brand-bg)" />
      <path
        d="M6 21.5C10.5 14.5 14 11.5 16 10.5C18.5 9 21.5 11 26 15.5"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="7" y="18" width="4.5" height="7" rx="1" fill="url(#brand-shine)" fillOpacity="0.82" />
      <rect x="13.25" y="15" width="4.5" height="10" rx="1" fill="url(#brand-shine)" fillOpacity="0.9" />
      <rect x="19.5" y="11.5" width="4.5" height="13.5" rx="1" fill="url(#brand-shine)" />
      <circle cx="24.5" cy="9.5" r="1.6" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
}

export function BrandLogo({ size = 36, showWordmark = true, className = "", compact = false }: BrandLogoProps) {
  if (!showWordmark) {
    return <BrandMark size={size} className={className} />;
  }

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, boxShadow: "0 4px 14px var(--v-accent-glow)" }}
      >
        <BrandMark size={size} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p
            className="vision-text text-sm font-bold leading-none truncate"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Patrimis
          </p>
          <p className="text-[10px] tracking-[0.22em] mt-0.5 vision-text-faint uppercase">Patrimoine</p>
        </div>
      )}
    </div>
  );
}
