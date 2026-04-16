import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'

function AppShell({
  children,
  navItems,
  activePath,
  isMobile,
  isMobileMenuOpen,
  onNavigate,
  onToggleMobileMenu,
  onCloseMobileMenu,
}) {
  return (
    <div className="app-shell">
      {isMobile && <MobileHeader onMenuClick={onToggleMobileMenu} />}

      <Sidebar
        navItems={navItems}
        activePath={activePath}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        onNavigate={onNavigate}
        onClose={onCloseMobileMenu}
      />

      <main className="app-content">{children}</main>
    </div>
  )
}

export default AppShell