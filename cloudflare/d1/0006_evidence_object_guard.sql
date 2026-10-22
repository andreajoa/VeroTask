-- A signed attachment must never be claimed by two evidence records.
CREATE UNIQUE INDEX IF NOT EXISTS booking_evidence_unique_object_reference
ON booking_evidence(object_url) WHERE object_url IS NOT NULL;
