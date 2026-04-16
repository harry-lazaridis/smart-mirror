function MobileHeader({ onMenuClick }) {
  return (
    <header className="mobile-header">
      <button type="button" className="hamburger-button" onClick={onMenuClick}>
        <span />
        <span />
        <span />
      </button>

      <div className="mobile-header-title">SmartMirror</div>
    </header>
  )
}

export default MobileHeader