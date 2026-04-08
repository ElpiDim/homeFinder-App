import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "api";
import Logo from "../components/Logo";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data?.message || "If an account exists, a reset link has been sent.");
      setSuccess(true);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Something went wrong.");
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
          Reset Your<br />Password
        </h1>
      </div>

      <div className="login-form-container">
        <div className="login-content">
          <div className="login-header">
            <h2 className="login-title">Forgot Password?</h2>
            <p className="login-subtitle">Enter your email and we’ll send you a reset link.</p>
          </div>

          {message && (
            <div className={`alert py-2 ${success ? "alert-success" : "alert-danger"}`} style={{ fontSize: "0.9rem" }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control-custom"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="signup-text">
            Remembered your password?
            <Link to="/login" className="signup-link"> Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;