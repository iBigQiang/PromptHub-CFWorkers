import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Context, MiddlewareHandler } from "hono";
import { ErrorCode, failure, readJson, success } from "./response";
import type { AuthUser, Env, LoginResult } from "./types";

const CAPTCHA_TTL_SECONDS = 5 * 60;

interface RegisterBody {
  username?: string;
  password?: string;
  captchaId?: string;
  captchaAnswer?: string;
}

interface LoginBody {
  username?: string;
  password?: string;
  captchaId?: string;
  captchaAnswer?: string;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function nowMs(): number {
  return Date.now();
}

function getClientId(c: Context<{ Bindings: Env }>): string {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
}

function getJwtSecret(env: Env): Uint8Array {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(env.JWT_SECRET);
}

function accessTokenTtl(env: Env): number {
  const parsed = Number(env.ACCESS_TOKEN_TTL_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86400;
}

function normalizeUsername(username: unknown): string {
  if (typeof username !== "string" || !username.trim()) {
    throw new Error("username is required");
  }
  const normalized = username.trim();
  if (normalized.length < 3 || normalized.length > 64) {
    throw new Error("username must be 3-64 characters");
  }
  return normalized;
}

function normalizePassword(password: unknown): string {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
  return password;
}

async function countUsers(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
  return row?.count ?? 0;
}

async function signAccessToken(env: Env, user: AuthUser): Promise<LoginResult> {
  const ttl = accessTokenTtl(env);
  const expiresAt = nowSeconds() + ttl;
  const accessToken = await new SignJWT({
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret(env));

  return {
    accessToken,
    accessTokenExpiresIn: ttl,
    user: {
      id: user.userId,
      username: user.username,
      role: user.role,
    },
  };
}

async function verifyCaptcha(c: Context<{ Bindings: Env }>, captchaId: unknown, captchaAnswer: unknown): Promise<void> {
  if (typeof captchaId !== "string" || typeof captchaAnswer !== "string") {
    throw new Error("captchaId and captchaAnswer are required");
  }

  const challenge = await c.env.DB
    .prepare("SELECT id, answer_hash, expires_at, used_at FROM auth_challenges WHERE id = ? AND client_id = ?")
    .bind(captchaId, getClientId(c))
    .first<{ id: string; answer_hash: string; expires_at: number; used_at: number | null }>();

  if (!challenge || challenge.used_at || challenge.expires_at < nowMs()) {
    throw new Error("Captcha challenge expired");
  }

  const ok = await bcrypt.compare(captchaAnswer.trim().toLowerCase(), challenge.answer_hash);
  if (!ok) {
    throw new Error("Captcha answer is incorrect");
  }

  await c.env.DB.prepare("UPDATE auth_challenges SET used_at = ? WHERE id = ?").bind(nowMs(), challenge.id).run();
}

export async function issueCaptcha(c: Context<{ Bindings: Env }>): Promise<Response> {
  const left = Math.floor(Math.random() * 9) + 1;
  const right = Math.floor(Math.random() * 9) + 1;
  const operator = Math.random() > 0.5 ? "+" : "-";
  const answer = String(operator === "+" ? left + right : left - right);
  const id = crypto.randomUUID();
  const createdAt = nowMs();
  const expiresAt = createdAt + CAPTCHA_TTL_SECONDS * 1000;
  const answerHash = await bcrypt.hash(answer.toLowerCase(), 8);

  await c.env.DB
    .prepare("INSERT INTO auth_challenges (id, client_id, answer_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, getClientId(c), answerHash, expiresAt, createdAt)
    .run();

  return success(c, {
    captchaId: id,
    prompt: `${left} ${operator} ${right} = ?`,
    expiresInSeconds: CAPTCHA_TTL_SECONDS,
  });
}

export async function bootstrapStatus(c: Context<{ Bindings: Env }>): Promise<Response> {
  const users = await countUsers(c.env.DB);
  return success(c, {
    needsSetup: users === 0,
    registrationAllowed: users === 0 || c.env.ALLOW_REGISTRATION === "true",
  });
}

export async function register(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await readJson<RegisterBody>(c);
  const users = await countUsers(c.env.DB);
  if (users > 0 && c.env.ALLOW_REGISTRATION !== "true") {
    return failure(c, 403, ErrorCode.FORBIDDEN, "Registration is disabled");
  }

  await verifyCaptcha(c, body.captchaId, body.captchaAnswer);

  const username = normalizeUsername(body.username);
  const password = normalizePassword(body.password);
  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();
  const timestamp = nowMs();
  const role = users === 0 ? "admin" : "user";

  try {
    await c.env.DB
      .prepare("INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, username, passwordHash, role, timestamp, timestamp)
      .run();
  } catch {
    return failure(c, 409, ErrorCode.CONFLICT, "Username already exists");
  }

  return success(c, await signAccessToken(c.env, { userId: id, username, role }), 201);
}

export async function login(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await readJson<LoginBody>(c);
  await verifyCaptcha(c, body.captchaId, body.captchaAnswer);

  const username = normalizeUsername(body.username);
  const password = normalizePassword(body.password);
  const user = await c.env.DB
    .prepare("SELECT id, username, password_hash, role FROM users WHERE LOWER(username) = LOWER(?)")
    .bind(username)
    .first<{ id: string; username: string; password_hash: string; role: "admin" | "user" }>();

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return failure(c, 401, ErrorCode.UNAUTHORIZED, "Invalid username or password");
  }

  return success(c, await signAccessToken(c.env, { userId: user.id, username: user.username, role: user.role }));
}

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: { authUser: AuthUser } }> = async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) {
    return failure(c, 401, ErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
  }

  try {
    const verified = await jwtVerify(token, getJwtSecret(c.env));
    const userId = verified.payload.sub;
    if (!userId || typeof verified.payload.username !== "string" || (verified.payload.role !== "admin" && verified.payload.role !== "user")) {
      return failure(c, 401, ErrorCode.UNAUTHORIZED, "Invalid access token");
    }
    c.set("authUser", {
      userId,
      username: verified.payload.username,
      role: verified.payload.role,
    });
  } catch {
    return failure(c, 401, ErrorCode.UNAUTHORIZED, "Invalid or expired access token");
  }

  await next();
};
