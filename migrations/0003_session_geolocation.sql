-- Add geolocation columns expected by better-auth-cloudflare's session hook.
-- These are populated by `withCloudflare` when geolocationTracking is enabled (default).

ALTER TABLE "session" ADD COLUMN "timezone" TEXT;
ALTER TABLE "session" ADD COLUMN "city" TEXT;
ALTER TABLE "session" ADD COLUMN "country" TEXT;
ALTER TABLE "session" ADD COLUMN "region" TEXT;
ALTER TABLE "session" ADD COLUMN "regionCode" TEXT;
ALTER TABLE "session" ADD COLUMN "colo" TEXT;
ALTER TABLE "session" ADD COLUMN "latitude" TEXT;
ALTER TABLE "session" ADD COLUMN "longitude" TEXT;