import { NavLink, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { auth } from "../api/api";
import { useEffect, useState } from "react";
import { notificationApi } from "../api/api";

export default function Navbar() {
  const navigate = useNavigate();
  const username = auth.getUsername() || "User";
  const role = auth.getRole();
  const isCoordinator = role === "coordinator";
  const initials = username.slice(0, 2).toUpperCase();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!isCoordinator) {
      notificationApi.getUnreadCount()
        .then((data: any) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});
    }
  }, [isCoordinator]);

  const handleLogout = () => {
    auth.logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <div className="navbar-logo">
            <svg width={28} height={28} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width={28} height={28} rx={6} fill="#1E3A8A" />
              <polyline points="5,23 5,5 23,23 23,5" stroke="white" strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="navbar-brand">NextGenAI</span>
            {isCoordinator && (
              <span style={{
                fontSize: "0.7rem",
                background: "#1e3a8a",
                color: "white",
                padding: "2px 8px",
                borderRadius: "999px",
                marginLeft: "6px",
                fontWeight: 600,
                letterSpacing: "0.05em"
              }}>COORDINATOR</span>
            )}
          </div>

          <div className="navbar-links">
            {isCoordinator ? (
              // Coordinator Navigation
              <>
                <NavLink to="/coordinator/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                  Dashboard
                </NavLink>
              </>
            ) : (
              // Student Navigation
              <>
                <NavLink to="/dashboard" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
                <NavLink to="/companies" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Companies</NavLink>
                <NavLink to="/resources" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Resources</NavLink>
                <NavLink to="/on-duty" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>On Duty</NavLink>
                <NavLink to="/confirmation-report" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Report</NavLink>
                <NavLink to="/notifications" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Notifications</NavLink>
                <NavLink
                  to="/ai-chat"
                  className={({ isActive }) => isActive ? "nav-link nav-link-ai active" : "nav-link nav-link-ai"}
                >
                  ✨ AI Advisor
                </NavLink>
              </>
            )}
          </div>
        </div>

        <div className="navbar-right">
          {/* Bell only for students */}
          {!isCoordinator && (
            <button className="nav-bell" onClick={() => navigate("/notifications")}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>
          )}
          <div className="nav-avatar-wrapper">
            <button className="nav-avatar" onClick={() => setShowDropdown(!showDropdown)}>
              {initials}
            </button>
            {showDropdown && (
              <div className="avatar-dropdown">
                {!isCoordinator && (
                  <button onClick={() => { navigate("/profile"); setShowDropdown(false); }}>Profile</button>
                )}
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
