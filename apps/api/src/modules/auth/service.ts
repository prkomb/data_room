import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import type { UserDto } from "@data-room/shared";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { AppError, UnauthorizedError } from "../../lib/errors";
import { env, googleAuthConfigured } from "../../lib/env";

const googleClient = googleAuthConfigured ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export function toUserDto(user: { id: string; email: string; name: string; avatarUrl: string | null }): UserDto {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

export async function registerUser(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  return { token: signToken({ sub: user.id, email: user.email }), user: toUserDto(user) };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }
  return { token: signToken({ sub: user.id, email: user.email }), user: toUserDto(user) };
}

export async function loginWithGoogle(idToken: string) {
  if (!googleClient) {
    throw new AppError(503, "GOOGLE_NOT_CONFIGURED", "Google sign-in is not configured");
  }
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID }).catch(() => null);
  const payload = ticket?.getPayload();
  if (!payload?.email) {
    throw new UnauthorizedError("Invalid Google token");
  }

  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          name: payload.name ?? payload.email.split("@")[0],
          avatarUrl: payload.picture ?? null,
        },
      });
    }
  }

  return { token: signToken({ sub: user.id, email: user.email }), user: toUserDto(user) };
}
