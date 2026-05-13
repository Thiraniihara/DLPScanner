from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import hashlib
import secrets
import json
import re
import datetime
import uuid
import os
import io
import logging
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


MODEL_PATH = "./pii-transformer-final"


USE_TRANSFORMER = True

# ══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="DLP Scanner API",
    description="AI-Powered Data Loss Prevention Scanner",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
DB_PATH = "dlp_scanner.db"
SECRET_KEY = "dlp-scanner-secret-key-2024-pusl3190"

# ─── Load Transformer Model ───────────────────────────────────────────────────

transformer_model = None
transformer_tokenizer = None
id2label = {}
MODEL_STATUS = "not_loaded"


def load_transformer():
    global transformer_model, transformer_tokenizer, id2label, MODEL_STATUS

    if not USE_TRANSFORMER:
        MODEL_STATUS = "disabled"
        logger.info("Transformer disabled. Using regex only.")
        return

    if not os.path.exists(MODEL_PATH):
        MODEL_STATUS = "folder_not_found"
        logger.warning(
            f"\n  Model folder '{MODEL_PATH}' not found.\n"
            f"  Steps to fix:\n"
            f"  1. In Colab, go to Files panel (folder icon on left)\n"
            f"  2. Right-click 'pii-transformer-final' folder → Download\n"
            f"  3. Extract it and place the folder inside your /backend directory\n"
            f"  4. Restart the server\n"
            f"  Running with regex-only detection for now.\n"
        )
        return

    try:
        logger.info(f"Loading transformer model from: {MODEL_PATH} ...")
        
        transformer_tokenizer = AutoTokenizer.from_pretrained(
            MODEL_PATH, add_prefix_space=True
        )
        transformer_model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
        transformer_model.eval()
        id2label = transformer_model.config.id2label

        logger.info(f"Model loaded successfully! {len(id2label)} entity types.")
        MODEL_STATUS = "loaded"

    except Exception as e:
        MODEL_STATUS = "load_error"
        logger.error(f"Failed to load model: {e}\nFalling back to regex detection.")
        transformer_model = None
        transformer_tokenizer = None


load_transformer()

