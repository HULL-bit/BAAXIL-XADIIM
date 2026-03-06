import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Link } from '@mui/material'
import logo from '/logo.jpeg'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      const isJewrine =
        !!user?.role &&
        (user.role === 'jewrin' ||
          user.role.toLowerCase().startsWith('jewrine_'))
      const dest = user?.role === 'admin' ? '/admin' : isJewrine ? '/jewrin' : '/membre'
      navigate(dest)
    } catch (err) {
      setError(err.response?.data?.detail || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="bg-auth bg-pattern" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card
        className="glass-card"
        sx={{
          maxWidth: 420,
          width: '100%',
          borderLeft: '4px solid #2DA9E1',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(45, 169, 225, 0.25)',
          transition: 'transform 0.35s ease, box-shadow 0.35s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 56px rgba(15, 77, 113, 0.35)',
          },
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: 88, mb: 1.5 }} />
            <Typography
              variant="h4"
              className="title-script"
              sx={{ mb: 0.5, color: '#2DA9E1' }}
            >
              Ahibahil Khadim
            </Typography>
            <Typography
              variant="body1"
              className="subtitle-elegant"
              sx={{ color: '#1A1A1A', fontSize: '1rem' }}
            >
              Connexion à la plateforme
            </Typography>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoComplete="username"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              type="password"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2DA9E1 0%, #0F4D71 100%)',
                boxShadow: '0 4px 14px rgba(15, 77, 113, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0F4D71 0%, #2DA9E1 100%)',
                  boxShadow: '0 6px 20px rgba(15, 77, 113, 0.45)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center' }}>
            Pas de compte ?{' '}
            <Link component={RouterLink} to="/register" underline="hover" sx={{ color: '#2DA9E1', fontWeight: 600 }}>
              S'inscrire
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center', mt: 1 }}>
            <Link component={RouterLink} to="/accueil" underline="hover" sx={{ color: '#2DA9E1' }}>
              ← Retour à l'accueil
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
