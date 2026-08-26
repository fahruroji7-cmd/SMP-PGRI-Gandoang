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

## Prioritized backlog

### P0
- (none — core persistence and auth complete)

### P1
- Schedule (Jadwal) persistence — page is still static/mocked.
- Edit/Delete for master data (row action buttons are currently no-ops).
- Wire report class/subject/period filters to API (export/print currently return all rows).
- Include assessment_type in grades report rows.
- Real Excel import for grades; login brute-force lockout.

### P2
- Report preview panel rendered from /api/reports/rows (currently static bars).
- Attendance trends/alerts on dashboard (dashboard stats still static).
- Real backup jobs; audit history; toast queueing; locale-aware date picker.

## Next tasks
1. Schedule persistence + dashboard stats from real data.
2. Master data edit/delete.
3. Report filters (class/subject/period).