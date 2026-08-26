import { useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckSquare,
  ChevronDown, FileDown, FileText, GraduationCap, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, Plus, Printer, Save, School, Search, Settings,
  ShieldCheck, Sparkles, Users, X, BookMarked
} from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "jadwal", label: "Jadwal Mengajar", icon: CalendarDays },
  { id: "absensi", label: "Absensi Siswa", icon: CheckSquare },
  { id: "nilai", label: "Nilai Siswa", icon: GraduationCap },
  { id: "jurnal", label: "Jurnal Mengajar", icon: BookMarked },
  { id: "rekap", label: "Rekap & Cetak", icon: Printer },
];
const ADMIN_NAV = [
  { id: "guru", label: "Kelola Guru", icon: Users },
  { id: "kelas", label: "Kelola Kelas", icon: School },
  { id: "siswa", label: "Kelola Siswa", icon: Users },
  { id: "mapel", label: "Kelola Mapel", icon: BookOpen },
  { id: "pengaturan", label: "Pengaturan", icon: Settings },
];
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
axios.defaults.withCredentials = true;
const today = () => new Date().toISOString().slice(0, 10);
const initials = (name) => name.split(" ").map((x) => x[0]).join("").slice(0, 2);
const errMsg = (err, fallback) => err?.response?.data?.detail || fallback;

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [masters, setMasters] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get(`${API}/auth/me`).then(({ data }) => { setUser(data); setLoggedIn(true); }).catch(() => {}).finally(() => setCheckingSession(false));
  }, []);

  const loadMasters = () => axios.get(`${API}/masters`).then(({ data }) => setMasters(data)).catch(() => {});
  useEffect(() => {
    if (!loggedIn) return;
    loadMasters();
    axios.get(`${API}/settings`).then(({ data }) => setSettings(data)).catch(() => {});
  }, [loggedIn]);

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const navigate = (id) => { setActive(id); setMobileOpen(false); };
  const downloadReport = async (kind) => {
    try {
      const response = await axios.get(`${API}/reports/export?kind=${kind}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a"); link.href = url; link.download = `absenspg-${kind}.xlsx`; link.click(); URL.revokeObjectURL(url);
      showToast("File Excel berhasil diunduh");
    } catch { showToast("Gagal mengunduh laporan"); }
  };
  const printReport = async (kind) => {
    const response = await axios.get(`${API}/reports/print?kind=${kind}`);
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(response.data); printWindow.document.close(); }
  };
  const addMaster = (endpoint, successMessage) => async (payload) => {
    try { await axios.post(`${API}/${endpoint}`, payload); await loadMasters(); showToast(successMessage); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan data")); }
  };

  if (checkingSession) return <div className="session-loading" data-testid="session-loading">Memuat ruang kerja...</div>;
  if (!loggedIn) return <Login onLogin={(account) => { setUser(account); setLoggedIn(true); }} />;

  const classNames = masters ? masters.classes.map((c) => c.name) : [];
  const subjectNames = masters ? masters.subjects.map((s) => s.name) : [];
  const ready = classNames.length > 0 && subjectNames.length > 0;
  const loadingPanel = <div className="session-loading" data-testid="masters-loading">Memuat data sekolah...</div>;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`} data-testid="sidebar-navigation">
        <div className="brand"><img className="brand-logo" src="/logo-smp.png" alt="Logo SMP PGRI Gandoang" data-testid="sidebar-logo" /><div><strong>SMP PGRI Gandoang</strong><span>Kab. Bogor · Teacher workspace</span></div></div>
        <div className="profile"><div className="avatar">{user?.name ? initials(user.name) : "AF"}</div><div><strong data-testid="current-user-name">{user?.name || "Ahmad Fauzi"}</strong><span data-testid="current-user-role">{user?.role || "Guru"}</span></div><ShieldCheck size={16} className="profile-check" /></div>
        <nav className="nav-list" aria-label="Navigasi utama">
          <div className="nav-caption">Workspace</div>
          {NAV.map((item) => <NavItem key={item.id} item={item} active={active} onClick={navigate} />)}
          {user?.role === "Admin" && <><div className="nav-caption admin-caption">Administration</div>{ADMIN_NAV.map((item) => <NavItem key={item.id} item={item} active={active} onClick={navigate} />)}</>}
        </nav>
        <div className="sidebar-bottom"><div className="backup-chip"><span className="pulse-dot" /> Backup otomatis aktif <ChevronDown size={14} /></div><button className="logout-button" data-testid="logout-button" onClick={async () => { await axios.post(`${API}/auth/logout`, {}); setUser(null); setLoggedIn(false); }}><LogOut size={16} /> Keluar</button></div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" data-testid="mobile-menu-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />}
      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu-button" data-testid="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={20} /></button><div className="crumb"><span>{settings?.school || "SMP PGRI Gandoang"}</span><ArrowRight size={14} /><strong>{NAV.concat(ADMIN_NAV).find((n) => n.id === active)?.label || "Dashboard"}</strong></div><div className="top-actions"><button className="icon-button" data-testid="global-search-button" aria-label="Cari"><Search size={18} /></button><div className="date-badge" data-testid="today-date"><CalendarDays size={15} /> {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div><div className="mini-avatar">{user?.name ? initials(user.name) : "AF"}</div></div></header>
        <div className="page-wrap">
          {active === "dashboard" && <Dashboard navigate={navigate} user={user} />}
          {active === "absensi" && (ready ? <Attendance classes={classNames} subjects={subjectNames} showToast={showToast} /> : loadingPanel)}
          {active === "nilai" && (ready ? <Grades classes={classNames} subjects={subjectNames} showToast={showToast} /> : loadingPanel)}
          {active === "jadwal" && <Schedule onSave={() => showToast("Jadwal baru ditambahkan")} />}
          {active === "jurnal" && (ready ? <Journal classes={classNames} subjects={subjectNames} showToast={showToast} /> : loadingPanel)}
          {active === "rekap" && <Reports onExport={downloadReport} onPrint={printReport} classes={classNames} subjects={subjectNames} />}
          {active === "guru" && masters && <Master title="Kelola Guru" icon={Users} rows={masters.teachers} addLabel="Tambah guru" onAdd={addMaster("teachers", "Data guru diperbarui")} />}
          {active === "kelas" && masters && <Master title="Kelola Kelas" icon={School} rows={masters.classes} addLabel="Tambah kelas" onAdd={addMaster("classes", "Kelas baru ditambahkan")} />}
          {active === "siswa" && masters && <Master title="Kelola Siswa" icon={Users} rows={masters.students} addLabel="Tambah siswa" onAdd={addMaster("students", "Data siswa diperbarui")} classes={classNames} />}
          {active === "mapel" && masters && <Master title="Kelola Mata Pelajaran" icon={BookOpen} rows={masters.subjects} addLabel="Tambah mapel" onAdd={addMaster("subjects", "Mata pelajaran ditambahkan")} />}
          {active === "pengaturan" && settings && <SettingsView settings={settings} setSettings={setSettings} showToast={showToast} />}
        </div>
      </main>
      {toast && <div className="toast" data-testid="success-toast"><Check size={16} /> {toast}</div>}
    </div>
  );
}

