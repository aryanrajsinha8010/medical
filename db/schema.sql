-- =============================================================================
-- SwasthyaBillCheck (NMBTP: National Medical Bill Transparency Platform)
-- PostgreSQL / Supabase Compatible Schema with pg_trgm, pgvector & RLS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. rate_source: Official Government Rate Source Provenance
CREATE TABLE IF NOT EXISTS rate_source (
    source_id VARCHAR(64) PRIMARY KEY,
    scheme VARCHAR(32) NOT NULL CHECK (scheme IN ('CGHS', 'PM-JAY', 'NPPA', 'PMBI', 'MJPJAY', 'STATE')),
    name TEXT NOT NULL,
    authority TEXT NOT NULL,
    source_url TEXT NOT NULL,
    document_version TEXT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    retrieval_date TIMESTAMPTZ NOT NULL,
    licence_note TEXT NOT NULL,
    is_sample_seed BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    raw_sha256 VARCHAR(64)
);

-- 2. rate_version: Monthly Refresh & Version Diff Tracking
CREATE TABLE IF NOT EXISTS rate_version (
    version_id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES rate_source(source_id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    row_count INTEGER NOT NULL,
    added_count INTEGER NOT NULL DEFAULT 0,
    modified_count INTEGER NOT NULL DEFAULT 0,
    removed_count INTEGER NOT NULL DEFAULT 0,
    diff_summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. canonical_term: Standardized Medical Terminology (ICD-10, LOINC, WHO ATC, SNOMED label)
CREATE TABLE IF NOT EXISTS canonical_term (
    canonical_id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN (
        'room_rent', 'consultation', 'procedure', 'investigation',
        'pharmacy', 'consumable', 'implant', 'package', 'misc'
    )),
    unit VARCHAR(32) NOT NULL,
    synonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
    icd10_code VARCHAR(32),
    loinc_code VARCHAR(32),
    atc_code VARCHAR(32),
    snomed_note TEXT,
    plain_description_en TEXT NOT NULL,
    plain_description_hi TEXT NOT NULL,
    embedding vector(64)
);

CREATE INDEX IF NOT EXISTS idx_canonical_term_name_trgm ON canonical_term USING gin (name gin_trgm_ops);

-- 4. rate_item: Individual / Package Reference Rates
CREATE TABLE IF NOT EXISTS rate_item (
    rate_id VARCHAR(64) PRIMARY KEY,
    canonical_id VARCHAR(64) NOT NULL REFERENCES canonical_term(canonical_id) ON DELETE RESTRICT,
    scheme VARCHAR(32) NOT NULL,
    code VARCHAR(64) NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(32) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    rate NUMERIC(12, 2) NOT NULL CHECK (rate >= 0),
    tier VARCHAR(16) NOT NULL DEFAULT 'X',
    nabh_flag BOOLEAN NOT NULL DEFAULT TRUE,
    ward_type VARCHAR(32) NOT NULL DEFAULT 'all',
    state VARCHAR(16) NOT NULL DEFAULT 'ALL',
    effective_from DATE NOT NULL,
    effective_to DATE,
    source_id VARCHAR(64) NOT NULL REFERENCES rate_source(source_id) ON DELETE RESTRICT,
    page_ref TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_item_canonical ON rate_item(canonical_id, scheme, tier, nabh_flag, ward_type);

-- 5. drug_price: NPPA Ceiling Price & Jan Aushadhi (PMBI) Generic Benchmark
CREATE TABLE IF NOT EXISTS drug_price (
    drug_id VARCHAR(64) PRIMARY KEY,
    canonical_id VARCHAR(64) NOT NULL REFERENCES canonical_term(canonical_id) ON DELETE RESTRICT,
    generic_name TEXT NOT NULL,
    atc_code VARCHAR(32),
    unit VARCHAR(64) NOT NULL,
    nppa_ceiling_price NUMERIC(12, 2),
    janaushadhi_mrp NUMERIC(12, 2),
    janaushadhi_drug_code VARCHAR(32),
    source_id VARCHAR(64) NOT NULL REFERENCES rate_source(source_id) ON DELETE RESTRICT
);

-- 6. hospital: NABH Accreditation, City Tier & Transparency Score
CREATE TABLE IF NOT EXISTS hospital (
    hospital_id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    state VARCHAR(16) NOT NULL,
    city VARCHAR(64) NOT NULL,
    tier VARCHAR(8) NOT NULL CHECK (tier IN ('X', 'Y', 'Z')),
    nabh_accredited BOOLEAN NOT NULL DEFAULT TRUE,
    cghs_empanelled BOOLEAN NOT NULL DEFAULT FALSE,
    pmjay_empanelled BOOLEAN NOT NULL DEFAULT FALSE,
    transparency_score INTEGER NOT NULL DEFAULT 75
);

-- 7. bill: Uploaded & Redacted Citizen Hospital Bill
CREATE TABLE IF NOT EXISTS bill (
    bill_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    hospital_name TEXT,
    state VARCHAR(16) NOT NULL DEFAULT 'DL',
    city_tier VARCHAR(8) NOT NULL DEFAULT 'X',
    nabh_accredited BOOLEAN NOT NULL DEFAULT TRUE,
    ward_type VARCHAR(32) NOT NULL DEFAULT 'semi_private',
    stay_days INTEGER NOT NULL DEFAULT 1,
    billed_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reference_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    potential_savings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    flagged_count INTEGER NOT NULL DEFAULT 0,
    pii_redacted BOOLEAN NOT NULL DEFAULT TRUE,
    redaction_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_days INTEGER NOT NULL DEFAULT 7,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. bill_line: Extracted & Normalized Line Items
CREATE TABLE IF NOT EXISTS bill_line (
    line_id VARCHAR(64) PRIMARY KEY,
    bill_id VARCHAR(64) NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
    line_index INTEGER NOT NULL,
    raw_text TEXT NOT NULL,
    canonical_id VARCHAR(64) REFERENCES canonical_term(canonical_id),
    category VARCHAR(32) NOT NULL,
    qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
    bbox JSONB
);

-- 9. verification: Per-Line Reference Comparison & Plain-Language Explanation
CREATE TABLE IF NOT EXISTS verification (
    verification_id VARCHAR(64) PRIMARY KEY,
    line_id VARCHAR(64) NOT NULL REFERENCES bill_line(line_id) ON DELETE CASCADE,
    bill_id VARCHAR(64) NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
    comparator_scheme VARCHAR(32) NOT NULL,
    rate_id VARCHAR(64) REFERENCES rate_item(rate_id),
    reference_rate NUMERIC(12, 2),
    reference_unit_rate NUMERIC(12, 2),
    delta_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    delta_pct NUMERIC(8, 2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL CHECK (status IN (
        'ok', 'above_reference', 'cannot_verify', 'needs_confirmation'
    )),
    reason_code VARCHAR(64) NOT NULL,
    explanation_i18n JSONB NOT NULL,
    hospital_question_i18n JSONB NOT NULL,
    evidence JSONB NOT NULL,
    alternative_comparators JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 10. merkle_batch: Periodic Merkle-Root Anchoring (Optional Public Chain / Hyperledger Adapter)
CREATE TABLE IF NOT EXISTS merkle_batch (
    batch_id VARCHAR(64) PRIMARY KEY,
    merkle_root VARCHAR(64) NOT NULL UNIQUE,
    report_count INTEGER NOT NULL,
    anchor_network VARCHAR(64) NOT NULL DEFAULT 'local-merkle-ledger',
    anchor_tx_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. report: Hash-Chained Append-Only Tamper-Evident Verification Report
CREATE TABLE IF NOT EXISTS report (
    report_id VARCHAR(64) PRIMARY KEY,
    bill_id VARCHAR(64) NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
    report_hash VARCHAR(64) NOT NULL UNIQUE,
    prev_hash VARCHAR(64) NOT NULL,
    merkle_batch_id VARCHAR(64) REFERENCES merkle_batch(batch_id),
    payload_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. user_feedback: Citizen Feedback on Matching / Dispute Outcomes
CREATE TABLE IF NOT EXISTS user_feedback (
    feedback_id VARCHAR(64) PRIMARY KEY,
    report_hash VARCHAR(64) NOT NULL REFERENCES report(report_hash) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. audit_log: Immutable Security & DPDP Privacy Audit Trail
CREATE TABLE IF NOT EXISTS audit_log (
    log_id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    actor_session VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security (RLS) Policies for Citizen Data Isolation (Supabase / Postgres)
ALTER TABLE bill ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY bill_session_isolation ON bill
    USING (session_id = current_setting('app.current_session_id', true));

CREATE POLICY bill_line_session_isolation ON bill_line
    USING (bill_id IN (SELECT bill_id FROM bill WHERE session_id = current_setting('app.current_session_id', true)));

CREATE POLICY verification_session_isolation ON verification
    USING (bill_id IN (SELECT bill_id FROM bill WHERE session_id = current_setting('app.current_session_id', true)));
