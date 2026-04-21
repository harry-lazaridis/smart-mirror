const toggleDevMode = () => {
  const current = localStorage.getItem("devMode") === "true";
  localStorage.setItem("devMode", String(!current));
  window.location.reload();
};

export default function ProfileCard({ user }) {
  const devMode = localStorage.getItem("devMode") === "true";

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your account overview.</p>
      </div>

      <div className="settings-card">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#2563eb", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, flexShrink: 0,
          }}>
            {(user.displayName || user.email)?.[0]?.toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111827" }}>
              {user.displayName || "No name set"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "#6b7280" }}>{user.email}</p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "#6b7280" }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>User ID: </span>{user.uid}
          </p>
        </div>
      </div>

      {/* Dev mode — ta bort vid deploy */}
      <div className="settings-card">
        <h2>Developer</h2>
        <button
          onClick={toggleDevMode}
          className={devMode ? "btn-primary" : "btn-secondary"}
        >
          {devMode ? "Dev mode ON" : "Dev mode OFF"}
        </button>
      </div>
    </div>
  );
}