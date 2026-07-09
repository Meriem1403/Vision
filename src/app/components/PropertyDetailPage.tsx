import { useRef } from "react";
import { motion } from "motion/react";
import { ArrowLeft, CreditCard, Home, Pencil } from "lucide-react";
import { pageWrap, fullPageToolbar, fullPageBtn, fullPageCard, G } from "./layout";
import { PropertyDetailContent, CreditDetailContent, type PropertyShape, type CreditShape } from "./PropertyDetail";

type Section = "property" | "credit";

export function PropertyDetailPage({
  property,
  sciName,
  sciColor,
  section,
  onSectionChange,
  onBack,
  backLabel = "Retour aux biens",
  onEdit,
}: {
  property: PropertyShape;
  sciName: string;
  sciColor: string;
  section: Section;
  onSectionChange: (s: Section) => void;
  onBack: () => void;
  backLabel?: string;
  onEdit?: () => void;
}) {
  const creditRef = useRef<HTMLDivElement>(null);

  const hasCredit = !!property.credit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`${pageWrap} space-y-3 sm:space-y-4 md:space-y-5`}
    >
      <div className={fullPageToolbar}>
        <button type="button" onClick={onBack} className={fullPageBtn} title={backLabel}>
          <ArrowLeft size={16} className="flex-shrink-0" />
          <span className="truncate">{backLabel}</span>
        </button>
        {onEdit && (
          <button type="button" onClick={onEdit} className={`${fullPageBtn} sm:w-auto`}>
            <Pencil size={14} />
            <span>Modifier</span>
          </button>
        )}
        {hasCredit && (
          <div className={`${G} flex w-full sm:w-auto sm:min-w-[220px] p-1 gap-1 sm:ml-auto`}>
            <button
              type="button"
              onClick={() => onSectionChange("property")}
              className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${section === "property" ? "vision-chip-active" : "vision-text-muted hover:vision-text"}`}
            >
              <Home size={14} />
              Bien
            </button>
            <button
              type="button"
              onClick={() => onSectionChange("credit")}
              className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${section === "credit" ? "vision-chip-active" : "vision-text-muted hover:vision-text"}`}
            >
              <CreditCard size={14} />
              Crédit
            </button>
          </div>
        )}
      </div>

      <div className={fullPageCard} style={{ borderColor: `${sciColor}22` }}>
        <div className="h-1 w-full rounded-full mb-4 sm:mb-5" style={{ backgroundColor: sciColor, opacity: 0.5 }} />
        <div className="flex flex-col gap-3 mb-5 sm:mb-6 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-xl md:text-2xl font-bold vision-text break-words leading-tight">{property.address}</p>
            <p className="text-xs sm:text-sm vision-text-muted mt-1 break-words">
              {property.cp} {property.ville} · {property.type} · {property.surface} m²
            </p>
          </div>
          <span
            className="self-start px-3 py-1.5 rounded-xl text-xs font-bold border flex-shrink-0"
            style={{ color: sciColor, borderColor: `${sciColor}38`, backgroundColor: `${sciColor}14` }}
          >
            {sciName}
          </span>
        </div>

        <div className="w-full min-w-0">
          {section === "credit" && property.credit ? (
            <CreditDetailContent
              credit={property.credit}
              property={property}
              sciName={sciName}
              sciColor={sciColor}
              fullSchedule
            />
          ) : (
            <PropertyDetailContent
              property={property}
              sciName={sciName}
              sciColor={sciColor}
              variant="page"
              onViewCredit={hasCredit ? () => onSectionChange("credit") : undefined}
            />
          )}
        </div>
      </div>

      {section === "property" && property.credit && (
        <div ref={creditRef} className={fullPageCard}>
          <p className="text-xs font-bold vision-text-muted uppercase tracking-widest mb-4">Aperçu du crédit</p>
          <CreditDetailContent
            credit={property.credit}
            property={property}
            sciName={sciName}
            sciColor={sciColor}
            previewSchedule
          />
          <button
            type="button"
            onClick={() => onSectionChange("credit")}
            className="mt-4 w-full min-h-[44px] py-3 rounded-xl text-sm font-semibold border border-blue-400/25 bg-blue-500/15 vision-info-text hover:bg-blue-500/25 transition-colors"
          >
            Voir le tableau d&apos;amortissement complet
          </button>
        </div>
      )}
    </motion.div>
  );
}

export type { CreditShape };