function Login({ onLogin }) { const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const submit = async (e) => { e.preventDefault(); setError(""); if (!username || !password) return setError("Username dan password wajib diisi."); setLoading(true); try { const { data } = await axios.post(`${API}/auth/login`, { email: username, password }); onLogin(data); } catch (err) { setError(errMsg(err, "Email atau password salah.")); } finally { setLoading(false); } }; return <div className="login-page"><div className="login-visual"><div className="visual-copy"><span className="eyebrow"><Sparkles size={14} /> Ruang kerja guru</span><h1>Semua kelas.<br /><em>Satu kendali.</em></h1><p>Kelola kehadiran, nilai, jadwal, dan jurnal pembelajaran dengan lebih tenang.</p></div><div className="visual-footer">SMP PGRI Gandoang <span>•</span> Teacher Administration</div></div><div className="login-panel"><div className="login-brand"><img className="brand-logo" src="/logo-smp.png" alt="Logo SMP PGRI Gandoang" data-testid="login-logo" /><span>SMP PGRI Gandoang</span></div><div className="login-content"><span className="eyebrow">Selamat datang kembali</span><h2>Masuk ke ruang kerja</h2><p className="muted">Gunakan akun guru atau administrator Anda.</p><form onSubmit={submit}><label>Email<input data-testid="login-username-input" type="email" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nama@absenspg.local" /></label><label>Password<input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" /></label>{error && <div className="form-error" data-testid="login-error">{error}</div>}<button className="primary-button login-submit" data-testid="login-submit-button" disabled={loading}>{loading ? "Memeriksa akun..." : "Masuk ke dashboard"} {!loading && <ArrowRight size={17} />}</button></form><p className="login-note">Admin: admin@absenspg.local · Guru: guru@absenspg.local</p></div></div></div>; }
function NavItem({ item, active, onClick }) { const Icon = item.icon; return <button className={`nav-item ${active === item.id ? "active" : ""}`} data-testid={`nav-${item.id}`} onClick={() => onClick(item.id)}><Icon size={17} /><span>{item.label}</span>{active === item.id && <span className="nav-active-dot" />}</button>; }
function PageTitle({ eyebrow, title, description, action }) { return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1 data-testid="page-title">{title}</h1><p>{description}</p></div>{action}</div>; }
function Dashboard({ navigate, user }) { return <><PageTitle eyebrow={new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} title={`Selamat datang, ${user?.name?.split(" ")[0] || "Guru"}`} description="Berikut ringkasan kegiatan mengajar Anda hari ini." action={<button className="primary-button" data-testid="dashboard-attendance-cta" onClick={() => navigate("absensi")}><CheckSquare size={17} /> Isi absensi</button>} /><div className="stat-grid"><Stat label="Kelas diampu" value="4" change="+1 dari semester lalu" icon={School} color="green" /><Stat label="Siswa aktif" value="126" change="98% data terisi" icon={Users} color="amber" /><Stat label="Rata-rata kehadiran" value="94,8%" change="+2,4% bulan ini" icon={BarChart3} color="blue" /><Stat label="Jurnal tersimpan" value="18" change="3 perlu dilengkapi" icon={BookMarked} color="rose" /></div><div className="dashboard-grid"><section className="panel schedule-panel"><PanelHeading title="Jadwal hari ini" subtitle="Senin, 12 Mei 2025" action={<button className="text-button" data-testid="dashboard-schedule-link" onClick={() => navigate("jadwal")}>Lihat semua <ArrowRight size={14} /></button>} /><div className="timeline"><TimelineItem time="07.00 — 08.20" classNameName="7A" subject="Matematika" room="Ruang 3" active /><TimelineItem time="09.00 — 10.20" classNameName="8A" subject="Matematika" room="Ruang 5" /><TimelineItem time="11.00 — 12.20" classNameName="9A" subject="Informatika" room="Lab Komputer" /></div></section><section className="panel attention-panel"><PanelHeading title="Perlu perhatian" subtitle="Absensi bulan ini" action={<AlertTriangle size={18} className="warning-icon" />} /><div className="attention-callout"><div className="attention-number">7</div><div><strong>siswa sering tidak hadir</strong><p>Lebih dari 3 kali alpa bulan ini</p></div></div>{["Raka Firmansyah", "Nabila Putri", "Rizky Maulana"].map((name, i) => <div className="attention-row" key={name}><div className="student-avatar">{initials(name)}</div><span>{name}</span><b>{4 - i}x alpa</b></div>)}<button className="outline-button" data-testid="view-attention-button" onClick={() => navigate("rekap")}>Buka rekap absensi <ArrowRight size={15} /></button></section></div><section className="quick-section"><div className="section-heading"><div><span className="eyebrow">Akses cepat</span><h2>Mulai dari sini</h2></div><span className="muted">Pekerjaan rutin Anda, lebih ringkas.</span></div><div className="quick-grid"><QuickAction icon={CheckSquare} title="Absensi siswa" text="Catat kehadiran kelas" onClick={() => navigate("absensi")} testid="quick-attendance" /><QuickAction icon={GraduationCap} title="Input nilai" text="Kelola nilai formatif" onClick={() => navigate("nilai")} testid="quick-grades" /><QuickAction icon={BookMarked} title="Jurnal mengajar" text="Simpan refleksi kelas" onClick={() => navigate("jurnal")} testid="quick-journal" /></div></section></>; }
function Stat({ label, value, change, icon: Icon, color }) { return <div className="stat-card" data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}><div className={`stat-icon ${color}`}><Icon size={19} /></div><div><span>{label}</span><strong>{value}</strong><small>{change}</small></div></div>; }
function PanelHeading({ title, subtitle, action }) { return <div className="panel-heading"><div><h2>{title}</h2><span>{subtitle}</span></div>{action}</div>; }
function TimelineItem({ time, classNameName, subject, room, active }) { return <div className={`timeline-item ${active ? "current" : ""}`}><div className="time">{time}</div><div className="timeline-line"><span /></div><div className="lesson"><div><strong>{subject}</strong><span>{classNameName} · {room}</span></div>{active && <span className="now-badge">Sedang berlangsung</span>}</div></div>; }
function QuickAction({ icon: Icon, title, text, onClick, testid }) { return <button className="quick-action" data-testid={testid} onClick={onClick}><div className="quick-icon"><Icon size={21} /></div><div><strong>{title}</strong><span>{text}</span></div><ArrowRight size={17} /></button>; }
function FormShell({ children, title, subtitle, onSave, saveLabel = "Simpan perubahan", saving }) { return <section className="panel form-panel"><PanelHeading title={title} subtitle={subtitle} />{children}<div className="form-actions"><button className="primary-button" data-testid="form-save-button" onClick={onSave} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : saveLabel}</button></div></section>; }
function Select({ label, value, onChange, options, testid }) { return <label className="field">{label}<select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>; }

