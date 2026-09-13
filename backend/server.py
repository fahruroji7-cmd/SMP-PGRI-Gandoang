from dotenv import load_dotenv

load_dotenv()

import io
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt
from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from openpyxl import Workbook, load_workbook
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
    username: str
    name: str
    role: Literal["Admin", "Guru", "Pembina", "Piket Pagi", "Piket Siang", "Sekretaris", "TU", "Siswa"]
    secretary_class: str | None = None
    student_id: str | None = None


class LoginInput(BaseModel):
    username: str = Field(min_length=1, max_length=120)
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


class ScheduleInput(BaseModel):
    day: Literal["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
    start_time: str
    end_time: str
    class_name: str
    subject: str
    room: str = ""


class NameInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ClassInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    shift: Literal["Pagi", "Siang"] = "Pagi"


class StudentInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    class_name: str


class SettingsInput(BaseModel):
    school: str
    address: str
    principal: str
    nip: str
    ekskul_coordinator: str = ""
    ekskul_coordinator_nip: str = ""
    waka_kurikulum: str = ""
    logo_base64: str = Field(default="", max_length=2_000_000)
    logo_lencana_base64: str = Field(default="", max_length=2_000_000)
    kartu_template_base64: str = Field(default="", max_length=3_000_000)


class TeacherAccountInput(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=6, max_length=128)


class TeacherPasswordInput(BaseModel):
    password: str = Field(min_length=6, max_length=128)


class EkskulInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    pembina_name: str = Field(min_length=1, max_length=120)
    training_day: str = Field(default="", max_length=30)


class EkskulMembersInput(BaseModel):
    student_ids: list[str] = Field(default_factory=list)


class EkskulAttendanceInput(BaseModel):
    date: str
    ekskul_id: str
    entries: list[AttendanceEntry]


class PembinaAccountInput(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    ekskul_ids: list[str] = Field(default_factory=list)


class PembinaAccountUpdateInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    ekskul_ids: list[str] = Field(default_factory=list)


class PembinaSelfAttendanceInput(BaseModel):
    date: str
    ekskul_id: str
    status: Literal["Hadir", "Sakit", "Izin"] = "Hadir"
    photo: str = Field(default="", max_length=3_000_000)
    note: str = Field(default="", max_length=300)


class EkskulJurnalInput(BaseModel):
    date: str
    ekskul_id: str
    materi: str = Field(min_length=1, max_length=300)
    catatan: str = Field(default="", max_length=500)


class EkskulPrestasiInput(BaseModel):
    date: str
    ekskul_id: str
    nama_lomba: str = Field(min_length=1, max_length=200)
    tingkat: str = Field(default="", max_length=60)
    nama_peserta: str = Field(default="", max_length=200)
    hasil: str = Field(default="", max_length=120)
    catatan: str = Field(default="", max_length=500)


class EkskulDeskripsiInput(BaseModel):
    ekskul_id: str
    predikat: str = Field(min_length=1, max_length=60)
    deskripsi: str = Field(default="", max_length=500)


class EkskulNilaiEntry(BaseModel):
    student: str
    predikat: str = ""
    deskripsi: str = ""


class EkskulNilaiInput(BaseModel):
    ekskul_id: str
    entries: list[EkskulNilaiEntry]


class BebanMengajarInput(BaseModel):
    teacher: str = Field(min_length=1, max_length=120)
    day: Literal["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
    class_name: str
    subject: str
    jam_awal: int = Field(ge=1, le=20)
    jam_akhir: int = Field(ge=1, le=20)


class PiketEntryItem(BaseModel):
    teacher: str
    class_name: str
    subject: str
    jam_awal: int
    jam_akhir: int
    jam_hadir: list[int] = Field(default_factory=list)
    status: str = ""


class SpecialActivity(BaseModel):
    petugas: str = ""
    peserta: list[str] = Field(default_factory=list)
    jam: int = 1


class PiketAttendanceInput(BaseModel):
    date: str
    shift: Literal["Pagi", "Siang"]
    entries: list[PiketEntryItem] = Field(default_factory=list)
    piket_guru: list[str] = Field(default_factory=list)
    upacara: SpecialActivity | None = None
    duha: SpecialActivity | None = None
    murotal: SpecialActivity | None = None
    penyambut: SpecialActivity | None = None


class IzinSiswaInput(BaseModel):
    date: str
    student: str = Field(min_length=1, max_length=120)
    class_name: str = Field(default="", max_length=30)
    jenis: str = Field(default="Izin Keluar", max_length=40)
    jam: str = Field(default="", max_length=40)
    keterangan: str = Field(default="", max_length=500)


class PelanggaranSiswaInput(BaseModel):
    date: str
    student: str = Field(min_length=1, max_length=120)
    class_name: str = Field(default="", max_length=30)
    jenis: str = Field(min_length=1, max_length=200)
    keterangan: str = Field(default="", max_length=500)
    tindakan: str = Field(default="", max_length=200)


class JurnalPiketInput(BaseModel):
    date: str
    shift: Literal["Pagi", "Siang"]
    catatan: str = Field(min_length=1, max_length=1000)


class PiketAccountInput(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    shift: Literal["Pagi", "Siang"]


class PiketAccountUpdateInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    shift: Literal["Pagi", "Siang"]


class HomeroomInput(BaseModel):
    class_name: str = Field(default="", max_length=30)


class StudentPhotoInput(BaseModel):
    photo: str = Field(default="", max_length=500_000)


class DailyAttendanceInput(BaseModel):
    date: str
    class_name: str
    entries: list[AttendanceEntry]


class SekretarisAccountInput(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    secretary_class: str = Field(min_length=1, max_length=30)


class SekretarisAccountUpdateInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    secretary_class: str = Field(min_length=1, max_length=30)


class BiodataInput(BaseModel):
    nomor_induk: str = Field(default="", max_length=20)
    nisn: str = Field(default="", max_length=20)
    nik: str = Field(default="", max_length=20)
    tempat_lahir: str = Field(default="", max_length=60)
    tanggal_lahir: str = Field(default="", max_length=12)
    jenis_kelamin: Literal["Laki-laki", "Perempuan", ""] = ""
    agama: str = Field(default="", max_length=30)
    alamat: str = Field(default="", max_length=300)
    nama_ayah: str = Field(default="", max_length=120)
    pekerjaan_ayah: str = Field(default="", max_length=80)
    nama_ibu: str = Field(default="", max_length=120)
    pekerjaan_ibu: str = Field(default="", max_length=80)
    nama_wali: str = Field(default="", max_length=120)
    no_hp_ortu: str = Field(default="", max_length=20)
    status: Literal["Aktif", "Mutasi Masuk", "Mutasi Keluar", "Lulus", "Alumni"] = "Aktif"


class TeacherNipInput(BaseModel):
    nip: str = Field(default="", max_length=30)


class TranskripSubjectEntry(BaseModel):
    subject: str
    nilai: float = 0


class TranskripInput(BaseModel):
    subjects: list[TranskripSubjectEntry] = Field(default_factory=list)
    sikap: str = Field(default="", max_length=60)
    catatan: str = Field(default="", max_length=500)


class MassGenerateInput(BaseModel):
    target: Literal["guru", "siswa", "sekretaris", "pembina"]
    class_name: str = ""


class ResetPasswordGenericInput(BaseModel):
    password: str = Field(min_length=6, max_length=128)


class SuratKeluarInput(BaseModel):
    tanggal: str
    nomor: str = Field(min_length=1, max_length=60)
    perihal: str = Field(min_length=1, max_length=200)
    tujuan: str = Field(default="", max_length=200)
    file_base64: str = Field(default="", max_length=4_000_000)


class SuratMasukInput(BaseModel):
    tanggal: str
    nomor: str = Field(min_length=1, max_length=60)
    perihal: str = Field(min_length=1, max_length=200)
    asal: str = Field(default="", max_length=200)
    file_base64: str = Field(default="", max_length=4_000_000)


class TuAccountInput(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class TuAccountUpdateInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)


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
        "username": user["username"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def public_user(user: dict) -> UserOut:
    return UserOut(id=str(user["id"]), username=user["username"], name=user["name"], role=user["role"], secretary_class=user.get("secretary_class"), student_id=user.get("student_id"))


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


async def ensure_own_class_subject(user: dict, class_name: str, subject: str):
    # Admin boleh akses kelas & mapel apa saja (untuk keperluan pengecekan/oversight).
    # Guru hanya boleh akses kombinasi kelas+mapel yang benar-benar ada di Jadwal Mengajar miliknya sendiri --
    # jadi tidak bisa mengintip atau mengirim data untuk kelas yang bukan diampunya, sekalipun lewat panggilan API langsung.
    if user["role"] == "Admin":
        return
    exists = await db.schedules.find_one({"created_by": user["name"], "class_name": class_name, "subject": subject})
    if not exists:
        raise HTTPException(status_code=403, detail="Anda tidak mengampu kelas/mapel ini sesuai jadwal mengajar Anda")


async def ensure_own_ekskul(user: dict, ekskul_id: str):
    # Admin boleh akses semua ekskul (oversight). Pembina hanya boleh akses ekskul yang ditugaskan ke akunnya (bisa lebih dari satu).
    if user["role"] == "Admin":
        return
    if user["role"] != "Pembina" or ekskul_id not in (user.get("ekskul_ids") or []):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke ekskul ini")


def ensure_piket_shift(user: dict, shift: str):
    # Admin boleh akses shift apa saja. Akun "Piket Pagi"/"Piket Siang" terkunci pada shift-nya sendiri.
    if user["role"] == "Admin":
        return
    if user["role"] != f"Piket {shift}":
        raise HTTPException(status_code=403, detail="Akun Anda tidak memiliki akses ke shift ini")


def hari_dari_tanggal(date_str: str) -> str:
    hari_map = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    return hari_map[datetime.strptime(date_str, "%Y-%m-%d").weekday()]


async def get_homeroom_class(user: dict) -> str | None:
    # Wali kelas ditentukan lewat data guru (field homeroom_class), bukan lewat akun.
    if user["role"] != "Guru":
        return None
    teacher = await db.teachers.find_one({"name": user["name"]})
    return (teacher or {}).get("homeroom_class") or None


async def seed_accounts():
    accounts = [
        {"legacy_email": "admin@absenspg.local", "username": "admin@absenspg.local", "password": "Admin123!", "name": "admin", "role": "Admin"},
    ]
    try:
        await db.users.drop_index("email_1")
    except Exception:
        pass
    for acc in accounts:
        existing = await db.users.find_one({"$or": [{"username": acc["username"]}, {"email": acc["legacy_email"]}]})
        if existing:
            await db.users.update_one({"_id": existing["_id"]}, {"$set": {"username": acc["username"], "name": acc["name"], "role": acc["role"]}, "$unset": {"email": ""}})
        else:
            await db.users.insert_one({"id": str(uuid.uuid4()), "username": acc["username"], "name": acc["name"], "role": acc["role"], "password_hash": hash_password(acc["password"]), "created_at": datetime.now(timezone.utc).isoformat()})
    await db.users.delete_one({"username": "guru", "teacher_id": {"$exists": False}})
    await db.users.create_index("username", unique=True)


DEFAULT_SETTINGS = {"school": "SMP PGRI Gandoang", "address": "Jl. Raya Gandoang No. 12", "principal": "Drs. Ahmad Fauzi", "nip": "197001011995011001", "ekskul_coordinator": "", "ekskul_coordinator_nip": "", "waka_kurikulum": "", "logo_base64": "", "logo_lencana_base64": "", "kartu_template_base64": ""}
DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
DAY_ORDER = {name: i for i, name in enumerate(DAY_NAMES)}


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
    user = await db.users.find_one({"username": payload.username.strip().lower()}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    response.set_cookie("access_token", make_token(user), httponly=True, secure=True, samesite="none", max_age=ACCESS_MINUTES * 60, path="/")
    return public_user(user)


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/masters")
async def masters(user: dict = Depends(get_current_user)):
    return {
        "classes": await db.classes.find({}, {"_id": 0}).sort("name", 1).to_list(200),
        "subjects": await db.subjects.find({}, {"_id": 0}).sort("name", 1).to_list(200),
        "teachers": await db.teachers.find({}, {"_id": 0}).sort("name", 1).to_list(200),
        "students": await db.students.find({}, {"_id": 0, "photo": 0}).sort("name", 1).to_list(1000),
    }


@api_router.get("/students")
async def list_students(class_name: str | None = None, user: dict = Depends(get_current_user)):
    query = {"class_name": class_name} if class_name else {}
    return await db.students.find(query, {"_id": 0, "photo": 0}).sort("name", 1).to_list(1000)


@api_router.post("/students")
async def add_student(payload: StudentInput, user: dict = Depends(require_role("Admin", "TU"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip(), "class_name": payload.class_name}
    await db.students.insert_one({**doc})
    return doc


@api_router.put("/students/{item_id}")
async def update_student(item_id: str, payload: StudentInput, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.students.update_one({"id": item_id}, {"$set": {"name": payload.name.strip(), "class_name": payload.class_name}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return {"message": "Data siswa diperbarui"}


@api_router.delete("/students/{item_id}")
async def delete_student(item_id: str, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.students.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return {"message": "Data siswa dihapus"}


@api_router.post("/classes")
async def add_class(payload: ClassInput, user: dict = Depends(require_role("Admin", "TU"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip(), "shift": payload.shift}
    await db.classes.insert_one({**doc})
    return doc


@api_router.put("/classes/{item_id}")
async def update_class(item_id: str, payload: ClassInput, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.classes.update_one({"id": item_id}, {"$set": {"name": payload.name.strip(), "shift": payload.shift}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data kelas tidak ditemukan")
    return {"message": "Data kelas diperbarui"}


@api_router.delete("/classes/{item_id}")
async def delete_class(item_id: str, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.classes.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data kelas tidak ditemukan")
    return {"message": "Data kelas dihapus"}


@api_router.post("/subjects")
async def add_subject(payload: NameInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip()}
    await db.subjects.insert_one({**doc})
    return doc


@api_router.put("/subjects/{item_id}")
async def update_subject(item_id: str, payload: NameInput, user: dict = Depends(require_role("Admin"))):
    result = await db.subjects.update_one({"id": item_id}, {"$set": {"name": payload.name.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data mapel tidak ditemukan")
    return {"message": "Data mapel diperbarui"}


@api_router.delete("/subjects/{item_id}")
async def delete_subject(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.subjects.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data mapel tidak ditemukan")
    return {"message": "Data mapel dihapus"}


@api_router.post("/teachers")
async def add_teacher(payload: NameInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip()}
    await db.teachers.insert_one({**doc})
    return doc


@api_router.put("/teachers/{item_id}")
async def update_teacher(item_id: str, payload: NameInput, user: dict = Depends(require_role("Admin"))):
    result = await db.teachers.update_one({"id": item_id}, {"$set": {"name": payload.name.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data guru tidak ditemukan")
    teacher = await db.teachers.find_one({"id": item_id})
    if teacher and teacher.get("user_id"):
        await db.users.update_one({"id": teacher["user_id"]}, {"$set": {"name": payload.name.strip()}})
    return {"message": "Data guru diperbarui"}


@api_router.delete("/teachers/{item_id}")
async def delete_teacher(item_id: str, user: dict = Depends(require_role("Admin"))):
    teacher = await db.teachers.find_one({"id": item_id})
    result = await db.teachers.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data guru tidak ditemukan")
    if teacher and teacher.get("user_id"):
        await db.users.delete_one({"id": teacher["user_id"]})
    return {"message": "Data guru dihapus"}


@api_router.post("/teachers/{item_id}/account")
async def create_teacher_account(item_id: str, payload: TeacherAccountInput, user: dict = Depends(require_role("Admin"))):
    teacher = await db.teachers.find_one({"id": item_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="Data guru tidak ditemukan")
    if teacher.get("user_id"):
        raise HTTPException(status_code=400, detail="Guru ini sudah memiliki akun login")
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    user_id = str(uuid.uuid4())
    await db.users.insert_one({"id": user_id, "username": username, "name": teacher["name"], "role": "Guru", "password_hash": hash_password(payload.password), "teacher_id": item_id, "created_at": datetime.now(timezone.utc).isoformat()})
    await db.teachers.update_one({"id": item_id}, {"$set": {"user_id": user_id, "username": username}})
    return {"message": "Akun login guru berhasil dibuat", "username": username}


@api_router.put("/teachers/{item_id}/account/password")
async def reset_teacher_password(item_id: str, payload: TeacherPasswordInput, user: dict = Depends(require_role("Admin"))):
    teacher = await db.teachers.find_one({"id": item_id})
    if not teacher or not teacher.get("user_id"):
        raise HTTPException(status_code=404, detail="Guru ini belum memiliki akun login")
    await db.users.update_one({"id": teacher["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    return {"message": "Password guru berhasil diperbarui"}


@api_router.put("/teachers/{item_id}/homeroom")
async def set_teacher_homeroom(item_id: str, payload: HomeroomInput, user: dict = Depends(require_role("Admin"))):
    result = await db.teachers.update_one({"id": item_id}, {"$set": {"homeroom_class": payload.class_name.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data guru tidak ditemukan")
    return {"message": "Wali kelas diperbarui"}


@api_router.post("/ekskul")
async def add_ekskul(payload: EkskulInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip(), "pembina_name": payload.pembina_name.strip(), "training_day": payload.training_day.strip(), "member_ids": [], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.ekskul.insert_one({**doc})
    return doc


@api_router.get("/ekskul")
async def list_ekskul(user: dict = Depends(get_current_user)):
    query = {} if user["role"] == "Admin" else {"id": {"$in": user.get("ekskul_ids") or []}}
    return await db.ekskul.find(query, {"_id": 0}).to_list(200)


@api_router.put("/ekskul/{item_id}")
async def update_ekskul(item_id: str, payload: EkskulInput, user: dict = Depends(require_role("Admin"))):
    result = await db.ekskul.update_one({"id": item_id}, {"$set": {"name": payload.name.strip(), "pembina_name": payload.pembina_name.strip(), "training_day": payload.training_day.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data ekskul tidak ditemukan")
    return {"message": "Data ekskul diperbarui"}


@api_router.delete("/ekskul/{item_id}")
async def delete_ekskul(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.ekskul.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data ekskul tidak ditemukan")
    await db.ekskul_attendance.delete_many({"ekskul_id": item_id})
    await db.ekskul_pembina_attendance.delete_many({"ekskul_id": item_id})
    await db.ekskul_jurnal.delete_many({"ekskul_id": item_id})
    await db.ekskul_prestasi.delete_many({"ekskul_id": item_id})
    await db.ekskul_nilai.delete_many({"ekskul_id": item_id})
    await db.ekskul_deskripsi.delete_many({"ekskul_id": item_id})
    await db.users.update_many({"role": "Pembina"}, {"$pull": {"ekskul_ids": item_id}})
    return {"message": "Data ekskul dihapus"}


@api_router.put("/ekskul/{item_id}/members")
async def set_ekskul_members(item_id: str, payload: EkskulMembersInput, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, item_id)
    ekskul = await db.ekskul.find_one({"id": item_id})
    if not ekskul:
        raise HTTPException(status_code=404, detail="Data ekskul tidak ditemukan")
    await db.ekskul.update_one({"id": item_id}, {"$set": {"member_ids": payload.student_ids}})
    return {"message": "Anggota ekskul diperbarui", "count": len(payload.student_ids)}


@api_router.get("/ekskul/{item_id}/members")
async def get_ekskul_members(item_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, item_id)
    ekskul = await db.ekskul.find_one({"id": item_id})
    if not ekskul:
        raise HTTPException(status_code=404, detail="Data ekskul tidak ditemukan")
    members = await db.students.find({"id": {"$in": ekskul.get("member_ids", [])}}, {"_id": 0}).to_list(2000)
    return members


# --- Akun Pembina Ekskul (satu akun bisa membina beberapa ekskul sekaligus) ---

@api_router.post("/pembina-accounts")
async def create_pembina_account(payload: PembinaAccountInput, user: dict = Depends(require_role("Admin"))):
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    user_id = str(uuid.uuid4())
    await db.users.insert_one({"id": user_id, "username": username, "name": payload.name.strip(), "role": "Pembina", "password_hash": hash_password(payload.password), "ekskul_ids": payload.ekskul_ids, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Akun pembina berhasil dibuat", "id": user_id}


@api_router.get("/pembina-accounts")
async def list_pembina_accounts(user: dict = Depends(require_role("Admin"))):
    return await db.users.find({"role": "Pembina"}, {"_id": 0, "password_hash": 0}).to_list(500)


@api_router.put("/pembina-accounts/{item_id}")
async def update_pembina_account(item_id: str, payload: PembinaAccountUpdateInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": "Pembina"}, {"$set": {"name": payload.name.strip(), "ekskul_ids": payload.ekskul_ids}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun pembina tidak ditemukan")
    return {"message": "Akun pembina diperbarui"}


@api_router.put("/pembina-accounts/{item_id}/password")
async def reset_pembina_password(item_id: str, payload: TeacherPasswordInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": "Pembina"}, {"$set": {"password_hash": hash_password(payload.password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun pembina tidak ditemukan")
    return {"message": "Password pembina berhasil diperbarui"}


@api_router.delete("/pembina-accounts/{item_id}")
async def delete_pembina_account(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.users.delete_one({"id": item_id, "role": "Pembina"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Akun pembina tidak ditemukan")
    return {"message": "Akun pembina dihapus"}


# --- Absensi peserta ekskul ---

@api_router.post("/ekskul-attendance")
async def save_ekskul_attendance(payload: EkskulAttendanceInput, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, payload.ekskul_id)
    key = {"date": payload.date, "ekskul_id": payload.ekskul_id}
    update = {"entries": [e.model_dump() for e in payload.entries], "recorded_by": user["name"], "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.ekskul_attendance.update_one(key, {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), **key}}, upsert=True)
    return {"message": "Absensi ekskul tersimpan", "count": len(payload.entries)}


@api_router.get("/ekskul-attendance")
async def get_ekskul_attendance(date: str, ekskul_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, ekskul_id)
    doc = await db.ekskul_attendance.find_one({"date": date, "ekskul_id": ekskul_id}, {"_id": 0})
    return doc or {"date": date, "ekskul_id": ekskul_id, "entries": []}


@api_router.get("/ekskul-attendance/history")
async def list_ekskul_attendance_history(ekskul_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, ekskul_id)
    return await db.ekskul_attendance.find({"ekskul_id": ekskul_id}, {"_id": 0}).sort("date", -1).to_list(300)


# --- Absen diri pembina (dengan foto, disimpan sebagai data URI base64 di database) ---

@api_router.post("/ekskul-pembina-attendance")
async def save_pembina_self_attendance(payload: PembinaSelfAttendanceInput, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, payload.ekskul_id)
    now = datetime.now(timezone.utc)
    doc = {"id": str(uuid.uuid4()), "date": payload.date, "time": now.strftime("%H:%M"), "ekskul_id": payload.ekskul_id, "pembina_name": user["name"], "status": payload.status, "photo": payload.photo, "note": payload.note.strip(), "created_at": now.isoformat()}
    await db.ekskul_pembina_attendance.insert_one({**doc})
    doc.pop("photo", None)
    return {"message": "Absen diri berhasil disimpan", **doc}


@api_router.get("/ekskul-pembina-attendance")
async def list_pembina_self_attendance(ekskul_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, ekskul_id)
    rows = await db.ekskul_pembina_attendance.find({"ekskul_id": ekskul_id}, {"_id": 0}).sort("date", -1).to_list(200)
    return rows


@api_router.delete("/ekskul-pembina-attendance/{item_id}")
async def delete_pembina_self_attendance(item_id: str, user: dict = Depends(get_current_user)):
    row = await db.ekskul_pembina_attendance.find_one({"id": item_id})
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    await ensure_own_ekskul(user, row["ekskul_id"])
    await db.ekskul_pembina_attendance.delete_one({"id": item_id})
    return {"message": "Data absen diri dihapus"}


# --- Jurnal ekskul ---

@api_router.post("/ekskul-jurnal")
async def add_ekskul_jurnal(payload: EkskulJurnalInput, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, payload.ekskul_id)
    doc = {"id": str(uuid.uuid4()), "date": payload.date, "ekskul_id": payload.ekskul_id, "materi": payload.materi.strip(), "catatan": payload.catatan.strip(), "recorded_by": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.ekskul_jurnal.insert_one({**doc})
    return doc


@api_router.get("/ekskul-jurnal")
async def list_ekskul_jurnal(ekskul_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, ekskul_id)
    return await db.ekskul_jurnal.find({"ekskul_id": ekskul_id}, {"_id": 0}).sort("date", -1).to_list(300)


@api_router.delete("/ekskul-jurnal/{item_id}")
async def delete_ekskul_jurnal(item_id: str, user: dict = Depends(get_current_user)):
    row = await db.ekskul_jurnal.find_one({"id": item_id})
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    await ensure_own_ekskul(user, row["ekskul_id"])
    await db.ekskul_jurnal.delete_one({"id": item_id})
    return {"message": "Jurnal dihapus"}


# --- Prestasi / hasil lomba ekskul ---

@api_router.post("/ekskul-prestasi")
async def add_ekskul_prestasi(payload: EkskulPrestasiInput, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, payload.ekskul_id)
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "recorded_by": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.ekskul_prestasi.insert_one({**doc})
    return doc


@api_router.get("/ekskul-prestasi")
async def list_ekskul_prestasi(ekskul_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, ekskul_id)
    return await db.ekskul_prestasi.find({"ekskul_id": ekskul_id}, {"_id": 0}).sort("date", -1).to_list(300)


@api_router.delete("/ekskul-prestasi/{item_id}")
async def delete_ekskul_prestasi(item_id: str, user: dict = Depends(get_current_user)):
    row = await db.ekskul_prestasi.find_one({"id": item_id})
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    await ensure_own_ekskul(user, row["ekskul_id"])
    await db.ekskul_prestasi.delete_one({"id": item_id})
    return {"message": "Data prestasi dihapus"}


# --- Bank deskripsi nilai (per predikat, per ekskul) ---

@api_router.post("/ekskul-deskripsi")
async def add_ekskul_deskripsi(payload: EkskulDeskripsiInput, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, payload.ekskul_id)
    doc = {"id": str(uuid.uuid4()), "ekskul_id": payload.ekskul_id, "predikat": payload.predikat.strip(), "deskripsi": payload.deskripsi.strip()}
    await db.ekskul_deskripsi.insert_one({**doc})
    return doc


@api_router.get("/ekskul-deskripsi")
async def list_ekskul_deskripsi(ekskul_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, ekskul_id)
    return await db.ekskul_deskripsi.find({"ekskul_id": ekskul_id}, {"_id": 0}).to_list(200)


@api_router.delete("/ekskul-deskripsi/{item_id}")
async def delete_ekskul_deskripsi(item_id: str, user: dict = Depends(get_current_user)):
    row = await db.ekskul_deskripsi.find_one({"id": item_id})
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    await ensure_own_ekskul(user, row["ekskul_id"])
    await db.ekskul_deskripsi.delete_one({"id": item_id})
    return {"message": "Deskripsi dihapus"}


# --- Nilai ekskul (per peserta, disimpan bertahap seperti riwayat penilaian) ---

@api_router.post("/ekskul-nilai")
async def save_ekskul_nilai(payload: EkskulNilaiInput, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, payload.ekskul_id)
    now = datetime.now(timezone.utc).isoformat()
    docs = [{"id": str(uuid.uuid4()), "ekskul_id": payload.ekskul_id, "student": e.student, "predikat": e.predikat, "deskripsi": e.deskripsi, "recorded_by": user["name"], "created_at": now} for e in payload.entries]
    if docs:
        await db.ekskul_nilai.insert_many([dict(d) for d in docs])
    return {"message": "Nilai ekskul tersimpan", "count": len(docs)}


@api_router.get("/ekskul-nilai")
async def list_ekskul_nilai(ekskul_id: str, user: dict = Depends(get_current_user)):
    await ensure_own_ekskul(user, ekskul_id)
    return await db.ekskul_nilai.find({"ekskul_id": ekskul_id}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.delete("/ekskul-nilai/{item_id}")
async def delete_ekskul_nilai(item_id: str, user: dict = Depends(get_current_user)):
    row = await db.ekskul_nilai.find_one({"id": item_id})
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    await ensure_own_ekskul(user, row["ekskul_id"])
    await db.ekskul_nilai.delete_one({"id": item_id})
    return {"message": "Nilai dihapus"}


# ================= MODUL PIKET =================

@api_router.post("/guru-piket")
async def add_guru_piket(payload: NameInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip()}
    await db.guru_piket.insert_one({**doc})
    return doc


@api_router.get("/guru-piket")
async def list_guru_piket(user: dict = Depends(get_current_user)):
    return await db.guru_piket.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api_router.delete("/guru-piket/{item_id}")
async def delete_guru_piket(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.guru_piket.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Data guru piket dihapus"}


@api_router.post("/guru-piket/import")
async def import_guru_piket(file: UploadFile = File(...), user: dict = Depends(require_role("Admin"))):
    content = await file.read()
    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="File Excel tidak valid") from exc
    rows = list(workbook.active.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="File Excel kosong")
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    if "nama" not in headers:
        raise HTTPException(status_code=400, detail="Kolom 'Nama' tidak ditemukan pada baris pertama")
    name_idx = headers.index("nama")
    existing_names = {g["name"].strip().lower() for g in await db.guru_piket.find({}, {"name": 1}).to_list(1000)}
    docs, imported, skipped = [], 0, 0
    for row in rows[1:]:
        name = str(row[name_idx]).strip() if name_idx < len(row) and row[name_idx] else ""
        if not name:
            continue
        if name.lower() in existing_names:
            skipped += 1
            continue
        docs.append({"id": str(uuid.uuid4()), "name": name})
        existing_names.add(name.lower())
        imported += 1
    if docs:
        await db.guru_piket.insert_many(docs)
    return {"imported": imported, "skipped": skipped}


@api_router.post("/beban-mengajar")
async def add_beban_mengajar(payload: BebanMengajarInput, user: dict = Depends(require_role("Admin"))):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump()}
    await db.beban_mengajar.insert_one({**doc})
    return doc


@api_router.get("/beban-mengajar")
async def list_beban_mengajar(user: dict = Depends(get_current_user)):
    return await db.beban_mengajar.find({}, {"_id": 0}).to_list(2000)


@api_router.delete("/beban-mengajar/{item_id}")
async def delete_beban_mengajar(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.beban_mengajar.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Beban mengajar dihapus"}


@api_router.get("/piket/schedule")
async def get_piket_schedule(date: str, shift: str, user: dict = Depends(get_current_user)):
    hari = hari_dari_tanggal(date)
    classes_in_shift = {c["name"] for c in await db.classes.find({"shift": shift}, {"_id": 0, "name": 1}).to_list(500)}
    beban = await db.beban_mengajar.find({"day": hari}, {"_id": 0}).to_list(1000)
    slots = [b for b in beban if b["class_name"] in classes_in_shift]
    saved = await db.piket_attendance.find_one({"date": date, "shift": shift}, {"_id": 0})
    saved_lookup = {}
    if saved:
        for e in saved.get("entries", []):
            key = (e["teacher"], e["class_name"], e["subject"], e["jam_awal"], e["jam_akhir"])
            saved_lookup[key] = e
    result_entries = []
    for s in slots:
        key = (s["teacher"], s["class_name"], s["subject"], s["jam_awal"], s["jam_akhir"])
        prev = saved_lookup.get(key)
        result_entries.append({
            "teacher": s["teacher"], "class_name": s["class_name"], "subject": s["subject"],
            "jam_awal": s["jam_awal"], "jam_akhir": s["jam_akhir"],
            "jam_hadir": prev["jam_hadir"] if prev else list(range(s["jam_awal"], s["jam_akhir"] + 1)),
            "status": prev["status"] if prev else "",
        })
    return {
        "date": date, "shift": shift, "day": hari,
        "entries": result_entries,
        "piket_guru": (saved or {}).get("piket_guru", []),
        "upacara": (saved or {}).get("upacara"),
        "duha": (saved or {}).get("duha"),
        "murotal": (saved or {}).get("murotal"),
        "penyambut": (saved or {}).get("penyambut"),
    }


@api_router.post("/piket-attendance")
async def save_piket_attendance(payload: PiketAttendanceInput, user: dict = Depends(get_current_user)):
    ensure_piket_shift(user, payload.shift)
    key = {"date": payload.date, "shift": payload.shift}
    update = {
        "day": hari_dari_tanggal(payload.date),
        "entries": [e.model_dump() for e in payload.entries],
        "piket_guru": payload.piket_guru,
        "upacara": payload.upacara.model_dump() if payload.upacara else None,
        "duha": payload.duha.model_dump() if payload.duha else None,
        "murotal": payload.murotal.model_dump() if payload.murotal else None,
        "penyambut": payload.penyambut.model_dump() if payload.penyambut else None,
        "recorded_by": user["name"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.piket_attendance.update_one(key, {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), **key}}, upsert=True)
    return {"message": "Absensi & jam mengajar tersimpan"}


@api_router.get("/piket-attendance/history")
async def list_piket_attendance_history(date_from: str, date_to: str, user: dict = Depends(get_current_user)):
    return await db.piket_attendance.find({"date": {"$gte": date_from, "$lte": date_to}}, {"_id": 0}).sort("date", -1).to_list(400)


@api_router.delete("/piket-attendance/entry")
async def delete_piket_entry(date: str, shift: str, teacher: str, class_name: str, subject: str, jam_awal: int, jam_akhir: int, user: dict = Depends(get_current_user)):
    ensure_piket_shift(user, shift)
    await db.piket_attendance.update_one({"date": date, "shift": shift}, {"$pull": {"entries": {"teacher": teacher, "class_name": class_name, "subject": subject, "jam_awal": jam_awal, "jam_akhir": jam_akhir}}})
    return {"message": "Entri absensi dihapus"}


@api_router.delete("/piket-attendance/{item_id}")
async def delete_piket_attendance(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.piket_attendance.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Data absensi harian dihapus"}


@api_router.post("/izin-siswa")
async def add_izin_siswa(payload: IzinSiswaInput, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "recorded_by": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.izin_siswa.insert_one({**doc})
    return doc


@api_router.get("/izin-siswa")
async def list_izin_siswa(date_from: str | None = None, date_to: str | None = None, user: dict = Depends(get_current_user)):
    query = {"date": {"$gte": date_from, "$lte": date_to}} if date_from and date_to else {}
    return await db.izin_siswa.find(query, {"_id": 0}).sort("date", -1).to_list(500)


@api_router.delete("/izin-siswa/{item_id}")
async def delete_izin_siswa(item_id: str, user: dict = Depends(get_current_user)):
    result = await db.izin_siswa.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Data izin dihapus"}


@api_router.post("/pelanggaran-siswa")
async def add_pelanggaran_siswa(payload: PelanggaranSiswaInput, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "recorded_by": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.pelanggaran_siswa.insert_one({**doc})
    return doc


@api_router.get("/pelanggaran-siswa")
async def list_pelanggaran_siswa(date_from: str | None = None, date_to: str | None = None, user: dict = Depends(get_current_user)):
    query = {"date": {"$gte": date_from, "$lte": date_to}} if date_from and date_to else {}
    return await db.pelanggaran_siswa.find(query, {"_id": 0}).sort("date", -1).to_list(500)


@api_router.delete("/pelanggaran-siswa/{item_id}")
async def delete_pelanggaran_siswa(item_id: str, user: dict = Depends(get_current_user)):
    result = await db.pelanggaran_siswa.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Data pelanggaran dihapus"}


@api_router.post("/jurnal-piket")
async def add_jurnal_piket(payload: JurnalPiketInput, user: dict = Depends(get_current_user)):
    ensure_piket_shift(user, payload.shift)
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "recorded_by": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.jurnal_piket.insert_one({**doc})
    return doc


@api_router.get("/jurnal-piket")
async def list_jurnal_piket(date_from: str | None = None, date_to: str | None = None, user: dict = Depends(get_current_user)):
    query = {"date": {"$gte": date_from, "$lte": date_to}} if date_from and date_to else {}
    return await db.jurnal_piket.find(query, {"_id": 0}).sort("date", -1).to_list(500)


@api_router.delete("/jurnal-piket/{item_id}")
async def delete_jurnal_piket(item_id: str, user: dict = Depends(get_current_user)):
    result = await db.jurnal_piket.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Jurnal piket dihapus"}


# ================= MODUL ABSEN SEKRETARIS KELAS & WALI KELAS =================

async def ensure_class_write_access(user: dict, class_name: str) -> bool:
    """Return True kalau boleh tanpa batas (Admin/WaliKelas, bisa koreksi), False kalau Sekretaris (dibatasi 1x per hari)."""
    if user["role"] == "Admin":
        return True
    if user["role"] == "Sekretaris":
        if user.get("secretary_class") != class_name:
            raise HTTPException(status_code=403, detail="Akun Anda tidak memiliki akses ke kelas ini")
        return False
    homeroom = await get_homeroom_class(user)
    if homeroom == class_name:
        return True
    raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke kelas ini")


@api_router.post("/daily-attendance")
async def save_daily_attendance(payload: DailyAttendanceInput, user: dict = Depends(get_current_user)):
    can_correct = await ensure_class_write_access(user, payload.class_name)
    key = {"date": payload.date, "class_name": payload.class_name}
    existing = await db.daily_attendance.find_one(key)
    if existing and not can_correct:
        raise HTTPException(status_code=400, detail="Kelas ini sudah diabsen untuk tanggal ini. Absen ulang tidak bisa dilakukan, hubungi Wali Kelas/Admin kalau perlu koreksi.")
    update = {"entries": [e.model_dump() for e in payload.entries], "recorded_by": user["name"], "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.daily_attendance.update_one(key, {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), **key, "created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"message": "Absensi kelas tersimpan"}


@api_router.get("/daily-attendance")
async def get_daily_attendance(date: str, class_name: str, user: dict = Depends(get_current_user)):
    await ensure_class_write_access(user, class_name)
    doc = await db.daily_attendance.find_one({"date": date, "class_name": class_name}, {"_id": 0})
    return doc or {"date": date, "class_name": class_name, "entries": []}


@api_router.get("/daily-attendance/history")
async def list_daily_attendance_history(class_name: str, date_from: str, date_to: str, user: dict = Depends(get_current_user)):
    await ensure_class_write_access(user, class_name)
    return await db.daily_attendance.find({"class_name": class_name, "date": {"$gte": date_from, "$lte": date_to}}, {"_id": 0}).sort("date", -1).to_list(400)


@api_router.delete("/daily-attendance/{item_id}")
async def delete_daily_attendance(item_id: str, user: dict = Depends(get_current_user)):
    row = await db.daily_attendance.find_one({"id": item_id})
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    can_correct = await ensure_class_write_access(user, row["class_name"])
    if not can_correct:
        raise HTTPException(status_code=403, detail="Sekretaris tidak bisa menghapus absensi yang sudah dikirim, hubungi Wali Kelas/Admin")
    await db.daily_attendance.delete_one({"id": item_id})
    return {"message": "Data absensi dihapus"}


@api_router.post("/sekretaris-accounts")
async def create_sekretaris_account(payload: SekretarisAccountInput, user: dict = Depends(require_role("Admin"))):
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    user_id = str(uuid.uuid4())
    await db.users.insert_one({"id": user_id, "username": username, "name": payload.name.strip(), "role": "Sekretaris", "password_hash": hash_password(payload.password), "secretary_class": payload.secretary_class, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Akun sekretaris kelas berhasil dibuat", "id": user_id}


@api_router.get("/sekretaris-accounts")
async def list_sekretaris_accounts(user: dict = Depends(require_role("Admin"))):
    return await db.users.find({"role": "Sekretaris"}, {"_id": 0, "password_hash": 0}).to_list(300)


@api_router.put("/sekretaris-accounts/{item_id}")
async def update_sekretaris_account(item_id: str, payload: SekretarisAccountUpdateInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": "Sekretaris"}, {"$set": {"name": payload.name.strip(), "secretary_class": payload.secretary_class}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun sekretaris tidak ditemukan")
    return {"message": "Akun sekretaris diperbarui"}


@api_router.put("/sekretaris-accounts/{item_id}/password")
async def reset_sekretaris_password(item_id: str, payload: TeacherPasswordInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": "Sekretaris"}, {"$set": {"password_hash": hash_password(payload.password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun sekretaris tidak ditemukan")
    return {"message": "Password sekretaris berhasil diperbarui"}


@api_router.delete("/sekretaris-accounts/{item_id}")
async def delete_sekretaris_account(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.users.delete_one({"id": item_id, "role": "Sekretaris"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Akun sekretaris tidak ditemukan")
    return {"message": "Akun sekretaris dihapus"}


# ================= MODUL TATA USAHA (TU) =================

def slugify_username(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "", name.lower())
    return (s[:20] or "user")


def gen_default_password(prefix: str) -> str:
    return f"{prefix}{secrets.randbelow(9000) + 1000}"


async def unique_username(base: str) -> str:
    username = base
    i = 1
    while await db.users.find_one({"username": username}):
        i += 1
        username = f"{base}{i}"
    return username


# --- Biodata siswa (Buku Induk bagian A) ---

@api_router.get("/students/{item_id}")
async def get_student_detail(item_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "Siswa" and user.get("student_id") != item_id:
        raise HTTPException(status_code=403, detail="Anda hanya bisa melihat data Anda sendiri")
    doc = await db.students.find_one({"id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return doc


@api_router.put("/students/{item_id}/biodata")
async def update_student_biodata(item_id: str, payload: BiodataInput, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.students.update_one({"id": item_id}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return {"message": "Biodata siswa diperbarui"}


@api_router.put("/students/{item_id}/photo")
async def update_student_photo(item_id: str, payload: StudentPhotoInput, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.students.update_one({"id": item_id}, {"$set": {"photo": payload.photo}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return {"message": "Foto siswa diperbarui"}


@api_router.post("/students/import-biodata")
async def import_students_biodata(file: UploadFile = File(...), user: dict = Depends(require_role("Admin", "TU"))):
    content = await file.read()
    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="File Excel tidak valid") from exc
    rows = list(workbook.active.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="File Excel kosong")
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    for required in ["nama", "kelas"]:
        if required not in headers:
            raise HTTPException(status_code=400, detail=f"Kolom '{required}' tidak ditemukan pada baris pertama")
    idx = {h: headers.index(h) for h in headers if h}

    def cell(row, col):
        i = idx.get(col)
        return str(row[i]).strip() if i is not None and i < len(row) and row[i] is not None else ""

    def norm(text: str) -> str:
        return re.sub(r"\s+", " ", text.strip()).lower()

    existing_students = await db.students.find({}, {"_id": 0, "id": 1, "name": 1, "class_name": 1}).to_list(5000)
    lookup = {(norm(s["name"]), norm(s["class_name"])): s["id"] for s in existing_students}

    created_names, updated_names, skipped_rows = [], [], []
    for row_num, row in enumerate(rows[1:], start=2):
        name, class_name = cell(row, "nama"), cell(row, "kelas")
        if not name or not class_name:
            skipped_rows.append(row_num)
            continue
        biodata = {
            "nomor_induk": cell(row, "nomor_induk"), "nisn": cell(row, "nisn"), "nik": cell(row, "nik"), "tempat_lahir": cell(row, "tempat_lahir"),
            "tanggal_lahir": cell(row, "tanggal_lahir"), "jenis_kelamin": cell(row, "jenis_kelamin"),
            "agama": cell(row, "agama"), "alamat": cell(row, "alamat"), "nama_ayah": cell(row, "nama_ayah"),
            "pekerjaan_ayah": cell(row, "pekerjaan_ayah"), "nama_ibu": cell(row, "nama_ibu"),
            "pekerjaan_ibu": cell(row, "pekerjaan_ibu"), "nama_wali": cell(row, "nama_wali"),
            "no_hp_ortu": cell(row, "no_hp_ortu"), "status": cell(row, "status") or "Aktif",
        }
        key = (norm(name), norm(class_name))
        existing_id = lookup.get(key)
        if existing_id:
            await db.students.update_one({"id": existing_id}, {"$set": biodata})
            updated_names.append(f"{name} ({class_name})")
        else:
            new_id = str(uuid.uuid4())
            await db.students.insert_one({"id": new_id, "name": name, "class_name": class_name, **biodata})
            lookup[key] = new_id
            created_names.append(f"{name} ({class_name})")
    return {"imported": len(created_names), "updated": len(updated_names), "created_names": created_names, "updated_names": updated_names, "skipped_rows": skipped_rows}


@api_router.put("/teachers/{item_id}/nip")
async def set_teacher_nip(item_id: str, payload: TeacherNipInput, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.teachers.update_one({"id": item_id}, {"$set": {"nip": payload.nip.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data guru tidak ditemukan")
    return {"message": "NIP diperbarui"}


# --- Transkrip nilai (Buku Induk bagian B) ---

@api_router.post("/transkrip/generate")
async def generate_transkrip(student: str, class_name: str, semester: int, date_from: str, date_to: str, user: dict = Depends(require_role("Admin", "TU"))):
    grade_docs = await db.grades.find({"class_name": class_name, "date": {"$gte": date_from, "$lte": date_to}}, {"_id": 0}).to_list(1000)
    per_subject: dict[str, list[float]] = {}
    for doc in grade_docs:
        for e in doc.get("entries", []):
            if e["student"] == student:
                per_subject.setdefault(doc["subject"], []).append(e["score"])
    subjects = [{"subject": subj, "nilai": round(sum(vals) / len(vals), 1)} for subj, vals in per_subject.items()]

    att_docs = await db.attendance.find({"class_name": class_name, "date": {"$gte": date_from, "$lte": date_to}}, {"_id": 0}).to_list(1000)
    daily_docs = await db.daily_attendance.find({"class_name": class_name, "date": {"$gte": date_from, "$lte": date_to}}, {"_id": 0}).to_list(1000)
    counts = {"H": 0, "S": 0, "I": 0, "A": 0}
    for doc in att_docs + daily_docs:
        for e in doc.get("entries", []):
            if e["student"] == student:
                counts[e["status"]] = counts.get(e["status"], 0) + 1

    key = {"student": student, "class_name": class_name, "semester": semester}
    existing = await db.transkrip.find_one(key)
    update = {"subjects": subjects, "kehadiran": counts, "updated_at": datetime.now(timezone.utc).isoformat()}
    if existing:
        await db.transkrip.update_one({"id": existing["id"]}, {"$set": update})
        return {"message": "Transkrip diperbarui dari data Modul Guru"}
    await db.transkrip.insert_one({"id": str(uuid.uuid4()), **key, **update, "sikap": "", "catatan": ""})
    return {"message": "Transkrip dibuat dari data Modul Guru"}


@api_router.put("/transkrip/{item_id}")
async def update_transkrip(item_id: str, payload: TranskripInput, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.transkrip.update_one({"id": item_id}, {"$set": {"subjects": [s.model_dump() for s in payload.subjects], "sikap": payload.sikap, "catatan": payload.catatan}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data transkrip tidak ditemukan")
    return {"message": "Transkrip diperbarui"}


@api_router.get("/transkrip")
async def list_transkrip(student: str, user: dict = Depends(get_current_user)):
    if user["role"] == "Siswa" and user["name"] != student:
        raise HTTPException(status_code=403, detail="Anda hanya bisa melihat nilai Anda sendiri")
    return await db.transkrip.find({"student": student}, {"_id": 0}).sort("semester", 1).to_list(6)


@api_router.post("/transkrip/import")
async def import_transkrip(file: UploadFile = File(...), user: dict = Depends(require_role("Admin", "TU"))):
    content = await file.read()
    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="File Excel tidak valid") from exc
    rows = list(workbook.active.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="File Excel kosong")
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    for required in ["nama", "kelas", "semester", "mapel", "nilai"]:
        if required not in headers:
            raise HTTPException(status_code=400, detail=f"Kolom '{required}' tidak ditemukan")
    idx = {h: headers.index(h) for h in headers if h}
    grouped: dict[tuple, list] = {}
    for row in rows[1:]:
        def raw(col):
            i = idx.get(col)
            return row[i] if i is not None and i < len(row) else None
        name, kelas, sem, mapel, nilai = raw("nama"), raw("kelas"), raw("semester"), raw("mapel"), raw("nilai")
        if not name or not kelas or sem is None or not mapel or nilai is None:
            continue
        key = (str(name).strip(), str(kelas).strip(), int(sem))
        grouped.setdefault(key, []).append({"subject": str(mapel).strip(), "nilai": float(nilai)})
    count = 0
    for (name, kelas, sem), subjects in grouped.items():
        key = {"student": name, "class_name": kelas, "semester": sem}
        existing = await db.transkrip.find_one(key)
        if existing:
            await db.transkrip.update_one({"id": existing["id"]}, {"$set": {"subjects": subjects, "updated_at": datetime.now(timezone.utc).isoformat()}})
        else:
            await db.transkrip.insert_one({"id": str(uuid.uuid4()), **key, "subjects": subjects, "kehadiran": {}, "sikap": "", "catatan": "", "updated_at": datetime.now(timezone.utc).isoformat()})
        count += 1
    return {"message": f"{count} data transkrip diimpor/diperbarui"}


# --- RBAC: generate akun massal & reset password ---

@api_router.post("/accounts/mass-generate")
async def mass_generate_accounts(payload: MassGenerateInput, user: dict = Depends(require_role("Admin", "TU"))):
    created = []
    if payload.target == "guru":
        for t in await db.teachers.find({}, {"_id": 0}).to_list(500):
            if t.get("user_id"):
                continue
            username = await unique_username((t.get("nip") or slugify_username(t["name"])).lower())
            password = gen_default_password("Guru")
            user_id = str(uuid.uuid4())
            await db.users.insert_one({"id": user_id, "username": username, "name": t["name"], "role": "Guru", "password_hash": hash_password(password), "created_at": datetime.now(timezone.utc).isoformat()})
            await db.teachers.update_one({"id": t["id"]}, {"$set": {"user_id": user_id, "username": username}})
            created.append({"name": t["name"], "username": username, "password": password, "keterangan": "Guru"})
    elif payload.target == "siswa":
        query = {"class_name": payload.class_name} if payload.class_name else {}
        for s in await db.students.find(query, {"_id": 0}).to_list(3000):
            if s.get("user_id"):
                continue
            username = await unique_username((s.get("nisn") or slugify_username(s["name"])).lower())
            password = gen_default_password("Siswa")
            user_id = str(uuid.uuid4())
            await db.users.insert_one({"id": user_id, "username": username, "name": s["name"], "role": "Siswa", "password_hash": hash_password(password), "student_id": s["id"], "created_at": datetime.now(timezone.utc).isoformat()})
            await db.students.update_one({"id": s["id"]}, {"$set": {"user_id": user_id, "username": username}})
            created.append({"name": s["name"], "username": username, "password": password, "keterangan": s.get("class_name", "")})
    elif payload.target == "sekretaris":
        existing_classes = {u.get("secretary_class") for u in await db.users.find({"role": "Sekretaris"}, {"secretary_class": 1}).to_list(200)}
        for c in await db.classes.find({}, {"_id": 0}).to_list(200):
            if c["name"] in existing_classes:
                continue
            username = await unique_username(f"sekretaris{slugify_username(c['name'])}")
            password = gen_default_password("Sekre")
            user_id = str(uuid.uuid4())
            await db.users.insert_one({"id": user_id, "username": username, "name": f"Sekretaris {c['name']}", "role": "Sekretaris", "password_hash": hash_password(password), "secretary_class": c["name"], "created_at": datetime.now(timezone.utc).isoformat()})
            created.append({"name": f"Sekretaris {c['name']}", "username": username, "password": password, "keterangan": c["name"]})
    elif payload.target == "pembina":
        assigned_ids: set[str] = set()
        for u in await db.users.find({"role": "Pembina"}, {"ekskul_ids": 1}).to_list(200):
            assigned_ids.update(u.get("ekskul_ids") or [])
        for ek in await db.ekskul.find({}, {"_id": 0}).to_list(200):
            if ek["id"] in assigned_ids:
                continue
            username = await unique_username(f"pembina{slugify_username(ek['name'])}")
            password = gen_default_password("Pembina")
            user_id = str(uuid.uuid4())
            await db.users.insert_one({"id": user_id, "username": username, "name": ek.get("pembina_name") or ek["name"], "role": "Pembina", "password_hash": hash_password(password), "ekskul_ids": [ek["id"]], "created_at": datetime.now(timezone.utc).isoformat()})
            created.append({"name": ek.get("pembina_name") or ek["name"], "username": username, "password": password, "keterangan": ek["name"]})
    return {"created": created, "count": len(created)}


@api_router.get("/accounts")
async def list_all_accounts(role: str | None = None, user: dict = Depends(require_role("Admin", "TU"))):
    query = {"role": role} if role else {}
    return await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(3000)


@api_router.put("/accounts/{item_id}/reset-password")
async def reset_password_generic(item_id: str, payload: ResetPasswordGenericInput, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.users.update_one({"id": item_id}, {"$set": {"password_hash": hash_password(payload.password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    return {"message": "Password berhasil direset"}


# --- Persuratan digital ---

@api_router.post("/surat-keluar")
async def add_surat_keluar(payload: SuratKeluarInput, user: dict = Depends(require_role("Admin", "TU"))):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "recorded_by": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.surat_keluar.insert_one({**doc})
    return doc


@api_router.get("/surat-keluar")
async def list_surat_keluar(user: dict = Depends(require_role("Admin", "TU"))):
    return await db.surat_keluar.find({}, {"_id": 0}).sort("tanggal", -1).to_list(500)


@api_router.delete("/surat-keluar/{item_id}")
async def delete_surat_keluar(item_id: str, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.surat_keluar.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Data surat keluar dihapus"}


@api_router.post("/surat-masuk")
async def add_surat_masuk(payload: SuratMasukInput, user: dict = Depends(require_role("Admin", "TU"))):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "recorded_by": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.surat_masuk.insert_one({**doc})
    return doc


@api_router.get("/surat-masuk")
async def list_surat_masuk(user: dict = Depends(require_role("Admin", "TU"))):
    return await db.surat_masuk.find({}, {"_id": 0}).sort("tanggal", -1).to_list(500)


@api_router.delete("/surat-masuk/{item_id}")
async def delete_surat_masuk(item_id: str, user: dict = Depends(require_role("Admin", "TU"))):
    result = await db.surat_masuk.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"message": "Data surat masuk dihapus"}


# --- Akun TU (dibuat oleh Admin) ---

@api_router.post("/tu-accounts")
async def create_tu_account(payload: TuAccountInput, user: dict = Depends(require_role("Admin"))):
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    user_id = str(uuid.uuid4())
    await db.users.insert_one({"id": user_id, "username": username, "name": payload.name.strip(), "role": "TU", "password_hash": hash_password(payload.password), "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Akun TU berhasil dibuat", "id": user_id}


@api_router.get("/tu-accounts")
async def list_tu_accounts(user: dict = Depends(require_role("Admin"))):
    return await db.users.find({"role": "TU"}, {"_id": 0, "password_hash": 0}).to_list(100)


@api_router.put("/tu-accounts/{item_id}")
async def update_tu_account(item_id: str, payload: TuAccountUpdateInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": "TU"}, {"$set": {"name": payload.name.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun TU tidak ditemukan")
    return {"message": "Akun TU diperbarui"}


@api_router.put("/tu-accounts/{item_id}/password")
async def reset_tu_password(item_id: str, payload: TeacherPasswordInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": "TU"}, {"$set": {"password_hash": hash_password(payload.password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun TU tidak ditemukan")
    return {"message": "Password TU berhasil diperbarui"}


@api_router.delete("/tu-accounts/{item_id}")
async def delete_tu_account(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.users.delete_one({"id": item_id, "role": "TU"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Akun TU tidak ditemukan")
    return {"message": "Akun TU dihapus"}


# --- Laporan (export Excel) ---

@api_router.get("/reports/export-buku-induk")
async def export_buku_induk(user: dict = Depends(require_role("Admin", "TU"))):
    students = await db.students.find({}, {"_id": 0}).sort([("class_name", 1), ("name", 1)]).to_list(3000)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Buku Induk"
    headers = ["No", "Nama", "Kelas", "NISN", "NIK", "Tempat Lahir", "Tanggal Lahir", "Jenis Kelamin", "Agama", "Alamat", "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu", "Nama Wali", "No HP Ortu", "Status"]
    sheet.append(headers)
    for i, s in enumerate(students, start=1):
        sheet.append([i, s.get("name", ""), s.get("class_name", ""), s.get("nisn", ""), s.get("nik", ""), s.get("tempat_lahir", ""), s.get("tanggal_lahir", ""), s.get("jenis_kelamin", ""), s.get("agama", ""), s.get("alamat", ""), s.get("nama_ayah", ""), s.get("pekerjaan_ayah", ""), s.get("nama_ibu", ""), s.get("pekerjaan_ibu", ""), s.get("nama_wali", ""), s.get("no_hp_ortu", ""), s.get("status", "Aktif")])
    for column in sheet.columns:
        sheet.column_dimensions[column[0].column_letter].width = max(12, min(28, max(len(str(cell.value or "")) for cell in column) + 2))
    stream = io.BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="buku-induk.xlsx"'})


@api_router.get("/reports/export-absensi-guru")
async def export_absensi_guru(date_from: str, date_to: str, user: dict = Depends(require_role("Admin", "TU"))):
    docs = await db.piket_attendance.find({"date": {"$gte": date_from, "$lte": date_to}}, {"_id": 0}).sort("date", 1).to_list(1000)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Absensi Guru"
    sheet.append(["No", "Tanggal", "Shift", "Guru", "Kelas", "Mapel", "Jam Aktual", "Status"])
    i = 0
    for doc in docs:
        for e in doc.get("entries", []):
            i += 1
            sheet.append([i, doc["date"], doc["shift"], e["teacher"], e["class_name"], e["subject"], ", ".join(str(j) for j in e.get("jam_hadir", [])), e.get("status") or "Hadir"])
    for column in sheet.columns:
        sheet.column_dimensions[column[0].column_letter].width = max(12, min(28, max(len(str(cell.value or "")) for cell in column) + 2))
    stream = io.BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="rekap-absensi-guru.xlsx"'})


@api_router.get("/reports/export-absensi-siswa")
async def export_absensi_siswa(date_from: str, date_to: str, user: dict = Depends(require_role("Admin", "TU"))):
    docs = await db.daily_attendance.find({"date": {"$gte": date_from, "$lte": date_to}}, {"_id": 0}).sort("date", 1).to_list(1000)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Absensi Siswa"
    sheet.append(["No", "Tanggal", "Kelas", "Nama Siswa", "Status", "Catatan"])
    i = 0
    for doc in docs:
        for e in doc.get("entries", []):
            i += 1
            sheet.append([i, doc["date"], doc["class_name"], e["student"], e["status"], e.get("note", "")])
    for column in sheet.columns:
        sheet.column_dimensions[column[0].column_letter].width = max(12, min(28, max(len(str(cell.value or "")) for cell in column) + 2))
    stream = io.BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="rekap-absensi-siswa.xlsx"'})


@api_router.post("/piket-accounts")
async def create_piket_account(payload: PiketAccountInput, user: dict = Depends(require_role("Admin"))):
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    user_id = str(uuid.uuid4())
    await db.users.insert_one({"id": user_id, "username": username, "name": payload.name.strip(), "role": f"Piket {payload.shift}", "password_hash": hash_password(payload.password), "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Akun piket berhasil dibuat", "id": user_id}


@api_router.get("/piket-accounts")
async def list_piket_accounts(user: dict = Depends(require_role("Admin"))):
    rows = await db.users.find({"role": {"$in": ["Piket Pagi", "Piket Siang"]}}, {"_id": 0, "password_hash": 0}).to_list(200)
    for r in rows:
        r["shift"] = r["role"].replace("Piket ", "")
    return rows


@api_router.put("/piket-accounts/{item_id}")
async def update_piket_account(item_id: str, payload: PiketAccountUpdateInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": {"$in": ["Piket Pagi", "Piket Siang"]}}, {"$set": {"name": payload.name.strip(), "role": f"Piket {payload.shift}"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun piket tidak ditemukan")
    return {"message": "Akun piket diperbarui"}


@api_router.put("/piket-accounts/{item_id}/password")
async def reset_piket_password(item_id: str, payload: TeacherPasswordInput, user: dict = Depends(require_role("Admin"))):
    result = await db.users.update_one({"id": item_id, "role": {"$in": ["Piket Pagi", "Piket Siang"]}}, {"$set": {"password_hash": hash_password(payload.password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun piket tidak ditemukan")
    return {"message": "Password piket berhasil diperbarui"}


@api_router.delete("/piket-accounts/{item_id}")
async def delete_piket_account(item_id: str, user: dict = Depends(require_role("Admin"))):
    result = await db.users.delete_one({"id": item_id, "role": {"$in": ["Piket Pagi", "Piket Siang"]}})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Akun piket tidak ditemukan")
    return {"message": "Akun piket dihapus"}


@api_router.post("/teachers/import")
async def import_teachers(file: UploadFile = File(...), user: dict = Depends(require_role("Admin"))):
    content = await file.read()
    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="File Excel tidak valid") from exc
    rows = list(workbook.active.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="File Excel kosong")
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    if "nama" not in headers:
        raise HTTPException(status_code=400, detail="Kolom 'Nama' tidak ditemukan pada baris pertama")
    name_idx = headers.index("nama")
    existing_names = {t["name"].strip().lower() for t in await db.teachers.find({}, {"name": 1}).to_list(1000)}
    docs, imported, skipped = [], 0, 0
    for row in rows[1:]:
        name = str(row[name_idx]).strip() if name_idx < len(row) and row[name_idx] else ""
        if not name:
            continue
        if name.lower() in existing_names:
            skipped += 1
            continue
        docs.append({"id": str(uuid.uuid4()), "name": name})
        existing_names.add(name.lower())
        imported += 1
    if docs:
        await db.teachers.insert_many(docs)
    return {"imported": imported, "skipped": skipped}


@api_router.post("/students/import")
async def import_students(file: UploadFile = File(...), user: dict = Depends(require_role("Admin"))):
    content = await file.read()
    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="File Excel tidak valid") from exc
    rows = list(workbook.active.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="File Excel kosong")
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    if "nama" not in headers or "kelas" not in headers:
        raise HTTPException(status_code=400, detail="Kolom 'Nama' dan 'Kelas' wajib ada pada baris pertama")
    name_idx, class_idx = headers.index("nama"), headers.index("kelas")
    valid_classes = {c["name"] for c in await db.classes.find({}, {"name": 1}).to_list(200)}
    existing_pairs = {(s["name"].strip().lower(), s["class_name"]) for s in await db.students.find({}, {"name": 1, "class_name": 1}).to_list(2000)}
    docs, imported, skipped, errors = [], 0, 0, []
    for i, row in enumerate(rows[1:], start=2):
        name = str(row[name_idx]).strip() if name_idx < len(row) and row[name_idx] else ""
        class_name = str(row[class_idx]).strip() if class_idx < len(row) and row[class_idx] else ""
        if not name or not class_name:
            continue
        if class_name not in valid_classes:
            errors.append(f"Baris {i}: kelas '{class_name}' tidak ditemukan")
            skipped += 1
            continue
        key = (name.lower(), class_name)
        if key in existing_pairs:
            skipped += 1
            continue
        docs.append({"id": str(uuid.uuid4()), "name": name, "class_name": class_name})
        existing_pairs.add(key)
        imported += 1
    if docs:
        await db.students.insert_many(docs)
    return {"imported": imported, "skipped": skipped, "errors": errors}


@api_router.post("/attendance")
async def save_attendance(payload: AttendanceInput, user: dict = Depends(get_current_user)):
    await ensure_own_class_subject(user, payload.class_name, payload.subject)
    key = {"date": payload.date, "class_name": payload.class_name, "subject": payload.subject}
    update = {"entries": [e.model_dump() for e in payload.entries], "recorded_by": user["name"], "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.attendance.update_one(key, {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), **key}}, upsert=True)
    return {"message": "Absensi tersimpan", "count": len(payload.entries)}


@api_router.get("/attendance")
async def get_attendance(date: str, class_name: str, subject: str, user: dict = Depends(get_current_user)):
    await ensure_own_class_subject(user, class_name, subject)
    doc = await db.attendance.find_one({"date": date, "class_name": class_name, "subject": subject}, {"_id": 0})
    return doc or {"date": date, "class_name": class_name, "subject": subject, "entries": []}


@api_router.post("/grades")
async def save_grades(payload: GradesInput, user: dict = Depends(get_current_user)):
    await ensure_own_class_subject(user, payload.class_name, payload.subject)
    key = {"date": payload.date, "class_name": payload.class_name, "subject": payload.subject, "assessment_type": payload.assessment_type}
    update = {"entries": [e.model_dump() for e in payload.entries], "recorded_by": user["name"], "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.grades.update_one(key, {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), **key}}, upsert=True)
    return {"message": "Nilai tersimpan", "count": len(payload.entries)}


@api_router.get("/grades")
async def get_grades(date: str, class_name: str, subject: str, assessment_type: str, user: dict = Depends(get_current_user)):
    await ensure_own_class_subject(user, class_name, subject)
    doc = await db.grades.find_one({"date": date, "class_name": class_name, "subject": subject, "assessment_type": assessment_type}, {"_id": 0})
    return doc or {"date": date, "class_name": class_name, "subject": subject, "assessment_type": assessment_type, "entries": []}


@api_router.post("/journals")
async def save_journal(payload: JournalInput, user: dict = Depends(get_current_user)):
    await ensure_own_class_subject(user, payload.class_name, payload.subject)
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "teacher": user["name"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.journals.insert_one({**doc})
    return doc


@api_router.get("/journals")
async def list_journals(user: dict = Depends(get_current_user)):
    # Guru hanya melihat jurnal miliknya sendiri; Admin melihat semua (untuk keperluan pengecekan/oversight).
    query = {} if user["role"] == "Admin" else {"teacher": user["name"]}
    return await db.journals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/schedules")
async def list_schedules(user: dict = Depends(get_current_user)):
    # Guru hanya melihat jadwal miliknya sendiri; Admin melihat semua (untuk keperluan pengecekan/oversight).
    query = {} if user["role"] == "Admin" else {"created_by": user["name"]}
    rows = await db.schedules.find(query, {"_id": 0}).to_list(500)
    return sorted(rows, key=lambda r: (DAY_ORDER.get(r["day"], 9), r["start_time"]))


@api_router.post("/schedules")
async def add_schedule(payload: ScheduleInput, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "created_by": user["name"]}
    await db.schedules.insert_one({**doc})
    return doc


@api_router.delete("/schedules/{item_id}")
async def delete_schedule(item_id: str, user: dict = Depends(get_current_user)):
    query = {"id": item_id} if user["role"] == "Admin" else {"id": item_id, "created_by": user["name"]}
    result = await db.schedules.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    return {"message": "Jadwal dihapus"}


@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    return await db.settings.find_one({"id": "school"}, {"_id": 0}) or {"id": "school", **DEFAULT_SETTINGS}


@api_router.put("/settings")
async def update_settings(payload: SettingsInput, user: dict = Depends(require_role("Admin"))):
    await db.settings.update_one({"id": "school"}, {"$set": payload.model_dump()}, upsert=True)
    return {"message": "Pengaturan tersimpan"}


STATUS_LABELS = {"H": "Hadir", "S": "Sakit", "I": "Izin", "A": "Alpa"}


@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    classes = await db.classes.find({}, {"_id": 0}).to_list(200)
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    journals = await db.journals.find({}, {"_id": 0}).to_list(500)
    month_prefix = datetime.now(timezone.utc).strftime("%Y-%m")
    attendance_docs = await db.attendance.find({"date": {"$regex": f"^{month_prefix}"}}, {"_id": 0}).to_list(500)
    total_marks = 0
    present_marks = 0
    absent_counts: dict[str, dict] = {}
    for doc in attendance_docs:
        for e in doc.get("entries", []):
            total_marks += 1
            if e["status"] == "H":
                present_marks += 1
            if e["status"] == "A":
                entry = absent_counts.setdefault(e["student"], {"name": e["student"], "class_name": doc["class_name"], "count": 0})
                entry["count"] += 1
    attendance_rate = round((present_marks / total_marks) * 100, 1) if total_marks else 0.0
    top_absent = sorted(absent_counts.values(), key=lambda x: x["count"], reverse=True)[:3]
    frequent_absent_count = len([x for x in absent_counts.values() if x["count"] >= 3])
    today_name = DAY_NAMES[datetime.now(timezone.utc).weekday()]
    today_schedule = await db.schedules.find({"day": today_name}, {"_id": 0}).to_list(50)
    today_schedule.sort(key=lambda r: r["start_time"])
    return {
        "classes_count": len(classes),
        "students_count": len(students),
        "attendance_rate": attendance_rate,
        "journals_count": len(journals),
        "journals_incomplete": len([j for j in journals if not j.get("reflection", "").strip()]),
        "top_absent": top_absent,
        "frequent_absent_count": frequent_absent_count,
        "today_day": today_name,
        "today_schedule": today_schedule,
    }


@api_router.get("/dashboard/admin-stats")
async def dashboard_admin_stats(user: dict = Depends(require_role("Admin"))):
    today_str = today_str_var = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    classes = await db.classes.find({}, {"_id": 0}).to_list(200)
    students = await db.students.find({}, {"_id": 0}).to_list(3000)
    teachers = await db.teachers.find({}, {"_id": 0}).to_list(300)
    ekskul_list = await db.ekskul.find({}, {"_id": 0}).to_list(200)

    piket_today = await db.piket_attendance.find({"date": today_str}, {"_id": 0, "shift": 1}).to_list(10)
    shifts_filled = {p["shift"] for p in piket_today}

    daily_today = await db.daily_attendance.find({"date": today_str}, {"_id": 0, "class_name": 1}).to_list(200)
    classes_attended = {d["class_name"] for d in daily_today}
    classes_not_attended = [c["name"] for c in classes if c["name"] not in classes_attended]

    month_prefix = datetime.now(timezone.utc).strftime("%Y-%m")
    surat_masuk = await db.surat_masuk.find({"tanggal": {"$regex": f"^{month_prefix}"}}, {"_id": 0}).to_list(500)
    surat_keluar = await db.surat_keluar.find({"tanggal": {"$regex": f"^{month_prefix}"}}, {"_id": 0}).to_list(500)

    role_counts: dict[str, int] = {}
    for u in await db.users.find({}, {"_id": 0, "role": 1}).to_list(3000):
        role_counts[u["role"]] = role_counts.get(u["role"], 0) + 1

    return {
        "teachers_count": len(teachers),
        "students_count": len(students),
        "classes_count": len(classes),
        "ekskul_count": len(ekskul_list),
        "piket_pagi_filled": "Pagi" in shifts_filled,
        "piket_siang_filled": "Siang" in shifts_filled,
        "classes_not_attended_today": classes_not_attended,
        "classes_attended_today_count": len(classes_attended),
        "surat_masuk_month": len(surat_masuk),
        "surat_keluar_month": len(surat_keluar),
        "role_counts": role_counts,
    }


@api_router.get("/reports/rows", response_model=list[ReportRow])
async def report_rows(kind: str = "attendance", class_name: str | None = None, subject: str | None = None, period: str | None = None, user: dict = Depends(get_current_user)):
    match: dict = {}
    if user["role"] != "Admin":
        # Guru cuma boleh melihat rekap kelas & mapel yang ada di Jadwal Mengajar miliknya sendiri.
        # Kalau tidak pilih kelas/mapel spesifik ("Semua kelas"/"Semua mapel"), dibatasi ke gabungan
        # kelas/mapel yang dia ampu -- bukan seluruh sekolah.
        my_schedules = await db.schedules.find({"created_by": user["name"]}, {"class_name": 1, "subject": 1}).to_list(500)
        my_classes = sorted({s["class_name"] for s in my_schedules})
        my_subjects = sorted({s["subject"] for s in my_schedules})
        if class_name and class_name not in my_classes:
            raise HTTPException(status_code=403, detail="Anda tidak mengampu kelas ini")
        if subject and subject not in my_subjects:
            raise HTTPException(status_code=403, detail="Anda tidak mengampu mata pelajaran ini")
        match["class_name"] = class_name if class_name else {"$in": my_classes or [""]}
        match["subject"] = subject if subject else {"$in": my_subjects or [""]}
    else:
        if class_name:
            match["class_name"] = class_name
        if subject:
            match["subject"] = subject
    if period:
        match["date"] = {"$regex": f"^{period}"}
    rows: list[ReportRow] = []
    if kind == "grades":
        for doc in await db.grades.find(match, {"_id": 0}).sort("date", -1).to_list(200):
            for e in doc.get("entries", []):
                score = float(e["score"])
                predicate = "Sangat baik" if score >= 85 else "Baik" if score >= 75 else "Perlu bimbingan"
                rows.append(ReportRow(no=len(rows) + 1, student=e["student"], class_name=doc["class_name"], subject=doc["subject"], date=doc["date"], status=predicate, value=f"{score:g}"))
    elif kind == "journals":
        for doc in await db.journals.find(match, {"_id": 0}).sort("date", -1).to_list(200):
            rows.append(ReportRow(no=len(rows) + 1, student=doc.get("teacher", user["name"]), class_name=doc["class_name"], subject=doc["subject"], date=doc["date"], status="Tersimpan", value=doc["topic"]))
    else:
        for doc in await db.attendance.find(match, {"_id": 0}).sort("date", -1).to_list(200):
            for e in doc.get("entries", []):
                label = STATUS_LABELS.get(e["status"], e["status"])
                rows.append(ReportRow(no=len(rows) + 1, student=e["student"], class_name=doc["class_name"], subject=doc["subject"], date=doc["date"], status=label, value=label))
    return rows


@api_router.get("/reports/export")
async def export_report(kind: str = "attendance", class_name: str | None = None, subject: str | None = None, period: str | None = None, user: dict = Depends(get_current_user)):
    rows = await report_rows(kind, class_name, subject, period, user)
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
async def print_report(kind: str = "attendance", class_name: str | None = None, subject: str | None = None, period: str | None = None, user: dict = Depends(get_current_user)):
    rows = await report_rows(kind, class_name, subject, period, user)
    school = await db.settings.find_one({"id": "school"}, {"_id": 0}) or DEFAULT_SETTINGS
    title = {"attendance": "Rekap Absensi Siswa", "grades": "Rekap Nilai Siswa", "journals": "Rekap Jurnal Mengajar"}.get(kind, "Rekap AbsenSPG")
    meta_line = f"Kelas: {class_name or 'Semua kelas'} · Mapel: {subject or 'Semua mapel'} · Periode: {period or 'Semua periode'}"
    body = "".join(f"<tr><td>{r.no}</td><td>{r.student}</td><td>{r.class_name}</td><td>{r.subject}</td><td>{r.date}</td><td>{r.status}</td><td>{r.value}</td></tr>" for r in rows) or "<tr><td colspan='7'>Belum ada data tersimpan untuk laporan ini.</td></tr>"
    logo_url = os.environ.get("FRONTEND_URL", "https://educator-dashboard-4.preview.emergentagent.com") + "/logo-smp.png"
    return HTMLResponse(f"""<!doctype html><html lang='id'><head><meta charset='utf-8'><title>{title}</title><style>body{{font-family:Arial,sans-serif;color:#19342a;padding:36px}}h1{{font-size:22px;margin-bottom:4px}}p{{color:#68776e;font-size:12px}}.head{{display:flex;align-items:center;gap:14px}}table{{width:100%;border-collapse:collapse;margin-top:26px}}th,td{{border:1px solid #cfded3;padding:9px;text-align:left;font-size:12px}}th{{background:#e2f0e8}}@media print{{button{{display:none}}}}</style></head><body><button onclick='window.print()'>Cetak laporan</button><div class='head'><img src='{logo_url}' alt='Logo sekolah' style='height:72px'><div><h1>{school['school']}</h1><h2 style='margin:4px 0'>{title}</h2><p style='margin:0'>{school['address']} · Disiapkan oleh {user['name']}</p><p style='margin:4px 0 0'>{meta_line}</p></div></div><table><thead><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Mapel</th><th>Tanggal</th><th>Status</th><th>Nilai / Materi</th></tr></thead><tbody>{body}</tbody></table></body></html>""")


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=[os.environ.get("FRONTEND_URL", "https://educator-dashboard-4.preview.emergentagent.com")], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()