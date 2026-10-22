-- D1 login migrations: keep DB-token hashes only, never raw magic links or cookies.
-- This is staging. Existing Neon users/sessions MUST be reconciled before cutover.
ALTER TABLE auth_tokens ADD COLUMN consumed_session_hash TEXT;
ALTER TABLE auth_tokens ADD COLUMN consumed_session_expires_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_consumed_session_unique
  ON auth_tokens(consumed_session_hash) WHERE consumed_session_hash IS NOT NULL;

-- Exactly one atomic token transition. The trigger creates the user, then the
-- session. Any constraint failure rolls back token consumption too.
CREATE TRIGGER IF NOT EXISTS auth_token_consume_create_session
AFTER UPDATE OF used_at ON auth_tokens
WHEN OLD.used_at IS NULL AND NEW.used_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT,'missing_session_hash')
    WHERE NEW.consumed_session_hash IS NULL OR length(NEW.consumed_session_hash) != 64;
  SELECT RAISE(ABORT,'missing_session_expiry')
    WHERE NEW.consumed_session_expires_at IS NULL
       OR julianday(NEW.consumed_session_expires_at) <= julianday('now');
  INSERT OR IGNORE INTO users(email,role) VALUES(NEW.email,'customer');
  INSERT INTO sessions(user_id,token_hash,expires_at)
    SELECT id,NEW.consumed_session_hash,NEW.consumed_session_expires_at
    FROM users WHERE email=NEW.email;
END;
