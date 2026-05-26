import type { Context } from "hono";
import { base64ToBytes, bytesToBase64, safeFileName } from "./encoding";
import { ErrorCode, failure, readJson, success } from "./response";
import type { AuthUser, Env } from "./types";

type MediaKind = "images" | "videos";

interface Base64UploadBody {
  fileName?: string;
  base64Data?: string;
}

function mediaPrefix(userId: string, kind: MediaKind): string {
  return `assets/${userId}/${kind}/`;
}

function mediaKey(userId: string, kind: MediaKind, fileName: string): string {
  return `${mediaPrefix(userId, kind)}${safeFileName(fileName)}`;
}

async function listAll(bucket: R2Bucket, prefix: string): Promise<string[]> {
  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await bucket.list({ prefix, cursor });
    names.push(...result.objects.map((object) => object.key.slice(prefix.length)));
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
  return names.sort((left, right) => left.localeCompare(right));
}

export async function listMedia(c: Context<{ Bindings: Env; Variables: { authUser: AuthUser } }>, kind: MediaKind): Promise<Response> {
  const user = c.get("authUser");
  return success(c, await listAll(c.env.MEDIA, mediaPrefix(user.userId, kind)));
}

export async function getMediaBase64(c: Context<{ Bindings: Env; Variables: { authUser: AuthUser } }>, kind: MediaKind): Promise<Response> {
  const user = c.get("authUser");
  const fileNameParam = c.req.param("filename");
  if (!fileNameParam) {
    return failure(c, 400, ErrorCode.BAD_REQUEST, "filename is required");
  }
  const fileName = safeFileName(fileNameParam);
  const object = await c.env.MEDIA.get(mediaKey(user.userId, kind, fileName));
  if (!object) {
    return failure(c, 404, ErrorCode.NOT_FOUND, "Media file not found");
  }

  return success(c, bytesToBase64(new Uint8Array(await object.arrayBuffer())));
}

export async function uploadMediaBase64(c: Context<{ Bindings: Env; Variables: { authUser: AuthUser } }>, kind: MediaKind): Promise<Response> {
  const user = c.get("authUser");
  const body = await readJson<Base64UploadBody>(c);
  if (typeof body.fileName !== "string" || typeof body.base64Data !== "string" || !body.base64Data.trim()) {
    return failure(c, 400, ErrorCode.BAD_REQUEST, "fileName and base64Data are required");
  }
  const fileName = safeFileName(body.fileName);
  const bytes = base64ToBytes(body.base64Data);
  await c.env.MEDIA.put(mediaKey(user.userId, kind, fileName), bytes, {
    httpMetadata: {
      contentType: kind === "images" ? "application/octet-stream" : "application/octet-stream",
    },
  });
  return success(c, fileName, 201);
}
