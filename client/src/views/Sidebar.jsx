import {
  DashboardIcon,
  CalendarIcon,
  TransportIcon,
  ModulesIcon,
  AccountIcon,
  LogoutIcon,
  LogoIcon,
} from './Icons'

function Sidebar({ navItems, activePath, isMobile, isOpen, onNavigate, onClose }) {
  const getNavIcon = (id) => {
    switch (id) {
      case 'dashboard':
        return <DashboardIcon />
      case 'calendar':
        return <CalendarIcon />
      case 'transport':
        return <TransportIcon />
      case 'modules':
        return <ModulesIcon />
      case 'account':
        return <AccountIcon />
      default:
        return null
    }
  }

  const mainItems = navItems.filter((item) => item.id !== 'account')
  const accountItem = navItems.find((item) => item.id === 'account')

  return (
    <>
      {isMobile && isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isMobile ? 'mobile' : 'desktop'} ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">
              <LogoIcon />
            </div>

            <div className="brand-text">
              <div className="brand-title">SmartMirror</div>
              <div className="brand-subtitle">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {mainItems.map((item) => {
            const isActive = activePath === item.path

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.path)}
              >
                <span className="nav-icon">{getNavIcon(item.id)}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          {accountItem && (
            <button
              type="button"
              className={`nav-item ${activePath === accountItem.path ? 'active' : ''}`}
              onClick={() => onNavigate(accountItem.path)}
            >
              <span className="nav-icon">{getNavIcon(accountItem.id)}</span>
              <span className="nav-label">{accountItem.label}</span>
            </button>
          )}

          <button type="button" className="logout-button">
            <span className="nav-icon">
              <LogoutIcon />
            </span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar