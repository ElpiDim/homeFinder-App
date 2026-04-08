import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "api";
import Logo from "../components/Logo";
import "./Login.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", {
        token,
        password,
      });

      setMessage(res.data?.message || "Password reset successfully.");
      setSuccess(true);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Reset failed.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-logo-container">
          <Logo />
        </div>
        <h1 className="hero-text">
          Create a<br />New Password
        </h1>
      </div>

      <div className="login-form-container">
        <div className="login-content">
          <div className="login-header">
            <h2 className="login-title">Reset Password</h2>
            <p className="login-subtitle">Choose a new secure password for your account.</p>
          </div>

          {message && (
            <div className={`alert py-2 ${success ? "alert-success" : "alert-danger"}`} style={{ fontSize: "0.9rem" }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control-custom"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-control-custom"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="signup-text">
            Back to
            <Link to="/login" className="signup-link"> Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;