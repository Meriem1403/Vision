import { PrismaClient } from "@prisma/client";

export interface DossierBuildOptions {
  entitySlugs?: string[];
  includePatrimoine?: boolean;
  includeEndettement?: boolean;
  includeCashFlow?: boolean;
  anonymizeTenants?: boolean;
  montantDemande?: number;
  objet?: string;
}

export async function buildPatrimoineSnapshot(prisma: PrismaClient, opts: DossierBuildOptions = {}) {
  const {
    entitySlugs,
    includePatrimoine = true,
    includeEndettement = true,
    includeCashFlow = true,
    anonymizeTenants = true,
    montantDemande,
    objet,
  } = opts;

  const entities = await prisma.legalEntity.findMany({
    where: entitySlugs?.length ? { slug: { in: entitySlugs } } : undefined,
    include: {
      shareholders: true,
      properties: {
        include: {
          loan: true,
          tenants: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const properties = entities.flatMap((e) =>
    e.properties.map((p) => ({
      id: p.id,
      entitySlug: e.slug,
      entityName: e.shortName,
      entityType: e.type,
      address: p.address,
      ville: p.ville,
      type: p.type,
      surface: p.surface,
      lots: p.lots,
      valeurActuelle: p.valeurActuelle,
      loyer: p.loyer,
      taxeFonciere: p.taxeFonciere,
      assurance: p.assurance,
      prixAchat: p.prixAchat,
      credit: p.loan
        ? {
            banque: p.loan.banque,
            montantInitial: p.loan.montantInitial,
            capitalRestant: p.loan.capitalRestant,
            taux: p.loan.tauxAnnuel,
            mensualite: p.loan.mensualite,
            assuranceMensuelle: p.loan.assuranceMensuelle,
            dureeMois: p.loan.dureeMois,
            dateDebut: p.loan.dateDebut.toISOString().slice(0, 10),
          }
        : null,
      tenants: anonymizeTenants
        ? p.tenants.map((t) => ({ statut: t.statut, loyer: t.loyer, charges: t.charges }))
        : p.tenants.map((t) => ({
            nom: t.nom,
            statut: t.statut,
            loyer: t.loyer,
            charges: t.charges,
            debutBail: t.debutBail,
            finBail: t.finBail,
          })),
      cashMensuel: Math.round(
        p.loyer - (p.loan?.mensualite ?? 0) - p.taxeFonciere / 12 - p.assurance / 12,
      ),
    })),
  );

  const totalValeur = entities.reduce((s, e) => s + e.valeurEstimee, 0);
  const totalDette = properties.reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0);
  const totalLoyersAnnuels = properties.reduce((s, p) => s + p.loyer * 12, 0);
  const totalMensualites = properties.reduce(
    (s, p) => s + (p.credit?.mensualite ?? 0) + (p.credit?.assuranceMensuelle ?? 0),
    0,
  );
  const cashMensuelTotal = properties.reduce((s, p) => s + p.cashMensuel, 0);

  const patrimoineNet = totalValeur - totalDette;
  const tauxEndettement = totalValeur > 0 ? (totalDette / totalValeur) * 100 : 0;
  const rendementBrut = totalValeur > 0 ? (totalLoyersAnnuels / totalValeur) * 100 : 0;
  const ratioDetteRevenus = totalLoyersAnnuels > 0 ? (totalMensualites * 12) / totalLoyersAnnuels : 0;

  const loansByBank = properties
    .filter((p) => p.credit)
    .reduce<Record<string, { count: number; crd: number; mensualites: number }>>((acc, p) => {
      const b = p.credit!.banque;
      if (!acc[b]) acc[b] = { count: 0, crd: 0, mensualites: 0 };
      acc[b].count += 1;
      acc[b].crd += p.credit!.capitalRestant;
      acc[b].mensualites += p.credit!.mensualite + (p.credit!.assuranceMensuelle ?? 0);
      return acc;
    }, {});

  const synthese = {
    dateGeneration: new Date().toISOString(),
    nombreEntites: entities.length,
    nombreBiens: properties.length,
    ...(includePatrimoine && {
      patrimoineBrut: totalValeur,
      patrimoineNet,
      tauxEndettement: Math.round(tauxEndettement * 10) / 10,
      rendementBrut: Math.round(rendementBrut * 100) / 100,
    }),
    ...(includeEndettement && {
      detteTotale: totalDette,
      mensualitesTotales: Math.round(totalMensualites * 100) / 100,
      repartitionBanques: Object.entries(loansByBank).map(([banque, v]) => ({
        banque,
        nombreCredits: v.count,
        capitalRestant: v.crd,
        mensualites: Math.round(v.mensualites * 100) / 100,
      })),
    }),
    ...(includeCashFlow && {
      loyersAnnuels: totalLoyersAnnuels,
      cashMensuelNet: cashMensuelTotal,
      ratioDetteRevenus: Math.round(ratioDetteRevenus * 100) / 100,
    }),
    ...(montantDemande != null && {
      demande: {
        montant: montantDemande,
        objet: objet ?? null,
        ltvProjete:
          totalValeur > 0
            ? Math.round(((totalDette + montantDemande) / totalValeur) * 1000) / 10
            : null,
        capaciteMensuelleEstimee: Math.round((cashMensuelTotal - (montantDemande * 0.004)) * 100) / 100,
      },
    }),
  };

  return {
    synthese,
    entites: entities.map((e) => ({
      slug: e.slug,
      name: e.name,
      shortName: e.shortName,
      type: e.type,
      valeurEstimee: e.valeurEstimee,
      associes: e.shareholders.map((s) => ({ name: s.name, parts: s.parts })),
      dette: e.properties.reduce((s, p) => s + (p.loan?.capitalRestant ?? 0), 0),
      loyersAnnuels: e.properties.reduce((s, p) => s + p.loyer * 12, 0),
    })),
    biens: properties,
  };
}

export function generateDossierReference(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VIS-${y}${m}-${r}`;
}
