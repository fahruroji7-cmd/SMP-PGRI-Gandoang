from dotenv import load_dotenv

load_dotenv()

import io
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from openpyxl import Workbook
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="AbsenSPG API")
api_router = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET") or secrets.token_hex(32)
ACCESS_MINUTES = 60


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: Literal["Admin", "Guru"]


class LoginInput(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)


class AttendanceEntry(BaseModel):
    student: str
    status: Literal["H", "S", "I", "A"]
    note: str = ""


class AttendanceInput(BaseModel):
    date: str
    class_name: str
    subject: str
    entries: list[AttendanceEntry]


class GradeEntry(BaseModel):
    student: str
    score: float = Field(ge=0, le=100)


class GradesInput(BaseModel):
    date: str
    class_name: str
    subject: str
    assessment_type: str
    entries: list[GradeEntry]


class JournalInput(BaseModel):
    date: str
    period: int
    class_name: str
    subject: str
    topic: str = Field(min_length=1)
    activity: str = Field(min_length=1)
    reflection: str = ""


class NameInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class StudentInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    class_name: str


class SettingsInput(BaseModel):
    school: str
    address: str
    principal: str
    nip: str


class ReportRow(BaseModel):
    no: int
    student: str
    class_name: str
    subject: str
    date: str
    status: str
    value: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def make_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def public_user(user: dict) -> UserOut:
    return UserOut(id=str(user["id"]), email=user["email"], name=user["name"], role=user["role"])


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Account not found")
        return user
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Session expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc


