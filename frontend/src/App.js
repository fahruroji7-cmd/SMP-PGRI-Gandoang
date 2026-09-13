import { Fragment, useEffect, useRef, useState } from "react";
import "@/App.css";
import axios from "axios";
import html2canvas from "html2canvas";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckSquare,
  ChevronDown, FileDown, FileText, GraduationCap, KeyRound, LayoutDashboard,
  LogOut, Menu, Pencil, Plus, Printer, Save, School, Search, Settings,
  ShieldCheck, Sparkles, Trash2, Users, X, BookMarked, Trophy, Camera, Award, Star, UserCog,
  ClipboardCheck, DoorOpen, AlertOctagon, UserCheck, ListChecks, IdCard, ImagePlus, Sun, Moon,
  UserRound, ClipboardList, Thermometer, Mail, Send, RefreshCw, Upload, Wand2, Contact
} from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "jadwal", label: "Jadwal Mengajar", icon: CalendarDays },
  { id: "absensi", label: "Absensi Siswa", icon: CheckSquare },
  { id: "nilai", label: "Nilai Siswa", icon: GraduationCap },
  { id: "jurnal", label: "Jurnal Mengajar", icon: BookMarked },
  { id: "rekap", label: "Rekap & Cetak", icon: Printer },
];
const ADMIN_NAV_GROUPS = [
  { label: "Data Master", items: [
    { id: "guru", label: "Kelola Guru", icon: Users },
    { id: "kelas", label: "Kelola Kelas", icon: School },
    { id: "siswa", label: "Kelola Siswa", icon: Users },
    { id: "mapel", label: "Kelola Mapel", icon: BookOpen },
    { id: "rekap", label: "Rekap & Cetak", icon: Printer },
  ] },
  { label: "Ekstrakurikuler", items: [
    { id: "ekskul", label: "Kelola Ekskul", icon: Trophy },
    { id: "ekskul-rekap", label: "Rekap Ekskul", icon: BarChart3 },
  ] },
  { label: "Piket", items: [
    { id: "guru-piket", label: "Guru Piket", icon: UserCheck },
    { id: "beban-mengajar", label: "Beban Mengajar", icon: ListChecks },
    { id: "akun-piket", label: "Akun Piket", icon: IdCard },
    { id: "rekap-piket", label: "Rekap Piket", icon: BarChart3 },
  ] },
  { label: "Wali Kelas", items: [
    { id: "wali-kelas-admin", label: "Wali Kelas", icon: UserRound },
    { id: "akun-sekretaris", label: "Akun Sekretaris Kelas", icon: ClipboardList },
    { id: "rekap-absen-harian", label: "Rekap Absen Kelas", icon: BarChart3 },
  ] },
  { label: "Tata Usaha", items: [
    { id: "akun-tu", label: "Akun Tata Usaha", icon: Contact },
  ] },
  { label: "Sistem", items: [
    { id: "pengaturan", label: "Pengaturan", icon: Settings },
  ] },
];
const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
axios.defaults.withCredentials = true;
const today = () => new Date().toISOString().slice(0, 10);
const initials = (name) => name.split(" ").map((x) => x[0]).join("").slice(0, 2);
const errMsg = (err, fallback) => err?.response?.data?.detail || fallback;
async function downloadElementAsPng(elementId, filename) {
  const node = document.getElementById(elementId);
  if (!node) return;
  const canvas = await html2canvas(node, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Gagal membaca gambar"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("dashboard");
  const [openAdminGroups, setOpenAdminGroups] = useState(() => new Set(ADMIN_NAV_GROUPS.filter((g) => g.items.some((i) => i.id === "dashboard")).map((g) => g.label)));
  const toggleAdminGroup = (label) => setOpenAdminGroups((prev) => { const next = new Set(prev); if (next.has(label)) next.delete(label); else next.add(label); return next; });
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
  const navigate = (id) => { setActive(id); setMobileOpen(false); const grp = ADMIN_NAV_GROUPS.find((g) => g.items.some((i) => i.id === id)); if (grp) setOpenAdminGroups((prev) => new Set(prev).add(grp.label)); };
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
  if (user?.role === "Pembina") return <PembinaApp user={user} showToast={showToast} toast={toast} onLogout={async () => { await axios.post(`${API}/auth/logout`, {}); setUser(null); setLoggedIn(false); }} />;
  if (user?.role?.startsWith("Piket ")) return <PiketApp user={user} showToast={showToast} toast={toast} onLogout={async () => { await axios.post(`${API}/auth/logout`, {}); setUser(null); setLoggedIn(false); }} />;
  if (user?.role === "Sekretaris") return <SekretarisApp user={user} showToast={showToast} toast={toast} onLogout={async () => { await axios.post(`${API}/auth/logout`, {}); setUser(null); setLoggedIn(false); }} />;
  if (user?.role === "TU") return <TuApp user={user} showToast={showToast} toast={toast} masters={masters} addMaster={addMaster} updateMaster={updateMaster} deleteMaster={deleteMaster} importMaster={importMaster} onReloadMasters={loadMasters} onLogout={async () => { await axios.post(`${API}/auth/logout`, {}); setUser(null); setLoggedIn(false); }} />;
  if (user?.role === "Siswa") return <SiswaApp user={user} showToast={showToast} toast={toast} onLogout={async () => { await axios.post(`${API}/auth/logout`, {}); setUser(null); setLoggedIn(false); }} />;

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
          {(user?.role === "Admin" ? NAV.filter((item) => item.id === "dashboard") : NAV).map((item) => <NavItem key={item.id} item={item} active={active} onClick={navigate} />)}
          {user?.role === "Guru" && masters?.teachers?.find((t) => t.name === user.name)?.homeroom_class && <NavItem item={{ id: "wali-kelas", label: "Wali Kelas", icon: UserRound }} active={active} onClick={navigate} />}
          {user?.role === "Admin" && ADMIN_NAV_GROUPS.map((group) => <Fragment key={group.label}><button type="button" className="nav-caption admin-caption admin-caption-toggle" onClick={() => toggleAdminGroup(group.label)}>{group.label}<ChevronDown size={12} className={`caption-chevron ${openAdminGroups.has(group.label) ? "open" : ""}`} /></button>{openAdminGroups.has(group.label) && group.items.map((item) => <NavItem key={item.id} item={item} active={active} onClick={navigate} />)}</Fragment>)}
        </nav>
        <div className="sidebar-bottom"><div className="backup-chip"><span className="pulse-dot" /> Backup otomatis aktif <ChevronDown size={14} /></div><button className="logout-button" data-testid="logout-button" onClick={async () => { await axios.post(`${API}/auth/logout`, {}); setUser(null); setLoggedIn(false); }}><LogOut size={16} /> Keluar</button></div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" data-testid="mobile-menu-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />}
      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu-button" data-testid="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={20} /></button><div className="crumb"><span>{settings?.school || "SMP PGRI Gandoang"}</span><ArrowRight size={14} /><strong>{NAV.concat(ADMIN_NAV).find((n) => n.id === active)?.label || "Dashboard"}</strong></div><div className="top-actions"><button className="icon-button" data-testid="global-search-button" aria-label="Cari"><Search size={18} /></button><div className="date-badge" data-testid="today-date"><CalendarDays size={15} /> {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div><div className="mini-avatar">{user?.name ? initials(user.name) : "AF"}</div></div></header>
        <div className="page-wrap">
          {active === "dashboard" && (user?.role === "Admin" ? <AdminDashboard navigate={navigate} user={user} /> : <Dashboard navigate={navigate} user={user} stats={stats} />)}
          {active === "absensi" && (ready ? <Attendance classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} showToast={showToast} /> : loadingPanel)}
          {active === "nilai" && (ready ? <Grades classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} showToast={showToast} /> : loadingPanel)}
          {active === "jadwal" && (ready ? <Schedule classes={classNames} subjects={subjectNames} showToast={showToast} onSaved={loadMySchedules} /> : loadingPanel)}
          {active === "jurnal" && (ready ? <Journal classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} showToast={showToast} /> : loadingPanel)}
          {active === "rekap" && <Reports onExport={downloadReport} onPrint={printReport} classes={myClassNames} subjects={subjectNames} subjectsByClass={subjectsByClass} />}
          {active === "wali-kelas" && <WaliKelasPage showToast={showToast} homeroomClass={masters?.teachers?.find((t) => t.name === user.name)?.homeroom_class} />}
          {active === "ekskul" && <EkskulAdmin showToast={showToast} />}
          {active === "ekskul-rekap" && <EkskulRekap showToast={showToast} />}
          {active === "guru" && masters && <Master title="Kelola Guru" icon={Users} rows={masters.teachers} addLabel="Tambah guru" onAdd={addMaster("teachers", "Data guru diperbarui")} onUpdate={updateMaster("teachers", "Data guru diperbarui")} onDelete={deleteMaster("teachers", "Data guru dihapus")} accountActions onCreateAccount={createTeacherAccount} onResetPassword={resetTeacherPassword} onImport={importMaster("teachers", "Guru")} />}
          {active === "kelas" && masters && <KelasManager rows={masters.classes} showToast={showToast} onReload={loadMasters} />}
          {active === "guru-piket" && <GuruPiketAdmin showToast={showToast} />}
          {active === "beban-mengajar" && masters && <BebanMengajarAdmin showToast={showToast} classes={classNames} subjects={subjectNames} />}
          {active === "akun-piket" && <PiketAccountsAdmin showToast={showToast} />}
          {active === "rekap-piket" && <PiketRekap showToast={showToast} />}
          {active === "wali-kelas-admin" && masters && <WaliKelasAdmin showToast={showToast} teachers={masters.teachers} classes={classNames} onReload={loadMasters} />}
          {active === "akun-sekretaris" && <SekretarisAccountsAdmin showToast={showToast} classes={classNames} />}
          {active === "rekap-absen-harian" && <DailyAttendanceRekap showToast={showToast} classes={classNames} />}
          {active === "akun-tu" && <TuAccountsAdmin showToast={showToast} />}
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
function AdminDashboard({ navigate, user }) {
  const [s, setS] = useState(null);
  useEffect(() => { axios.get(`${API}/dashboard/admin-stats`).then(({ data }) => setS(data)).catch(() => {}); }, []);
  const st = s || {};
  const roleCounts = st.role_counts || {};
  const totalAkun = Object.values(roleCounts).reduce((a, b) => a + b, 0);
  const quickLinks = [
    { id: "guru", label: "Kelola Guru", icon: Users },
    { id: "siswa", label: "Kelola Siswa", icon: Users },
    { id: "ekskul", label: "Kelola Ekskul", icon: Trophy },
    { id: "akun-piket", label: "Akun Piket", icon: IdCard },
    { id: "akun-sekretaris", label: "Akun Sekretaris Kelas", icon: ClipboardList },
    { id: "akun-tu", label: "Akun Tata Usaha", icon: Contact },
  ];
  return <>
    <PageTitle eyebrow={new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()} title={`Selamat datang, ${user?.name || "Admin"}`} description="Ringkasan kondisi sekolah hari ini." />
    <div className="stat-grid">
      <Stat label="Guru terdaftar" value={st.teachers_count ?? "-"} change="Total" icon={Users} color="green" />
      <Stat label="Siswa aktif" value={st.students_count ?? "-"} change="Total" icon={GraduationCap} color="blue" />
      <Stat label="Kelas" value={st.classes_count ?? "-"} change="Total" icon={School} color="amber" />
      <Stat label="Ekskul aktif" value={st.ekskul_count ?? "-"} change="Total" icon={Trophy} color="rose" />
    </div>
    <div className="dashboard-grid">
      <section className="panel">
        <PanelHeading title="Status Piket Hari Ini" subtitle="Absensi & Jam Mengajar" />
        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
          <Stat label="Piket Pagi" value={st.piket_pagi_filled ? "Sudah" : "Belum"} change="Hari ini" icon={Sun} color={st.piket_pagi_filled ? "green" : "rose"} />
          <Stat label="Piket Siang" value={st.piket_siang_filled ? "Sudah" : "Belum"} change="Hari ini" icon={Moon} color={st.piket_siang_filled ? "green" : "rose"} />
        </div>
      </section>
      <section className="panel attention-panel">
        <PanelHeading title="Kelas Belum Diabsen" subtitle="Sekretaris kelas, hari ini" action={<AlertTriangle size={18} className="warning-icon" />} />
        <div className="attention-callout"><div className="attention-number">{(st.classes_not_attended_today || []).length}</div><div><strong>dari {st.classes_count ?? 0} kelas</strong><p>belum ada absen hari ini</p></div></div>
        {(st.classes_not_attended_today || []).slice(0, 6).map((c) => <div className="attention-row" key={c}><span>{c}</span></div>)}
        {(st.classes_not_attended_today || []).length === 0 && <p className="muted">Semua kelas sudah diabsen hari ini.</p>}
      </section>
    </div>
    <div className="dashboard-grid">
      <section className="panel">
        <PanelHeading title="Persuratan Bulan Ini" />
        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
          <Stat label="Surat Masuk" value={st.surat_masuk_month ?? 0} change="Bulan ini" icon={Mail} color="blue" />
          <Stat label="Surat Keluar" value={st.surat_keluar_month ?? 0} change="Bulan ini" icon={Send} color="green" />
        </div>
      </section>
      <section className="panel">
        <PanelHeading title="Akun Terdaftar" subtitle={`${totalAkun} akun total`} />
        <div className="timeline">{Object.entries(roleCounts).map(([role, count]) => <div className="timeline-item" key={role}><div className="time">{count}</div><div className="timeline-line"><span /></div><div className="lesson"><strong>{role}</strong></div></div>)}</div>
      </section>
    </div>
    <div className="section-heading"><h2>Akses cepat</h2></div>
    <div className="quick-grid">{quickLinks.map((q) => { const Icon = q.icon; return <button className="quick-action" key={q.id} onClick={() => navigate(q.id)}><div className="quick-icon"><Icon size={18} /></div><div><strong>{q.label}</strong></div><ArrowRight size={16} /></button>; })}</div>
  </>;
}

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
      await axios.put(`${API}/settings`, { school: settings.school, address: settings.address, principal: settings.principal, nip: settings.nip, ekskul_coordinator: settings.ekskul_coordinator || "", ekskul_coordinator_nip: settings.ekskul_coordinator_nip || "", waka_kurikulum: settings.waka_kurikulum || "", logo_base64: settings.logo_base64 || "", logo_lencana_base64: settings.logo_lencana_base64 || "", kartu_template_base64: settings.kartu_template_base64 || "" });
      showToast("Pengaturan sekolah tersimpan");
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan pengaturan")); } finally { setSaving(false); }
  };
  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, logo_base64: reader.result });
    reader.readAsDataURL(file);
  };
  const handleLogoLencana = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, logo_lencana_base64: reader.result });
    reader.readAsDataURL(file);
  };
  const handleKartuTemplate = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, kartu_template_base64: reader.result });
    reader.readAsDataURL(file);
  };
  return <><PageTitle eyebrow="Administration" title="Pengaturan sekolah" description="Pastikan identitas sekolah tampil rapi di setiap laporan." /><FormShell title="Identitas sekolah" subtitle="Informasi ini digunakan pada header laporan" onSave={save} saving={saving}><div className="form-grid"><label className="field full">Nama sekolah<input data-testid="settings-school-input" value={settings.school} onChange={(e) => setSettings({ ...settings, school: e.target.value })} /></label><label className="field full">Alamat<input data-testid="settings-address-input" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label><label className="field">Nama kepala sekolah<input data-testid="settings-principal-input" value={settings.principal} onChange={(e) => setSettings({ ...settings, principal: e.target.value })} /></label><label className="field">NIP kepala sekolah<input data-testid="settings-nip-input" value={settings.nip} onChange={(e) => setSettings({ ...settings, nip: e.target.value })} /></label><label className="field">Nama Waka Kurikulum<input value={settings.waka_kurikulum || ""} onChange={(e) => setSettings({ ...settings, waka_kurikulum: e.target.value })} placeholder="Untuk tanda tangan di rekap piket" /></label><label className="field">Nama koordinator ekskul<input value={settings.ekskul_coordinator || ""} onChange={(e) => setSettings({ ...settings, ekskul_coordinator: e.target.value })} placeholder="Untuk tanda tangan di rekap ekskul" /></label><label className="field">NIP koordinator ekskul<input value={settings.ekskul_coordinator_nip || ""} onChange={(e) => setSettings({ ...settings, ekskul_coordinator_nip: e.target.value })} /></label><label className="field full">Logo sekolah (untuk kop surat, banner lebar)<div style={{ display: "flex", gap: 14, alignItems: "center" }}><label className="secondary-button" style={{ cursor: "pointer" }}><ImagePlus size={16} /> Unggah logo<input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} /></label>{settings.logo_base64 && <img src={settings.logo_base64} alt="Logo sekolah" style={{ height: 50, width: 50, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8 }} />}</div></label><label className="field full">Lambang/Badge sekolah (opsional, dipakai kalau nggak upload template kartu)<div style={{ display: "flex", gap: 14, alignItems: "center" }}><label className="secondary-button" style={{ cursor: "pointer" }}><ImagePlus size={16} /> Unggah lambang<input type="file" accept="image/*" onChange={handleLogoLencana} style={{ display: "none" }} /></label>{settings.logo_lencana_base64 && <img src={settings.logo_lencana_base64} alt="Lambang sekolah" style={{ height: 50, width: 50, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8 }} />}</div></label><label className="field full">Template Kartu Pelajar (gambar desain kosong buatan kamu sendiri)<div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}><label className="secondary-button" style={{ cursor: "pointer" }}><ImagePlus size={16} /> Unggah template<input type="file" accept="image/*" onChange={handleKartuTemplate} style={{ display: "none" }} /></label>{settings.kartu_template_base64 && <img src={settings.kartu_template_base64} alt="Template kartu pelajar" style={{ height: 70, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8 }} />}</div><p style={{ fontSize: 11, color: "#8a988f", marginTop: 6 }}>Foto siswa & data (nama, NISN, dst) akan ditempel otomatis di atas gambar ini. Kalau posisinya belum pas, kasih tahu saya arahnya (misal "foto kurang ke kanan dikit").</p></label></div></FormShell><section className="panel backup-panel"><PanelHeading title="Cadangan data" subtitle="Lindungi data administrasi Anda" action={<span className="saved-badge"><Check size={14} /> Aktif</span>} /><p>Cadangan otomatis dibuat setiap Senin pagi.</p><button className="secondary-button" data-testid="manual-backup-button" onClick={() => showToast("Cadangan data berhasil dibuat")}><Save size={16} /> Buat cadangan sekarang</button></section></>;
}

function EkskulAttendance({ showToast }) {
  const [ekskulList, setEkskulList] = useState([]);
  const [ekskulId, setEkskulId] = useState("");
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  useEffect(() => { axios.get(`${API}/ekskul`).then(({ data }) => { setEkskulList(data); if (data[0]) setEkskulId(data[0].id); }).catch(() => showToast("Gagal memuat data ekskul")); axios.get(`${API}/students`).then(({ data }) => setAllStudents(data)).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const load = async () => {
    if (!ekskulId) return;
    try {
      const [membersRes, savedRes] = await Promise.all([
        axios.get(`${API}/ekskul/${ekskulId}/members`),
        axios.get(`${API}/ekskul-attendance`, { params: { date, ekskul_id: ekskulId } }),
      ]);
      const saved = Object.fromEntries(savedRes.data.entries.map((e) => [e.student, e]));
      setRoster(membersRes.data);
      setSelectedMembers(membersRes.data.map((s) => s.id));
      setStatuses(Object.fromEntries(membersRes.data.map((s) => [s.name, saved[s.name]?.status || "H"])));
      setNotes(Object.fromEntries(membersRes.data.map((s) => [s.name, saved[s.name]?.note || ""])));
    } catch { showToast("Gagal memuat data absensi ekskul"); }
  };
  useEffect(() => { load(); }, [date, ekskulId]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!roster.length) return showToast("Tidak ada anggota untuk disimpan");
    setSaving(true);
    try {
      await axios.post(`${API}/ekskul-attendance`, { date, ekskul_id: ekskulId, entries: roster.map((s) => ({ student: s.name, status: statuses[s.name] || "H", note: notes[s.name] || "" })) });
      showToast("Absensi ekskul berhasil disimpan");
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan absensi ekskul")); } finally { setSaving(false); }
  };
  const toggleMember = (id) => setSelectedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const saveMembers = async () => {
    try { await axios.put(`${API}/ekskul/${ekskulId}/members`, { student_ids: selectedMembers }); showToast("Anggota ekskul diperbarui"); setShowMembers(false); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan anggota")); }
  };
  const ekskulName = ekskulList.find((e) => e.id === ekskulId)?.name || "";
  return <><PageTitle eyebrow="Kegiatan ekskul" title="Absensi peserta" description="Catat kehadiran anggota ekstrakurikuler." /><div className="filter-grid panel"><label className="field">Tanggal<input data-testid="ekskul-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="field">Ekskul<select data-testid="ekskul-select" value={ekskulId} onChange={(e) => setEkskulId(e.target.value)}>{ekskulList.map((ek) => <option key={ek.id} value={ek.id}>{ek.name}</option>)}</select></label><button className="secondary-button filter-button" data-testid="ekskul-load-button" onClick={load}><Search size={16} /> Tampilkan anggota</button><button className="secondary-button filter-button" onClick={() => setShowMembers(true)}><Users size={16} /> Kelola anggota</button></div>{showMembers && <section className="panel" style={{ marginBottom: 18 }}><PanelHeading title="Kelola anggota ekskul" subtitle={`${selectedMembers.length} siswa dipilih dari ${ekskulName}`} action={<button className="icon-button" onClick={() => setShowMembers(false)}><X size={16} /></button>} /><label className="field full" style={{ marginBottom: 10 }}>Cari nama siswa<input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Ketik nama siswa..." /></label><div className="table-wrap"><table><thead><tr><th></th><th>Nama siswa</th><th>Kelas</th></tr></thead><tbody>{allStudents.filter((s) => s.name.toLowerCase().includes(memberSearch.toLowerCase())).map((s) => <tr key={s.id}><td><input type="checkbox" checked={selectedMembers.includes(s.id)} onChange={() => toggleMember(s.id)} /></td><td>{s.name}</td><td>{s.class_name}</td></tr>)}</tbody></table></div><button className="primary-button" style={{ marginTop: 12 }} onClick={saveMembers}><Save size={16} /> Simpan anggota</button></section>}<section className="panel roster-panel"><PanelHeading title={ekskulName} subtitle={`${date} · ${roster.length} anggota`} action={<div className="status-legend"><span><i className="status-dot hadir" /> Hadir</span><span><i className="status-dot sakit" /> Sakit</span><span><i className="status-dot izin" /> Izin</span><span><i className="status-dot alpa" /> Alpa</span></div>} /><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama siswa</th><th>Kelas</th><th>Status kehadiran</th><th>Catatan</th></tr></thead><tbody>{roster.map((s, i) => <tr key={s.id}><td>{String(i + 1).padStart(2, "0")}</td><td><div className="name-cell"><span className="student-avatar">{initials(s.name)}</span><strong>{s.name}</strong></div></td><td>{s.class_name}</td><td><div className="status-buttons">{[["H", "Hadir", "hadir"], ["S", "Sakit", "sakit"], ["I", "Izin", "izin"], ["A", "Alpa", "alpa"]].map(([code, name, style]) => <button key={code} className={`${style} ${statuses[s.name] === code ? "selected" : ""}`} data-testid={`ekskul-${i + 1}-${code.toLowerCase()}`} onClick={() => setStatuses({ ...statuses, [s.name]: code })}>{code}<span>{name}</span></button>)}</div></td><td><input className="table-input" data-testid={`ekskul-note-${i + 1}`} value={notes[s.name] || ""} onChange={(e) => setNotes({ ...notes, [s.name]: e.target.value })} placeholder="Tambah catatan" /></td></tr>)}{!roster.length && <tr><td colSpan="5" data-testid="ekskul-empty-state">Belum ada anggota terdaftar untuk ekskul ini. Klik "Kelola anggota" untuk menambahkan.</td></tr>}</tbody></table></div><div className="roster-footer"><span><Check size={15} /> {Object.values(statuses).filter((x) => x === "H").length} anggota hadir</span><button className="primary-button" data-testid="ekskul-save-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan absensi"}</button></div></section></>;
}

function useEkskulPicker(showToast) {
  const [ekskulList, setEkskulList] = useState([]);
  const [ekskulId, setEkskulId] = useState("");
  useEffect(() => { axios.get(`${API}/ekskul`).then(({ data }) => { setEkskulList(data); if (data[0]) setEkskulId(data[0].id); }).catch(() => showToast("Gagal memuat data ekskul")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { ekskulList, ekskulId, setEkskulId };
}

function EkskulAbsenDiri({ showToast }) {
  const { ekskulList, ekskulId, setEkskulId } = useEkskulPicker(showToast);
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState("Hadir");
  const [photo, setPhoto] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const loadHistory = () => { if (ekskulId) axios.get(`${API}/ekskul-pembina-attendance`, { params: { ekskul_id: ekskulId } }).then(({ data }) => setHistory(data)).catch(() => showToast("Gagal memuat riwayat absen diri")); };
  useEffect(() => { loadHistory(); }, [ekskulId]); // eslint-disable-line react-hooks/exhaustive-deps
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };
  const submit = async () => {
    if (!ekskulId) return showToast("Pilih ekskul terlebih dahulu");
    if (status === "Hadir" && !photo) return showToast("Ambil foto terlebih dahulu sebagai bukti kehadiran");
    setSaving(true);
    try {
      await axios.post(`${API}/ekskul-pembina-attendance`, { date, ekskul_id: ekskulId, status, photo: status === "Hadir" ? photo : "", note });
      showToast("Absen diri berhasil disimpan");
      setPhoto(""); setNote(""); loadHistory();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan absen diri")); } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus data absen diri ini?")) return;
    try { await axios.delete(`${API}/ekskul-pembina-attendance/${id}`); showToast("Data dihapus"); loadHistory(); } catch { showToast("Gagal menghapus data"); }
  };
  return <><PageTitle eyebrow="Kehadiran pembina" title="Absen diri" description="Catat kehadiran Anda sendiri sebagai pembina, lengkap dengan foto." /><div className="filter-grid panel"><label className="field">Tanggal<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="field">Ekskul<select value={ekskulId} onChange={(e) => setEkskulId(e.target.value)}>{ekskulList.map((ek) => <option key={ek.id} value={ek.id}>{ek.name}</option>)}</select></label><label className="field">Status kehadiran<select value={status} onChange={(e) => { setStatus(e.target.value); if (e.target.value !== "Hadir") setPhoto(""); }}><option value="Hadir">Hadir</option><option value="Sakit">Sakit</option><option value="Izin">Izin</option></select></label></div>{status === "Hadir" && <section className="panel" style={{ marginTop: 16 }}><PanelHeading title="Ambil foto kehadiran" subtitle="Foto akan digunakan sebagai bukti kehadiran" /><div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}><label className="secondary-button" style={{ cursor: "pointer" }}><Camera size={16} /> Ambil / pilih foto<input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} /></label>{photo && <img src={photo} alt="Pratinjau absen diri" style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 12, border: "1px solid #e2e8f0" }} />}</div></section>}<section className="panel" style={{ marginTop: 16 }}><label className="field full">Catatan (opsional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: latihan rutin, hujan sehingga di dalam ruangan, dll" /></label><button className="primary-button" style={{ marginTop: 12 }} onClick={submit} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan absen diri"}</button></section><section className="panel" style={{ marginTop: 16 }}><PanelHeading title="Riwayat absen diri" subtitle={`${history.length} catatan`} /><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jam</th><th>Status</th><th>Foto</th><th>Catatan</th><th></th></tr></thead><tbody>{history.map((h) => <tr key={h.id}><td>{h.date}</td><td>{h.time || "-"}</td><td>{h.status || "Hadir"}</td><td>{h.photo ? <img src={h.photo} alt="Bukti kehadiran" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} /> : "-"}</td><td>{h.note || "-"}</td><td><button className="icon-button" onClick={() => remove(h.id)}><Trash2 size={16} /></button></td></tr>)}{!history.length && <tr><td colSpan="6">Belum ada riwayat absen diri.</td></tr>}</tbody></table></div></section></>;
}

