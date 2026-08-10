import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus, CheckCircle, XCircle, Search, Award,
  Users, BookOpen, Plus, Building2, Trash2
} from "lucide-react";
import { auth, studentApi, onDutyApi, applicationApi, companyApi, resourceApi } from "../../api/api";
import Navbar from "../../components/Navbar";

// ─── Types ────────────────────────────────────────────────────
interface StudentItem {
  id: number; userId: number; name: string; email: string;
  department: string; year: number; cgpa: number; phone: string; avatarInitials: string;
}
interface OnDutyItem {
  id: number; studentId: number; studentName: string; title: string;
  reason: string; fromDate: string; toDate: string; status: string; createdAt: string;
}
interface AppItem {
  id: number; studentId: number; companyName: string;
  role: string; status: string; nextAction: string; date: string;
}
interface CompanyItem {
  id: number; name: string; industry: string; website: string;
}
interface ResourceItem {
  id: number; title: string; description: string; url: string;
  category: string; fileType: string;
}

type TabType = "students" | "applications" | "onduty" | "resources" | "companies";

const RESOURCE_CATEGORIES = ["DSA", "DBMS", "OOPs", "SQL", "Cloud", "CN", "OS"];
const FILE_TYPES = ["LINK", "VIDEO", "PDF"];

// ─── Component ────────────────────────────────────────────────
export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const role = auth.getRole();

  useEffect(() => {
    if (role !== "coordinator") navigate("/dashboard");
  }, [role, navigate]);

  const [activeTab, setActiveTab] = useState<TabType>("students");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [onDutyList, setOnDutyList] = useState<OnDutyItem[]>([]);
  const [applications, setApplications] = useState<AppItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  // Forms
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ username: "", name: "", email: "", department: "", year: 4, cgpa: "", phone: "" });

  const [showAddApp, setShowAddApp] = useState(false);
  const [appStudent, setAppStudent] = useState<StudentItem | null>(null);
  const [appForm, setAppForm] = useState({ companyId: "", role: "Full Stack", status: "APPLIED", nextAction: "", date: new Date().toISOString().split("T")[0], packageLpa: "" });

  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: "", industry: "IT", website: "" });

  const [showAddResource, setShowAddResource] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", url: "", category: "DSA", fileType: "LINK" });

  // ─── Load Data ───────────────────────────────────────────────
  useEffect(() => { loadTab(); }, [activeTab]);

  const loadTab = async () => {
    setLoading(true); setError("");
    try {
      if (activeTab === "students") {
        setStudents(await studentApi.getAll());
      } else if (activeTab === "onduty") {
        setOnDutyList(await onDutyApi.getAll());
      } else if (activeTab === "applications") {
        const [apps, studs, comps] = await Promise.all([applicationApi.getAll(), studentApi.getAll(), companyApi.getAll()]);
        setApplications(apps); setStudents(studs); setCompanies(comps);
      } else if (activeTab === "companies") {
        setCompanies(await companyApi.getAll());
      } else if (activeTab === "resources") {
        setResources(await resourceApi.getAll());
      }
    } catch (e: any) {
      setError("Failed to load data: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, isError = false) => {
    if (isError) setError(msg); else { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }
  };

  // ─── Student: Create ────────────────────────────────────────
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.username || !studentForm.name) { notify("Username and Name are required.", true); return; }
    try {
      await studentApi.createStudent({
        name: studentForm.name, email: studentForm.email, department: studentForm.department,
        year: Number(studentForm.year), cgpa: studentForm.cgpa ? Number(studentForm.cgpa) : undefined, phone: studentForm.phone
      }, studentForm.username);
      notify(`Student '${studentForm.name}' created! Login: ${studentForm.username} / Password: ${studentForm.username}123`);
      setShowAddStudent(false);
      setStudentForm({ username: "", name: "", email: "", department: "", year: 4, cgpa: "", phone: "" });
      loadTab();
    } catch (e: any) { notify(e.message || "Failed to create student.", true); }
  };

  // ─── Application: Create ────────────────────────────────────
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appStudent || !appForm.companyId) { notify("Select a student and company.", true); return; }
    try {
      await applicationApi.create({
        studentId: appStudent.id, companyId: Number(appForm.companyId),
        role: appForm.role, status: appForm.status, nextAction: appForm.nextAction,
        date: appForm.date, packageLpa: appForm.packageLpa ? Number(appForm.packageLpa) : null
      });
      notify(`Application added for ${appStudent.name}`);
      setShowAddApp(false); setAppStudent(null);
      setAppForm({ companyId: "", role: "Full Stack", status: "APPLIED", nextAction: "", date: new Date().toISOString().split("T")[0], packageLpa: "" });
      loadTab();
    } catch (e: any) { notify(e.message || "Failed to add application.", true); }
  };

  // ─── Application: Update Status ─────────────────────────────
  const updateAppStatus = async (id: number, status: string) => {
    try {
      await applicationApi.update(id, { status });
      notify("Status updated!");
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e: any) { notify(e.message || "Failed to update.", true); }
  };

  // ─── On-Duty: Approve/Reject ─────────────────────────────────
  const handleOnDuty = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      await onDutyApi.updateStatus(id, status);
      notify(`On-duty request ${status.toLowerCase()}.`);
      setOnDutyList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e: any) { notify(e.message || "Failed.", true); }
  };

  // ─── Company: Create ─────────────────────────────────────────
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name) { notify("Company name is required.", true); return; }
    try {
      await companyApi.create(companyForm);
      notify(`Company '${companyForm.name}' added!`);
      setShowAddCompany(false);
      setCompanyForm({ name: "", industry: "IT", website: "" });
      loadTab();
    } catch (e: any) { notify(e.message || "Failed to add company.", true); }
  };

  // ─── Company: Delete ─────────────────────────────────────────
  const handleDeleteCompany = async (id: number, name: string) => {
    if (!confirm(`Delete company "${name}"?`)) return;
    try {
      await companyApi.delete(id);
      notify(`Company '${name}' deleted.`);
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (e: any) { notify(e.message || "Failed to delete.", true); }
  };

  // ─── Resource: Create ────────────────────────────────────────
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceForm.title || !resourceForm.url) { notify("Title and URL are required.", true); return; }
    try {
      await resourceApi.create(resourceForm);
      notify(`Resource '${resourceForm.title}' added!`);
      setShowAddResource(false);
      setResourceForm({ title: "", description: "", url: "", category: "DSA", fileType: "LINK" });
      loadTab();
    } catch (e: any) { notify(e.message || "Failed to add resource.", true); }
  };

  // ─── Resource: Delete ────────────────────────────────────────
  const handleDeleteResource = async (id: number) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await resourceApi.delete(id);
      notify("Resource deleted.");
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (e: any) { notify(e.message || "Failed.", true); }
  };

  // ─── Helpers ─────────────────────────────────────────────────
  const statusClass = (s: string) => {
    switch (s?.toUpperCase()) {
      case "APPLIED": return "badge-applied";
      case "SHORTLISTED": return "badge-shortlisted";
      case "NEXT_ROUND": return "badge-nextround";
      case "SELECTED": return "badge-selected";
      case "REJECTED": return "badge-rejected";
      case "APPROVED": return "badge-selected";
      case "PENDING": return "badge-applied";
      default: return "";
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.department || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  const resourcesByCategory = resources.reduce<Record<string, ResourceItem[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">

        {/* Banner */}
        <div style={{ background: "linear-gradient(135deg,#1e3a8a,#3b82f6)", borderRadius: 16, padding: "1.5rem 2rem", color: "white", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Coordinator Workspace 👋</h1>
          <p style={{ margin: "4px 0 0 0", opacity: 0.85 }}>Manage students, companies, resources, applications & on-duty requests.</p>
        </div>

        {/* Tabs */}
        <div className="filter-tabs" style={{ marginBottom: "1.25rem" }}>
          {([
            ["students",     <><Users size={15}/> Students ({students.length})</>],
            ["applications", <><Award size={15}/> Applications ({applications.length})</>],
            ["onduty",       <><BookOpen size={15}/> On-Duty ({onDutyList.length})</>],
            ["resources",    <><BookOpen size={15}/> Resources ({resources.length})</>],
            ["companies",    <><Building2 size={15}/> Companies ({companies.length})</>],
          ] as [TabType, React.ReactNode][]).map(([key, label]) => (
            <button key={key} className={`filter-tab ${activeTab === key ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </div>

        {/* Alerts */}
        {success && <div className="alert alert-success" style={{ marginBottom: "1rem" }}>{success}</div>}
        {error   && <div className="alert alert-error"   style={{ marginBottom: "1rem" }}>{error}</div>}

        {loading ? (
          <div className="loading-screen"><div className="spinner"/><p>Loading…</p></div>
        ) : (
          <>
            {/* ═══════════════ STUDENTS TAB ═══════════════ */}
            {activeTab === "students" && (
              <div>
                <div style={{ display: "flex", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}/>
                    <input type="text" placeholder="Search by name or department…" value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      style={{ paddingLeft: 34, width: "100%", height: 42, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}/>
                  </div>
                  <button className="btn-primary" onClick={() => setShowAddStudent(!showAddStudent)}>
                    <UserPlus size={15} style={{ marginRight: 6 }}/> Create Student
                  </button>
                </div>

                {/* Create Student Form */}
                {showAddStudent && (
                  <div className="profile-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                    <h3 style={{ marginBottom: "1rem" }}>Add New Student Profile</h3>
                    <form onSubmit={handleCreateStudent}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1rem" }}>
                        {[
                          ["Username / Login ID", "text", "e.g. pravarthini", "username"],
                          ["Full Name",           "text", "e.g. Pravarthini V",  "name"],
                          ["Email Address",       "email","e.g. p@gmail.com",    "email"],
                          ["Department",          "text", "e.g. CSE",            "department"],
                          ["Phone Number",        "text", "e.g. 9876543210",     "phone"],
                          ["CGPA",                "number","e.g. 8.50",          "cgpa"],
                        ].map(([lbl, type, ph, key]) => (
                          <div className="form-group" key={key}>
                            <label>{lbl}</label>
                            <input type={type} placeholder={ph}
                              value={(studentForm as any)[key]}
                              onChange={e => setStudentForm({ ...studentForm, [key]: e.target.value })}
                              required={key === "username" || key === "name"}
                              step={key === "cgpa" ? "0.01" : undefined}/>
                          </div>
                        ))}
                        <div className="form-group">
                          <label>Current Year</label>
                          <input type="number" value={studentForm.year} min={1} max={6}
                            onChange={e => setStudentForm({ ...studentForm, year: Number(e.target.value) })}/>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="submit" className="btn-primary">Save Student</button>
                        <button type="button" className="btn-secondary" onClick={() => setShowAddStudent(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Add Application Form (shows when a student row is clicked) */}
                {showAddApp && appStudent && (
                  <div className="profile-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12 }}>
                    <h3 style={{ marginBottom: "1rem" }}>Add Application for <em>{appStudent.name}</em></h3>
                    <form onSubmit={handleCreateApp}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1rem" }}>
                        <div className="form-group">
                          <label>Company</label>
                          <select value={appForm.companyId} onChange={e => setAppForm({ ...appForm, companyId: e.target.value })} required>
                            <option value="">-- Choose --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Role</label>
                          <input type="text" value={appForm.role} onChange={e => setAppForm({ ...appForm, role: e.target.value })} required/>
                        </div>
                        <div className="form-group">
                          <label>Status</label>
                          <select value={appForm.status} onChange={e => setAppForm({ ...appForm, status: e.target.value })}>
                            {["APPLIED","SHORTLISTED","NEXT_ROUND","SELECTED","REJECTED"].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Next Action</label>
                          <input type="text" placeholder="e.g. Technical Interview" value={appForm.nextAction} onChange={e => setAppForm({ ...appForm, nextAction: e.target.value })}/>
                        </div>
                        <div className="form-group">
                          <label>Date</label>
                          <input type="date" value={appForm.date} onChange={e => setAppForm({ ...appForm, date: e.target.value })}/>
                        </div>
                        <div className="form-group">
                          <label>Package (LPA)</label>
                          <input type="number" step="0.01" placeholder="e.g. 5.5" value={appForm.packageLpa} onChange={e => setAppForm({ ...appForm, packageLpa: e.target.value })}/>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="submit" className="btn-primary">Submit Application</button>
                        <button type="button" className="btn-secondary" onClick={() => { setShowAddApp(false); setAppStudent(null); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Students Table */}
                <div className="table-container">
                  <table className="app-table">
                    <thead><tr>
                      <th>AVATAR</th><th>NAME</th><th>DEPARTMENT</th>
                      <th>YEAR</th><th>CGPA</th><th>EMAIL</th><th>PHONE</th><th>ACTIONS</th>
                    </tr></thead>
                    <tbody>
                      {filteredStudents.length === 0
                        ? <tr><td colSpan={8} className="empty-state">No students registered yet.</td></tr>
                        : filteredStudents.map(s => (
                          <tr key={s.id}>
                            <td><div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700 }}>{s.avatarInitials || s.name.slice(0,2).toUpperCase()}</div></td>
                            <td className="company-cell">{s.name}</td>
                            <td>{s.department || "—"}</td>
                            <td>{s.year || "—"}</td>
                            <td style={{ fontWeight: 600 }}>{s.cgpa || "—"}</td>
                            <td>{s.email || "—"}</td>
                            <td>{s.phone || "—"}</td>
                            <td>
                              <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                                onClick={async () => {
                                  const comps = await companyApi.getAll();
                                  setCompanies(comps); setAppStudent(s); setShowAddApp(true);
                                }}>
                                <Plus size={12}/> Add App
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════ APPLICATIONS TAB ═══════════════ */}
            {activeTab === "applications" && (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>All Student Applications</h3>
                <div className="table-container">
                  <table className="app-table">
                    <thead><tr>
                      <th>STUDENT</th><th>COMPANY</th><th>ROLE</th>
                      <th>DATE</th><th>NEXT ACTION</th><th>STATUS</th><th>UPDATE</th>
                    </tr></thead>
                    <tbody>
                      {applications.length === 0
                        ? <tr><td colSpan={7} className="empty-state">No applications yet.</td></tr>
                        : applications.map(a => {
                            const stu = students.find(s => s.id === a.studentId);
                            return (
                              <tr key={a.id}>
                                <td className="company-cell">{stu?.name || `#${a.studentId}`}</td>
                                <td>{a.companyName || "—"}</td>
                                <td>{a.role || "—"}</td>
                                <td>{a.date || "—"}</td>
                                <td>{a.nextAction || "—"}</td>
                                <td><span className={`status-badge ${statusClass(a.status)}`}>{a.status}</span></td>
                                <td>
                                  <select value={a.status} onChange={e => updateAppStatus(a.id, e.target.value)}
                                    style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.82rem", background: "white" }}>
                                    {["APPLIED","SHORTLISTED","NEXT_ROUND","SELECTED","REJECTED"].map(s => <option key={s}>{s}</option>)}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════ ON-DUTY TAB ═══════════════ */}
            {activeTab === "onduty" && (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>On-Duty Requests from Students</h3>
                <div className="table-container">
                  <table className="app-table">
                    <thead><tr>
                      <th>STUDENT</th><th>TITLE / REASON</th><th>FROM</th>
                      <th>TO</th><th>STATUS</th><th>DECISION</th>
                    </tr></thead>
                    <tbody>
                      {onDutyList.length === 0
                        ? <tr><td colSpan={6} className="empty-state">No on-duty requests yet.</td></tr>
                        : onDutyList.map(r => (
                          <tr key={r.id}>
                            <td className="company-cell">{r.studentName}</td>
                            <td>
                              <strong>{r.title}</strong>
                              {r.reason && <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "2px 0 0" }}>{r.reason}</p>}
                            </td>
                            <td>{r.fromDate}</td>
                            <td>{r.toDate}</td>
                            <td><span className={`status-badge ${statusClass(r.status)}`}>{r.status}</span></td>
                            <td>
                              {r.status === "PENDING"
                                ? <div style={{ display: "flex", gap: 6 }}>
                                    <button style={{ padding: "4px 10px", fontSize: "0.78rem", background: "#22c55e", color: "white", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                      onClick={() => handleOnDuty(r.id, "APPROVED")}><CheckCircle size={12}/> Approve</button>
                                    <button style={{ padding: "4px 10px", fontSize: "0.78rem", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                      onClick={() => handleOnDuty(r.id, "REJECTED")}><XCircle size={12}/> Reject</button>
                                  </div>
                                : <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Done</span>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════ RESOURCES TAB ═══════════════ */}
            {activeTab === "resources" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <h3 style={{ margin: 0 }}>Learning Resources by Category</h3>
                  <button className="btn-primary" onClick={() => setShowAddResource(!showAddResource)}>
                    <Plus size={15} style={{ marginRight: 6 }}/> Add Resource
                  </button>
                </div>

                {showAddResource && (
                  <div className="profile-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                    <h3 style={{ marginBottom: "1rem" }}>Add New Resource</h3>
                    <form onSubmit={handleCreateResource}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1rem" }}>
                        <div className="form-group">
                          <label>Title</label>
                          <input type="text" placeholder="e.g. Striver's DSA Sheet" required
                            value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}/>
                        </div>
                        <div className="form-group">
                          <label>Category</label>
                          <select value={resourceForm.category} onChange={e => setResourceForm({ ...resourceForm, category: e.target.value })}>
                            {RESOURCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Type</label>
                          <select value={resourceForm.fileType} onChange={e => setResourceForm({ ...resourceForm, fileType: e.target.value })}>
                            {FILE_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: "1/-1" }}>
                          <label>URL</label>
                          <input type="url" placeholder="https://…" required
                            value={resourceForm.url} onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}/>
                        </div>
                        <div className="form-group" style={{ gridColumn: "1/-1" }}>
                          <label>Description</label>
                          <input type="text" placeholder="Brief description of the resource"
                            value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}/>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="submit" className="btn-primary">Add Resource</button>
                        <button type="button" className="btn-secondary" onClick={() => setShowAddResource(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Resources grouped by category */}
                {RESOURCE_CATEGORIES.map(cat => {
                  const items = resourcesByCategory[cat] || [];
                  return (
                    <div key={cat} style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ marginBottom: "0.75rem", color: "#1e3a8a", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: "#1e3a8a", color: "white", padding: "2px 10px", borderRadius: 999, fontSize: "0.8rem" }}>{cat}</span>
                        <span style={{ color: "#64748b", fontSize: "0.85rem" }}>({items.length} resources)</span>
                      </h4>
                      {items.length === 0
                        ? <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginLeft: 8 }}>No resources yet — add one above.</p>
                        : <div className="table-container">
                            <table className="app-table">
                              <thead><tr><th>TITLE</th><th>DESCRIPTION</th><th>TYPE</th><th>LINK</th><th>DELETE</th></tr></thead>
                              <tbody>
                                {items.map(r => (
                                  <tr key={r.id}>
                                    <td className="company-cell">{r.title}</td>
                                    <td style={{ fontSize: "0.85rem", color: "#475569", maxWidth: 260 }}>{r.description}</td>
                                    <td><span className="status-badge badge-applied">{r.fileType}</span></td>
                                    <td><a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontSize: "0.85rem" }}>Open ↗</a></td>
                                    <td>
                                      <button onClick={() => handleDeleteResource(r.id)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                                        <Trash2 size={16}/>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══════════════ COMPANIES TAB ═══════════════ */}
            {activeTab === "companies" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <h3 style={{ margin: 0 }}>Company List</h3>
                  <button className="btn-primary" onClick={() => setShowAddCompany(!showAddCompany)}>
                    <Building2 size={15} style={{ marginRight: 6 }}/> Add Company
                  </button>
                </div>

                {showAddCompany && (
                  <div className="profile-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                    <h3 style={{ marginBottom: "1rem" }}>Add New Company</h3>
                    <form onSubmit={handleCreateCompany}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1rem" }}>
                        <div className="form-group">
                          <label>Company Name</label>
                          <input type="text" placeholder="e.g. TCS" required
                            value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}/>
                        </div>
                        <div className="form-group">
                          <label>Industry</label>
                          <select value={companyForm.industry} onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })}>
                            {["IT", "Finance", "Healthcare", "Education", "Manufacturing", "Consulting"].map(i => <option key={i}>{i}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Website URL</label>
                          <input type="url" placeholder="https://company.com"
                            value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })}/>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="submit" className="btn-primary">Save Company</button>
                        <button type="button" className="btn-secondary" onClick={() => setShowAddCompany(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="table-container">
                  <table className="app-table">
                    <thead><tr>
                      <th>#</th><th>COMPANY NAME</th><th>INDUSTRY</th><th>WEBSITE</th>
                      <th>SELECTED STUDENTS</th><th>DELETE</th>
                    </tr></thead>
                    <tbody>
                      {companies.length === 0
                        ? <tr><td colSpan={6} className="empty-state">No companies added yet.</td></tr>
                        : companies.map((c: any, i: number) => (
                          <tr key={c.id}>
                            <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                            <td className="company-cell">{c.name}</td>
                            <td>{c.industry || "IT"}</td>
                            <td>{c.website
                              ? <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontSize: "0.85rem" }}>Visit ↗</a>
                              : "—"}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#16a34a" }}>{c.selectedCount ?? 0}</span>
                              {c.selectedStudents?.length > 0 && (
                                <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: 6 }}>
                                  ({c.selectedStudents.map((s: any) => s.studentName).join(", ")})
                                </span>
                              )}
                            </td>
                            <td>
                              <button onClick={() => handleDeleteCompany(c.id, c.name)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                                <Trash2 size={16}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
