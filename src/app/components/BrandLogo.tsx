import patrimisIcon from "@/assets/patrimis-icon.png";
import patrimisBanner from "@/assets/patrimis-banner.png";

type BrandLogoProps = {
  className?: string;
  variant?: "sidebar" | "icon" | "banner";
};

export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={patrimisIcon}
      alt=""
      width={size}
      height={size}
      className={`object-contain rounded-lg ${className}`}
      aria-hidden
      draggable={false}
    />
  );
}

export function BrandLogo({ className = "", variant = "sidebar" }: BrandLogoProps) {
  if (variant === "icon") {
    return <BrandMark size={40} className={className} />;
  }

  if (variant === "banner") {
    return (
      <div className={`min-w-0 flex justify-center ${className}`}>
        <img
          src={patrimisBanner}
          alt="Patrimis — Votre patrimoine, notre vision"
          className="w-full max-w-[200px] h-auto object-contain rounded-xl"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <BrandMark size={40} />
      <div className="min-w-0 leading-tight">
        <p
          className="vision-text text-sm font-bold tracking-wide truncate"
          style={{ fontFamily: "'Plus Jakarta Sans', Georgia, serif" }}
        >
          Patrimis
        </p>
        <p className="text-[9px] vision-text-faint uppercase tracking-[0.18em] truncate">
          Notre vision
        </p>
      </div>
    </div>
  );
}
