# AbsenSPG Teacher Administration Dashboard

## Original problem statement
I created an application in apps script for teacher administration, taking attendance, giving grades, and so on. I made it like this for the web. I made it with a smooth display.

## Architecture decisions
- React dashboard with responsive desktop/mobile navigation.
- Existing Apps Script concepts are represented as focused workspace views: dashboard, attendance, grades, schedule, teaching journal, reports, administration, and school settings.
- Local component state keeps the first version fast to preview; backend persistence is the next planned phase.
- Indonesian labels and the original AbsenSPG / SMP PGRI Gandoang context are preserved.

## User personas
- Administrator: manages teachers, classes, students, subjects, school identity, and backups.
- Subject teacher: records attendance, grades, schedules, and teaching journals, then prepares reports.

## Core requirements (static)
- Login entry point with teacher/administrator context.
- Dashboard summary with class, student, attendance, journal, schedule, and attention indicators.
- Attendance by date, class, subject, and per-student status.
- Grade entry with formative/summative context and class average.
- Teaching schedule and journal entry workflows.
- Attendance, grade, and journal reporting preview with export/print affordances.
- Administration pages for teachers, classes, students, subjects, school identity, and backup status.
- Responsive interface with unique role-based data-testid attributes on interactive and critical elements.

## What's been implemented
- 2026-02-01: Replaced the starter screen with the AbsenSPG dashboard and login experience.
- 2026-02-01: Added all core navigation views and responsive mobile sidebar.
- 2026-02-01: Added interactive attendance status selection, editable grades, journal forms, report preview, master-data pages, settings, and success feedback.
- 2026-02-01: Added organic earthy visual system, responsive layout, school metadata, and mobile overflow fix.
- 2026-02-01: Verified desktop critical flows and 390px mobile navigation/layout.
- (prior fork): Real JWT auth (httpOnly cookies), Admin/Guru roles, seeded accounts, Excel export + print HTML endpoints.
- 2026-06 (this session): Full MongoDB persistence — attendance (upsert per date/class/subject, round-trip restore), grades (per assessment type), journals (create + saved list), master data create (students/classes/subjects/teachers, Admin-only), school settings GET/PUT, students/masters seed. Reports (rows/Excel/print) now built from REAL DB data. Print header uses saved school settings + logo. Fixed seed so restarts no longer reset passwords. Tested: 61/61 backend pytest + full frontend Playwright pass (iteration_7).
- 2026-06 (this session): Rebranded AbsenSPG → SMP PGRI Gandoang with official school logo (sidebar, login, report preview, printed report, favicon, page title).
- 2026-08 (this session): Jadwal Mengajar persisted to MongoDB (GET/POST/DELETE /api/schedules, per day+class, delete w/ confirm). Master data (guru/kelas/siswa/mapel) now has inline Edit + Delete (PUT/DELETE /api/teachers|classes|subjects|students/{id}, Admin-only). Rekap & Cetak filters (kelas/mapel/periode bulan) now actually filter /api/reports/rows|export|print, plus a real (non-mocked) preview chart built from filtered rows. Dashboard stats (kelas/siswa/rata-rata kehadiran/jurnal) and "siswa sering alpa" now computed live from DB via GET /api/dashboard/stats. Tested: 92/92 backend pytest + all frontend flows pass (iteration_8).
- 2026-08 (this session): Fixed 2 reported bugs — sidebar had no scroll on short viewports, hiding the Keluar/logout button (.sidebar now overflow-y:auto); mobile login logo overlapped the hero text (root cause: absolute positioning with no positioned ancestor). Verified iteration_9.
- 2026-08 (this session): Auth changed from email-based to username-based login. Admin keeps `admin@absenspg.local` (display name now literally "admin"); Guru now logs in with a plain username `guru` (no email format) — LoginInput/UserOut renamed email→username, users collection migrated (email_1 index dropped, username_1 unique index created, password hashes preserved). Login form relabeled Username/text input. Mobile login logo repositioned to sit above the green "RUANG KERJA GURU" hero (two brand elements: .mobile-brand in the green panel, .desktop-brand in the white panel, toggled via media query) — fixed a CSS specificity bug that hid it initially. Verified iterations 10/11.

## Prioritized backlog

### P0
- (none — all explicitly requested features complete)

### P1
- Login brute-force lockout (no rate limiting yet).
- Cascade guard when deleting a class/subject still referenced by students/attendance/grades/journals/schedules.
- Pagination for /api/reports/* and /api/journals (currently to_list(200)/(100) caps).
- Real Excel import for grades.

### P2
- Split App.js into modular components (Dashboard/Reports/Master/Schedule are large single-line components).
- Real backup jobs; audit history; toast queueing; locale-aware date picker.
- Split App.css from minified single-line format to avoid future cascade/specificity bugs.

## Next tasks
1. Login lockout after repeated failed attempts.
2. Guard/cascade behavior on class & subject deletion.
3. Component-level refactor of App.js.