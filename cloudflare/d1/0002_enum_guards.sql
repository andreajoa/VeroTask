-- D1 staging SQLite enum guard triggers translated from PostgreSQL enum declarations.

-- Must be applied after cloudflare/d1/0001_schema.sql.

CREATE TRIGGER IF NOT EXISTS "enum_booking_evidence_type_insert"
BEFORE INSERT ON "booking_evidence"
WHEN NEW."type" IS NOT NULL AND NEW."type" NOT IN ('geo_check_in', 'geo_check_out', 'customer_pin', 'before_photo', 'after_photo', 'checklist', 'message', 'provider_note', 'customer_note')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_booking_evidence_type');
END;

CREATE TRIGGER IF NOT EXISTS "enum_booking_evidence_type_update"
BEFORE UPDATE ON "booking_evidence"
WHEN NEW."type" IS NOT NULL AND NEW."type" NOT IN ('geo_check_in', 'geo_check_out', 'customer_pin', 'before_photo', 'after_photo', 'checklist', 'message', 'provider_note', 'customer_note')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_booking_evidence_type');
END;

CREATE TRIGGER IF NOT EXISTS "enum_bookings_status_insert"
BEFORE INSERT ON "bookings"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('requested', 'accepted', 'payment_authorized', 'scheduled', 'in_progress', 'provider_completed', 'customer_confirmed', 'auto_completed', 'disputed', 'cancelled', 'refunded', 'paid_out')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_bookings_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_bookings_status_update"
BEFORE UPDATE ON "bookings"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('requested', 'accepted', 'payment_authorized', 'scheduled', 'in_progress', 'provider_completed', 'customer_confirmed', 'auto_completed', 'disputed', 'cancelled', 'refunded', 'paid_out')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_bookings_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_business_claims_status_insert"
BEFORE INSERT ON "business_claims"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('pending', 'verified', 'rejected', 'revoked')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_business_claims_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_business_claims_status_update"
BEFORE UPDATE ON "business_claims"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('pending', 'verified', 'rejected', 'revoked')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_business_claims_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_businesses_status_insert"
BEFORE INSERT ON "businesses"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('unclaimed', 'pending', 'active', 'paused', 'suspended')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_businesses_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_businesses_status_update"
BEFORE UPDATE ON "businesses"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('unclaimed', 'pending', 'active', 'paused', 'suspended')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_businesses_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_businesses_plan_insert"
BEFORE INSERT ON "businesses"
WHEN NEW."plan" IS NOT NULL AND NEW."plan" NOT IN ('free', 'pro', 'elite')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_businesses_plan');
END;

CREATE TRIGGER IF NOT EXISTS "enum_businesses_plan_update"
BEFORE UPDATE ON "businesses"
WHEN NEW."plan" IS NOT NULL AND NEW."plan" NOT IN ('free', 'pro', 'elite')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_businesses_plan');
END;

CREATE TRIGGER IF NOT EXISTS "enum_disputes_reason_insert"
BEFORE INSERT ON "disputes"
WHEN NEW."reason" IS NOT NULL AND NEW."reason" NOT IN ('provider_no_show', 'service_not_completed', 'service_not_as_described', 'property_damage', 'customer_no_show', 'payment_issue', 'other')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_disputes_reason');
END;

CREATE TRIGGER IF NOT EXISTS "enum_disputes_reason_update"
BEFORE UPDATE ON "disputes"
WHEN NEW."reason" IS NOT NULL AND NEW."reason" NOT IN ('provider_no_show', 'service_not_completed', 'service_not_as_described', 'property_damage', 'customer_no_show', 'payment_issue', 'other')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_disputes_reason');
END;

