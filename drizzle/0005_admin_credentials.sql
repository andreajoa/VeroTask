CREATE TABLE IF NOT EXISTS "admin_credentials" (
  "id" varchar(80) PRIMARY KEY,
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "platform_secrets" (
  "id" varchar(120) PRIMARY KEY,
  "secret_value" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
