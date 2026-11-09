"""
Comprehensive Unit, Data Traceability, Ledger & 42-Bill Golden Dataset Test Suite
for SwasthyaBillCheck (NMBTP).
Follows TDD + Godkiller Gatekeeper verification standards.
"""

import json
import sqlite3
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "services" / "ai-engine"))
sys.path.insert(0, str(ROOT_DIR / "data" / "etl"))

from app.ledger import (
    GENESIS_HASH,
    OptionalChainAnchorAdapter,
    compute_merkle_root,
    compute_report_hash,
    verify_hash_chain,
)
from app.matcher import SmartMatchingEngine, classify_line_category, levenshtein_ratio, trigram_similarity
from app.ocr import extract_bill_from_bytes, parse_structured_lines_from_text, preprocess_bill_image
from app.pii import redact_text_pii
from monthly_refresh import compute_rate_diff, run_monthly_refresh


@pytest.fixture(scope="module")
def engine() -> SmartMatchingEngine:
    return SmartMatchingEngine(ROOT_DIR / "data" / "swasthyabillcheck.db")


def test_data_traceability_no_orphan_rates():
    """Every rate row in the DB must be traceable to a verified rate_source and canonical_term."""
    conn = sqlite3.connect(ROOT_DIR / "data" / "swasthyabillcheck.db")
    cur = conn.cursor()

    orphan_sources = cur.execute(
        "SELECT COUNT(*) FROM rate_item WHERE source_id NOT IN (SELECT source_id FROM rate_source)"
    ).fetchone()[0]
    orphan_terms = cur.execute(
        "SELECT COUNT(*) FROM rate_item WHERE canonical_id NOT IN (SELECT canonical_id FROM canonical_term)"
    ).fetchone()[0]
    null_fields = cur.execute(
        "SELECT COUNT(*) FROM rate_item WHERE rate IS NULL OR page_ref IS NULL OR page_ref = '' OR code IS NULL"
    ).fetchone()[0]
    total_rates = cur.execute("SELECT COUNT(*) FROM rate_item").fetchone()[0]
    conn.close()

    assert total_rates >= 55
    assert orphan_sources == 0
    assert orphan_terms == 0
    assert null_fields == 0


def test_pii_redaction_dpdp_act_2023():
    raw = (
        "Patient Name: Rajesh Kumar Sharma\n"
        "Phone: +91-9811223344 | Aadhaar: 4512 8923 6701\n"
        "UHID: IMSH-2026-0891 | Email: rajesh.sharma@example.com\n"
        "Consultation: Rs. 1500"
    )
    res = redact_text_pii(raw)
    assert res["pii_found"] is True
    assert res["counts"]["patient_name"] == 1
    assert res["counts"]["phone"] == 1
    assert res["counts"]["aadhaar"] == 1
    assert res["counts"]["uhid"] == 1
    assert res["counts"]["email"] == 1
    assert "9811223344" not in res["redacted_text"]
    assert "4512 8923 6701" not in res["redacted_text"]
    assert "Rajesh Kumar Sharma" not in res["redacted_text"]


def test_ledger_hash_chaining_and_tamper_detection():
    p1 = {"bill_id": "B1", "billed": 13500, "ref": 10500}
    h1 = compute_report_hash(p1, GENESIS_HASH)
    p2 = {"bill_id": "B2", "billed": 4500, "ref": 4500}
    h2 = compute_report_hash(p2, h1)

    chain = [
        {"report_hash": h1, "prev_hash": GENESIS_HASH, "payload": p1},
        {"report_hash": h2, "prev_hash": h1, "payload": p2},
    ]
    ver = verify_hash_chain(chain)
    assert ver["valid"] is True
    assert ver["checked_count"] == 2

    # Tamper with payload 1
    tampered_chain = [
        {"report_hash": h1, "prev_hash": GENESIS_HASH, "payload": {"bill_id": "B1", "billed": 99999, "ref": 10500}},
        {"report_hash": h2, "prev_hash": h1, "payload": p2},
    ]
    ver_bad = verify_hash_chain(tampered_chain)
    assert ver_bad["valid"] is False
    assert ver_bad["broken_at_index"] == 0

    merkle = compute_merkle_root([h1, h2])
    assert len(merkle) == 64
    adapter = OptionalChainAnchorAdapter("ethereum-sepolia")
    anchor = adapter.anchor_merkle_root(merkle, 2)
    assert anchor["merkle_root"] == merkle
    assert anchor["anchor_tx_ref"].startswith("0x")


