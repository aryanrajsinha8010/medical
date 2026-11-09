# Step 0: Research & Data Acquisition Report (`DATA_SOURCES.md`)

**Project**: SwasthyaBillCheck (NMBTP: National Medical Bill Transparency Platform)  
**Team**: TechNova — SBI Youth Ideathon 2026  
**Last Verified**: 2026-11-09 (UTC)  
**Data Quality & Traceability Status**: `100% Traceable` (`0` orphan source references, `0` null required fields, `0` duplicate rate IDs — see `/data/quality_report.json` and `/data/raw/manifest.json`).

---

## 1. Non-Negotiable Honesty & Provenance Policy
1. **Zero Fabricated Rates**: Every row in `rate_item` and `drug_price` links via foreign key (`source_id`) to `rate_source`, recording the exact official Gazette Notification / Office Memorandum number, effective date, retrieval timestamp, city tier, NABH status, ward type, and page/code reference.
2. **Sample / Curated Seed Disclosure**: Where a government scheme's full national master requires hospital-portal authentication or dynamic form exports (such as the full 1,900+ package PM-JAY HBP 2.2 master or PMBI's 2,400+ item Jan Aushadhi catalog), `is_sample_seed = true` is explicitly set on the source and surfaced in the UI with a **"Sample / Reference Seed Data"** badge.
3. **Legal Scope**: Private hospitals are **not** legally bound to CGHS or PM-JAY rates unless treating a scheme beneficiary under cashless empanelment. However, **NPPA ceiling prices** under the Drugs (Prices Control) Order (DPCO), 2013 for coronary stents, orthopaedic knee implants, and Schedule-I NLEM formulations are **statutorily binding across all hospitals in India**. All UI flags use *"Above government reference rate"* and carry the disclaimer: *"Informational tool, not legal or medical advice."*

---

## 2. Verified Official Government Rate Sources

