import { FiLoader } from "react-icons/fi";

export default function Loader({ label = "Loading...", dark = false, compact = false }) {
  return (
    <div className={`loader-wrap ${dark ? "loader-wrap--dark" : ""} ${compact ? "loader-wrap--compact" : ""}`}>
      <FiLoader className="loader-icon" size={compact ? 18 : 24} />
      <span className="loader-text">{label}</span>
    </div>
  );
}
