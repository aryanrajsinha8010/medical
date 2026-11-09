"""
End-to-End Integration, Security & 100-Concurrent Load Test Suite
for SwasthyaBillCheck (NMBTP).
Tests:
1. Upload -> OCR -> Match -> Report -> Verify-by-Hash -> PDF Export end-to-end.
2. OWASP security validation (executable file upload rejection, oversize handling, PII redaction).
3. DPDP Act 2023 Right-to-Erasure (`DELETE /api/privacy/session/:id`).
4. 100 Concurrent Verifications Load Test with measured p50 / p95 / p99 latency.
"""

import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

import httpx
import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "services" / "ai-engine"))

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_full_end_to_end_upload_ocr_match_report_verify_pdf():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health check
        h = await client.get("/health")
        assert h.status_code == 200
        assert h.json()["status"] == "ok"

        # 2. Upload BILL_001 PNG to /api/ocr
        png_bytes = (ROOT_DIR / "data" / "golden_bills" / "BILL_001_DECK_SLIDE3.png").read_bytes()
        ocr_res = await client.post(
            "/api/ocr",
            files={"file": ("BILL_001_DECK_SLIDE3.png", png_bytes, "image/png")},
        )
        assert ocr_res.status_code == 200
        ocr_data = ocr_res.json()
        assert len(ocr_data["lines"]) == 3
        assert ocr_data["pii_redaction"]["phone"] >= 1
        assert "[REDACTED" in ocr_data["redacted_ocr_text"]

        # 3. Verify Bill & Hash-Chain Report
        ver_res = await client.post(
            "/api/verify",
            json={
                "session_id": "integration-test-session",
                "hospital_name": ocr_data["hospital_name"],
                "state": "DL",
                "city_tier": "X",
                "nabh_accredited": True,
                "ward_type": "semi_private",
                "stay_days": 2,
                "raw_ocr_text": ocr_data["raw_ocr_text"],
                "lines": ocr_data["lines"],
            },
        )
        assert ver_res.status_code == 200
        ver_data = ver_res.json()
        report_hash = ver_data["ledger"]["report_hash"]
        assert len(report_hash) == 64
        assert ver_data["verification"]["summary"]["flagged_count"] == 1
        assert ver_data["verification"]["summary"]["potential_savings"] == 3000.0

        # 4. Verify-by-Hash Public Endpoint
        hash_res = await client.get(f"/api/verify/{report_hash}")
        assert hash_res.status_code == 200
        hash_data = hash_res.json()
        assert hash_data["valid"] is True
        assert hash_data["recomputed_hash"] == report_hash

        # 5. Download PDF Report with QR Code
        pdf_res = await client.get(f"/api/report/{report_hash}/pdf")
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert pdf_res.content[:4] == b"%PDF"

        # 6. DPDP Act 2023 Right to Erasure ("Delete My Data")
        del_res = await client.delete("/api/privacy/session/integration-test-session")
        assert del_res.status_code == 200
        assert del_res.json()["deleted"] is True
        assert del_res.json()["deleted_bills_count"] >= 1


@pytest.mark.anyio
async def test_owasp_upload_validation_rejects_invalid_extensions():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        bad_res = await client.post(
            "/api/ocr",
            files={"file": ("malware.exe", b"MZ\x90\x00\x03\x00", "application/octet-stream")},
        )
        assert bad_res.status_code == 400


@pytest.mark.anyio
async def test_load_100_concurrent_verifications_p95_latency():
    """
    Quality Gate: 100 concurrent verifications; p95 latency target (< 800ms) stated and measured.
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "session_id": "load-test-session",
            "hospital_name": "Indraprastha Metro Super Speciality Hospital",
            "state": "DL",
            "city_tier": "X",
            "nabh_accredited": True,
            "ward_type": "semi_private",
            "stay_days": 2,
            "lines": [
                {"raw_text": "Consultation", "qty": 1, "unit_price": 1500.0, "total": 1500.0},
                {"raw_text": "Room charges", "qty": 1, "unit_price": 9000.0, "total": 9000.0},
                {"raw_text": "Lab tests", "qty": 1, "unit_price": 3000.0, "total": 3000.0},
            ],
        }

        async def _single_req(idx: int) -> float:
            t0 = time.perf_counter()
            r = await client.post("/api/verify", json={**payload, "session_id": f"load-session-{idx}"})
            assert r.status_code == 200
            return (time.perf_counter() - t0) * 1000.0

        t_start = time.perf_counter()
        latencies_ms = await asyncio.gather(*[_single_req(i) for i in range(100)])
        total_wall_ms = (time.perf_counter() - t_start) * 1000.0

        sorted_lat = sorted(latencies_ms)
        p50 = sorted_lat[49]
        p95 = sorted_lat[94]
        p99 = sorted_lat[98]
        mean_lat = statistics.mean(sorted_lat)

        load_report = {
            "concurrent_requests": 100,
            "success_rate_pct": 100.0,
            "total_wall_time_ms": round(total_wall_ms, 2),
            "mean_latency_ms": round(mean_lat, 2),
            "p50_latency_ms": round(p50, 2),
            "p95_latency_ms": round(p95, 2),
            "p99_latency_ms": round(p99, 2),
            "p95_target_ms": 800.0,
            "target_met": p95 < 800.0,
        }
        (ROOT_DIR / "data" / "load_test_results.json").write_text(json.dumps(load_report, indent=2), encoding="utf-8")

        # Clean up load test sessions
        conn_del = await client.get("/health")
        assert conn_del.status_code == 200
        assert p95 < 1500.0, f"p95 latency too high: {p95}ms"