| Source ID | Scheme | Official Portal / URL | Document Version / Notification Cited | Effective Date | Live Portal Probe & `robots.txt` Status | Seed Badge |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SRC_CGHS_2023_OM` | **CGHS** | https://cghs.mohfw.gov.in | MoHFW Directorate General of CGHS Office Memorandum `F.No. 5-16/CGHS(HQ)/HEC/2023` (`Z.15025/28/2022/DIR/CGHS`) dated 12 April 2023 + Delhi/Tier-X/Y/Z Diagnostic & Procedure Schedule | `2023-04-12` | HTTP 200 Live Snapshot Saved (`data/raw/SRC_CGHS_2023_OM_portal_snapshot.html`, SHA-256: `6514031b44b86fc9b0ca9ce2392384c6e938fa5413908f4b14aa13cdb997ec8f`) | Official Notification |
| `SRC_NPPA_DPCO_2025` | **NPPA** | https://www.nppaindia.nic.in | Dept. of Pharmaceuticals Gazette Notification `S.O. 1473(E)` dated 27 March 2025 (Coronary Stents w.e.f. 01-04-2025), `S.O. 1489(E)` (Scheduled NLEM Drugs WPI Revision), and `S.O. 2668(E)` / `S.O. 3869(E)` (Orthopaedic Knee Implants extended to 15-11-2026) | `2025-04-01` | Verified Gazette Notification Rates (`data/raw/rate_items.json`) | Official Gazette Cap |
| `SRC_PMJAY_HBP_22` | **PM-JAY** | https://pmjay.gov.in | National Health Authority (NHA) Health Benefit Package Master **HBP 2.2** (Bundled Surgical & Medical Packages) | `2022-04-01` | Curated Benchmark Subset (`is_sample_seed = true`) | Sample / Reference Seed Badge |
| `SRC_PMBI_JANAUSHADHI_2025` | **PMBI** | https://www.janaushadhi.gov.in/product-mrp-list | Pharmaceuticals & Medical Devices Bureau of India (PMBI) Jan Aushadhi Generic Product & MRP Basket 2024–25 | `2024-04-01` | HTTP 200 Live Snapshot Saved (`data/raw/SRC_PMBI_JANAUSHADHI_2025_portal_snapshot.html`, SHA-256: `86d25c2933618c33b15743d7cdc230b3b95467f8eabda61e26c76871db57660c`) | Sample / Reference Seed Badge |
| `SRC_STATE_MJPJAY_2024` | **MJPJAY** | https://www.jeevandayee.gov.in | Mahatma Jyotirao Phule Jan Arogya Yojana (Maharashtra) Integrated Tariff Schedule | `2024-01-01` | Curated State Benchmark Subset (`is_sample_seed = true`) | Sample / Reference Seed Badge |

---

## 3. Key Rate Structure & Adjustment Rules Implemented in the Engine

### A. CGHS Itemized & Tier/Accreditation/Ward Rules (`SRC_CGHS_2023_OM`)
- **Consultation Fee (OPD / IPD)**: `₹350` per visit (uniform across NABH and Non-NABH, and across Tier X, Y, Z cities per OM dated 12-04-2023).
- **Room Rent (Per Day)**:
  - **General Ward**: `₹1,500 / day`
  - **Semi-Private Ward**: `₹3,000 / day`
  - **Private Ward**: `₹4,500 / day`
- **ICU Charges (Inclusive of Room Rent, Monitoring, Nursing & RMO)**: `₹5,400 / day` for NABH (`₹4,590 / day` for Non-NABH after 15% reduction).
- **City Tier Scaling (for Package Procedures)**:
  - **Tier X (Metro: Delhi/NCR, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad)**: `100%` of base schedule rate.
  - **Tier Y (Tier-II cities: Bhopal, Jaipur, Lucknow, Patna, Nagpur, Indore, Chandigarh, etc.)**: `90%` (`10% lower` than Tier X).
  - **Tier Z (Tier-III cities & smaller towns)**: `80%` (`20% lower` than Tier X).
- **NABH / NABL vs Non-NABH / Non-NABL**: Non-NABH rates are `15% lower` than NABH benchmark rates for procedures and diagnostics.

### B. NPPA Statutory Ceiling Prices (`SRC_NPPA_DPCO_2025`)
- **Drug-Eluting Coronary Stents (DES / BVS)**: `₹38,933.14` per unit (excl. 5% GST) per `S.O. 1473(E)` w.e.f. 1 April 2025 (2024 rate: `₹38,267.18` per `S.O. 1551(E)`).
- **Bare Metal Coronary Stents (BMS)**: `₹10,692.69` per unit (excl. 5% GST) per `S.O. 1473(E)` w.e.f. 1 April 2025.
- **Primary Total Knee Replacement Implant System**: `₹59,000.00` complete standard Cobalt-Chromium/Titanium set ceiling reference (`S.O. 2668(E)` / `S.O. 3869(E)`).
- **Scheduled NLEM Formulations**: Meropenem 1g (`₹975.62`), Paracetamol IV 1g/100ml (`₹135.00`), Pantoprazole IV 40mg (`₹56.00`), Ceftriaxone 1g (`₹68.50`), Enoxaparin 40mg (`₹425.00`), Azithromycin 500mg (`₹23.98/tab`), Atorvastatin 20mg (`₹14.75/tab`), Metformin 500mg (`₹2.06/tab`), Amlodipine 5mg (`₹2.56/tab`).

### C. PM-JAY HBP 2.2 Bundled Packages (`SRC_PMJAY_HBP_22`)
- **Strict Rule**: Bundled packages (`MC011A` PTCA `₹65,000`, `SG039A` Lap Cholecystectomy `₹22,800`, `SO015A` Caesarean LSCS `₹14,500`, `SE009A` Phaco Cataract `₹9,500`, `SB032A` Unilateral TKR `₹80,000`, `CV001A` CABG `₹1,40,000`, `SG012A` Appendicectomy `₹18,500`) are **only** compared against surgical/procedure package lines—never against single room-rent or consultation lines.

---

## 4. Terminology Standards & Licensing
- **ICD-10**: WHO International Classification of Diseases 10th Revision codes mapped on `canonical_term.icd10_code` for conditions and procedures.
- **LOINC**: Regenstrief Institute Logical Observation Identifiers Names and Codes mapped on `canonical_term.loinc_code` for laboratory and radiology investigations (`58410-2` CBC, `24331-1` Lipid panel, `24362-6` Renal panel, `24325-3` Hepatic panel, `30746-2` Chest X-ray, `42148-7` 2D Echo, `24627-2` HRCT Thorax, `94500-6` SARS-CoV-2/Viral RT-PCR).
- **WHO ATC**: Anatomical Therapeutic Chemical codes mapped on `canonical_term.atc_code` and `drug_price.atc_code` (`N02BE01` Paracetamol, `A02BC02` Pantoprazole, `J01DD04` Ceftriaxone, `B01AB05` Enoxaparin, `J01DH02` Meropenem, `J01FA10` Azithromycin, `C10AA05` Atorvastatin, `A10BA02` Metformin, `C08CA01` Amlodipine).
- **SNOMED CT**: India is an IHTSDO/SNOMED International Member country (via NRCeS, MoHFW). Only public human-readable clinical descriptive labels are stored in `snomed_note` in compliance with public reference terms.

---

## 5. Verified Citizen Dispute & Grievance Escalation Contacts
All contacts in `grievance_route` are verified public government helplines:
1. **National Consumer Helpline (NCH)**: Toll-free **`1915`** | WhatsApp/SMS: `+91-8800001915` | Portal: https://consumerhelpline.gov.in (Dept. of Consumer Affairs, Govt. of India).
2. **IRDAI Bima Bharosa & Insurance Ombudsman (CIO)**: Toll-free **`155255`** / `1800-4254-732` | Portals: https://bimabharosa.irdai.gov.in & https://www.cioins.co.in.
3. **NPPA Pharma Jan Samadhan (Stent, Knee Implant & Scheduled Drug Overcharging)**: Toll-free **`1800-111-255`** | Portal: https://www.nppaindia.nic.in.
4. **Ayushman Bharat PM-JAY National Grievance Portal (CGRMS)**: Toll-free **`14555`** | Portal: https://cgrms.pmjay.gov.in.
5. **National / State Council for Clinical Establishments**: Phone: `011-23061469` | Portal: https://clinicalestablishments.gov.in.
