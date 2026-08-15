import { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerUser, loginUser, loginWithGoogle, toUserDto } from "./service";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../lib/errors";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleSchema = z.object({
  idToken: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await registerUser(body.email, body.password, body.name);
    reply.status(201).send(result);
  });

  app.post("/login", async (request) => {
    const body = loginSchema.parse(request.body);
    return loginUser(body.email, body.password);
  });

  app.post("/google", async (request) => {
    const body = googleSchema.parse(request.body);
    return loginWithGoogle(body.idToken);
  });

  app.get("/me", { preHandler: app.requireAuth }, async (request) => {
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) throw new UnauthorizedError();
    return { user: toUserDto(user) };
  });
}
