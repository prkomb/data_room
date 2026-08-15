import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { env } from "./lib/env";
import { AppError } from "./lib/errors";
import authPlugin from "./plugins/auth";
import { authRoutes } from "./modules/auth/routes";
import { dataRoomRoutes } from "./modules/dataRooms/routes";
import { folderRoutes } from "./modules/folders/routes";
import { fileRoutes } from "./modules/files/routes";
import { shareRoutes } from "./modules/shares/routes";
import { publicRoutes } from "./modules/shares/public-routes";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  app.register(multipart, {
    limits: { fileSize: env.MAX_UPLOAD_BYTES },
  });

  app.register(authPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...("suggestedName" in error && error.suggestedName ? { suggestedName: error.suggestedName } : {}),
      });
      return;
    }
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: "BAD_REQUEST",
        message: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
      return;
    }
    if ((error as { statusCode?: number }).statusCode === 413) {
      reply.status(413).send({ error: "PAYLOAD_TOO_LARGE", message: "File exceeds the upload size limit" });
      return;
    }
    app.log.error(error);
    reply.status(500).send({ error: "INTERNAL_ERROR", message: "Something went wrong" });
  });

  app.get("/health", async () => ({ ok: true }));

  app.register(authRoutes, { prefix: "/auth" });
  app.register(dataRoomRoutes, { prefix: "/data-rooms" });
  app.register(folderRoutes, { prefix: "/folders" });
  app.register(fileRoutes, { prefix: "/files" });
  app.register(shareRoutes);
  app.register(publicRoutes, { prefix: "/public" });

  return app;
}