# ─── Database Setup ───────────────────────────────────────────────────────────


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'analyst',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        data_types TEXT NOT NULL,
        sensitivity_level TEXT NOT NULL,
        action TEXT DEFAULT 'alert',
        enabled INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scan_jobs (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        status TEXT DEFAULT 'pending',
        total_findings INTEGER DEFAULT 0,
        risk_score INTEGER DEFAULT 0,
        detection_method TEXT DEFAULT 'regex',
        scanned_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        masked_value TEXT NOT NULL,
        context TEXT,
        severity TEXT NOT NULL,
        detection_source TEXT DEFAULT 'regex',
        start_pos INTEGER,
        end_pos INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scan_id) REFERENCES scan_jobs(id)
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    admin_id = str(uuid.uuid4())
    pw_hash = hashlib.sha256(("admin123" + SECRET_KEY).encode()).hexdigest()
    cur.execute("""
        INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
    """, (admin_id, "admin@dlpscanner.com", pw_hash, "System Administrator", "admin"))

    default_policies = [
        ("PII Detection", "Names, emails, phones, SSN, DOB",
         '["FIRSTNAME","LASTNAME","EMAIL","PHONENUMBER","SSN","DOB"]', "High", "alert"),
        ("Financial Data", "Credit cards, IBAN, account numbers",
         '["CREDITCARDNUMBER","IBAN","BIC","ACCOUNTNUMBER"]', "Critical", "block"),
        ("Network Identifiers", "IPs, MAC addresses, URLs",
         '["IP","IPV4","IPV6","MAC","URL"]', "Medium", "alert"),
        ("Authentication Data", "Passwords, PINs, usernames",
         '["PASSWORD","USERNAME","PIN"]', "Critical", "block"),
    ]
    for p in default_policies:
        pid = str(uuid.uuid4())
        cur.execute("""
            INSERT OR IGNORE INTO policies
            (id, name, description, data_types, sensitivity_level, action, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (pid, p[0], p[1], p[2], p[3], p[4], admin_id))

    conn.commit()
    conn.close()


init_db()

# ─── Severity Map ─────────────────────────────────────────────────────────────

SEVERITY_MAP = {
    "SSN": "Critical", "CREDITCARDNUMBER": "Critical", "CREDITCARDCVV": "Critical",
    "IBAN": "Critical", "BIC": "Critical", "PASSWORD": "Critical", "PIN": "Critical",
    "ACCOUNTNUMBER": "Critical", "VEHICLEVIN": "Critical",
    "FIRSTNAME": "High", "LASTNAME": "High", "MIDDLENAME": "High",
    "EMAIL": "High", "PHONENUMBER": "High", "DOB": "High", "USERNAME": "High",
    "IP": "Medium", "IPV4": "Medium", "IPV6": "Medium", "MAC": "Medium",
    "URL": "Medium", "USERAGENT": "Medium", "PHONEIMEI": "Medium",
    "BITCOINADDRESS": "Medium", "ETHEREUMADDRESS": "Medium",
    "LITECOINADDRESS": "Medium", "CREDITCARDISSUER": "Medium",
    "DATE": "Low", "AGE": "Low", "GENDER": "Low", "SEX": "Low",
    "CITY": "Low", "STATE": "Low", "ZIPCODE": "Low", "STREET": "Low",
    "BUILDINGNUMBER": "Low", "COUNTY": "Low", "CURRENCY": "Low",
    "COMPANYNAME": "Low", "JOBTITLE": "Low", "JOBTYPE": "Low",
    "JOBAREA": "Low", "PREFIX": "Low", "HEIGHT": "Low", "EYECOLOR": "Low",
    "TIME": "Low", "NEARBYGPSCOORDINATE": "Low", "MASKEDNUMBER": "Low",
}


def get_severity(entity_type: str) -> str:
    return SEVERITY_MAP.get(entity_type.upper(), "Medium")


# ─── Regex Patterns (always run, catches structured PII) ──────────────────────

REGEX_PATTERNS = {
    "EMAIL":            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', "High"),
    "PHONENUMBER":      (r'\b(\+?\d{1,3}[\s\-])?(\(?\d{3}\)?[\s.\-])\d{3}[\s.\-]\d{4}\b', "High"),
    "SSN":              (r'\b\d{3}[-\s]\d{2}[-\s]\d{4}\b', "Critical"),
    "CREDITCARDNUMBER": (r'\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13})\b', "Critical"),
    "IBAN":             (r'\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b', "Critical"),
    # IPV6 must come BEFORE MAC so its span is registered first for dedup
    "IPV6":             (r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b', "Medium"),
    "IPV4":             (r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b', "Medium"),
    # MAC: require word boundary AND negative lookahead so it does not match inside IPv6
    "MAC":              (r'(?<![0-9A-Fa-f:])(?:[0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}(?![0-9A-Fa-f:])', "Medium"),
    "URL":              (r'https?://[^\s<>"{}|\\^`\[\]]+', "Medium"),
    "PASSWORD":         (r'(?i)\b(password|passwd|pwd)\s*[=:]\s*\S+', "Critical"),
    "USERNAME":         (r'(?i)\b(username|user|login)\s*[=:]\s*\S+', "High"),
    "DATE":             (r'\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b', "Low"),
    # ZIPCODE: negative lookbehind/ahead so it does not match inside IP octets or longer numbers
    "ZIPCODE":          (r'(?<![\.\d])\b\d{5}(?:-\d{4})?\b(?!\.\d)', "Low"),
    "BITCOINADDRESS":   (r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b', "Medium"),
}

def mask_value(value: str, entity_type: str) -> str:
    etype = entity_type.upper()
    if etype in ("SSN", "CREDITCARDNUMBER", "IBAN", "ACCOUNTNUMBER", "PIN"):
        if len(value) > 8:
            return value[:4] + "*" * (len(value) - 8) + value[-4:]
        return "*" * len(value)
    elif etype == "EMAIL":
        parts = value.split("@")
        if len(parts) == 2:
            local = parts[0]
            return (local[:2] + "***") + "@" + parts[1]
        return "***"
    elif etype in ("PASSWORD", "CREDITCARDCVV"):
        return "[REDACTED]"
    elif etype == "PHONENUMBER":
        digits = re.sub(r'\D', '', value)
        return digits[:3] + "-***-" + digits[-4:] if len(digits) >= 7 else "***"
    elif etype in ("FIRSTNAME", "LASTNAME", "MIDDLENAME"):
        return value[0] + "***" if value else "***"
    else:
        return value[:3] + "***" + value[-2:] if len(value) > 5 else "***"


# ─── Transformer Detection ────────────────────────────────────────────────────

def scan_with_transformer(text: str) -> List[dict]:
    import torch

    device = next(transformer_model.parameters()).device
    inputs = transformer_tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        return_offsets_mapping=True
    )
    offset_mapping = inputs.pop("offset_mapping")[0]
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = transformer_model(**inputs)

    predictions = torch.argmax(outputs.logits, dim=2)[0]
    labels = [id2label[p.item()] for p in predictions]

    findings = []
    current_entity = None

    for i, label in enumerate(labels):
        start = int(offset_mapping[i][0])
        end = int(offset_mapping[i][1])
        if start == end:
            continue

        if label.startswith("B-"):
            if current_entity:
                findings.append(current_entity)
            current_entity = {
                "entity_type": label[2:],
                "original_value": text[start:end],
                "start": start,
                "end": end,
            }
        elif label.startswith("I-") and current_entity:
            gap = text[current_entity["end"]:start]
            current_entity["original_value"] += gap + text[start:end]
            current_entity["end"] = end
        else:
            if current_entity:
                findings.append(current_entity)
                current_entity = None

    if current_entity:
        findings.append(current_entity)

    results = []
    for f in findings:
        if f["entity_type"] == "O":
            continue
        val = f["original_value"].strip()
        if not val:
            continue
        severity = get_severity(f["entity_type"])
        ctx_start = max(0, f["start"] - 40)
        ctx_end = min(len(text), f["end"] + 40)
        context = text[ctx_start:ctx_end].replace(val, f'[{f["entity_type"]}]')
        results.append({
            "entity_type": f["entity_type"],
            "original_value": val,
            "masked_value": mask_value(val, f["entity_type"]),
            "context": context,
            "severity": severity,
            "start": f["start"],
            "end": f["end"],
            "detection_source": "transformer",
        })
    return results


# ─── Regex Detection ──────────────────────────────────────────────────────────

def scan_with_regex(text: str) -> List[dict]:
    findings = []
    for entity_type, (pattern, severity) in REGEX_PATTERNS.items():
        for m in re.finditer(pattern, text):
            val = m.group().strip()
            if not val:
                continue
            ctx_start = max(0, m.start() - 40)
            ctx_end = min(len(text), m.end() + 40)
            findings.append({
                "entity_type": entity_type,
                "original_value": val,
                "masked_value": mask_value(val, entity_type),
                "context": text[ctx_start:ctx_end].replace(val, f"[{entity_type}]"),
                "severity": severity,
                "start": m.start(),
                "end": m.end(),
                "detection_source": "regex",
            })

    # Remove intra-regex overlaps: keep the longest match when spans collide.
    # This prevents MAC firing multiple times inside an IPv6 address, etc.
    findings.sort(key=lambda f: (f["start"], -(f["end"] - f["start"])))
    deduped = []
    last_end = -1
    for f in findings:
        if f["start"] >= last_end:
            deduped.append(f)
            last_end = f["end"]
        # else: overlaps with a previously kept (longer/earlier) match — skip it
    return deduped


# ─── Hybrid Scan (Main entry point) ──────────────────────────────────────────

def scan_text(text: str):
    all_findings = []
    method_used = "regex"

    # Step 1: Transformer (if loaded)
    if transformer_model is not None:
        try:
            transformer_findings = scan_with_transformer(text)
            all_findings.extend(transformer_findings)
            method_used = "transformer+regex"
        except Exception as e:
            logger.error(f"Transformer error: {e}. Using regex only.")
            method_used = "regex_fallback"

    # Step 2: Regex (always runs)
    regex_findings = scan_with_regex(text)

    # Step 3: Merge — skip regex hits that overlap with transformer hits
    transformer_spans = [(f["start"], f["end"]) for f in all_findings]
    for rf in regex_findings:
        overlaps = any(
            rf["start"] < t_end and rf["end"] > t_start
            for t_start, t_end in transformer_spans
        )
        if not overlaps:
            all_findings.append(rf)

    return all_findings, method_used


def calculate_risk_score(findings: list) -> int:
    weights = {"Critical": 25, "High": 15, "Medium": 8, "Low": 3}
    return min(sum(weights.get(f["severity"], 0) for f in findings), 100)


# ─── Auth Utilities ───────────────────────────────────────────────────────────

def hash_password(p: str) -> str:
    return hashlib.sha256((p + SECRET_KEY).encode()).hexdigest()


def create_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.datetime.now() + datetime.timedelta(hours=24)).isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires)
    )
    conn.commit()
    conn.close()
    return token


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT s.user_id, u.email, u.full_name, u.role FROM sessions s "
        "JOIN users u ON s.user_id = u.id "
        "WHERE s.token = ? AND s.expires_at > datetime('now')",
        (credentials.credentials,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return dict(row)


def log_audit(user_id: str, action: str, resource: str, details: str = ""):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO audit_logs (id, user_id, action, resource, details) VALUES (?,?,?,?,?)",
        (str(uuid.uuid4()), user_id, action, resource, details)
    )
    conn.commit()
    conn.close()


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class PolicyCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    data_types: List[str]
    sensitivity_level: str
    action: str = "alert"

class ScanTextRequest(BaseModel):
    text: str
    filename: Optional[str] = "manual_input.txt"


# ─── Auth Routes ──────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    user = conn.execute(
        "SELECT * FROM users WHERE email=? AND password_hash=?",
        (req.email, hash_password(req.password))
    ).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    conn.execute("UPDATE users SET last_login=datetime('now') WHERE id=?", (user["id"],))
    conn.commit()
    conn.close()
    token = create_token(user["id"])
    log_audit(user["id"], "LOGIN", "auth", f"{req.email} logged in")
    return {"token": token, "user": {"id": user["id"], "email": user["email"],
                                     "full_name": user["full_name"], "role": user["role"]}}

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    uid = str(uuid.uuid4())
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO users (id, email, password_hash, full_name) VALUES (?,?,?,?)",
            (uid, req.email, hash_password(req.password), req.full_name)
        )
        conn.commit()
        conn.close()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    token = create_token(uid)
    return {"token": token, "user": {"id": uid, "email": req.email,
                                     "full_name": req.full_name, "role": "analyst"}}

@app.post("/api/auth/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM sessions WHERE token=?", (credentials.credentials,))
    conn.commit()
    conn.close()
    return {"message": "Logged out"}

@app.get("/api/auth/me")
def me(user=Depends(get_current_user)):
    return user


# ─── Model Status ─────────────────────────────────────────────────────────────

@app.get("/api/model/status")
def model_status():
    return {
        "model_path": MODEL_PATH,
        "status": MODEL_STATUS,
        "loaded": transformer_model is not None,
        "num_labels": len(id2label),
        "entity_types": list(id2label.values()),
        "detection_mode": "transformer+regex" if transformer_model else "regex_only",
    }


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/api/dashboard/stats")
def dashboard_stats(user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    total_scans     = conn.execute("SELECT COUNT(*) as c FROM scan_jobs").fetchone()["c"]
    total_findings  = conn.execute("SELECT COUNT(*) as c FROM findings").fetchone()["c"]
    critical        = conn.execute("SELECT COUNT(*) as c FROM findings WHERE severity='Critical'").fetchone()["c"]
    high            = conn.execute("SELECT COUNT(*) as c FROM findings WHERE severity='High'").fetchone()["c"]
    active_policies = conn.execute("SELECT COUNT(*) as c FROM policies WHERE enabled=1").fetchone()["c"]
    avg_risk        = conn.execute("SELECT AVG(risk_score) as a FROM scan_jobs WHERE status='completed'").fetchone()["a"] or 0
    recent          = conn.execute("SELECT id,filename,status,total_findings,risk_score,created_at FROM scan_jobs ORDER BY created_at DESC LIMIT 5").fetchall()
    by_type         = conn.execute("SELECT entity_type, COUNT(*) as count FROM findings GROUP BY entity_type ORDER BY count DESC LIMIT 8").fetchall()
    trend           = conn.execute("SELECT DATE(created_at) as day, COUNT(*) as scans, SUM(total_findings) as findings FROM scan_jobs WHERE created_at >= date('now','-7 days') GROUP BY DATE(created_at) ORDER BY day").fetchall()
    conn.close()
    return {
        "total_scans": total_scans, "total_findings": total_findings,
        "critical_findings": critical, "high_findings": high,
        "active_policies": active_policies, "avg_risk_score": round(avg_risk, 1),
        "recent_scans": [dict(r) for r in recent],
        "findings_by_type": [dict(r) for r in by_type],
        "scan_trend": [dict(r) for r in trend],
        "model_status": MODEL_STATUS,
    }


# ─── Scan Routes ──────────────────────────────────────────────────────────────

@app.post("/api/scans/text")
def scan_text_endpoint(req: ScanTextRequest, user=Depends(get_current_user)):
    scan_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO scan_jobs (id, filename, file_type, file_size, status, scanned_by) VALUES (?,?,?,?,?,?)",
        (scan_id, req.filename, "txt", len(req.text), "processing", user["user_id"])
    )
    conn.commit()

    findings, method = scan_text(req.text)
    risk = calculate_risk_score(findings)

    for f in findings:
        conn.execute(
            "INSERT INTO findings (id, scan_id, entity_type, masked_value, context, severity, detection_source, start_pos, end_pos) VALUES (?,?,?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), scan_id, f["entity_type"], f["masked_value"],
             f["context"], f["severity"], f.get("detection_source", "regex"), f["start"], f["end"])
        )
    conn.execute(
        "UPDATE scan_jobs SET status='completed', total_findings=?, risk_score=?, detection_method=?, completed_at=datetime('now') WHERE id=?",
        (len(findings), risk, method, scan_id)
    )
    conn.commit()
    conn.close()
    log_audit(user["user_id"], "SCAN", scan_id, f"{req.filename}: {len(findings)} findings via {method}")
    return {"scan_id": scan_id, "filename": req.filename, "total_findings": len(findings),
            "risk_score": risk, "detection_method": method, "model_status": MODEL_STATUS, "findings": findings}


@app.post("/api/scans/upload")
async def scan_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "txt"
    text = extract_text(content, ext)

    scan_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO scan_jobs (id, filename, file_type, file_size, status, scanned_by) VALUES (?,?,?,?,?,?)",
        (scan_id, file.filename, ext, len(content), "processing", user["user_id"])
    )
    conn.commit()

    findings, method = scan_text(text)
    risk = calculate_risk_score(findings)

    for f in findings:
        conn.execute(
            "INSERT INTO findings (id, scan_id, entity_type, masked_value, context, severity, detection_source, start_pos, end_pos) VALUES (?,?,?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), scan_id, f["entity_type"], f["masked_value"],
             f["context"], f["severity"], f.get("detection_source", "regex"), f["start"], f["end"])
        )
    conn.execute(
        "UPDATE scan_jobs SET status='completed', total_findings=?, risk_score=?, detection_method=?, completed_at=datetime('now') WHERE id=?",
        (len(findings), risk, method, scan_id)
    )
    conn.commit()
    conn.close()
    log_audit(user["user_id"], "UPLOAD_SCAN", scan_id, f"{file.filename}: {len(findings)} findings")
    return {"scan_id": scan_id, "filename": file.filename, "total_findings": len(findings),
            "risk_score": risk, "detection_method": method, "findings": findings}


# ─── File Text Extraction ─────────────────────────────────────────────────────

def extract_text(content: bytes, ext: str) -> str:
    """
    Extract plain text from uploaded file bytes.
    Supports: txt, pdf, docx, jpg/jpeg/png/webp/bmp/tiff (via OCR).
    """

    # ── Plain text ──────────────────────────────────────────────────────────
    if ext == "txt":
        return content.decode("utf-8", errors="ignore")

    # ── PDF ─────────────────────────────────────────────────────────────────
    elif ext == "pdf":
        try:
            import pypdf
        except ImportError:
            logger.error("pypdf not installed. Run: pip install pypdf")
            return "[PDF extraction unavailable — install pypdf: pip install pypdf]"
        try:
            reader = pypdf.PdfReader(io.BytesIO(content))
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text and text.strip():
                    pages.append(text.strip())
            extracted = "\n\n".join(pages)
            if not extracted.strip():
                return "[No extractable text found in this PDF — it may be scanned/image-based]"
            logger.info(f"PDF extracted: {len(pages)} pages, {len(extracted)} chars")
            return extracted
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return f"[PDF extraction failed: {e}]"

    # ── DOCX ────────────────────────────────────────────────────────────────
    elif ext == "docx":
        try:
            from docx import Document
        except ImportError:
            logger.error("python-docx not installed. Run: pip install python-docx")
            return "[DOCX extraction unavailable — install python-docx: pip install python-docx]"
        try:
            doc = Document(io.BytesIO(content))
            parts = []

            # Extract paragraph text
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    parts.append(text)

            # Extract text from all tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        cell_text = cell.text.strip()
                        if cell_text and cell_text not in parts:
                            parts.append(cell_text)

            extracted = "\n".join(parts)
            if not extracted.strip():
                return "[No text found in this DOCX file]"
            logger.info(f"DOCX extracted: {len(parts)} text blocks, {len(extracted)} chars")
            return extracted
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            return f"[DOCX extraction failed: {e}]"

    # ── Images (OCR) ────────────────────────────────────────────────────────
    elif ext in ("jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"):
        try:
            from PIL import Image
        except ImportError:
            logger.error("Pillow not installed. Run: pip install Pillow")
            return "[Image OCR unavailable — install Pillow: pip install Pillow]"
        try:
            import pytesseract
        except ImportError:
            logger.error("pytesseract not installed. Run: pip install pytesseract")
            return "[Image OCR unavailable — install pytesseract: pip install pytesseract (Tesseract must also be installed)]"
        try:
            img = Image.open(io.BytesIO(content))
            # Convert to RGB if needed (handles RGBA, P mode, etc.)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            text = pytesseract.image_to_string(img)
            if not text.strip():
                return "[No text detected in this image via OCR]"
            logger.info(f"Image OCR extracted: {len(text)} chars from {ext.upper()}")
            return text
        except Exception as e:
            logger.error(f"Image OCR error: {e}")
            return f"[Image OCR failed: {e}]"

    # ── Fallback: attempt UTF-8 decode ──────────────────────────────────────
    else:
        try:
            return content.decode("utf-8", errors="ignore")
        except Exception:
            return f"[Unsupported file type: {ext}]"


@app.get("/api/scans")
def list_scans(user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT s.*, u.full_name as scanned_by_name
        FROM scan_jobs s LEFT JOIN users u ON s.scanned_by = u.id
        ORDER BY s.created_at DESC LIMIT 50
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/scans/{scan_id}")
def get_scan(scan_id: str, user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    scan = conn.execute("SELECT * FROM scan_jobs WHERE id=?", (scan_id,)).fetchone()
    if not scan:
        conn.close()
        raise HTTPException(status_code=404, detail="Scan not found")
    findings = conn.execute("SELECT * FROM findings WHERE scan_id=?", (scan_id,)).fetchall()
    conn.close()
    return {"scan": dict(scan), "findings": [dict(f) for f in findings]}


# ─── Policies ─────────────────────────────────────────────────────────────────

@app.get("/api/policies")
def list_policies(user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM policies ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/policies")
def create_policy(req: PolicyCreate, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    pid = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO policies (id,name,description,data_types,sensitivity_level,action,created_by) VALUES (?,?,?,?,?,?,?)",
        (pid, req.name, req.description, json.dumps(req.data_types), req.sensitivity_level, req.action, user["user_id"])
    )
    conn.commit()
    conn.close()
    return {"id": pid, "message": "Policy created"}

@app.put("/api/policies/{policy_id}/toggle")
def toggle_policy(policy_id: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE policies SET enabled = 1-enabled WHERE id=?", (policy_id,))
    conn.commit()
    conn.close()
    return {"message": "Toggled"}

@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM policies WHERE id=?", (policy_id,))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}


# ─── Audit + Users ────────────────────────────────────────────────────────────

@app.get("/api/audit-logs")
def audit_logs(user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT a.*, u.full_name, u.email FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC LIMIT 100
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/users")
def list_users(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id,email,full_name,role,created_at,last_login FROM users").fetchall()
    conn.close()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)