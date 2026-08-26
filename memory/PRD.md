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

## Prioritized backlog

### P0
- Connect attendance, grades, journals, schedules, masters, settings, and reports to FastAPI/MongoDB persistence.
- Replace demo login with role-aware authenticated accounts.

### P1
- Add real Excel import and downloadable XLSX/PDF reports.
- Add duplicate-entry locks for attendance and grading activities.
- Add real Google Drive-style manual and automatic backup jobs.

### P2
- Add trend charts and month/semester comparison.
- Add audit history and bulk editing tools.
- Add configurable school branding/logo upload.

## Next tasks
1. Create MongoDB collections and API models for the existing entities.
2. Wire the React forms and tables to API CRUD endpoints.
3. Add authenticated Admin and Guru role permissions.
4. Implement real report export and backup operations.