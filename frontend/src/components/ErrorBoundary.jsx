import { Component } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { colors } from '../styles/theme'

const RELOAD_GUARD_KEY = 'ahma_chunk_reload_attempted'

function isChunkLoadError(error) {
  const msg = String(error?.message || error || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    // Après un redéploiement, les anciens onglets référencent des fichiers JS avec un hash
    // qui n'existe plus sur le serveur : le import() dynamique échoue. Sans ce filet, React
    // démonte toute l'application (écran blanc, plus rien de cliquable). On ne recharge
    // qu'une seule fois (sessionStorage) pour éviter une boucle si le problème persiste.
    if (isChunkLoadError(error)) {
      const alreadyTried = sessionStorage.getItem(RELOAD_GUARD_KEY)
      if (!alreadyTried) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
        window.location.reload()
      }
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem(RELOAD_GUARD_KEY)
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1, color: colors.vertFonce }}>
            Une nouvelle version de l'application est disponible.
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: colors.noir }}>
            Rechargez la page pour continuer.
          </Typography>
          <Button variant="contained" onClick={this.handleRetry} sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}>
            Recharger
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}