function EkskulJurnal({ showToast }) {
  const { ekskulList, ekskulId, setEkskulId } = useEkskulPicker(showToast);
  const [date, setDate] = useState(today());
  const [materi, setMateri] = useState("");
  const [catatan, setCatatan] = useState("");
  const [rows, setRows] = useState([]);
  const load = () => { if (ekskulId) axios.get(`${API}/ekskul-jurnal`, { params: { ekskul_id: ekskulId } }).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat jurnal")); };
  useEffect(() => { load(); }, [ekskulId]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!materi.trim()) return showToast("Materi wajib diisi");
    try { await axios.post(`${API}/ekskul-jurnal`, { date, ekskul_id: ekskulId, materi, catatan }); showToast("Jurnal tersimpan"); setMateri(""); setCatatan(""); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan jurnal")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus jurnal ini?")) return;
    try { await axios.delete(`${API}/ekskul-jurnal/${id}`); showToast("Jurnal dihapus"); load(); } catch { showToast("Gagal menghapus jurnal"); }
  };
  return <><PageTitle eyebrow="Kegiatan ekskul" title="Jurnal ekskul" description="Catat materi dan jalannya kegiatan setiap sesi latihan." /><div className="filter-grid panel"><label className="field">Tanggal<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="field">Ekskul<select value={ekskulId} onChange={(e) => setEkskulId(e.target.value)}>{ekskulList.map((ek) => <option key={ek.id} value={ek.id}>{ek.name}</option>)}</select></label></div><section className="panel" style={{ marginTop: 16 }}><label className="field full">Materi<input value={materi} onChange={(e) => setMateri(e.target.value)} placeholder="Contoh: Latihan baris-berbaris" /></label><label className="field full" style={{ marginTop: 10 }}>Catatan<input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan (opsional)" /></label><button className="primary-button" style={{ marginTop: 12 }} onClick={submit}><Save size={16} /> Simpan jurnal</button></section><section className="panel" style={{ marginTop: 16 }}><PanelHeading title="Riwayat jurnal" subtitle={`${rows.length} catatan`} /><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Materi</th><th>Catatan</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.materi}</td><td>{r.catatan || "-"}</td><td><button className="icon-button" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}{!rows.length && <tr><td colSpan="4">Belum ada jurnal.</td></tr>}</tbody></table></div></section></>;
}

