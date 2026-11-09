# SwasthyaBillCheck (NMBTP) Implementation Plan & Spec Blueprint

> **For Claude / Antigravity:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` + `test-driven-development` + `verification-before-completion` (Godkiller Gatekeeper) + `gravitas` (exhaustive file inspection & evidence gathering) to implement this plan task-by-task.

**Goal:** Build **SwasthyaBillCheck (NMBTP: National Medical Bill Transparency Platform)** end-to-end as a real, working, tested product with verified Indian government rates, OCR + OpenCV preprocessing, 6-stage canonical matching, tamper-evident hash-chained ledger, DPDP Act 2023 privacy controls, and an installable mobile-first PWA.

**Architecture:** Polyglot monorepo (`e:/ntmp`) with `/data` (ETL, SHA-256 verified government datasets, SQLite/PostgreSQL dual-compatible database, 42-bill Golden Dataset), `/services/ai-engine` (Python FastAPI service for OpenCV image preprocessing, OCR, PII redaction, 6-stage matcher, grounded explainer chat, dispute generator), `/services/api` (Node.js Fastify TypeScript gateway, hash-chained audit ledger, Merkle batching, insurer/regulator APIs), and `/apps/web` (React 18 + TypeScript + Vite PWA with Tailwind CSS, Framer Motion, Recharts, 12-language i18n, Bill X-Ray overlay, Voice readout, and Component Storybook).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons, Node.js (Fastify), Python 3.14 (FastAPI, OpenCV, PyMuPDF, ReportLab, QRCode, SQLite3/PostgreSQL), Pytest, Playwright.

---

## Task 1: Step 0 Data Acquisition, ETL & Monthly Version Diffing
**Files:**
- Create: `data/etl/fetch_and_verify.py`
- Create: `data/etl/expand_rates.py`
- Create: `data/etl/run_etl.py`
- Create: `data/etl/monthly_refresh.py`
- Create: `db/schema.sql`
- Create: `docs/DATA_SOURCES.md`
- Test: `tests/test_core_suite.py`

## Task 2: Golden Dataset Generator (42 Realistic Synthetic Hospital Bills — PNG & PDF)
**Files:**
- Create: `data/etl/generate_golden_bills.py`
- Output: `data/golden_bills/*.png`, `data/golden_bills/*.pdf`, `data/golden_bills/ground_truth.json`
- Test: `tests/test_core_suite.py::test_golden_dataset_precision_recall_and_false_flag_rate`

## Task 3: Python AI/OCR, Grounded Explainer, Dispute Router & FastAPI Server
**Files:**
- Create: `services/ai-engine/app/pii.py`
- Create: `services/ai-engine/app/ledger.py`
- Create: `services/ai-engine/app/ocr.py`
- Create: `services/ai-engine/app/matcher.py`
- Create: `services/ai-engine/app/features.py` (Grounded "Ask about this charge" chat, Polite Hospital Dispute Letter + Verified State Grievance Routing, Pre-Treatment Cost Estimator, Insurer Claim Validation API, Regulator k-anonymity >= 10 Analytics, PDF Report + QR Code Generator)
- Create: `services/ai-engine/app/main.py`
- Test: `tests/test_core_suite.py`

## Task 4: Node.js + TypeScript + Fastify Backend API (`services/api`)
**Files:**
- Create: `services/api/package.json`
- Create: `services/api/tsconfig.json`
- Create: `services/api/src/server.ts`
- Test: `tests/test_api_and_load.py` (Integration + 100-concurrent load test)

## Task 5: React + TypeScript + Vite Mobile-First PWA (`apps/web`)
**Files:**
- Create: `apps/web/design-tokens.json`
- Create: `apps/web/package.json`
- Create: `apps/web/src/i18n/translations.ts` (12 Indian languages)
- Create: `apps/web/src/App.tsx` (Consent/Onboarding, Home, Camera Capture with live edge-detect, OCR Review with confidence rings, Bill Report matching Slide 3 mock, Bill X-Ray overlay, Evidence Drawer, Grounded Chat, Dispute Letter + Grievance Router, History, Public `/verify/:hash` page, Regulator Analytics, Pre-treatment Estimator, Insurer API Sandbox, Settings/DPDP Delete My Data, and `/storybook`)
- Test: `tests/e2e_playwright.py`

