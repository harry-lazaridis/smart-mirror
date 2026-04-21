import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";

export default function UserManager() {
  const [user, setUser]                   = useState(null);
  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [status, setStatus]               = useState({ message: "", type: "" });
  const [loading, setLoading]             = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setName(u.displayName ?? ""); setEmail(u.email ?? ""); }
    });
    return () => unsub();
  }, []);

  const showStatus = (message, type = "success") => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: "", type: "" }), 3000);
  };

  const reauthenticate = async () => {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  };

  const handleUpdateName = async () => {
    setLoading(true);
    try {
      await updateProfile(user, { displayName: name });
      showStatus("Name updated!");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!currentPassword) { showStatus("Enter your current password to change email", "error"); return; }
    setLoading(true);
    try {
      await reauthenticate();
      await updateEmail(user, email);
      showStatus("Email updated!");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) { showStatus("Passwords don't match", "error"); return; }
    if (newPassword.length < 6) { showStatus("Password must be at least 6 characters", "error"); return; }
    if (!currentPassword) { showStatus("Enter your current password first", "error"); return; }
    setLoading(true);
    try {
      await reauthenticate();
      await updatePassword(user, newPassword);
      setNewPassword(""); setConfirmPassword(""); setCurrentPassword("");
      showStatus("Password updated!");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Account settings</h1>
        <p>Update your name, email and password.</p>
      </div>

      {status.message && (
        <div className={status.type === "error" ? "status-error" : "status-success"}>
          {status.message}
        </div>
      )}

      {/* Name */}
      <div className="settings-card">
        <h2>Display name</h2>
        <label>Name</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="settings-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <button className="btn-primary" onClick={handleUpdateName} disabled={loading}>Save</button>
        </div>
      </div>

      {/* Email */}
      <div className="settings-card">
        <h2>Email</h2>
        <label>Email address</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="settings-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          <button className="btn-primary" onClick={handleUpdateEmail} disabled={loading}>Save</button>
        </div>
      </div>

      {/* Password */}
      <div className="settings-card">
        <h2>Change password</h2>
        <label>New password</label>
        <input className="settings-input" type="password" value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)} placeholder="New password"
          style={{ marginBottom: 8 }} />

        <label>Confirm new password</label>
        <input className="settings-input" type="password" value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
          style={{ marginBottom: 16 }} />

        <label>
          Current password{" "}
          <span style={{ color: "#9ca3af", fontWeight: 400 }}>(required for email & password changes)</span>
        </label>
        <input className="settings-input" type="password" value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Your current password"
          style={{ marginBottom: 16 }} />

        <button className="btn-primary" onClick={handleUpdatePassword} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Updating..." : "Update password"}
        </button>
      </div>
    </div>
  );
}