-- Denormalized actor snapshot on IntentAuditLog, so the Alert Center can
-- show who/role/store without a live join (User/Store are both
-- hard-deletable elsewhere in this app, same reasoning as TransactionEvent).
ALTER TABLE "IntentAuditLog" ADD COLUMN "actorName" TEXT;
ALTER TABLE "IntentAuditLog" ADD COLUMN "actorRole" TEXT;
ALTER TABLE "IntentAuditLog" ADD COLUMN "actorStoreId" TEXT;