function EkskulPrestasi({ showToast }) {
  const { ekskulList, ekskulId, setEkskulId } = useEkskulPicker(showToast);
  const [form, setForm] = useState({ date: today(), nama_lomba: "", tingkat: "", hasil: "", catatan: "" });
  const [selectedPeserta, setSelectedPeserta] = useState([]);
  const [showPesertaPicker, setShowPesertaPicker] = useState(false);
  const [pesertaSearch, setPesertaSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [members, setMembers] = useState([]);
  useEffect(() => { if (ekskulId) axios.get(`${API}/ekskul/${ekskulId}/members`).then(({ data }) => setMembers(data)).catch(() => {}); }, [ekskulId]);
  const load = () => { if (ekskulId) axios.get(`${API}/ekskul-prestasi`, { params: { ekskul_id: ekskulId } }).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat data prestasi")); };
  useEffect(() => { load(); }, [ekskulId]); // eslint-disable-line react-hooks/exhaustive-deps
  const togglePeserta = (name) => setSelectedPeserta((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);
  const submit = async () => {
    if (!form.nama_lomba.trim()) return showToast("Nama lomba wajib diisi");
    try {
      await axios.post(`${API}/ekskul-prestasi`, { ...form, nama_peserta: selectedPeserta.join(", "), ekskul_id: ekskulId });
      showToast("Prestasi tersimpan");
      setForm({ date: today(), nama_lomba: "", tingkat: "", hasil: "", catatan: "" });
      setSelectedPeserta([]);
      load();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan prestasi")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus data prestasi ini?")) return;
    try { await axios.delete(`${API}/ekskul-prestasi/${id}`); showToast("Data dihapus"); load(); } catch { showToast("Gagal menghapus data"); }
  };
  return <><PageTitle eyebrow="Kegiatan ekskul" title="Prestasi & lomba" description="Catat hasil lomba atau kejuaraan yang diikuti peserta." /><div className="filter-grid panel"><label className="field">Ekskul<select value={ekskulId} onChange={(e) => setEkskulId(e.target.value)}>{ekskulList.map((ek) => <option key={ek.id} value={ek.id}>{ek.name}</option>)}</select></label></div><section className="panel" style={{ marginTop: 16 }}><div className="form-grid"><label className="field">Tanggal<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="field">Nama lomba<input value={form.nama_lomba} onChange={(e) => setForm({ ...form, nama_lomba: e.target.value })} placeholder="Contoh: LKBB Tingkat Kabupaten" /></label><label className="field">Tingkat<input value={form.tingkat} onChange={(e) => setForm({ ...form, tingkat: e.target.value })} placeholder="Kecamatan / Kabupaten / Provinsi" /></label><label className="field">Hasil<input value={form.hasil} onChange={(e) => setForm({ ...form, hasil: e.target.value })} placeholder="Juara 1 / Peserta / dll" /></label><label className="field full">Catatan<input value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></label></div><div style={{ marginTop: 14 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#53645a", display: "block", marginBottom: 8 }}>Peserta / anggota tim ({selectedPeserta.length} dipilih)</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>{selectedPeserta.map((nm) => <span key={nm} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#edf5ef", color: "#176b4a", border: "1px solid #d8e8dc", borderRadius: 20, padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>{nm}<button onClick={() => togglePeserta(nm)} style={{ border: 0, background: "none", cursor: "pointer", color: "#176b4a", display: "flex" }}><X size={12} /></button></span>)}</div><button className="secondary-button" onClick={() => setShowPesertaPicker(true)}><Users size={16} /> Pilih peserta</button></div>{showPesertaPicker && <div className="panel" style={{ marginTop: 12 }}><PanelHeading title="Pilih peserta / anggota tim" subtitle={`${selectedPeserta.length} dipilih dari anggota ekskul`} action={<button className="icon-button" onClick={() => setShowPesertaPicker(false)}><X size={16} /></button>} /><label className="field full" style={{ marginBottom: 10 }}>Cari nama siswa<input value={pesertaSearch} onChange={(e) => setPesertaSearch(e.target.value)} placeholder="Ketik nama siswa..." /></label><div className="table-wrap"><table><thead><tr><th></th><th>Nama siswa</th><th>Kelas</th></tr></thead><tbody>{members.filter((m) => m.name.toLowerCase().includes(pesertaSearch.toLowerCase())).map((m) => <tr key={m.id}><td><input type="checkbox" checked={selectedPeserta.includes(m.name)} onChange={() => togglePeserta(m.name)} /></td><td>{m.name}</td><td>{m.class_name}</td></tr>)}{!members.length && <tr><td colSpan="3">Belum ada anggota terdaftar untuk ekskul ini.</td></tr>}</tbody></table></div></div>}<button className="primary-button" style={{ marginTop: 16 }} onClick={submit}><Save size={16} /> Simpan prestasi</button></section><section className="panel" style={{ marginTop: 16 }}><PanelHeading title="Riwayat prestasi" subtitle={`${rows.length} catatan`} /><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Lomba</th><th>Tingkat</th><th>Peserta</th><th>Hasil</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.nama_lomba}</td><td>{r.tingkat || "-"}</td><td>{r.nama_peserta || "-"}</td><td>{r.hasil || "-"}</td><td><button className="icon-button" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}{!rows.length && <tr><td colSpan="6">Belum ada catatan prestasi.</td></tr>}</tbody></table></div></section></>;
}

function EkskulNilai({ showToast }) {
  const { ekskulList, ekskulId, setEkskulId } = useEkskulPicker(showToast);
  const [members, setMembers] = useState([]);
  const [bank, setBank] = useState([]);
  const [newPredikat, setNewPredikat] = useState({ predikat: "", deskripsi: "" });
  const [picks, setPicks] = useState({});
  const [history, setHistory] = useState([]);
  const load = () => {
    if (!ekskulId) return;
    axios.get(`${API}/ekskul/${ekskulId}/members`).then(({ data }) => setMembers(data)).catch(() => showToast("Gagal memuat anggota"));
    axios.get(`${API}/ekskul-deskripsi`, { params: { ekskul_id: ekskulId } }).then(({ data }) => setBank(data)).catch(() => {});
    axios.get(`${API}/ekskul-nilai`, { params: { ekskul_id: ekskulId } }).then(({ data }) => setHistory(data)).catch(() => {});
  };
  useEffect(() => { load(); }, [ekskulId]); // eslint-disable-line react-hooks/exhaustive-deps
  const addPredikat = async () => {
    if (!newPredikat.predikat.trim()) return showToast("Nama predikat wajib diisi");
    try { await axios.post(`${API}/ekskul-deskripsi`, { ...newPredikat, ekskul_id: ekskulId }); setNewPredikat({ predikat: "", deskripsi: "" }); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menambah predikat")); }
  };
  const removePredikat = async (id) => { try { await axios.delete(`${API}/ekskul-deskripsi/${id}`); load(); } catch { showToast("Gagal menghapus predikat"); } };
  const setPick = (name, field, value) => setPicks((prev) => ({ ...prev, [name]: { ...prev[name], [field]: value } }));
  const choosePredikat = (name, predikatName) => {
    const found = bank.find((b) => b.predikat === predikatName);
    setPicks((prev) => ({ ...prev, [name]: { predikat: predikatName, deskripsi: found?.deskripsi || prev[name]?.deskripsi || "" } }));
  };
  const submitNilai = async () => {
    const entries = members.filter((m) => picks[m.name]?.predikat).map((m) => ({ student: m.name, predikat: picks[m.name].predikat, deskripsi: picks[m.name].deskripsi || "" }));
    if (!entries.length) return showToast("Pilih predikat untuk minimal satu peserta");
    try { await axios.post(`${API}/ekskul-nilai`, { ekskul_id: ekskulId, entries }); showToast("Nilai ekskul tersimpan"); setPicks({}); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan nilai")); }
  };
  const removeNilai = async (id) => { try { await axios.delete(`${API}/ekskul-nilai/${id}`); load(); } catch { showToast("Gagal menghapus nilai"); } };
  return <><PageTitle eyebrow="Kegiatan ekskul" title="Nilai ekskul" description="Beri penilaian peserta berdasarkan predikat yang sudah ditentukan." /><div className="filter-grid panel"><label className="field">Ekskul<select value={ekskulId} onChange={(e) => setEkskulId(e.target.value)}>{ekskulList.map((ek) => <option key={ek.id} value={ek.id}>{ek.name}</option>)}</select></label></div><section className="panel" style={{ marginTop: 16 }}><PanelHeading title="Bank predikat & deskripsi" subtitle="Dipakai sebagai pilihan cepat saat menilai" /><div className="filter-grid"><label className="field">Predikat<input value={newPredikat.predikat} onChange={(e) => setNewPredikat({ ...newPredikat, predikat: e.target.value })} placeholder="Contoh: Sangat Baik" /></label><label className="field full">Deskripsi<input value={newPredikat.deskripsi} onChange={(e) => setNewPredikat({ ...newPredikat, deskripsi: e.target.value })} placeholder="Deskripsi otomatis untuk predikat ini" /></label><button className="secondary-button filter-button" onClick={addPredikat}><Save size={16} /> Tambah</button></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>{bank.map((b) => <span key={b.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#edf5ef", color: "#176b4a", border: "1px solid #d8e8dc", borderRadius: 20, padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>{b.predikat}<button onClick={() => removePredikat(b.id)} style={{ border: 0, background: "none", cursor: "pointer", color: "#176b4a", display: "flex" }}><X size={12} /></button></span>)}</div></section><section className="panel" style={{ marginTop: 16 }}><PanelHeading title="Beri nilai peserta" subtitle={`${members.length} anggota`} /><div className="table-wrap"><table><thead><tr><th>Nama siswa</th><th>Kelas</th><th>Predikat</th><th>Deskripsi</th></tr></thead><tbody>{members.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.class_name}</td><td><select value={picks[m.name]?.predikat || ""} onChange={(e) => choosePredikat(m.name, e.target.value)}><option value="">Pilih predikat</option>{bank.map((b) => <option key={b.id} value={b.predikat}>{b.predikat}</option>)}</select></td><td><input value={picks[m.name]?.deskripsi || ""} onChange={(e) => setPick(m.name, "deskripsi", e.target.value)} placeholder="Deskripsi (bisa diedit)" /></td></tr>)}{!members.length && <tr><td colSpan="4">Belum ada anggota terdaftar untuk ekskul ini.</td></tr>}</tbody></table></div><button className="primary-button" style={{ marginTop: 12 }} onClick={submitNilai}><Save size={16} /> Simpan nilai</button></section><section className="panel" style={{ marginTop: 16 }}><PanelHeading title="Riwayat nilai" subtitle={`${history.length} catatan`} /><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Predikat</th><th>Deskripsi</th><th>Tanggal dicatat</th><th></th></tr></thead><tbody>{history.map((h) => <tr key={h.id}><td>{h.student}</td><td>{h.predikat}</td><td>{h.deskripsi || "-"}</td><td>{h.created_at?.slice(0, 10)}</td><td><button className="icon-button" onClick={() => removeNilai(h.id)}><Trash2 size={16} /></button></td></tr>)}{!history.length && <tr><td colSpan="5">Belum ada riwayat nilai.</td></tr>}</tbody></table></div></section></>;
}

function EkskulRekap({ showToast }) {
  const { ekskulList, ekskulId, setEkskulId } = useEkskulPicker(showToast);
  const [jenis, setJenis] = useState("absensi");
  const [bulan, setBulan] = useState(today().slice(0, 7));
  const [settingsData, setSettingsData] = useState({});
  const [members, setMembers] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { axios.get(`${API}/settings`).then(({ data }) => setSettingsData(data)).catch(() => {}); }, []);
  useEffect(() => { if (ekskulId) axios.get(`${API}/ekskul/${ekskulId}/members`).then(({ data }) => setMembers(data)).catch(() => {}); }, [ekskulId]);
  const ekskul = ekskulList.find((e) => e.id === ekskulId);
  const kelasLookup = Object.fromEntries(members.map((m) => [m.name, m.class_name]));
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const labelBulan = () => { const [thn, bln] = bulan.split("-"); return `${namaBulan[parseInt(bln, 10) - 1]} ${thn}`; };
  const tampilkan = async () => {
    if (!ekskulId) return showToast("Pilih ekskul terlebih dahulu");
    if (jenis !== "nilai" && !bulan) return showToast("Pilih bulan terlebih dahulu");
    setLoading(true);
    try {
      if (jenis === "absensi") {
        const { data } = await axios.get(`${API}/ekskul-attendance/history`, { params: { ekskul_id: ekskulId } });
        const sesiBulan = data.filter((s) => s.date.startsWith(bulan));
        const tanggalUnik = [...new Set(sesiBulan.map((s) => s.date))].sort();
        const namaPeserta = [...new Set([...members.map((m) => m.name), ...sesiBulan.flatMap((s) => s.entries.map((e) => e.student))])];
        const lookup = {};
        sesiBulan.forEach((s) => s.entries.forEach((e) => { lookup[e.student] = lookup[e.student] || {}; lookup[e.student][s.date] = e.status; }));
        setPreview({ type: "absensi", tanggalUnik, peserta: namaPeserta, lookup });
      } else if (jenis === "pembina") {
        const { data } = await axios.get(`${API}/ekskul-pembina-attendance`, { params: { ekskul_id: ekskulId } });
        const filtered = data.filter((h) => h.date.startsWith(bulan)).sort((a, b) => a.date.localeCompare(b.date));
        setPreview({ type: "pembina", rows: filtered });
      } else {
        const { data } = await axios.get(`${API}/ekskul-nilai`, { params: { ekskul_id: ekskulId } });
        setPreview({ type: "nilai", rows: data });
      }
    } catch (err) { showToast(errMsg(err, "Gagal memuat rekap")); } finally { setLoading(false); }
  };
  const cetak = () => window.print();
  const namaSekolah = settingsData.school || "Nama Sekolah";
  const alamatSekolah = settingsData.address || "";
  const namaKepala = settingsData.principal || "............................";
  const namaKoordinator = settingsData.ekskul_coordinator || "............................";
  const namaPembinaEkskul = ekskul?.pembina_name || "............................";
  return <>
    <PageTitle eyebrow="Laporan" title="Rekap ekskul" description="Buat laporan absensi, kehadiran pembina, atau nilai siap cetak." />
    <div className="filter-grid panel no-print">
      <label className="field">Jenis rekap<select value={jenis} onChange={(e) => { setJenis(e.target.value); setPreview(null); }}>
        <option value="absensi">Absensi peserta</option>
        <option value="pembina">Absensi pembina/pelatih</option>
        <option value="nilai">Nilai</option>
      </select></label>
      <label className="field">Ekskul<select value={ekskulId} onChange={(e) => setEkskulId(e.target.value)}>{ekskulList.map((ek) => <option key={ek.id} value={ek.id}>{ek.name}</option>)}</select></label>
      {jenis !== "nilai" && <label className="field">Bulan<input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} /></label>}
      <button className="primary-button filter-button" onClick={tampilkan} disabled={loading}><Search size={16} /> {loading ? "Memuat..." : "Tampilkan rekap"}</button>
    </div>
    {preview && <div className="rekap-toolbar no-print"><button className="secondary-button" onClick={cetak}><Printer size={16} /> Cetak / Download PDF</button></div>}
    {preview && <div className="report-print-area">
      <div className="kop-sekolah">{settingsData.logo_base64 ? <img src={settingsData.logo_base64} alt="Kop Surat" className="kop-sekolah-banner" /> : <div><h3>{namaSekolah}</h3><p>{alamatSekolah}</p></div>}</div>
      {preview.type === "absensi" && <>
        <div className="judul-laporan">Rekap Absensi Latihan Ekstrakurikuler</div>
        <div className="sub-laporan">Bulan {labelBulan()}</div>
        <table className="meta-table"><tbody>
          <tr><td className="meta-label">Ekstrakurikuler</td><td>: {ekskul?.name}</td></tr>
          <tr><td className="meta-label">Jumlah Peserta</td><td>: {preview.peserta.length} orang</td></tr>
          <tr><td className="meta-label">Jumlah Pertemuan</td><td>: {preview.tanggalUnik.length} kali</td></tr>
        </tbody></table>
        <table className="table-print"><thead><tr>
          <th rowSpan={2}>No</th><th rowSpan={2}>Nama Peserta</th><th rowSpan={2}>Kelas</th>
          {preview.tanggalUnik.length > 0 && <th colSpan={preview.tanggalUnik.length}>Tanggal Latihan</th>}
          <th colSpan={4}>Jumlah</th>
        </tr><tr>
          {preview.tanggalUnik.map((t) => <th key={t}>{t.slice(8, 10)}</th>)}
          <th>H</th><th>S</th><th>I</th><th>A</th>
        </tr></thead><tbody>
          {!preview.peserta.length && <tr><td colSpan={7 + preview.tanggalUnik.length} className="text-center">Belum ada peserta di ekskul ini</td></tr>}
          {preview.peserta.length > 0 && !preview.tanggalUnik.length && <tr><td colSpan={7} className="text-center">Belum ada data absensi pada bulan ini</td></tr>}
          {preview.peserta.length > 0 && preview.tanggalUnik.length > 0 && preview.peserta.map((nm, idx) => {
            const rec = preview.lookup[nm] || {};
            let cH = 0, cS = 0, cI = 0, cA = 0;
            preview.tanggalUnik.forEach((t) => { const st = rec[t]; if (st === "H") cH++; else if (st === "S") cS++; else if (st === "I") cI++; else if (st === "A") cA++; });
            return <tr key={nm}><td className="text-center">{idx + 1}</td><td>{nm}</td><td className="text-center">{kelasLookup[nm] || ""}</td>
              {preview.tanggalUnik.map((t) => <td key={t} className="text-center">{rec[t] || "-"}</td>)}
              <td className="text-center">{cH}</td><td className="text-center">{cS}</td><td className="text-center">{cI}</td><td className="text-center">{cA}</td>
            </tr>;
          })}
        </tbody></table>
      </>}
      {preview.type === "pembina" && <>
        <div className="judul-laporan">Rekap Absensi Pembina / Pelatih Ekstrakurikuler</div>
        <div className="sub-laporan">Bulan {labelBulan()}</div>
        <table className="meta-table"><tbody>
          <tr><td className="meta-label">Ekstrakurikuler</td><td>: {ekskul?.name}</td></tr>
          <tr><td className="meta-label">Jumlah Kehadiran Tercatat</td><td>: {preview.rows.length} kali</td></tr>
        </tbody></table>
        <table className="table-print"><thead><tr><th style={{ width: 30 }}>No</th><th>Tanggal</th><th style={{ width: 60 }}>Jam</th><th style={{ width: 70 }}>Status</th><th style={{ width: 70 }}>Foto</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={5} className="text-center">Belum ada data absensi pembina pada bulan ini</td></tr>}
          {preview.rows.map((r, idx) => <tr key={r.id}><td className="text-center">{idx + 1}</td><td className="text-center">{r.date}</td><td className="text-center">{r.time || "-"}</td><td className="text-center">{r.status || "Hadir"}</td><td className="text-center">{r.photo ? <img src={r.photo} alt="" style={{ width: 50, height: 50, objectFit: "cover", border: "1px solid #000" }} /> : "-"}</td></tr>)}
        </tbody></table>
      </>}
      {preview.type === "nilai" && <>
        <div className="judul-laporan">Rekap Nilai Ekstrakurikuler</div>
        <div className="sub-laporan">Ekstrakurikuler {ekskul?.name}</div>
        <table className="meta-table"><tbody>
          <tr><td className="meta-label">Ekstrakurikuler</td><td>: {ekskul?.name}</td></tr>
          <tr><td className="meta-label">Jumlah Peserta Dinilai</td><td>: {preview.rows.length} orang</td></tr>
        </tbody></table>
        <table className="table-print"><thead><tr><th style={{ width: 30 }}>No</th><th>Nama Peserta</th><th style={{ width: 55 }}>Kelas</th><th style={{ width: 90 }}>Predikat</th><th>Deskripsi</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={5} className="text-center">Belum ada nilai untuk ekskul ini</td></tr>}
          {preview.rows.map((n, idx) => <tr key={n.id}><td className="text-center">{idx + 1}</td><td>{n.student}</td><td className="text-center">{kelasLookup[n.student] || ""}</td><td className="text-center">{n.predikat}</td><td>{n.deskripsi || ""}</td></tr>)}
        </tbody></table>
      </>}
      <div className="ttd-box-top">
        <div className="ttd-kolom"><p>Koordinator Ekskul</p><div className="ttd-space"></div><p><b>{namaKoordinator}</b></p></div>
        <div className="ttd-kolom"><p>Pembina / Pelatih</p><div className="ttd-space"></div><p><b>{namaPembinaEkskul}</b></p></div>
      </div>
      <div className="ttd-kolom-bawah"><p>Mengetahui,<br/>Kepala Sekolah</p><div className="ttd-space"></div><p><b>{namaKepala}</b></p></div>
    </div>}
  </>;
}

function EkskulAdmin({ showToast }) {
  const [list, setList] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [form, setForm] = useState({ name: "", pembina_name: "", training_day: "" });
  const [editing, setEditing] = useState(null);
  const [memberPanel, setMemberPanel] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accForm, setAccForm] = useState({ name: "", username: "", password: "", ekskul_ids: [] });
  const [editingAcc, setEditingAcc] = useState(null);
  const load = () => axios.get(`${API}/ekskul`).then(({ data }) => setList(data)).catch(() => showToast("Gagal memuat data ekskul"));
  const loadAccounts = () => axios.get(`${API}/pembina-accounts`).then(({ data }) => setAccounts(data)).catch(() => showToast("Gagal memuat akun pembina"));
  useEffect(() => { load(); loadAccounts(); axios.get(`${API}/students`).then(({ data }) => setAllStudents(data)).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.name.trim() || !form.pembina_name.trim()) return showToast("Nama ekskul dan pembina wajib diisi");
    try {
      if (editing) { await axios.put(`${API}/ekskul/${editing}`, form); showToast("Data ekskul diperbarui"); }
      else { await axios.post(`${API}/ekskul`, form); showToast("Ekskul berhasil ditambahkan"); }
      setForm({ name: "", pembina_name: "", training_day: "" }); setEditing(null); load();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan ekskul")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus ekskul ini? Semua data terkait (absensi, jurnal, prestasi, nilai) juga akan terhapus.")) return;
    try { await axios.delete(`${API}/ekskul/${id}`); showToast("Ekskul dihapus"); load(); loadAccounts(); } catch { showToast("Gagal menghapus ekskul"); }
  };
  const openMembers = async (ek) => {
    setMemberPanel(ek.id);
    const { data } = await axios.get(`${API}/ekskul/${ek.id}/members`);
    setSelectedMembers(data.map((s) => s.id));
  };
  const saveMembers = async () => {
    try { await axios.put(`${API}/ekskul/${memberPanel}/members`, { student_ids: selectedMembers }); showToast("Anggota ekskul diperbarui"); setMemberPanel(null); load(); }
    catch { showToast("Gagal menyimpan anggota"); }
  };
  const toggleMember = (id) => setSelectedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAccEkskul = (id) => setAccForm((prev) => ({ ...prev, ekskul_ids: prev.ekskul_ids.includes(id) ? prev.ekskul_ids.filter((x) => x !== id) : [...prev.ekskul_ids, id] }));
  const submitAccount = async () => {
    if (!accForm.name.trim()) return showToast("Nama pembina wajib diisi");
    try {
      if (editingAcc) {
        await axios.put(`${API}/pembina-accounts/${editingAcc}`, { name: accForm.name, ekskul_ids: accForm.ekskul_ids });
        if (accForm.password) await axios.put(`${API}/pembina-accounts/${editingAcc}/password`, { password: accForm.password });
        showToast("Akun pembina diperbarui");
      } else {
        if (!accForm.username.trim() || accForm.password.length < 6) return showToast("Username & password (min 6 karakter) wajib diisi");
        await axios.post(`${API}/pembina-accounts`, accForm);
        showToast("Akun pembina berhasil dibuat");
      }
      setAccForm({ name: "", username: "", password: "", ekskul_ids: [] }); setEditingAcc(null); loadAccounts();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan akun pembina")); }
  };
  const editAccount = (acc) => { setEditingAcc(acc.id); setAccForm({ name: acc.name, username: acc.username, password: "", ekskul_ids: acc.ekskul_ids || [] }); };
  const removeAccount = async (id) => {
    if (!window.confirm("Hapus akun pembina ini?")) return;
    try { await axios.delete(`${API}/pembina-accounts/${id}`); showToast("Akun pembina dihapus"); loadAccounts(); } catch { showToast("Gagal menghapus akun"); }
  };
  return <><PageTitle eyebrow="Administrasi" title="Kelola Ekskul" description="Kelola daftar ekskul, anggota, dan akun login pembina." /><section className="panel filter-grid" style={{ marginBottom: 18 }}><label className="field">Nama ekskul<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Pramuka" /></label><label className="field">Nama pembina<input value={form.pembina_name} onChange={(e) => setForm({ ...form, pembina_name: e.target.value })} placeholder="Nama pelatih/pembina" /></label><label className="field">Hari latihan<input value={form.training_day} onChange={(e) => setForm({ ...form, training_day: e.target.value })} placeholder="Contoh: Sabtu" /></label><button className="primary-button filter-button" onClick={submit}><Save size={16} /> {editing ? "Simpan perubahan" : "Tambah ekskul"}</button>{editing && <button className="secondary-button" onClick={() => { setEditing(null); setForm({ name: "", pembina_name: "", training_day: "" }); }}><X size={16} /> Batal edit</button>}</section><section className="panel schedule-table">{list.map((ek) => <div className="timeline-item" key={ek.id}><div className="lesson"><div><strong>{ek.name}</strong><span>Pembina: {ek.pembina_name}{ek.training_day ? ` · Latihan: ${ek.training_day}` : ""} · {ek.member_ids?.length || 0} anggota</span></div><div style={{ display: "flex", gap: 8 }}><button className="icon-button" title="Kelola anggota" onClick={() => openMembers(ek)}><Users size={16} /></button><button className="icon-button" title="Edit" onClick={() => { setEditing(ek.id); setForm({ name: ek.name, pembina_name: ek.pembina_name, training_day: ek.training_day || "" }); }}><Pencil size={16} /></button><button className="icon-button" title="Hapus" onClick={() => remove(ek.id)}><Trash2 size={16} /></button></div></div></div>)}{!list.length && <p className="muted">Belum ada ekskul terdaftar.</p>}</section>{memberPanel && <div className="panel" style={{ marginTop: 18 }}><PanelHeading title="Kelola anggota ekskul" subtitle={`${selectedMembers.length} siswa dipilih`} action={<button className="icon-button" onClick={() => setMemberPanel(null)}><X size={16} /></button>} /><label className="field full" style={{ marginBottom: 10 }}>Cari nama siswa<input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Ketik nama siswa..." /></label><div className="table-wrap"><table><thead><tr><th></th><th>Nama siswa</th><th>Kelas</th></tr></thead><tbody>{allStudents.filter((s) => s.name.toLowerCase().includes(memberSearch.toLowerCase())).map((s) => <tr key={s.id}><td><input type="checkbox" checked={selectedMembers.includes(s.id)} onChange={() => toggleMember(s.id)} /></td><td>{s.name}</td><td>{s.class_name}</td></tr>)}</tbody></table></div><button className="primary-button" style={{ marginTop: 12 }} onClick={saveMembers}><Save size={16} /> Simpan anggota</button></div>}<section className="panel" style={{ marginTop: 24 }}><PanelHeading title="Akun login pembina" subtitle="Satu akun bisa membina lebih dari satu ekskul sekaligus" action={<UserCog size={18} />} /><div className="filter-grid"><label className="field">Nama pembina<input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} placeholder="Nama pelatih/pembina" /></label><label className="field">Username{editingAcc && <span style={{ fontWeight: 400, opacity: 0.7 }}> (tidak bisa diubah)</span>}<input value={accForm.username} disabled={!!editingAcc} onChange={(e) => setAccForm({ ...accForm, username: e.target.value })} placeholder="username login" /></label><label className="field">{editingAcc ? "Password baru (opsional)" : "Password"}<input type="password" value={accForm.password} onChange={(e) => setAccForm({ ...accForm, password: e.target.value })} placeholder={editingAcc ? "Kosongkan jika tidak diganti" : "min 6 karakter"} /></label></div><div style={{ marginTop: 10 }}><span style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Pilih ekskul yang dibina:</span><div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{list.map((ek) => <label key={ek.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={accForm.ekskul_ids.includes(ek.id)} onChange={() => toggleAccEkskul(ek.id)} /> {ek.name}</label>)}</div></div><div style={{ marginTop: 12, display: "flex", gap: 8 }}><button className="primary-button" onClick={submitAccount}><Save size={16} /> {editingAcc ? "Simpan perubahan akun" : "Buat akun pembina"}</button>{editingAcc && <button className="secondary-button" onClick={() => { setEditingAcc(null); setAccForm({ name: "", username: "", password: "", ekskul_ids: [] }); }}><X size={16} /> Batal</button>}</div><div className="table-wrap" style={{ marginTop: 16 }}><table><thead><tr><th>Nama</th><th>Username</th><th>Ekskul dibina</th><th></th></tr></thead><tbody>{accounts.map((acc) => <tr key={acc.id}><td>{acc.name}</td><td>{acc.username}</td><td>{(acc.ekskul_ids || []).map((id) => list.find((l) => l.id === id)?.name).filter(Boolean).join(", ") || "-"}</td><td><div style={{ display: "flex", gap: 6 }}><button className="icon-button" title="Edit" onClick={() => editAccount(acc)}><Pencil size={16} /></button><button className="icon-button" title="Hapus" onClick={() => removeAccount(acc.id)}><Trash2 size={16} /></button></div></td></tr>)}{!accounts.length && <tr><td colSpan="4">Belum ada akun pembina.</td></tr>}</tbody></table></div></section></>;
}

const PEMBINA_NAV = [
  { id: "absen-peserta", label: "Absen Peserta", icon: CheckSquare },
  { id: "absen-diri", label: "Absen Diri", icon: Camera },
  { id: "jurnal", label: "Jurnal Ekskul", icon: BookMarked },
  { id: "prestasi", label: "Prestasi", icon: Award },
  { id: "nilai", label: "Nilai Ekskul", icon: Star },
  { id: "rekap", label: "Rekap", icon: BarChart3 },
];

function MobileShell({ subtitle, roleLabel, user, navItems, active, onNavClick, onLogout, toast, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleNav = (id) => { onNavClick(id); setMobileOpen(false); };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}><div className="brand"><img className="brand-logo" src="/logo-smp.png" alt="Logo SMP PGRI Gandoang" /><div><strong>SMP PGRI Gandoang</strong><span>{subtitle}</span></div></div><div className="profile"><div className="avatar">{initials(user.name)}</div><div><strong>{user.name}</strong><span>{roleLabel}</span></div><ShieldCheck size={16} className="profile-check" /></div><nav className="nav-list" aria-label="Navigasi utama"><div className="nav-caption">Workspace</div>{navItems.map((item) => <NavItem key={item.id} item={item} active={active} onClick={handleNav} />)}</nav><div className="sidebar-bottom"><button className="logout-button" onClick={onLogout}><LogOut size={16} /> Keluar</button></div></aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />}
    <main className="main-content"><header className="topbar"><button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={20} /></button><div className="crumb"><span>SMP PGRI Gandoang</span><ArrowRight size={14} /><strong>{navItems.find((n) => n.id === active)?.label || ""}</strong></div><div className="top-actions"><div className="mini-avatar">{initials(user.name)}</div></div></header><div className="page-wrap">{children}</div></main>
    {toast && <div className="toast" data-testid="success-toast"><Check size={16} /> {toast}</div>}
  </div>;
}

function PembinaApp({ user, showToast, toast, onLogout }) {
  const [active, setActive] = useState("absen-peserta");
  return <MobileShell subtitle="Pembina Ekskul" roleLabel="Pembina Ekskul" user={user} navItems={PEMBINA_NAV} active={active} onNavClick={setActive} onLogout={onLogout} toast={toast}>
    {active === "absen-peserta" && <EkskulAttendance showToast={showToast} />}
    {active === "absen-diri" && <EkskulAbsenDiri showToast={showToast} />}
    {active === "jurnal" && <EkskulJurnal showToast={showToast} />}
    {active === "prestasi" && <EkskulPrestasi showToast={showToast} />}
    {active === "nilai" && <EkskulNilai showToast={showToast} />}
    {active === "rekap" && <EkskulRekap showToast={showToast} />}
  </MobileShell>;
}

function KelasManager({ rows, showToast, onReload }) {
  const [form, setForm] = useState({ name: "", shift: "Pagi" });
  const [editing, setEditing] = useState(null);
  const submit = async () => {
    if (!form.name.trim()) return showToast("Nama kelas wajib diisi");
    try {
      if (editing) await axios.put(`${API}/classes/${editing}`, form);
      else await axios.post(`${API}/classes`, form);
      showToast(editing ? "Data kelas diperbarui" : "Kelas baru ditambahkan");
      setForm({ name: "", shift: "Pagi" }); setEditing(null); onReload();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan kelas")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus kelas ini?")) return;
    try { await axios.delete(`${API}/classes/${id}`); showToast("Data kelas dihapus"); onReload(); } catch { showToast("Gagal menghapus kelas"); }
  };
  return <><PageTitle eyebrow="Administrasi" title="Kelola Kelas" description="Kelas beserta shift-nya dipakai untuk jadwal absensi guru piket." /><section className="panel filter-grid" style={{ marginBottom: 18 }}><label className="field">Nama kelas<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: 7A" /></label><label className="field">Shift<select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}><option value="Pagi">Pagi</option><option value="Siang">Siang</option></select></label><button className="primary-button filter-button" onClick={submit}><Save size={16} /> {editing ? "Simpan perubahan" : "Tambah kelas"}</button>{editing && <button className="secondary-button" onClick={() => { setEditing(null); setForm({ name: "", shift: "Pagi" }); }}><X size={16} /> Batal</button>}</section><section className="panel schedule-table">{(rows || []).map((c) => <div className="timeline-item" key={c.id}><div className="lesson"><div><strong>{c.name}</strong><span>Shift {c.shift || "Pagi"}</span></div><div style={{ display: "flex", gap: 8 }}><button className="icon-button" title="Edit" onClick={() => { setEditing(c.id); setForm({ name: c.name, shift: c.shift || "Pagi" }); }}><Pencil size={16} /></button><button className="icon-button" title="Hapus" onClick={() => remove(c.id)}><Trash2 size={16} /></button></div></div></div>)}{!(rows || []).length && <p className="muted">Belum ada kelas terdaftar.</p>}</section></>;
}

function GuruPiketAdmin({ showToast }) {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const load = () => axios.get(`${API}/guru-piket`).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat data guru piket"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!name.trim()) return showToast("Nama wajib diisi");
    try { await axios.post(`${API}/guru-piket`, { name }); showToast("Guru piket ditambahkan"); setName(""); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menambah guru piket")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus guru piket ini?")) return;
    try { await axios.delete(`${API}/guru-piket/${id}`); showToast("Data dihapus"); load(); } catch { showToast("Gagal menghapus data"); }
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await axios.post(`${API}/guru-piket/import`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      showToast(`${data.imported} guru piket diimpor, ${data.skipped} dilewati (sudah ada)`);
      load();
    } catch (err) { showToast(errMsg(err, "Gagal impor file")); }
    e.target.value = "";
  };
  return <><PageTitle eyebrow="Administrasi" title="Data Guru Piket" description="Daftar guru yang bisa ditugaskan piket, terpisah dari beban mengajar." /><section className="panel filter-grid" style={{ marginBottom: 18 }}><label className="field full">Nama guru piket<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama guru" /></label><button className="primary-button filter-button" onClick={submit}><Save size={16} /> Tambah</button><label className="secondary-button filter-button" style={{ cursor: "pointer" }}><FileDown size={16} /> Impor Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: "none" }} /></label></section><section className="panel schedule-table">{rows.map((g) => <div className="timeline-item" key={g.id}><div className="lesson"><div><strong>{g.name}</strong></div><button className="icon-button" onClick={() => remove(g.id)}><Trash2 size={16} /></button></div></div>)}{!rows.length && <p className="muted">Belum ada guru piket terdaftar.</p>}</section></>;
}

