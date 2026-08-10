import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { User, Mail, Phone, GraduationCap, BookOpen, Save, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { studentApi, authApi, auth } from "../api/api";
import Navbar from "../components/Navbar";

interface StudentProfile {
  id: number;
  userId: number;
  name: string;
  email: string;
  department: string;
  year: number;
  cgpa: number;
  phone: string;
  avatarInitials: string;
}

export default function Profile() {
  const username = auth.getUsername() || "User";
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", department: "", year: 0, cgpa: 0, phone: "", avatarInitials: ""
  });

  // Change Password state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await studentApi.getMyProfile();
      setProfile(data);
      setForm({
        name: data.name || "",
        email: data.email || "",
        department: data.department || "",
        year: data.year || 0,
        cgpa: data.cgpa || 0,
        phone: data.phone || "",
        avatarInitials: data.avatarInitials || "",
      });
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await studentApi.update(profile.id, form);
      setProfile(updated);
      setEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(""); setPwSuccess("");
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("New passwords do not match."); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setPwSuccess("Password changed successfully! Use your new password next time.");
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSuccess(""), 4000);
    } catch (err: any) {
      setPwError(err.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const initials = profile?.avatarInitials || username.slice(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Loading profile...</p></div>
        ) : !profile ? (
          <div className="empty-page">
            <User size={64} className="empty-icon" />
            <h3>Profile Not Found</h3>
            <p>Your student profile hasn't been created yet. Contact your coordinator.</p>
          </div>
        ) : (
          <div className="profile-layout">
            {/* Profile Header Card */}
            <div className="profile-header-card">
              <div className="profile-avatar-large">{initials}</div>
              <div className="profile-header-info">
                <h1>{profile.name}</h1>
                <p className="profile-subtitle">{profile.department} • Year {profile.year}</p>
                <p className="profile-email">{profile.email}</p>
              </div>
              <button className="btn-secondary" onClick={() => setEditing(!editing)}>
                {editing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Profile Details */}
            <div className="profile-grid">
              <div className="profile-card">
                <h3>Personal Information</h3>
                {editing ? (
                  <form onSubmit={handleSave} className="profile-form">
                    <div className="form-group">
                      <label><User size={14} /> Full Name</label>
                      <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label><Mail size={14} /> Email</label>
                      <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label><Phone size={14} /> Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? <><Loader2 size={16} className="spin-icon" /> Saving...</> : <><Save size={16} /> Save Changes</>}
                    </button>
                  </form>
                ) : (
                  <div className="profile-details">
                    <div className="detail-row"><User size={16} /><span>Name</span><strong>{profile.name}</strong></div>
                    <div className="detail-row"><Mail size={16} /><span>Email</span><strong>{profile.email || "-"}</strong></div>
                    <div className="detail-row"><Phone size={16} /><span>Phone</span><strong>{profile.phone || "-"}</strong></div>
                  </div>
                )}
              </div>

              <div className="profile-card">
                <h3>Academic Information</h3>
                {editing ? (
                  <form className="profile-form">
                    <div className="form-group">
                      <label><GraduationCap size={14} /> Department</label>
                      <input type="text" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label><BookOpen size={14} /> Year</label>
                        <input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="form-group">
                        <label>CGPA</label>
                        <input type="number" step="0.01" value={form.cgpa} onChange={e => setForm({ ...form, cgpa: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="profile-details">
                    <div className="detail-row"><GraduationCap size={16} /><span>Department</span><strong>{profile.department || "-"}</strong></div>
                    <div className="detail-row"><BookOpen size={16} /><span>Year</span><strong>{profile.year || "-"}</strong></div>
                    <div className="detail-row"><span className="cgpa-icon">GPA</span><span>CGPA</span><strong>{profile.cgpa || "-"}</strong></div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Change Password Card ── */}
            <div className="profile-card" style={{ marginTop: "1.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
                <Lock size={18} /> Change Password
              </h3>

              {pwSuccess && <div className="alert alert-success" style={{ marginBottom: "1rem" }}>{pwSuccess}</div>}
              {pwError   && <div className="alert alert-error"   style={{ marginBottom: "1rem" }}>{pwError}</div>}

              <form onSubmit={handleChangePassword} className="profile-form">
                {/* Current Password */}
                <div className="form-group">
                  <label><Lock size={14}/> Current Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={pwForm.current}
                      onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                      required
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                      {showCurrent ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label><Lock size={14}/> New Password <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "0.8rem" }}>(min 6 characters)</span></label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNew ? "text" : "password"}
                      placeholder="Enter new password"
                      value={pwForm.next}
                      onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                      required
                      minLength={6}
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                      {showNew ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {pwForm.next && (
                    <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{
                          height: 4, flex: 1, borderRadius: 999,
                          background: pwForm.next.length >= i * 3
                            ? (pwForm.next.length >= 12 ? "#22c55e" : pwForm.next.length >= 8 ? "#f59e0b" : "#ef4444")
                            : "#e2e8f0"
                        }}/>
                      ))}
                      <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: 6 }}>
                        {pwForm.next.length < 6 ? "Weak" : pwForm.next.length < 9 ? "Fair" : pwForm.next.length < 12 ? "Good" : "Strong"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label><Lock size={14}/> Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    required
                    style={{
                      borderColor: pwForm.confirm && pwForm.next !== pwForm.confirm ? "#ef4444" : undefined
                    }}
                  />
                  {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                    <p style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: 4 }}>Passwords do not match</p>
                  )}
                </div>

                <button type="submit" className="btn-primary" disabled={pwSaving}>
                  {pwSaving
                    ? <><Loader2 size={16} className="spin-icon"/> Updating…</>
                    : <><Save size={16}/> Update Password</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
