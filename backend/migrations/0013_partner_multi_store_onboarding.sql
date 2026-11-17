-- Partner onboarding: one account may apply for several stores.
-- Before: UNIQUE (user_id, role) allowed a single application per role, so a store owner's
-- new application overwrote the approved one. Now uniqueness stays only for customer/driver.
-- Additive for data, idempotent; existing rows are untouched.
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_user_role_single_unique" ON "onboarding_applications" USING btree ("user_id","role") WHERE "role" <> 'partner';
CREATE INDEX IF NOT EXISTS "onboarding_user_role_idx" ON "onboarding_applications" USING btree ("user_id","role");
-- The old uniqueness exists under two names depending on how the database was created:
-- a table constraint from the 15.4 migration (production) or an index from drizzle push.
ALTER TABLE "onboarding_applications" DROP CONSTRAINT IF EXISTS "onboarding_applications_user_id_role_key";
DROP INDEX IF EXISTS "onboarding_user_role_unique";
