# Authentication Testing Notes

AbsenSPG uses real JWT authentication (httpOnly cookie `access_token`, HS256) backed by MongoDB `users`.

## Seeded accounts (idempotent seed on backend startup)
- Admin: `admin@absenspg.local` / `Admin123!`
- Guru: `guru@absenspg.local` / `Guru123!`

## Endpoints
- `POST /api/auth/login` — body `{email, password}`, sets cookie, returns user
- `GET /api/auth/me` — returns current user from cookie
- `POST /api/auth/logout` — clears cookie
- `GET /api/auth/permissions` — role flags

## Notes
- Admin-only writes: master data (students/classes/subjects/teachers) and school settings.
- `.local` email domains are allowed (email field is a plain string, not EmailStr).
- Always send `withCredentials: true` from the frontend.
