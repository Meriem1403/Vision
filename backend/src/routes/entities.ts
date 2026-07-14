import { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import { entityAccessible } from "../lib/permissions.js";

export async function entityRoutes(app: FastifyInstance) {
  app.get("/api/entities", { preHandler: requireAuth() }, async (req) => {
    const entities = await app.prisma.legalEntity.findMany({
      include: { shareholders: true, properties: { include: { loan: true } } },
      orderBy: { name: "asc" },
    });

    const filtered = entities.filter((e) => entityAccessible(req.user!, e.shareholders));

    return filtered.map((e) => ({
      id: e.slug,
      name: e.name,
      shortName: e.shortName,
      type: e.type,
      creation: e.creation,
      valeurEstimee: e.valeurEstimee,
      color: e.color,
      gradient: e.gradient,
      associes: e.shareholders.map((s) => ({ name: s.name, parts: s.parts })),
      propertyCount: e.properties.length,
      totalDebt: e.properties.reduce((sum, p) => sum + (p.loan?.capitalRestant ?? 0), 0),
    }));
  });

  app.get("/api/entities/:slug/snapshot", { preHandler: requireAuth() }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const month = Number((req.query as { month?: string }).month ?? new Date().getMonth() + 1);
    const year = Number((req.query as { year?: string }).year ?? new Date().getFullYear());

    const entity = await app.prisma.legalEntity.findUnique({
      where: { slug },
      include: {
        properties: { include: { loan: { include: { schedule: true } } } },
        shareholders: true,
      },
    });
    if (!entity) return reply.status(404).send({ error: "Entité introuvable" });
    if (!entityAccessible(req.user!, entity.shareholders)) {
      return reply.status(403).send({ error: "Accès refusé à cette entité" });
    }

    const projection = new Date(year, month - 1, 1);
    const lines = entity.properties.map((p) => {
      const loan = p.loan;
      let crdProjete = loan?.capitalRestant ?? 0;
      if (loan?.schedule?.length) {
        const entry = loan.schedule.find((s) => {
          const d = new Date(s.periode);
          return d.getFullYear() === projection.getFullYear() && d.getMonth() === projection.getMonth();
        });
        if (entry) crdProjete = entry.crd;
        else {
          const before = [...loan.schedule]
            .filter((s) => new Date(s.periode) <= projection)
            .sort((a, b) => b.moisIndex - a.moisIndex)[0];
          if (before) crdProjete = before.crd;
        }
      }

      const mensualite = loan?.mensualite ?? 0;
      const cashMensuel = Math.round(p.loyer - mensualite - p.taxeFonciere / 12);

      return {
        propertyId: p.id,
        adresse: p.address,
        typeBien: p.type,
        nbLots: p.lots,
        creditResiduelReference: loan?.montantInitial ?? 0,
        creditResiduelProjete: crdProjete,
        loyerMensuel: p.loyer,
        mensualite,
        cashMensuel,
        loyerAnnuel: p.loyer * 12,
        taxeFonciere: p.taxeFonciere,
        valeurRevente: p.valeurActuelle,
        finCredit: loan?.schedule?.length
          ? loan.schedule[loan.schedule.length - 1].periode.toISOString()
          : null,
      };
    });

    const totals = {
      crdReference: lines.reduce((s, l) => s + l.creditResiduelReference, 0),
      crdProjete: lines.reduce((s, l) => s + l.creditResiduelProjete, 0),
      mensualites: lines.reduce((s, l) => s + l.mensualite, 0),
      cashMensuel: lines.reduce((s, l) => s + l.cashMensuel, 0),
      loyersAnnuels: lines.reduce((s, l) => s + l.loyerAnnuel, 0),
    };

    return {
      entity: { id: entity.slug, name: entity.shortName, type: entity.type },
      projection: { month, year },
      lines,
      totals,
      associes: entity.shareholders,
    };
  });
}
