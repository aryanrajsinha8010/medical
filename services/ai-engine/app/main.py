"""
FastAPI Service (`services/ai-engine/app/main.py`) for SwasthyaBillCheck (NMBTP).
Exposes OCR + OpenCV preprocessing, PII redaction, 6-stage canonical matching,
hash-chained ledger persistence, Merkle-root anchoring, grounded charge explainer chat,
dispute letter + grievance routing, pre-treatment cost estimator, insurer claim validation,
regulator k-anonymity analytics, and PDF/QR generation.
"""

import base64
import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.features import (
    answer_grounded_charge_question,
    estimate_pretreatment_cost,
    generate_dispute_letter_and_routes,
    generate_pdf_report_bytes,
    get_regulator_analytics_k_anonymous,
)
from app.ledger import (
    GENESIS_HASH,
    OptionalChainAnchorAdapter,
    compute_merkle_root,
    compute_report_hash,
    verify_hash_chain,
)
from app.matcher import SmartMatchingEngine
from app.ocr import extract_bill_from_bytes, parse_structured_lines_from_text
from app.pii import redact_text_pii

ROOT_DIR = Path(__file__).resolve().parents[3]
DB_PATH = ROOT_DIR / "data" / "swasthyabillcheck.db"
GOLDEN_DIR = ROOT_DIR / "data" / "golden_bills"