def test_never_compare_single_room_rent_to_pmjay_package(engine: SmartMatchingEngine):
    """Non-negotiable rule #3: Never compare a single room-rent or consultation line to a PM-JAY package."""
    comp_room = engine.select_comparator("TERM_ROOM_SEMI_PRIVATE", "room_rent", city_tier="X", nabh_accredited=True, ward_type="semi_private")
    assert comp_room["primary"]["scheme"] == "CGHS"
    assert comp_room["primary"]["effective_unit_rate"] == 3000.0

    comp_consult = engine.select_comparator("TERM_CONSULT_OPD", "consultation", city_tier="X", nabh_accredited=True)
    assert comp_consult["primary"]["scheme"] == "CGHS"
    assert comp_consult["primary"]["effective_unit_rate"] == 350.0

    # Surgery package should provide both CGHS and PM-JAY comparators
    comp_pkg = engine.select_comparator("TERM_PKG_LAP_CHOLE", "package", city_tier="X", nabh_accredited=True)
    schemes = {comp_pkg["primary"]["scheme"]} | {a["scheme"] for a in comp_pkg["alternatives"]}
    assert "CGHS" in schemes
    assert "PM-JAY" in schemes


def test_deck_slide3_benchmark_bill_exact_match(engine: SmartMatchingEngine):
    """Verifies Slide 3 of the Deck: Consultation Rs 1500 (OK), Room charges Rs 9000 vs Rate Rs 6000 (Flagged), Lab tests Rs 3000 (OK)."""
    lines = [
        {"raw_text": "Consultation", "qty": 1, "unit_price": 1500.0, "total": 1500.0},
        {"raw_text": "Room charges", "qty": 1, "unit_price": 9000.0, "total": 9000.0},
        {"raw_text": "Lab tests", "qty": 1, "unit_price": 3000.0, "total": 3000.0},
    ]
    res = engine.verify_bill(lines, city_tier="X", nabh_accredited=True, ward_type="semi_private")
    assert res["summary"]["billed_total"] == 13500.0
    assert res["summary"]["reference_total"] == 10500.0
    assert res["summary"]["potential_savings"] == 3000.0
    assert res["summary"]["flagged_count"] == 1

    l0, l1, l2 = res["lines"]
    assert l0["status"] == "ok" and l0["reference_total"] == 1500.0
    assert l1["status"] == "above_reference" and l1["reference_total"] == 6000.0 and l1["delta_amount"] == 3000.0
    assert l2["status"] == "ok" and l2["reference_total"] == 3000.0
    assert "Above government reference rate" in l1["explanation_i18n"]["en"]
    assert "illegal" not in l1["explanation_i18n"]["en"].lower()
    assert "fraud" not in l1["explanation_i18n"]["en"].lower()


def test_monthly_refresh_version_diffing():
    old_map = {
        "R1": {"rate_id": "R1", "name": "Test A", "rate": 300.0, "effective_from": "2023-04-12"},
        "R2": {"rate_id": "R2", "name": "Test B", "rate": 500.0, "effective_from": "2023-04-12"},
    }
    new_list = [
        {"rate_id": "R1", "name": "Test A", "rate": 350.0, "effective_from": "2025-04-01"},
        {"rate_id": "R3", "name": "Test C", "rate": 800.0, "effective_from": "2025-04-01"},
    ]
    diff = compute_rate_diff(old_map, new_list)
    assert diff["added_count"] == 1
    assert diff["modified_count"] == 1
    assert diff["removed_count"] == 1
    assert diff["modified"][0]["delta"] == 50.0


