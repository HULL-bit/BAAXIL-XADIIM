import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { AuthProvider } from './context/AuthContext'
import theme from './styles/theme'
import App from './App'
import './styles/global.css'

// Après un redéploiement, un onglet déjà ouvert peut référencer un chunk JS dont le hash
// n'existe plus sur le serveur : Vite émet cet évènement quand le preload d'un import()
// dynamique échoue. On recharge une seule fois (sinon boucle si le problème persiste).
window.addEventListener('vite:preloadError', () => {
  const key = 'ahma_chunk_reload_attempted'
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1')
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>,
)
