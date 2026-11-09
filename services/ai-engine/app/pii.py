"""
DPDP Act 2023 Compliant PII Redaction Engine for SwasthyaBillCheck (NMBTP).
Detects and masks Patient Name, Phone Number, Aadhaar (12-digit), UHID/MRN,
and Email before storage or logging.
"""

import re
from typing import Any

PHONE_RE = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b")
AADHAAR_RE = re.compile(r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b")
UHID_RE = re.compile(r"\b(?:UHID|MRN|IPD\s*NO|REG\s*NO|PATIENT\s*ID)\s*[:\-]?\s*([A-Z0-9\/\-]{4,18})", re.IGNORECASE)
PATIENT_NAME_RE = re.compile(
    r"\b(?:Patient\s*Name|Name\s*of\s*Patient|Pt\.\s*Name|मरीज\s*का\s*नाम)\s*[:\-]\s*([A-Za-z\s\.]{3,35})(?=\n|\r|Age|Sex|UHID|Phone|Date|$)",
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")


def redact_text_pii(text: str) -> dict[str, Any]:
    """Redacts sensitive personal identifiers from bill text and returns summary counts."""
    if not text:
        return {"redacted_text": "", "counts": {"phone": 0, "aadhaar": 0, "uhid": 0, "patient_name": 0, "email": 0}, "pii_found": False}

    redacted = text
    counts = {"phone": 0, "aadhaar": 0, "uhid": 0, "patient_name": 0, "email": 0}

    def _mask_name(m: re.Match) -> str:
        counts["patient_name"] += 1
        prefix = m.group(0).split(":")[0] if ":" in m.group(0) else "Patient Name"
        return f"{prefix}: [REDACTED_PATIENT]"

    redacted = PATIENT_NAME_RE.sub(_mask_name, redacted)

    def _mask_uhid(m: re.Match) -> str:
        counts["uhid"] += 1
        return "UHID: [REDACTED_ID]"

    redacted = UHID_RE.sub(_mask_uhid, redacted)

    aadhaar_matches = AADHAAR_RE.findall(redacted)
    counts["aadhaar"] = len(aadhaar_matches)
    redacted = AADHAAR_RE.sub("XXXX-XXXX-[REDACTED]", redacted)

    phone_matches = PHONE_RE.findall(redacted)
    counts["phone"] = len(phone_matches)
    redacted = PHONE_RE.sub("+91-XXXXXX[REDACTED]", redacted)

    email_matches = EMAIL_RE.findall(redacted)
    counts["email"] = len(email_matches)
    redacted = EMAIL_RE.sub("[REDACTED_EMAIL]", redacted)

    total_found = sum(counts.values())
    return {
        "redacted_text": redacted,
        "counts": counts,
        "pii_found": total_found > 0,
    }
