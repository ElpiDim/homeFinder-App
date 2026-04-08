import React, { useEffect, useMemo, useState } from "react";
import "./Settings.css";
import { useAuth } from "../context/AuthContext";
import api from "api";

const Section = ({
  icon,
  title,
  meta,
  rightTag,
  open,
  onToggle,
  children,
}) => {
  return (
    <div className={`st-card ${open ? "is-open" : ""}`}>
      <button type="button" className="st-cardHead" onClick={onToggle}>
        <div className="st-cardHeadLeft">
          <div className="st-ic">{icon}</div>
          <div className="st-headText">
            <div className="st-headTitleRow">
              <div className="st-headTitle">{title}</div>
              {rightTag ? <span className="st-tag">{rightTag}</span> : null}
            </div>
            {meta ? <div className="st-headMeta">{meta}</div> : null}
          </div>
        </div>

        <span className={`material-symbols-outlined st-chevron ${open ? "up" : ""}`}>
          expand_more
        </span>
      </button>

      <div className="st-cardBody" style={{ display: open ? "block" : "none" }}>
        {children}
      </div>
    </div>
  );
};

export default function Settings() {
  const { user, setUser } = useAuth();

  const [openKey, setOpenKey] = useState("security");

  // Security form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [showPhoneToClients, setShowPhoneToClients] = useState(!!user?.showPhoneToClients);
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    setShowPhoneToClients(!!user?.showPhoneToClients);
  }, [user?.showPhoneToClients]);

  const lastUpdatedText = useMemo(() => {
    // Αν έχεις πεδίο updatedAt στο user, το χρησιμοποιείς εδώ.
    // Αλλιώς κρατάμε ένα safe placeholder.
    return "Last updated 4 months ago";
  }, []);

  const toggle = (k) => setOpenKey((prev) => (prev === k ? "" : k));


  const onToggleShowPhone = async (e) => {
    const nextValue = e.target.checked;
    setShowPhoneToClients(nextValue);

    try {
      setSavingVisibility(true);
      const res = await api.patch('/users/me', { showPhoneToClients: nextValue });
      const updatedUser = res?.data?.user || res?.data || null;

      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else if (user) {
        const fallback = { ...user, showPhoneToClients: nextValue };
        setUser(fallback);
        localStorage.setItem('user', JSON.stringify(fallback));
      }
    } catch (err) {
      setShowPhoneToClients((prev) => !prev);
      setMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update visibility setting.',
      });
    } finally {
      setSavingVisibility(false);
    }
  };

  const onUpdatePassword = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setMsg({ type: "error", text: "Please fill all password fields." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword === currentPassword) {
      setMsg({ type: "error", text: "New password must be different from current password." });
      return;
    }

    try {
      setSaving(true);

      await api.post(
        "/auth/change-password",
        {
          currentPassword,
          newPassword,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setMsg({ type: "ok", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Failed to update password.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="st-wrap">
      <div className="st-header">
        <h1 className="st-title">Security &amp; Privacy</h1>
        <p className="st-subtitle">
          Control your account&apos;s security settings and privacy preferences.
          Keep your property data safe with two-factor authentication and managed access.
        </p>
      </div>

      <div className="st-stack">
        <Section
          icon={<span className="material-symbols-outlined">security</span>}
          title="Security & Password"
          meta={lastUpdatedText}
          open={openKey === "security"}
          onToggle={() => toggle("security")}
        >
          <form className="st-form" onSubmit={onUpdatePassword}>
            <div className="st-grid2">
              <div className="st-field">
                <label className="st-label">Current Password</label>
                <input
                  className="st-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="st-link"
                  onClick={() => alert("Hook this to your forgot-password flow")}
                >
                  Forgot your password?
                </button>
              </div>

              <div className="st-field">
                <label className="st-label">New Password</label>
                <input
                  className="st-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create new password"
                  autoComplete="new-password"
                />

                <label className="st-label st-mt12">Confirm New Password</label>
                <input
                  className="st-input"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="st-actionsRow">
              <div className={`st-msg ${msg?.type || ""}`} aria-live="polite">
                {msg?.text || ""}
              </div>

              <button className="st-primaryBtn" type="submit" disabled={saving}>
                {saving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </Section>

        <Section
          icon={<span className="material-symbols-outlined">verified_user</span>}
          title="Two-Factor Authentication"
          meta="Add an extra layer of security to your account"
          rightTag="RECOMMENDED"
          open={openKey === "2fa"}
          onToggle={() => toggle("2fa")}
        >
          <div className="st-mutedBox">
            <div className="st-mutedTitle">Enable 2FA</div>
            <div className="st-mutedText">
              Add OTP (Authenticator app) or SMS verification for safer sign-in.
            </div>

            <div className="st-rowBtns">
              <button
                type="button"
                className="st-outlineBtn"
                onClick={() => alert("Hook to OTP setup")}
              >
                Set up Authenticator
              </button>
              <button
                type="button"
                className="st-outlineBtn"
                onClick={() => alert("Hook to SMS setup")}
              >
                Set up SMS
              </button>
            </div>
          </div>
        </Section>

        <Section
          icon={<span className="material-symbols-outlined">link</span>}
          title="Linked Accounts"
          meta="Manage external login methods and integrations"
          open={openKey === "linked"}
          onToggle={() => toggle("linked")}
        >
          <div className="st-mutedBox">
            <div className="st-mutedTitle">Connections</div>
            <div className="st-mutedText">
              Connect Google/Apple or remove existing linked providers.
            </div>

            <div className="st-rowList">
              <div className="st-miniRow">
                <div className="st-miniLeft">
                  <span className="st-miniIc">G</span>
                  <div>
                    <div className="st-miniTitle">Google</div>
                    <div className="st-miniSub">Not connected</div>
                  </div>
                </div>
                <button className="st-outlineBtn" type="button" onClick={() => alert("Connect Google")}>
                  Connect
                </button>
              </div>

              <div className="st-miniRow">
                <div className="st-miniLeft">
                  <span className="st-miniIc"></span>
                  <div>
                    <div className="st-miniTitle">Apple</div>
                    <div className="st-miniSub">Not connected</div>
                  </div>
                </div>
                <button className="st-outlineBtn" type="button" onClick={() => alert("Connect Apple")}>
                  Connect
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          icon={<span className="material-symbols-outlined">visibility</span>}
          title="Data Visibility"
          meta="Manage who can see your listings and data sharing"
          open={openKey === "visibility"}
          onToggle={() => toggle("visibility")}
        >
          <div className="st-mutedBox">
            <div className="st-mutedTitle">Privacy</div>
            <div className="st-mutedText">
              Control what is visible to people and what stays private.
            </div>

            <div className="st-switchRow">
              <div>
                <div className="st-switchTitle">Show phone number </div>
                <div className="st-switchSub">If enabled, users can see your contact phone.</div>
              </div>
              <label className="st-switch">
                <input
                  type="checkbox"
                  checked={showPhoneToClients}
                  onChange={onToggleShowPhone}
                  disabled={savingVisibility}
                />
                <span className="st-slider" />
              </label>
            </div>

            <div className="st-switchRow">
              <div>
                <div className="st-switchTitle">Allow analytics</div>
                <div className="st-switchSub">Help improve the app by sharing anonymous usage.</div>
              </div>
              <label className="st-switch">
                <input type="checkbox" defaultChecked />
                <span className="st-slider" />
              </label>
            </div>
          </div>
        </Section>
      </div>

      <div className="st-footerNote">
        Signed in as <b>{user?.name || "User"}</b>
      </div>
    </div>
  );
}
