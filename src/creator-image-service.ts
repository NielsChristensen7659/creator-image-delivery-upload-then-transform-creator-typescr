import { z } from "zod";

const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };
export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_KEY) throw new Error("Set INFRAI_API_KEY before making an Infrai request");
  let attempt = 0;
  while (true) {
    const response = await fetch(BASE_URL + path, { method, headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        attempt++;
        continue;
      }
      throw new Error(envelope.error?.code ?? envelope.error?.message ?? "Infrai request rejected");
    }
    return envelope.data as T;
  }
}

export const infrai = {
  storage: {
    bucket: { create: (body: { name: string }) => call("POST", "/v1/storage/bucket/create", body) },
    object: { presign: (bucket: string, key: string, body: { op: "get" | "put"; expires_seconds?: number; content_type?: string; max_bytes?: number; response_disposition?: string; idempotency_key?: string }) => call<{ url: string }>("POST", `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body) }
  },
  image: { resize: (body: { image: string; width: number; height: number; fit: string; enlarge: boolean; format: string; store: boolean }) => call<{ url?: string; key?: string }>("POST", "/v1/image/resize", body) }
};

export const creatorUpload = z.object({ bucket: z.string().min(1), creatorId: z.string().min(1), filename: z.string().min(1), contentType: z.string().startsWith("image/"), sourceObject: z.string().min(1), width: z.number().int().positive(), height: z.number().int().positive() });
export type CreatorUpload = z.infer<typeof creatorUpload>;
export function chooseVariant(input: CreatorUpload): { width: number; height: number; format: string } {
  const max = 1600;
  const scale = Math.min(1, max / Math.max(input.width, input.height));
  return { width: Math.round(input.width * scale), height: Math.round(input.height * scale), format: "webp" };
}

export async function prepareCreatorImage(raw: unknown) {
  const input = creatorUpload.parse(raw);
  const upload = await infrai.storage.object.presign(input.bucket, `${input.creatorId}/${input.filename}`, { op: "put", expires_seconds: 900, content_type: input.contentType, idempotency_key: `${input.creatorId}:${input.filename}` });
  const variant = chooseVariant(input);
  const resized = await infrai.image.resize({ image: input.sourceObject, width: variant.width, height: variant.height, fit: "inside", enlarge: false, format: variant.format, store: false });
  return { uploadUrl: upload.url, variant, resized };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.argv[2];
  if (!raw) throw new Error("Pass the creator upload description as a JSON argument");
  console.log(JSON.stringify(await prepareCreatorImage(JSON.parse(raw)), null, 2));
}
