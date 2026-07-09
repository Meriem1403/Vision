import { FastifyInstance } from "fastify";
import { verifyMailConnection } from "../services/mailService.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    let db = false;
    let mail = false;
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    mail = await verifyMailConnection();

    return {
      status: db ? "ok" : "degraded",
      services: { database: db, mail },
      timestamp: new Date().toISOString(),
    };
  });
}
