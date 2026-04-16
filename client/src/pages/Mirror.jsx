/*import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Mirror() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.get("/health").then(res => {
      setStatus(res.data.status);
    });
  }, []);

  return (
    <div>
      Smart Mirror Status: {status}
    </div>
  );
} */

import { useSidebarPresenter } from '../presenters/useSidebarPresenter'
import AppShell from '../views/AppShell'
import DashboardPage from './DashboardPage'
import CalendarPage from './CalendarPage'
import TransportPage from './TransportPage'
import ModulesPage from './ModulesPage'
import ManageAccountPage from './ManageAccountPage'

function Mirror() {
  const {
    navItems,
    activePath,
    isMobile,
    isMobileMenuOpen,
    navigateTo,
    toggleMobileMenu,
    closeMobileMenu,
  } = useSidebarPresenter()

  const renderPage = () => {
    switch (activePath) {
      case '/calendar':
        return <CalendarPage />
      case '/transport':
        return <TransportPage />
      case '/modules':
        return <ModulesPage />
      case '/account':
        return <ManageAccountPage />
      case '/':
      default:
        return <DashboardPage />
    }
  }

  return (
    <AppShell
      navItems={navItems}
      activePath={activePath}
      isMobile={isMobile}
      isMobileMenuOpen={isMobileMenuOpen}
      onNavigate={navigateTo}
      onToggleMobileMenu={toggleMobileMenu}
      onCloseMobileMenu={closeMobileMenu}
    >
      {renderPage()}
    </AppShell>
  )
}

export default Mirror