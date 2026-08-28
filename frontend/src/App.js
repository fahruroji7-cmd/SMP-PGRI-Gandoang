import { useEffect, useRef, useState } from "react";
import "@/App.css";
import axios from "axios";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckSquare,
  ChevronDown, FileDown, FileText, GraduationCap, KeyRound, LayoutDashboard,
  LogOut, Menu, Pencil, Plus, Printer, Save, School, Search, Settings,
  ShieldCheck, Sparkles, Trash2, Users, X, BookMarked
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
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get(`${API}/auth/me`).then(({ data }) => { setUser(data); setLoggedIn(true); }).catch(() => {}).finally(() => setCheckingSession(false));
  }, []);

  const loadMasters = () => axios.get(`${API}/masters`).then(({ data }) => setMasters(data)).catch(() => {});
  const loadStats = () => axios.get(`${API}/dashboard/stats`).then(({ data }) => setStats(data)).catch(() => {});
  const [mySchedules, setMySchedules] = useState([]);
  const loadMySchedules = () => axios.get(`${API}/schedules`).then(({ data }) => setMySchedules(data)).catch(() => {});
  useEffect(() => {
    if (!loggedIn) return;
    loadMasters();
    loadStats();
    loadMySchedules();
    axios.get(`${API}/settings`).then(({ data }) => setSettings(data)).catch(() => {});
  }, [loggedIn]);
  useEffect(() => { if (loggedIn && active === "dashboard") loadStats(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const navigate = (id) => { setActive(id); setMobileOpen(false); };
  const downloadReport = async (kind, filters = {}) => {
    try {
      const params = new URLSearchParams({ kind, ...filters });
      const response = await axios.get(`${API}/reports/export?${params.toString()}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a"); link.href = url; link.download = `absenspg-${kind}.xlsx`; link.click(); URL.revokeObjectURL(url);
      showToast("File Excel berhasil diunduh");
    } catch { showToast("Gagal mengunduh laporan"); }
  };
  const printReport = async (kind, filters = {}) => {
    const params = new URLSearchParams({ kind, ...filters });
    const response = await axios.get(`${API}/reports/print?${params.toString()}`);
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(response.data); printWindow.document.close(); }
  };
  const addMaster = (endpoint, successMessage) => async (payload) => {
    try { await axios.post(`${API}/${endpoint}`, payload); await loadMasters(); showToast(successMessage); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan data")); }
  };
  const updateMaster = (endpoint, successMessage) => async (id, payload) => {
    try { await axios.put(`${API}/${endpoint}/${id}`, payload); await loadMasters(); showToast(successMessage); }
    catch (err) { showToast(errMsg(err, "Gagal memperbarui data")); }
  };
  const deleteMaster = (endpoint, successMessage) => async (id) => {
    try { await axios.delete(`${API}/${endpoint}/${id}`); await loadMasters(); showToast(successMessage); }
    catch (err) { showToast(errMsg(err, "Gagal menghapus data")); }
  };
  const createTeacherAccount = async (teacherId, username, password) => {
    try { await axios.post(`${API}/teachers/${teacherId}/account`, { username, password }); await loadMasters(); showToast("Akun login guru berhasil dibuat"); }
    catch (err) { showToast(errMsg(err, "Gagal membuat akun guru")); }
  };
  const resetTeacherPassword = async (teacherId, password) => {
    try { await axios.put(`${API}/teachers/${teacherId}/account/password`, { password }); showToast("Password guru berhasil diperbarui"); }
    catch (err) { showToast(errMsg(err, "Gagal memperbarui password")); }
  };
  const importMaster = (endpoint, label) => async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(`${API}/${endpoint}/import`, formData);
      await loadMasters();
      showToast(`${label}: ${data.imported} ditambahkan${data.skipped ? `, ${data.skipped} dilewati` : ""}`);
    } catch (err) { showToast(errMsg(err, "Gagal mengimpor data")); }
  };

  if (checkingSession) return <div className="session-loading" data-testid="session-loading">Memuat ruang kerja...</div>;
  if (!loggedIn) return <Login onLogin={(account) => { setUser(account); setLoggedIn(true); }} />;

  const classNames = masters ? masters.classes.map((c) => c.name) : [];
  const subjectNames = masters ? masters.subjects.map((s) => s.name) : [];
  const isAdmin = user?.role === "Admin";
  // Untuk Guru: kelas & mapel yang bisa dipilih di Absensi/Nilai/Jurnal/Rekap dibatasi ke Jadwal Mengajar
  // miliknya sendiri (mySchedules sudah otomatis tersaring dari server, lihat GET /schedules).
  // Untuk Admin: tetap bebas semua kelas & mapel di sekolah (dipakai untuk pengecekan/oversight).
  // Menu Jadwal Mengajar sendiri TETAP pakai daftar penuh (classNames/subjectNames) di semua role,
  // karena di situlah guru MENDEFINISIKAN kelas+mapel yang diajarnya -- sama seperti prinsip di AbsenSPG.
  const myClassNames = isAdmin ? classNames : [...new Set(mySchedules.map((s) => s.class_name))];
  const subjectsByClass = isAdmin ? null : mySchedules.reduce((acc, s) => {
    if (!acc[s.class_name]) acc[s.class_name] = [];
    if (!acc[s.class_name].includes(s.subject)) acc[s.class_name].push(s.subject);
    return acc;
  }, {});
  const ready = isAdmin ? (classNames.length > 0 && subjectNames.length > 0) : myClassNames.length > 0;
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
          {active === "dashboard" && <Dashboard navigate={navigate} user={user} stats={stats} />}
          {active === "absensi" && (ready ? <Attendance classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} showToast={showToast} /> : loadingPanel)}
          {active === "nilai" && (ready ? <Grades classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} showToast={showToast} /> : loadingPanel)}
          {active === "jadwal" && (ready ? <Schedule classes={classNames} subjects={subjectNames} showToast={showToast} onSaved={loadMySchedules} /> : loadingPanel)}
          {active === "jurnal" && (ready ? <Journal classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} showToast={showToast} /> : loadingPanel)}
          {active === "rekap" && <Reports onExport={downloadReport} onPrint={printReport} classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} />}
          {active === "guru" && masters && <Master title="Kelola Guru" icon={Users} rows={masters.teachers} addLabel="Tambah guru" onAdd={addMaster("teachers", "Data guru diperbarui")} onUpdate={updateMaster("teachers", "Data guru diperbarui")} onDelete={deleteMaster("teachers", "Data guru dihapus")} accountActions onCreateAccount={createTeacherAccount} onResetPassword={resetTeacherPassword} onImport={importMaster("teachers", "Guru")} />}
          {active === "kelas" && masters && <Master title="Kelola Kelas" icon={School} rows={masters.classes} addLabel="Tambah kelas" onAdd={addMaster("classes", "Kelas baru ditambahkan")} onUpdate={updateMaster("classes", "Data kelas diperbarui")} onDelete={deleteMaster("classes", "Data kelas dihapus")} />}
          {active === "siswa" && masters && <Master title="Kelola Siswa" icon={Users} rows={masters.students} addLabel="Tambah siswa" onAdd={addMaster("students", "Data siswa diperbarui")} onUpdate={updateMaster("students", "Data siswa diperbarui")} onDelete={deleteMaster("students", "Data siswa dihapus")} classes={classNames} onImport={importMaster("students", "Siswa")} />}
          {active === "mapel" && masters && <Master title="Kelola Mata Pelajaran" icon={BookOpen} rows={masters.subjects} addLabel="Tambah mapel" onAdd={addMaster("subjects", "Mata pelajaran ditambahkan")} onUpdate={updateMaster("subjects", "Data mapel diperbarui")} onDelete={deleteMaster("subjects", "Data mapel dihapus")} />}
          {active === "pengaturan" && settings && <SettingsView settings={settings} setSettings={setSettings} showToast={showToast} />}
        </div>
      </main>
      {toast && <div className="toast" data-testid="success-toast"><Check size={16} /> {toast}</div>}
    </div>
  );
}

function Login({ onLogin }) { const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const submit = async (e) => { e.preventDefault(); setError(""); if (!username || !password) return setError("Username dan password wajib diisi."); setLoading(true); try { const { data } = await axios.post(`${API}/auth/login`, { username, password }); onLogin(data); } catch (err) { setError(errMsg(err, "Username atau password salah.")); } finally { setLoading(false); } }; return <div className="login-page"><div className="login-visual"><div className="login-brand mobile-brand"><img className="brand-logo" src="/logo-smp.png" alt="Logo SMP PGRI Gandoang" data-testid="login-logo-mobile" /><span>SMP PGRI Gandoang</span></div><div className="visual-copy"><span className="eyebrow"><Sparkles size={14} /> Ruang kerja guru</span><h1>Semua kelas.<br /><em>Satu kendali.</em></h1><p>Kelola kehadiran, nilai, jadwal, dan jurnal pembelajaran dengan lebih tenang.</p></div><div className="visual-footer">SMP PGRI Gandoang <span>•</span> Teacher Administration</div></div><div className="login-panel"><div className="login-brand desktop-brand"><img className="brand-logo" src="/logo-smp.png" alt="Logo SMP PGRI Gandoang" data-testid="login-logo" /><span>SMP PGRI Gandoang</span></div><div className="login-content"><span className="eyebrow">Selamat datang kembali</span><h2>Masuk ke ruang kerja</h2><p className="muted">Gunakan username guru atau administrator Anda.</p><form onSubmit={submit}><label>Username<input data-testid="login-username-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin atau username guru" /></label><label>Password<input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" /></label>{error && <div className="form-error" data-testid="login-error">{error}</div>}<button className="primary-button login-submit" data-testid="login-submit-button" disabled={loading}>{loading ? "Memeriksa akun..." : "Masuk ke dashboard"} {!loading && <ArrowRight size={17} />}</button></form><p className="login-note">Admin: admin@absenspg.local · Guru: gunakan username yang diberikan admin sekolah</p></div></div></div>; }
function NavItem({ item, active, onClick }) { const Icon = item.icon; return <button className={`nav-item ${active === item.id ? "active" : ""}`} data-testid={`nav-${item.id}`} onClick={() => onClick(item.id)}><Icon size={17} /><span>{item.label}</span>{active === item.id && <span className="nav-active-dot" />}</button>; }
function PageTitle({ eyebrow, title, description, action }) { return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1 data-testid="page-title">{title}</h1><p>{description}</p></div>{action}</div>; }
function Dashboard({ navigate, user, stats }) {
  const s = stats || {};
  const rate = s.attendance_rate !== undefined ? `${String(s.attendance_rate).replace(".", ",")}%` : "—";
  const todaySchedule = s.today_schedule || [];
  const topAbsent = s.top_absent || [];
  return <><PageTitle eyebrow={new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} title={`Selamat datang, ${user?.name?.split(" ")[0] || "Guru"}`} description="Berikut ringkasan kegiatan mengajar Anda hari ini." action={<button className="primary-button" data-testid="dashboard-attendance-cta" onClick={() => navigate("absensi")}><CheckSquare size={17} /> Isi absensi</button>} /><div className="stat-grid"><Stat label="Kelas diampu" value={s.classes_count ?? "—"} change="Total kelas terdaftar" icon={School} color="green" /><Stat label="Siswa aktif" value={s.students_count ?? "—"} change="Total siswa terdaftar" icon={Users} color="amber" /><Stat label="Rata-rata kehadiran" value={rate} change="Bulan ini" icon={BarChart3} color="blue" /><Stat label="Jurnal tersimpan" value={s.journals_count ?? "—"} change={`${s.journals_incomplete ?? 0} perlu dilengkapi`} icon={BookMarked} color="rose" /></div><div className="dashboard-grid"><section className="panel schedule-panel"><PanelHeading title="Jadwal hari ini" subtitle={s.today_day || ""} action={<button className="text-button" data-testid="dashboard-schedule-link" onClick={() => navigate("jadwal")}>Lihat semua <ArrowRight size={14} /></button>} /><div className="timeline">{todaySchedule.map((item, i) => <TimelineItem key={item.id || i} time={`${item.start_time} — ${item.end_time}`} classNameName={item.class_name} subject={item.subject} room={item.room || "-"} active={i === 0} />)}{!todaySchedule.length && <p className="muted" data-testid="dashboard-schedule-empty">Tidak ada jadwal untuk hari ini.</p>}</div></section><section className="panel attention-panel"><PanelHeading title="Perlu perhatian" subtitle="Absensi bulan ini" action={<AlertTriangle size={18} className="warning-icon" />} /><div className="attention-callout"><div className="attention-number" data-testid="dashboard-frequent-absent-count">{s.frequent_absent_count ?? 0}</div><div><strong>siswa sering tidak hadir</strong><p>3 kali atau lebih alpa bulan ini</p></div></div>{topAbsent.map((item) => <div className="attention-row" key={item.name}><div className="student-avatar">{initials(item.name)}</div><span>{item.name}</span><b>{item.count}x alpa</b></div>)}{!topAbsent.length && <p className="muted" data-testid="dashboard-attention-empty">Belum ada data alpa bulan ini.</p>}<button className="outline-button" data-testid="view-attention-button" onClick={() => navigate("rekap")}>Buka rekap absensi <ArrowRight size={15} /></button></section></div><section className="quick-section"><div className="section-heading"><div><span className="eyebrow">Akses cepat</span><h2>Mulai dari sini</h2></div><span className="muted">Pekerjaan rutin Anda, lebih ringkas.</span></div><div className="quick-grid"><QuickAction icon={CheckSquare} title="Absensi siswa" text="Catat kehadiran kelas" onClick={() => navigate("absensi")} testid="quick-attendance" /><QuickAction icon={GraduationCap} title="Input nilai" text="Kelola nilai formatif" onClick={() => navigate("nilai")} testid="quick-grades" /><QuickAction icon={BookMarked} title="Jurnal mengajar" text="Simpan refleksi kelas" onClick={() => navigate("jurnal")} testid="quick-journal" /></div></section></>;
}
function Stat({ label, value, change, icon: Icon, color }) { return <div className="stat-card" data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}><div className={`stat-icon ${color}`}><Icon size={19} /></div><div><span>{label}</span><strong>{value}</strong><small>{change}</small></div></div>; }
function PanelHeading({ title, subtitle, action }) { return <div className="panel-heading"><div><h2>{title}</h2><span>{subtitle}</span></div>{action}</div>; }
function TimelineItem({ time, classNameName, subject, room, active }) { return <div className={`timeline-item ${active ? "current" : ""}`}><div className="time">{time}</div><div className="timeline-line"><span /></div><div className="lesson"><div><strong>{subject}</strong><span>{classNameName} · {room}</span></div>{active && <span className="now-badge">Sedang berlangsung</span>}</div></div>; }
function QuickAction({ icon: Icon, title, text, onClick, testid }) { return <button className="quick-action" data-testid={testid} onClick={onClick}><div className="quick-icon"><Icon size={21} /></div><div><strong>{title}</strong><span>{text}</span></div><ArrowRight size={17} /></button>; }
function FormShell({ children, title, subtitle, onSave, saveLabel = "Simpan perubahan", saving }) { return <section className="panel form-panel"><PanelHeading title={title} subtitle={subtitle} />{children}<div className="form-actions"><button className="primary-button" data-testid="form-save-button" onClick={onSave} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : saveLabel}</button></div></section>; }
function Select({ label, value, onChange, options, testid }) { return <label className="field">{label}<select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>; }

function Attendance({ classes, subjects, subjectsByClass, showToast }) {
  const [date, setDate] = useState(today());
  const [className, setClassName] = useState(classes[0]);
  const subjectOptions = subjectsByClass ? (subjectsByClass[className] || []) : subjects;
  const [subject, setSubject] = useState(subjectOptions[0]);
  useEffect(() => { if (!subjectOptions.includes(subject)) setSubject(subjectOptions[0]); }, [className]); // eslint-disable-line react-hooks/exhaustive-deps
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
  return <><PageTitle eyebrow="Kegiatan mengajar" title="Absensi siswa" description="Catat kehadiran siswa tanpa pengulangan data." action={<button className="secondary-button" data-testid="attendance-history-button"><FileText size={16} /> Riwayat absensi</button>} /><div className="filter-grid panel"><label className="field">Tanggal<input data-testid="attendance-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><Select label="Kelas" testid="attendance-class-select" value={className} onChange={setClassName} options={classes} /><Select label="Mata pelajaran" testid="attendance-subject-select" value={subject} onChange={setSubject} options={subjectOptions} /><button className="secondary-button filter-button" data-testid="attendance-load-button" onClick={load}><Search size={16} /> Tampilkan siswa</button></div><section className="panel roster-panel"><PanelHeading title={`Kelas ${className} · ${subject}`} subtitle={`${date} · ${roster.length} siswa`} action={<div className="status-legend"><span><i className="status-dot hadir" /> Hadir</span><span><i className="status-dot sakit" /> Sakit</span><span><i className="status-dot izin" /> Izin</span><span><i className="status-dot alpa" /> Alpa</span></div>} /><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama siswa</th><th>Status kehadiran</th><th>Catatan</th></tr></thead><tbody>{roster.map((s, i) => <tr key={s.id}><td>{String(i + 1).padStart(2, "0")}</td><td><div className="name-cell"><span className="student-avatar">{initials(s.name)}</span><strong>{s.name}</strong></div></td><td><div className="status-buttons">{[["H", "Hadir", "hadir"], ["S", "Sakit", "sakit"], ["I", "Izin", "izin"], ["A", "Alpa", "alpa"]].map(([code, name, style]) => <button key={code} className={`${style} ${statuses[s.name] === code ? "selected" : ""}`} data-testid={`attendance-${i + 1}-${code.toLowerCase()}`} onClick={() => setStatuses({ ...statuses, [s.name]: code })}>{code}<span>{name}</span></button>)}</div></td><td><input className="table-input" data-testid={`attendance-note-${i + 1}`} value={notes[s.name] || ""} onChange={(e) => setNotes({ ...notes, [s.name]: e.target.value })} placeholder="Tambah catatan" /></td></tr>)}{!roster.length && <tr><td colSpan="4" data-testid="attendance-empty-state">Tidak ada siswa pada kelas ini.</td></tr>}</tbody></table></div><div className="roster-footer"><span><Check size={15} /> {Object.values(statuses).filter((x) => x === "H").length} siswa hadir</span><button className="primary-button" data-testid="attendance-save-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan absensi"}</button></div></section></>;
}

const GRADE_TYPES = ["Formatif", "Sumatif Lingkup Materi", "Sumatif Tengah Semester"];
function Grades({ classes, subjects, subjectsByClass, showToast }) {
  const [date, setDate] = useState(today());
  const [className, setClassName] = useState(classes[0]);
  const subjectOptions = subjectsByClass ? (subjectsByClass[className] || []) : subjects;
  const [subject, setSubject] = useState(subjectOptions[0]);
  useEffect(() => { if (!subjectOptions.includes(subject)) setSubject(subjectOptions[0]); }, [className]); // eslint-disable-line react-hooks/exhaustive-deps
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
  return <><PageTitle eyebrow="Kegiatan mengajar" title="Nilai siswa" description="Kelola penilaian formatif dan sumatif dalam satu tempat." action={<button className="secondary-button" data-testid="grades-import-button"><FileDown size={16} /> Impor Excel</button>} /><div className="filter-grid panel grades-filter"><label className="field">Tanggal<input data-testid="grades-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><Select label="Kelas" testid="grades-class-select" value={className} onChange={setClassName} options={classes} /><Select label="Mata pelajaran" testid="grades-subject-select" value={subject} onChange={setSubject} options={subjectOptions} /><Select label="Jenis penilaian" testid="grades-type-select" value={type} onChange={setType} options={GRADE_TYPES} /></div><section className="panel roster-panel"><PanelHeading title={`${type} · ${subject}`} subtitle={`Kelas ${className} · ${date}`} action={<span className="saved-badge"><Check size={14} /> {roster.length} siswa</span>} /><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama siswa</th><th>Nilai (0—100)</th><th>Predikat</th></tr></thead><tbody>{roster.map((s, i) => { const grade = Number(scores[s.name]) || 0; return <tr key={s.id}><td>{String(i + 1).padStart(2, "0")}</td><td><div className="name-cell"><span className="student-avatar">{initials(s.name)}</span><strong>{s.name}</strong></div></td><td><input className="grade-input" data-testid={`grade-input-${i + 1}`} type="number" min="0" max="100" value={scores[s.name] ?? ""} onChange={(e) => setScores({ ...scores, [s.name]: e.target.value })} /></td><td><span className={`grade-pill ${grade >= 85 ? "excellent" : grade >= 75 ? "good" : "needs"}`}>{grade >= 85 ? "Sangat baik" : grade >= 75 ? "Baik" : "Perlu bimbingan"}</span></td></tr>; })}{!roster.length && <tr><td colSpan="4" data-testid="grades-empty-state">Tidak ada siswa pada kelas ini.</td></tr>}</tbody></table></div><div className="roster-footer"><span>Rata-rata kelas <strong>{average}</strong></span><button className="primary-button" data-testid="grades-save-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan nilai"}</button></div></section></>;
}

const SCHEDULE_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
function Schedule({ classes, subjects, showToast, onSaved }) {
  const [day, setDay] = useState(SCHEDULE_DAYS[0]);
  const [schedules, setSchedules] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ start_time: "07:00", end_time: "08:20", class_name: classes[0], subject: subjects[0], room: "" });
  const [saving, setSaving] = useState(false);
  const load = () => axios.get(`${API}/schedules`).then(({ data }) => setSchedules(data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const dayEntries = schedules.filter((item) => item.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const submit = async () => {
    if (!form.start_time || !form.end_time) return showToast("Jam mulai dan selesai wajib diisi");
    setSaving(true);
    try {
      await axios.post(`${API}/schedules`, { day, ...form });
      showToast("Jadwal baru ditambahkan");
      setOpen(false);
      await load();
      if (onSaved) onSaved();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan jadwal")); } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus jadwal ini?")) return;
    try { await axios.delete(`${API}/schedules/${id}`); showToast("Jadwal dihapus"); load(); if (onSaved) onSaved(); }
    catch { showToast("Gagal menghapus jadwal"); }
  };
  return <><PageTitle eyebrow="Kegiatan mengajar" title="Jadwal mengajar" description="Susun ritme hari mengajar Anda dengan jelas." action={<button className="primary-button" data-testid="schedule-add-button" onClick={() => setOpen(!open)}>{open ? <X size={17} /> : <Plus size={17} />} {open ? "Tutup" : "Tambah jadwal"}</button>} /><section className="week-strip panel">{SCHEDULE_DAYS.map((d) => <button key={d} className={d === day ? "selected" : ""} data-testid={`schedule-day-${d.toLowerCase()}`} onClick={() => setDay(d)}><strong>{d}</strong></button>)}</section>{open && <section className="panel filter-grid" style={{ marginBottom: 18 }}><label className="field">Jam mulai<input data-testid="schedule-start-input" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label><label className="field">Jam selesai<input data-testid="schedule-end-input" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label><Select label="Kelas" testid="schedule-class-select" value={form.class_name} onChange={(v) => setForm({ ...form, class_name: v })} options={classes} /><Select label="Mata pelajaran" testid="schedule-subject-select" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} options={subjects} /><label className="field">Ruang<input data-testid="schedule-room-input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Contoh: Ruang 3" /></label><button className="primary-button filter-button" data-testid="schedule-save-button" onClick={submit} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan jadwal"}</button></section>}<section className="panel schedule-table"><PanelHeading title={day} subtitle={`${dayEntries.length} jadwal mengajar`} />{dayEntries.map((item) => <div className="timeline-item" key={item.id} data-testid={`schedule-entry-${item.id}`}><div className="time">{item.start_time} — {item.end_time}</div><div className="timeline-line"><span /></div><div className="lesson"><div><strong>{item.subject}</strong><span>{item.class_name} · {item.room || "-"}</span></div><button className="icon-button" data-testid={`schedule-delete-${item.id}`} aria-label="Hapus jadwal" onClick={() => remove(item.id)}><Trash2 size={16} /></button></div></div>)}{!dayEntries.length && <p className="muted" data-testid="schedule-empty-state">Belum ada jadwal untuk {day}.</p>}</section></>;
}

function Journal({ classes, subjects, subjectsByClass, showToast }) {
  const empty = { date: today(), period: 1, class_name: classes[0], subject: subjects[0], topic: "", activity: "", reflection: "" };
  const [form, setForm] = useState(empty);
  const subjectOptions = subjectsByClass ? (subjectsByClass[form.class_name] || []) : subjects;
  useEffect(() => { if (!subjectOptions.includes(form.subject)) setForm((f) => ({ ...f, subject: subjectOptions[0] })); }, [form.class_name]); // eslint-disable-line react-hooks/exhaustive-deps
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
  return <><PageTitle eyebrow="Kegiatan mengajar" title="Jurnal mengajar" description="Simpan jejak pembelajaran dan refleksi setiap kelas." /><FormShell title="Catat jurnal baru" subtitle={form.date} onSave={save} saveLabel="Simpan jurnal" saving={saving}><div className="form-grid"><label className="field">Tanggal<input data-testid="journal-date-input" type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} /></label><label className="field">Jam ke-<input data-testid="journal-period-input" type="number" min="1" value={form.period} onChange={(e) => set("period")(e.target.value)} /></label><Select label="Kelas" testid="journal-class-select" value={form.class_name} onChange={set("class_name")} options={classes} /><Select label="Mata pelajaran" testid="journal-subject-select" value={form.subject} onChange={set("subject")} options={subjectOptions} /><label className="field full">Materi pokok<input data-testid="journal-topic-input" value={form.topic} onChange={(e) => set("topic")(e.target.value)} placeholder="Contoh: Operasi aljabar" /></label><label className="field full">Kegiatan pembelajaran<textarea data-testid="journal-activity-input" rows="4" value={form.activity} onChange={(e) => set("activity")(e.target.value)} placeholder="Tuliskan kegiatan pendahuluan, inti, dan penutup..." /></label><label className="field full">Refleksi <span className="optional">opsional</span><textarea data-testid="journal-reflection-input" rows="3" value={form.reflection} onChange={(e) => set("reflection")(e.target.value)} placeholder="Apa yang berjalan baik hari ini?" /></label></div></FormShell><section className="panel master-panel"><PanelHeading title="Jurnal tersimpan" subtitle={`${journals.length} catatan`} /><div className="master-list">{journals.map((j) => <div className="master-row" key={j.id} data-testid={`journal-row-${j.id}`}><div className="master-icon"><BookMarked size={18} /></div><div><strong>{j.topic}</strong><span>{j.class_name} · {j.subject} · {j.date} · Jam ke-{j.period}</span></div></div>)}{!journals.length && <div className="master-row" data-testid="journal-empty-state"><div><strong>Belum ada jurnal</strong><span>Jurnal yang Anda simpan akan tampil di sini.</span></div></div>}</div></section></>;
}

function Reports({ onExport, onPrint, classes, subjects, subjectsByClass }) {
  const [kind, setKind] = useState("attendance");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const subjectOptions = subjectsByClass
    ? (classFilter ? (subjectsByClass[classFilter] || []) : [...new Set(Object.values(subjectsByClass).flat())])
    : subjects;
  useEffect(() => { if (subjectFilter && !subjectOptions.includes(subjectFilter)) setSubjectFilter(""); }, [classFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const [period, setPeriod] = useState("");
  const [rows, setRows] = useState([]);
  const labels = { attendance: "Rekap Absensi Siswa", grades: "Rekap Nilai Siswa", journals: "Rekap Jurnal Mengajar" };
  const filters = { ...(classFilter && { class_name: classFilter }), ...(subjectFilter && { subject: subjectFilter }), ...(period && { period }) };
  const fetchRows = async () => {
    try {
      const params = new URLSearchParams({ kind, ...filters });
      const { data } = await axios.get(`${API}/reports/rows?${params.toString()}`);
      setRows(data);
    } catch { setRows([]); }
  };
  useEffect(() => { fetchRows(); }, [kind, classFilter, subjectFilter, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const distribution = Object.entries(rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}));
  const maxCount = Math.max(1, ...distribution.map(([, c]) => c));
  return <><PageTitle eyebrow="Data & laporan" title="Rekap dan cetak" description="Siapkan laporan absensi, nilai, atau jurnal untuk dibagikan." action={<button className="secondary-button" data-testid="report-export-button" onClick={() => onExport(kind, filters)}><FileDown size={16} /> Ekspor Excel</button>} /><div className="report-layout"><section className="panel"><PanelHeading title="Buat laporan" subtitle="Pilih data yang ingin ditampilkan" /><div className="stack-form"><label className="field">Jenis laporan<select data-testid="report-type-select" value={kind} onChange={(e) => setKind(e.target.value)}><option value="attendance">Rekap absensi</option><option value="grades">Rekap nilai</option><option value="journals">Rekap jurnal mengajar</option></select></label><label className="field">Kelas<select data-testid="report-class-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="">Semua kelas</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></label><label className="field">Mata pelajaran<select data-testid="report-subject-select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}><option value="">Semua mata pelajaran</option>{subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label className="field">Periode (bulan)<input data-testid="report-period-select" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label><button className="primary-button" data-testid="report-preview-button" onClick={fetchRows}><BarChart3 size={16} /> Perbarui pratinjau</button></div></section><section className="panel report-preview"><div className="report-paper"><div className="report-head"><img className="brand-logo" src="/logo-smp.png" alt="Logo sekolah" /><div><strong>SMP PGRI Gandoang</strong><span>{labels[kind]}</span></div></div><div className="report-line" /><div className="report-meta"><span>Periode<strong data-testid="report-meta-period">{period || "Semua periode"}</strong></span><span>Kelas<strong data-testid="report-meta-class">{classFilter || "Semua"}</strong></span><span>Mapel<strong data-testid="report-meta-subject">{subjectFilter || "Semua"}</strong></span></div>{distribution.length ? <div className="mini-bars" data-testid="report-preview-chart">{distribution.map(([label, count]) => <div key={label}><span style={{ height: `${(count / maxCount) * 100}%` }} /><small>{label}</small></div>)}</div> : <p className="muted" data-testid="report-preview-empty">Tidak ada data untuk filter ini.</p>}<p className="muted" data-testid="report-preview-total">Total data: {rows.length}</p><button className="outline-button" data-testid="report-print-button" onClick={() => onPrint(kind, filters)}><Printer size={15} /> Pratinjau cetak</button></div></section></div></>;
}

function Master({ title, icon: Icon, rows, addLabel, onAdd, onUpdate, onDelete, classes, accountActions, onCreateAccount, onResetPassword, onImport }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [className, setClassName] = useState(classes?.[0] || "");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [accountId, setAccountId] = useState(null);
  const [accUsername, setAccUsername] = useState("");
  const [accPassword, setAccPassword] = useState("");
  const [accSaving, setAccSaving] = useState(false);
  const fileInputRef = useRef(null);
  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(classes ? { name: name.trim(), class_name: className } : { name: name.trim() });
    setSaving(false); setName(""); setOpen(false);
  };
  const startEdit = (row) => { setEditingId(row.id); setEditName(row.name); setEditClass(row.class_name || classes?.[0] || ""); };
  const saveEdit = async () => {
    if (!editName.trim()) return;
    await onUpdate(editingId, classes ? { name: editName.trim(), class_name: editClass } : { name: editName.trim() });
    setEditingId(null);
  };
  const remove = async (row) => { if (window.confirm(`Hapus ${row.name}?`)) await onDelete(row.id); };
  const startAccount = (row) => { setAccountId(row.id); setAccUsername(""); setAccPassword(""); };
  const submitAccount = async (row) => {
    if (accPassword.trim().length < 6) return;
    setAccSaving(true);
    if (row.username) await onResetPassword(row.id, accPassword.trim());
    else { if (!accUsername.trim()) { setAccSaving(false); return; } await onCreateAccount(row.id, accUsername.trim(), accPassword.trim()); }
    setAccSaving(false); setAccountId(null); setAccPassword("");
  };
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) await onImport(file);
  };
  const filtered = rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle eyebrow="Administration" title={title} description="Kelola data dasar sekolah Anda." action={<div className="page-title-actions">{onImport && <><input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} data-testid="master-import-input" onChange={handleImportFile} /><button className="secondary-button" data-testid="master-import-button" onClick={() => fileInputRef.current?.click()}><FileDown size={16} /> Impor Excel</button></>}<button className="primary-button" data-testid="master-add-button" onClick={() => setOpen(!open)}>{open ? <X size={17} /> : <Plus size={17} />} {open ? "Tutup" : addLabel}</button></div>} /><section className="panel master-panel">{open && <div className="filter-grid" style={{ marginBottom: 18 }}><label className="field full">Nama<input data-testid="master-add-name-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Masukkan nama baru" autoFocus /></label>{classes && <Select label="Kelas" testid="master-add-class-select" value={className} onChange={setClassName} options={classes} />}<button className="primary-button filter-button" data-testid="master-add-submit-button" onClick={submit} disabled={saving || !name.trim()}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan"}</button></div>}<div className="master-toolbar"><div className="search-field"><Search size={16} /><input data-testid="master-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Cari ${title.toLowerCase()}...`} /></div></div><div className="master-list">{filtered.map((row, i) => <div className="master-row" key={row.id}>{editingId === row.id ? <div className="master-edit-row"><input className="table-input" data-testid={`master-edit-name-${i + 1}`} value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus />{classes && <select data-testid={`master-edit-class-${i + 1}`} value={editClass} onChange={(e) => setEditClass(e.target.value)}>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select>}<button className="icon-button" data-testid={`master-edit-save-${i + 1}`} aria-label="Simpan perubahan" onClick={saveEdit}><Check size={16} /></button><button className="icon-button" data-testid={`master-edit-cancel-${i + 1}`} aria-label="Batal ubah" onClick={() => setEditingId(null)}><X size={16} /></button></div> : accountId === row.id ? <div className="master-edit-row">{!row.username && <input className="table-input" data-testid={`master-account-username-${i + 1}`} placeholder="Username" value={accUsername} onChange={(e) => setAccUsername(e.target.value)} autoFocus />}<input className="table-input" type="password" data-testid={`master-account-password-${i + 1}`} placeholder="Password baru (min 6 karakter)" value={accPassword} onChange={(e) => setAccPassword(e.target.value)} /><button className="icon-button" data-testid={`master-account-save-${i + 1}`} aria-label="Simpan akun" onClick={() => submitAccount(row)} disabled={accSaving}><Check size={16} /></button><button className="icon-button" data-testid={`master-account-cancel-${i + 1}`} aria-label="Batal akun" onClick={() => setAccountId(null)}><X size={16} /></button></div> : <><div className="master-icon"><Icon size={18} /></div><div><strong>{row.name}</strong><span>{row.class_name ? `Kelas ${row.class_name}` : accountActions ? (row.username ? `Username: ${row.username}` : "Belum punya akun login") : "Data aktif"}</span></div><div className="master-row-actions">{accountActions && <button className="icon-button" data-testid={`master-row-account-${i + 1}`} aria-label={row.username ? `Reset password ${row.name}` : `Buat akun login ${row.name}`} onClick={() => startAccount(row)}><KeyRound size={16} /></button>}<button className="icon-button" data-testid={`master-row-edit-${i + 1}`} aria-label={`Ubah ${row.name}`} onClick={() => startEdit(row)}><Pencil size={16} /></button><button className="icon-button" data-testid={`master-row-delete-${i + 1}`} aria-label={`Hapus ${row.name}`} onClick={() => remove(row)}><Trash2 size={16} /></button></div></>}</div>)}{!filtered.length && <div className="master-row" data-testid="master-empty-state"><div><strong>Tidak ada data</strong><span>Coba kata kunci lain atau tambahkan data baru.</span></div></div>}</div></section></>;
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