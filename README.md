# SMP PGRI Gandoang - Dashboard Guru

Dashboard administrasi guru untuk SMP PGRI Gandoang (absensi, jadwal, nilai, jurnal mengajar, dan laporan).

## Struktur Proyek

- `frontend/` - Aplikasi React (antarmuka pengguna)
- `backend/` - API FastAPI + MongoDB

## Menjalankan Secara Lokal

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

**Frontend:**
```bash
cd frontend
yarn install
yarn start
```