function BebanMengajarAdmin({ showToast, classes, subjects }) {
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ teacher: "", day: "Senin", class_name: "", subject: "", jam_awal: 1, jam_akhir: 1 });
  const load = () => axios.get(`${API}/beban-mengajar`).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat beban mengajar"));
  useEffect(() => { load(); axios.get(`${API}/masters`).then(({ data }) => setTeachers(data.teachers || [])).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.teacher || !form.class_name || !form.subject) return showToast("Guru, kelas, dan mapel wajib diisi");
    try { await axios.post(`${API}/beban-mengajar`, { ...form, jam_awal: Number(form.jam_awal), jam_akhir: Number(form.jam_akhir) }); showToast("Beban mengajar disimpan"); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan beban mengajar")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus beban mengajar ini?")) return;
    try { await axios.delete(`${API}/beban-mengajar/${id}`); showToast("Data dihapus"); load(); } catch { showToast("Gagal menghapus data"); }
  };
  return <><PageTitle eyebrow="Administrasi" title="Beban Mengajar" description="Diisi sekali di awal semester. Piket tinggal absen tanpa isi ulang." /><section className="panel" style={{ marginBottom: 18 }}><div className="form-grid"><label className="field">Guru<select value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}><option value="">- Pilih guru -</option>{teachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</select></label><label className="field">Hari<select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>{["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => <option key={d} value={d}>{d}</option>)}</select></label><label className="field">Kelas<select value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })}><option value="">- Pilih kelas -</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></label><label className="field">Mata pelajaran<select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}><option value="">- Pilih mapel -</option>{subjects.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label className="field">Jam ke (awal)<input type="number" min="1" max="20" value={form.jam_awal} onChange={(e) => setForm({ ...form, jam_awal: e.target.value })} /></label><label className="field">Jam ke (akhir)<input type="number" min="1" max="20" value={form.jam_akhir} onChange={(e) => setForm({ ...form, jam_akhir: e.target.value })} /></label></div><button className="primary-button" style={{ marginTop: 12 }} onClick={submit}><Save size={16} /> Simpan beban mengajar</button></section><section className="panel"><div className="table-wrap"><table><thead><tr><th>Guru</th><th>Hari</th><th>Kelas</th><th>Mapel</th><th>Jam ke</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.teacher}</td><td>{r.day}</td><td>{r.class_name}</td><td>{r.subject}</td><td>{r.jam_awal === r.jam_akhir ? r.jam_awal : `${r.jam_awal}-${r.jam_akhir}`}</td><td><button className="icon-button" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}{!rows.length && <tr><td colSpan="6">Belum ada data beban mengajar.</td></tr>}</tbody></table></div></section></>;
}

function PiketAccountsAdmin({ showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", shift: "Pagi" });
  const [editing, setEditing] = useState(null);
  const load = () => axios.get(`${API}/piket-accounts`).then(({ data }) => setAccounts(data)).catch(() => showToast("Gagal memuat akun piket"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.name.trim()) return showToast("Nama wajib diisi");
    try {
      if (editing) {
        await axios.put(`${API}/piket-accounts/${editing}`, { name: form.name, shift: form.shift });
        if (form.password) await axios.put(`${API}/piket-accounts/${editing}/password`, { password: form.password });
        showToast("Akun piket diperbarui");
      } else {
        if (!form.username.trim() || form.password.length < 6) return showToast("Username & password (min 6 karakter) wajib diisi");
        await axios.post(`${API}/piket-accounts`, form);
        showToast("Akun piket berhasil dibuat");
      }
      setForm({ name: "", username: "", password: "", shift: "Pagi" }); setEditing(null); load();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan akun piket")); }
  };
  const editAcc = (a) => { setEditing(a.id); setForm({ name: a.name, username: a.username, password: "", shift: a.shift }); };
  const remove = async (id) => {
    if (!window.confirm("Hapus akun piket ini?")) return;
    try { await axios.delete(`${API}/piket-accounts/${id}`); showToast("Akun piket dihapus"); load(); } catch { showToast("Gagal menghapus akun"); }
  };
  return <><PageTitle eyebrow="Administrasi" title="Kelola Akun Piket" description="Akun bersama untuk shift Pagi/Siang." /><section className="panel filter-grid" style={{ marginBottom: 18 }}><label className="field">Nama akun (label)<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Piket Pagi" /></label><label className="field">Username{editing && <span style={{ fontWeight: 400, opacity: 0.7 }}> (tidak bisa diubah)</span>}<input value={form.username} disabled={!!editing} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username login" /></label><label className="field">{editing ? "Password baru (opsional)" : "Password"}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Kosongkan jika tidak diganti" : "min 6 karakter"} /></label><label className="field">Shift<select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}><option value="Pagi">Pagi</option><option value="Siang">Siang</option></select></label><button className="primary-button filter-button" onClick={submit}><Save size={16} /> {editing ? "Simpan perubahan" : "Buat akun"}</button>{editing && <button className="secondary-button" onClick={() => { setEditing(null); setForm({ name: "", username: "", password: "", shift: "Pagi" }); }}><X size={16} /> Batal</button>}</section><section className="panel"><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Shift</th><th></th></tr></thead><tbody>{accounts.map((a) => <tr key={a.id}><td>{a.name}</td><td>{a.username}</td><td>{a.shift}</td><td><div style={{ display: "flex", gap: 6 }}><button className="icon-button" onClick={() => editAcc(a)}><Pencil size={16} /></button><button className="icon-button" onClick={() => remove(a.id)}><Trash2 size={16} /></button></div></td></tr>)}{!accounts.length && <tr><td colSpan="4">Belum ada akun piket.</td></tr>}</tbody></table></div></section></>;
}

function PiketAbsensi({ showToast, shift }) {
  const [date, setDate] = useState(today());
  const [schedule, setSchedule] = useState({ entries: [], piket_guru: [], upacara: null, duha: null, murotal: null, penyambut: null });
  const [guruPiketList, setGuruPiketList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyDate, setHistoryDate] = useState(today());
  const DAY_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const hari = DAY_ID[new Date(date + "T00:00:00").getDay()];
  useEffect(() => {
    axios.get(`${API}/guru-piket`).then(({ data }) => setGuruPiketList(data)).catch(() => {});
    axios.get(`${API}/masters`).then(({ data }) => setTeachersList(data.teachers || [])).catch(() => {});
  }, []);
  const loadSchedule = () => { axios.get(`${API}/piket/schedule`, { params: { date, shift } }).then(({ data }) => setSchedule(data)).catch(() => showToast("Gagal memuat jadwal")); };
  useEffect(() => { loadSchedule(); }, [date, shift]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadHistory = () => { axios.get(`${API}/piket-attendance/history`, { params: { date_from: historyDate, date_to: historyDate } }).then(({ data }) => setHistory(data)).catch(() => {}); };
  useEffect(() => { loadHistory(); }, [historyDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleJam = (idx, jam) => setSchedule((prev) => { const entries = [...prev.entries]; const e = { ...entries[idx] }; e.jam_hadir = e.jam_hadir.includes(jam) ? e.jam_hadir.filter((j) => j !== jam) : [...e.jam_hadir, jam].sort((a, b) => a - b); entries[idx] = e; return { ...prev, entries }; });
  const setEntryStatus = (idx, status) => setSchedule((prev) => { const entries = [...prev.entries]; entries[idx] = { ...entries[idx], status }; return { ...prev, entries }; });
  const togglePiketGuru = (name) => setSchedule((prev) => ({ ...prev, piket_guru: prev.piket_guru.includes(name) ? prev.piket_guru.filter((n) => n !== name) : [...prev.piket_guru, name] }));
  const isSenin = hari === "Senin", isKamis = hari === "Kamis", isJumat = hari === "Jumat";
  const showUpacara = isSenin && shift === "Pagi";
  const showDuha = isKamis && shift === "Pagi";
  const showMurotal = isJumat && shift === "Pagi";
  const showPenyambut = shift === "Pagi";
  const ensureActivity = (key) => schedule[key] || { petugas: "", peserta: [], jam: 1 };
  const setActivity = (key, patch) => setSchedule((prev) => ({ ...prev, [key]: { ...ensureActivity(key), ...patch } }));
  const toggleActivityPeserta = (key, name) => { const act = ensureActivity(key); const peserta = act.peserta.includes(name) ? act.peserta.filter((n) => n !== name) : [...act.peserta, name]; setActivity(key, { peserta }); };
  const save = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/piket-attendance`, { date, shift, entries: schedule.entries, piket_guru: schedule.piket_guru, upacara: showUpacara ? ensureActivity("upacara") : null, duha: showDuha ? ensureActivity("duha") : null, murotal: showMurotal ? ensureActivity("murotal") : null, penyambut: showPenyambut ? ensureActivity("penyambut") : null });
      showToast("Absensi & jam mengajar tersimpan");
      loadHistory();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan absensi")); } finally { setSaving(false); }
  };
  const removeEntry = async (e) => {
    if (!window.confirm("Hapus entri absensi guru ini?")) return;
    try { await axios.delete(`${API}/piket-attendance/entry`, { params: { date: historyDate, shift, teacher: e.teacher, class_name: e.class_name, subject: e.subject, jam_awal: e.jam_awal, jam_akhir: e.jam_akhir } }); showToast("Entri dihapus"); loadHistory(); } catch { showToast("Gagal menghapus entri"); }
  };
  return <>
    <PageTitle eyebrow="Piket" title="Absensi & Jam Mengajar" description={`Shift ${shift} \u00b7 otomatis dari jadwal beban mengajar.`} />
    <div className="filter-grid panel">
      <label className="field">Tanggal<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="field">Hari<input value={hari} disabled /></label>
      <label className="field">Shift<input value={shift} disabled /></label>
    </div>
    <section className="panel roster-panel">
      <PanelHeading title="Jadwal mengajar hari ini" subtitle={`${schedule.entries.length} slot mengajar`} />
      <div className="table-wrap"><table><thead><tr><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Jam ke (centang yang diajar)</th><th>Status</th></tr></thead><tbody>
        {schedule.entries.map((e, idx) => {
          const jamList = Array.from({ length: e.jam_akhir - e.jam_awal + 1 }, (_, i) => e.jam_awal + i);
          return <tr key={idx}><td>{e.teacher}</td><td>{e.class_name}</td><td>{e.subject}</td>
            <td><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{jamList.map((j) => <label key={j} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}><input type="checkbox" checked={e.jam_hadir.includes(j)} onChange={() => toggleJam(idx, j)} />{j}</label>)}</div></td>
            <td><select value={e.status} onChange={(ev) => setEntryStatus(idx, ev.target.value)} disabled={e.jam_hadir.length > 0}><option value="">Hadir</option><option value="Sakit">Sakit</option><option value="Izin">Izin</option><option value="Alpa">Alpa</option></select></td>
          </tr>;
        })}
        {!schedule.entries.length && <tr><td colSpan="5">Tidak ada jadwal mengajar untuk tanggal & shift ini.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel" style={{ marginTop: 16 }}>
      <PanelHeading title="Guru Piket Bertugas" subtitle="Dihitung sebagai jumlah kali piket, bukan jam berdiri" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{guruPiketList.map((g) => <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={schedule.piket_guru.includes(g.name)} onChange={() => togglePiketGuru(g.name)} /> {g.name}</label>)}{!guruPiketList.length && <p className="muted">Belum ada data guru piket. Tambahkan dulu di menu Admin &gt; Guru Piket.</p>}</div>
    </section>
    {showUpacara && <section className="panel" style={{ marginTop: 16 }}>
      <PanelHeading title="Upacara (Khusus Senin Pagi)" />
      <label className="field">Pembina upacara<select value={ensureActivity("upacara").petugas} onChange={(e) => setActivity("upacara", { petugas: e.target.value })}><option value="">- Pilih guru -</option>{teachersList.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</select></label>
      <div style={{ marginTop: 10 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Petugas upacara lainnya</span><div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>{teachersList.map((t) => <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={ensureActivity("upacara").peserta.includes(t.name)} onChange={() => toggleActivityPeserta("upacara", t.name)} /> {t.name}</label>)}</div></div>
      <label className="field" style={{ marginTop: 10, maxWidth: 200 }}>Jam dihitung<input type="number" min="1" value={ensureActivity("upacara").jam} onChange={(e) => setActivity("upacara", { jam: Number(e.target.value) })} /></label>
    </section>}
    {showDuha && <section className="panel" style={{ marginTop: 16 }}>
      <PanelHeading title="Shalat Duha (Khusus Kamis Pagi)" />
      <label className="field full">Imam shalat duha<input value={ensureActivity("duha").petugas} onChange={(e) => setActivity("duha", { petugas: e.target.value })} placeholder="Nama imam" /></label>
      <div style={{ marginTop: 10 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Peserta</span><div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>{teachersList.map((t) => <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={ensureActivity("duha").peserta.includes(t.name)} onChange={() => toggleActivityPeserta("duha", t.name)} /> {t.name}</label>)}</div></div>
      <label className="field" style={{ marginTop: 10, maxWidth: 200 }}>Jam dihitung<input type="number" min="1" value={ensureActivity("duha").jam} onChange={(e) => setActivity("duha", { jam: Number(e.target.value) })} /></label>
    </section>}
    {showMurotal && <section className="panel" style={{ marginTop: 16 }}>
      <PanelHeading title="Tadarus / Murotal (Khusus Jumat Pagi)" />
      <label className="field full">Petugas pemimpin murotal<input value={ensureActivity("murotal").petugas} onChange={(e) => setActivity("murotal", { petugas: e.target.value })} placeholder="Nama petugas" /></label>
      <div style={{ marginTop: 10 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Pendamping</span><div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>{teachersList.map((t) => <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={ensureActivity("murotal").peserta.includes(t.name)} onChange={() => toggleActivityPeserta("murotal", t.name)} /> {t.name}</label>)}</div></div>
      <label className="field" style={{ marginTop: 10, maxWidth: 200 }}>Jam dihitung<input type="number" min="1" value={ensureActivity("murotal").jam} onChange={(e) => setActivity("murotal", { jam: Number(e.target.value) })} /></label>
    </section>}
    {showPenyambut && <section className="panel" style={{ marginTop: 16 }}>
      <PanelHeading title="Guru Penyambut Siswa (Khusus Piket Pagi)" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{teachersList.map((t) => <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={ensureActivity("penyambut").peserta.includes(t.name)} onChange={() => toggleActivityPeserta("penyambut", t.name)} /> {t.name}</label>)}</div>
      <label className="field" style={{ marginTop: 10, maxWidth: 200 }}>Jam dihitung<input type="number" min="1" value={ensureActivity("penyambut").jam} onChange={(e) => setActivity("penyambut", { jam: Number(e.target.value) })} /></label>
    </section>}
    <div style={{ marginTop: 16 }}><button className="primary-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Menyimpan..." : "Simpan semua"}</button></div>
    <section className="panel" style={{ marginTop: 24 }}>
      <PanelHeading title="Riwayat tersimpan" subtitle={historyDate} action={<input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} />} />
      <div className="table-wrap"><table><thead><tr><th>Shift</th><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Jam aktual</th><th>Status</th><th></th></tr></thead><tbody>
        {history.flatMap((h) => h.entries.map((e, i) => <tr key={h.id + i}><td>{h.shift}</td><td>{e.teacher}</td><td>{e.class_name}</td><td>{e.subject}</td><td>{e.jam_hadir.join(", ") || "-"}</td><td>{e.status || "Hadir"}</td><td><button className="icon-button" onClick={() => removeEntry(e)}><Trash2 size={16} /></button></td></tr>))}
        {!history.some((h) => h.entries.length) && <tr><td colSpan="7">Belum ada data tersimpan.</td></tr>}
      </tbody></table></div>
    </section>
  </>;
}

function IzinSiswaPage({ showToast }) {
  const [form, setForm] = useState({ date: today(), student: "", class_name: "", jenis: "Izin Keluar", jam: "", keterangan: "" });
  const [rows, setRows] = useState([]);
  const [rangeFrom, setRangeFrom] = useState(today());
  const [rangeTo, setRangeTo] = useState(today());
  const load = () => axios.get(`${API}/izin-siswa`, { params: { date_from: rangeFrom, date_to: rangeTo } }).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat data izin"));
  useEffect(() => { load(); }, [rangeFrom, rangeTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.student.trim()) return showToast("Nama siswa wajib diisi");
    try { await axios.post(`${API}/izin-siswa`, form); showToast("Izin siswa tersimpan"); setForm({ date: today(), student: "", class_name: "", jenis: "Izin Keluar", jam: "", keterangan: "" }); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan izin")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus data izin ini?")) return;
    try { await axios.delete(`${API}/izin-siswa/${id}`); showToast("Data dihapus"); load(); } catch { showToast("Gagal menghapus data"); }
  };
  return <><PageTitle eyebrow="Piket" title="Izin Siswa" description="Catat siswa yang izin keluar, sakit, atau terlambat." /><section className="panel" style={{ marginBottom: 18 }}><div className="form-grid"><label className="field">Tanggal<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="field">Nama siswa<input value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} /></label><label className="field">Kelas<input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="Contoh: 8B" /></label><label className="field">Jenis<select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}><option>Izin Keluar</option><option>Sakit</option><option>Terlambat</option></select></label><label className="field">Jam<input value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} placeholder="Contoh: Jam ke-3" /></label><label className="field full">Keterangan<input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></label></div><button className="primary-button" style={{ marginTop: 12 }} onClick={submit}><Save size={16} /> Simpan</button></section><section className="panel"><PanelHeading title="Riwayat izin siswa" subtitle={`${rows.length} catatan`} action={<div style={{ display: "flex", gap: 8 }}><input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /><input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></div>} /><div className="table-wrap"><table><thead><tr><th>Tgl</th><th>Nama</th><th>Kelas</th><th>Jenis</th><th>Jam</th><th>Keterangan</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.student}</td><td>{r.class_name}</td><td>{r.jenis}</td><td>{r.jam}</td><td>{r.keterangan}</td><td><button className="icon-button" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}{!rows.length && <tr><td colSpan="7">Belum ada data izin siswa.</td></tr>}</tbody></table></div></section></>;
}

function PelanggaranSiswaPage({ showToast }) {
  const [form, setForm] = useState({ date: today(), student: "", class_name: "", jenis: "", keterangan: "", tindakan: "" });
  const [rows, setRows] = useState([]);
  const [rangeFrom, setRangeFrom] = useState(today());
  const [rangeTo, setRangeTo] = useState(today());
  const load = () => axios.get(`${API}/pelanggaran-siswa`, { params: { date_from: rangeFrom, date_to: rangeTo } }).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat data pelanggaran"));
  useEffect(() => { load(); }, [rangeFrom, rangeTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.student.trim() || !form.jenis.trim()) return showToast("Nama siswa dan jenis pelanggaran wajib diisi");
    try { await axios.post(`${API}/pelanggaran-siswa`, form); showToast("Pelanggaran tersimpan"); setForm({ date: today(), student: "", class_name: "", jenis: "", keterangan: "", tindakan: "" }); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan pelanggaran")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus data pelanggaran ini?")) return;
    try { await axios.delete(`${API}/pelanggaran-siswa/${id}`); showToast("Data dihapus"); load(); } catch { showToast("Gagal menghapus data"); }
  };
  return <><PageTitle eyebrow="Piket" title="Pelanggaran Siswa" description="Catat pelanggaran tata tertib siswa." /><section className="panel" style={{ marginBottom: 18 }}><div className="form-grid"><label className="field">Tanggal<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="field">Nama siswa<input value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} /></label><label className="field">Kelas<input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="Contoh: 9C" /></label><label className="field">Jenis pelanggaran<input value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} placeholder="Contoh: Tidak berseragam lengkap" /></label><label className="field full">Keterangan<input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></label><label className="field full">Tindakan<input value={form.tindakan} onChange={(e) => setForm({ ...form, tindakan: e.target.value })} placeholder="Contoh: Peringatan lisan" /></label></div><button className="primary-button" style={{ marginTop: 12 }} onClick={submit}><Save size={16} /> Simpan</button></section><section className="panel"><PanelHeading title="Riwayat pelanggaran siswa" subtitle={`${rows.length} catatan`} action={<div style={{ display: "flex", gap: 8 }}><input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /><input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></div>} /><div className="table-wrap"><table><thead><tr><th>Tgl</th><th>Nama</th><th>Kelas</th><th>Pelanggaran</th><th>Tindakan</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.student}</td><td>{r.class_name}</td><td>{r.jenis}</td><td>{r.tindakan}</td><td><button className="icon-button" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}{!rows.length && <tr><td colSpan="6">Belum ada data pelanggaran.</td></tr>}</tbody></table></div></section></>;
}

function JurnalPiketPage({ showToast, shift }) {
  const [form, setForm] = useState({ date: today(), catatan: "" });
  const [rows, setRows] = useState([]);
  const load = () => axios.get(`${API}/jurnal-piket`).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat jurnal piket"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.catatan.trim()) return showToast("Catatan wajib diisi");
    try { await axios.post(`${API}/jurnal-piket`, { ...form, shift }); showToast("Jurnal piket tersimpan"); setForm({ date: today(), catatan: "" }); load(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan jurnal")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus jurnal ini?")) return;
    try { await axios.delete(`${API}/jurnal-piket/${id}`); showToast("Jurnal dihapus"); load(); } catch { showToast("Gagal menghapus jurnal"); }
  };
  return <><PageTitle eyebrow="Piket" title="Jurnal Piket" description={`Catatan kejadian selama piket shift ${shift}.`} /><section className="panel" style={{ marginBottom: 18 }}><label className="field">Tanggal<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="field full" style={{ marginTop: 10 }}>Catatan kejadian<textarea rows="4" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan penting selama piket hari ini" /></label><button className="primary-button" style={{ marginTop: 12 }} onClick={submit}><Save size={16} /> Simpan jurnal</button></section><section className="panel"><PanelHeading title="Riwayat jurnal piket" subtitle={`${rows.length} catatan`} /><div className="table-wrap"><table><thead><tr><th>Tgl</th><th>Shift</th><th>Piket</th><th>Catatan</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.shift}</td><td>{r.recorded_by}</td><td>{r.catatan}</td><td><button className="icon-button" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}{!rows.length && <tr><td colSpan="5">Belum ada jurnal piket.</td></tr>}</tbody></table></div></section></>;
}

function PiketRekap({ showToast }) {
  const [jenis, setJenis] = useState("jammengajar");
  const [teachers, setTeachers] = useState([]);
  const [guru, setGuru] = useState("");
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [bulan, setBulan] = useState(today().slice(0, 7));
  const [settingsData, setSettingsData] = useState({});
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { axios.get(`${API}/settings`).then(({ data }) => setSettingsData(data)).catch(() => {}); axios.get(`${API}/masters`).then(({ data }) => setTeachers(data.teachers || [])).catch(() => {}); }, []);
  const tampilkan = async () => {
    setLoading(true);
    try {
      if (jenis === "jammengajar") {
        if (!guru) { showToast("Pilih guru terlebih dahulu"); setLoading(false); return; }
        const { data } = await axios.get(`${API}/piket-attendance/history`, { params: { date_from: dateFrom, date_to: dateTo } });
        const rows = [];
        data.forEach((h) => h.entries.filter((e) => e.teacher === guru).forEach((e) => rows.push({ date: h.date, class_name: e.class_name, subject: e.subject, jam: e.jam_hadir.length, status: e.status || "Hadir" })));
        rows.sort((a, b) => a.date.localeCompare(b.date));
        setPreview({ type: "jammengajar", rows, total: rows.reduce((s, r) => s + r.jam, 0) });
      } else if (jenis === "bulanansemua") {
        const { data } = await axios.get(`${API}/piket-attendance/history`, { params: { date_from: `${bulan}-01`, date_to: `${bulan}-31` } });
        const perGuru = {};
        data.forEach((h) => h.entries.forEach((e) => { perGuru[e.teacher] = perGuru[e.teacher] || {}; const week = Math.ceil(parseInt(h.date.slice(8, 10), 10) / 7); perGuru[e.teacher][week] = (perGuru[e.teacher][week] || 0) + e.jam_hadir.length; }));
        setPreview({ type: "bulanansemua", perGuru, weeks: [1, 2, 3, 4, 5] });
      } else if (jenis === "piket") {
        const { data } = await axios.get(`${API}/piket-attendance/history`, { params: { date_from: dateFrom, date_to: dateTo } });
        const count = {};
        data.forEach((h) => (h.piket_guru || []).forEach((n) => { count[n] = (count[n] || 0) + 1; }));
        setPreview({ type: "piket", count });
      } else if (jenis === "kehadiranguru") {
        const { data } = await axios.get(`${API}/piket-attendance/history`, { params: { date_from: dateFrom, date_to: dateFrom } });
        const rows = [];
        data.forEach((h) => h.entries.forEach((e) => rows.push({ shift: h.shift, teacher: e.teacher, class_name: e.class_name, subject: e.subject, jam: e.jam_hadir.join(", ") || "-", status: e.status || "Hadir" })));
        setPreview({ type: "kehadiranguru", rows });
      } else if (jenis === "pembiasaan") {
        const { data } = await axios.get(`${API}/piket-attendance/history`, { params: { date_from: dateFrom, date_to: dateTo } });
        const rows = data.filter((h) => h.duha || h.murotal).map((h) => ({ date: h.date, imamDuha: h.duha?.petugas || "-", pesertaDuha: h.duha?.peserta?.length || 0, petugasMurotal: h.murotal?.petugas || "-", pendampingMurotal: h.murotal?.peserta?.length || 0 }));
        setPreview({ type: "pembiasaan", rows });
      } else if (jenis === "izinsiswa") {
        const { data } = await axios.get(`${API}/izin-siswa`, { params: { date_from: dateFrom, date_to: dateTo } });
        setPreview({ type: "izinsiswa", rows: data });
      } else if (jenis === "pelanggaran") {
        const { data } = await axios.get(`${API}/pelanggaran-siswa`, { params: { date_from: dateFrom, date_to: dateTo } });
        setPreview({ type: "pelanggaran", rows: data });
      } else {
        const { data } = await axios.get(`${API}/jurnal-piket`, { params: { date_from: dateFrom, date_to: dateTo } });
        setPreview({ type: "jurnal", rows: data });
      }
    } catch (err) { showToast(errMsg(err, "Gagal memuat rekap")); } finally { setLoading(false); }
  };
  const cetak = () => window.print();
  const namaSekolah = settingsData.school || "Nama Sekolah";
  const alamatSekolah = settingsData.address || "";
  const namaKepala = settingsData.principal || "............................";
  const namaWaka = settingsData.waka_kurikulum || "............................";
  const JENIS_LABEL = { jammengajar: "Rekap Jam Mengajar Guru (untuk Honor)", bulanansemua: "Rekap Bulanan Semua Guru (per Minggu)", piket: "Rekap Piket (Jumlah Kali Bertugas)", kehadiranguru: "Absensi Semua Guru", pembiasaan: "Rekap Pembiasaan (Shalat Duha & Murotal)", izinsiswa: "Rekap Izin Siswa", pelanggaran: "Rekap Pelanggaran Siswa", jurnal: "Rekap Jurnal Piket" };
  return <>
    <PageTitle eyebrow="Laporan" title="Rekap & Cetak" description="Buat laporan siap cetak untuk kebutuhan administrasi piket." />
    <div className="filter-grid panel no-print">
      <label className="field">Jenis rekap<select value={jenis} onChange={(e) => { setJenis(e.target.value); setPreview(null); }}>
        <option value="jammengajar">Jam Mengajar Guru (untuk honor)</option>
        <option value="bulanansemua">Rekap Bulanan Semua Guru (per Minggu)</option>
        <option value="piket">Rekap Piket (Jumlah Kali Bertugas)</option>
        <option value="kehadiranguru">Absensi Semua Guru (per Tanggal)</option>
        <option value="pembiasaan">Rekap Pembiasaan (Shalat Duha & Murotal)</option>
        <option value="izinsiswa">Izin Siswa</option>
        <option value="pelanggaran">Pelanggaran Siswa</option>
        <option value="jurnal">Jurnal Piket</option>
      </select></label>
      {jenis === "jammengajar" && <label className="field">Guru<select value={guru} onChange={(e) => setGuru(e.target.value)}><option value="">- Pilih guru -</option>{teachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</select></label>}
      {jenis === "bulanansemua" && <label className="field">Bulan<input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} /></label>}
      {jenis !== "bulanansemua" && jenis !== "kehadiranguru" && <>
        <label className="field">Dari tanggal<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label className="field">Sampai tanggal<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
      </>}
      {jenis === "kehadiranguru" && <label className="field">Tanggal<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>}
      <button className="primary-button filter-button" onClick={tampilkan} disabled={loading}><Search size={16} /> {loading ? "Memuat..." : "Tampilkan rekap"}</button>
    </div>
    {preview && <div className="rekap-toolbar no-print"><button className="secondary-button" onClick={cetak}><Printer size={16} /> Cetak / Download PDF</button></div>}
    {preview && <div className="report-print-area">
      <div className="kop-sekolah">{settingsData.logo_base64 ? <img src={settingsData.logo_base64} alt="Kop Surat" className="kop-sekolah-banner" /> : <div><h3>{namaSekolah}</h3><p>{alamatSekolah}</p></div>}</div>
      <div className="judul-laporan">{JENIS_LABEL[preview.type]}</div>
      {preview.type === "jammengajar" && <>
        <div className="sub-laporan">Guru: {guru} &middot; {dateFrom} s/d {dateTo}</div>
        <table className="table-print"><thead><tr><th>No</th><th>Tanggal</th><th>Kelas</th><th>Mapel</th><th>Jam</th><th>Status</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={6} className="text-center">Tidak ada data</td></tr>}
          {preview.rows.map((r, i) => <tr key={i}><td className="text-center">{i + 1}</td><td className="text-center">{r.date}</td><td className="text-center">{r.class_name}</td><td>{r.subject}</td><td className="text-center">{r.jam}</td><td className="text-center">{r.status}</td></tr>)}
        </tbody></table>
        <p style={{ fontWeight: "bold", fontSize: 12 }}>Total jam mengajar: {preview.total} jam</p>
      </>}
      {preview.type === "bulanansemua" && <>
        <div className="sub-laporan">Bulan {bulan}</div>
        <table className="table-print"><thead><tr><th>Guru</th>{preview.weeks.map((w) => <th key={w}>Minggu {w}</th>)}<th>Total</th></tr></thead><tbody>
          {!Object.keys(preview.perGuru).length && <tr><td colSpan={preview.weeks.length + 2} className="text-center">Tidak ada data</td></tr>}
          {Object.entries(preview.perGuru).map(([nm, weeks]) => <tr key={nm}><td>{nm}</td>{preview.weeks.map((w) => <td key={w} className="text-center">{weeks[w] || 0}</td>)}<td className="text-center">{Object.values(weeks).reduce((s, v) => s + v, 0)}</td></tr>)}
        </tbody></table>
      </>}
      {preview.type === "piket" && <>
        <div className="sub-laporan">{dateFrom} s/d {dateTo}</div>
        <table className="table-print"><thead><tr><th>No</th><th>Nama Guru Piket</th><th>Jumlah Kali Bertugas</th></tr></thead><tbody>
          {!Object.keys(preview.count).length && <tr><td colSpan={3} className="text-center">Tidak ada data</td></tr>}
          {Object.entries(preview.count).map(([nm, c], i) => <tr key={nm}><td className="text-center">{i + 1}</td><td>{nm}</td><td className="text-center">{c}</td></tr>)}
        </tbody></table>
      </>}
      {preview.type === "kehadiranguru" && <>
        <div className="sub-laporan">Tanggal {dateFrom}</div>
        <table className="table-print"><thead><tr><th>Shift</th><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Jam Aktual</th><th>Status</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={6} className="text-center">Tidak ada data</td></tr>}
          {preview.rows.map((r, i) => <tr key={i}><td className="text-center">{r.shift}</td><td>{r.teacher}</td><td className="text-center">{r.class_name}</td><td>{r.subject}</td><td className="text-center">{r.jam}</td><td className="text-center">{r.status}</td></tr>)}
        </tbody></table>
      </>}
      {preview.type === "pembiasaan" && <>
        <div className="sub-laporan">{dateFrom} s/d {dateTo}</div>
        <table className="table-print"><thead><tr><th>Tanggal</th><th>Imam Duha</th><th>Peserta Duha</th><th>Petugas Murotal</th><th>Pendamping Murotal</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={5} className="text-center">Tidak ada data</td></tr>}
          {preview.rows.map((r, i) => <tr key={i}><td className="text-center">{r.date}</td><td className="text-center">{r.imamDuha}</td><td className="text-center">{r.pesertaDuha}</td><td className="text-center">{r.petugasMurotal}</td><td className="text-center">{r.pendampingMurotal}</td></tr>)}
        </tbody></table>
      </>}
      {preview.type === "izinsiswa" && <>
        <div className="sub-laporan">{dateFrom} s/d {dateTo}</div>
        <table className="table-print"><thead><tr><th>Tgl</th><th>Nama</th><th>Kelas</th><th>Jenis</th><th>Jam</th><th>Keterangan</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={6} className="text-center">Tidak ada data</td></tr>}
          {preview.rows.map((r) => <tr key={r.id}><td className="text-center">{r.date}</td><td>{r.student}</td><td className="text-center">{r.class_name}</td><td className="text-center">{r.jenis}</td><td className="text-center">{r.jam}</td><td>{r.keterangan}</td></tr>)}
        </tbody></table>
      </>}
      {preview.type === "pelanggaran" && <>
        <div className="sub-laporan">{dateFrom} s/d {dateTo}</div>
        <table className="table-print"><thead><tr><th>Tgl</th><th>Nama</th><th>Kelas</th><th>Pelanggaran</th><th>Tindakan</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={5} className="text-center">Tidak ada data</td></tr>}
          {preview.rows.map((r) => <tr key={r.id}><td className="text-center">{r.date}</td><td>{r.student}</td><td className="text-center">{r.class_name}</td><td>{r.jenis}</td><td>{r.tindakan}</td></tr>)}
        </tbody></table>
      </>}
      {preview.type === "jurnal" && <>
        <div className="sub-laporan">{dateFrom} s/d {dateTo}</div>
        <table className="table-print"><thead><tr><th>Tgl</th><th>Shift</th><th>Piket</th><th>Catatan</th></tr></thead><tbody>
          {!preview.rows.length && <tr><td colSpan={4} className="text-center">Tidak ada data</td></tr>}
          {preview.rows.map((r) => <tr key={r.id}><td className="text-center">{r.date}</td><td className="text-center">{r.shift}</td><td>{r.recorded_by}</td><td>{r.catatan}</td></tr>)}
        </tbody></table>
      </>}
      <div className="ttd-box-top">
        <div className="ttd-kolom"><p>Guru Piket</p><div className="ttd-space"></div><p><b>............................</b></p></div>
        <div className="ttd-kolom"><p>Waka Kurikulum</p><div className="ttd-space"></div><p><b>{namaWaka}</b></p></div>
      </div>
      <div className="ttd-kolom-bawah"><p>Mengetahui,<br/>Kepala Sekolah</p><div className="ttd-space"></div><p><b>{namaKepala}</b></p></div>
    </div>}
  </>;
}

const PIKET_NAV = [
  { id: "absensi", label: "Absensi & Jam Mengajar", icon: ClipboardCheck },
  { id: "izin", label: "Izin Siswa", icon: DoorOpen },
  { id: "pelanggaran", label: "Pelanggaran Siswa", icon: AlertOctagon },
  { id: "jurnal", label: "Jurnal Piket", icon: BookMarked },
  { id: "rekap", label: "Rekap & Cetak", icon: BarChart3 },
];

function PiketApp({ user, showToast, toast, onLogout }) {
  const [active, setActive] = useState("absensi");
  const shift = user.role.replace("Piket ", "");
  return <MobileShell subtitle={user.role} roleLabel={user.role} user={user} navItems={PIKET_NAV} active={active} onNavClick={setActive} onLogout={onLogout} toast={toast}>
    {active === "absensi" && <PiketAbsensi showToast={showToast} shift={shift} />}
    {active === "izin" && <IzinSiswaPage showToast={showToast} />}
    {active === "pelanggaran" && <PelanggaranSiswaPage showToast={showToast} />}
    {active === "jurnal" && <JurnalPiketPage showToast={showToast} shift={shift} />}
    {active === "rekap" && <PiketRekap showToast={showToast} />}
  </MobileShell>;
}


function WaliKelasAdmin({ showToast, teachers, classes, onReload }) {
  const setHomeroom = async (id, class_name) => {
    try { await axios.put(`${API}/teachers/${id}/homeroom`, { class_name }); showToast("Wali kelas diperbarui"); onReload(); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan wali kelas")); }
  };
  return <><PageTitle eyebrow="Administrasi" title="Wali Kelas" description="Tandai guru sebagai wali kelas agar mereka bisa melihat riwayat absen & siswa yang perlu perhatian." /><section className="panel"><div className="table-wrap"><table><thead><tr><th>Nama Guru</th><th>Wali Kelas</th></tr></thead><tbody>{(teachers || []).map((t) => <tr key={t.id}><td>{t.name}</td><td><select value={t.homeroom_class || ""} onChange={(e) => setHomeroom(t.id, e.target.value)}><option value="">- Bukan wali kelas -</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></td></tr>)}{!(teachers || []).length && <tr><td colSpan="2">Belum ada data guru.</td></tr>}</tbody></table></div></section></>;
}

function SekretarisAccountsAdmin({ showToast, classes }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", secretary_class: "" });
  const [editing, setEditing] = useState(null);
  const load = () => axios.get(`${API}/sekretaris-accounts`).then(({ data }) => setAccounts(data)).catch(() => showToast("Gagal memuat akun sekretaris"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.name.trim() || !form.secretary_class) return showToast("Nama dan kelas wajib diisi");
    try {
      if (editing) {
        await axios.put(`${API}/sekretaris-accounts/${editing}`, { name: form.name, secretary_class: form.secretary_class });
        if (form.password) await axios.put(`${API}/sekretaris-accounts/${editing}/password`, { password: form.password });
        showToast("Akun sekretaris diperbarui");
      } else {
        if (!form.username.trim() || form.password.length < 6) return showToast("Username & password (min 6 karakter) wajib diisi");
        await axios.post(`${API}/sekretaris-accounts`, form);
        showToast("Akun sekretaris berhasil dibuat");
      }
      setForm({ name: "", username: "", password: "", secretary_class: "" }); setEditing(null); load();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan akun sekretaris")); }
  };
  const editAcc = (a) => { setEditing(a.id); setForm({ name: a.name, username: a.username, password: "", secretary_class: a.secretary_class }); };
  const remove = async (id) => {
    if (!window.confirm("Hapus akun sekretaris ini?")) return;
    try { await axios.delete(`${API}/sekretaris-accounts/${id}`); showToast("Akun sekretaris dihapus"); load(); } catch { showToast("Gagal menghapus akun"); }
  };
  return <><PageTitle eyebrow="Administrasi" title="Akun Sekretaris Kelas" description="Satu akun untuk satu kelas." /><section className="panel filter-grid" style={{ marginBottom: 18 }}><label className="field">Nama (label)<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Sekretaris 7A" /></label><label className="field">Username{editing && <span style={{ fontWeight: 400, opacity: 0.7 }}> (tidak bisa diubah)</span>}<input value={form.username} disabled={!!editing} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username login" /></label><label className="field">{editing ? "Password baru (opsional)" : "Password"}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Kosongkan jika tidak diganti" : "min 6 karakter"} /></label><label className="field">Kelas<select value={form.secretary_class} onChange={(e) => setForm({ ...form, secretary_class: e.target.value })}><option value="">- Pilih kelas -</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></label><button className="primary-button filter-button" onClick={submit}><Save size={16} /> {editing ? "Simpan perubahan" : "Buat akun"}</button>{editing && <button className="secondary-button" onClick={() => { setEditing(null); setForm({ name: "", username: "", password: "", secretary_class: "" }); }}><X size={16} /> Batal</button>}</section><section className="panel"><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Kelas</th><th></th></tr></thead><tbody>{accounts.map((a) => <tr key={a.id}><td>{a.name}</td><td>{a.username}</td><td>{a.secretary_class}</td><td><div style={{ display: "flex", gap: 6 }}><button className="icon-button" onClick={() => editAcc(a)}><Pencil size={16} /></button><button className="icon-button" onClick={() => remove(a.id)}><Trash2 size={16} /></button></div></td></tr>)}{!accounts.length && <tr><td colSpan="4">Belum ada akun sekretaris kelas.</td></tr>}</tbody></table></div></section></>;
}

function DailyAttendanceAbsen({ showToast, className, canEditAlways }) {
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    if (!className) return;
    try {
      const [studentsRes, savedRes] = await Promise.all([
        axios.get(`${API}/students`, { params: { class_name: className } }),
        axios.get(`${API}/daily-attendance`, { params: { date, class_name: className } }),
      ]);
      const saved = Object.fromEntries(savedRes.data.entries.map((e) => [e.student, e]));
      setRoster(studentsRes.data);
      setStatuses(Object.fromEntries(studentsRes.data.map((s) => [s.name, saved[s.name]?.status || "H"])));
      setNotes(Object.fromEntries(studentsRes.data.map((s) => [s.name, saved[s.name]?.note || ""])));
      setLocked(savedRes.data.entries.length > 0 && !canEditAlways);
    } catch { showToast("Gagal memuat data absensi"); }
  };
  useEffect(() => { load(); }, [date, className]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/daily-attendance`, { date, class_name: className, entries: roster.map((s) => ({ student: s.name, status: statuses[s.name] || "H", note: notes[s.name] || "" })) });
      showToast("Absensi berhasil dikirim");
      load();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan absensi")); } finally { setSaving(false); }
  };
  return <><PageTitle eyebrow="Absensi Harian" title="Absen Siswa" description={`Kelas ${className || "-"} \u00b7 semua siswa otomatis Hadir, klik status lain untuk yang tidak hadir.`} /><div className="filter-grid panel"><label className="field">Tanggal<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div><div className="stat-grid"><Stat label="Hadir" value={Object.values(statuses).filter((s) => s === "H").length} change="Hari ini" icon={Check} color="green" /><Stat label="Sakit" value={Object.values(statuses).filter((s) => s === "S").length} change="Hari ini" icon={Thermometer} color="amber" /><Stat label="Izin" value={Object.values(statuses).filter((s) => s === "I").length} change="Hari ini" icon={DoorOpen} color="blue" /><Stat label="Alfa" value={Object.values(statuses).filter((s) => s === "A").length} change="Hari ini" icon={X} color="rose" /></div>{locked && <div className="panel" style={{ marginBottom: 16, background: "#f0fdf4", borderColor: "#bbf7d0" }}><p style={{ margin: 0, fontSize: 13, color: "#166534" }}><Check size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Kelas ini sudah diabsen untuk tanggal ini. Absen ulang tidak bisa dilakukan &mdash; hubungi Wali Kelas/Admin kalau perlu koreksi.</p></div>}<section className="panel roster-panel"><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama siswa</th><th>Status kehadiran</th><th>Catatan</th></tr></thead><tbody>{roster.map((s, i) => <tr key={s.id}><td>{String(i + 1).padStart(2, "0")}</td><td><div className="name-cell"><span className="student-avatar">{initials(s.name)}</span><strong>{s.name}</strong></div></td><td><div className="status-buttons">{[["H", "Hadir", "hadir"], ["S", "Sakit", "sakit"], ["I", "Izin", "izin"], ["A", "Alpa", "alpa"]].map(([code, name, style]) => <button key={code} disabled={locked} className={`${style} ${statuses[s.name] === code ? "selected" : ""}`} onClick={() => setStatuses({ ...statuses, [s.name]: code })}>{code}<span>{name}</span></button>)}</div></td><td><input className="table-input" disabled={locked} value={notes[s.name] || ""} onChange={(e) => setNotes({ ...notes, [s.name]: e.target.value })} placeholder="Tambah catatan" /></td></tr>)}{!roster.length && <tr><td colSpan="4">Belum ada data siswa untuk kelas ini.</td></tr>}</tbody></table></div>{!locked && <div className="roster-footer"><span><Check size={15} /> {Object.values(statuses).filter((x) => x === "H").length} siswa hadir</span><button className="primary-button" onClick={save} disabled={saving || !roster.length}><Save size={16} /> {saving ? "Mengirim..." : "Kirim absensi"}</button></div>}</section></>;
}

function DailyAttendanceRekap({ showToast, classes, fixedClass }) {
  const [jenis, setJenis] = useState("bulanan");
  const [className, setClassName] = useState(fixedClass || (classes && classes[0]) || "");
  const [bulan, setBulan] = useState(today().slice(0, 7));
  const [semester, setSemester] = useState("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState(String(new Date().getFullYear()));
  const [settingsData, setSettingsData] = useState({});
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { axios.get(`${API}/settings`).then(({ data }) => setSettingsData(data)).catch(() => {}); }, []);
  const tampilkan = async () => {
    if (!className) return showToast("Pilih kelas terlebih dahulu");
    setLoading(true);
    try {
      let dateFrom, dateTo;
      if (jenis === "bulanan") { dateFrom = `${bulan}-01`; dateTo = `${bulan}-31`; }
      else {
        const year = parseInt(tahunAjaran, 10) || new Date().getFullYear();
        if (semester === "Ganjil") { dateFrom = `${year}-07-01`; dateTo = `${year}-12-31`; }
        else { dateFrom = `${year + 1}-01-01`; dateTo = `${year + 1}-06-30`; }
      }
      const { data } = await axios.get(`${API}/daily-attendance/history`, { params: { class_name: className, date_from: dateFrom, date_to: dateTo } });
      if (jenis === "bulanan") {
        const tanggalUnik = [...new Set(data.map((h) => h.date))].sort();
        const namaSiswa = [...new Set(data.flatMap((h) => h.entries.map((e) => e.student)))].sort();
        const lookup = {};
        data.forEach((h) => h.entries.forEach((e) => { lookup[e.student] = lookup[e.student] || {}; lookup[e.student][h.date] = e.status; }));
        setPreview({ type: "bulanan", tanggalUnik, namaSiswa, lookup });
      } else {
        const rekap = {};
        data.forEach((h) => h.entries.forEach((e) => { rekap[e.student] = rekap[e.student] || { H: 0, S: 0, I: 0, A: 0 }; rekap[e.student][e.status] = (rekap[e.student][e.status] || 0) + 1; }));
        setPreview({ type: "semester", rekap });
      }
    } catch (err) { showToast(errMsg(err, "Gagal memuat rekap")); } finally { setLoading(false); }
  };
  const cetak = () => window.print();
  const namaSekolah = settingsData.school || "Nama Sekolah";
  const alamatSekolah = settingsData.address || "";
  const namaKepala = settingsData.principal || "............................";
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const labelBulan = () => { const [thn, bln] = bulan.split("-"); return `${namaBulan[parseInt(bln, 10) - 1]} ${thn}`; };
  return <>
    <PageTitle eyebrow="Laporan" title="Rekap Absensi" description="Buat laporan siap cetak untuk absensi harian kelas." />
    <div className="filter-grid panel no-print">
      {!fixedClass && <label className="field">Kelas<select value={className} onChange={(e) => setClassName(e.target.value)}>{(classes || []).map((c) => <option key={c} value={c}>{c}</option>)}</select></label>}
      <label className="field">Jenis rekap<select value={jenis} onChange={(e) => { setJenis(e.target.value); setPreview(null); }}><option value="bulanan">Bulanan (per tanggal)</option><option value="semester">Semester (total per siswa)</option></select></label>
      {jenis === "bulanan" && <label className="field">Bulan<input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} /></label>}
      {jenis === "semester" && <>
        <label className="field">Semester<select value={semester} onChange={(e) => setSemester(e.target.value)}><option value="Ganjil">Ganjil (Jul-Des)</option><option value="Genap">Genap (Jan-Jun)</option></select></label>
        <label className="field">Tahun Ajaran<input value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)} placeholder="Contoh: 2026" /></label>
      </>}
      <button className="primary-button filter-button" onClick={tampilkan} disabled={loading}><Search size={16} /> {loading ? "Memuat..." : "Tampilkan rekap"}</button>
    </div>
    {preview && <div className="rekap-toolbar no-print"><button className="secondary-button" onClick={cetak}><Printer size={16} /> Cetak / Download PDF</button></div>}
    {preview && <div className="report-print-area">
      <div className="kop-sekolah">{settingsData.logo_base64 ? <img src={settingsData.logo_base64} alt="Kop Surat" className="kop-sekolah-banner" /> : <div><h3>{namaSekolah}</h3><p>{alamatSekolah}</p></div>}</div>
      <div className="judul-laporan">Rekap Absensi Kelas {className}</div>
      {preview.type === "bulanan" && <>
        <div className="sub-laporan">Bulan {labelBulan()}</div>
        <table className="table-print"><thead><tr><th rowSpan={2}>No</th><th rowSpan={2}>Nama Siswa</th>{preview.tanggalUnik.length > 0 && <th colSpan={preview.tanggalUnik.length}>Tanggal</th>}<th colSpan={4}>Jumlah</th></tr><tr>{preview.tanggalUnik.map((t) => <th key={t}>{t.slice(8, 10)}</th>)}<th>H</th><th>S</th><th>I</th><th>A</th></tr></thead><tbody>
          {!preview.namaSiswa.length && <tr><td colSpan={6 + preview.tanggalUnik.length} className="text-center">Belum ada data absensi bulan ini</td></tr>}
          {preview.namaSiswa.map((nm, idx) => {
            const rec = preview.lookup[nm] || {};
            let cH = 0, cS = 0, cI = 0, cA = 0;
            preview.tanggalUnik.forEach((t) => { const st = rec[t]; if (st === "H") cH++; else if (st === "S") cS++; else if (st === "I") cI++; else if (st === "A") cA++; });
            return <tr key={nm}><td className="text-center">{idx + 1}</td><td>{nm}</td>{preview.tanggalUnik.map((t) => <td key={t} className="text-center">{rec[t] || "-"}</td>)}<td className="text-center">{cH}</td><td className="text-center">{cS}</td><td className="text-center">{cI}</td><td className="text-center">{cA}</td></tr>;
          })}
        </tbody></table>
      </>}
      {preview.type === "semester" && <>
        <div className="sub-laporan">Semester {semester} {tahunAjaran}</div>
        <table className="table-print"><thead><tr><th>No</th><th>Nama Siswa</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alfa</th></tr></thead><tbody>
          {!Object.keys(preview.rekap).length && <tr><td colSpan={6} className="text-center">Belum ada data</td></tr>}
          {Object.entries(preview.rekap).map(([nm, r], idx) => <tr key={nm}><td className="text-center">{idx + 1}</td><td>{nm}</td><td className="text-center">{r.H || 0}</td><td className="text-center">{r.S || 0}</td><td className="text-center">{r.I || 0}</td><td className="text-center">{r.A || 0}</td></tr>)}
        </tbody></table>
      </>}
      <div className="ttd-kolom-bawah"><p>Mengetahui,<br/>Kepala Sekolah</p><div className="ttd-space"></div><p><b>{namaKepala}</b></p></div>
    </div>}
  </>;
}

function WaliKelasPage({ showToast, homeroomClass }) {
  const [alfaList, setAlfaList] = useState([]);
  const [history, setHistory] = useState([]);
  const [rangeFrom, setRangeFrom] = useState(`${today().slice(0, 7)}-01`);
  const [rangeTo, setRangeTo] = useState(today());
  const loadDashboard = () => {
    if (!homeroomClass) return;
    axios.get(`${API}/daily-attendance/history`, { params: { class_name: homeroomClass, date_from: rangeFrom, date_to: rangeTo } }).then(({ data }) => {
      setHistory(data);
      const count = {};
      data.forEach((h) => h.entries.forEach((e) => { if (e.status === "A") count[e.student] = (count[e.student] || 0) + 1; }));
      setAlfaList(Object.entries(count).filter(([, c]) => c > 3).sort((a, b) => b[1] - a[1]));
    }).catch(() => showToast("Gagal memuat data kelas"));
  };
  useEffect(() => { loadDashboard(); }, [homeroomClass, rangeFrom, rangeTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const removeEntry = async (id) => {
    if (!window.confirm("Hapus data absensi tanggal ini?")) return;
    try { await axios.delete(`${API}/daily-attendance/${id}`); showToast("Data dihapus"); loadDashboard(); } catch { showToast("Gagal menghapus data"); }
  };
  if (!homeroomClass) return <PageTitle eyebrow="Wali Kelas" title="Wali Kelas" description="Anda belum ditandai sebagai wali kelas manapun." />;
  const totals = { H: 0, S: 0, I: 0, A: 0 };
  history.forEach((h) => h.entries.forEach((e) => { totals[e.status] = (totals[e.status] || 0) + 1; }));
  return <>
    <PageTitle eyebrow="Wali Kelas" title={`Kelas ${homeroomClass}`} description="Pantau kehadiran, koreksi absensi, dan cetak rekap kelas Anda." />
    <div className="stat-grid"><Stat label="Hadir" value={totals.H} change="Rentang dipilih" icon={Check} color="green" /><Stat label="Sakit" value={totals.S} change="Rentang dipilih" icon={Thermometer} color="amber" /><Stat label="Izin" value={totals.I} change="Rentang dipilih" icon={DoorOpen} color="blue" /><Stat label="Alfa" value={totals.A} change="Rentang dipilih" icon={X} color="rose" /></div>
    <div className="filter-grid panel no-print"><label className="field">Dari tanggal<input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /></label><label className="field">Sampai tanggal<input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></label></div>
    {alfaList.length > 0 && <section className="panel" style={{ marginBottom: 18, borderColor: "#fecaca" }}><PanelHeading title="Perlu Perhatian (Alfa lebih dari 3x)" action={<AlertTriangle size={18} color="#dc2626" />} /><div className="table-wrap"><table><thead><tr><th>Nama Siswa</th><th>Jumlah Alfa</th></tr></thead><tbody>{alfaList.map(([nm, c]) => <tr key={nm}><td>{nm}</td><td className="text-center">{c}x</td></tr>)}</tbody></table></div></section>}
    <section className="panel"><PanelHeading title="Riwayat absen kelas" subtitle={`${history.length} hari tercatat`} /><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alfa</th><th>Dicatat oleh</th><th></th></tr></thead><tbody>{history.map((h) => { const c = { H: 0, S: 0, I: 0, A: 0 }; h.entries.forEach((e) => { c[e.status] = (c[e.status] || 0) + 1; }); return <tr key={h.id}><td>{h.date}</td><td className="text-center">{c.H}</td><td className="text-center">{c.S}</td><td className="text-center">{c.I}</td><td className="text-center">{c.A}</td><td>{h.recorded_by}</td><td><button className="icon-button" onClick={() => removeEntry(h.id)}><Trash2 size={16} /></button></td></tr>; })}{!history.length && <tr><td colSpan="7">Belum ada data absensi.</td></tr>}</tbody></table></div></section>
    <section className="panel" style={{ marginTop: 18 }}><PanelHeading title="Koreksi absen (input ulang tanggal tertentu)" /><DailyAttendanceAbsen showToast={showToast} className={homeroomClass} canEditAlways /></section>
    <section style={{ marginTop: 18 }}><DailyAttendanceRekap showToast={showToast} fixedClass={homeroomClass} classes={[homeroomClass]} /></section>
  </>;
}

const SEKRETARIS_NAV = [
  { id: "absen", label: "Absen", icon: CheckSquare },
  { id: "rekap", label: "Rekap", icon: Printer },
];

function SekretarisApp({ user, showToast, toast, onLogout }) {
  const [active, setActive] = useState("absen");
  const className = user.secretary_class;
  return <MobileShell subtitle={`Sekretaris Kelas ${className}`} roleLabel={`Sekretaris ${className}`} user={user} navItems={SEKRETARIS_NAV} active={active} onNavClick={setActive} onLogout={onLogout} toast={toast}>
    {active === "absen" && <DailyAttendanceAbsen showToast={showToast} className={className} />}
    {active === "rekap" && <DailyAttendanceRekap showToast={showToast} fixedClass={className} classes={[className]} />}
  </MobileShell>;
}


function TuAccountsAdmin({ showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [editing, setEditing] = useState(null);
  const load = () => axios.get(`${API}/tu-accounts`).then(({ data }) => setAccounts(data)).catch(() => showToast("Gagal memuat akun TU"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!form.name.trim()) return showToast("Nama wajib diisi");
    try {
      if (editing) {
        await axios.put(`${API}/tu-accounts/${editing}`, { name: form.name });
        if (form.password) await axios.put(`${API}/tu-accounts/${editing}/password`, { password: form.password });
        showToast("Akun TU diperbarui");
      } else {
        if (!form.username.trim() || form.password.length < 6) return showToast("Username & password (min 6 karakter) wajib diisi");
        await axios.post(`${API}/tu-accounts`, form);
        showToast("Akun TU berhasil dibuat");
      }
      setForm({ name: "", username: "", password: "" }); setEditing(null); load();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan akun TU")); }
  };
  const editAcc = (a) => { setEditing(a.id); setForm({ name: a.name, username: a.username, password: "" }); };
  const remove = async (id) => {
    if (!window.confirm("Hapus akun TU ini?")) return;
    try { await axios.delete(`${API}/tu-accounts/${id}`); showToast("Akun TU dihapus"); load(); } catch { showToast("Gagal menghapus akun"); }
  };
  return <><PageTitle eyebrow="Administrasi" title="Akun Tata Usaha" description="Akun dengan akses penuh ke modul Buku Induk, Akun, Persuratan, dan Laporan." /><section className="panel filter-grid" style={{ marginBottom: 18 }}><label className="field">Nama<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama staf TU" /></label><label className="field">Username{editing && <span style={{ fontWeight: 400, opacity: 0.7 }}> (tidak bisa diubah)</span>}<input value={form.username} disabled={!!editing} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label><label className="field">{editing ? "Password baru (opsional)" : "Password"}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Kosongkan jika tidak diganti" : "min 6 karakter"} /></label><button className="primary-button filter-button" onClick={submit}><Save size={16} /> {editing ? "Simpan perubahan" : "Buat akun"}</button>{editing && <button className="secondary-button" onClick={() => { setEditing(null); setForm({ name: "", username: "", password: "" }); }}><X size={16} /> Batal</button>}</section><section className="panel"><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th></th></tr></thead><tbody>{accounts.map((a) => <tr key={a.id}><td>{a.name}</td><td>{a.username}</td><td><div style={{ display: "flex", gap: 6 }}><button className="icon-button" onClick={() => editAcc(a)}><Pencil size={16} /></button><button className="icon-button" onClick={() => remove(a.id)}><Trash2 size={16} /></button></div></td></tr>)}{!accounts.length && <tr><td colSpan="3">Belum ada akun TU.</td></tr>}</tbody></table></div></section></>;
}

function BukuIndukSiswa({ showToast, classes }) {
  const emptyBiodata = { nomor_induk: "", nisn: "", nik: "", tempat_lahir: "", tanggal_lahir: "", jenis_kelamin: "", agama: "", alamat: "", nama_ayah: "", pekerjaan_ayah: "", nama_ibu: "", pekerjaan_ibu: "", nama_wali: "", no_hp_ortu: "", status: "Aktif" };
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newBasic, setNewBasic] = useState({ name: "", class_name: "" });
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const load = () => axios.get(`${API}/masters`).then(({ data }) => setStudents(data.students || [])).catch(() => showToast("Gagal memuat data siswa"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const openEdit = async (s) => {
    setAdding(false); setEditing(s.id); setPhoto("");
    setForm({ nomor_induk: s.nomor_induk || "", nisn: s.nisn || "", nik: s.nik || "", tempat_lahir: s.tempat_lahir || "", tanggal_lahir: s.tanggal_lahir || "", jenis_kelamin: s.jenis_kelamin || "", agama: s.agama || "", alamat: s.alamat || "", nama_ayah: s.nama_ayah || "", pekerjaan_ayah: s.pekerjaan_ayah || "", nama_ibu: s.nama_ibu || "", pekerjaan_ibu: s.pekerjaan_ibu || "", nama_wali: s.nama_wali || "", no_hp_ortu: s.no_hp_ortu || "", status: s.status || "Aktif" });
    try { const { data } = await axios.get(`${API}/students/${s.id}`); setPhoto(data.photo || ""); } catch { /* biodata tetap terbuka walau foto gagal dimuat */ }
  };
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file, 400, 533, 0.8);
      setPhoto(compressed);
      if (editing) { await axios.put(`${API}/students/${editing}/photo`, { photo: compressed }); showToast("Foto tersimpan"); }
    } catch (err) { showToast(errMsg(err, "Gagal memproses foto")); } finally { setUploadingPhoto(false); }
    e.target.value = "";
  };
  const openAdd = () => { setEditing(null); setAdding(true); setPhoto(""); setNewBasic({ name: "", class_name: classes[0] || "" }); setForm({ ...emptyBiodata }); };
  const closeForm = () => { setEditing(null); setAdding(false); setForm(null); setPhoto(""); };
  const save = async () => {
    if (adding) {
      if (!newBasic.name.trim() || !newBasic.class_name) return showToast("Nama dan kelas wajib diisi");
      try {
        const { data } = await axios.post(`${API}/students`, newBasic);
        await axios.put(`${API}/students/${data.id}/biodata`, form);
        if (photo) await axios.put(`${API}/students/${data.id}/photo`, { photo });
        showToast("Siswa baru berhasil ditambahkan"); closeForm(); load();
      } catch (err) { showToast(errMsg(err, "Gagal menambahkan siswa")); }
    } else {
      try { await axios.put(`${API}/students/${editing}/biodata`, form); showToast("Biodata siswa tersimpan"); closeForm(); load(); }
      catch (err) { showToast(errMsg(err, "Gagal menyimpan biodata")); }
    }
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { const { data } = await axios.post(`${API}/students/import-biodata`, fd, { headers: { "Content-Type": "multipart/form-data" } }); setImportResult(data); showToast(`${data.imported} siswa baru, ${data.updated} diperbarui`); load(); }
    catch (err) { showToast(errMsg(err, "Gagal impor file")); }
    e.target.value = "";
  };
  const filtered = students.filter((s) => (!filterClass || s.class_name === filterClass) && s.name.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="filter-grid panel" style={{ marginBottom: 16 }}>
      <label className="field">Cari nama<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik nama siswa..." /></label>
      <label className="field">Kelas<select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}><option value="">Semua kelas</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <button className="secondary-button filter-button" onClick={openAdd}><Plus size={16} /> Tambah Siswa Baru</button>
      <label className="secondary-button filter-button" style={{ cursor: "pointer" }}><Upload size={16} /> Import Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: "none" }} /></label>
    </div>
    {importResult && <section className="panel" style={{ marginBottom: 16 }}><PanelHeading title="Hasil import terakhir" subtitle={`${importResult.imported} baru \u00b7 ${importResult.updated} diperbarui${importResult.skipped_rows?.length ? ` \u00b7 ${importResult.skipped_rows.length} baris dilewati (nama/kelas kosong)` : ""}`} action={<button className="icon-button" onClick={() => setImportResult(null)}><X size={16} /></button>} />
      {importResult.created_names?.length > 0 && <div style={{ marginBottom: 10 }}><strong style={{ fontSize: 12 }}>Siswa baru dibuat:</strong><p style={{ fontSize: 12, color: "#53645a" }}>{importResult.created_names.join(", ")}</p></div>}
      {importResult.updated_names?.length > 0 && <div><strong style={{ fontSize: 12 }}>Data yang diperbarui (sudah ada sebelumnya):</strong><p style={{ fontSize: 12, color: "#53645a" }}>{importResult.updated_names.join(", ")}</p></div>}
      <p style={{ fontSize: 11, color: "#8a988f", marginTop: 8 }}>Cek daftar "diperbarui" di atas — kalau ada nama yang harusnya baru tapi malah masuk situ (atau sebaliknya), kemungkinan ejaan namanya beda dari data lama.</p>
    </section>}
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Kelas</th><th>NISN</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.class_name}</td><td>{s.nisn || "-"}</td><td>{s.status || "Aktif"}</td><td><button className="icon-button" onClick={() => openEdit(s)}><Pencil size={16} /></button></td></tr>)}{!filtered.length && <tr><td colSpan="5">Tidak ada data siswa.</td></tr>}</tbody></table></div></section>
    {(editing || adding) && form && <section className="panel" style={{ marginTop: 18 }}><PanelHeading title={adding ? "Tambah Siswa Baru" : "Edit Biodata Siswa"} action={<button className="icon-button" onClick={closeForm}><X size={16} /></button>} /><div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>{photo ? <img src={photo} alt="Foto siswa" style={{ width: 90, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} /> : <div style={{ width: 90, height: 120, borderRadius: 8, border: "1px dashed #d8e2dc", display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa8a0", fontSize: 11, textAlign: "center" }}>Belum ada foto</div>}<label className="secondary-button" style={{ cursor: "pointer" }}><Upload size={16} /> {uploadingPhoto ? "Memproses..." : "Upload Foto 3x4"}<input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} disabled={uploadingPhoto} /></label></div><div className="form-grid">
      {adding && <><label className="field">Nama siswa<input value={newBasic.name} onChange={(e) => setNewBasic({ ...newBasic, name: e.target.value })} /></label>
      <label className="field">Kelas<select value={newBasic.class_name} onChange={(e) => setNewBasic({ ...newBasic, class_name: e.target.value })}>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></label></>}
      <label className="field">Nomor Induk (NIS)<input value={form.nomor_induk} onChange={(e) => setForm({ ...form, nomor_induk: e.target.value })} /></label>
      <label className="field">NISN<input value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} /></label>
      <label className="field">NIK<input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} /></label>
      <label className="field">Tempat Lahir<input value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} /></label>
      <label className="field">Tanggal Lahir<input type="date" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} /></label>
      <label className="field">Jenis Kelamin<select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}><option value="">-</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></label>
      <label className="field">Agama<input value={form.agama} onChange={(e) => setForm({ ...form, agama: e.target.value })} /></label>
      <label className="field full">Alamat<input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></label>
      <label className="field">Nama Ayah<input value={form.nama_ayah} onChange={(e) => setForm({ ...form, nama_ayah: e.target.value })} /></label>
      <label className="field">Pekerjaan Ayah<input value={form.pekerjaan_ayah} onChange={(e) => setForm({ ...form, pekerjaan_ayah: e.target.value })} /></label>
      <label className="field">Nama Ibu<input value={form.nama_ibu} onChange={(e) => setForm({ ...form, nama_ibu: e.target.value })} /></label>
      <label className="field">Pekerjaan Ibu<input value={form.pekerjaan_ibu} onChange={(e) => setForm({ ...form, pekerjaan_ibu: e.target.value })} /></label>
      <label className="field">Nama Wali (jika ada)<input value={form.nama_wali} onChange={(e) => setForm({ ...form, nama_wali: e.target.value })} /></label>
      <label className="field">No HP Orang Tua<input value={form.no_hp_ortu} onChange={(e) => setForm({ ...form, no_hp_ortu: e.target.value })} /></label>
      <label className="field">Status Siswa<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="Aktif">Aktif</option><option value="Mutasi Masuk">Mutasi Masuk</option><option value="Mutasi Keluar">Mutasi Keluar</option><option value="Lulus">Lulus</option><option value="Alumni">Alumni</option></select></label>
    </div><button className="primary-button" style={{ marginTop: 12 }} onClick={save}><Save size={16} /> {adding ? "Simpan siswa baru" : "Simpan biodata"}</button></section>}
  </>;
}

