import { get, put } from "@vercel/blob";
import { optionalEnv } from "@/lib/env";

type MemoryBlob = { body: string | Uint8Array; contentType: string; url: string };

declare global {
  var __wechatVisualBlobStore: Map<string, MemoryBlob> | undefined;
}

const memoryStore = globalThis.__wechatVisualBlobStore ?? new Map<string, MemoryBlob>();
globalThis.__wechatVisualBlobStore = memoryStore;

export async function putPublicBlob(
  pathname: string,
  body: string | Uint8Array | Buffer,
  contentType: string
): Promise<{ url: string }> {
  if (!optionalEnv("BLOB_READ_WRITE_TOKEN")) {
    const normalized = body instanceof Buffer ? new Uint8Array(body) : body;
    const url =
      typeof normalized === "string"
        ? `memory://${pathname}`
        : `data:${contentType};base64,${Buffer.from(normalized).toString("base64")}`;
    memoryStore.set(pathname, { body: normalized, contentType, url });
    return { url };
  }

  const putBody = body instanceof Uint8Array && !(body instanceof Buffer) ? Buffer.from(body) : body;
  return put(pathname, putBody, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true
  });
}

export async function getTextBlob(pathnameOrUrl: string): Promise<string | null> {
  const memoryPath = pathnameOrUrl.replace(/^memory:\/\//, "");
  const memory = memoryStore.get(memoryPath);
  if (memory) {
    return typeof memory.body === "string" ? memory.body : Buffer.from(memory.body).toString("utf8");
  }

  if (!optionalEnv("BLOB_READ_WRITE_TOKEN")) {
    return null;
  }

  try {
    const blob = await get(pathnameOrUrl, { access: "public" });
    if (!blob) {
      return null;
    }
    return await new Response(blob.stream).text();
  } catch {
    return null;
  }
}
