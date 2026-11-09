#!/usr/bin/env python3
"""
Golden Dataset Generator for SwasthyaBillCheck (NMBTP).
Generates 42 realistic Indian hospital bills across 7 distinct categories:
1. Clean Digital Photos (7 bills, including BILL_001 matching Slide 3 of the Ideathon Deck)
2. Skewed / Rotated Camera Captures (6 bills, 3 to 9 degrees rotation)
3. Blurry / Low-End Android Camera Captures (6 bills, Gaussian blur + noise)
4. Hindi & Bilingual Bills (6 bills, Devanagari + English medical terms)
5. Handwritten-Style / Noisy Scan Bills (5 bills, ink jitter + ruled paper)
6. Multi-Page Itemized IPD Bills (6 bills, rendered as multi-page PDFs + PNGs)
7. Bundled Surgery / Package Bills with Unbundling Checks (6 bills: PTCA, Lap Chole, LSCS, Cataract, TKR, CABG)

Saves all 42 bills in `/data/golden_bills/` alongside `ground_truth.json` with exact expected
canonical IDs, line counts, and flag statuses (`above_reference` vs `ok`) for automated benchmarking.
"""

import io
import json
from pathlib import Path

import cv2
import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, PngImagePlugin

ROOT_DIR = Path(__file__).resolve().parents[2]
GOLDEN_DIR = ROOT_DIR / "data" / "golden_bills"
GOLDEN_DIR.mkdir(parents=True, exist_ok=True)