function BukuIndukTranskrip({ showToast }) {
  const [students, setStudents] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [semesterData, setSemesterData] = useState({});
  const [activeSem, setActiveSem] = useState(1);
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(today());
  const [settingsData, setSettingsData] = useState({});
  const [showPrint, setShowPrint] = useState(false);
  useEffect(() => { axios.get(`${API}/masters`).then(({ data }) => setStudents(data.students || [])).catch(() => {}); axios.get(`${API}/settings`).then(({ data }) => setSettingsData(data)).catch(() => {}); }, []);
  const loadTranskrip = async (name) => {
    try { const { data } = await axios.get(`${API}/transkrip`, { params: { student: name } }); const bySem = {}; data.forEach((t) => { bySem[t.semester] = t; }); setSemesterData(bySem); }
    catch { showToast("Gagal memuat transkrip"); }
  };
  const pickStudent = (s) => { setStudentName(s.name); setStudentClass(s.class_name); setShowPrint(false); loadTranskrip(s.name); };
  const tarikNilai = async () => {
    try { await axios.post(`${API}/transkrip/generate`, null, { params: { student: studentName, class_name: studentClass, semester: activeSem, date_from: dateFrom, date_to: dateTo } }); showToast("Nilai berhasil ditarik dari Modul Guru"); loadTranskrip(studentName); }
    catch (err) { showToast(errMsg(err, "Gagal menarik nilai")); }
  };
  const cur = semesterData[activeSem] || { subjects: [], sikap: "", catatan: "", kehadiran: {} };
  const updateSubjectNilai = (idx, val) => { const subjects = [...cur.subjects]; subjects[idx] = { ...subjects[idx], nilai: Number(val) }; setSemesterData({ ...semesterData, [activeSem]: { ...cur, subjects } }); };
  const addSubjectRow = () => { setSemesterData({ ...semesterData, [activeSem]: { ...cur, subjects: [...cur.subjects, { subject: "", nilai: 0 }] } }); };
  const updateSubjectName = (idx, val) => { const subjects = [...cur.subjects]; subjects[idx] = { ...subjects[idx], subject: val }; setSemesterData({ ...semesterData, [activeSem]: { ...cur, subjects } }); };
  const removeSubjectRow = (idx) => { const subjects = cur.subjects.filter((_, i) => i !== idx); setSemesterData({ ...semesterData, [activeSem]: { ...cur, subjects } }); };
  const saveTranskrip = async () => {
    if (!cur.id) return showToast("Tarik nilai dari Modul Guru dulu untuk membuat data semester ini");
    try { await axios.put(`${API}/transkrip/${cur.id}`, { subjects: cur.subjects, sikap: cur.sikap, catatan: cur.catatan }); showToast("Transkrip tersimpan"); loadTranskrip(studentName); }
    catch (err) { showToast(errMsg(err, "Gagal menyimpan transkrip")); }
  };
  const handleImportNilai = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { const { data } = await axios.post(`${API}/transkrip/import`, fd, { headers: { "Content-Type": "multipart/form-data" } }); showToast(data.message); if (studentName) loadTranskrip(studentName); }
    catch (err) { showToast(errMsg(err, "Gagal impor nilai")); }
    e.target.value = "";
  };
  const student = students.find((s) => s.name === studentName);
  return <>
    <div className="filter-grid panel no-print" style={{ marginBottom: 16 }}>
      <label className="field">Pilih siswa<select value={studentName} onChange={(e) => { const s = students.find((x) => x.name === e.target.value); if (s) pickStudent(s); }}><option value="">- Pilih siswa -</option>{students.map((s) => <option key={s.id} value={s.name}>{s.name} ({s.class_name})</option>)}</select></label>
      <label className="secondary-button filter-button" style={{ cursor: "pointer" }}><Upload size={16} /> Import Nilai Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportNilai} style={{ display: "none" }} /></label>
      {studentName && <button className="primary-button filter-button" onClick={() => setShowPrint(true)}><Printer size={16} /> Pratinjau &amp; Cetak Buku Induk</button>}
    </div>
    {studentName && !showPrint && <>
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>{[1, 2, 3, 4, 5, 6].map((sem) => <button key={sem} className="secondary-button" style={activeSem === sem ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setActiveSem(sem)}>Semester {sem}</button>)}</div>
      <section className="panel no-print" style={{ marginBottom: 16 }}><PanelHeading title={`Tarik nilai dari Modul Guru - Semester ${activeSem}`} /><div className="filter-grid"><label className="field">Dari tanggal<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label><label className="field">Sampai tanggal<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label><button className="secondary-button filter-button" onClick={tarikNilai}><RefreshCw size={16} /> Tarik nilai</button></div></section>
      <section className="panel" style={{ marginBottom: 16 }}><PanelHeading title={`Nilai Akhir Mata Pelajaran - Semester ${activeSem}`} action={<button className="icon-button" onClick={addSubjectRow}><Plus size={16} /></button>} /><div className="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Nilai</th><th></th></tr></thead><tbody>{cur.subjects.map((s, i) => <tr key={i}><td><input value={s.subject} onChange={(e) => updateSubjectName(i, e.target.value)} /></td><td><input type="number" value={s.nilai} onChange={(e) => updateSubjectNilai(i, e.target.value)} style={{ width: 70 }} /></td><td><button className="icon-button" onClick={() => removeSubjectRow(i)}><Trash2 size={16} /></button></td></tr>)}{!cur.subjects.length && <tr><td colSpan="3">Belum ada nilai untuk semester ini.</td></tr>}</tbody></table></div></section>
      <section className="panel" style={{ marginBottom: 16 }}><PanelHeading title="Kehadiran &amp; Sikap" /><div className="form-grid"><label className="field">Hadir<input value={cur.kehadiran?.H || 0} disabled /></label><label className="field">Sakit<input value={cur.kehadiran?.S || 0} disabled /></label><label className="field">Izin<input value={cur.kehadiran?.I || 0} disabled /></label><label className="field">Alfa<input value={cur.kehadiran?.A || 0} disabled /></label><label className="field">Sikap<input value={cur.sikap} onChange={(e) => setSemesterData({ ...semesterData, [activeSem]: { ...cur, sikap: e.target.value } })} placeholder="Contoh: Baik" /></label><label className="field full">Catatan Wali Kelas<input value={cur.catatan} onChange={(e) => setSemesterData({ ...semesterData, [activeSem]: { ...cur, catatan: e.target.value } })} /></label></div><button className="primary-button" style={{ marginTop: 12 }} onClick={saveTranskrip}><Save size={16} /> Simpan semester {activeSem}</button></section>
    </>}
    {studentName && showPrint && <>
      <div className="rekap-toolbar no-print"><button className="secondary-button" onClick={() => setShowPrint(false)}><X size={16} /> Tutup pratinjau</button><button className="primary-button" onClick={() => window.print()}><Printer size={16} /> Cetak / Download PDF</button></div>
      <div className="report-print-area">
        <div className="kop-sekolah">{settingsData.logo_base64 ? <img src={settingsData.logo_base64} alt="Kop Surat" className="kop-sekolah-banner" /> : <div><h3>{settingsData.school}</h3><p>{settingsData.address}</p></div>}</div>
        <div className="judul-laporan">Buku Induk Siswa</div>
        <table className="meta-table"><tbody>
          <tr><td className="meta-label">Nama</td><td>: {student?.name}</td></tr>
          <tr><td className="meta-label">Kelas</td><td>: {student?.class_name}</td></tr>
          <tr><td className="meta-label">NISN / NIK</td><td>: {student?.nisn || "-"} / {student?.nik || "-"}</td></tr>
          <tr><td className="meta-label">Tempat, Tanggal Lahir</td><td>: {student?.tempat_lahir || "-"}, {student?.tanggal_lahir || "-"}</td></tr>
          <tr><td className="meta-label">Jenis Kelamin / Agama</td><td>: {student?.jenis_kelamin || "-"} / {student?.agama || "-"}</td></tr>
          <tr><td className="meta-label">Alamat</td><td>: {student?.alamat || "-"}</td></tr>
          <tr><td className="meta-label">Nama Ayah / Ibu</td><td>: {student?.nama_ayah || "-"} / {student?.nama_ibu || "-"}</td></tr>
          <tr><td className="meta-label">Status</td><td>: {student?.status || "Aktif"}</td></tr>
        </tbody></table>
        {[1, 2, 3, 4, 5, 6].map((sem) => { const d = semesterData[sem]; return <div key={sem} style={{ marginTop: 14 }}>
          <div className="sub-laporan" style={{ textAlign: "left", fontStyle: "normal", fontWeight: "bold" }}>Semester {sem}</div>
          <table className="table-print"><thead><tr><th>Mata Pelajaran</th><th>Nilai</th></tr></thead><tbody>
            {!(d?.subjects || []).length && <tr><td colSpan={2} className="text-center">Belum ada data</td></tr>}
            {(d?.subjects || []).map((s, i) => <tr key={i}><td>{s.subject}</td><td className="text-center">{s.nilai}</td></tr>)}
          </tbody></table>
          <p style={{ fontSize: 11, margin: "4px 0 0" }}>Kehadiran: H {d?.kehadiran?.H || 0} &middot; S {d?.kehadiran?.S || 0} &middot; I {d?.kehadiran?.I || 0} &middot; A {d?.kehadiran?.A || 0} &middot; Sikap: {d?.sikap || "-"}</p>
        </div>; })}
        <div className="ttd-kolom-bawah"><p>Kepala Sekolah</p><div className="ttd-space"></div><p><b>{settingsData.principal}</b></p></div>
      </div>
    </>}
  </>;
}

