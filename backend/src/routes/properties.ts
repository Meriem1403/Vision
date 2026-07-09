import { FastifyInstance } from "fastify";
import { z } from "zod";
import { computeLoanSummary } from "../services/loanEngine.js";

const propertySchema = z.object({
  entityId: z.string(),
  address: z.string().min(1),
  ville: z.string().min(1),
  cp: z.string().min(1),
  type: z.string(),
  surface: z.number().optional(),
  lots: z.number().int().optional(),
  prixAchat: z.number().optional(),
  travaux: z.number().optional(),
  fraisNotaire: z.number().optional(),
  valeurActuelle: z.number().optional(),
  loyer: z.number().optional(),
  taxeFonciere: z.number().optional(),
  assurance: z.number().optional(),
  credit: z.object({
    banque: z.string(),
    montantInitial: z.number().positive(),
    taux: z.number().min(0),
    duree: z.number().int().positive(),
    debut: z.string(),
    assuranceMensuelle: z.number().min(0).optional(),
  }).optional(),
});

export async function propertyRoutes(app: FastifyInstance) {
  app.get("/api/properties", async () => {
    const properties = await app.prisma.property.findMany({
      include: { entity: true, loan: true },
      orderBy: { address: "asc" },
    });
    return properties.map(formatProperty);
  });

  app.post("/api/properties", async (req, reply) => {
    const body = propertySchema.parse(req.body);
    const entity = await app.prisma.legalEntity.findUnique({ where: { slug: body.entityId } });
    if (!entity) return reply.status(400).send({ error: "Entité introuvable" });

    const property = await app.prisma.property.create({
      data: {
        entityId: entity.id,
        address: body.address,
        ville: body.ville,
        cp: body.cp,
        type: body.type,
        surface: body.surface ?? 0,
        lots: body.lots ?? 1,
        prixAchat: body.prixAchat ?? 0,
        travaux: body.travaux ?? 0,
        fraisNotaire: body.fraisNotaire ?? 0,
        valeurActuelle: body.valeurActuelle ?? 0,
        loyer: body.loyer ?? 0,
        taxeFonciere: body.taxeFonciere ?? 0,
        assurance: body.assurance ?? 0,
      },
      include: { entity: true, loan: true },
    });

    if (body.credit) {
      const summary = computeLoanSummary({
        montantInitial: body.credit.montantInitial,
        tauxAnnuel: body.credit.taux,
        dureeMois: body.credit.duree,
        dateDebut: new Date(body.credit.debut),
        assuranceMensuelle: body.credit.assuranceMensuelle,
      });

      await app.prisma.loan.create({
        data: {
          propertyId: property.id,
          banque: body.credit.banque,
          montantInitial: body.credit.montantInitial,
          tauxAnnuel: body.credit.taux,
          dureeMois: body.credit.duree,
          dateDebut: new Date(body.credit.debut),
          assuranceMensuelle: body.credit.assuranceMensuelle ?? 0,
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
      });
    }

    const full = await app.prisma.property.findUnique({
      where: { id: property.id },
      include: { entity: true, loan: true },
    });
    return formatProperty(full!);
  });

  app.put("/api/properties/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = propertySchema.parse(req.body);
    const entity = await app.prisma.legalEntity.findUnique({ where: { slug: body.entityId } });
    if (!entity) return reply.status(400).send({ error: "Entité introuvable" });

    await app.prisma.property.update({
      where: { id },
      data: {
        entityId: entity.id,
        address: body.address,
        ville: body.ville,
        cp: body.cp,
        type: body.type,
        surface: body.surface ?? 0,
        lots: body.lots ?? 1,
        prixAchat: body.prixAchat ?? 0,
        travaux: body.travaux ?? 0,
        fraisNotaire: body.fraisNotaire ?? 0,
        valeurActuelle: body.valeurActuelle ?? 0,
        loyer: body.loyer ?? 0,
        taxeFonciere: body.taxeFonciere ?? 0,
        assurance: body.assurance ?? 0,
      },
    });

    if (body.credit) {
      const summary = computeLoanSummary({
        montantInitial: body.credit.montantInitial,
        tauxAnnuel: body.credit.taux,
        dureeMois: body.credit.duree,
        dateDebut: new Date(body.credit.debut),
        assuranceMensuelle: body.credit.assuranceMensuelle,
      });

      const existing = await app.prisma.loan.findUnique({ where: { propertyId: id } });
      if (existing) {
        await app.prisma.amortizationEntry.deleteMany({ where: { loanId: existing.id } });
        await app.prisma.loan.update({
          where: { id: existing.id },
          data: {
            banque: body.credit.banque,
            montantInitial: body.credit.montantInitial,
            tauxAnnuel: body.credit.taux,
            dureeMois: body.credit.duree,
            dateDebut: new Date(body.credit.debut),
            assuranceMensuelle: body.credit.assuranceMensuelle ?? 0,
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
        });
      } else {
        await app.prisma.loan.create({
          data: {
            propertyId: id,
            banque: body.credit.banque,
            montantInitial: body.credit.montantInitial,
            tauxAnnuel: body.credit.taux,
            dureeMois: body.credit.duree,
            dateDebut: new Date(body.credit.debut),
            assuranceMensuelle: body.credit.assuranceMensuelle ?? 0,
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
        });
      }
    } else {
      const existing = await app.prisma.loan.findUnique({ where: { propertyId: id } });
      if (existing) await app.prisma.loan.delete({ where: { id: existing.id } });
    }

    const full = await app.prisma.property.findUnique({
      where: { id },
      include: { entity: true, loan: true },
    });
    return formatProperty(full!);
  });

  app.delete("/api/properties/:id", async (req) => {
    const { id } = req.params as { id: string };
    await app.prisma.property.delete({ where: { id } });
    return { ok: true };
  });
}

function formatProperty(p: {
  id: string;
  entityId: string;
  address: string;
  ville: string;
  cp: string;
  type: string;
  surface: number;
  lots: number;
  prixAchat: number;
  travaux: number;
  fraisNotaire: number;
  valeurActuelle: number;
  loyer: number;
  taxeFonciere: number;
  assurance: number;
  entity?: { slug: string };
  loan?: {
    banque: string;
    montantInitial: number;
    tauxAnnuel: number;
    dureeMois: number;
    dateDebut: Date;
    assuranceMensuelle: number;
    mensualite: number;
    capitalRestant: number;
  } | null;
}) {
  return {
    id: p.id,
    sciId: p.entity?.slug ?? p.entityId,
    address: p.address,
    ville: p.ville,
    cp: p.cp,
    type: p.type,
    surface: p.surface,
    lots: p.lots,
    prixAchat: p.prixAchat,
    travaux: p.travaux,
    fraisNotaire: p.fraisNotaire,
    valeurActuelle: p.valeurActuelle,
    loyer: p.loyer,
    taxeFonciere: p.taxeFonciere,
    assurance: p.assurance,
    credit: p.loan
      ? {
          banque: p.loan.banque,
          montantInitial: p.loan.montantInitial,
          taux: p.loan.tauxAnnuel,
          duree: p.loan.dureeMois,
          debut: p.loan.dateDebut.toISOString().slice(0, 10),
          assuranceMensuelle: p.loan.assuranceMensuelle,
          mensualite: p.loan.mensualite,
          capitalRestant: p.loan.capitalRestant,
        }
      : undefined,
  };
}
