# SwasthyaBillCheck (NMBTP) — Comprehensive Verification & Quality Gate Report

**Team TechNova (SBI Youth Ideathon 2026)**  
**Tagline:** *"Ideas today, impact tomorrow."*  
**Executed On:** Windows 11 (`Python 3.14.0`, `Node.js v24.12.0`, `pytest 9.1.1`, `Playwright 1.59.0`)

---

## 1. Executive Summary of Quality Gates

| Quality Gate | Requirement | Measured Result | Status |
| :--- | :--- | :--- | :---: |
| **1. Data Provenance & Honesty** | 100% of rates carry `source_id`, `source_url`, `document_version`, `effective_from`, `retrieval_date`, `scheme`, `city_tier`, `licence_note`. Zero orphan rates. | **61/61 rates traceable** (`0` orphans, `0` duplicates, `0` nulls in `data/quality_report.json`) | **PASS** |
| **2. Legal Wording & Comparator Rules** | Never use `"illegal"` or `"fraud"`; never compare itemized room rent or consultation to a PM-JAY package. | Verified by `test_non_negotiable_honesty_and_comparator_rules` | **PASS** |
| **3. Golden Dataset Benchmark (>= 40 bills)** | >= 40 synthetic realistic bills across 7 categories (`clean_photo`, `skewed`, `blurry`, `hindi`, `handwritten`, `multipage`, `package_bill`), false-flag rate `< 5%`. | **42 bills (130 lines)**: OCR Acc = **96.92%**, Match Acc = **96.92%**, Precision = **97.67%**, Recall = **97.67%**, False-Flag Rate = **1.15%** (`< 5%`) | **PASS** |
| **4. Hash-Chained Ledger & Tamper Detection** | Append-only SHA-256 hash chain + Merkle-root batching + tamper detection when any payload byte is altered. | Verified by `test_tamper_evident_hash_chain_and_merkle_root` & `/api/verify/{hash}` | **PASS** |
| **5. DPDP Act 2023 PII Redaction & Erasure** | Redact Patient Name, Phone, Aadhaar, UHID before storage + one-click `"Delete My Data"`. | Verified by `test_pii_redaction_dpdp_compliance` & Playwright E2E | **PASS** |
| **6. Load & Concurrency Benchmark** | 100 concurrent bill verifications with `p95 < 800 ms`. | **100/100 succeeded (100%)**, `p50 = 223.32 ms`, **`p95 = 359.25 ms`**, `p99 = 369.89 ms` | **PASS** |
| **7. OWASP Security & Upload Hardening** | Reject executable uploads (`.exe`/magic bytes), enforce size limits, security headers, rate limits, parameterized SQL, `k >= 10` k-anonymity. | Verified by `test_owasp_upload_validation_rejects_invalid_extensions` & `test_stretch_features_chat_dispute_estimator_insurer_kanonymity_pdf` | **PASS** |
| **8. Cross-Viewport E2E & Accessibility** | Playwright E2E across Desktop (`1440x900`) and Mobile (`390x844` Low-End Android) including Hindi (`hi`) localization and WCAG AA contrast. | Verified by `tests/e2e_playwright.py` (`1 passed`) + screenshots in `docs/screenshots/` | **PASS** |

---

## 2. Golden Dataset Confusion Matrix & Benchmark (`data/golden_benchmark_results.json`)

We generated **42 realistic hospital bills** (`BILL_001_DECK_SLIDE3` through `BILL_042_PACKAGE_BILL`) containing **130 line items** across 7 real-world imaging and billing conditions:
1. `clean_photo` (7 bills — including the exact Slide 3 benchmark bill)
2. `skewed` (6 bills — rotated ±3.8° to ±5.5°, testing OpenCV `minAreaRect` affine deskewing)
3. `blurry` (6 bills — Gaussian blur + sensor noise, testing bilateral filtering + adaptive threshold)
4. `hindi` (6 bills — bilingual Devanagari + English descriptions)
5. `handwritten` (5 bills — jittered stroke simulation with lower confidence routing)
6. `multipage` (6 bills — multi-page PDF + PNG invoices with 6 line items per bill)
7. `package_bill` (6 bills — PM-JAY HBP 2.2 / CGHS surgical packages with unbundled component traps and duplicate line traps)

### Confusion Matrix (130 Evaluated Line Items)
- **True Positives (TP — Overcharged / Unbundled / Duplicate / Arithmetic Anomaly Correctly Flagged):** `42`
- **True Negatives (TN — Fair / Within-Reference Lines Correctly Marked OK):** `86`
- **False Positives (FP — Clean Lines Falsely Flagged):** `1`
- **False Negatives (FN — Overcharged Lines Missed):** `1`

### Key Metrics
- **OCR Field Extraction Accuracy:** `96.92%` (`126 / 130`)
- **Canonical Medical Term Match Accuracy:** `96.92%` (`126 / 130`)
- **Flag Precision:** `97.67%`
- **Flag Recall:** `97.67%`
- **False-Flag Rate (`FP / (FP + TN)`):** **`1.15%`** (Strictly meets `< 5.0%` quality gate)

---

## 3. Load & Latency Benchmark (`data/load_test_results.json`)

Executed via `tests/test_api_and_load.py::test_load_100_concurrent_verifications_p95_latency` firing **100 concurrent `POST /api/verify` requests** (each performing PII redaction, 6-stage matching, comparator selection, rule evaluation, SHA-256 hash-chaining, Merkle root calculation, SQLite WAL persistence, and bilingual dispute pack generation):

```json
{
  "concurrent_requests": 100,
  "success_rate_pct": 100.0,
  "total_wall_time_ms": 406.63,
  "mean_latency_ms": 218.39,
  "p50_latency_ms": 223.32,
  "p95_latency_ms": 359.25,
  "p99_latency_ms": 369.89,
  "p95_target_ms": 800.0,
  "target_met": true
}
```

---

## 4. Automated Test Suite Execution Log

```text
pytest tests/test_core_suite.py tests/test_api_and_load.py tests/e2e_playwright.py -v
```
- `tests/test_core_suite.py::test_data_quality_and_no_fabricated_rates` — **PASSED**
- `tests/test_core_suite.py::test_slide3_deck_benchmark_exact_verification` — **PASSED**
- `tests/test_core_suite.py::test_non_negotiable_honesty_and_comparator_rules` — **PASSED**
- `tests/test_core_suite.py::test_rules_engine_unbundling_duplicates_days_and_arithmetic` — **PASSED**
- `tests/test_core_suite.py::test_tamper_evident_hash_chain_and_merkle_root` — **PASSED**
- `tests/test_core_suite.py::test_pii_redaction_dpdp_compliance` — **PASSED**
- `tests/test_core_suite.py::test_stretch_features_chat_dispute_estimator_insurer_kanonymity_pdf` — **PASSED**
- `tests/test_core_suite.py::test_golden_dataset_precision_recall_and_false_flag_rate` — **PASSED**
- `tests/test_api_and_load.py::test_full_end_to_end_upload_ocr_match_report_verify_pdf` — **PASSED**
- `tests/test_api_and_load.py::test_owasp_upload_validation_rejects_invalid_extensions` — **PASSED**
- `tests/test_api_and_load.py::test_load_100_concurrent_verifications_p95_latency` — **PASSED**
- `tests/e2e_playwright.py::test_playwright_desktop_and_mobile_e2e` — **PASSED**

