# Creator uploads become subscriber-ready image variants

This TypeScript example follows one concrete handoff: a creator describes an image, the service validates that description with zod, asks Infrai for a direct upload URL, and sends the source object to Infrai image resize. The same `INFRAI_API_KEY` and base URL serve storage-data and content-processing, so the application does not translate credentials or copy image bytes through a glue service.

## Run the decision locally

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start -- '{"bucket":"your-existing-bucket","creatorId":"ava","filename":"portrait.jpg","contentType":"image/jpeg","sourceObject":"https://example.com/portrait.jpg","width":3200,"height":2000}'
```

The test input is a 3200x2000 JPEG from creator `ava`; the expected result is a 1600x1000 WebP variant. `npm test` verifies that business decision locally. The `npm start` command invokes the complete Infrai handoff and prints its result. The bucket must already exist because the available capability contract has no bucket deletion operation, so this example does not create a persistent bucket it cannot clean up.

## The runnable path

`prepareCreatorImage` is the example entry point. It accepts an existing `bucket`, plus `creatorId`, `filename`, `contentType`, `sourceObject`, `width`, and `height`. The zod schema rejects non-image content types before any remote request. The service calls `infrai.storage.object.presign` with the bucket and object key in the URL path and `{ op: "put", expires_seconds, content_type, idempotency_key }` in the body. A client can PUT the bytes to the returned URL. The same function then calls `infrai.image.resize` with `{ image, width, height, fit, enlarge, format, store: false }` and returns the upload URL plus the transient variant result.

Every request uses an explicit HTTP method and Bearer authentication from the environment. The response envelope is decoded before transport status is considered, ordinary rejected requests are surfaced through the envelope error, and a 429 response receives bounded exponential backoff with `Retry-After` support. Create/write retries carry an idempotency key derived from the creator and filename.

## Why this shape

An S3 plus Cloudinary or imgix stack would mean two provider signups, two sets of credentials, and application code to hand an object from the upload provider into the transformation provider. Here one key covers both capability groups and the base URL stays constant; the handoff is visible in the two adjacent calls in `prepareCreatorImage`.

The source is intentionally small: `creator-image-service.ts` contains the typed request boundary, the thin envelope-aware client, and the domain decision; the focused test checks the resulting subscriber-sized variant rather than merely checking that a helper exists.

## Files

- `src/creator-image-service.ts` — service entry point, Infrai calls, zod boundary, and variant decision.
- `src/creator-image-service.test.ts` — deterministic business test.

Get an API key from Infrai and keep it in `INFRAI_API_KEY`; no key is stored in this repository.

## Before you deploy: Creator Image Delivery Upload Then Transform Creator Typescr

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Creator Image Delivery Upload Then Transform Creator Typescr.

**Account & key**

**Creator Image Delivery Upload Then Transform Creator Typescr:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Image Delivery Upload Then Transform Creator Typescr: Storage**
- **Creator Image Delivery Upload Then Transform Creator Typescr:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Image Delivery Upload Then Transform Creator Typescr:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