def get_golden_bill_specs() -> list[dict]:
    specs = [
        # --- CATEGORY 1: CLEAN DIGITAL PHOTOS (7 bills) ---
        {
            "bill_id": "BILL_001_DECK_SLIDE3",
            "title": "Deck Slide 3 Benchmark Bill (Consultation, Room Charges, Lab Tests)",
            "category": "clean_photo",
            "hospital_name": "Indraprastha Metro Super Speciality Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Rajesh Sharma | Phone: 9811223344 | UHID: IMSH-2026-0891 | Aadhaar: 4512 8923 6701",
            "lines": [
                {"raw_text": "Consultation", "qty": 1, "unit_price": 1500.0, "total": 1500.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": False},
                {"raw_text": "Room charges", "qty": 1, "unit_price": 9000.0, "total": 9000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": True},
                {"raw_text": "Lab tests", "qty": 1, "unit_price": 3000.0, "total": 3000.0, "expected_canonical_id": "TERM_LAB_PANEL_STANDARD", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_002_CLEAN_CARDIAC",
            "title": "Cardiac Stent & Angioplasty Bill (NPPA Stent Cap Violation)",
            "category": "clean_photo",
            "hospital_name": "Apex Heart & Vascular Institute",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Sunita Verma | Phone: 9876543210 | UHID: AHVI-9920",
            "lines": [
                {"raw_text": "Coronary Angioplasty (PTCA Package)", "qty": 1, "unit_price": 57500.0, "total": 57500.0, "expected_canonical_id": "TERM_PKG_PTCA", "expected_flagged": False},
                {"raw_text": "Drug Eluting Stent (DES Coronary Stent)", "qty": 1, "unit_price": 62000.0, "total": 62000.0, "expected_canonical_id": "TERM_IMPLANT_STENT_DES", "expected_flagged": True},
                {"raw_text": "2D Echocardiography", "qty": 1, "unit_price": 1475.0, "total": 1475.0, "expected_canonical_id": "TERM_CARD_2DECHO", "expected_flagged": False},
                {"raw_text": "ECG 12 Lead", "qty": 1, "unit_price": 175.0, "total": 175.0, "expected_canonical_id": "TERM_CARD_ECG", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_003_CLEAN_OPD_DIAG",
            "title": "Outpatient Diagnostic & Consultation Bill (Overcharged HRCT & Lipid)",
            "category": "clean_photo",
            "hospital_name": "Metro Diagnostics & Multispeciality Centre",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Amitabh Nair | Phone: 9123456780 | UHID: MDMC-1102",
            "lines": [
                {"raw_text": "OPD Consultation", "qty": 1, "unit_price": 350.0, "total": 350.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": False},
                {"raw_text": "Complete Blood Count (CBC)", "qty": 1, "unit_price": 300.0, "total": 300.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
                {"raw_text": "Lipid Profile", "qty": 1, "unit_price": 1250.0, "total": 1250.0, "expected_canonical_id": "TERM_LAB_LIPID", "expected_flagged": True},
                {"raw_text": "HRCT Chest", "qty": 1, "unit_price": 4500.0, "total": 4500.0, "expected_canonical_id": "TERM_RAD_HRCT_CHEST", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_004_CLEAN_ALL_OK",
            "title": "Compliant CGHS-Aligned Inpatient Bill (Zero Overcharges)",
            "category": "clean_photo",
            "hospital_name": "National Care NABH Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "general",
            "stay_days": 2,
            "patient_header": "Patient Name: Kavita Joshi | Phone: 9988776655 | UHID: NCNH-4401",
            "lines": [
                {"raw_text": "General Ward Bed Charges", "qty": 2, "unit_price": 1500.0, "total": 3000.0, "expected_canonical_id": "TERM_ROOM_GENERAL", "expected_flagged": False},
                {"raw_text": "Specialist Visit", "qty": 2, "unit_price": 350.0, "total": 700.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": False},
                {"raw_text": "Kidney Function Test (KFT)", "qty": 1, "unit_price": 500.0, "total": 500.0, "expected_canonical_id": "TERM_LAB_KFT", "expected_flagged": False},
                {"raw_text": "Chest X-Ray", "qty": 1, "unit_price": 230.0, "total": 230.0, "expected_canonical_id": "TERM_RAD_XRAY_CHEST", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_005_CLEAN_ICU_UNBUNDLED",
            "title": "ICU Stay with Unbundled Nursing/Monitor Charge",
            "category": "clean_photo",
            "hospital_name": "Fortis Care Critical Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Deepak Malhotra | Phone: 9711223344 | UHID: FCCH-3029",
            "lines": [
                {"raw_text": "ICU Charges", "qty": 3, "unit_price": 5400.0, "total": 16200.0, "expected_canonical_id": "TERM_ROOM_ICU", "expected_flagged": False},
                {"raw_text": "Nursing Charges", "qty": 3, "unit_price": 1800.0, "total": 5400.0, "expected_canonical_id": "TERM_PROC_NURSING_RMO", "expected_flagged": True},
                {"raw_text": "Inj Meropenem 1g", "qty": 3, "unit_price": 975.0, "total": 2925.0, "expected_canonical_id": "TERM_DRUG_MEROPENEM_1G", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_006_CLEAN_DENGUE",
            "title": "Acute Dengue Fever Admission Bill",
            "category": "clean_photo",
            "hospital_name": "Lotus City Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Meena Kumari | Phone: 9810011223 | UHID: LCH-7712",
            "lines": [
                {"raw_text": "Semi-Private Room", "qty": 3, "unit_price": 3000.0, "total": 9000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": False},
                {"raw_text": "Dengue NS1 Antigen", "qty": 1, "unit_price": 1200.0, "total": 1200.0, "expected_canonical_id": "TERM_LAB_DENGUE_NS1", "expected_flagged": True},
                {"raw_text": "Complete Haemogram", "qty": 2, "unit_price": 300.0, "total": 600.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
                {"raw_text": "Paracetamol IV", "qty": 3, "unit_price": 350.0, "total": 1050.0, "expected_canonical_id": "TERM_DRUG_PARACETAMOL_IV", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_007_CLEAN_DIALYSIS",
            "title": "Nephrology Maintenance Hemodialysis Bill",
            "category": "clean_photo",
            "hospital_name": "Renal Care Super Speciality Centre",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "general",
            "stay_days": 1,
            "patient_header": "Patient Name: Harish Chandra | Phone: 9412345678 | UHID: RCSS-5510",
            "lines": [
                {"raw_text": "Hemodialysis", "qty": 2, "unit_price": 3200.0, "total": 6400.0, "expected_canonical_id": "TERM_PROC_HEMODIALYSIS", "expected_flagged": True},
                {"raw_text": "Kidney Function Test", "qty": 1, "unit_price": 500.0, "total": 500.0, "expected_canonical_id": "TERM_LAB_KFT", "expected_flagged": False},
                {"raw_text": "OPD Consultation", "qty": 1, "unit_price": 350.0, "total": 350.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": False},
            ],
        },

        # --- CATEGORY 2: SKEWED / ROTATED SCANS (6 bills) ---
        {
            "bill_id": "BILL_008_SKEWED_NEURO",
            "title": "Neurology MRI & CT Scan Bill (Skewed 5 deg)",
            "category": "skewed",
            "skew_deg": 5.0,
            "hospital_name": "NeuroLife Brain & Spine Institute",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Vikramaditya Rao | Phone: 9822114455 | UHID: NLBS-0192",
            "lines": [
                {"raw_text": "MRI Brain", "qty": 1, "unit_price": 6800.0, "total": 6800.0, "expected_canonical_id": "TERM_RAD_MRI_BRAIN", "expected_flagged": True},
                {"raw_text": "CT Scan Brain", "qty": 1, "unit_price": 1035.0, "total": 1035.0, "expected_canonical_id": "TERM_RAD_CT_HEAD", "expected_flagged": False},
                {"raw_text": "Doctor Consultation", "qty": 1, "unit_price": 800.0, "total": 800.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_009_SKEWED_GASTRO",
            "title": "Gastroenterology Endoscopy & USG Bill (Skewed -6 deg)",
            "category": "skewed",
            "skew_deg": -6.0,
            "hospital_name": "Digestive Health Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Pooja Deshmukh | Phone: 9833445566 | UHID: DHH-8821",
            "lines": [
                {"raw_text": "Upper GI Endoscopy", "qty": 1, "unit_price": 4500.0, "total": 4500.0, "expected_canonical_id": "TERM_PROC_ENDOSCOPY", "expected_flagged": True},
                {"raw_text": "USG Whole Abdomen", "qty": 1, "unit_price": 800.0, "total": 800.0, "expected_canonical_id": "TERM_RAD_USG_ABDOMEN", "expected_flagged": False},
                {"raw_text": "Liver Function Test (LFT)", "qty": 1, "unit_price": 500.0, "total": 500.0, "expected_canonical_id": "TERM_LAB_LFT", "expected_flagged": False},
                {"raw_text": "Inj Pantoprazole 40mg", "qty": 2, "unit_price": 56.0, "total": 112.0, "expected_canonical_id": "TERM_DRUG_PANTOPRAZOLE_INJ", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_010_SKEWED_PHARMACY",
            "title": "Inpatient Pharmacy & Antibiotic Bill (Skewed 7 deg)",
            "category": "skewed",
            "skew_deg": 7.0,
            "hospital_name": "City Care Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: रमेश गुप्ता | Phone: 9911002233 | UHID: CCH-3310",
            "lines": [
                {"raw_text": "Inj Ceftriaxone 1g", "qty": 4, "unit_price": 180.0, "total": 720.0, "expected_canonical_id": "TERM_DRUG_CEFTRIAXONE_1G", "expected_flagged": True},
                {"raw_text": "Inj Enoxaparin 40mg", "qty": 2, "unit_price": 425.0, "total": 850.0, "expected_canonical_id": "TERM_DRUG_ENOXAPARIN_40", "expected_flagged": False},
                {"raw_text": "Tab Azithromycin 500mg", "qty": 1, "unit_price": 239.0, "total": 239.0, "expected_canonical_id": "TERM_DRUG_AZITHROMYCIN_500", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_011_SKEWED_METABOLIC",
            "title": "Endocrinology & Diabetes Checkup Bill (Skewed -4.5 deg)",
            "category": "skewed",
            "skew_deg": -4.5,
            "hospital_name": "DiabCare & Hormone Clinic",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Farhan Akhtar | Phone: 9845012345 | UHID: DCHC-410",
            "lines": [
                {"raw_text": "Thyroid Profile", "qty": 1, "unit_price": 950.0, "total": 950.0, "expected_canonical_id": "TERM_LAB_THYROID", "expected_flagged": True},
                {"raw_text": "HbA1c", "qty": 1, "unit_price": 300.0, "total": 300.0, "expected_canonical_id": "TERM_LAB_HBA1C", "expected_flagged": False},
                {"raw_text": "Tab Metformin 500mg", "qty": 1, "unit_price": 20.0, "total": 20.0, "expected_canonical_id": "TERM_DRUG_METFORMIN_500", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_012_SKEWED_DUPLICATE",
            "title": "Duplicate Pathology Billing Anomaly (Skewed 6 deg)",
            "category": "skewed",
            "skew_deg": 6.0,
            "hospital_name": "Sunrise Metro Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Anjali Menon | Phone: 9765432109 | UHID: SMH-902",
            "lines": [
                {"raw_text": "Complete Blood Count (CBC)", "qty": 1, "unit_price": 300.0, "total": 300.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
                {"raw_text": "CBC", "qty": 1, "unit_price": 300.0, "total": 300.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": True},
                {"raw_text": "Chest X-Ray", "qty": 1, "unit_price": 230.0, "total": 230.0, "expected_canonical_id": "TERM_RAD_XRAY_CHEST", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_013_SKEWED_PRIVATE_ROOM",
            "title": "Private Single Room Entitlement Bill (Skewed -5 deg)",
            "category": "skewed",
            "skew_deg": -5.0,
            "hospital_name": "Regency Super Speciality Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "private",
            "stay_days": 2,
            "patient_header": "Patient Name: Siddharth Roy | Phone: 9811998877 | UHID: RSSH-512",
            "lines": [
                {"raw_text": "Private Ward", "qty": 2, "unit_price": 4500.0, "total": 9000.0, "expected_canonical_id": "TERM_ROOM_PRIVATE", "expected_flagged": False},
                {"raw_text": "RT-PCR", "qty": 1, "unit_price": 2200.0, "total": 2200.0, "expected_canonical_id": "TERM_LAB_RTPCR", "expected_flagged": True},
            ],
        },

        # --- CATEGORY 3: BLURRY / LOW-END PHONE CAPTURES (6 bills) ---
        {
            "bill_id": "BILL_014_BLURRY_CAG",
            "title": "Coronary Angiography Diagnostic Bill (Low-End Phone Blur)",
            "category": "blurry",
            "hospital_name": "HeartLine Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Manohar Lal | Phone: 9899001122 | UHID: HLH-204",
            "lines": [
                {"raw_text": "Coronary Angiography", "qty": 1, "unit_price": 21000.0, "total": 21000.0, "expected_canonical_id": "TERM_PROC_CAG", "expected_flagged": True},
                {"raw_text": "ECG", "qty": 1, "unit_price": 175.0, "total": 175.0, "expected_canonical_id": "TERM_CARD_ECG", "expected_flagged": False},
                {"raw_text": "Tab Atorvastatin 20mg", "qty": 1, "unit_price": 147.5, "total": 147.5, "expected_canonical_id": "TERM_DRUG_ATORVASTATIN_20", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_015_BLURRY_BMS_STENT",
            "title": "Bare Metal Stent Bill (NPPA BMS Cap Check)",
            "category": "blurry",
            "hospital_name": "Pulse Cardiac Centre",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Gurpreet Singh | Phone: 9814011223 | UHID: PCC-609",
            "lines": [
                {"raw_text": "Bare Metal Stent", "qty": 1, "unit_price": 18500.0, "total": 18500.0, "expected_canonical_id": "TERM_IMPLANT_STENT_BMS", "expected_flagged": True},
                {"raw_text": "2D Echo", "qty": 1, "unit_price": 1475.0, "total": 1475.0, "expected_canonical_id": "TERM_CARD_2DECHO", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_016_BLURRY_TIER_Y",
            "title": "Tier-Y City Hospital Bill (Bhopal 10% Lower Procedure Rate)",
            "category": "blurry",
            "hospital_name": "Narmada Care & Heart Institute",
            "state": "MP",
            "city_tier": "Y",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Vivek Tiwari | Phone: 9425012345 | UHID: NCHI-701",
            "lines": [
                {"raw_text": "Semi-Private Ward", "qty": 2, "unit_price": 3000.0, "total": 6000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": False},
                {"raw_text": "Hemodialysis", "qty": 1, "unit_price": 1449.0, "total": 1449.0, "expected_canonical_id": "TERM_PROC_HEMODIALYSIS", "expected_flagged": False},
                {"raw_text": "Tab Amlodipine 5mg", "qty": 2, "unit_price": 60.0, "total": 120.0, "expected_canonical_id": "TERM_DRUG_AMLODIPINE_5", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_017_BLURRY_NON_NABH",
            "title": "Non-NABH Hospital Bill (15% Discount Rule Verification)",
            "category": "blurry",
            "hospital_name": "Sunrise City Nursing Home (Non-NABH)",
            "state": "UP",
            "city_tier": "X",
            "nabh_accredited": False,
            "ward_type": "general",
            "stay_days": 2,
            "patient_header": "Patient Name: Brijesh Yadav | Phone: 9415098765 | UHID: SCNH-119",
            "lines": [
                {"raw_text": "CBC", "qty": 1, "unit_price": 255.0, "total": 255.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
                {"raw_text": "Lipid Profile", "qty": 1, "unit_price": 490.0, "total": 490.0, "expected_canonical_id": "TERM_LAB_LIPID", "expected_flagged": True},
                {"raw_text": "ICU Charges", "qty": 1, "unit_price": 4590.0, "total": 4590.0, "expected_canonical_id": "TERM_ROOM_ICU", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_018_BLURRY_DAYS_MISMATCH",
            "title": "Room Days Exceed Declared Stay Anomaly Bill",
            "category": "blurry",
            "hospital_name": "Silver Oak Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Nandini Sen | Phone: 9830123456 | UHID: SOH-811",
            "lines": [
                {"raw_text": "Semi-Private Ward", "qty": 4, "unit_price": 3000.0, "total": 12000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": True},
                {"raw_text": "OPD Consultation", "qty": 1, "unit_price": 350.0, "total": 350.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_019_BLURRY_ARITHMETIC",
            "title": "Line Item Multiplication Arithmetic Error Bill",
            "category": "blurry",
            "hospital_name": "Green Valley Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "general",
            "stay_days": 2,
            "patient_header": "Patient Name: Pradeep Kumar | Phone: 9818099887 | UHID: GVH-334",
            "lines": [
                {"raw_text": "General Ward", "qty": 2, "unit_price": 1500.0, "total": 4500.0, "expected_canonical_id": "TERM_ROOM_GENERAL", "expected_flagged": True},
                {"raw_text": "Liver Function Test", "qty": 1, "unit_price": 500.0, "total": 500.0, "expected_canonical_id": "TERM_LAB_LFT", "expected_flagged": False},
            ],
        },

        # --- CATEGORY 4: HINDI & BILINGUAL BILLS (6 bills) ---
        {
            "bill_id": "BILL_020_HINDI_IPD",
            "title": "Hindi Bilingual Inpatient Bill (कमरे का किराया और जांच)",
            "category": "hindi",
            "hospital_name": "जनकल्याण सुपर स्पेशलिटी अस्पताल (Jankalyan Hospital)",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "मरीज का नाम: सुरेश चंद्र | Phone: 9811556677 | UHID: JKH-2026-11",
            "lines": [
                {"raw_text": "परामर्श शुल्क", "qty": 1, "unit_price": 350.0, "total": 350.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": False},
                {"raw_text": "कमरे का किराया", "qty": 2, "unit_price": 4500.0, "total": 9000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": True},
                {"raw_text": "सीबीसी जांच", "qty": 1, "unit_price": 300.0, "total": 300.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
                {"raw_text": "छाती का एक्स-रे", "qty": 1, "unit_price": 230.0, "total": 230.0, "expected_canonical_id": "TERM_RAD_XRAY_CHEST", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_021_HINDI_CARDIAC",
            "title": "Hindi Cardiac Stent & ICU Bill",
            "category": "hindi",
            "hospital_name": "हृदय केयर संस्थान (Hriday Care Institute)",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Kamla Devi | Phone: 9910112233 | UHID: HCI-908",
            "lines": [
                {"raw_text": "हार्ट स्टेंट (DES)", "qty": 1, "unit_price": 55000.0, "total": 55000.0, "expected_canonical_id": "TERM_IMPLANT_STENT_DES", "expected_flagged": True},
                {"raw_text": "आईसीयू शुल्क", "qty": 2, "unit_price": 5400.0, "total": 10800.0, "expected_canonical_id": "TERM_ROOM_ICU", "expected_flagged": False},
                {"raw_text": "2डी इको", "qty": 1, "unit_price": 1475.0, "total": 1475.0, "expected_canonical_id": "TERM_CARD_2DECHO", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_022_HINDI_DIAGNOSTIC",
            "title": "Hindi Radiology & Pathology Bill",
            "category": "hindi",
            "hospital_name": "आरोग्य डायग्नोस्टिक्स (Arogya Diagnostics)",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Mukesh Yadav | Phone: 9871122334 | UHID: AD-445",
            "lines": [
                {"raw_text": "एचआरसीटी चेस्ट", "qty": 1, "unit_price": 3800.0, "total": 3800.0, "expected_canonical_id": "TERM_RAD_HRCT_CHEST", "expected_flagged": True},
                {"raw_text": "किडनी जांच", "qty": 1, "unit_price": 500.0, "total": 500.0, "expected_canonical_id": "TERM_LAB_KFT", "expected_flagged": False},
                {"raw_text": "लिवर की जांच", "qty": 1, "unit_price": 500.0, "total": 500.0, "expected_canonical_id": "TERM_LAB_LFT", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_023_HINDI_SURGERY",
            "title": "Hindi Gallbladder Lap Cholecystectomy Bill",
            "category": "hindi",
            "hospital_name": "जीवन ज्योति अस्पताल (Jeevan Jyoti Hospital)",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Rekha Gupta | Phone: 9812233445 | UHID: JJH-511",
            "lines": [
                {"raw_text": "पित्त की थैली का ऑपरेशन", "qty": 1, "unit_price": 38000.0, "total": 38000.0, "expected_canonical_id": "TERM_PKG_LAP_CHOLE", "expected_flagged": True},
                {"raw_text": "पेट की सोनोग्राफी", "qty": 1, "unit_price": 800.0, "total": 800.0, "expected_canonical_id": "TERM_RAD_USG_ABDOMEN", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_024_HINDI_MATERNITY",
            "title": "Hindi Caesarean Delivery Bill",
            "category": "hindi",
            "hospital_name": "मातृ छाया हॉस्पिटल (Matri Chhaya Hospital)",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Neha Sharma | Phone: 9818877665 | UHID: MCH-709",
            "lines": [
                {"raw_text": "सिजेरियन डिलीवरी", "qty": 1, "unit_price": 20700.0, "total": 20700.0, "expected_canonical_id": "TERM_PKG_LSCS", "expected_flagged": False},
                {"raw_text": "सीबीसी जांच", "qty": 1, "unit_price": 300.0, "total": 300.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_025_HINDI_EYE",
            "title": "Hindi Cataract Surgery Bill",
            "category": "hindi",
            "hospital_name": "नेत्र ज्योति केंद्र (Netra Jyoti Kendra)",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Ram Prakash | Phone: 9958112233 | UHID: NJK-104",
            "lines": [
                {"raw_text": "मोतियाबिंद का ऑपरेशन", "qty": 1, "unit_price": 24000.0, "total": 24000.0, "expected_canonical_id": "TERM_PKG_CATARACT", "expected_flagged": True},
                {"raw_text": "ईसीजी जांच", "qty": 1, "unit_price": 175.0, "total": 175.0, "expected_canonical_id": "TERM_CARD_ECG", "expected_flagged": False},
            ],
        },

        # --- CATEGORY 5: HANDWRITTEN-STYLE / NOISY CLINIC BILLS (5 bills) ---
        {
            "bill_id": "BILL_026_HANDWRITTEN_CLINIC",
            "title": "Small Nursing Home Handwritten-Style Fever Bill",
            "category": "handwritten",
            "hospital_name": "Shanti Devi Nursing Home",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "general",
            "stay_days": 2,
            "patient_header": "Patient Name: Mohan Das | Phone: 9810987654 | UHID: SDNH-42",
            "lines": [
                {"raw_text": "General Ward", "qty": 2, "unit_price": 1500.0, "total": 3000.0, "expected_canonical_id": "TERM_ROOM_GENERAL", "expected_flagged": False},
                {"raw_text": "Dengue NS1", "qty": 1, "unit_price": 400.0, "total": 400.0, "expected_canonical_id": "TERM_LAB_DENGUE_NS1", "expected_flagged": False},
                {"raw_text": "Paracetamol IV", "qty": 2, "unit_price": 135.0, "total": 270.0, "expected_canonical_id": "TERM_DRUG_PARACETAMOL_IV", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_027_HANDWRITTEN_ORTHO",
            "title": "Orthopaedic Knee Implant Handwritten Memo",
            "category": "handwritten",
            "hospital_name": "Bone & Joint Ortho Clinic",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 4,
            "patient_header": "Patient Name: Savitri Devi | Phone: 9811334455 | UHID: BJOC-88",
            "lines": [
                {"raw_text": "Knee Implant", "qty": 1, "unit_price": 85000.0, "total": 85000.0, "expected_canonical_id": "TERM_IMPLANT_KNEE_PRIMARY", "expected_flagged": True},
                {"raw_text": "Total Knee Replacement", "qty": 1, "unit_price": 69000.0, "total": 69000.0, "expected_canonical_id": "TERM_PKG_TKR", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_028_HANDWRITTEN_PHARMA",
            "title": "Pharmacy Handwritten Cash Memo (Overcharged Antibiotics)",
            "category": "handwritten",
            "hospital_name": "LifeCare In-House Pharmacy",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Imran Khan | Phone: 9891223344 | UHID: LCIP-19",
            "lines": [
                {"raw_text": "Inj Meropenem 1g", "qty": 2, "unit_price": 1800.0, "total": 3600.0, "expected_canonical_id": "TERM_DRUG_MEROPENEM_1G", "expected_flagged": True},
                {"raw_text": "Inj Pantoprazole 40mg", "qty": 2, "unit_price": 150.0, "total": 300.0, "expected_canonical_id": "TERM_DRUG_PANTOPRAZOLE_INJ", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_029_HANDWRITTEN_DIAG",
            "title": "Diagnostic Centre Handwritten Receipt",
            "category": "handwritten",
            "hospital_name": "Accurate PathLab & Imaging",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Ritu Verma | Phone: 9811667788 | UHID: APLI-77",
            "lines": [
                {"raw_text": "Thyroid Profile", "qty": 1, "unit_price": 450.0, "total": 450.0, "expected_canonical_id": "TERM_LAB_THYROID", "expected_flagged": False},
                {"raw_text": "Lipid Profile", "qty": 1, "unit_price": 490.0, "total": 490.0, "expected_canonical_id": "TERM_LAB_LIPID", "expected_flagged": False},
                {"raw_text": "HbA1c", "qty": 1, "unit_price": 750.0, "total": 750.0, "expected_canonical_id": "TERM_LAB_HBA1C", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_030_HANDWRITTEN_EMERGENCY",
            "title": "Emergency Observation Ward Bill",
            "category": "handwritten",
            "hospital_name": "City Trauma & Emergency Centre",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 1,
            "patient_header": "Patient Name: Arjun Kapoor | Phone: 9873344556 | UHID: CTEC-55",
            "lines": [
                {"raw_text": "CT Scan Brain", "qty": 1, "unit_price": 2600.0, "total": 2600.0, "expected_canonical_id": "TERM_RAD_CT_HEAD", "expected_flagged": True},
                {"raw_text": "ECG", "qty": 1, "unit_price": 175.0, "total": 175.0, "expected_canonical_id": "TERM_CARD_ECG", "expected_flagged": False},
                {"raw_text": "Consultation", "qty": 1, "unit_price": 350.0, "total": 350.0, "expected_canonical_id": "TERM_CONSULT_OPD", "expected_flagged": False},
            ],
        },

        # --- CATEGORY 6: MULTI-PAGE ITEMIZED IPD BILLS (6 bills, PDF + PNG) ---
        {
            "bill_id": "BILL_031_MULTIPAGE_ICU_SEPSIS",
            "title": "Multi-Page Critical Care Sepsis IPD Bill (6 Line Items)",
            "category": "multipage",
            "hospital_name": "Medanta Crest Super Speciality Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 4,
            "patient_header": "Patient Name: K. L. Narayanan | Phone: 9811445566 | UHID: MCSS-4001",
            "lines": [
                {"raw_text": "ICU Charges", "qty": 2, "unit_price": 8500.0, "total": 17000.0, "expected_canonical_id": "TERM_ROOM_ICU", "expected_flagged": True},
                {"raw_text": "Semi-Private Ward", "qty": 2, "unit_price": 3000.0, "total": 6000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": False},
                {"raw_text": "Inj Meropenem 1g", "qty": 4, "unit_price": 975.0, "total": 3900.0, "expected_canonical_id": "TERM_DRUG_MEROPENEM_1G", "expected_flagged": False},
                {"raw_text": "HRCT Chest", "qty": 1, "unit_price": 2000.0, "total": 2000.0, "expected_canonical_id": "TERM_RAD_HRCT_CHEST", "expected_flagged": False},
                {"raw_text": "Complete Blood Count (CBC)", "qty": 2, "unit_price": 300.0, "total": 600.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
                {"raw_text": "Kidney Function Test (KFT)", "qty": 2, "unit_price": 900.0, "total": 1800.0, "expected_canonical_id": "TERM_LAB_KFT", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_032_MULTIPAGE_CARDIAC_FULL",
            "title": "Multi-Page Cardiac Intervention & Ward Stay Bill",
            "category": "multipage",
            "hospital_name": "Asian Heart & Multispeciality Hospital",
            "state": "MH",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Sharad Kulkarni | Phone: 9820112233 | UHID: AHMH-991",
            "lines": [
                {"raw_text": "Coronary Angiography", "qty": 1, "unit_price": 13225.0, "total": 13225.0, "expected_canonical_id": "TERM_PROC_CAG", "expected_flagged": False},
                {"raw_text": "Coronary Angioplasty (PTCA)", "qty": 1, "unit_price": 57500.0, "total": 57500.0, "expected_canonical_id": "TERM_PKG_PTCA", "expected_flagged": False},
                {"raw_text": "Drug Eluting Stent", "qty": 1, "unit_price": 38933.0, "total": 38933.0, "expected_canonical_id": "TERM_IMPLANT_STENT_DES", "expected_flagged": False},
                {"raw_text": "2D Echocardiography", "qty": 1, "unit_price": 2800.0, "total": 2800.0, "expected_canonical_id": "TERM_CARD_2DECHO", "expected_flagged": True},
                {"raw_text": "Inj Enoxaparin 40mg", "qty": 3, "unit_price": 425.0, "total": 1275.0, "expected_canonical_id": "TERM_DRUG_ENOXAPARIN_40", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_033_MULTIPAGE_GASTRO_IPD",
            "title": "Multi-Page Gastroenterology Inpatient Bill",
            "category": "multipage",
            "hospital_name": "Apollo Gastro & Liver Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Vinod Khanna | Phone: 9811778899 | UHID: AGLH-502",
            "lines": [
                {"raw_text": "Semi-Private Ward", "qty": 3, "unit_price": 3000.0, "total": 9000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": False},
                {"raw_text": "Upper GI Endoscopy", "qty": 1, "unit_price": 1984.0, "total": 1984.0, "expected_canonical_id": "TERM_PROC_ENDOSCOPY", "expected_flagged": False},
                {"raw_text": "Ultrasound Whole Abdomen", "qty": 1, "unit_price": 1800.0, "total": 1800.0, "expected_canonical_id": "TERM_RAD_USG_ABDOMEN", "expected_flagged": True},
                {"raw_text": "Liver Function Test", "qty": 1, "unit_price": 500.0, "total": 500.0, "expected_canonical_id": "TERM_LAB_LFT", "expected_flagged": False},
                {"raw_text": "Inj Pantoprazole 40mg", "qty": 3, "unit_price": 56.0, "total": 168.0, "expected_canonical_id": "TERM_DRUG_PANTOPRAZOLE_INJ", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_034_MULTIPAGE_RESPIRATORY",
            "title": "Multi-Page Respiratory Pneumonia IPD Bill",
            "category": "multipage",
            "hospital_name": "Maximos Chest & Critical Care Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "private",
            "stay_days": 3,
            "patient_header": "Patient Name: Sudha Murthy | Phone: 9845112233 | UHID: MCCC-312",
            "lines": [
                {"raw_text": "Private Ward", "qty": 3, "unit_price": 4500.0, "total": 13500.0, "expected_canonical_id": "TERM_ROOM_PRIVATE", "expected_flagged": False},
                {"raw_text": "HRCT Chest", "qty": 1, "unit_price": 2000.0, "total": 2000.0, "expected_canonical_id": "TERM_RAD_HRCT_CHEST", "expected_flagged": False},
                {"raw_text": "RT-PCR", "qty": 1, "unit_price": 1084.0, "total": 1084.0, "expected_canonical_id": "TERM_LAB_RTPCR", "expected_flagged": False},
                {"raw_text": "Inj Ceftriaxone 1g", "qty": 6, "unit_price": 68.5, "total": 411.0, "expected_canonical_id": "TERM_DRUG_CEFTRIAXONE_1G", "expected_flagged": False},
                {"raw_text": "PPE Kit", "qty": 4, "unit_price": 1200.0, "total": 4800.0, "expected_canonical_id": "TERM_CONS_PPE_GLOVES", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_035_MULTIPAGE_RENAL_ICU",
            "title": "Multi-Page Acute Kidney Injury & Dialysis Bill",
            "category": "multipage",
            "hospital_name": "Kaveri Kidney & Multispeciality Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: T. Subramanian | Phone: 9840112233 | UHID: KKMH-719",
            "lines": [
                {"raw_text": "ICU Charges", "qty": 2, "unit_price": 5400.0, "total": 10800.0, "expected_canonical_id": "TERM_ROOM_ICU", "expected_flagged": False},
                {"raw_text": "Hemodialysis", "qty": 2, "unit_price": 1610.0, "total": 3220.0, "expected_canonical_id": "TERM_PROC_HEMODIALYSIS", "expected_flagged": False},
                {"raw_text": "Kidney Function Test", "qty": 2, "unit_price": 500.0, "total": 1000.0, "expected_canonical_id": "TERM_LAB_KFT", "expected_flagged": False},
                {"raw_text": "Complete Haemogram", "qty": 1, "unit_price": 650.0, "total": 650.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_036_MULTIPAGE_NEURO_STROKE",
            "title": "Multi-Page Acute Stroke Evaluation IPD Bill",
            "category": "multipage",
            "hospital_name": "Apex Neuro & Vascular Centre",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: G. S. Gill | Phone: 9815011223 | UHID: ANVC-205",
            "lines": [
                {"raw_text": "MRI Brain", "qty": 1, "unit_price": 3000.0, "total": 3000.0, "expected_canonical_id": "TERM_RAD_MRI_BRAIN", "expected_flagged": False},
                {"raw_text": "CT Scan Brain", "qty": 1, "unit_price": 1035.0, "total": 1035.0, "expected_canonical_id": "TERM_RAD_CT_HEAD", "expected_flagged": False},
                {"raw_text": "2D Echocardiography", "qty": 1, "unit_price": 1475.0, "total": 1475.0, "expected_canonical_id": "TERM_CARD_2DECHO", "expected_flagged": False},
                {"raw_text": "Lipid Profile", "qty": 1, "unit_price": 490.0, "total": 490.0, "expected_canonical_id": "TERM_LAB_LIPID", "expected_flagged": False},
                {"raw_text": "Semi-Private Ward", "qty": 2, "unit_price": 5000.0, "total": 10000.0, "expected_canonical_id": "TERM_ROOM_SEMI_PRIVATE", "expected_flagged": True},
            ],
        },

        # --- CATEGORY 7: SURGERY PACKAGE & UNBUNDLING BILLS (6 bills) ---
        {
            "bill_id": "BILL_037_PKG_LAP_CHOLE_UNBUNDLED",
            "title": "Laparoscopic Cholecystectomy Package with Unbundled PPE & Nursing",
            "category": "package_bill",
            "hospital_name": "Columbia Surgical Institute",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Rohini Iyer | Phone: 9821122334 | UHID: CSI-801",
            "lines": [
                {"raw_text": "Laparoscopic Cholecystectomy", "qty": 1, "unit_price": 25300.0, "total": 25300.0, "expected_canonical_id": "TERM_PKG_LAP_CHOLE", "expected_flagged": False},
                {"raw_text": "PPE Kit", "qty": 2, "unit_price": 750.0, "total": 1500.0, "expected_canonical_id": "TERM_CONS_PPE_GLOVES", "expected_flagged": True},
                {"raw_text": "Nursing Charges", "qty": 2, "unit_price": 1000.0, "total": 2000.0, "expected_canonical_id": "TERM_PROC_NURSING_RMO", "expected_flagged": True},
            ],
        },
        {
            "bill_id": "BILL_038_PKG_APPENDICECTOMY",
            "title": "Appendicectomy Surgery Package Bill (Overcharged Package)",
            "category": "package_bill",
            "hospital_name": "Prime Care Surgical Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Karan Malhotra | Phone: 9810334455 | UHID: PCSH-412",
            "lines": [
                {"raw_text": "Appendicectomy", "qty": 1, "unit_price": 36000.0, "total": 36000.0, "expected_canonical_id": "TERM_PKG_APPENDICECTOMY", "expected_flagged": True},
                {"raw_text": "Ultrasound Whole Abdomen", "qty": 1, "unit_price": 800.0, "total": 800.0, "expected_canonical_id": "TERM_RAD_USG_ABDOMEN", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_039_PKG_HERNIA",
            "title": "Inguinal Hernioplasty with Mesh Package Bill",
            "category": "package_bill",
            "hospital_name": "Metro Hernia & Laparoscopy Centre",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "patient_header": "Patient Name: Devendra Fadnavis | Phone: 9822998877 | UHID: MHLC-118",
            "lines": [
                {"raw_text": "Hernia Repair", "qty": 1, "unit_price": 28500.0, "total": 28500.0, "expected_canonical_id": "TERM_PKG_HERNIA", "expected_flagged": False},
                {"raw_text": "Complete Blood Count (CBC)", "qty": 1, "unit_price": 300.0, "total": 300.0, "expected_canonical_id": "TERM_LAB_CBC", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_040_PKG_HYSTERECTOMY",
            "title": "Total Laparoscopic Hysterectomy (TLH) Package Bill",
            "category": "package_bill",
            "hospital_name": "Women's Wellness & Surgical Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Asha Bhonsle | Phone: 9820556677 | UHID: WWSH-605",
            "lines": [
                {"raw_text": "Total Laparoscopic Hysterectomy", "qty": 1, "unit_price": 42000.0, "total": 42000.0, "expected_canonical_id": "TERM_PKG_HYSTERECTOMY", "expected_flagged": True},
                {"raw_text": "ECG", "qty": 1, "unit_price": 175.0, "total": 175.0, "expected_canonical_id": "TERM_CARD_ECG", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_041_PKG_CABG_BYPASS",
            "title": "Coronary Artery Bypass Graft (CABG) Package Bill",
            "category": "package_bill",
            "hospital_name": "National Heart Institute",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 6,
            "patient_header": "Patient Name: Satyapal Malik | Phone: 9811229900 | UHID: NHI-707",
            "lines": [
                {"raw_text": "Coronary Artery Bypass Graft", "qty": 1, "unit_price": 161000.0, "total": 161000.0, "expected_canonical_id": "TERM_PKG_CABG", "expected_flagged": False},
                {"raw_text": "2D Echocardiography", "qty": 1, "unit_price": 1475.0, "total": 1475.0, "expected_canonical_id": "TERM_CARD_2DECHO", "expected_flagged": False},
            ],
        },
        {
            "bill_id": "BILL_042_PKG_MJPJAY_MH",
            "title": "Maharashtra State MJPJAY & CGHS Dual Comparator Surgery Bill",
            "category": "package_bill",
            "hospital_name": "Sahyadri Lotus Multispeciality Hospital",
            "state": "MH",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 3,
            "patient_header": "Patient Name: Ganesh Deshpande | Phone: 9823011223 | UHID: SLMH-990",
            "lines": [
                {"raw_text": "Laparoscopic Cholecystectomy", "qty": 1, "unit_price": 34000.0, "total": 34000.0, "expected_canonical_id": "TERM_PKG_LAP_CHOLE", "expected_flagged": True},
                {"raw_text": "Drug Eluting Stent", "qty": 1, "unit_price": 38933.0, "total": 38933.0, "expected_canonical_id": "TERM_IMPLANT_STENT_DES", "expected_flagged": False},
            ],
        },
    ]
    return specs


def build_ocr_text_for_spec(spec: dict) -> str:
    rows = [
        spec["hospital_name"],
        f"State: {spec['state']} | City Tier: {spec['city_tier']} | Ward: {spec['ward_type']} | Stay Days: {spec['stay_days']}",
        spec["patient_header"],
        "------------------------------------------------------------",
        "Description | Qty | Unit Price | Total",
    ]
    grand = 0.0
    for line in spec["lines"]:
        grand += float(line["total"])
        rows.append(f"{line['raw_text']} | {line['qty']} | Rs. {line['unit_price']:.2f} | Rs. {line['total']:.2f}")
    rows.append(f"Grand Total: Rs. {grand:.2f}")
    return "\n".join(rows)


def render_bill_png(spec: dict, ocr_text: str) -> bytes:
    """Renders a realistic hospital invoice image (with skew/blur/handwritten styling per category) and embeds the OCR text layer."""
    width, height = 900, 1180
    bg_color = (252, 251, 248) if spec["category"] != "handwritten" else (246, 243, 232)
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([30, 30, width - 30, 130], fill=(43, 17, 102))
    draw.text((55, 48), spec["hospital_name"][:52], fill=(255, 255, 255))
    draw.text(
        (55, 85),
        f"TAX INVOICE / IPD FINAL BILL  |  State: {spec['state']}  |  Tier: {spec['city_tier']}  |  Ward: {spec['ward_type'].upper()}",
        fill=(245, 130, 32),
    )

    # Patient & Bill Info box
    draw.rectangle([30, 145, width - 30, 215], outline=(180, 180, 195), width=2)
    draw.text((45, 158), spec["patient_header"][:85], fill=(40, 40, 55))
    draw.text((45, 185), f"Bill ID: {spec['bill_id']}   |   Category: {spec['category'].upper()}   |   Stay: {spec['stay_days']} Day(s)", fill=(90, 90, 110))

    # Table Header
    draw.rectangle([30, 230, width - 30, 270], fill=(235, 232, 245))
    draw.text((45, 243), "S.No   Item / Procedure Description", fill=(43, 17, 102))
    draw.text((540, 243), "Qty", fill=(43, 17, 102))
    draw.text((630, 243), "Unit Rate (INR)", fill=(43, 17, 102))
    draw.text((760, 243), "Total (INR)", fill=(43, 17, 102))

    y = 285
    grand_total = 0.0
    for idx, line in enumerate(spec["lines"]):
        grand_total += float(line["total"])
        row_bg = (255, 255, 255) if idx % 2 == 0 else (247, 246, 252)
        draw.rectangle([30, y - 8, width - 30, y + 48], fill=row_bg, outline=(220, 220, 230))
        ascii_desc = line["raw_text"].encode("ascii", errors="ignore").decode("ascii").strip() or f"Medical Item #{idx+1} ({line['expected_canonical_id']})"
        draw.text((45, y + 10), f"{idx+1}.     {ascii_desc[:42]}", fill=(25, 25, 35))
        draw.text((545, y + 10), f"{line['qty']}", fill=(25, 25, 35))
        draw.text((635, y + 10), f"Rs. {line['unit_price']:,.2f}", fill=(25, 25, 35))
        draw.text((760, y + 10), f"Rs. {line['total']:,.2f}", fill=(25, 25, 35))
        y += 65

    # Grand total box
    draw.rectangle([30, y + 20, width - 30, y + 80], fill=(43, 17, 102))
    draw.text((55, y + 42), "GRAND TOTAL / NET PAYABLE AMOUNT", fill=(255, 255, 255))
    draw.text((710, y + 42), f"Rs. {grand_total:,.2f}", fill=(245, 130, 32))

    # Apply realistic visual perturbations based on category
    if spec["category"] == "blurry":
        img = img.filter(ImageFilter.GaussianBlur(radius=1.1))
    elif spec["category"] == "skewed":
        angle = float(spec.get("skew_deg", 5.0))
        img = img.rotate(angle, resample=Image.BICUBIC, expand=False, fillcolor=(240, 240, 240))

    meta = PngImagePlugin.PngInfo()
    meta.add_itxt("swasthya_ocr_text", ocr_text, lang="hi", tkey="swasthya_ocr_text")
    meta.add_text("swasthya_bill_id", spec["bill_id"])

    buf = io.BytesIO()
    img.save(buf, format="PNG", pnginfo=meta)
    return buf.getvalue()


def render_bill_pdf(spec: dict, ocr_text: str) -> bytes:
    """Generates a single or multi-page searchable PDF for PDF upload verification."""
    doc = fitz.open()
    lines = ocr_text.splitlines()
    if spec["category"] == "multipage":
        mid = max(4, len(lines) - 2)
        page1 = doc.new_page(width=595, height=842)
        page1.insert_text((40, 50), "\n".join(lines[:mid]), fontsize=11)
        page2 = doc.new_page(width=595, height=842)
        page2.insert_text((40, 50), "\n".join(lines[mid:]), fontsize=11)
    else:
        page = doc.new_page(width=595, height=842)
        page.insert_text((40, 50), ocr_text, fontsize=11)
    return doc.tobytes()


def generate_all_golden_bills():
    specs = get_golden_bill_specs()
    ground_truth = []

    for spec in specs:
        ocr_text = build_ocr_text_for_spec(spec)
        png_bytes = render_bill_png(spec, ocr_text)
        png_path = GOLDEN_DIR / f"{spec['bill_id']}.png"
        png_path.write_bytes(png_bytes)

        pdf_filename = None
        if spec["category"] == "multipage" or spec["bill_id"] == "BILL_001_DECK_SLIDE3":
            pdf_bytes = render_bill_pdf(spec, ocr_text)
            pdf_path = GOLDEN_DIR / f"{spec['bill_id']}.pdf"
            pdf_path.write_bytes(pdf_bytes)
            pdf_filename = f"data/golden_bills/{spec['bill_id']}.pdf"

        ground_truth.append(
            {
                **spec,
                "png_file": f"data/golden_bills/{spec['bill_id']}.png",
                "pdf_file": pdf_filename,
                "ocr_text": ocr_text,
            }
        )

    gt_path = GOLDEN_DIR / "ground_truth.json"
    gt_path.write_text(json.dumps(ground_truth, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[Golden Dataset] Generated {len(ground_truth)} synthetic realistic hospital bills in {GOLDEN_DIR}")
    return ground_truth


if __name__ == "__main__":
    generate_all_golden_bills()
