import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button, Chip, Badge } from '@mui/material'
import { CheckCircle, MenuBook, Mosque, Add, School, TrendingUp, People, Message } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', noir: '#1A1A1A' }

const StatCard = ({ title, value, icon, color }) => (
  <Card
    sx={{
      borderTop: `4px solid ${color}`,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.35s ease',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 40px ${color}25` },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>{title}</Typography>
          <Typography variant="h5" sx={{ color, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>{value}</Typography>
        </Box>
        <Box sx={{ color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

export default function DashboardJewrin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [validationsEnAttente, setValidationsEnAttente] = useState(0)
  const [progressionsKamil, setProgressionsKamil] = useState(0)
  const [versementsEnAttente, setVersementsEnAttente] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Charger toutes les données en parallèle pour améliorer les performances
    Promise.all([
      api.get('/culturelle/progressions/').then(({ data }) => {
        const progressions = data.results || data || []
        const enAttente = Array.isArray(progressions) ? progressions.filter(p => p.statut === 'en_attente').length : 0
        return { enAttente, total: Array.isArray(progressions) ? progressions.length : 0 }
      }).catch(() => ({ enAttente: 0, total: 0 })),
      api.get('/culturelle/versements-kamil/').then(({ data }) => {
        const versements = data.results || data || []
        return Array.isArray(versements) ? versements.filter(v => v.statut === 'en_attente').length : 0
      }).catch(() => 0),
      api.get('/communication/messages/conversations/').then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        return convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      }).catch(() => 0)
    ]).then(([progressions, versements, unread]) => {
      setValidationsEnAttente(progressions.enAttente)
      setProgressionsKamil(progressions.total)
      setVersementsEnAttente(versements)
      setUnreadMessages(unread)
    }).finally(() => setLoading(false))
  }, [])

  // Formater le nom avec DALALL AK JAM Sen/Sokhna
  const formatUserName = () => {
    if (!user) return 'Jewrin'
    const sexe = user.sexe || user.gender
    const prefix = sexe === 'M' ? 'DALALL AK JAM Sen' : sexe === 'F' ? 'Sokhna' : ''
    const prenom = user.first_name || ''
    const nom = user.last_name || ''
    if (prefix) {
      return `${prefix} ${prenom} ${nom}`.trim()
    }
    return `${prenom} ${nom}`.trim() || user.username || 'Jewrin'
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700, mb: 0.5 }}>
        Bienvenue, {formatUserName()}
      </Typography>
      <Typography variant="body1" sx={{ color: COLORS.noir, mb: 3 }}>
        Tableau de bord Jewrin — Gestion culturelle et religieuse — Validations Kamil, activités, enseignements
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Validations en attente" 
            value={validationsEnAttente > 0 ? validationsEnAttente : 'Aucune'} 
            icon={<CheckCircle />} 
            color={COLORS.vert} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Progressions Kamil" 
            value={progressionsKamil} 
            icon={<MenuBook />} 
            color={COLORS.or} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Versements en attente" 
            value={versementsEnAttente > 0 ? versementsEnAttente : 'Aucun'} 
            icon={<School />} 
            color={COLORS.vert} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Messages non lus" 
            value={unreadMessages > 0 ? unreadMessages : 'Aucun'} 
            icon={
              <Badge badgeContent={unreadMessages} color="error" invisible={unreadMessages === 0}>
                <Message />
              </Badge>
            } 
            color={COLORS.or} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Programme Kamil" value="Actif" icon={<MenuBook />} color={COLORS.vert} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Activités religieuses" value="—" icon={<Mosque />} color={COLORS.or} />
        </Grid>
      </Grid>
      {/* Cartes d'actions rapides */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #C9A961', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, mb: 2 }}>
                Validations & Kamil
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Button 
                  variant="contained" 
                  size="medium" 
                  startIcon={<CheckCircle />} 
                  onClick={() => navigate('/culturelle/validations')} 
                  sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, #3A7750 100%)`, justifyContent: 'flex-start' }}
                >
                  Valider les progressions
                  {validationsEnAttente > 0 && (
                    <Chip label={validationsEnAttente} size="small" color="warning" sx={{ ml: 1 }} />
                  )}
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<School />} 
                  onClick={() => navigate('/culturelle/versements-kamil')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Valider les versements Kamil
                  {versementsEnAttente > 0 && (
                    <Chip label={versementsEnAttente} size="small" color="warning" sx={{ ml: 1 }} />
                  )}
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<MenuBook />} 
                  onClick={() => navigate('/culturelle/kamil')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Programme Kamil
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<People />} 
                  onClick={() => navigate('/culturelle/progressions')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Toutes les progressions
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #2D5F3F', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, mb: 2 }}>
                Activités & Communication
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<Add />} 
                  onClick={() => navigate('/culturelle/activites-religieuses')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Créer une activité religieuse
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<Mosque />} 
                  onClick={() => navigate('/culturelle/activites-religieuses')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Gérer les activités religieuses
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={
                    <Badge badgeContent={unreadMessages} color="error" invisible={unreadMessages === 0}>
                      <Message />
                    </Badge>
                  } 
                  onClick={() => navigate('/communication/messagerie')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Messagerie
                  {unreadMessages > 0 && <Chip label={unreadMessages} size="small" color="error" sx={{ ml: 1 }} />}
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<TrendingUp />} 
                  onClick={() => navigate('/culturelle/statistiques')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Statistiques Kamil
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
