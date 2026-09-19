import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const BLOB_PREFIX = "blob:";

export function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function isBlobRef(stored: string) {
  return stored.startsWith(BLOB_PREFIX) || stored.startsWith("https://");
}

function blobPathname(stored: string) {
  if (stored.startsWith(BLOB_PREFIX)) return stored.slice(BLOB_PREFIX.length);
  try {
    return new URL(stored).pathname.replace(/^\//, "");
  } catch {
    return stored;
  }
}

export async function putObject(key: string, bytes: Buffer, contentType: string) {
  if (usesBlobStorage()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, bytes, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return `${BLOB_PREFIX}${blob.pathname.replace(/^\//, "")}`;
  }
  const abs = path.join(process.cwd(), key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
  return key.replace(/\\/g, "/");
}

export async function readObject(stored: string): Promise<Buffer> {
  if (isBlobRef(stored)) {
    const { get } = await import("@vercel/blob");
    const result = await get(blobPathname(stored), { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error(`blob missing: ${stored}`);
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  return readFile(path.join(process.cwd(), stored));
}