app = FastAPI(
    title="SwasthyaBillCheck AI/OCR & Matching Engine",
    version="1.0.0",
    description="National Medical Bill Transparency Platform (NMBTP) — Team TechNova (SBI Youth Ideathon 2026)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SmartMatchingEngine(DB_PATH)
chain_adapter = OptionalChainAnchorAdapter("ethereum-sepolia-optional-adapter")


class LineItemInput(BaseModel):
    line_id: str | None = None
    raw_text: str
    qty: float = 1.0
    unit_price: float = 0.0
    total: float
    confidence: float = 0.95
    bbox: dict[str, float] | None = None


class VerifyBillRequest(BaseModel):
    session_id: str = "demo-citizen-session"
    hospital_name: str = "Indraprastha Metro Super Speciality Hospital"
    state: str = "DL"
    city_tier: str = "X"
    nabh_accredited: bool = True
    ward_type: str = "semi_private"
    stay_days: int = 2
    retention_days: int = 7
    declared_grand_total: float | None = None
    raw_ocr_text: str | None = None
    lines: list[LineItemInput]


class AskChargeRequest(BaseModel):
    line_verification: dict[str, Any]
    question: str
    lang: str = "en"


class DisputeLetterRequest(BaseModel):
    hospital_name: str
    state: str = "DL"
    verification: dict[str, Any]


class EstimatorRequest(BaseModel):
    canonical_id: str
    city_tier: str = "X"
    nabh_accredited: bool = True
    ward_type: str = "semi_private"
    stay_days: int = 2


class FeedbackRequest(BaseModel):
    report_hash: str
    helpful: bool
    comment: str | None = None


import threading

_DB_WRITE_LOCK = threading.Lock()
_SHARED_CONN: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _SHARED_CONN
    if _SHARED_CONN is None:
        conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=OFF;")
        conn.execute("PRAGMA temp_store=MEMORY;")
        conn.execute("PRAGMA cache_size=-64000;")
        conn.execute("PRAGMA busy_timeout=30000;")
        _SHARED_CONN = conn
    return _SHARED_CONN


def _persist_verified_bill_and_ledger(req: VerifyBillRequest, verification: dict[str, Any], pii_summary: dict[str, Any]) -> dict[str, Any]:
    with _DB_WRITE_LOCK:
        return _persist_verified_bill_and_ledger_locked(req, verification, pii_summary)


def _persist_verified_bill_and_ledger_locked(req: VerifyBillRequest, verification: dict[str, Any], pii_summary: dict[str, Any]) -> dict[str, Any]:
    conn = _get_conn()
    cur = conn.cursor()

    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    expires_iso = (now + timedelta(days=max(1, req.retention_days))).strftime("%Y-%m-%dT%H:%M:%SZ")
    bill_id = f"BILL_{now.strftime('%Y%m%d')}_{uuid.uuid4().hex[:8].upper()}"

    summary = verification["summary"]
    cur.execute(
        """
        INSERT INTO bill (
            bill_id, session_id, hospital_name, state, city_tier, nabh_accredited,
            ward_type, stay_days, billed_total, reference_total, potential_savings,
            flagged_count, pii_redacted, redaction_summary, consent_timestamp,
            retention_days, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            bill_id,
            req.session_id,
            req.hospital_name,
            req.state,
            req.city_tier,
            1 if req.nabh_accredited else 0,
            req.ward_type,
            req.stay_days,
            summary["billed_total"],
            summary["reference_total"],
            summary["potential_savings"],
            summary["flagged_count"],
            1,
            json.dumps(pii_summary),
            now_iso,
            req.retention_days,
            expires_iso,
            now_iso,
        ),
    )

    for l in verification["lines"]:
        cur.execute(
            """
            INSERT INTO bill_line (
                line_id, bill_id, line_index, raw_text, canonical_id, category,
                qty, unit_price, total, confidence, bbox
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                l["line_id"],
                bill_id,
                l["line_index"],
                l["raw_text"],
                l["canonical_id"],
                l["category"],
                l["qty"],
                l["unit_price"],
                l["billed_total"],
                l["confidence"],
                json.dumps(l["bbox"]),
            ),
        )
        cur.execute(
            """
            INSERT INTO verification (
                verification_id, line_id, bill_id, comparator_scheme, rate_id,
                reference_rate, reference_unit_rate, delta_amount, delta_pct,
                status, reason_code, explanation_i18n, hospital_question_i18n,
                evidence, alternative_comparators
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"VER_{uuid.uuid4().hex[:10].upper()}",
                l["line_id"],
                bill_id,
                l["evidence"].get("scheme", "NONE"),
                None,
                l["reference_total"],
                l["reference_unit_rate"],
                l["delta_amount"],
                l["delta_pct"],
                l["status"],
                l["reason_code"],
                json.dumps(l["explanation_i18n"], ensure_ascii=False),
                json.dumps(l["hospital_question_i18n"], ensure_ascii=False),
                json.dumps(l["evidence"], ensure_ascii=False),
                json.dumps(l["alternative_comparators"], ensure_ascii=False),
            ),
        )

    # Fetch head of hash-chained audit ledger
    last_row = cur.execute("SELECT report_hash FROM report ORDER BY created_at DESC, rowid DESC LIMIT 1").fetchone()
    prev_hash = last_row["report_hash"] if last_row else GENESIS_HASH

    ledger_payload = {
        "bill_id": bill_id,
        "hospital_name": req.hospital_name,
        "state": req.state,
        "city_tier": req.city_tier,
        "ward_type": req.ward_type,
        "billed_total": summary["billed_total"],
        "reference_total": summary["reference_total"],
        "potential_savings": summary["potential_savings"],
        "flagged_count": summary["flagged_count"],
        "lines_digest": [
            {
                "canonical_id": l["canonical_id"],
                "billed": l["billed_total"],
                "ref": l["reference_total"],
                "status": l["status"],
                "scheme": l["evidence"].get("scheme"),
                "code": l["evidence"].get("rate_code"),
            }
            for l in verification["lines"]
        ],
        "timestamp": now_iso,
    }
    report_hash = compute_report_hash(ledger_payload, prev_hash)
    report_id = f"REP_{uuid.uuid4().hex[:10].upper()}"

    # Anchor Merkle batch
    recent_hashes = [r["report_hash"] for r in cur.execute("SELECT report_hash FROM report ORDER BY rowid DESC LIMIT 7").fetchall()]
    recent_hashes.append(report_hash)
    merkle_root = compute_merkle_root(recent_hashes)
    anchor_info = chain_adapter.anchor_merkle_root(merkle_root, len(recent_hashes))

    cur.execute(
        """
        INSERT OR IGNORE INTO merkle_batch (batch_id, merkle_root, report_count, anchor_network, anchor_tx_ref, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            anchor_info["batch_id"],
            anchor_info["merkle_root"],
            anchor_info["report_count"],
            anchor_info["anchor_network"],
            anchor_info["anchor_tx_ref"],
            now_iso,
        ),
    )
    batch_row = cur.execute("SELECT batch_id, anchor_network, anchor_tx_ref FROM merkle_batch WHERE merkle_root = ?", (merkle_root,)).fetchone()
    batch_id = batch_row["batch_id"] if batch_row else anchor_info["batch_id"]

    full_stored_payload = {
        "ledger_payload": ledger_payload,
        "hospital_name": req.hospital_name,
        "verification": verification,
        "pii_redaction": pii_summary,
    }

    cur.execute(
        """
        INSERT INTO report (report_id, bill_id, report_hash, prev_hash, merkle_batch_id, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report_id,
            bill_id,
            report_hash,
            prev_hash,
            batch_id,
            json.dumps(full_stored_payload, ensure_ascii=False),
            now_iso,
        ),
    )

    cur.execute(
        """
        INSERT INTO audit_log (log_id, event_type, actor_session, resource_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"LOG_{uuid.uuid4().hex[:10].upper()}",
            "BILL_VERIFIED_AND_HASH_CHAINED",
            req.session_id,
            report_hash,
            json.dumps({"bill_id": bill_id, "prev_hash": prev_hash, "merkle_root": merkle_root}),
            now_iso,
        ),
    )

    conn.commit()

    return {
        "bill_id": bill_id,
        "report_id": report_id,
        "report_hash": report_hash,
        "prev_hash": prev_hash,
        "merkle_root": merkle_root,
        "merkle_batch_id": batch_id,
        "anchor_network": batch_row["anchor_network"] if batch_row else anchor_info["anchor_network"],
        "anchor_tx_ref": batch_row["anchor_tx_ref"] if batch_row else anchor_info["anchor_tx_ref"],
        "created_at": now_iso,
        "expires_at": expires_iso,
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "swasthyabillcheck-ai-engine", "terms_loaded": len(engine.terms)}


@app.get("/api/rates")
def list_rates(scheme: str | None = None, category: str | None = None, q: str | None = None):
    conn = _get_conn()
    cur = conn.cursor()
    sources = [dict(r) for r in cur.execute("SELECT * FROM rate_source").fetchall()]
    sql = """
        SELECT r.*, t.name as canonical_name, t.name_hi as canonical_name_hi,
               t.synonyms, t.plain_description_en, t.plain_description_hi,
               t.icd10_code, t.loinc_code, t.atc_code,
               d.janaushadhi_mrp, d.janaushadhi_drug_code, d.generic_name,
               s.source_url, s.document_version, s.is_sample_seed, s.licence_note
        FROM rate_item r
        JOIN canonical_term t ON r.canonical_id = t.canonical_id
        JOIN rate_source s ON r.source_id = s.source_id
        LEFT JOIN drug_price d ON r.canonical_id = d.canonical_id
        WHERE 1=1
    """
    params: list[Any] = []
    if scheme:
        sql += " AND r.scheme = ?"
        params.append(scheme.upper())
    if category:
        sql += " AND r.category = ?"
        params.append(category.lower())
    rows = []
    for raw_r in cur.execute(sql, params).fetchall():
        d_row = dict(raw_r)
        try:
            d_row["synonyms_list"] = json.loads(d_row.get("synonyms") or "[]")
        except Exception:
            d_row["synonyms_list"] = []
        rows.append(d_row)

    if q and q.strip():
        ql = q.strip().lower()
        exact_matches = []
        for r in rows:
            searchable = " ".join(
                [
                    str(r.get("name") or ""),
                    str(r.get("canonical_name") or ""),
                    str(r.get("canonical_name_hi") or ""),
                    str(r.get("code") or ""),
                    str(r.get("category") or ""),
                    str(r.get("icd10_code") or ""),
                    str(r.get("loinc_code") or ""),
                    str(r.get("atc_code") or ""),
                    str(r.get("generic_name") or ""),
                    str(r.get("plain_description_en") or ""),
                    " ".join(r.get("synonyms_list") or []),
                ]
            ).lower()
            if ql in searchable or any(tok in searchable for tok in ql.split() if len(tok) >= 3):
                exact_matches.append(r)

        if exact_matches:
            rows = exact_matches
        else:
            # Semantic / Fuzzy Trigram fallback via SmartMatchingEngine
            canon = engine.canonicalize_line(q.strip())
            cand_ids = {c["canonical_id"] for c in canon.get("top_candidates", []) if c.get("match_score", 0) >= 0.35}
            rows = [r for r in rows if r["canonical_id"] in cand_ids]

    return {"sources": sources, "rates": rows, "count": len(rows)}


@app.get("/api/demo-bills")
def list_demo_bills():
    gt_path = GOLDEN_DIR / "ground_truth.json"
    if not gt_path.exists():
        return {"bills": []}
    gt = json.loads(gt_path.read_text(encoding="utf-8"))
    return {"bills": gt[:12], "total_golden_bills": len(gt)}


@app.get("/api/demo-bills/{bill_id}/image")
def get_demo_bill_image(bill_id: str):
    png_path = GOLDEN_DIR / f"{bill_id}.png"
    if not png_path.exists():
        raise HTTPException(status_code=404, detail="Demo bill image not found")
    return Response(content=png_path.read_bytes(), media_type="image/png")


@app.post("/api/ocr")
async def ocr_upload(file: UploadFile = File(...)):
    allowed_ext = (".png", ".jpg", ".jpeg", ".webp", ".pdf")
    fname = file.filename or "upload.png"
    if not any(fname.lower().endswith(ext) for ext in allowed_ext):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload PNG, JPG, WEBP, or PDF.")
    content = await file.read()
    if len(content) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 12MB upload limit.")

    extracted = extract_bill_from_bytes(content, filename=fname)
    pii_res = redact_text_pii(extracted.get("raw_ocr_text", ""))
    extracted["redacted_ocr_text"] = pii_res["redacted_text"]
    extracted["pii_redaction"] = pii_res["counts"]
    return extracted


@app.post("/api/verify")
def verify_and_record_bill(req: VerifyBillRequest):
    pii_res = redact_text_pii(req.raw_ocr_text or "")
    lines_dicts = [l.model_dump() for l in req.lines]
    verification = engine.verify_bill(
        lines=lines_dicts,
        city_tier=req.city_tier,
        nabh_accredited=req.nabh_accredited,
        ward_type=req.ward_type,
        state=req.state,
        stay_days=req.stay_days,
        declared_grand_total=req.declared_grand_total,
    )
    ledger_meta = _persist_verified_bill_and_ledger(req, verification, pii_res["counts"])
    dispute = generate_dispute_letter_and_routes(req.hospital_name, req.state, verification, DB_PATH)
    return {
        "ledger": ledger_meta,
        "hospital_name": req.hospital_name,
        "pii_redaction": pii_res["counts"],
        "verification": verification,
        "dispute_pack": dispute,
    }


@app.get("/api/verify/{report_hash}")
def verify_report_by_hash(report_hash: str):
    conn = _get_conn()
    cur = conn.cursor()
    row = cur.execute(
        """
        SELECT r.*, m.merkle_root, m.anchor_network, m.anchor_tx_ref
        FROM report r
        LEFT JOIN merkle_batch m ON r.merkle_batch_id = m.batch_id
        WHERE r.report_hash = ?
        """,
        (report_hash,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Report hash not found in tamper-evident ledger")

    stored = json.loads(row["payload_json"])
    recomputed = compute_report_hash(stored["ledger_payload"], row["prev_hash"])
    tamper_free = recomputed == row["report_hash"]

    return {
        "valid": tamper_free,
        "report_id": row["report_id"],
        "bill_id": row["bill_id"],
        "report_hash": row["report_hash"],
        "recomputed_hash": recomputed,
        "prev_hash": row["prev_hash"],
        "merkle_root": row["merkle_root"],
        "anchor_network": row["anchor_network"],
        "anchor_tx_ref": row["anchor_tx_ref"],
        "created_at": row["created_at"],
        "hospital_name": stored.get("hospital_name"),
        "verification": stored.get("verification"),
    }


@app.get("/api/report/{report_hash}/pdf")
def download_report_pdf(report_hash: str):
    data = verify_report_by_hash(report_hash)
    verify_url = f"http://localhost:5173/verify/{report_hash}"
    pdf_bytes = generate_pdf_report_bytes(
        report_hash=report_hash,
        prev_hash=data["prev_hash"],
        hospital_name=data["hospital_name"] or "Hospital",
        verification=data["verification"],
        verify_url=verify_url,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="SwasthyaBillCheck_{report_hash[:10]}.pdf"'},
    )


@app.get("/api/history")
def get_verification_history(session_id: str = "demo-citizen-session"):
    conn = _get_conn()
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT b.bill_id, b.hospital_name, b.state, b.city_tier, b.ward_type,
               b.billed_total, b.reference_total, b.potential_savings, b.flagged_count,
               b.created_at, b.expires_at, r.report_hash, r.prev_hash
        FROM bill b
        JOIN report r ON b.bill_id = r.bill_id
        WHERE b.session_id = ?
        ORDER BY b.created_at DESC
        LIMIT 30
        """,
        (session_id,),
    ).fetchall()
    return {"history": [dict(r) for r in rows]}


@app.delete("/api/privacy/session/{session_id}")
def delete_my_data_dpdp(session_id: str):
    """DPDP Act 2023 Right to Erasure ('Delete My Data' button)."""
    conn = _get_conn()
    cur = conn.cursor()
    count = cur.execute("SELECT COUNT(*) FROM bill WHERE session_id = ?", (session_id,)).fetchone()[0]
    cur.execute("DELETE FROM bill WHERE session_id = ?", (session_id,))
    cur.execute(
        """
        INSERT INTO audit_log (log_id, event_type, actor_session, resource_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"LOG_{uuid.uuid4().hex[:10].upper()}",
            "DPDP_RIGHT_TO_ERASURE_EXECUTED",
            session_id,
            session_id,
            json.dumps({"deleted_bills": count}),
            datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        ),
    )
    conn.commit()
    return {"deleted": True, "deleted_bills_count": count, "session_id": session_id}


@app.post("/api/ask-charge")
def ask_about_charge(req: AskChargeRequest):
    return answer_grounded_charge_question(req.line_verification, req.question, req.lang)


@app.post("/api/dispute-letter")
def build_dispute_letter(req: DisputeLetterRequest):
    return generate_dispute_letter_and_routes(req.hospital_name, req.state, req.verification, DB_PATH)


@app.post("/api/estimator")
def run_pretreatment_estimator(req: EstimatorRequest):
    return estimate_pretreatment_cost(
        req.canonical_id,
        req.city_tier,
        req.nabh_accredited,
        req.ward_type,
        req.stay_days,
        DB_PATH,
    )


@app.post("/api/insurer/validate-claim")
def insurer_claim_validation_api(req: VerifyBillRequest):
    """Insurer Claim Validation API (Slide 5 & Slide 7)."""
    lines_dicts = [l.model_dump() for l in req.lines]
    ver = engine.verify_bill(
        lines=lines_dicts,
        city_tier=req.city_tier,
        nabh_accredited=req.nabh_accredited,
        ward_type=req.ward_type,
        state=req.state,
        stay_days=req.stay_days,
    )
    admissible_amount = ver["summary"]["reference_total"]
    disallowed_delta = ver["summary"]["potential_savings"]
    return {
        "claim_status": "REVIEW_REQUIRED" if disallowed_delta > 0 else "AUTO_ADMISSIBLE",
        "claimed_total_inr": ver["summary"]["billed_total"],
        "admissible_govt_benchmark_inr": admissible_amount,
        "flagged_variance_inr": disallowed_delta,
        "flagged_line_count": ver["summary"]["flagged_count"],
        "line_adjudication": ver["lines"],
    }


@app.get("/api/analytics/regulator")
def regulator_policy_analytics():
    return get_regulator_analytics_k_anonymous(DB_PATH, k_min=10)


@app.post("/api/feedback")
def submit_feedback(req: FeedbackRequest):
    conn = _get_conn()
    cur = conn.cursor()
    fid = f"FB_{uuid.uuid4().hex[:10].upper()}"
    cur.execute(
        "INSERT INTO user_feedback (feedback_id, report_hash, helpful, comment, created_at) VALUES (?, ?, ?, ?, ?)",
        (fid, req.report_hash, 1 if req.helpful else 0, req.comment, datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")),
    )
    conn.commit()
    return {"saved": True, "feedback_id": fid}
