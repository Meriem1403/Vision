import { FastifyInstance } from "fastify";
import { z } from "zod";
import { DossierStatus } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { canCreateDossier, isBanque, isGerant, normalizeBank } from "../lib/permissions.js";
import { buildPatrimoineSnapshot, generateDossierReference } from "../services/dossierBuilder.js";
import { sendLoanAlertEmail } from "../services/mailService.js";

const createSchema = z.object({
  title: z.string().min(1),
  targetBank: z.string().min(1),
  message: z.string().optional(),
  montantDemande: z.number().positive().optional(),
  objet: z.string().optional(),
  entitySlugs: z.array(z.string()).optional(),
  includePatrimoine: z.boolean().optional(),
  includeEndettement: z.boolean().optional(),
  includeCashFlow: z.boolean().optional(),
  anonymizeTenants: z.boolean().optional(),
  sendNow: z.boolean().optional(),
});

const previewSchema = createSchema.omit({ title: true, targetBank: true, sendNow: true });

function formatDossier(d: {
  id: string;
  reference: string;
  title: string;
  targetBank: string;
  status: string;
  message: string | null;
  montantDemande: number | null;
  objet: string | null;
  entitySlugs: string[];
  includePatrimoine: boolean;
  includeEndettement: boolean;
  includeCashFlow: boolean;
  anonymizeTenants: boolean;
  payload: unknown;
  expiresAt: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  createdAt: Date;
  createdBy?: { name: string };
}) {
  return {
    id: d.id,
    reference: d.reference,
    title: d.title,
    targetBank: d.targetBank,
    status: d.status,
    message: d.message,
    montantDemande: d.montantDemande,
    objet: d.objet,
    entitySlugs: d.entitySlugs,
    includePatrimoine: d.includePatrimoine,
    includeEndettement: d.includeEndettement,
    includeCashFlow: d.includeCashFlow,
    anonymizeTenants: d.anonymizeTenants,
    payload: d.payload,
    expiresAt: d.expiresAt?.toISOString() ?? null,
    sentAt: d.sentAt?.toISOString() ?? null,
    viewedAt: d.viewedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    createdByName: d.createdBy?.name,
  };
}

export async function dossierRoutes(app: FastifyInstance) {
  app.post("/api/dossiers/preview", { preHandler: requireAuth(["GERANT"]) }, async (req) => {
    const body = previewSchema.parse(req.body);
    const payload = await buildPatrimoineSnapshot(app.prisma, body);
    return payload;
  });

  app.get("/api/dossiers", { preHandler: requireAuth() }, async (req) => {
    const user = req.user!;

    const where = isGerant(user)
      ? {}
      : isBanque(user)
        ? { targetBank: user.bankName!, status: { in: ["SENT", "VIEWED"] as DossierStatus[] } }
        : { id: "___none___" };

    const dossiers = await app.prisma.bankDossier.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return dossiers.map((d) => ({
      ...formatDossier(d),
      payload: undefined,
    }));
  });

  app.get("/api/dossiers/:id", { preHandler: requireAuth() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = req.user!;

    const dossier = await app.prisma.bankDossier.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true } } },
    });
    if (!dossier) return reply.status(404).send({ error: "Dossier introuvable" });

    if (isBanque(user)) {
      if (normalizeBank(dossier.targetBank) !== normalizeBank(user.bankName!)) {
        return reply.status(403).send({ error: "Ce dossier ne vous est pas destiné" });
      }
      if (dossier.status === "DRAFT") {
        return reply.status(403).send({ error: "Dossier non encore envoyé" });
      }
      if (dossier.expiresAt && dossier.expiresAt < new Date()) {
        return reply.status(410).send({ error: "Dossier expiré" });
      }
      if (!dossier.viewedAt) {
        await app.prisma.bankDossier.update({
          where: { id },
          data: { viewedAt: new Date(), status: "VIEWED" },
        });
        dossier.viewedAt = new Date();
        dossier.status = "VIEWED";
      }
    } else if (!isGerant(user)) {
      return reply.status(403).send({ error: "Accès refusé" });
    }

    return formatDossier(dossier);
  });

  app.post("/api/dossiers", { preHandler: requireAuth(["GERANT"]) }, async (req) => {
    const body = createSchema.parse(req.body);
    const user = req.user!;
    if (!canCreateDossier(user)) throw new Error("Non autorisé");

    const payload = await buildPatrimoineSnapshot(app.prisma, body);
    const reference = generateDossierReference();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const dossier = await app.prisma.bankDossier.create({
      data: {
        reference,
        title: body.title,
        targetBank: body.targetBank,
        message: body.message,
        montantDemande: body.montantDemande,
        objet: body.objet,
        entitySlugs: body.entitySlugs ?? [],
        includePatrimoine: body.includePatrimoine ?? true,
        includeEndettement: body.includeEndettement ?? true,
        includeCashFlow: body.includeCashFlow ?? true,
        anonymizeTenants: body.anonymizeTenants ?? true,
        payload: payload as object,
        createdById: user.id,
        expiresAt,
        status: body.sendNow ? "SENT" : "DRAFT",
        sentAt: body.sendNow ? new Date() : null,
      },
      include: { createdBy: { select: { name: true } } },
    });

    if (body.sendNow) {
      const bankUser = await app.prisma.user.findFirst({
        where: { role: "BANQUE", bankName: body.targetBank },
      });
      if (bankUser) {
        await sendLoanAlertEmail({
          to: bankUser.email,
          subject: `[Vision] Nouveau dossier de financement — ${reference}`,
          title: body.title,
          detail: `${user.name} vous a transmis un dossier patrimonial (${reference}). Connectez-vous à Vision pour le consulter.`,
        }).catch(() => {});
      }
    }

    return formatDossier(dossier);
  });

  app.post("/api/dossiers/:id/send", { preHandler: requireAuth(["GERANT"]) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = req.user!;

    const existing = await app.prisma.bankDossier.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: "Dossier introuvable" });
    if (existing.status !== "DRAFT") return reply.status(400).send({ error: "Dossier déjà envoyé" });

    const dossier = await app.prisma.bankDossier.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
      include: { createdBy: { select: { name: true } } },
    });

    const bankUser = await app.prisma.user.findFirst({
      where: { role: "BANQUE", bankName: dossier.targetBank },
    });
    if (bankUser) {
      await sendLoanAlertEmail({
        to: bankUser.email,
        subject: `[Vision] Dossier de financement — ${dossier.reference}`,
        title: dossier.title,
        detail: `${user.name} vous a transmis un dossier patrimonial (${dossier.reference}). Connectez-vous à Vision pour le consulter.`,
      }).catch(() => {});
    }

    return formatDossier(dossier);
  });

  app.delete("/api/dossiers/:id", { preHandler: requireAuth(["GERANT"]) }, async (req) => {
    const { id } = req.params as { id: string };
    await app.prisma.bankDossier.delete({ where: { id } });
    return { ok: true };
  });
}
