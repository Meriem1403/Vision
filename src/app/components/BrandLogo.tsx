type BrandLogoProps = {
  className?: string;
  variant?: "sidebar" | "icon";
};

export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/patrimis.png"
      alt=""
      width={size}
      height={size}
      className={`object-contain ${className}`}
      aria-hidden
    />
  );
}

export function BrandLogo({ className = "", variant = "sidebar" }: BrandLogoProps) {
  if (variant === "icon") {
    return <BrandMark size={36} className={className} />;
  }

  return (
    <div className={`min-w-0 flex justify-center ${className}`}>
      <img
        src="/patrimis.png"
        alt="Patrimis — Votre patrimoine, notre vision"
        className="w-full max-w-[168px] h-auto object-contain"
        draggable={false}
      />
    </div>
  );
}