CREATE TRIGGER IF NOT EXISTS "enum_disputes_status_insert"
BEFORE INSERT ON "disputes"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('open', 'awaiting_customer', 'awaiting_provider', 'under_review', 'resolved_customer', 'resolved_provider', 'resolved_split', 'closed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_disputes_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_disputes_status_update"
BEFORE UPDATE ON "disputes"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('open', 'awaiting_customer', 'awaiting_provider', 'under_review', 'resolved_customer', 'resolved_provider', 'resolved_split', 'closed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_disputes_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_provider_subscriptions_plan_insert"
BEFORE INSERT ON "provider_subscriptions"
WHEN NEW."plan" IS NOT NULL AND NEW."plan" NOT IN ('free', 'pro', 'elite')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_provider_subscriptions_plan');
END;

CREATE TRIGGER IF NOT EXISTS "enum_provider_subscriptions_plan_update"
BEFORE UPDATE ON "provider_subscriptions"
WHEN NEW."plan" IS NOT NULL AND NEW."plan" NOT IN ('free', 'pro', 'elite')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_provider_subscriptions_plan');
END;

CREATE TRIGGER IF NOT EXISTS "enum_provider_transfers_status_insert"
BEFORE INSERT ON "provider_transfers"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('pending', 'eligible', 'processing', 'paid', 'reversed', 'failed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_provider_transfers_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_provider_transfers_status_update"
BEFORE UPDATE ON "provider_transfers"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('pending', 'eligible', 'processing', 'paid', 'reversed', 'failed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_provider_transfers_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_refunds_status_insert"
BEFORE INSERT ON "refunds"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_refunds_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_refunds_status_update"
BEFORE UPDATE ON "refunds"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_refunds_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_users_role_insert"
BEFORE INSERT ON "users"
WHEN NEW."role" IS NOT NULL AND NEW."role" NOT IN ('customer', 'provider', 'admin', 'support')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_users_role');
END;

CREATE TRIGGER IF NOT EXISTS "enum_users_role_update"
BEFORE UPDATE ON "users"
WHEN NEW."role" IS NOT NULL AND NEW."role" NOT IN ('customer', 'provider', 'admin', 'support')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_users_role');
END;

CREATE TRIGGER IF NOT EXISTS "enum_crm_abandonments_kind_insert"
BEFORE INSERT ON "crm_abandonments"
WHEN NEW."kind" IS NOT NULL AND NEW."kind" NOT IN ('cart', 'checkout')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_crm_abandonments_kind');
END;

CREATE TRIGGER IF NOT EXISTS "enum_crm_abandonments_kind_update"
BEFORE UPDATE ON "crm_abandonments"
WHEN NEW."kind" IS NOT NULL AND NEW."kind" NOT IN ('cart', 'checkout')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_crm_abandonments_kind');
END;

CREATE TRIGGER IF NOT EXISTS "enum_crm_abandonments_status_insert"
BEFORE INSERT ON "crm_abandonments"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('active', 'recovered', 'expired', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_crm_abandonments_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_crm_abandonments_status_update"
BEFORE UPDATE ON "crm_abandonments"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('active', 'recovered', 'expired', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_crm_abandonments_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_crm_contacts_lifecycle_insert"
BEFORE INSERT ON "crm_contacts"
WHEN NEW."lifecycle" IS NOT NULL AND NEW."lifecycle" NOT IN ('visitor', 'lead', 'abandoned_checkout', 'customer', 'provider', 'subscriber', 'churned', 'suppressed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_crm_contacts_lifecycle');
END;

CREATE TRIGGER IF NOT EXISTS "enum_crm_contacts_lifecycle_update"
BEFORE UPDATE ON "crm_contacts"
WHEN NEW."lifecycle" IS NOT NULL AND NEW."lifecycle" NOT IN ('visitor', 'lead', 'abandoned_checkout', 'customer', 'provider', 'subscriber', 'churned', 'suppressed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_crm_contacts_lifecycle');
END;

CREATE TRIGGER IF NOT EXISTS "enum_legal_cases_status_insert"
BEFORE INSERT ON "legal_cases"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('open', 'preservation', 'responded', 'closed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_legal_cases_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_legal_cases_status_update"
BEFORE UPDATE ON "legal_cases"
WHEN NEW."status" IS NOT NULL AND NEW."status" NOT IN ('open', 'preservation', 'responded', 'closed')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_legal_cases_status');
END;

CREATE TRIGGER IF NOT EXISTS "enum_bilateral_ratings_direction_insert"
BEFORE INSERT ON "bilateral_ratings"
WHEN NEW."direction" IS NOT NULL AND NEW."direction" NOT IN ('customer_to_provider', 'provider_to_customer')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_bilateral_ratings_direction');
END;

CREATE TRIGGER IF NOT EXISTS "enum_bilateral_ratings_direction_update"
BEFORE UPDATE ON "bilateral_ratings"
WHEN NEW."direction" IS NOT NULL AND NEW."direction" NOT IN ('customer_to_provider', 'provider_to_customer')
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_bilateral_ratings_direction');
END;