function BukuIndukPage({ showToast, classes }) {
  const [tab, setTab] = useState("siswa");
  return <><PageTitle eyebrow="Tata Usaha" title="Buku Induk Digital" description="Biodata siswa dan transkrip nilai lengkap semester 1-6." /><div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16 }}><button className="secondary-button" style={tab === "siswa" ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setTab("siswa")}><Users size={16} /> Data Siswa</button><button className="secondary-button" style={tab === "transkrip" ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setTab("transkrip")}><GraduationCap size={16} /> Transkrip Nilai</button></div>{tab === "siswa" && <BukuIndukSiswa showToast={showToast} classes={classes} />}{tab === "transkrip" && <BukuIndukTranskrip showToast={showToast} />}</>;
}

function ManajemenAkunPage({ showToast, classes }) {
  const [tab, setTab] = useState("generate");
  const [target, setTarget] = useState("siswa");
  const [filterClass, setFilterClass] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [settingsData, setSettingsData] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [searchAcc, setSearchAcc] = useState("");
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => { axios.get(`${API}/settings`).then(({ data }) => setSettingsData(data)).catch(() => {}); }, []);
  const loadAccounts = () => axios.get(`${API}/accounts`).then(({ data }) => setAccounts(data)).catch(() => showToast("Gagal memuat daftar akun"));
  useEffect(() => { if (tab === "reset") loadAccounts(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const generate = async () => {
    setGenerating(true);
    try { const { data } = await axios.post(`${API}/accounts/mass-generate`, { target, class_name: target === "siswa" ? filterClass : "" }); setResult(data.created); showToast(`${data.count} akun baru berhasil dibuat`); }
    catch (err) { showToast(errMsg(err, "Gagal generate akun")); } finally { setGenerating(false); }
  };
  const resetPw = async () => {
    if (!selectedAcc || newPassword.length < 6) return showToast("Pilih akun & isi password baru (min 6 karakter)");
    try { await axios.put(`${API}/accounts/${selectedAcc.id}/reset-password`, { password: newPassword }); showToast("Password berhasil direset"); setNewPassword(""); setSelectedAcc(null); }
    catch (err) { showToast(errMsg(err, "Gagal reset password")); }
  };
  const filteredAcc = accounts.filter((a) => a.name.toLowerCase().includes(searchAcc.toLowerCase()) || a.username.toLowerCase().includes(searchAcc.toLowerCase()));
  const TARGET_LABEL = { guru: "Guru", siswa: "Siswa", sekretaris: "Sekretaris Kelas", pembina: "Pembina Ekskul" };
  return <><PageTitle eyebrow="Tata Usaha" title="Manajemen Akun" description="Buat akun massal, cetak kartu akses, dan reset password." /><div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16 }}><button className="secondary-button" style={tab === "generate" ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setTab("generate")}><Wand2 size={16} /> Generate Akun Massal</button><button className="secondary-button" style={tab === "reset" ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setTab("reset")}><RefreshCw size={16} /> Reset Password</button></div>
    {tab === "generate" && <>
      <section className="panel filter-grid no-print" style={{ marginBottom: 16 }}><label className="field">Target<select value={target} onChange={(e) => { setTarget(e.target.value); setResult(null); }}><option value="siswa">Siswa</option><option value="guru">Guru</option><option value="sekretaris">Sekretaris Kelas</option><option value="pembina">Pembina Ekskul</option></select></label>{target === "siswa" && <label className="field">Kelas (opsional)<select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}><option value="">Semua kelas</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>}<button className="primary-button filter-button" onClick={generate} disabled={generating}><Wand2 size={16} /> {generating ? "Memproses..." : "Generate akun"}</button></section>
      {result && <section className="panel no-print" style={{ marginBottom: 16 }}><PanelHeading title="Akun baru dibuat" subtitle={`${result.length} akun \u00b7 catat/cetak sekarang, password tidak bisa dilihat lagi setelah ini`} action={result.length > 0 && <button className="primary-button" onClick={() => window.print()}><Printer size={16} /> Cetak Kartu Akses</button>} /><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Password</th><th>Ket.</th></tr></thead><tbody>{result.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.username}</td><td>{r.password}</td><td>{r.keterangan}</td></tr>)}{!result.length && <tr><td colSpan="4">Tidak ada akun baru (semua sudah punya akun).</td></tr>}</tbody></table></div></section>}
      {result && result.length > 0 && <div className="report-print-area"><div className="kop-sekolah">{settingsData.logo_base64 ? <img src={settingsData.logo_base64} alt="Kop Surat" className="kop-sekolah-banner" /> : <div><h3>{settingsData.school}</h3><p>{settingsData.address}</p></div>}</div><div className="judul-laporan">Kartu Akses Login - {TARGET_LABEL[target]}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>{result.map((r, i) => <div key={i} style={{ border: "1px dashed #000", padding: 10, fontSize: 11 }}><strong>{r.name}</strong><br />{r.keterangan}<br />Username: <b>{r.username}</b><br />Password: <b>{r.password}</b></div>)}</div></div>}
    </>}
    {tab === "reset" && <section className="panel no-print"><label className="field full" style={{ marginBottom: 12 }}>Cari akun (nama/username)<input value={searchAcc} onChange={(e) => setSearchAcc(e.target.value)} placeholder="Ketik nama atau username..." /></label><div className="table-wrap"><table><thead><tr><th></th><th>Nama</th><th>Username</th><th>Role</th></tr></thead><tbody>{filteredAcc.slice(0, 50).map((a) => <tr key={a.id}><td><input type="radio" checked={selectedAcc?.id === a.id} onChange={() => setSelectedAcc(a)} /></td><td>{a.name}</td><td>{a.username}</td><td>{a.role}</td></tr>)}{!filteredAcc.length && <tr><td colSpan="4">Tidak ada akun ditemukan.</td></tr>}</tbody></table></div>{selectedAcc && <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "flex-end" }}><label className="field">Password baru untuk {selectedAcc.name}<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min 6 karakter" /></label><button className="primary-button" onClick={resetPw}><Save size={16} /> Reset password</button></div>}</section>}
  </>;
}

