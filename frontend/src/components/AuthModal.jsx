import { useState } from "react";
import { api, getBaseApiUrl } from "../api/api";

function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(() => api.getCustomApiUrl() || "");
  const [urlSavedMsg, setUrlSavedMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error("Name is required");
        const data = await api.register(name.trim(), email.trim(), password);
        onLoginSuccess(data.user);
      } else {
        const data = await api.login(email.trim(), password);
        onLoginSuccess(data.user);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed");
      // If it looks like a network or connection error, auto-open the server config
      if (err.message && (err.message.includes("Cannot connect") || err.message.includes("Failed to fetch"))) {
        setShowServerConfig(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api.login("demo@student.edu", "password123");
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || "Demo login failed");
      if (err.message && (err.message.includes("Cannot connect") || err.message.includes("Failed to fetch"))) {
        setShowServerConfig(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomUrl = (e) => {
    e.preventDefault();
    api.setCustomApiUrl(customUrl);
    setUrlSavedMsg("Backend URL saved successfully! Retrying connection...");
    setTimeout(() => setUrlSavedMsg(""), 3000);
  };

  const handleResetUrl = () => {
    api.setCustomApiUrl("");
    setCustomUrl("");
    setUrlSavedMsg("Reset to default backend URL.");
    setTimeout(() => setUrlSavedMsg(""), 3000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{isRegister ? "Create Student Account" : "Student Login"}</h2>
          <button className="close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {error && (
          <div className="error-badge" style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Saksham Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>College / Personal Email</label>
            <input
              type="email"
              placeholder="student@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="primary-btn" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
            {loading ? "Processing..." : isRegister ? "Create Account & Sync" : "Sign In"}
          </button>
        </form>

        <div className="demo-login-box" style={{ marginTop: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", opacity: 0.8 }}>⚡ 1-Click Test Access:</p>
          <button
            type="button"
            className="demo-btn"
            onClick={handleDemoLogin}
            disabled={loading}
            style={{ width: "100%" }}
          >
            ⚡ Login as Demo Student (Saksham)
          </button>
        </div>

        <div className="auth-toggle" style={{ marginTop: "1rem", textAlign: "center" }}>
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 600 }}
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New student?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 600 }}
              >
                Create an Account
              </button>
            </p>
          )}
        </div>

        {/* SERVER / DEPLOYMENT URL SETTINGS (COLLAPSIBLE) */}
        <div style={{ marginTop: "1.2rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border, #333)", fontSize: "0.82rem" }}>
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted, #888)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: 0,
              fontSize: "0.82rem"
            }}
          >
            ⚙️ {showServerConfig ? "Hide Backend Server Settings" : "Backend Server Settings (Render / Localhost)"}
          </button>

          {showServerConfig && (
            <div style={{ marginTop: "0.8rem", padding: "0.8rem", background: "rgba(99, 102, 241, 0.08)", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 0.4rem 0", color: "var(--text, #fff)" }}>
                Current API Endpoint: <code>{getBaseApiUrl()}</code>
              </p>
              <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.78rem", color: "var(--text-muted, #aaa)" }}>
                If using Vercel (frontend) + Render (backend), paste your Render backend URL here (e.g. <code>https://my-backend.onrender.com/api</code>):
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="https://your-backend.onrender.com/api"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.82rem", borderRadius: "4px" }}
                />
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSaveCustomUrl}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                >
                  Save
                </button>
                {customUrl && (
                  <button
                    type="button"
                    onClick={handleResetUrl}
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem", background: "none", border: "1px solid #666", borderRadius: "4px", color: "inherit", cursor: "pointer" }}
                  >
                    Reset
                  </button>
                )}
              </div>
              {urlSavedMsg && (
                <p style={{ margin: "0.4rem 0 0 0", color: "#10b981", fontSize: "0.78rem" }}>
                  ✓ {urlSavedMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
