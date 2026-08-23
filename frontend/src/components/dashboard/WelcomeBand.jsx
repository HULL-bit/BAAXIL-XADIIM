import { useState, useEffect } from 'react'
import { Box, Typography, Avatar } from '@mui/material'
import { CalendarMonth, AccessTime } from '@mui/icons-material'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS_LABELS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/**
 * Bande horizontale d'accueil (identité + horloge en direct) partagée par les
 * tableaux de bord — ancre la page dans le "maintenant" plutôt que d'être une
 * simple grille de cartes.
 */
export default function WelcomeBand({ name, roleLabel }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateLabel = `${JOURS[now.getDay()]} ${now.getDate()} ${MOIS_LABELS[now.getMonth()]} ${now.getFullYear()}`

  return (
    <Box
      className="dashboard-hero-enter"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 4,
        color: '#fff',
        background: 'linear-gradient(120deg, #0F4D71 0%, #2DA9E1 100%)',
        boxShadow: '0 10px 34px rgba(15,77,113,0.28)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
        <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(255,255,255,0.22)', fontWeight: 700, fontSize: 20 }}>
          {name?.[0]?.toUpperCase() || '?'}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700, lineHeight: 1.2 }} noWrap>
            Bienvenue, {name}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }} noWrap>{roleLabel}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonth fontSize="small" sx={{ opacity: 0.85 }} />
          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{dateLabel}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime fontSize="small" sx={{ opacity: 0.85 }} />
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{heure}</Typography>
        </Box>
      </Box>
    </Box>
  )
}
