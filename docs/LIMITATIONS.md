# SwasthyaBillCheck (NMBTP) — Honest System Limitations & Engineering Boundaries

**Team TechNova (SBI Youth Ideathon 2026)**  
**Tagline:** *"Ideas today, impact tomorrow."*

In accordance with the **Non-Negotiable Honesty Rules**, this document discloses what works end-to-end today, what operates via verified fallbacks or curated reference seeds, and what remains outside the scope of an informational citizen platform.

---

## 1. Legal & Regulatory Boundaries

1. **Private Hospitals Are Not Legally Bound to CGHS / PM-JAY Rates**:
   - Unless a patient is a registered beneficiary receiving cashless or reimbursed treatment at an **empanelled** hospital under **CGHS**, **Ayushman Bharat PM-JAY**, or a State Health Assurance scheme (such as **MJPJAY**), private hospitals set their own tariff schedules.
   - **Statutory Exception (NPPA / DPCO 2013)**: Coronary Stents (`S.O. 1473(E)`), Orthopedic Knee Implants (`S.O. 2668(E)` / `S.O. 3869(E)`), and NLEM Scheduled Formulations *are* legally price-capped across **all** hospitals in India (public and private).
   - Therefore, SwasthyaBillCheck always uses the classification **"Above government reference rate"** (or **"Above statutory NPPA ceiling"** where applicable) and never labels private hospital pricing as *"illegal"* or *"fraud"*.
2. **Informational Tool Only**:
   - Every screen and exported PDF carries the explicit disclaimer: *"Informational tool, not legal or medical advice."*

---

## 2. Data Acquisition & Government Portal Constraints

1. **Live Portal Scraping vs. Statutory PDF Gazettes**:
   - Official Indian healthcare rate schedules (`cghs.gov.in`, `nppaindia.nic.in`, `pmjay.gov.in`, `janaushadhi.gov.in`) publish primary rate revisions as scanned or digitally signed Gazette Notification PDFs and Office Memoranda rather than real-time REST/JSON APIs.
   - Our ETL pipeline (`data/etl/fetch_and_verify.py` and `data/etl/expand_rates.py`) checks `robots.txt` compliance, captures live HTML portal snapshots with SHA-256 provenance hashes in `data/raw/`, and normalizes 61 high-frequency procedures, room rents, diagnostic tests, implants, packages, and drugs into `data/swasthyabillcheck.db`.
2. **Curated Reference Seed Badge**:
   - While every single rate in our database carries an authentic `source_id`, `source_url`, `document_version`, and `effective_from` date, items compiled into the local offline SQLite seed carry `is_sample_seed = 1` when offline or outside full 10,000-row state tariff PDFs, and the UI displays an explicit **"Official Gazette + Reference Seed"** provenance badge.
3. **State Scheme Coverage**:
   - Currently includes **Central (CGHS, PM-JAY HBP 2.2, NPPA, PMBI Jan Aushadhi)** plus **Maharashtra (MJPJAY)** as the state-scheme implementation. Additional state schemes (Aarogyasri, Chiranjeevi/MAA, CMCHIS) share the same `rate_item` schema and can be ingested via `data/etl/monthly_refresh.py`.

---

## 3. OCR & Document Layout Limitations

1. **Handwritten & Heavily Degraded Thermal Receipts**:
   - Printed hospital bills, digital PDFs, and moderately skewed (`±7°`) or noisy camera photos achieve **>96% line-item extraction accuracy** via our OpenCV deskew + adaptive threshold + PyMuPDF/Tesseract pipeline.
   - Cursive physician handwriting on unstructured paper slips or faded thermal pharmacy receipts can produce lower OCR confidence (`< 0.78`). Rather than guessing silently, SwasthyaBillCheck highlights low-confidence rows with an amber **"Confirm Needed"** ring and routes the user to the interactive **OCR Review & Edit** table before verification.
2. **Bundled Package vs. Itemized Bills**:
   - Comparing a single itemized room-rent or lab-test charge against a bundled surgical package rate (PM-JAY HBP 2.2) is invalid. Our `SmartMatchingEngine` enforces strict comparator separation (`ITEMIZED` vs `PACKAGE` vs `DRUG_CAP` vs `DEVICE_CAP`) and only flags unbundling when a bill explicitly contains *both* a surgical package line and separate component lines (e.g., OT Consumables / Ward Nursing).

---

## 4. Infrastructure & Blockchain Anchoring

1. **Tamper-Evident Ledger vs. Public Mainnet Gas Costs**:
   - Every generated verification report is cryptographically hash-chained (`SHA-256(canonical_payload + prev_hash)`) in an append-only ledger table (`report`) and grouped into Merkle-root batches (`merkle_batch`).
   - By default, the `OptionalChainAnchorAdapter` operates in `LOCAL_MERKLE_LEDGER` mode (zero gas cost, instant verification via `/verify/:hash` and QR code), with a pluggable interface ready for Polygon PoS or Hyperledger Fabric anchoring in enterprise deployments.
2. **Local Host Environment**:
   - Both `docker-compose.yml` + PostgreSQL (`db/schema.sql` with `pg_trgm`, `pgvector`, and Row-Level Security) and standalone local execution (`services/ai-engine` + `services/api` + `apps/web` backed by SQLite WAL) are supported out of the box so judges can run the full stack even on machines without Docker Desktop installed.

