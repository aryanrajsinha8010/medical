# SwasthyaBillCheck (NMBTP) — 3-Minute Live Demo Script

**Team TechNova — SBI Youth Ideathon 2026**  
**Team Members:** Mansi Kumari (Leader), Sumit Kumar, Sameer Ranjan — VIT Bhopal University  
**Tagline:** *"Ideas today, impact tomorrow."*

---

## 0:00 – 0:30 | Hook & The Problem (Slide 2)
- **Speaker (Mansi Kumari):**
  > "Namaste Judges. Over 60% of Indian households pay hospital expenses out-of-pocket, and 5.5 crore Indians are pushed toward financial distress by medical bills every year. Why? Because when a family receives a ₹50,000 hospital bill with terms like *'PTCA with DES'*, *'HRCT Thorax'*, or *'Semi-Private Ward Charges'*, there is no single place where a citizen can check official CGHS, PM-JAY, NPPA, and Jan Aushadhi reference rates in their own language."
- **Visual Action:** Show the **SwasthyaBillCheck** home screen in deep indigo (`#2B1166`) and saffron-orange (`#F58220`), pointing out the non-negotiable legal banner at the top: *"Informational tool, not legal or medical advice. Private hospitals are not legally bound to CGHS/PM-JAY rates."*

---

## 0:30 – 1:15 | Live Bill Scan, OCR Preprocessing & Confidence Review (Slide 3)
- **Speaker (Sumit Kumar):**
  > "Let's test this live. A citizen can snap a photo using our live edge-detect camera, upload a multi-page PDF, or click any of our 42 golden benchmark bills—including noisy, skewed, or Hindi bills."
- **Visual Action:**
  1. Click **"Deck Slide 3 Benchmark Bill"** (or upload `data/golden_bills/BILL_001_DECK_SLIDE3.png`).
  2. Watch the saffron **scan-line animation** while OpenCV deskews and denoises the image and extracts line items.
  3. Open **"Review / Edit OCR Lines"** to show the per-row **Confidence Rings** (`98%`, `96%`) and show that low-confidence handwritten lines trigger an explicit *"Confirm Needed"* badge instead of silently guessing.

---

## 1:15 – 2:00 | The Smart Core: Bill Report, Bill X-Ray & Grounded Explainer (Slides 3 & 4)
- **Speaker (Sameer Ranjan):**
  > "Here is the exact Bill Report from Slide 3 of our deck—now running live against our 6-stage matching engine."
- **Visual Action:**
  1. Point to the **Bill Report Card**:
     - **Consultation:** `₹1,500 | Rate ₹1,500` (Green tick — Within reference rate)
     - **Room charges:** `₹9,000 | Rate ₹6,000` (Red warning — Above government reference rate by `+₹3,000` / `+50%`)
     - **Lab tests:** `₹3,000 | Rate ₹3,000` (Green tick — Within reference rate)
     - Red alert banner: **"1 item above approved rate"** and the animated **Savings Meter** counting up to **`₹3,000`**.
  2. Click **"Bill X-Ray: ON"** to highlight the exact bounding box of the overcharged Room Rent line directly on the original hospital bill image.
  3. Click **"Evidence"** on Room Charges to open the Evidence Drawer showing `CGHS OM F.No. 5-16/CGHS(HQ)/HEC/2023`, dated `12-04-2023`, City Tier `X`, `NABH`, `Semi-Private Ward = ₹3,000/day × 2 days = ₹6,000`.
  4. Click **"Ask About This Charge"** to show the strictly grounded explainer (zero free-text hallucination) and switch the language dropdown to **हिन्दी (Hindi)** + click **Voice Read-out** (`🔊 सुनें`).

---

## 2:00 – 2:35 | Actionable Empowerment: Polite Dispute Letter, Tamper-Evident QR PDF & `/verify/:hash` (Slides 4 & 5)
- **Speaker (Mansi Kumari):**
  > "Transparency without action isn't enough. With one click, the citizen generates a polite, non-accusatory clarification letter citing exact CGHS/NPPA circulars, along with verified helplines—National Consumer Helpline `1915`, NPPA Pharma Jan Samadhan `1800-111-255`, and IRDAI Bima Bharosa `155255`."
- **Visual Action:**
  1. Click **"Polite Dispute Letter & Helplines (1915)"** to preview the bilingual letter.
  2. Click **"Download report"** to download the official PDF report complete with an embedded QR code and SHA-256 hash chain (`prev_hash -> report_hash -> merkle_root`).
  3. Click **"Verify Hash Publicly"** to jump to `/verify/:hash` and show **"CRYPTOGRAPHIC PROOF VALID — Hash Chain & Merkle Anchor Verified"**.

---

## 2:35 – 3:00 | Ecosystem Impact: Pre-Treatment Estimator, Insurer API & Regulator `k >= 10` Analytics (Slides 5, 6 & 7)
- **Speaker (Sumit Kumar & Sameer Ranjan):**
  > "Finally, looking to our roadmap: citizens can check expected costs *before* admission in our **Pre-Treatment Estimator**, insurers can validate claims via our **Insurer Sandbox API**, and policymakers get a **Regulator Analytics Dashboard** protected by `k >= 10` k-anonymity and full DPDP Act 2023 one-click data deletion. SwasthyaBillCheck: *Ideas today, impact tomorrow.*"
- **Visual Action:** Click through **Estimator & Insurer API**, **Regulator Analytics (k>=10)**, and **DPDP Privacy ("Delete My Data")**.