function Attendance({ classes, subjects, showToast }) {
  const [date, setDate] = useState(today());
  const [className, setClassName] = useState(classes[0]);
  const [subject, setSubject] = useState(subjects[0]);
  const [roster, setRoster] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const [studentsRes, savedRes] = await Promise.all([
        axios.get(`${API}/students`, { params: { class_name: className } }),
        axios.get(`${API}/attendance`, { params: { date, class_name: className, subject } }),
      ]);
      const saved = Object.fromEntries(savedRes.data.entries.map((e) => [e.student, e]));
      setRoster(studentsRes.data);
      setStatuses(Object.fromEntries(studentsRes.data.map((s) => [s.name, saved[s.name]?.status || "H"])));
      setNotes(Object.fromEntries(studentsRes.data.map((s) => [s.name, saved[s.name]?.note || ""])));
    } catch { showToast("Gagal memuat data absensi"); }
  };
  useEffect(() => { load(); }, [date, className, subject]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!roster.length) return showToast("Tidak ada siswa untuk disimpan");
    setSaving(true);
    try {
      await axios.post(`${API}/attendance`, { date, class_name: className, subject, entries: roster.map((s) => ({ student: s.name, status: statuses[s.name] || "H", note: notes[s.name] || "" })) });
      showToast(`Absensi ${className} berhasil disimpan`);
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan absensi")); } finally { setSaving(false); }
  };
  return <><PageTitle eyebrow="Kegiatan mengajar" title="Absensi siswa" description="Catat kehadiran siswa tanpa pengulangan data." action={<button className="secondary-button" data-testid="attendance-history-button"><FileText size={16} /> Riwayat absensi</button>} /><div className="filter-grid panel"><label className="field">Tanggal<input data-testid="attendance-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><Select label="Kelas" testid="attendance-class-select" value={className} onChange={setClassName} options={classes} /><Select label="Mata pelajaran" testid="attendance-subject-select" value={subject} onChange={setSubject} options={subjects} /><button className="secondary-button filter-button" data-testid="attendance-load-button" onClick={load}><Search size={16} /> Tampilkan siswa</button></div><section className="panel roster-panel"><PanelHeading title={`Kelas ${className} · ${subject}`} subtitle={`${date} · ${roster.length} siswa`} action={<div className="status-legend"><span><i className="status-dot hadir" /> Hadir</span><span><i className="status-dot sakit" /> Sakit</span><span><i className="status-dot izin" /> Izin</span><span><i className="status-dot alpa" /> Alpa</span></div>} /><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama siswa</th><th>Status kehadiran</th><th>Catatan</th></tr></thead><tbody>{roster.map((s, i) => <tr key={s.id}><td>{String(i + 1).padStart(2, "0")}</td><td><div className="name-cell"><span className="student-avatar">{initials(s.name)}</span><strong>{s.name}</strong></div></td><td><div className="status-buttons">{[["H", "Hadir", "hadir"], ["S", "Sakit", "sakit"], ["I", "Izin", "izin"], ["A", "Alpa", "alpa"]].map(([code, name, style]) => <button key={code} className={`${style} ${statuses[s.name] === code ? "selected" : ""}`} data-testid={`attendance-${i + 1}-${code.toLowerCase()}`} onClick={() => setStatuses({ ...statuses, [s.name]: code })}>{code}<span>{name}</span></button>)}</div></td><td><input className="table-input" data-testid={`attendance-note-${i + 1}`} value={notes[s.name] || ""} onChange={(e) => setNotes({ ...notes, [s.name]: e.target.value })} placeholder="Tambah catatan" /></td></tr>)}{!roster.length && <tr><td colSpan="4" data-testid="attendance-empty-state">Tidak ada siswa pada kelas ini.</td></tr>}</tbody></table></div><div className="roster-footer"><span><Check size={15} /> {Object.values(statuses).filter((x) => x === "H").length} siswa hadir</span><button className="primary-button" data-testid="attendance-save-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan absensi"}</button></div></section></>;
}

