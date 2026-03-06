import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import Header from './Header'
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './Sidebar'
import Footer from './Footer'

export default function Layout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH)
  const mainMarginLeft = isMobile ? 0 : sidebarWidth

  const BEIGE = '#F4FAFF'
  const BEIGE_CLAIR = '#F9FCFF'
  const BLEU = '#2DA9E1'

  return (
    <Box
      className="bg-pattern"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${BEIGE_CLAIR} 0%, ${BEIGE} 30%, ${BEIGE} 100%)`,
      }}
    >
      <Header
        onMenuClick={() => (isMobile ? setSidebarOpen(true) : setSidebarCollapsed((c) => !c))}
        sidebarCollapsed={!isMobile && sidebarCollapsed}
        sidebarWidth={mainMarginLeft}
        isMobile={isMobile}
      />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={!isMobile && sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${mainMarginLeft}px`,
          p: { xs: 2, sm: 3 },
          minHeight: 'calc(100vh - 64px - 72px)',
          maxHeight: { xs: 'calc(100dvh - 64px - 72px)', md: 'none' },
          overflowY: { xs: 'auto', md: 'visible' },
          WebkitOverflowScrolling: 'touch',
          background: `linear-gradient(180deg, ${BEIGE} 0%, ${BEIGE_CLAIR} 50%, ${BEIGE} 100%)`,
          boxShadow: `inset 0 0 80px ${BLEU}08`,
          transition: 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease',
        }}
      >
        <Outlet />
      </Box>
      <Footer sidebarWidth={mainMarginLeft} />
    </Box>
  )
}
