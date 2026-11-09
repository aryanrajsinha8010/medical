# DPDP Act 2023 Privacy & Security Architecture (`PRIVACY.md`)

**Product**: SwasthyaBillCheck (NMBTP)  
**Compliance Target**: Digital Personal Data Protection (DPDP) Act, 2023 (India) & OWASP Top 10  

---

## 1. DPDP Act 2023 Alignment
1. **Explicit Informed Consent**: The UI displays a clear consent banner and modal explaining what data is processed, how PII is redacted, and that the tool provides informational rate comparisons (not legal or medical advice).
2. **Automatic PII Redaction Before Storage (`services/ai-engine/app/pii.py`)**:
   - **Patient Name**: Masked as `[REDACTED_PATIENT]`
   - **Indian Mobile Numbers (`+91-XXXXXXXXXX`)**: Masked as `+91-XXXXXX[REDACTED]`
   - **12-Digit Aadhaar Numbers**: Masked as `XXXX-XXXX-[REDACTED]`
   - **Hospital UHID / MRN / IPD Numbers**: Masked as `UHID: [REDACTED_ID]`
   - **Email Addresses**: Masked as `[REDACTED_EMAIL]`
3. **Configurable Ephemeral Retention**: Every `bill` record stores `retention_days` (default 7 days) and `expires_at`. Cloud storage (`infra/main.tf`) enforces S3 lifecycle expiration and KMS encryption at rest (`ap-south-1` Mumbai India region).
4. **Right to Erasure ("Delete My Data" Button)**: Citizens can immediately purge all bills, line items, and reports associated with their session via `DELETE /api/privacy/session/:sessionId` (logged in `audit_log`).
5. **Strict k-Anonymity (`k >= 10`) for Policy Analytics**: The Regulator Analytics API (`/api/analytics/regulator`) suppresses any category cohort with fewer than `k = 10` bills and exposes zero personal identifiers.

---

## 2. OWASP Top 10 Security Controls
- **A01 Broken Access Control**: PostgreSQL Row-Level Security (`RLS`) policies in `db/schema.sql` isolate `bill`, `bill_line`, and `verification` rows by `session_id`.
- **A03 Injection**: Parameterized SQL queries across all SQLite and PostgreSQL operations; constrained matching engine with zero arbitrary code/SQL execution.
- **A04 Insecure Design / Upload Validation**: Fastify (`services/api/src/server.ts`) and FastAPI (`services/ai-engine/app/main.py`) enforce a 12MB file size cap, extension whitelist (`.png`, `.jpg`, `.jpeg`, `.webp`, `.pdf`), and magic-byte rejection of executables (`MZ` PE and `ELF` headers).
- **A05 Security Misconfiguration**: Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`) and `@fastify/rate-limit` (300 req/min).
- **A08 Software & Data Integrity Failures**: SHA-256 hash-chained `report` table + Merkle-root batch verification + SHA-256 checksums on all `/data/raw/` government rate files.

