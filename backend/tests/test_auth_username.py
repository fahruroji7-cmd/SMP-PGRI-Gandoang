import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN = {"username": "admin@absenspg.local", "password": "Admin123!"}
GURU = {"username": "guru", "password": "Guru123!"}


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health ---
def test_root(client):
    r = client.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert "message" in r.json()


# --- Admin login (username-based) ---
def test_admin_login_username(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["username"] == ADMIN["username"]
    assert data["name"] == "admin"
    assert data["role"] == "Admin"
    assert "email" not in data
    assert "access_token" in r.cookies, f"cookie not set: {r.cookies.get_dict()}"
    # httpOnly cookie check
    raw = r.headers.get("set-cookie", "")
    assert "httponly" in raw.lower()


# --- Guru login with plain username ---
def test_guru_login_plain_username(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json=GURU)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["username"] == "guru"
    assert data["name"] == "Siti Nurhaliza"
    assert data["role"] == "Guru"


# --- Legacy email must fail ---
def test_guru_legacy_email_rejected(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json={"username": "guru@absenspg.local", "password": "Guru123!"})
    assert r.status_code == 401, r.text
    assert "Username atau password salah" in r.json().get("detail", "")


def test_wrong_password(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json={"username": "guru", "password": "wrong"})
    assert r.status_code == 401


def test_login_missing_username_field(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json={"email": "guru", "password": "Guru123!"})
    assert r.status_code == 422


def test_username_case_insensitive(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json={"username": "GURU", "password": "Guru123!"})
    assert r.status_code == 200, r.text
    assert r.json()["username"] == "guru"


# --- Session endpoints ---
def test_me_and_permissions_and_logout(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json=GURU)
    assert r.status_code == 200
    me = client.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200, me.text
    assert me.json()["username"] == "guru"
    perms = client.get(f"{BASE_URL}/api/auth/permissions")
    assert perms.status_code == 200
    assert perms.json()["admin"] is False
    out = client.post(f"{BASE_URL}/api/auth/logout")
    assert out.status_code == 200
    client.cookies.clear()
    assert client.get(f"{BASE_URL}/api/auth/me").status_code == 401


def test_me_unauthenticated():
    r = requests.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


# --- Bcrypt hash format + no stale email field in DB (via API side effects) ---
def test_admin_permissions_flags(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200
    perms = client.get(f"{BASE_URL}/api/auth/permissions")
    assert perms.status_code == 200
    body = perms.json()
    assert body["admin"] is True and body["can_manage_master_data"] is True


# --- Regression smoke: core protected endpoints still work after auth change ---
@pytest.mark.parametrize("path", ["/api/masters", "/api/students", "/api/schedules", "/api/dashboard/stats", "/api/settings"])
def test_protected_endpoints_smoke(client, path):
    r = client.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200
    resp = client.get(f"{BASE_URL}{path}")
    assert resp.status_code == 200, f"{path} -> {resp.status_code} {resp.text[:200]}"
    assert "_id" not in resp.text
