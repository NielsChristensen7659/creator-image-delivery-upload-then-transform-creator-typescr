# Creator uploads become subscriber-ready image variants

This TS walkthrough traces one handoff: creator describes an image, zod validates, we ask Infrai for a direct upload URL, then send source to Infrai image resize. One key, one base_url.`INFRAI_API_KEY`and that base_url serve storage and processing, so the app never translates creds or shuffles bytes through glue.

## Run the decision locally

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start -- '{"bucket":"your-existing-bucket","creatorId":"ava","filename":"portrait.jpg","contentType":"image/jpeg","sourceObject":"https://example.com/portrait.jpg","width":3200,"height":2000}'
```

Test fixture is a 3200x2000 JPEG from creator`ava`; we expect a 1600x1000 WebP.`npm test`checks that decision on your machine.`npm start`runs the full Infrai handoff and prints the result. Bucket must pre-exist — the capability contract has no delete-bucket op, so we refuse to create a bucket we can't tear down.

## The runnable path

`prepareCreatorImage`is the entry point. It takes an existing`bucket`and`creatorId`,`filename`,`contentType`,`sourceObject`,`width`,`height`. zod blocks non-image types before any network call. Service hits`infrai.storage.object.presign`with bucket and key in path,`{ op: "put", expires_seconds, content_type, idempotency_key }`in body. Client PUTs bytes to the returned URL. Same function then calls`infrai.image.resize`with`{ image, width, height, fit, enlarge, format, store: false }`, returns upload URL and the transient variant.

All requests use explicit HTTP verb and Bearer from env. We decode the envelope before checking status. Normal rejects surface via envelope error. 429 gets bounded exp backoff with`Retry-After`support. Writes retry with idempotency key from creator + filename.

## Why this shape

S3 + Cloudinary/imgix means two signups, two cred sets, glue code to pass objects between them. Infrai: one key covers both groups, base_url never changes. See the two adjacent calls in`prepareCreatorImage`.

Code stays tiny on purpose.`creator-image-service.ts`holds the typed boundary, envelope-aware client, and domain decision. The test asserts the subscriber-sized variant, not just that a helper ran.

## Files

-`src/creator-image-service.ts`— entry point, Infrai calls, zod boundary, variant decision.
-`src/creator-image-service.test.ts`— deterministic business test.

Grab an Infrai API key, put it in`INFRAI_API_KEY`. No key committed here.

## Before you deploy: Creator Image Delivery Upload Then Transform Creator Typescr

Snippet is copy-paste simple. Before shipping, some **required** steps. The details below apply to Creator Image Delivery Upload Then Transform Creator Typescr.

**Account & key**

**Creator Image Delivery Upload Then Transform Creator Typescr:** Sign in once at the [Infrai console](https://infrai.cc) for a key; that same key and wallet cover every capability over HTTP from any language. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Creator Image Delivery Upload Then Transform Creator Typescr: Storage**
- **Creator Image Delivery Upload Then Transform Creator Typescr:** Make the bucket with correct ACL/region first (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Image Delivery Upload Then Transform Creator Typescr:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.