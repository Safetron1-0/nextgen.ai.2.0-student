import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi, auth } from "../api/api";

function NgLogo({ size = 28 }: { size?: number }) {
  const r = size * 0.22;
  const pad = size * 0.18;
  const strokeW = size * 0.135;
  const x1 = pad, x2 = size - pad;
  const y1 = pad, y2 = size - pad;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} rx={r} fill="#1E3A8A" />
      <polyline
        points={`${x1},${y2} ${x1},${y1} ${x2},${y2} ${x2},${y1}`}
        stroke="white" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        await authApi.register(username, password, role);
        setSuccess("Registration successful! You can now log in.");
        setIsRegister(false);
        setPassword("");
      } else {
        const data = await authApi.login(username, password, role);
        auth.saveLogin(data.token, data.username, data.role);
        if (data.role === "coordinator") {
          navigate("/coordinator/dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setSuccess("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className="login-page">
      <div className="login-grid-bg" />
      <div className="login-glow" />

      <div className="login-card">
        <div className="login-header">
          <NgLogo size={48} />
          <h1>{isRegister ? "Create Account" : "NextGenAI Login"}</h1>
          <p>{isRegister ? "Join the placement portal" : "Your gateway to placements"}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>{isRegister ? "Name" : "Username"}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? "Enter your full name" : "Enter your username"}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "Create a password" : "Enter your password"}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Select Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="coordinator">Coordinator</option>
            </select>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spin-icon" size={18} />
                {isRegister ? "Registering..." : "Logging in..."}
              </>
            ) : (
              isRegister ? "Register" : "Log In"
            )}
          </button>
        </form>

        <div className="login-footer">
          <button type="button" className="btn-link" onClick={handleToggleMode}>
            {isRegister ? "Already have an account? Log In" : "Need an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
