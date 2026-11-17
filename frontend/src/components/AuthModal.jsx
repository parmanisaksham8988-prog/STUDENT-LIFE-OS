import { useState } from "react";
import { api } from "../api/api";

function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{isRegister ? "Create Student Account" : "Student Login"}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-badge">{error}</div>}

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

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="demo-login-box">
          <p>Professors & Evaluators:</p>
          <button
            type="button"
            className="demo-btn"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            ⚡ 1-Click Demo Student Login (Saksham)
          </button>
        </div>

        <div className="auth-toggle">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <span onClick={() => setIsRegister(false)}>Sign In</span>
            </p>
          ) : (
            <p>
              New student?{" "}
              <span onClick={() => setIsRegister(true)}>Create an Account</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