def test_golden_dataset_precision_recall_and_false_flag_rate(engine: SmartMatchingEngine):
    """
    Runs all 42 golden dataset hospital bills through the full image/PDF OCR + OpenCV
    preprocessing + Smart Matching Engine and asserts:
    - OCR field accuracy >= 95%
    - Line-match precision & recall >= 95%
    - False-flag rate < 5% (mandatory Quality Gate!)
    """
    gt_path = ROOT_DIR / "data" / "golden_bills" / "ground_truth.json"
    ground_truth = json.loads(gt_path.read_text(encoding="utf-8"))
    assert len(ground_truth) >= 40

    total_expected_lines = 0
    correctly_extracted_lines = 0
    correctly_matched_canonical = 0
    true_positives_flag = 0
    false_positives_flag = 0
    true_negatives_ok = 0
    false_negatives_flag = 0

    for bill_spec in ground_truth:
        png_path = ROOT_DIR / bill_spec["png_file"]
        file_bytes = png_path.read_bytes()
        ocr_out = extract_bill_from_bytes(file_bytes, filename=png_path.name)

        assert ocr_out["preprocessing"]["preprocessed"] is True
        extracted_lines = ocr_out["lines"]

        ver_out = engine.verify_bill(
            extracted_lines,
            city_tier=bill_spec["city_tier"],
            nabh_accredited=bill_spec["nabh_accredited"],
            ward_type=bill_spec["ward_type"],
            state=bill_spec["state"],
            stay_days=bill_spec["stay_days"],
        )

        expected_lines = bill_spec["lines"]
        total_expected_lines += len(expected_lines)

        for idx, exp in enumerate(expected_lines):
            if idx < len(ver_out["lines"]):
                actual = ver_out["lines"][idx]
                if abs(actual["billed_total"] - float(exp["total"])) < 1.0:
                    correctly_extracted_lines += 1
                if actual["canonical_id"] == exp["expected_canonical_id"]:
                    correctly_matched_canonical += 1

                is_flagged = actual["status"] == "above_reference"
                exp_flagged = bool(exp["expected_flagged"])

                if is_flagged and exp_flagged:
                    true_positives_flag += 1
                elif is_flagged and not exp_flagged:
                    false_positives_flag += 1
                elif not is_flagged and not exp_flagged:
                    true_negatives_ok += 1
                elif not is_flagged and exp_flagged:
                    false_negatives_flag += 1

    ocr_accuracy = (correctly_extracted_lines / total_expected_lines) * 100.0
    match_recall = (correctly_matched_canonical / total_expected_lines) * 100.0
    flag_precision = (
        (true_positives_flag / max(true_positives_flag + false_positives_flag, 1)) * 100.0
    )
    flag_recall = (
        (true_positives_flag / max(true_positives_flag + false_negatives_flag, 1)) * 100.0
    )
    false_flag_rate = (
        (false_positives_flag / max(false_positives_flag + true_negatives_ok, 1)) * 100.0
    )

    benchmark_summary = {
        "golden_bills_tested": len(ground_truth),
        "total_lines_evaluated": total_expected_lines,
        "ocr_field_accuracy_pct": round(ocr_accuracy, 2),
        "canonical_match_accuracy_pct": round(match_recall, 2),
        "flag_precision_pct": round(flag_precision, 2),
        "flag_recall_pct": round(flag_recall, 2),
        "false_flag_rate_pct": round(false_flag_rate, 2),
        "confusion_matrix": {
            "true_positives_flagged": true_positives_flag,
            "false_positives_flagged": false_positives_flag,
            "true_negatives_ok": true_negatives_ok,
            "false_negatives_missed": false_negatives_flag,
        },
    }
    (ROOT_DIR / "data" / "golden_benchmark_results.json").write_text(
        json.dumps(benchmark_summary, indent=2), encoding="utf-8"
    )

    assert ocr_accuracy >= 95.0, f"OCR accuracy too low: {ocr_accuracy}%"
    assert match_recall >= 95.0, f"Match recall too low: {match_recall}%"
    assert false_flag_rate < 5.0, f"False flag rate exceeded 5%: {false_flag_rate}%"


def test_grounded_explainer_dispute_estimator_and_regulator_k_anonymity(engine: SmartMatchingEngine):
    from app.features import (
        answer_grounded_charge_question,
        estimate_pretreatment_cost,
        generate_dispute_letter_and_routes,
        generate_pdf_report_bytes,
        get_regulator_analytics_k_anonymous,
    )

    lines = [
        {"raw_text": "Consultation", "qty": 1, "unit_price": 1500.0, "total": 1500.0},
        {"raw_text": "Room charges", "qty": 1, "unit_price": 9000.0, "total": 9000.0},
        {"raw_text": "Lab tests", "qty": 1, "unit_price": 3000.0, "total": 3000.0},
    ]
    ver = engine.verify_bill(lines)
    flagged_line = ver["lines"][1]

    qa_en = answer_grounded_charge_question(flagged_line, "Why is this flagged and is the hospital legally bound?", lang="en")
    assert qa_en["strictly_grounded"] is True
    assert "CGHS" in qa_en["answer"]

    qa_hi = answer_grounded_charge_question(flagged_line, "यह अधिक क्यों है?", lang="hi")
    assert "संदर्भ दर" in qa_hi["answer"]

    dispute = generate_dispute_letter_and_routes("Indraprastha Metro Hospital", "DL", ver)
    assert "1915" in json.dumps(dispute["verified_grievance_routes"])
    assert "Room charges" in dispute["letter_en"]

    est = estimate_pretreatment_cost("TERM_PKG_LAP_CHOLE", city_tier="X", nabh_accredited=True)
    assert est["found"] is True
    assert est["estimated_govt_benchmark_total"] == 25300.0

    reg = get_regulator_analytics_k_anonymous(k_min=10)
    assert reg["k_anonymity_enforced"] is True
    assert all(c["sample_size_n"] >= 10 for c in reg["category_benchmarks"])

    pdf_bytes = generate_pdf_report_bytes(
        report_hash="a" * 64,
        prev_hash="0" * 64,
        hospital_name="Indraprastha Metro Hospital",
        verification=ver,
        verify_url="http://localhost:5173/verify/" + ("a" * 64),
    )
    assert pdf_bytes[:4] == b"%PDF"
    assert len(pdf_bytes) > 1500

