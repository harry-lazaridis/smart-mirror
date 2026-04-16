import { useEffect, useState } from 'react'
import { navItems } from '../SidebarModel'

export function useSidebarPresenter() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activePath, setActivePath] = useState(window.location.pathname)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)

      if (!mobile) {
        setIsMobileMenuOpen(false)
      }
    }

    const handlePopState = () => {
      setActivePath(window.location.pathname)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigateTo = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }

    setActivePath(path)
    setIsMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return {
    navItems,
    activePath,
    isMobile,
    isMobileMenuOpen,
    navigateTo,
    toggleMobileMenu,
    closeMobileMenu,
  }
}