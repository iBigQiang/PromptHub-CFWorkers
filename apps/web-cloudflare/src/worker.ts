import { Hono } from "hono";
import { cors } from "hono/cors";
import { bootstrapStatus, issueCaptcha, login, register, requireAuth } from "./auth";
import { heartbeat } from "./devices";
import { getMediaBase64, listMedia, uploadMediaBase64 } from "./media";
import { ErrorCode, failure, success } from "./response";
import { getManifest, getSyncData, putSyncData } from "./sync";
import type { AuthUser, Env } from "./types";

const app = new Hono<{ Bindings: Env; Variables: { authUser: AuthUser } }>();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 86400,
}));

app.get("/health", (c) => success(c, { ok: true, runtime: "cloudflare-workers" }));

app.get("/api/auth/bootstrap", bootstrapStatus);
app.get("/api/auth/captcha", issueCaptcha);
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);

app.use("/api/devices/*", requireAuth);
app.post("/api/devices/heartbeat", heartbeat);

app.use("/api/sync/*", requireAuth);
app.get("/api/sync/manifest", getManifest);
app.get("/api/sync/data", getSyncData);
app.put("/api/sync/data", putSyncData);

app.use("/api/media/*", requireAuth);
app.get("/api/media/images", (c) => listMedia(c, "images"));
app.get("/api/media/videos", (c) => listMedia(c, "videos"));
app.get("/api/media/images/:filename/base64", (c) => getMediaBase64(c, "images"));
app.get("/api/media/videos/:filename/base64", (c) => getMediaBase64(c, "videos"));
app.post("/api/media/images/base64", (c) => uploadMediaBase64(c, "images"));
app.post("/api/media/videos/base64", (c) => uploadMediaBase64(c, "videos"));
app.post("/api/media/images", (c) => failure(c, 400, ErrorCode.BAD_REQUEST, "Use /api/media/images/base64"));
app.post("/api/media/videos", (c) => failure(c, 400, ErrorCode.BAD_REQUEST, "Use /api/media/videos/base64"));

app.notFound(async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return failure(c, 404, ErrorCode.NOT_FOUND, "Not found");
});

app.onError((error, c) => {
  console.error(error);
  return failure(c, 500, ErrorCode.INTERNAL_ERROR, error instanceof Error ? error.message : "Internal server error");
});

export default app;
