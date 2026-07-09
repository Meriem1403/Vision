import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { entityRoutes } from "./routes/entities.js";
import { propertyRoutes } from "./routes/properties.js";
import { loanRoutes } from "./routes/loans.js";
import { healthRoutes } from "./routes/health.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const app = Fastify({ logger: true });
const prisma = new PrismaClient();
app.decorate("prisma", prisma);

await app.register(cors, { origin: true });
await app.register(healthRoutes);
await app.register(entityRoutes);
await app.register(propertyRoutes);
await app.register(loanRoutes);

app.setErrorHandler((error, _req, reply) => {
  app.log.error(error);
  const status = error.statusCode ?? 500;
  reply.status(status).send({
    error: error.message ?? "Erreur serveur",
  });
});

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
