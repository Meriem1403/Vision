import { createHash, randomBytes } from "node:crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { User, UserRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

export type AuthUser = Pick<User, "id" | "email" | "name" | "firstName" | "initials" | "role" | "bankName" | "shareholderName">;

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

const SESSION_DAYS = 7;

export function hashPassword(password: string): string {
  return createHash("sha256").update(`vision:${password}`).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

export async function authenticateRequest(req: FastifyRequest, prisma: PrismaClient): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { id, email, name, firstName, initials, role, bankName, shareholderName } = session.user;
  return { id, email, name, firstName, initials, role, bankName, shareholderName };
}

export function requireAuth(roles?: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.status(401).send({ error: "Authentification requise" });
    }
    if (roles && !roles.includes(req.user.role)) {
      return reply.status(403).send({ error: "Accès non autorisé pour ce rôle" });
    }
  };
}

export function publicUser(u: AuthUser) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    firstName: u.firstName,
    initials: u.initials,
    role: u.role,
    bankName: u.bankName,
    shareholderName: u.shareholderName,
  };
}
