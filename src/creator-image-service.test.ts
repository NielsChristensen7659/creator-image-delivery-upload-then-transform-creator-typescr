import assert from "node:assert/strict";
import { chooseVariant } from "./creator-image-service.ts";

const variant = chooseVariant({ bucket: "creator-media", creatorId: "ava", filename: "portrait.jpg", contentType: "image/jpeg", sourceObject: "uploads/ava/portrait.jpg", width: 3200, height: 2000 });
assert.deepEqual(variant, { width: 1600, height: 1000, format: "webp" });
console.log("variant decision test passed");
