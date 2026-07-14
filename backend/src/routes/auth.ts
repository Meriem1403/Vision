import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  authenticateRequest,
  createSessionToken,
  hashPassword,
  publicUser,
  sessionExpiry,
} from "../lib/auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req) => {
    const user = await authenticateRequest(req, app.prisma);
    if (user) req.user = user;
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await app.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || user.passwordHash !== hashPassword(body.password)) {
      return reply.status(401).send({ error: "Identifiants incorrects" });
    }

    const token = createSessionToken();
    await app.prisma.session.create({
      data: { token, userId: user.id, expiresAt: sessionExpiry() },
    });

    return { token, user: publicUser(user) };
  });

  app.get("/api/auth/me", async (req, reply) => {
    if (!req.user) return reply.status(401).send({ error: "Non connecté" });
    return { user: publicUser(req.user) };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      await app.prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }
    return { ok: true };
  });

  app.get("/api/auth/demo-users", async () => {
    const users = await app.prisma.user.findMany({
      select: { email: true, name: true, role: true, bankName: true, shareholderName: true },
      orderBy: { role: "asc" },
    });
    return users;
  });
}
