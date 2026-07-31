-- Per-member flag controlling whether the mobile app plays a voice/sound
-- alert for payments arriving through the YapLin system (assigned to their
-- store via sync/routing). Owner/supervisor assign this on cajero and
-- supervisor accounts; the owner's own device always alerts on its native
-- Yape/Plin/Izipay notification listener regardless of this flag.
ALTER TABLE "User" ADD COLUMN "soundAlertEnabled" BOOLEAN NOT NULL DEFAULT true;
