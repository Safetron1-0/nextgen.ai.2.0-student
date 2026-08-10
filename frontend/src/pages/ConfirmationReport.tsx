import { useEffect, useState } from "react";
import { FileCheck } from "lucide-react";
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

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function ConfirmationReport() {
  const [requests, setRequests] = useState<OnDutyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await onDutyApi.getAll();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load report:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = activeFilter === "ALL"
    ? requests
    : requests.filter(r => r.status === activeFilter);

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

  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <FileCheck size={28} className="page-icon" />
            <div>
              <h1>Confirmation Report</h1>
              <p>All on-duty requests from all students — stored in database</p>
            </div>
          </div>
          <div className="report-summary">
            <span className="report-stat">{statusCounts.ALL} Total</span>
            <span className="report-stat pending">{statusCounts.PENDING} Pending</span>
            <span className="report-stat approved">{statusCounts.APPROVED} Approved</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs" style={{ marginBottom: "1rem" }}>
          {filters.map(f => (
            <button
              key={f.key}
              className={`filter-tab ${activeFilter === f.key ? "active" : ""}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label} <span className="tab-count">{statusCounts[f.key]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Loading report...</p></div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-page">
            <FileCheck size={64} className="empty-icon" />
            <h3>No on-duty requests found</h3>
            <p>{activeFilter !== "ALL" ? "Try a different filter." : "Students haven't submitted any on-duty requests yet."}</p>
          </div>
        ) : (
          <div className="od-table-container report-table">
            <table className="app-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>STUDENT NAME</th>
                  <th>TITLE</th>
                  <th>REASON</th>
                  <th>FROM</th>
                  <th>TO</th>
                  <th>STATUS</th>
                  <th>SUBMITTED</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td className="company-cell">{r.studentName || "—"}</td>
                    <td>{r.title}</td>
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
