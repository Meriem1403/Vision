import { FastifyInstance } from "fastify";
import { z } from "zod";
import { computeLoanSummary } from "../services/loanEngine.js";
import { requireAuth } from "../lib/auth.js";
import { loanAccessible } from "../lib/permissions.js";

const loanInputSchema = z.object({
  montantInitial: z.number().positive(),
  tauxAnnuel: z.number().min(0),
  dureeMois: z.number().int().positive(),
  dateDebut: z.string(),
  assuranceMensuelle: z.number().min(0).optional(),
  projectionDate: z.string().optional(),
});

const loanCreateSchema = loanInputSchema.extend({
  propertyId: z.string(),
  banque: z.string().min(1),
});

export async function loanRoutes(app: FastifyInstance) {
  app.post("/api/loans/preview", { preHandler: requireAuth() }, async (req) => {
    const body = loanInputSchema.parse(req.body);
    const projectionDate = body.projectionDate ? new Date(body.projectionDate) : new Date();
    const summary = computeLoanSummary(
      {
        montantInitial: body.montantInitial,
        tauxAnnuel: body.tauxAnnuel,
        dureeMois: body.dureeMois,
        dateDebut: new Date(body.dateDebut),
        assuranceMensuelle: body.assuranceMensuelle,
      },
      projectionDate,
    );

    return {
      mensualite: summary.mensualite,
      mensualiteTotale: summary.mensualiteTotale,
      capitalRestant: summary.capitalRestant,
      totalInterets: summary.totalInterets,
      finCredit: summary.finCredit.toISOString(),
      pctRembourse: summary.pctRembourse,
      schedule: summary.schedule.map((r) => ({
        ...r,
        periode: r.periode.toISOString(),
      })),
    };
  });

  app.get("/api/loans", { preHandler: requireAuth() }, async (req) => {
    const loans = await app.prisma.loan.findMany({
      include: { property: { include: { entity: true } } },
      orderBy: { createdAt: "desc" },
    });
    const filtered = loans.filter((l) => loanAccessible(req.user!, l.banque));
    return filtered.map(formatLoan);
  });

  app.get("/api/loans/:id", { preHandler: requireAuth() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const loan = await app.prisma.loan.findUnique({
      where: { id },
      include: {
        property: { include: { entity: true } },
        schedule: { orderBy: { moisIndex: "asc" } },
      },
    });
    if (!loan) return reply.status(404).send({ error: "Prêt introuvable" });
    if (!loanAccessible(req.user!, loan.banque)) {
      return reply.status(403).send({ error: "Accès refusé à ce crédit" });
    }
    return {
      ...formatLoan(loan),
      schedule: loan.schedule.map((e) => ({
        moisIndex: e.moisIndex,
        periode: e.periode.toISOString(),
        crd: e.crd,
        capitalAmorti: e.capitalAmorti,
        interets: e.interets,
        assurance: e.assurance,
        mensualite: e.mensualite,
        mensualiteTotale: e.mensualite + e.assurance,
      })),
    };
  });

  app.post("/api/loans", { preHandler: requireAuth(["GERANT"]) }, async (req) => {
    const body = loanCreateSchema.parse(req.body);
    const summary = computeLoanSummary({
      montantInitial: body.montantInitial,
      tauxAnnuel: body.tauxAnnuel,
      dureeMois: body.dureeMois,
      dateDebut: new Date(body.dateDebut),
      assuranceMensuelle: body.assuranceMensuelle,
    });

    const loan = await app.prisma.loan.create({
      data: {
        propertyId: body.propertyId,
        banque: body.banque,
        montantInitial: body.montantInitial,
        tauxAnnuel: body.tauxAnnuel,
        dureeMois: body.dureeMois,
        dateDebut: new Date(body.dateDebut),
        assuranceMensuelle: body.assuranceMensuelle ?? 0,
        mensualite: summary.mensualite,
        capitalRestant: summary.capitalRestant,
        schedule: {
          create: summary.schedule.map((r) => ({
            moisIndex: r.moisIndex,
            periode: r.periode,
            crd: r.crd,
            capitalAmorti: r.capitalAmorti,
            interets: r.interets,
            assurance: r.assurance,
            mensualite: r.mensualite,
          })),
        },
      },
      include: { property: { include: { entity: true } } },
    });

    return formatLoan(loan);
  });

  app.put("/api/loans/:id", { preHandler: requireAuth(["GERANT"]) }, async (req) => {
    const { id } = req.params as { id: string };
    const body = loanCreateSchema.omit({ propertyId: true }).extend({
      propertyId: z.string().optional(),
    }).parse(req.body);

    const summary = computeLoanSummary({
      montantInitial: body.montantInitial,
      tauxAnnuel: body.tauxAnnuel,
      dureeMois: body.dureeMois,
      dateDebut: new Date(body.dateDebut),
      assuranceMensuelle: body.assuranceMensuelle,
    });

    await app.prisma.amortizationEntry.deleteMany({ where: { loanId: id } });

    const loan = await app.prisma.loan.update({
      where: { id },
      data: {
        banque: body.banque,
        montantInitial: body.montantInitial,
        tauxAnnuel: body.tauxAnnuel,
        dureeMois: body.dureeMois,
        dateDebut: new Date(body.dateDebut),
        assuranceMensuelle: body.assuranceMensuelle ?? 0,
        mensualite: summary.mensualite,
        capitalRestant: summary.capitalRestant,
        schedule: {
          create: summary.schedule.map((r) => ({
            moisIndex: r.moisIndex,
            periode: r.periode,
            crd: r.crd,
            capitalAmorti: r.capitalAmorti,
            interets: r.interets,
            assurance: r.assurance,
            mensualite: r.mensualite,
          })),
        },
      },
      include: { property: { include: { entity: true } } },
    });

    return formatLoan(loan);
  });

  app.delete("/api/loans/:id", { preHandler: requireAuth(["GERANT"]) }, async (req) => {
    const { id } = req.params as { id: string };
    await app.prisma.loan.delete({ where: { id } });
    return { ok: true };
  });
}

function formatLoan(loan: {
  id: string;
  propertyId: string;
  banque: string;
  montantInitial: number;
  tauxAnnuel: number;
  dureeMois: number;
  dateDebut: Date;
  assuranceMensuelle: number;
  mensualite: number;
  capitalRestant: number;
  property?: { address: string; ville: string; entity?: { shortName: string } };
}) {
  return {
    id: loan.id,
    propertyId: loan.propertyId,
    banque: loan.banque,
    montantInitial: loan.montantInitial,
    taux: loan.tauxAnnuel,
    duree: loan.dureeMois,
    debut: loan.dateDebut.toISOString().slice(0, 10),
    assuranceMensuelle: loan.assuranceMensuelle,
    mensualite: loan.mensualite,
    capitalRestant: loan.capitalRestant,
    propertyAddress: loan.property ? `${loan.property.address}, ${loan.property.ville}` : undefined,
    entityName: loan.property?.entity?.shortName,
  };
}