const SURAT_TEMPLATES = {
  "Keterangan Aktif": (s, set, nomor, keperluan) => `Yang bertanda tangan di bawah ini menerangkan bahwa siswa berikut adalah benar merupakan siswa aktif di ${set.school || "sekolah kami"}:\n\nNama: ${s?.name || "-"}\nNISN: ${s?.nisn || "-"}\nKelas: ${s?.class_name || "-"}\nTempat, Tanggal Lahir: ${s?.tempat_lahir || "-"}, ${s?.tanggal_lahir || "-"}\n\nSurat keterangan ini dibuat untuk keperluan: ${keperluan || "-"}.`,
  "Keterangan Kelakuan Baik": (s, set, nomor, keperluan) => `Yang bertanda tangan di bawah ini menerangkan bahwa siswa:\n\nNama: ${s?.name || "-"}\nNISN: ${s?.nisn || "-"}\nKelas: ${s?.class_name || "-"}\n\nSelama menjadi siswa di ${set.school || "sekolah kami"}, yang bersangkutan berkelakuan baik dan tidak pernah melakukan pelanggaran berat tata tertib sekolah.\n\nSurat keterangan ini dibuat untuk keperluan: ${keperluan || "-"}.`,
  "Keterangan Pindah/Mutasi": (s, set, nomor, keperluan) => `Yang bertanda tangan di bawah ini menerangkan bahwa siswa:\n\nNama: ${s?.name || "-"}\nNISN: ${s?.nisn || "-"}\nKelas: ${s?.class_name || "-"}\n\nbenar terdaftar sebagai siswa di ${set.school || "sekolah kami"} dan bermaksud pindah/mutasi ke sekolah lain.\n\nKeperluan: ${keperluan || "-"}.`,
};

function romawiKelas(kelas) {
  const map = { "7": "VII", "8": "VIII", "9": "IX" };
  const angka = String(kelas || "").match(/\d/);
  return angka ? (map[angka[0]] || kelas) : (kelas || "-");
}

const KOTA_KECAMATAN = "Kecamatan Cileungsi Kabupaten Bogor";

function SuratGeneratorTab({ showToast, students, teachers, settingsData }) {
  const JENIS_LIST = ["Keterangan Kelakuan Baik", "Keterangan Pindah Sekolah", "Keterangan Siswa", "Panggilan Orang Tua", "Keterangan Mengajar", "Surat Tugas"];
  const [jenis, setJenis] = useState(JENIS_LIST[0]);
  const [nomor, setNomor] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showPesertaPicker, setShowPesertaPicker] = useState(false);
  const [pesertaSearch, setPesertaSearch] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [extra, setExtra] = useState({});
  const [showPrint, setShowPrint] = useState(false);
  const isGuruSurat = jenis === "Keterangan Mengajar" || jenis === "Surat Tugas";
  const isMultiSiswa = jenis === "Keterangan Siswa";
  const student = students.find((s) => s.name === studentName);
  const teacher = teachers.find((t) => t.name === teacherName);
  const togglePeserta = (name) => setSelectedStudents((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);
  const set = (key, val) => setExtra({ ...extra, [key]: val });
  const canPreview = isGuruSurat ? !!teacherName : (isMultiSiswa ? selectedStudents.length > 0 : !!studentName);
  const buatSurat = () => { if (!canPreview) { showToast(isMultiSiswa ? "Pilih minimal 1 siswa" : "Pilih nama terlebih dahulu"); return; } setShowPrint(true); };
  const today_ = new Date();
  const tanggalCetak = `Cileungsi, ${today_.getDate()} ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][today_.getMonth()]} ${today_.getFullYear()}`;
  const sekolahKec = `${settingsData.school} ${KOTA_KECAMATAN}`;

  return <>
    <section className="panel filter-grid no-print" style={{ marginBottom: 16 }}>
      <label className="field">Jenis Surat<select value={jenis} onChange={(e) => { setJenis(e.target.value); setShowPrint(false); setExtra({}); }}>{JENIS_LIST.map((j) => <option key={j} value={j}>{j}</option>)}</select></label>
      <label className="field">Nomor Surat<input value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="Contoh: 169/SATDIK-SMP/I.1/O.2026" /></label>
    </section>

    {!isGuruSurat && !isMultiSiswa && <section className="panel no-print" style={{ marginBottom: 16 }}>
      <label className="field full">Pilih siswa<select value={studentName} onChange={(e) => setStudentName(e.target.value)}><option value="">- Pilih siswa -</option>{students.map((s) => <option key={s.id} value={s.name}>{s.name} ({s.class_name})</option>)}</select></label>
      {jenis === "Keterangan Pindah Sekolah" && <div className="form-grid">
        <label className="field">Tahun Pelajaran<input value={extra.tahun_pelajaran || ""} onChange={(e) => set("tahun_pelajaran", e.target.value)} placeholder="2025/2026" /></label>
        <label className="field full">Sekolah Tujuan (nama + alamat lengkap)<input value={extra.sekolah_tujuan || ""} onChange={(e) => set("sekolah_tujuan", e.target.value)} placeholder="PKBM SETYA DHARMA Jln. Narogong Kp. Rawahingkik Rt 002/001 Ds. Limusnunggal Kec. Cileungsi Kab. Bogor" /></label>
        <label className="field full">Alasan Pindah<input value={extra.alasan || ""} onChange={(e) => set("alasan", e.target.value)} placeholder="Permintaan Orang Tua/Pindah Rumah" /></label>
      </div>}
      {jenis === "Panggilan Orang Tua" && <div className="form-grid">
        <label className="field">Hari/Tanggal<input value={extra.hari_tanggal || ""} onChange={(e) => set("hari_tanggal", e.target.value)} placeholder="Selasa, 02 Juni 2026" /></label>
        <label className="field">Waktu<input value={extra.waktu || ""} onChange={(e) => set("waktu", e.target.value)} placeholder="Pukul 14.00 WIB" /></label>
        <label className="field">Tempat<input value={extra.tempat || "SMP PGRI Gandoang"} onChange={(e) => set("tempat", e.target.value)} /></label>
        <label className="field">Nama Wali Kelas<input value={extra.wali_kelas_nama || ""} onChange={(e) => set("wali_kelas_nama", e.target.value)} /></label>
      </div>}
    </section>}

    {isMultiSiswa && <section className="panel no-print" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 10 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#53645a", display: "block", marginBottom: 8 }}>Peserta ({selectedStudents.length} dipilih)</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>{selectedStudents.map((nm) => <span key={nm} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#edf5ef", color: "#176b4a", border: "1px solid #d8e8dc", borderRadius: 20, padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>{nm}<button onClick={() => togglePeserta(nm)} style={{ border: 0, background: "none", cursor: "pointer", color: "#176b4a", display: "flex" }}><X size={12} /></button></span>)}</div><button className="secondary-button" onClick={() => setShowPesertaPicker(true)}><Users size={16} /> Pilih siswa</button></div>
      {showPesertaPicker && <div className="panel" style={{ marginBottom: 12 }}><PanelHeading title="Pilih siswa" action={<button className="icon-button" onClick={() => setShowPesertaPicker(false)}><X size={16} /></button>} /><label className="field full" style={{ marginBottom: 10 }}>Cari nama<input value={pesertaSearch} onChange={(e) => setPesertaSearch(e.target.value)} /></label><div className="table-wrap"><table><thead><tr><th></th><th>Nama</th><th>Kelas</th></tr></thead><tbody>{students.filter((s) => s.name.toLowerCase().includes(pesertaSearch.toLowerCase())).map((s) => <tr key={s.id}><td><input type="checkbox" checked={selectedStudents.includes(s.name)} onChange={() => togglePeserta(s.name)} /></td><td>{s.name}</td><td>{s.class_name}</td></tr>)}</tbody></table></div></div>}
      <div className="form-grid">
        <label className="field full">Uraian Kegiatan (lengkap)<input value={extra.nama_kegiatan || ""} onChange={(e) => set("nama_kegiatan", e.target.value)} placeholder='mengikuti LKBB dalam acara Lomba Festival "Anderpati Marwati Nipuan" pada Open House SMK Prima Mulia' /></label>
        <label className="field">Hari/Tanggal<input value={extra.hari_tanggal || ""} onChange={(e) => set("hari_tanggal", e.target.value)} placeholder="Jumat, 31 Januari 2026" /></label>
        <label className="field">Waktu<input value={extra.waktu || ""} onChange={(e) => set("waktu", e.target.value)} placeholder="Pukul 07.00 WIB" /></label>
        <label className="field">Tempat<input value={extra.tempat || ""} onChange={(e) => set("tempat", e.target.value)} /></label>
      </div>
    </section>}

    {isGuruSurat && <section className="panel no-print" style={{ marginBottom: 16 }}>
      <label className="field full">Pilih guru<select value={teacherName} onChange={(e) => setTeacherName(e.target.value)}><option value="">- Pilih guru -</option>{teachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</select></label>
      {jenis === "Keterangan Mengajar" && <div className="form-grid">
        <label className="field">No. NUPTK<input value={extra.nuptk || ""} onChange={(e) => set("nuptk", e.target.value)} /></label>
        <label className="field">Tempat, Tanggal Lahir<input value={extra.ttl || ""} onChange={(e) => set("ttl", e.target.value)} placeholder="Jakarta, 06 Mei 1980" /></label>
        <label className="field">Pendidikan / Jurusan<input value={extra.pendidikan || ""} onChange={(e) => set("pendidikan", e.target.value)} placeholder="S 1 / Pendidikan Bahasa dan Sastra Indonesia" /></label>
        <label className="field">Jumlah Jam Mengajar<input value={extra.jam_mengajar || ""} onChange={(e) => set("jam_mengajar", e.target.value)} placeholder="24 Jam" /></label>
      </div>}
      {jenis === "Surat Tugas" && <div className="form-grid">
        <label className="field">Tempat Tgl Lahir<input value={extra.ttl || ""} onChange={(e) => set("ttl", e.target.value)} placeholder="Bekasi, 21 Agustus 1993" /></label>
        <label className="field">Jabatan<input value={extra.jabatan || ""} onChange={(e) => set("jabatan", e.target.value)} placeholder="Guru Bahasa Indonesia" /></label>
        <label className="field full">Alamat (guru)<input value={extra.alamat || ""} onChange={(e) => set("alamat", e.target.value)} placeholder="Kp. Gaok Rt 004/001 Ds. Muktijaya Kec. Setu Kab. Bekasi" /></label>
        <label className="field full">Uraian Kegiatan (lengkap)<input value={extra.nama_kegiatan || ""} onChange={(e) => set("nama_kegiatan", e.target.value)} placeholder="Bimtek Peningkatan Kompetensi Guru dalam Menggunakan Metode Pembelajaran..." /></label>
        <label className="field">Hari/Tanggal<input value={extra.hari_tanggal || ""} onChange={(e) => set("hari_tanggal", e.target.value)} placeholder="Selasa s.d Jumat / 5 s.d 8 Mei 2026" /></label>
        <label className="field">Check In<input value={extra.checkin || ""} onChange={(e) => set("checkin", e.target.value)} placeholder="Senin 5 Mei 2026 Pukul 14.00 WIB" /></label>
        <label className="field">Check Out<input value={extra.checkout || ""} onChange={(e) => set("checkout", e.target.value)} placeholder="Jumat 8 Mei 2026 Pukul 12.00 WIB" /></label>
        <label className="field full">Tempat<input value={extra.tempat || ""} onChange={(e) => set("tempat", e.target.value)} placeholder="Hotel Bale Arimbi Jl. Raya Puncak No. 21 Bogor, Megamendung, Puncak, Jawa Barat" /></label>
      </div>}
    </section>}

    <div className="no-print" style={{ marginBottom: 16 }}><button className="primary-button" onClick={buatSurat}><FileText size={16} /> Buat &amp; Pratinjau Surat</button></div>

    {showPrint && <>
      <div className="rekap-toolbar no-print"><button className="secondary-button" onClick={() => setShowPrint(false)}><X size={16} /> Tutup</button><button className="primary-button" onClick={() => window.print()}><Printer size={16} /> Cetak / Download PDF</button></div>
      <div className="report-print-area">
        <div className="kop-sekolah">{settingsData.logo_base64 ? <img src={settingsData.logo_base64} alt="Kop Surat" className="kop-sekolah-banner" /> : <div><h3>{settingsData.school}</h3><p>{settingsData.address}</p></div>}</div>

        {jenis === "Keterangan Kelakuan Baik" && <>
          <div className="judul-laporan">SURAT KETERANGAN KELAKUAN BAIK</div>
          <p style={{ fontSize: 12, textAlign: "center", marginTop: -6 }}>Nomor : {nomor || "-"}</p>
          <p style={{ fontSize: 12, marginTop: 20 }}>Kepala {sekolahKec} menerangkan bahwa :</p>
          <table className="meta-table" style={{ marginTop: 10 }}><tbody>
            <tr><td className="meta-label">Nama</td><td>: {student?.name}</td></tr>
            <tr><td className="meta-label">Tempat, Tgl. Lahir</td><td>: {student?.tempat_lahir || "-"}, {student?.tanggal_lahir || "-"}</td></tr>
            <tr><td className="meta-label">Kelas</td><td>: {romawiKelas(student?.class_name)}</td></tr>
            <tr><td className="meta-label">Nomor Induk</td><td>: {student?.nomor_induk || "-"}</td></tr>
            <tr><td className="meta-label">No. NISN</td><td>: {student?.nisn || "-"}</td></tr>
            <tr><td className="meta-label">Alamat Rumah</td><td>: {student?.alamat || "-"}</td></tr>
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 16, lineHeight: 1.7 }}>Berdasarkan catatan pada kami bahwa peserta didik tersebut &ldquo;berkelakuan baik&rdquo; dan tidak pernah mencemarkan nama baik sekolah serta tidak pernah terlibat tindak kriminal, tawuran, penggunaan obat-obatan terlarang (narkotika, narkoba dsb) yang dapat merusak moral dan kesehatan.</p>
          <p style={{ fontSize: 12, marginTop: 10 }}>Demikian surat keterangan kelakuan baik ini agar dapat dipergunakan sebagaimana mestinya.</p>
        </>}

        {jenis === "Keterangan Pindah Sekolah" && <>
          <div className="judul-laporan">SURAT KETERANGAN PINDAH SEKOLAH</div>
          <p style={{ fontSize: 12, textAlign: "center", marginTop: -6 }}>No: {nomor || "-"}</p>
          <p style={{ fontSize: 12, marginTop: 20 }}>Kepala {sekolahKec} menerangkan bahwa :</p>
          <table className="meta-table" style={{ marginTop: 10 }}><tbody>
            <tr><td className="meta-label">Nama</td><td>: {student?.name}</td></tr>
            <tr><td className="meta-label">Tempat Tgl. Lahir</td><td>: {student?.tempat_lahir || "-"}, {student?.tanggal_lahir || "-"}</td></tr>
            <tr><td className="meta-label">Kelas</td><td>: {romawiKelas(student?.class_name)}</td></tr>
            <tr><td className="meta-label">Nomor Induk</td><td>: {student?.nomor_induk || "-"}</td></tr>
            <tr><td className="meta-label">Nomor NISN</td><td>: {student?.nisn || "-"}</td></tr>
            <tr><td className="meta-label">Tahun Pelajaran</td><td>: {extra.tahun_pelajaran || "-"}</td></tr>
            <tr><td className="meta-label">Alamat Rumah</td><td>: {student?.alamat || "-"}</td></tr>
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 10 }}>Sesuai dengan permintaan dari Orang Tua/Wali :</p>
          <table className="meta-table"><tbody>
            <tr><td className="meta-label">Nama Ayah</td><td>: {student?.nama_ayah || "-"}</td></tr>
            <tr><td className="meta-label">Pekerjaan</td><td>: {student?.pekerjaan_ayah || "-"}</td></tr>
            <tr><td className="meta-label">Nama Ibu</td><td>: {student?.nama_ibu || "-"}</td></tr>
            <tr><td className="meta-label">Pekerjaan</td><td>: {student?.pekerjaan_ibu || "-"}</td></tr>
            <tr><td className="meta-label">Alamat Rumah</td><td>: {student?.alamat || "-"}</td></tr>
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 12, lineHeight: 1.7 }}>Telah mengajukan permohonan pindah Ke {extra.sekolah_tujuan || "-"}, dengan alasan {extra.alasan || "-"}. Bersama ini saya lampirkan Surat Keterangan Lahir (Akte).</p>
          <p style={{ fontSize: 12 }}>Demikian surat ini kami buat untuk dapat dipergunakan sebagaimana mestinya.</p>
        </>}

        {jenis === "Keterangan Siswa" && <>
          <div className="judul-laporan">SURAT KETERANGAN</div>
          <p style={{ fontSize: 12, textAlign: "center", marginTop: -6 }}>NO : {nomor || "-"}</p>
          <p style={{ fontSize: 12, marginTop: 20 }}>Kepala {sekolahKec}, menerangkan bahwa :</p>
          <table className="table-print" style={{ marginTop: 10 }}><thead><tr><th>No</th><th>No. Induk</th><th>Nama</th><th>Tempat, Tgl Lahir</th><th>L/P</th><th>Kelas</th></tr></thead><tbody>
            {selectedStudents.map((nm, i) => { const s = students.find((x) => x.name === nm); return <tr key={nm}><td className="text-center">{i + 1}</td><td className="text-center">{s?.nomor_induk || "-"}</td><td>{nm}</td><td className="text-center">{s?.tempat_lahir || "-"}, {s?.tanggal_lahir || "-"}</td><td className="text-center">{(s?.jenis_kelamin || "").startsWith("L") ? "L" : (s?.jenis_kelamin || "").startsWith("P") ? "P" : "-"}</td><td className="text-center">{romawiKelas(s?.class_name)}</td></tr>; })}
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 12, lineHeight: 1.7 }}>Nama-nama tersebut adalah benar-benar siswa {settingsData.school} yang masih aktif. Dan akan {extra.nama_kegiatan || "-"}, yang akan dilaksanakan pada :</p>
          <p style={{ fontSize: 12 }}>Hari/Tanggal : {extra.hari_tanggal || "-"}<br />Waktu : {extra.waktu || "-"}<br />Tempat : {extra.tempat || "-"}</p>
          <p style={{ fontSize: 12 }}>Demikian surat keterangan ini dibuat dengan sebenarnya dan agar digunakan sebagaimana mestinya.</p>
        </>}

        {jenis === "Panggilan Orang Tua" && <>
          <div className="judul-laporan">SURAT PANGGILAN ORANG TUA SISWA</div>
          <p style={{ fontSize: 12, textAlign: "center", marginTop: -6 }}>NO : {nomor || "-"}</p>
          <p style={{ fontSize: 12, marginTop: 20, lineHeight: 1.7 }}>Kepala Sekolah {sekolahKec} melalui wali kelas memanggil orang tua murid dari :</p>
          <table className="meta-table" style={{ marginTop: 10 }}><tbody>
            <tr><td className="meta-label">Nama</td><td>: {student?.name}</td></tr>
            <tr><td className="meta-label">Kelas</td><td>: {romawiKelas(student?.class_name)}</td></tr>
            <tr><td className="meta-label">Tempat, Tgl.Lahir</td><td>: {student?.tempat_lahir || "-"}, {student?.tanggal_lahir || "-"}</td></tr>
            <tr><td className="meta-label">No. Induk/NISN</td><td>: {student?.nomor_induk || "-"}/{student?.nisn || "-"}</td></tr>
            <tr><td className="meta-label">Alamat Rumah</td><td>: {student?.alamat || "-"}</td></tr>
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 12 }}>Agar menghadap kami pada:</p>
          <p style={{ fontSize: 12 }}>Hari/tanggal : {extra.hari_tanggal || "-"}<br />Waktu : {extra.waktu || "-"}<br />Tempat : {extra.tempat || "SMP PGRI Gandoang"}</p>
          <p style={{ fontSize: 12, marginTop: 10 }}>Mengingat pentingnya hal tersebut maka kami mengharapkan Bapak/Ibu untuk datang tepat pada waktu yang telah di tentukan.</p>
          <p style={{ fontSize: 12 }}>Demikian surat panggilan ini saya sampaikan semoga Bapak/Ibu dapat hadir tepat pada waktunya.</p>
        </>}

        {jenis === "Keterangan Mengajar" && <>
          <div className="judul-laporan">SURAT KETERANGAN MENGAJAR</div>
          <p style={{ fontSize: 12, textAlign: "center", marginTop: -6 }}>Nomor : {nomor || "-"}</p>
          <p style={{ fontSize: 12, marginTop: 20 }}>Yang bertanda tangan dibawah ini :</p>
          <table className="meta-table"><tbody>
            <tr><td className="meta-label">1. Nama</td><td>: {settingsData.principal}</td></tr>
            <tr><td className="meta-label">2. NIP</td><td>: -</td></tr>
            <tr><td className="meta-label">3. Jabatan</td><td>: Kepala Sekolah</td></tr>
            <tr><td className="meta-label">4. Unit Sekolah</td><td>: {settingsData.school}</td></tr>
            <tr><td className="meta-label">5. Instansi</td><td>: Dinas Pendidikan Kabupaten Bogor</td></tr>
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 10 }}>Dengan ini menyatakan :</p>
          <table className="meta-table"><tbody>
            <tr><td className="meta-label">1. Nama</td><td>: {teacher?.name}</td></tr>
            <tr><td className="meta-label">2. No. NUPTK</td><td>: {extra.nuptk || "-"}</td></tr>
            <tr><td className="meta-label">3. Tempat Tanggal Lahir</td><td>: {extra.ttl || "-"}</td></tr>
            <tr><td className="meta-label">4. Pendidikan / Jurusan</td><td>: {extra.pendidikan || "-"}</td></tr>
            <tr><td className="meta-label">5. Jumlah Jam Mengajar</td><td>: {extra.jam_mengajar || "-"}</td></tr>
            <tr><td className="meta-label">6. Unit Kerja</td><td>: {settingsData.school}</td></tr>
            <tr><td className="meta-label">7. Instansi</td><td>: Dinas Pendidikan Kabupaten Bogor</td></tr>
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 12 }}>Demikian Surat Keterangan ini kami buat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.</p>
        </>}

        {jenis === "Surat Tugas" && <>
          <div className="judul-laporan">SURAT TUGAS</div>
          <p style={{ fontSize: 12, textAlign: "center", marginTop: -6 }}>NO : {nomor || "-"}</p>
          <p style={{ fontSize: 12, marginTop: 20 }}>Kepala {sekolahKec}, menugaskan kepada :</p>
          <table className="meta-table" style={{ marginTop: 10 }}><tbody>
            <tr><td className="meta-label">Nama</td><td>: {teacher?.name}</td></tr>
            <tr><td className="meta-label">Tempat Tgl Lahir</td><td>: {extra.ttl || "-"}</td></tr>
            <tr><td className="meta-label">Jabatan</td><td>: {extra.jabatan || "-"}</td></tr>
            <tr><td className="meta-label">Unit Kerja</td><td>: {settingsData.school}</td></tr>
            <tr><td className="meta-label">Alamat</td><td>: {extra.alamat || "-"}</td></tr>
          </tbody></table>
          <p style={{ fontSize: 12, marginTop: 12, lineHeight: 1.7 }}>Untuk melaksanakan kegiatan {extra.nama_kegiatan || "-"}, yang dilaksanakan pada :</p>
          <p style={{ fontSize: 12 }}>Hari/Tanggal : {extra.hari_tanggal || "-"}<br />Check In : {extra.checkin || "-"}<br />Check Out : {extra.checkout || "-"}<br />Tempat : {extra.tempat || "-"}</p>
          <p style={{ fontSize: 12 }}>Demikian surat tugas ini diberikan agar dapat dilaksanakan dengan penuh tanggung jawab dan dapat dipergunakan sebagaimana mestinya.</p>
        </>}

        <div className="ttd-kolom-bawah"><p>{tanggalCetak}<br />{jenis === "Panggilan Orang Tua" ? `Wali Kelas ${romawiKelas(student?.class_name)}` : "Kepala Sekolah,"}</p><div className="ttd-space"></div><p><b>{jenis === "Panggilan Orang Tua" ? (extra.wali_kelas_nama || "............................") : settingsData.principal}</b></p></div>

        {jenis === "Surat Tugas" && <div style={{ marginTop: 30, fontSize: 12 }}>
          <p>Diselenggarakan di : ______________________</p>
          <p>Pada Tanggal : ______________________</p>
          <p style={{ marginTop: 20 }}>Ketua Penyelenggara,</p>
          <p style={{ marginTop: 40 }}>______________________________<br />NIP.</p>
        </div>}
      </div>
    </>}
  </>;
}