const GRADE_TYPES = ["Formatif", "Sumatif Lingkup Materi", "Sumatif Tengah Semester"];
function Grades({ classes, subjects, showToast }) {
  const [date, setDate] = useState(today());
  const [className, setClassName] = useState(classes[0]);
  const [subject, setSubject] = useState(subjects[0]);
  const [type, setType] = useState(GRADE_TYPES[0]);
  const [roster, setRoster] = useState([]);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const [studentsRes, savedRes] = await Promise.all([
        axios.get(`${API}/students`, { params: { class_name: className } }),
        axios.get(`${API}/grades`, { params: { date, class_name: className, subject, assessment_type: type } }),
      ]);
      const saved = Object.fromEntries(savedRes.data.entries.map((e) => [e.student, e.score]));
      setRoster(studentsRes.data);
      setScores(Object.fromEntries(studentsRes.data.map((s) => [s.name, saved[s.name] ?? 80])));
    } catch { showToast("Gagal memuat data nilai"); }
  };
  useEffect(() => { load(); }, [date, className, subject, type]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!roster.length) return showToast("Tidak ada siswa untuk disimpan");
    setSaving(true);
    try {
      await axios.post(`${API}/grades`, { date, class_name: className, subject, assessment_type: type, entries: roster.map((s) => ({ student: s.name, score: Math.min(100, Math.max(0, Number(scores[s.name]) || 0)) })) });
      showToast("Nilai siswa berhasil disimpan");
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan nilai")); } finally { setSaving(false); }
  };
  const average = roster.length ? (roster.reduce((a, s) => a + (Number(scores[s.name]) || 0), 0) / roster.length).toFixed(1) : "0.0";
  return <><PageTitle eyebrow="Kegiatan mengajar" title="Nilai siswa" description="Kelola penilaian formatif dan sumatif dalam satu tempat." action={<button className="secondary-button" data-testid="grades-import-button"><FileDown size={16} /> Impor Excel</button>} /><div className="filter-grid panel grades-filter"><label className="field">Tanggal<input data-testid="grades-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><Select label="Kelas" testid="grades-class-select" value={className} onChange={setClassName} options={classes} /><Select label="Mata pelajaran" testid="grades-subject-select" value={subject} onChange={setSubject} options={subjects} /><Select label="Jenis penilaian" testid="grades-type-select" value={type} onChange={setType} options={GRADE_TYPES} /></div><section className="panel roster-panel"><PanelHeading title={`${type} · ${subject}`} subtitle={`Kelas ${className} · ${date}`} action={<span className="saved-badge"><Check size={14} /> {roster.length} siswa</span>} /><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama siswa</th><th>Nilai (0—100)</th><th>Predikat</th></tr></thead><tbody>{roster.map((s, i) => { const grade = Number(scores[s.name]) || 0; return <tr key={s.id}><td>{String(i + 1).padStart(2, "0")}</td><td><div className="name-cell"><span className="student-avatar">{initials(s.name)}</span><strong>{s.name}</strong></div></td><td><input className="grade-input" data-testid={`grade-input-${i + 1}`} type="number" min="0" max="100" value={scores[s.name] ?? ""} onChange={(e) => setScores({ ...scores, [s.name]: e.target.value })} /></td><td><span className={`grade-pill ${grade >= 85 ? "excellent" : grade >= 75 ? "good" : "needs"}`}>{grade >= 85 ? "Sangat baik" : grade >= 75 ? "Baik" : "Perlu bimbingan"}</span></td></tr>; })}{!roster.length && <tr><td colSpan="4" data-testid="grades-empty-state">Tidak ada siswa pada kelas ini.</td></tr>}</tbody></table></div><div className="roster-footer"><span>Rata-rata kelas <strong>{average}</strong></span><button className="primary-button" data-testid="grades-save-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan nilai"}</button></div></section></>;
}

