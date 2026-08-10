import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ClipboardList, Plus, X, Calendar, FileText, Loader2 } from "lucide-react";
import { onDutyApi } from "../api/api";
import Navbar from "../components/Navbar";

interface OnDutyItem {
  id: number;
  studentName: string;
  title: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: string;
  createdAt: string;
}

export default function OnDuty() {
  const [requests, setRequests] = useState<OnDutyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    title: "", reason: "", fromDate: "", toDate: ""
  });

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await onDutyApi.getMy();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load on-duty requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onDutyApi.create(formData);
      setShowForm(false);
      setFormData({ title: "", reason: "", fromDate: "", toDate: "" });
      setSuccess("On-duty request submitted successfully!");
      setTimeout(() => setSuccess(""), 3000);
      loadRequests();
    } catch (err) {
      console.error("Failed to submit on-duty request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "APPROVED": return "od-badge-approved";
      case "REJECTED": return "od-badge-rejected";
      default: return "od-badge-pending";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <ClipboardList size={28} className="page-icon" />
            <div>
              <h1>On-Duty Requests</h1>
              <p>Submit and track your on-duty attendance requests</p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Request
          </button>
        </div>

        {success && <div className="alert alert-success">{success}</div>}

        {/* New Request Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Submit On-Duty Request</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="event-form">
                <div className="form-group">
                  <label><FileText size={14} /> Title / Event Name</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Workshop at IIT Madras"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Reason / Description</label>
                  <textarea
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Describe the reason for on-duty..."
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label><Calendar size={14} /> From Date</label>
                    <input
                      type="date"
                      value={formData.fromDate}
                      onChange={e => setFormData({ ...formData, fromDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label><Calendar size={14} /> To Date</label>
                    <input
                      type="date"
                      value={formData.toDate}
                      onChange={e => setFormData({ ...formData, toDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="spin-icon" size={18} /> Submitting...</>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Request History */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Loading requests...</p></div>
        ) : requests.length === 0 ? (
          <div className="empty-page">
            <ClipboardList size={64} className="empty-icon" />
            <h3>No on-duty requests yet</h3>
            <p>Click "New Request" to submit your first on-duty entry.</p>
          </div>
        ) : (
          <div className="od-table-container">
            <table className="app-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>REASON</th>
                  <th>FROM</th>
                  <th>TO</th>
                  <th>STATUS</th>
                  <th>SUBMITTED</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td className="company-cell">{r.title}</td>
                    <td>{r.reason || "-"}</td>
                    <td>{formatDate(r.fromDate)}</td>
                    <td>{formatDate(r.toDate)}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
