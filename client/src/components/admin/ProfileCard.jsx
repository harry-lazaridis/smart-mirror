// src/components/admin/ProfileCard.jsx
export default function ProfileCard({ user }) {
  return (
    <div style={styles.card}>
      <h2>User Profile</h2>

      <div style={styles.info}>
        <p><strong>Name:</strong> {user.displayName || "N/A"}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>User ID:</strong> {user.uid}</p>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: 20,
    background: "#1e293b",
    borderRadius: 12,
  },
  info: {
    marginTop: 10,
    lineHeight: 1.8,
  },
};