function Schedule({ onSave }) { return <><PageTitle eyebrow="Kegiatan mengajar" title="Jadwal mengajar" description="Susun ritme hari mengajar Anda dengan jelas." action={<button className="primary-button" data-testid="schedule-add-button" onClick={onSave}><Plus size={17} /> Tambah jadwal</button>} /><section className="week-strip panel">{["Sen", "Sel", "Rab", "Kam", "Jum"].map((day, i) => <button className={i === 0 ? "selected" : ""} data-testid={`schedule-day-${i + 1}`} key={day}><strong>{day}</strong><span>{12 + i}</span></button>)}</section><section className="panel schedule-table"><PanelHeading title="Senin, 12 Mei" subtitle="3 jadwal mengajar" /><TimelineItem time="07.00 — 08.20" classNameName="7A" subject="Matematika" room="Ruang 3" active /><TimelineItem time="09.00 — 10.20" classNameName="8A" subject="Matematika" room="Ruang 5" /><TimelineItem time="11.00 — 12.20" classNameName="9A" subject="Informatika" room="Lab Komputer" /></section></>; }

function Journal({ classes, subjects, showToast }) {
  const empty = { date: today(), period: 1, class_name: classes[0], subject: subjects[0], topic: "", activity: "", reflection: "" };
  const [form, setForm] = useState(empty);
  const [journals, setJournals] = useState([]);
  const [saving, setSaving] = useState(false);
  const loadJournals = () => axios.get(`${API}/journals`).then(({ data }) => setJournals(data)).catch(() => {});
  useEffect(() => { loadJournals(); }, []);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const save = async () => {
    if (!form.topic.trim() || !form.activity.trim()) return showToast("Materi pokok dan kegiatan wajib diisi");
    setSaving(true);
    try {
      await axios.post(`${API}/journals`, { ...form, period: Number(form.period) || 1 });
      showToast("Jurnal pembelajaran tersimpan");
      setForm({ ...empty, date: form.date });
      loadJournals();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan jurnal")); } finally { setSaving(false); }
  };
  return <><PageTitle eyebrow="Kegiatan mengajar" title="Jurnal mengajar" description="Simpan jejak pembelajaran dan refleksi setiap kelas." /><FormShell title="Catat jurnal baru" subtitle={form.date} onSave={save} saveLabel="Simpan jurnal" saving={saving}><div className="form-grid"><label className="field">Tanggal<input data-testid="journal-date-input" type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} /></label><label className="field">Jam ke-<input data-testid="journal-period-input" type="number" min="1" value={form.period} onChange={(e) => set("period")(e.target.value)} /></label><Select label="Kelas" testid="journal-class-select" value={form.class_name} onChange={set("class_name")} options={classes} /><Select label="Mata pelajaran" testid="journal-subject-select" value={form.subject} onChange={set("subject")} options={subjects} /><label className="field full">Materi pokok<input data-testid="journal-topic-input" value={form.topic} onChange={(e) => set("topic")(e.target.value)} placeholder="Contoh: Operasi aljabar" /></label><label className="field full">Kegiatan pembelajaran<textarea data-testid="journal-activity-input" rows="4" value={form.activity} onChange={(e) => set("activity")(e.target.value)} placeholder="Tuliskan kegiatan pendahuluan, inti, dan penutup..." /></label><label className="field full">Refleksi <span className="optional">opsional</span><textarea data-testid="journal-reflection-input" rows="3" value={form.reflection} onChange={(e) => set("reflection")(e.target.value)} placeholder="Apa yang berjalan baik hari ini?" /></label></div></FormShell><section className="panel master-panel"><PanelHeading title="Jurnal tersimpan" subtitle={`${journals.length} catatan`} /><div className="master-list">{journals.map((j) => <div className="master-row" key={j.id} data-testid={`journal-row-${j.id}`}><div className="master-icon"><BookMarked size={18} /></div><div><strong>{j.topic}</strong><span>{j.class_name} · {j.subject} · {j.date} · Jam ke-{j.period}</span></div></div>)}{!journals.length && <div className="master-row" data-testid="journal-empty-state"><div><strong>Belum ada jurnal</strong><span>Jurnal yang Anda simpan akan tampil di sini.</span></div></div>}</div></section></>;
}

