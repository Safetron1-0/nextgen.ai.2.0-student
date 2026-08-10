import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, studentApi, applicationApi, eventApi } from "../api/api";
import Navbar from "../components/Navbar";

interface AppStats {
  applied: number;
  shortlisted: number;
  nextRound: number;
  selected: number;
  rejected: number;
  total: number;
}

interface ApplicationItem {
  id: number;
  companyName: string;
  role: string;
  status: string;
  nextAction: string;
  date: string;
}

interface EventItem {
  id: number;
  title: string;
  eventDate: string;
  eventType: string;
  location: string;
  companyName: string;
}

type FilterTab = "ALL" | "APPLIED" | "SHORTLISTED" | "NEXT_ROUND" | "SELECTED" | "REJECTED";

export default function Dashboard() {
  const navigate = useNavigate();
  const username = auth.getUsername() || "Student";
  const [studentName, setStudentName] = useState(username);
  const [stats, setStats] = useState<AppStats>({ applied: 0, shortlisted: 0, nextRound: 0, selected: 0, rejected: 0, total: 0 });
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [profile, statsData, apps, events] = await Promise.all([
        studentApi.getMyProfile().catch(() => null),
        applicationApi.getMyStats().catch(() => ({ applied: 0, shortlisted: 0, nextRound: 0, selected: 0, rejected: 0, total: 0 })),
        applicationApi.getMy().catch(() => []),
        eventApi.getUpcoming().catch(() => []),
      ]);
      if (profile) setStudentName(profile.name || username);
      setStats(statsData);
      setApplications(apps);
      setUpcomingEvents(events.slice(0, 5));
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = activeTab === "ALL"
    ? applications
    : applications.filter(a => a.status === activeTab);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: stats.total },
    { key: "APPLIED", label: "Applied", count: stats.applied },
    { key: "SHORTLISTED", label: "Shortlisted", count: stats.shortlisted },
    { key: "NEXT_ROUND", label: "Next Round", count: stats.nextRound },
    { key: "SELECTED", label: "Selected", count: stats.selected },
    { key: "REJECTED", label: "Rejected", count: stats.rejected },
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "APPLIED": return "badge-applied";
      case "SHORTLISTED": return "badge-shortlisted";
      case "NEXT_ROUND": return "badge-nextround";
      case "SELECTED": return "badge-selected";
      case "REJECTED": return "badge-rejected";
      default: return "";
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
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <p>Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="welcome-section">
              <h1>Welcome back, {studentName}! 👋</h1>
              <p>Track your placement applications and next steps.</p>
            </div>

            <div className="dashboard-grid">
              {/* Left Column - Applications */}
              <div className="dashboard-left">
                {/* Filter Tabs */}
                <div className="filter-tabs">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      className={`filter-tab ${activeTab === tab.key ? "active" : ""}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label} <span className="tab-count">{tab.count}</span>
                    </button>
                  ))}
                </div>

                {/* Applications Table */}
                <div className="table-container">
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>COMPANY</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                        <th>NEXT ACTION</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty-state">
                            No applications in this category yet.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map(app => (
                          <tr key={app.id}>
                            <td className="company-cell">{app.companyName || "-"}</td>
                            <td>{app.role || "-"}</td>
                            <td>
                              <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                                {app.status.replace("_", " ")}
                              </span>
                            </td>
                            <td>{app.nextAction || "-"}</td>
                            <td>{formatDate(app.date)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column - Stats & Tips */}
              <div className="dashboard-right">
                {/* At a Glance */}
                <div className="glance-card">
                  <h3>At a glance</h3>
                  <div className="glance-grid">
                    <div className="glance-item">
                      <span className="glance-num">{stats.applied}</span>
                      <span className="glance-label">Applied</span>
                    </div>
                    <div className="glance-item">
                      <span className="glance-num">{stats.shortlisted}</span>
                      <span className="glance-label">Shortlisted</span>
                    </div>
                    <div className="glance-item">
                      <span className="glance-num">{stats.nextRound}</span>
                      <span className="glance-label">Next Round</span>
                    </div>
                    <div className="glance-item">
                      <span className="glance-num">{stats.selected}</span>
                      <span className="glance-label">Selected</span>
                    </div>
                  </div>
                </div>

                {/* AI Tip Card */}
                <div className="ai-tip-card">
                  <div className="ai-tip-badge">N</div>
                  <h4>You have {stats.shortlisted} shortlisted rounds this week.</h4>
                  <p>Focus on core CS concepts, system design, and STAR-format interview answers.</p>
                  <button className="ai-tip-btn" onClick={() => navigate("/ai-chat")}>Chat with AI Advisor →</button>
                </div>

                {/* Upcoming Deadlines */}
                <div className="deadlines-card">
                  <h3>Upcoming deadlines</h3>
                  {upcomingEvents.length === 0 ? (
                    <p className="empty-text">No upcoming deadlines.</p>
                  ) : (
                    <ul className="deadline-list">
                      {upcomingEvents.map(event => (
                        <li key={event.id} className="deadline-item">
                          <div className="deadline-date">
                            <span className="deadline-day">{new Date(event.eventDate).getDate()}</span>
                            <span className="deadline-month">{new Date(event.eventDate).toLocaleString("en", { month: "short" })}</span>
                          </div>
                          <div className="deadline-info">
                            <span className="deadline-title">{event.title}</span>
                            <span className="deadline-type">{event.eventType} {event.location ? `• ${event.location}` : ""}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
