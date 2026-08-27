"""Tests for new features: Excel import (teachers/students) + per-teacher login accounts."""
import io
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values
from openpyxl import Workbook

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"username": "admin@absenspg.local", "password": "Admin123!"}
TAG = uuid.uuid4().hex[:6]


def make_xlsx(headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    assert r.json()["role"] == "Admin"
    assert r.json()["name"] == "admin"
    return s


@pytest.fixture(scope="module")
def created(admin):
    ids = {"teachers": [], "students": []}
    yield ids
    for tid in ids["teachers"]:
        admin.delete(f"{API}/teachers/{tid}")
    for sid in ids["students"]:
        admin.delete(f"{API}/students/{sid}")


# --- Auth / seed ---
class TestAuth:
    def test_admin_login_cookie_and_me(self, admin):
        r = admin.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["username"] == ADMIN["username"]
        assert "access_token" in admin.cookies.get_dict()

    def test_legacy_guru_account_removed(self):
        r = requests.post(f"{API}/auth/login", json={"username": "guru", "password": "Guru123!"})
        assert r.status_code == 401, r.text
        assert "salah" in r.json()["detail"].lower()

    def test_import_requires_auth(self):
        r = requests.post(f"{API}/teachers/import", files={"file": ("a.xlsx", make_xlsx(["Nama"], [["X"]]))})
        assert r.status_code == 401

    def test_account_create_requires_auth(self):
        r = requests.post(f"{API}/teachers/xyz/account", json={"username": "a", "password": "abcdef"})
        assert r.status_code == 401


# --- Excel import ---
class TestImport:
    def test_import_teachers(self, admin, created):
        names = [f"TEST_Guru A {TAG}", f"TEST_Guru B {TAG}"]
        data = make_xlsx(["Nama"], [[n] for n in names])
        r = admin.post(f"{API}/teachers/import", files={"file": ("g.xlsx", data)})
        assert r.status_code == 200, r.text
        assert r.json() == {"imported": 2, "skipped": 0}
        teachers = admin.get(f"{API}/masters").json()["teachers"]
        found = [t for t in teachers if t["name"] in names]
        assert len(found) == 2
        created["teachers"] += [t["id"] for t in found]

    def test_import_teachers_duplicate_skipped(self, admin):
        data = make_xlsx(["Nama"], [[f"TEST_Guru A {TAG}"]])
        r = admin.post(f"{API}/teachers/import", files={"file": ("g.xlsx", data)})
        assert r.status_code == 200
        assert r.json() == {"imported": 0, "skipped": 1}

    def test_import_teachers_missing_column(self, admin):
        data = make_xlsx(["Name"], [["Foo"]])
        r = admin.post(f"{API}/teachers/import", files={"file": ("g.xlsx", data)})
        assert r.status_code == 400
        assert "Nama" in r.json()["detail"]

    def test_import_teachers_invalid_file(self, admin):
        r = admin.post(f"{API}/teachers/import", files={"file": ("g.xlsx", b"not-an-excel")})
        assert r.status_code == 400

    def test_import_students_with_invalid_class(self, admin, created):
        good = f"TEST_Siswa A {TAG}"
        data = make_xlsx(["Nama", "Kelas"], [[good, "7A"], [f"TEST_Siswa B {TAG}", "12Z"]])
        r = admin.post(f"{API}/students/import", files={"file": ("s.xlsx", data)})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["imported"] == 1
        assert body["skipped"] == 1
        assert body["errors"] and "12Z" in body["errors"][0]
        students = admin.get(f"{API}/masters").json()["students"]
        found = [s for s in students if s["name"] == good]
        assert len(found) == 1 and found[0]["class_name"] == "7A"
        created["students"] += [s["id"] for s in found]
        assert not [s for s in students if s["name"] == f"TEST_Siswa B {TAG}"]

    def test_import_students_missing_columns(self, admin):
        data = make_xlsx(["Nama"], [["Foo"]])
        r = admin.post(f"{API}/students/import", files={"file": ("s.xlsx", data)})
        assert r.status_code == 400


# --- Teacher login accounts ---
class TestTeacherAccounts:
    @pytest.fixture(scope="class")
    def teacher(self, admin, created):
        r = admin.post(f"{API}/teachers", json={"name": f"TEST_Akun {TAG}"})
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        created["teachers"].append(tid)
        return tid

    def test_create_account_and_login(self, admin, teacher):
        uname = f"test_guru_{TAG}"
        r = admin.post(f"{API}/teachers/{teacher}/account", json={"username": uname, "password": "Guru123!"})
        assert r.status_code == 200, r.text
        assert r.json()["username"] == uname
        # username reflected in masters list
        t = next(t for t in admin.get(f"{API}/masters").json()["teachers"] if t["id"] == teacher)
        assert t["username"] == uname
        # login as teacher
        s = requests.Session()
        lr = s.post(f"{API}/auth/login", json={"username": uname, "password": "Guru123!"})
        assert lr.status_code == 200, lr.text
        assert lr.json()["role"] == "Guru"
        assert lr.json()["name"] == f"TEST_Akun {TAG}"
        # teacher cannot manage master data
        assert s.post(f"{API}/teachers", json={"name": "nope"}).status_code == 403

    def test_duplicate_username_rejected(self, admin, created, teacher):
        r = admin.post(f"{API}/teachers", json={"name": f"TEST_Akun2 {TAG}"})
        tid2 = r.json()["id"]
        created["teachers"].append(tid2)
        r = admin.post(f"{API}/teachers/{tid2}/account", json={"username": f"test_guru_{TAG}", "password": "Guru123!"})
        assert r.status_code == 400, r.text
        assert "sudah digunakan" in r.json()["detail"].lower()

    def test_second_account_for_same_teacher_rejected(self, admin, teacher):
        r = admin.post(f"{API}/teachers/{teacher}/account", json={"username": f"other_{TAG}", "password": "Guru123!"})
        assert r.status_code == 400
        assert "sudah memiliki akun" in r.json()["detail"].lower()

    def test_short_password_rejected(self, admin, created):
        tid = admin.post(f"{API}/teachers", json={"name": f"TEST_Short {TAG}"}).json()["id"]
        created["teachers"].append(tid)
        r = admin.post(f"{API}/teachers/{tid}/account", json={"username": f"short_{TAG}", "password": "123"})
        assert r.status_code == 422

    def test_reset_password(self, admin, teacher):
        uname = f"test_guru_{TAG}"
        r = admin.put(f"{API}/teachers/{teacher}/account/password", json={"password": "Baru123!"})
        assert r.status_code == 200, r.text
        assert "diperbarui" in r.json()["message"].lower()
        assert requests.post(f"{API}/auth/login", json={"username": uname, "password": "Guru123!"}).status_code == 401
        assert requests.post(f"{API}/auth/login", json={"username": uname, "password": "Baru123!"}).status_code == 200

    def test_reset_password_for_teacher_without_account(self, admin, created):
        tid = admin.post(f"{API}/teachers", json={"name": f"TEST_NoAcc {TAG}"}).json()["id"]
        created["teachers"].append(tid)
        r = admin.put(f"{API}/teachers/{tid}/account/password", json={"password": "Baru123!"})
        assert r.status_code == 404

    def test_cascade_delete_account_on_teacher_delete(self, admin, created):
        tid = admin.post(f"{API}/teachers", json={"name": f"TEST_Cascade {TAG}"}).json()["id"]
        uname = f"cascade_{TAG}"
        assert admin.post(f"{API}/teachers/{tid}/account", json={"username": uname, "password": "Guru123!"}).status_code == 200
        assert requests.post(f"{API}/auth/login", json={"username": uname, "password": "Guru123!"}).status_code == 200
        assert admin.delete(f"{API}/teachers/{tid}").status_code == 200
        assert requests.post(f"{API}/auth/login", json={"username": uname, "password": "Guru123!"}).status_code == 401
        assert not [t for t in admin.get(f"{API}/masters").json()["teachers"] if t["id"] == tid]

    def test_rename_teacher_updates_account_name(self, admin, created):
        tid = admin.post(f"{API}/teachers", json={"name": f"TEST_Rename {TAG}"}).json()["id"]
        created["teachers"].append(tid)
        uname = f"rename_{TAG}"
        admin.post(f"{API}/teachers/{tid}/account", json={"username": uname, "password": "Guru123!"})
        assert admin.put(f"{API}/teachers/{tid}", json={"name": f"TEST_Renamed {TAG}"}).status_code == 200
        s = requests.Session()
        lr = s.post(f"{API}/auth/login", json={"username": uname, "password": "Guru123!"})
        assert lr.status_code == 200
        assert lr.json()["name"] == f"TEST_Renamed {TAG}"


# --- Regression: classes & subjects CRUD ---
class TestRegression:
    def test_class_crud(self, admin):
        r = admin.post(f"{API}/classes", json={"name": f"TEST_K{TAG}"})
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        assert admin.put(f"{API}/classes/{cid}", json={"name": f"TEST_K2{TAG}"}).status_code == 200
        assert any(c["name"] == f"TEST_K2{TAG}" for c in admin.get(f"{API}/masters").json()["classes"])
        assert admin.delete(f"{API}/classes/{cid}").status_code == 200
        assert not any(c["id"] == cid for c in admin.get(f"{API}/masters").json()["classes"])

    def test_subject_crud(self, admin):
        r = admin.post(f"{API}/subjects", json={"name": f"TEST_M{TAG}"})
        assert r.status_code == 200
        sid = r.json()["id"]
        assert admin.put(f"{API}/subjects/{sid}", json={"name": f"TEST_M2{TAG}"}).status_code == 200
        assert admin.delete(f"{API}/subjects/{sid}").status_code == 200
        assert admin.delete(f"{API}/subjects/{sid}").status_code == 404

    def test_dashboard_and_reports_no_crash(self, admin):
        assert admin.get(f"{API}/dashboard/stats").status_code == 200
        assert admin.get(f"{API}/reports/rows").status_code == 200
        assert admin.get(f"{API}/schedules").status_code == 200