def require_role(*roles: str):
    async def dependency(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission for this action")
        return user

    return dependency


async def seed_accounts():
    accounts = [
        ("admin@absenspg.local", "Admin123!", "Ahmad Fauzi", "Admin"),
        ("guru@absenspg.local", "Guru123!", "Siti Nurhaliza", "Guru"),
    ]
    await db.users.create_index("email", unique=True)
    for email, password, name, role in accounts:
        await db.users.update_one(
            {"email": email},
            {"$set": {"email": email, "name": name, "role": role}, "$setOnInsert": {"id": str(uuid.uuid4()), "password_hash": hash_password(password), "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )


DEFAULT_SETTINGS = {"school": "SMP PGRI Gandoang", "address": "Jl. Raya Gandoang No. 12", "principal": "Drs. Ahmad Fauzi", "nip": "197001011995011001"}


async def seed_masters():
    if await db.classes.count_documents({}) == 0:
        await db.classes.insert_many([{"id": str(uuid.uuid4()), "name": n} for n in ["7A", "7B", "8A", "9A"]])
    if await db.subjects.count_documents({}) == 0:
        await db.subjects.insert_many([{"id": str(uuid.uuid4()), "name": n} for n in ["Matematika", "Bahasa Indonesia", "IPA", "Informatika"]])
    if await db.teachers.count_documents({}) == 0:
        await db.teachers.insert_many([{"id": str(uuid.uuid4()), "name": n} for n in ["Ahmad Fauzi", "Siti Nurhaliza", "Dedi Kurniawan"]])
    if await db.students.count_documents({}) == 0:
        rows = [("Alya Putri", "7A"), ("Bagas Pratama", "7A"), ("Citra Lestari", "7A"), ("Daffa Ramadhan", "7A"), ("Eka Salsabila", "7A"), ("Fajar Nugraha", "7A"), ("Gita Ayu", "7B"), ("Hadi Saputra", "7B"), ("Intan Permata", "7B"), ("Joko Santoso", "8A"), ("Kirana Dewi", "8A"), ("Lukman Hakim", "8A")]
        await db.students.insert_many([{"id": str(uuid.uuid4()), "name": n, "class_name": c} for n, c in rows])
    if await db.settings.count_documents({"id": "school"}) == 0:
        await db.settings.insert_one({"id": "school", **DEFAULT_SETTINGS})


@app.on_event("startup")
async def startup():
    await seed_accounts()
    await seed_masters()


@api_router.get("/")
async def root():
    return {"message": "AbsenSPG API online"}


@api_router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginInput, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    response.set_cookie("access_token", make_token(user), httponly=True, secure=True, samesite="none", max_age=ACCESS_MINUTES * 60, path="/")
    return public_user(user)


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/permissions")
async def permissions(user: dict = Depends(get_current_user)):
    return {"role": user["role"], "admin": user["role"] == "Admin", "can_manage_master_data": user["role"] == "Admin", "can_teach": True}


@api_router.get("/masters")
async def masters(user: dict = Depends(get_current_user)):
    return {
        "classes": await db.classes.find({}, {"_id": 0}).sort("name", 1).to_list(200),
        "subjects": await db.subjects.find({}, {"_id": 0}).sort("name", 1).to_list(200),
        "teachers": await db.teachers.find({}, {"_id": 0}).sort("name", 1).to_list(200),
        "students": await db.students.find({}, {"_id": 0}).sort("name", 1).to_list(1000),
    }


@api_router.get("/students")
async def list_students(class_name: str | None = None, user: dict = Depends(get_current_user)):
    query = {"class_name": class_name} if class_name else {}
    return await db.students.find(query, {"_id": 0}).sort("name", 1).to_list(1000)


@api_router.post("/students")
async def add_student(payload: StudentInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip(), "class_name": payload.class_name}
    await db.students.insert_one({**doc})
    return doc


@api_router.post("/classes")
async def add_class(payload: NameInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip()}
    await db.classes.insert_one({**doc})
    return doc


@api_router.post("/subjects")
async def add_subject(payload: NameInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip()}
    await db.subjects.insert_one({**doc})
    return doc


@api_router.post("/teachers")
async def add_teacher(payload: NameInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip()}
    await db.teachers.insert_one({**doc})
    return doc


@api_router.post("/attendance")
async def save_attendance(payload: AttendanceInput, user: dict = Depends(get_current_user)):
    key = {"date": payload.date, "class_name": payload.class_name, "subject": payload.subject}
    update = {"entries": [e.model_dump() for e in payload.entries], "recorded_by": user["name"], "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.attendance.update_one(key, {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), **key}}, upsert=True)
    return {"message": "Absensi tersimpan", "count": len(payload.entries)}


@api_router.get("/attendance")
async def get_attendance(date: str, class_name: str, subject: str, user: dict = Depends(get_current_user)):
    doc = await db.attendance.find_one({"date": date, "class_name": class_name, "subject": subject}, {"_id": 0})
    return doc or {"date": date, "class_name": class_name, "subject": subject, "entries": []}


@api_router.post("/grades")
async def save_grades(payload: GradesInput, user: dict = Depends(get_current_user)):
    key = {"date": payload.date, "class_name": payload.class_name, "subject": payload.subject, "assessment_type": payload.assessment_type}
    update = {"entries": [e.model_dump() for e in payload.entries], "recorded_by": user["name"], "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.grades.update_one(key, {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), **key}}, upsert=True)
    return {"message": "Nilai tersimpan", "count": len(payload.entries)}


@api_router.get("/grades")
async def get_grades(date: str, class_name: str, subject: str, assessment_type: str, user: dict = Depends(get_current_user)):
    doc = await db.grades.find_one({"date": date, "class_name": class_name, "subject": subject, "assessment_type": assessment_type}, {"_id": 0})
    return doc or {"date": date, "class_name": class_name, "subject": subject, "assessment_type": assessment_type, "entries": []}


@api_router.post("/journals")
async def save_journal(payload: JournalInput, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "teacher": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.journals.insert_one({**doc})
    return doc


@api_router.get("/journals")
async def list_journals(user: dict = Depends(get_current_user)):
    return await db.journals.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    return await db.settings.find_one({"id": "school"}, {"_id": 0}) or {"id": "school", **DEFAULT_SETTINGS}


@api_router.put("/settings")
async def update_settings(payload: SettingsInput, user: dict = Depends(require_role("Admin"))):
    await db.settings.update_one({"id": "school"}, {"$set": payload.model_dump()}, upsert=True)
    return {"message": "Pengaturan tersimpan"}


STATUS_LABELS = {"H": "Hadir", "S": "Sakit", "I": "Izin", "A": "Alpa"}


@api_router.get("/reports/rows", response_model=list[ReportRow])
async def report_rows(kind: str = "attendance", user: dict = Depends(get_current_user)):
    rows: list[ReportRow] = []
    if kind == "grades":
        for doc in await db.grades.find({}, {"_id": 0}).sort("date", -1).to_list(200):
            for e in doc.get("entries", []):
                score = float(e["score"])
                predicate = "Sangat baik" if score >= 85 else "Baik" if score >= 75 else "Perlu bimbingan"
                rows.append(ReportRow(no=len(rows) + 1, student=e["student"], class_name=doc["class_name"], subject=doc["subject"], date=doc["date"], status=predicate, value=f"{score:g}"))
    elif kind == "journals":
        for doc in await db.journals.find({}, {"_id": 0}).sort("date", -1).to_list(200):
            rows.append(ReportRow(no=len(rows) + 1, student=doc.get("teacher", user["name"]), class_name=doc["class_name"], subject=doc["subject"], date=doc["date"], status="Tersimpan", value=doc["topic"]))
    else:
        for doc in await db.attendance.find({}, {"_id": 0}).sort("date", -1).to_list(200):
            for e in doc.get("entries", []):
                label = STATUS_LABELS.get(e["status"], e["status"])
                rows.append(ReportRow(no=len(rows) + 1, student=e["student"], class_name=doc["class_name"], subject=doc["subject"], date=doc["date"], status=label, value=label))
    return rows


@api_router.get("/reports/export")
async def export_report(kind: str = "attendance", user: dict = Depends(get_current_user)):
    rows = await report_rows(kind, user)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "AbsenSPG"
    sheet.append(["No", "Nama Siswa", "Kelas", "Mata Pelajaran", "Tanggal", "Status", "Nilai / Materi"])
    for row in rows:
        sheet.append([row.no, row.student, row.class_name, row.subject, row.date, row.status, row.value])
    for column in sheet.columns:
        sheet.column_dimensions[column[0].column_letter].width = max(14, min(28, max(len(str(cell.value or "")) for cell in column) + 2))
    stream = io.BytesIO()
    workbook.save(stream)
    stream.seek(0)
    filename = f"absenspg-{kind}.xlsx"
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@api_router.get("/reports/print", response_class=HTMLResponse)
async def print_report(kind: str = "attendance", user: dict = Depends(get_current_user)):
    rows = await report_rows(kind, user)
    school = await db.settings.find_one({"id": "school"}, {"_id": 0}) or DEFAULT_SETTINGS
    title = {"attendance": "Rekap Absensi Siswa", "grades": "Rekap Nilai Siswa", "journals": "Rekap Jurnal Mengajar"}.get(kind, "Rekap AbsenSPG")
    body = "".join(f"<tr><td>{r.no}</td><td>{r.student}</td><td>{r.class_name}</td><td>{r.subject}</td><td>{r.date}</td><td>{r.status}</td><td>{r.value}</td></tr>" for r in rows) or "<tr><td colspan='7'>Belum ada data tersimpan untuk laporan ini.</td></tr>"
    logo_url = os.environ.get("FRONTEND_URL", "https://educator-dashboard-4.preview.emergentagent.com") + "/logo-smp.png"
    return HTMLResponse(f"""<!doctype html><html lang='id'><head><meta charset='utf-8'><title>{title}</title><style>body{{font-family:Arial,sans-serif;color:#19342a;padding:36px}}h1{{font-size:22px;margin-bottom:4px}}p{{color:#68776e;font-size:12px}}.head{{display:flex;align-items:center;gap:14px}}table{{width:100%;border-collapse:collapse;margin-top:26px}}th,td{{border:1px solid #cfded3;padding:9px;text-align:left;font-size:12px}}th{{background:#e2f0e8}}@media print{{button{{display:none}}}}</style></head><body><button onclick='window.print()'>Cetak laporan</button><div class='head'><img src='{logo_url}' alt='Logo sekolah' style='height:72px'><div><h1>{school['school']}</h1><h2 style='margin:4px 0'>{title}</h2><p style='margin:0'>{school['address']} · Disiapkan oleh {user['name']}</p></div></div><table><thead><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Mapel</th><th>Tanggal</th><th>Status</th><th>Nilai / Materi</th></tr></thead><tbody>{body}</tbody></table></body></html>""")


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=[os.environ.get("FRONTEND_URL", "https://educator-dashboard-4.preview.emergentagent.com")], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()