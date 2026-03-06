import { Box, Typography, Link } from '@mui/material'

const COLORS = {
  vert: '#2DA9E1',
  or: '#2DA9E1',
  beige: '#F4FAFF',
  beigeClair: '#F9FCFF',
  vertFonce: '#0F4D71',
  noir: '#1A1A1A',
}

export default function Footer({ sidebarWidth = 0 }) {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        ml: `${sidebarWidth}px`,
        borderTop: `2px solid ${COLORS.vert}`,
        background: `linear-gradient(90deg, ${COLORS.beige} 0%, ${COLORS.beigeClair} 100%)`,
        boxShadow: `0 -4px 20px ${COLORS.vert}10`,
        textAlign: 'center',
        transition: 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>
        © {new Date().getFullYear()} Ahibahil Khadim — Plateforme de gestion
      </Typography>
      <Typography variant="caption" sx={{ color: COLORS.vert, display: 'block', mt: 0.5 }}>
        <Link href="#" sx={{ color: COLORS.vert, '&:hover': { textDecoration: 'underline' } }} underline="hover">Mentions légales</Link>
        {' · '}
        <Link href="#" sx={{ color: COLORS.vert, '&:hover': { textDecoration: 'underline' } }} underline="hover">Contact</Link>
      </Typography>
    </Box>
  )
}
