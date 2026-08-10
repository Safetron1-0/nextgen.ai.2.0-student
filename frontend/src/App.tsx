import { Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./api/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Notifications from "./pages/Notifications";
import Events from "./pages/Events";
import Resources from "./pages/Resources";
import Profile from "./pages/Profile";
import Companies from "./pages/Companies";
import OnDuty from "./pages/OnDuty";
import ConfirmationReport from "./pages/ConfirmationReport";
import AiChat from "./pages/AiChat";
import CoordinatorDashboard from "./pages/coordinator/CoordinatorDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function RootRedirect() {
  if (!auth.isLoggedIn()) return <Login />;
  return auth.getRole() === "coordinator"
    ? <Navigate to="/coordinator/dashboard" replace />
    : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* ── Student Routes ── */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
      <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
      <Route path="/on-duty" element={<ProtectedRoute><OnDuty /></ProtectedRoute>} />
      <Route path="/confirmation-report" element={<ProtectedRoute><ConfirmationReport /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/ai-chat" element={<ProtectedRoute><AiChat /></ProtectedRoute>} />

      {/* ── Coordinator Routes ── */}
      <Route path="/coordinator/dashboard" element={<ProtectedRoute><CoordinatorDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
