#!/usr/bin/env python3
"""
Step 0 ETL & Data Quality Report Generator for SwasthyaBillCheck (NMBTP).
Reads raw verified datasets from /data/raw/, validates schema & referential integrity,
computes deterministic 64-dim vector embeddings for canonical terms, populates
SQLite database (/data/swasthyabillcheck.db), and generates /data/quality_report.json.
"""

import hashlib
import json
import math
import sqlite3
import statistics
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT_DIR / "data" / "raw"
DB_PATH = ROOT_DIR / "data" / "swasthyabillcheck.db"
QUALITY_REPORT_PATH = ROOT_DIR / "data" / "quality_report.json"


def compute_deterministic_embedding(text: str, dim: int = 64) -> list[float]:
    """Computes a normalized character/word n-gram hash embedding (64-dim) for vector similarity."""
    vec = [0.0] * dim
    cleaned = text.lower().strip()
    tokens = cleaned.split()
    ngrams = list(tokens)
    for i in range(len(cleaned) - 2):
        ngrams.append(cleaned[i : i + 3])
    for ng in ngrams:
        h = int(hashlib.md5(ng.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 5) for v in vec]


def init_sqlite_db(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.executescript(
        """
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS rate_source (
            source_id TEXT PRIMARY KEY,
            scheme TEXT NOT NULL,
            name TEXT NOT NULL,
            authority TEXT NOT NULL,
            source_url TEXT NOT NULL,
            document_version TEXT NOT NULL,
            effective_from TEXT NOT NULL,
            effective_to TEXT,
            retrieval_date TEXT NOT NULL,
            licence_note TEXT NOT NULL,
            is_sample_seed INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            raw_sha256 TEXT
        );

        CREATE TABLE IF NOT EXISTS rate_version (
            version_id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL REFERENCES rate_source(source_id),
            version_label TEXT NOT NULL,
            retrieved_at TEXT NOT NULL,
            row_count INTEGER NOT NULL,
            added_count INTEGER NOT NULL DEFAULT 0,
            modified_count INTEGER NOT NULL DEFAULT 0,
            removed_count INTEGER NOT NULL DEFAULT 0,
            diff_summary TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS canonical_term (
            canonical_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_hi TEXT NOT NULL,
            category TEXT NOT NULL,
            unit TEXT NOT NULL,
            synonyms TEXT NOT NULL,
            icd10_code TEXT,
            loinc_code TEXT,
            atc_code TEXT,
            snomed_note TEXT,
            plain_description_en TEXT NOT NULL,
            plain_description_hi TEXT NOT NULL,
            embedding TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rate_item (
            rate_id TEXT PRIMARY KEY,
            canonical_id TEXT NOT NULL REFERENCES canonical_term(canonical_id),
            scheme TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            unit TEXT NOT NULL,
            rate REAL NOT NULL,
            tier TEXT NOT NULL DEFAULT 'X',
            nabh_flag INTEGER NOT NULL DEFAULT 1,
            ward_type TEXT NOT NULL DEFAULT 'all',
            state TEXT NOT NULL DEFAULT 'ALL',
            effective_from TEXT NOT NULL,
            effective_to TEXT,
            source_id TEXT NOT NULL REFERENCES rate_source(source_id),
            page_ref TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS drug_price (
            drug_id TEXT PRIMARY KEY,
            canonical_id TEXT NOT NULL REFERENCES canonical_term(canonical_id),
            generic_name TEXT NOT NULL,
            atc_code TEXT,
            unit TEXT NOT NULL,
            nppa_ceiling_price REAL,
            janaushadhi_mrp REAL,
            janaushadhi_drug_code TEXT,
            source_id TEXT NOT NULL REFERENCES rate_source(source_id)
        );

        CREATE TABLE IF NOT EXISTS hospital (
            hospital_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            state TEXT NOT NULL,
            city TEXT NOT NULL,
            tier TEXT NOT NULL,
            nabh_accredited INTEGER NOT NULL DEFAULT 1,
            cghs_empanelled INTEGER NOT NULL DEFAULT 0,
            pmjay_empanelled INTEGER NOT NULL DEFAULT 0,
            transparency_score INTEGER NOT NULL DEFAULT 75
        );

        CREATE TABLE IF NOT EXISTS grievance_route (
            route_id TEXT PRIMARY KEY,
            state TEXT NOT NULL,
            authority_name TEXT NOT NULL,
            category TEXT NOT NULL,
            toll_free TEXT,
            whatsapp_sms TEXT,
            portal_url TEXT NOT NULL,
            legal_basis TEXT NOT NULL,
            verified_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bill (
            bill_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            hospital_name TEXT,
            state TEXT NOT NULL DEFAULT 'DL',
            city_tier TEXT NOT NULL DEFAULT 'X',
            nabh_accredited INTEGER NOT NULL DEFAULT 1,
            ward_type TEXT NOT NULL DEFAULT 'semi_private',
            stay_days INTEGER NOT NULL DEFAULT 1,
            billed_total REAL NOT NULL DEFAULT 0,
            reference_total REAL NOT NULL DEFAULT 0,
            potential_savings REAL NOT NULL DEFAULT 0,
            flagged_count INTEGER NOT NULL DEFAULT 0,
            pii_redacted INTEGER NOT NULL DEFAULT 1,
            redaction_summary TEXT NOT NULL DEFAULT '{}',
            consent_timestamp TEXT NOT NULL,
            retention_days INTEGER NOT NULL DEFAULT 7,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bill_line (
            line_id TEXT PRIMARY KEY,
            bill_id TEXT NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
            line_index INTEGER NOT NULL,
            raw_text TEXT NOT NULL,
            canonical_id TEXT REFERENCES canonical_term(canonical_id),
            category TEXT NOT NULL,
            qty REAL NOT NULL DEFAULT 1,
            unit_price REAL NOT NULL DEFAULT 0,
            total REAL NOT NULL DEFAULT 0,
            confidence REAL NOT NULL DEFAULT 1.0,
            bbox TEXT
        );

        CREATE TABLE IF NOT EXISTS verification (
            verification_id TEXT PRIMARY KEY,
            line_id TEXT NOT NULL REFERENCES bill_line(line_id) ON DELETE CASCADE,
            bill_id TEXT NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
            comparator_scheme TEXT NOT NULL,
            rate_id TEXT REFERENCES rate_item(rate_id),
            reference_rate REAL,
            reference_unit_rate REAL,
            delta_amount REAL NOT NULL DEFAULT 0,
            delta_pct REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            reason_code TEXT NOT NULL,
            explanation_i18n TEXT NOT NULL,
            hospital_question_i18n TEXT NOT NULL,
            evidence TEXT NOT NULL,
            alternative_comparators TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS merkle_batch (
            batch_id TEXT PRIMARY KEY,
            merkle_root TEXT NOT NULL UNIQUE,
            report_count INTEGER NOT NULL,
            anchor_network TEXT NOT NULL DEFAULT 'local-merkle-ledger',
            anchor_tx_ref TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS report (
            report_id TEXT PRIMARY KEY,
            bill_id TEXT NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
            report_hash TEXT NOT NULL UNIQUE,
            prev_hash TEXT NOT NULL,
            merkle_batch_id TEXT REFERENCES merkle_batch(batch_id),
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_feedback (
            feedback_id TEXT PRIMARY KEY,
            report_hash TEXT NOT NULL REFERENCES report(report_hash) ON DELETE CASCADE,
            helpful INTEGER NOT NULL,
            comment TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            log_id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            actor_session TEXT NOT NULL,
            resource_id TEXT,
            details TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


def run_etl():
    manifest_file = RAW_DIR / "manifest.json"
    if not manifest_file.exists():
        from fetch_and_verify import main as fetch_main
        fetch_main()

    manifest = json.loads((RAW_DIR / "manifest.json").read_text(encoding="utf-8"))
    sources = json.loads((RAW_DIR / "sources.json").read_text(encoding="utf-8"))
    terms = json.loads((RAW_DIR / "canonical_terms.json").read_text(encoding="utf-8"))
    rates = json.loads((RAW_DIR / "rate_items.json").read_text(encoding="utf-8"))
    drugs = json.loads((RAW_DIR / "drug_prices.json").read_text(encoding="utf-8"))
    hospitals = json.loads((RAW_DIR / "hospitals.json").read_text(encoding="utf-8"))
    grievances = json.loads((RAW_DIR / "grievance_routes.json").read_text(encoding="utf-8"))

    conn = sqlite3.connect(DB_PATH)
    init_sqlite_db(conn)
    cur = conn.cursor()

    raw_sha = manifest["raw_files"]["data/raw/rate_items.json"]["sha256"]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Insert sources
    for s in sources:
        cur.execute(
            """
            INSERT OR REPLACE INTO rate_source (
                source_id, scheme, name, authority, source_url, document_version,
                effective_from, effective_to, retrieval_date, licence_note,
                is_sample_seed, notes, raw_sha256
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                s["source_id"],
                s["scheme"],
                s["name"],
                s["authority"],
                s["source_url"],
                s["document_version"],
                s["effective_from"],
                s["effective_to"],
                s["retrieval_date"],
                s["licence_note"],
                1 if s["is_sample_seed"] else 0,
                s["notes"],
                raw_sha,
            ),
        )

    # Insert canonical terms with 64-dim embeddings
    for t in terms:
        embed_text = f"{t['name']} {' '.join(t['synonyms'])}"
        emb = compute_deterministic_embedding(embed_text)
        cur.execute(
            """
            INSERT OR REPLACE INTO canonical_term (
                canonical_id, name, name_hi, category, unit, synonyms,
                icd10_code, loinc_code, atc_code, snomed_note,
                plain_description_en, plain_description_hi, embedding
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                t["canonical_id"],
                t["name"],
                t["name_hi"],
                t["category"],
                t["unit"],
                json.dumps(t["synonyms"], ensure_ascii=False),
                t["icd10_code"],
                t["loinc_code"],
                t["atc_code"],
                t["snomed_note"],
                t["plain_description_en"],
                t["plain_description_hi"],
                json.dumps(emb),
            ),
        )

    # Insert rate items
    for r in rates:
        cur.execute(
            """
            INSERT OR REPLACE INTO rate_item (
                rate_id, canonical_id, scheme, code, name, category, unit,
                rate, tier, nabh_flag, ward_type, state, effective_from,
                effective_to, source_id, page_ref
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r["rate_id"],
                r["canonical_id"],
                r["scheme"],
                r["code"],
                r["name"],
                r["category"],
                r["unit"],
                float(r["rate"]),
                r["tier"],
                1 if r["nabh_flag"] else 0,
                r["ward_type"],
                r["state"],
                r["effective_from"],
                r["effective_to"],
                r["source_id"],
                r["page_ref"],
            ),
        )

    # Insert drug prices
    for d in drugs:
        cur.execute(
            """
            INSERT OR REPLACE INTO drug_price (
                drug_id, canonical_id, generic_name, atc_code, unit,
                nppa_ceiling_price, janaushadhi_mrp, janaushadhi_drug_code, source_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                d["drug_id"],
                d["canonical_id"],
                d["generic_name"],
                d["atc_code"],
                d["unit"],
                d["nppa_ceiling_price"],
                d["janaushadhi_mrp"],
                d["janaushadhi_drug_code"],
                d["source_id"],
            ),
        )

    # Insert hospitals
    for h in hospitals:
        cur.execute(
            """
            INSERT OR REPLACE INTO hospital (
                hospital_id, name, state, city, tier,
                nabh_accredited, cghs_empanelled, pmjay_empanelled, transparency_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                h["hospital_id"],
                h["name"],
                h["state"],
                h["city"],
                h["tier"],
                1 if h["nabh_accredited"] else 0,
                1 if h["cghs_empanelled"] else 0,
                1 if h["pmjay_empanelled"] else 0,
                h["transparency_score"],
            ),
        )

    # Insert grievance routes
    for g in grievances:
        cur.execute(
            """
            INSERT OR REPLACE INTO grievance_route (
                route_id, state, authority_name, category, toll_free,
                whatsapp_sms, portal_url, legal_basis, verified_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                g["route_id"],
                g["state"],
                g["authority_name"],
                g["category"],
                g["toll_free"],
                g["whatsapp_sms"],
                g["portal_url"],
                g["legal_basis"],
                g["verified_at"],
            ),
        )

    # Record initial rate_version per source
    for s in sources:
        src_rates = [r for r in rates if r["source_id"] == s["source_id"]]
        ver_id = f"VER_{s['source_id']}_202611"
        cur.execute(
            """
            INSERT OR REPLACE INTO rate_version (
                version_id, source_id, version_label, retrieved_at,
                row_count, added_count, modified_count, removed_count, diff_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ver_id,
                s["source_id"],
                s["document_version"],
                now_iso,
                len(src_rates),
                len(src_rates),
                0,
                0,
                json.dumps({"status": "baseline_seeded", "sha256": raw_sha}),
            ),
        )

    conn.commit()

    # Build Data Quality Report (row counts, null rates, duplicates, rate outliers, coverage by specialty/category)
    source_ids = {s["source_id"] for s in sources}
    term_ids = {t["canonical_id"] for t in terms}
    orphan_source_refs = [r["rate_id"] for r in rates if r["source_id"] not in source_ids]
    orphan_term_refs = [r["rate_id"] for r in rates if r["canonical_id"] not in term_ids]

    rate_ids = [r["rate_id"] for r in rates]
    duplicate_rate_ids = len(rate_ids) - len(set(rate_ids))

    null_required_count = sum(
        1
        for r in rates
        if not r.get("rate_id")
        or not r.get("canonical_id")
        or not r.get("source_id")
        or r.get("rate") is None
        or not r.get("page_ref")
    )

    category_coverage = {}
    scheme_coverage = {}
    for r in rates:
        cat = r["category"]
        sch = r["scheme"]
        category_coverage[cat] = category_coverage.get(cat, 0) + 1
        scheme_coverage[sch] = scheme_coverage.get(sch, 0) + 1

    # Outlier analysis per category (z-score > 3 check)
    outliers = []
    for cat in set(r["category"] for r in rates):
        vals = [float(r["rate"]) for r in rates if r["category"] == cat and float(r["rate"]) > 0]
        if len(vals) >= 3:
            mean_val = statistics.mean(vals)
            stdev_val = statistics.stdev(vals) or 1.0
            for r in rates:
                if r["category"] == cat:
                    z = abs(float(r["rate"]) - mean_val) / stdev_val
                    if z > 3.0:
                        outliers.append({"rate_id": r["rate_id"], "rate": r["rate"], "z_score": round(z, 2)})

    quality_report = {
        "generated_at": now_iso,
        "database_path": str(DB_PATH.relative_to(ROOT_DIR)),
        "row_counts": {
            "rate_source": len(sources),
            "canonical_term": len(terms),
            "rate_item": len(rates),
            "drug_price": len(drugs),
            "hospital": len(hospitals),
            "grievance_route": len(grievances),
        },
        "integrity_checks": {
            "orphan_source_references": len(orphan_source_refs),
            "orphan_canonical_term_references": len(orphan_term_refs),
            "duplicate_rate_ids": duplicate_rate_ids,
            "null_required_fields_count": null_required_count,
            "null_rate_pct": round((null_required_count / max(len(rates), 1)) * 100.0, 2),
            "all_rates_traceable_to_source": len(orphan_source_refs) == 0 and null_required_count == 0,
        },
        "coverage_by_category": category_coverage,
        "coverage_by_scheme": scheme_coverage,
        "statistical_outliers_z3": outliers,
    }

    QUALITY_REPORT_PATH.write_text(json.dumps(quality_report, indent=2, ensure_ascii=False), encoding="utf-8")
    conn.close()
    print(f"[ETL] Seeded SQLite DB at {DB_PATH}")
    print(f"[ETL] Quality Report saved to {QUALITY_REPORT_PATH}: traceable={quality_report['integrity_checks']['all_rates_traceable_to_source']}")
    return quality_report


if __name__ == "__main__":
    run_etl()
