CREATE TABLE IF NOT EXISTS "admin_login_attempts" (
  "key_hash" varchar(64) PRIMARY KEY,
  "failure_count" integer NOT NULL DEFAULT 0,
  "window_started_at" timestamptz NOT NULL DEFAULT now(),
  "blocked_until" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_login_attempts_blocked_idx"
  ON "admin_login_attempts" ("blocked_until");

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_owner_user_unique"
  ON "businesses" ("owner_user_id")
  WHERE "owner_user_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "disputes_booking_open_unique"
  ON "disputes" ("booking_id")
  WHERE "resolved_at" IS NULL;
