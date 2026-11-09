# SwasthyaBillCheck (NMBTP: National Medical Bill Transparency Platform)

> **Team TechNova — SBI Youth Ideathon 2026**  
> **Team Members:** Mansi Kumari (Leader), Sumit Kumar, Sameer Ranjan — VIT Bhopal University  
> **Tagline:** *"Ideas today, impact tomorrow."*

**SwasthyaBillCheck (NMBTP)** is an end-to-end, citizen-first medical bill verification platform. Citizens upload a hospital bill (photo or PDF); the platform runs OpenCV + Tesseract/PyMuPDF OCR, normalizes every line item into canonical medical terminology (`ICD-10`, `LOINC`, `WHO ATC`), compares each item against official Indian government reference rates (**CGHS**, **Ayushman Bharat PM-JAY HBP 2.2**, **NPPA DPCO Ceiling Prices**, **Jan Aushadhi / PMBI**, and **State Health Schemes**), flags items above the reference rate with plain-language explanations in **12 Indian languages**, and produces a downloadable, **tamper-evident SHA-256 hash-chained & QR-verified PDF report**.

---

## Non-Negotiable Honesty & Legal Safeguards

1. **Zero Fabricated Rates**: Every rate in our database (`data/swasthyabillcheck.db`) carries `source_id`, `source_url`, `document_version`, `effective_from`, `retrieval_date`, `scheme`, `city_tier`, `nabh_flag`, `ward_type`, and `licence_note`.
2. **Honest Legal Framing**: Private hospitals are **not** legally bound to CGHS/PM-JAY rates (except statutory NPPA DPCO caps on coronary stents, knee implants, and NLEM scheduled drugs). All flags use **"Above government reference rate"**, never *"illegal"* or *"fraud"*, and every screen displays: **"Informational tool, not legal or medical advice."**
3. **Strict Comparator Selection**: Never compares an itemized room-rent or consultation line to a bundled PM-JAY HBP surgical package rate.

---

## One-Command Quick Start

### Option A: One-Click Fresh Environment Setup & Launcher (Windows `.bat`)
```bat
:: Checks/installs Python, Node.js, pip packages, npm packages, Playwright Chromium,
:: seeds the Government Rate DB + 42 Golden Bills, runs health checks, and launches all 3 servers:
setup_and_run.bat

:: Or to check & install all requirements only (without starting server windows):
install_requirements.bat
```

### Option B: Local PowerShell Quick Start
```powershell
# 1. Seed & verify the database + 42 golden bills (already pre-seeded)
npm run seed

# 2. Start Python AI Engine (:8000), Node Fastify API (:4000), and React Vite PWA (:5173)
.\start.ps1
```
Then open **`http://localhost:5173`** in your browser.

### Option B: Docker Compose (Containerized Stack with PostgreSQL `pgvector` + `pg_trgm`)
```bash
docker compose up --build
```

### Run All Quality Gates & Automated Tests
```powershell
pytest tests/test_core_suite.py tests/test_api_and_load.py tests/e2e_playwright.py -v
```

---

## Repository Structure

```text
e:\ntmp\
├── apps/
│   └── web/                        # React 18 + TypeScript + Vite + Tailwind + Framer Motion + Recharts PWA
│       ├── design-tokens.json      # Figma-style W3C design tokens (#2B1166 Indigo, #F58220 Saffron)
│       ├── public/manifest.json    # Installable PWA manifest + Service Worker (sw.js)
│       └── src/
│           ├── App.tsx             # Full UI (Report, Bill X-Ray, OCR Edit, Chat, Dispute, Estimator, Analytics, Storybook)
│           └── i18n/translations.ts# 12 Indian languages (EN, HI, BN, TA, TE, MR, GU, KN, ML, PA, OR, AS)
├── services/
│   ├── ai-engine/                  # Python FastAPI service (:8000) for OCR, 6-Stage Matching, Ledger & PDF
│   │   └── app/
│   │       ├── ocr.py              # OpenCV deskew/denoise/adaptive-threshold + PyMuPDF/Tesseract + bounding boxes
│   │       ├── matcher.py          # 6-Stage SmartMatchingEngine + Comparator selector + Unbundling/Duplicate rules
│   │       ├── ledger.py           # SHA-256 hash-chained audit ledger + Merkle root + Optional chain adapter
│   │       ├── pii.py              # DPDP Act 2023 PII redaction (Name, Phone, Aadhaar, UHID, Email)
│   │       ├── features.py         # Grounded Chat, Polite Dispute Letter, Estimator, Insurer API, k>=10 Analytics, QR PDF
│   │       └── main.py             # FastAPI endpoints
│   └── api/                        # Node.js + TypeScript + Fastify API Gateway (:4000) with OWASP hardening
│       └── src/server.ts
├── data/
│   ├── raw/                        # Live government portal snapshots & SHA-256 provenance manifest
│   ├── etl/                        # ETL parsers, golden bill generator, and monthly version-diff refresh job
│   ├── golden_bills/               # 42 synthetic realistic hospital bills (PNG + multi-page PDF + ground_truth.json)
│   ├── swasthyabillcheck.db        # Populated SQLite WAL database (61 official rates, 47 canonical terms, 9 Jan Aushadhi drugs)
│   ├── quality_report.json         # Automated ETL data quality report (0 orphans, 0 duplicates, 0 nulls)
│   ├── golden_benchmark_results.json # 96.92% OCR/Match accuracy, 97.67% Precision/Recall, 1.15% False-Flag Rate
│   └── load_test_results.json      # 100-concurrent verifications benchmark (p95 = 359.25 ms < 800 ms target)
├── db/
│   └── schema.sql                  # Supabase / PostgreSQL DDL with pg_trgm, pgvector & Row-Level Security (RLS)
├── infra/
│   ├── main.tf                     # Terraform IaC for AWS Mumbai (ap-south-1)
│   └── azure-india.bicep           # Azure Bicep IaC for Central India (Pune)
├── docs/
│   ├── DATA_SOURCES.md             # Step 0 Data Provenance, URLs, Circulars, SHA-256 & Licences
│   ├── ARCHITECTURE.md             # System & Security Architecture + Mermaid Diagrams
│   ├── PRIVACY.md                  # DPDP Act 2023 Data Protection & Privacy Architecture
│   ├── TEST_REPORT.md              # Quality Gate & Benchmark Verification Report
│   ├── LIMITATIONS.md              # Honest Disclosure of System Boundaries
│   ├── DEMO_SCRIPT.md              # 3-Minute Live Pitch & Demo Script for SBI Youth Ideathon 2026
│   ├── PITCH_SUMMARY.md            # Slide-by-Slide Mapping (Slides 1–7)
│   └── screenshots/                # Playwright Desktop (1440x900) & Mobile (390x844) Verification Screenshots
└── tests/
    ├── test_core_suite.py          # Unit, Rules, Ledger, PII & 42-Bill Golden Benchmark Suite
    ├── test_api_and_load.py        # End-to-End API, OWASP Upload & 100-Concurrent Load Suite
    └── e2e_playwright.py           # Headless Chromium Desktop & Mobile E2E Suite
```

