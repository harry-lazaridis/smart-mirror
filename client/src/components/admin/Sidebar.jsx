export default function Sidebar({ activeTab, setActiveTab }) {
  const items = [
    { id: "profile", label: "Profile" },
    { id: "calendar", label: "Calendar" },
    { id: "sl", label: "SL Transport" },
    { id: "widgets", label: "Widgets" },
  ];

  return (
    <div style={styles.sidebar}>
      <h2 style={styles.logo}>Mirror Admin</h2>

      <div style={styles.menu}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              ...styles.button,
              background: activeTab === item.id ? "#334155" : "transparent",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "220px",
    background: "#0f172a",
    color: "white",
    padding: "20px 15px",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #1e293b",
  },
  logo: {
    fontSize: "18px",
    marginBottom: "20px",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  button: {
    padding: "10px",
    border: "none",
    color: "white",
    cursor: "pointer",
    textAlign: "left",
    borderRadius: "6px",
  },
};