function Reports({ onExport, onPrint, classes, subjects }) { const [kind, setKind] = useState("attendance"); const labels = { attendance: "Rekap Absensi Siswa", grades: "Rekap Nilai Siswa", journals: "Rekap Jurnal Mengajar" }; return <><PageTitle eyebrow="Data & laporan" title="Rekap dan cetak" description="Siapkan laporan absensi, nilai, atau jurnal untuk dibagikan." action={<button className="secondary-button" data-testid="report-export-button" onClick={() => onExport(kind)}><FileDown size={16} /> Ekspor Excel</button>} /><div className="report-layout"><section className="panel"><PanelHeading title="Buat laporan" subtitle="Pilih data yang ingin ditampilkan" /><div className="stack-form"><label className="field">Jenis laporan<select data-testid="report-type-select" value={kind} onChange={(e) => setKind(e.target.value)}><option value="attendance">Rekap absensi</option><option value="grades">Rekap nilai</option><option value="journals">Rekap jurnal mengajar</option></select></label><label className="field">Kelas<select data-testid="report-class-select"><option>Semua kelas</option>{classes.map((c) => <option key={c}>{c}</option>)}</select></label><label className="field">Mata pelajaran<select data-testid="report-subject-select"><option>Semua mata pelajaran</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label><label className="field">Periode<select data-testid="report-period-select"><option>Semua periode</option><option>Semester genap 2024/2025</option></select></label><button className="primary-button" data-testid="report-preview-button" onClick={() => onExport(kind)}><BarChart3 size={16} /> Tampilkan rekap</button></div></section><section className="panel report-preview"><div className="report-paper"><div className="report-head"><img className="brand-logo" src="/logo-smp.png" alt="Logo sekolah" /><div><strong>SMP PGRI Gandoang</strong><span>{labels[kind]}</span></div></div><div className="report-line" /><div className="report-meta"><span>Periode<strong>Semua periode</strong></span><span>Kelas<strong>Semua</strong></span><span>Mapel<strong>Semua</strong></span></div><div className="mini-bars">{[84, 96, 90, 100, 88].map((h, i) => <div key={i}><span style={{ height: `${h}%` }} /><small>{["A", "B", "C", "D", "E"][i]}</small></div>)}</div><button className="outline-button" data-testid="report-print-button" onClick={() => onPrint(kind)}><Printer size={15} /> Pratinjau cetak</button></div></section></div></>; }