function PersuratanPage({ showToast }) {
  const [tab, setTab] = useState("generator");
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [settingsData, setSettingsData] = useState({});
  useEffect(() => { axios.get(`${API}/masters`).then(({ data }) => { setStudents(data.students || []); setTeachers(data.teachers || []); }).catch(() => {}); axios.get(`${API}/settings`).then(({ data }) => setSettingsData(data)).catch(() => {}); }, []);
  return <><PageTitle eyebrow="Tata Usaha" title="Persuratan Digital" description="Buat surat resmi otomatis dan kelola arsip surat masuk/keluar." /><div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}><button className="secondary-button" style={tab === "generator" ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setTab("generator")}><Wand2 size={16} /> Buat Surat</button><button className="secondary-button" style={tab === "masuk" ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setTab("masuk")}><Mail size={16} /> Arsip Surat Masuk</button><button className="secondary-button" style={tab === "keluar" ? { background: "#176b4a", color: "#fff" } : {}} onClick={() => setTab("keluar")}><Send size={16} /> Arsip Surat Keluar</button></div>{tab === "generator" && <SuratGeneratorTab showToast={showToast} students={students} teachers={teachers} settingsData={settingsData} />}{tab === "masuk" && <ArsipSuratTab showToast={showToast} jenis="masuk" />}{tab === "keluar" && <ArsipSuratTab showToast={showToast} jenis="keluar" />}</>;
}

function ArsipSuratTab({ showToast, jenis }) {
  const endpoint = jenis === "keluar" ? "surat-keluar" : "surat-masuk";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ tanggal: today(), nomor: "", perihal: "", tujuan: "", asal: "", file_base64: "" });
  const load = () => axios.get(`${API}/${endpoint}`).then(({ data }) => setRows(data)).catch(() => showToast("Gagal memuat arsip surat"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, file_base64: reader.result });
    reader.readAsDataURL(file);
  };
  const submit = async () => {
    if (!form.nomor.trim() || !form.perihal.trim()) return showToast("Nomor dan perihal wajib diisi");
    try {
      const payload = jenis === "keluar" ? { tanggal: form.tanggal, nomor: form.nomor, perihal: form.perihal, tujuan: form.tujuan, file_base64: form.file_base64 } : { tanggal: form.tanggal, nomor: form.nomor, perihal: form.perihal, asal: form.asal, file_base64: form.file_base64 };
      await axios.post(`${API}/${endpoint}`, payload);
      showToast("Surat tersimpan"); setForm({ tanggal: today(), nomor: "", perihal: "", tujuan: "", asal: "", file_base64: "" }); load();
    } catch (err) { showToast(errMsg(err, "Gagal menyimpan surat")); }
  };
  const remove = async (id) => {
    if (!window.confirm("Hapus data surat ini?")) return;
    try { await axios.delete(`${API}/${endpoint}/${id}`); showToast("Data dihapus"); load(); } catch { showToast("Gagal menghapus data"); }
  };
  return <><section className="panel" style={{ marginBottom: 16 }}><div className="form-grid"><label className="field">Tanggal<input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></label><label className="field">Nomor Surat<input value={form.nomor} onChange={(e) => setForm({ ...form, nomor: e.target.value })} /></label><label className="field full">Perihal<input value={form.perihal} onChange={(e) => setForm({ ...form, perihal: e.target.value })} /></label>{jenis === "keluar" ? <label className="field">Tujuan<input value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} /></label> : <label className="field">Asal Surat<input value={form.asal} onChange={(e) => setForm({ ...form, asal: e.target.value })} /></label>}<label className="field">Scan surat (opsional)<input type="file" accept="image/*,.pdf" onChange={handleFile} /></label></div><button className="primary-button" style={{ marginTop: 12 }} onClick={submit}><Save size={16} /> Simpan</button></section><section className="panel"><div className="table-wrap"><table><thead><tr><th>Tgl</th><th>Nomor</th><th>Perihal</th><th>{jenis === "keluar" ? "Tujuan" : "Asal"}</th><th>Scan</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.tanggal}</td><td>{r.nomor}</td><td>{r.perihal}</td><td>{jenis === "keluar" ? r.tujuan : r.asal}</td><td>{r.file_base64 ? <a href={r.file_base64} target="_blank" rel="noreferrer">Lihat</a> : "-"}</td><td><button className="icon-button" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}{!rows.length && <tr><td colSpan="6">Belum ada arsip surat.</td></tr>}</tbody></table></div></section></>;
}

function LaporanPage({ showToast }) {
  const [dateFrom, setDateFrom] = useState(`${today().slice(0, 7)}-01`);
  const [dateTo, setDateTo] = useState(today());
  const downloadBlob = async (url, filename) => {
    try { const res = await axios.get(url, { responseType: "blob" }); const objUrl = URL.createObjectURL(res.data); const link = document.createElement("a"); link.href = objUrl; link.download = filename; link.click(); URL.revokeObjectURL(objUrl); showToast("File berhasil diunduh"); }
    catch { showToast("Gagal mengunduh laporan"); }
  };
  return <><PageTitle eyebrow="Tata Usaha" title="Laporan" description="Unduh rekapitulasi data dalam format Excel." />
    <section className="panel" style={{ marginBottom: 16 }}><PanelHeading title="Rekap Buku Induk" subtitle="Seluruh data biodata siswa" /><button className="primary-button" onClick={() => downloadBlob(`${API}/reports/export-buku-induk`, "buku-induk.xlsx")}><FileDown size={16} /> Unduh Excel</button></section>
    <section className="panel" style={{ marginBottom: 16 }}><PanelHeading title="Rekap Absensi Guru" subtitle="Dari data Absensi &amp; Jam Mengajar Piket" /><div className="filter-grid"><label className="field">Dari tanggal<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label><label className="field">Sampai tanggal<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label><button className="primary-button filter-button" onClick={() => downloadBlob(`${API}/reports/export-absensi-guru?date_from=${dateFrom}&date_to=${dateTo}`, "rekap-absensi-guru.xlsx")}><FileDown size={16} /> Unduh Excel</button></div></section>
    <section className="panel"><PanelHeading title="Rekap Absensi Siswa" subtitle="Dari data Absen Sekretaris Kelas" /><div className="filter-grid"><label className="field">Dari tanggal<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label><label className="field">Sampai tanggal<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label><button className="primary-button filter-button" onClick={() => downloadBlob(`${API}/reports/export-absensi-siswa?date_from=${dateFrom}&date_to=${dateTo}`, "rekap-absensi-siswa.xlsx")}><FileDown size={16} /> Unduh Excel</button></div></section>
  </>;
}

const TU_NAV = [
  { id: "buku-induk", label: "Buku Induk", icon: BookOpen },
  { id: "kelola-siswa", label: "Kelola Siswa", icon: Users },
  { id: "kelola-kelas", label: "Kelola Kelas", icon: School },
  { id: "manajemen-akun", label: "Manajemen Akun", icon: UserCog },
  { id: "persuratan", label: "Persuratan", icon: FileText },
  { id: "laporan", label: "Laporan", icon: FileDown },
];

function TuApp({ user, showToast, toast, onLogout, masters, addMaster, updateMaster, deleteMaster, importMaster, onReloadMasters }) {
  const [active, setActive] = useState("buku-induk");
  const classes = (masters?.classes || []).map((c) => c.name);
  return <MobileShell subtitle="Tata Usaha" roleLabel="Tata Usaha" user={user} navItems={TU_NAV} active={active} onNavClick={setActive} onLogout={onLogout} toast={toast}>
    {active === "buku-induk" && <BukuIndukPage showToast={showToast} classes={classes} />}
    {active === "kelola-siswa" && masters && <Master title="Kelola Siswa" icon={Users} rows={masters.students} addLabel="Tambah siswa" onAdd={addMaster("students", "Data siswa diperbarui")} onUpdate={updateMaster("students", "Data siswa diperbarui")} onDelete={deleteMaster("students", "Data siswa dihapus")} classes={classes} onImport={importMaster("students", "Siswa")} />}
    {active === "kelola-kelas" && masters && <KelasManager rows={masters.classes} showToast={showToast} onReload={onReloadMasters} />}
    {active === "manajemen-akun" && <ManajemenAkunPage showToast={showToast} classes={classes} />}
    {active === "persuratan" && <PersuratanPage showToast={showToast} />}
    {active === "laporan" && <LaporanPage showToast={showToast} />}
  </MobileShell>;
}

const SISWA_NAV = [
  { id: "biodata", label: "Biodata Saya", icon: UserRound },
  { id: "kartu", label: "Kartu Pelajar", icon: IdCard },
  { id: "nilai", label: "Transkrip Nilai", icon: GraduationCap },
];

function SiswaBiodata({ showToast, studentId }) {
  const [data, setData] = useState(null);
  useEffect(() => { if (studentId) axios.get(`${API}/students/${studentId}`).then(({ data }) => setData(data)).catch(() => showToast("Gagal memuat biodata")); }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <PageTitle eyebrow="Siswa" title="Biodata Saya" description="Memuat data..." />;
  const downloadPhoto = () => {
    const link = document.createElement("a");
    link.download = `Foto_${data.name.replace(/\s+/g, "_")}.jpg`;
    link.href = data.photo;
    link.click();
  };
  return <><PageTitle eyebrow="Siswa" title="Biodata Saya" description="Data ini dikelola oleh Tata Usaha. Hubungi TU untuk perubahan data." /><section className="panel" style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}><div>{data.photo ? <img src={data.photo} alt="Foto siswa" style={{ width: 110, height: 146, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", display: "block" }} /> : <div style={{ width: 110, height: 146, borderRadius: 8, border: "1px dashed #d8e2dc", display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa8a0", fontSize: 11, textAlign: "center" }}>Belum ada foto</div>}{data.photo && <button className="secondary-button" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={downloadPhoto}><FileDown size={15} /> Download Foto</button>}</div><table className="meta-table" style={{ flex: 1, minWidth: 240 }}><tbody>
    <tr><td className="meta-label">Nama</td><td>: {data.name}</td></tr>
    <tr><td className="meta-label">Kelas</td><td>: {data.class_name}</td></tr>
    <tr><td className="meta-label">Nomor Induk</td><td>: {data.nomor_induk || "-"}</td></tr>
    <tr><td className="meta-label">NISN</td><td>: {data.nisn || "-"}</td></tr>
    <tr><td className="meta-label">NIK</td><td>: {data.nik || "-"}</td></tr>
    <tr><td className="meta-label">Tempat, Tanggal Lahir</td><td>: {data.tempat_lahir || "-"}, {data.tanggal_lahir || "-"}</td></tr>
    <tr><td className="meta-label">Jenis Kelamin</td><td>: {data.jenis_kelamin || "-"}</td></tr>
    <tr><td className="meta-label">Alamat</td><td>: {data.alamat || "-"}</td></tr>
    <tr><td className="meta-label">Nama Ayah</td><td>: {data.nama_ayah || "-"}</td></tr>
    <tr><td className="meta-label">Nama Ibu</td><td>: {data.nama_ibu || "-"}</td></tr>
    <tr><td className="meta-label">Status</td><td>: {data.status || "Aktif"}</td></tr>
  </tbody></table></section></>;
}

function KartuPelajarPage({ showToast, studentId }) {
  const [data, setData] = useState(null);
  const [settingsData, setSettingsData] = useState({});
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    if (studentId) axios.get(`${API}/students/${studentId}`).then(({ data }) => setData(data)).catch(() => showToast("Gagal memuat data kartu pelajar"));
    axios.get(`${API}/settings`).then(({ data }) => setSettingsData(data)).catch(() => {});
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <PageTitle eyebrow="Siswa" title="Kartu Pelajar" description="Memuat data..." />;
  const downloadPng = async () => {
    setDownloading(true);
    try { await downloadElementAsPng("kartu-pelajar-canvas", `KartuPelajar_${data.name.replace(/\s+/g, "_")}.png`); }
    catch { showToast("Gagal membuat gambar kartu"); }
    setDownloading(false);
  };
  if (!settingsData.kartu_template_base64) {
    return <><PageTitle eyebrow="Siswa" title="Kartu Pelajar" description="Template kartu belum diunggah oleh Admin/TU." /><section className="panel"><p className="muted">Kartu Pelajar belum bisa ditampilkan karena template desainnya belum diunggah. Hubungi Tata Usaha untuk mengunggah template di menu Pengaturan.</p></section></>;
  }
  return <>
    <PageTitle eyebrow="Siswa" title="Kartu Pelajar" description="Kartu ini bisa dicetak atau disimpan sebagai gambar." action={<div className="no-print" style={{ display: "flex", gap: 8 }}><button className="secondary-button" onClick={downloadPng} disabled={downloading}><FileDown size={16} /> {downloading ? "Memproses..." : "Download PNG"}</button><button className="primary-button" onClick={() => window.print()}><Printer size={16} /> Cetak / PDF</button></div>} />
    <div className="report-print-area" style={{ background: "transparent", border: 0, boxShadow: "none", padding: 0 }}>
      <div className="kp-template-wrap" id="kartu-pelajar-canvas">
        <img className="kp-template-bg" src={settingsData.kartu_template_base64} alt="Template Kartu Pelajar" />
        <div className="kp-ov-photo">{data.photo && <img src={data.photo} alt="Foto siswa" />}</div>
        <div className="kp-ov-field kp-ov-nama">{data.name}</div>
        <div className="kp-ov-field kp-ov-nisn">{data.nisn || "-"}{data.nomor_induk ? ` / ${data.nomor_induk}` : ""}</div>
        <div className="kp-ov-field kp-ov-jk">{data.jenis_kelamin || "-"}</div>
        <div className="kp-ov-field kp-ov-ttl">{data.tempat_lahir || "-"}, {data.tanggal_lahir || "-"}</div>
        <div className="kp-ov-field kp-ov-agama">{data.agama || "-"}</div>
        <div className="kp-ov-field kp-ov-alamat">{data.alamat || "-"}</div>
      </div>
    </div>
    <p className="muted no-print" style={{ marginTop: 10, fontSize: 12 }}>Kalau posisi foto/teks belum pas dengan templatemu, kasih tahu arahnya (misal "NAMA kurang turun dikit" atau "foto kurang ke kiri") biar disesuaikan.</p>
  </>;
}


function SiswaNilai({ showToast, studentName }) {
  const [semesterData, setSemesterData] = useState({});
  useEffect(() => { if (studentName) axios.get(`${API}/transkrip`, { params: { student: studentName } }).then(({ data }) => { const bySem = {}; data.forEach((t) => { bySem[t.semester] = t; }); setSemesterData(bySem); }).catch(() => showToast("Gagal memuat nilai")); }, [studentName]); // eslint-disable-line react-hooks/exhaustive-deps
  return <><PageTitle eyebrow="Siswa" title="Transkrip Nilai" description="Nilai akhir per semester." />{[1, 2, 3, 4, 5, 6].map((sem) => { const d = semesterData[sem]; return <section className="panel" key={sem} style={{ marginBottom: 14 }}><PanelHeading title={`Semester ${sem}`} /><div className="table-wrap"><table><thead><tr><th>Mata Pelajaran</th><th>Nilai</th></tr></thead><tbody>{!(d?.subjects || []).length && <tr><td colSpan={2}>Belum ada data</td></tr>}{(d?.subjects || []).map((s, i) => <tr key={i}><td>{s.subject}</td><td>{s.nilai}</td></tr>)}</tbody></table></div></section>; })}</>;
}

function SiswaApp({ user, showToast, toast, onLogout }) {
  const [active, setActive] = useState("biodata");
  return <MobileShell subtitle="Portal Siswa" roleLabel="Siswa" user={user} navItems={SISWA_NAV} active={active} onNavClick={setActive} onLogout={onLogout} toast={toast}>
    {active === "biodata" && <SiswaBiodata showToast={showToast} studentId={user.student_id} />}
    {active === "kartu" && <KartuPelajarPage showToast={showToast} studentId={user.student_id} />}
    {active === "nilai" && <SiswaNilai showToast={showToast} studentName={user.name} />}
  </MobileShell>;
}

export default App;