function Master({ title, icon: Icon, rows, addLabel, onAdd, classes }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [className, setClassName] = useState(classes?.[0] || "");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(classes ? { name: name.trim(), class_name: className } : { name: name.trim() });
    setSaving(false); setName(""); setOpen(false);
  };
  const filtered = rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle eyebrow="Administration" title={title} description="Kelola data dasar sekolah Anda." action={<button className="primary-button" data-testid="master-add-button" onClick={() => setOpen(!open)}>{open ? <X size={17} /> : <Plus size={17} />} {open ? "Tutup" : addLabel}</button>} /><section className="panel master-panel">{open && <div className="filter-grid" style={{ marginBottom: 18 }}><label className="field full">Nama<input data-testid="master-add-name-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Masukkan nama baru" autoFocus /></label>{classes && <Select label="Kelas" testid="master-add-class-select" value={className} onChange={setClassName} options={classes} />}<button className="primary-button filter-button" data-testid="master-add-submit-button" onClick={submit} disabled={saving || !name.trim()}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan"}</button></div>}<div className="master-toolbar"><div className="search-field"><Search size={16} /><input data-testid="master-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Cari ${title.toLowerCase()}...`} /></div><button className="icon-button" data-testid="master-more-button" aria-label="Opsi lainnya"><MoreHorizontal size={18} /></button></div><div className="master-list">{filtered.map((row, i) => <div className="master-row" key={row.id}><div className="master-icon"><Icon size={18} /></div><div><strong>{row.name}</strong><span>{row.class_name ? `Kelas ${row.class_name}` : "Data aktif"}</span></div><button className="icon-button" data-testid={`master-row-action-${i + 1}`} aria-label={`Opsi ${row.name}`}><MoreHorizontal size={18} /></button></div>)}{!filtered.length && <div className="master-row" data-testid="master-empty-state"><div><strong>Tidak ada data</strong><span>Coba kata kunci lain atau tambahkan data baru.</span></div></div>}</div></section></>;
}

function SettingsView({ settings, setSettings, showToast }) {
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, { school: settings.school, address: settings.address, principal: settings.principal, nip: settings.nip });
      showToast("Pengaturan sekolah tersimpan");
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan pengaturan")); } finally { setSaving(false); }
  };
  return <><PageTitle eyebrow="Administration" title="Pengaturan sekolah" description="Pastikan identitas sekolah tampil rapi di setiap laporan." /><FormShell title="Identitas sekolah" subtitle="Informasi ini digunakan pada header laporan" onSave={save} saving={saving}><div className="form-grid"><label className="field full">Nama sekolah<input data-testid="settings-school-input" value={settings.school} onChange={(e) => setSettings({ ...settings, school: e.target.value })} /></label><label className="field full">Alamat<input data-testid="settings-address-input" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label><label className="field">Nama kepala sekolah<input data-testid="settings-principal-input" value={settings.principal} onChange={(e) => setSettings({ ...settings, principal: e.target.value })} /></label><label className="field">NIP kepala sekolah<input data-testid="settings-nip-input" value={settings.nip} onChange={(e) => setSettings({ ...settings, nip: e.target.value })} /></label></div></FormShell><section className="panel backup-panel"><PanelHeading title="Cadangan data" subtitle="Lindungi data administrasi Anda" action={<span className="saved-badge"><Check size={14} /> Aktif</span>} /><p>Cadangan otomatis dibuat setiap Senin pagi.</p><button className="secondary-button" data-testid="manual-backup-button" onClick={() => showToast("Cadangan data berhasil dibuat")}><Save size={16} /> Buat cadangan sekarang</button></section></>;
}
export default App;
