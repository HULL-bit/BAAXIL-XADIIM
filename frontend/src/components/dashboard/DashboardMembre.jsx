import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button, Chip, Badge } from '@mui/material'
import { AccountBalance, MenuBook, Event, Message, AttachMoney, TrendingUp, Notifications, Forum, Group, School, Payment } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const COLORS = {
  vert: '#2DA9E1',
  vertFonce: '#0F4D71',
  or: '#2DA9E1',
  noir: '#1A1A1A',
}

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

export default function DashboardMembre() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cotisationStats, setCotisationStats] = useState(null)
  const [kamilStats, setKamilStats] = useState(null)
  const [leveesFonds, setLeveesFonds] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Charger toutes les données en parallèle pour améliorer les performances
    Promise.all([
      api.get('/finance/cotisations/statistiques/').then(({ data }) => data).catch(() => null),
      api.get('/culturelle/versements-kamil/mes_stats/').then(({ data }) => data).catch(() => null),
      api.get('/finance/levees-fonds/').then(({ data }) => {
        const lf = data.results || data
        return Array.isArray(lf) ? lf.filter(l => (l.statut_reel || l.statut) === 'active') : []
      }).catch(() => []),
      api.get('/communication/messages/conversations/').then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        return convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      }).catch(() => 0)
    ]).then(([cotisations, kamil, levees, unread]) => {
      setCotisationStats(cotisations)
      setKamilStats(kamil)
      setLeveesFonds(levees)
      setUnreadMessages(unread)
    }).finally(() => setLoading(false))
  }, [])

  // Utiliser useMemo pour éviter les recalculs inutiles
  const valeurCotisations = useMemo(() => {
    const totalAssignations = cotisationStats?.total_assignations ?? 0
    const totalPayees = cotisationStats?.total_payees ?? 0
    const pourcentagePayees = cotisationStats?.pourcentage_payees ?? 0
    return totalAssignations > 0
      ? `${totalPayees} / ${totalAssignations} (${Math.round(pourcentagePayees * 10) / 10} %)`
      : `${user?.cotisations_payees ?? 0}`
  }, [cotisationStats, user])

  // Formater le nom avec DALALL AK JAM Sen/Sokhna - mémorisé pour éviter les recalculs
  const formatUserName = useCallback(() => {
    if (!user) return ''
    const sexe = user.sexe || user.gender
    const prefix = sexe === 'M' ? 'DALALL AK JAM Sen' : sexe === 'F' ? 'Sokhna' : ''
    const prenom = user.first_name || ''
    const nom = user.last_name || ''
    if (prefix) {
      return `${prefix} ${prenom} ${nom}`.trim()
    }
    return `${prenom} ${nom}`.trim() || user.username || 'Membre'
  }, [user])

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700, mb: 0.5 }}>
        Bienvenue, {formatUserName()}
      </Typography>
      <Typography variant="body1" sx={{ color: COLORS.noir, mb: 3 }}>
        Tableau de bord membre — Ahibahil Khadim
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cotisations payées"
            value={valeurCotisations}
            icon={<AccountBalance />}
            color={COLORS.vert}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Chapitres lus (Kamil)" value={user?.chapitres_lus ?? 0} icon={<MenuBook />} color={COLORS.or} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Événements participés" value={user?.evenements_participes ?? 0} icon={<Event />} color={COLORS.vert} />
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
          <StatCard 
            title="Versements Kamil" 
            value={kamilStats ? `${kamilStats.nb_valides || 0} / ${kamilStats.nb_versements || 0}` : '0 / 0'} 
            icon={<School />} 
            color={COLORS.vert} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Montant versé (Kamil)" 
            value={kamilStats ? `${Math.round(kamilStats.pourcentage_global || 0)}%` : '0%'} 
            icon={<TrendingUp />} 
            color={COLORS.or} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Levées de fonds actives" 
            value={leveesFonds.length} 
            icon={<AttachMoney />} 
            color={COLORS.vert} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Membres actifs" 
            value="—" 
            icon={<Group />} 
            color={COLORS.or} 
          />
        </Grid>
      </Grid>
      {/* Cartes d'actions rapides */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #C9A961', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', mb: 2 }}>Mes actions rapides</Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Button 
                  variant="contained" 
                  size="medium" 
                  startIcon={<AccountBalance />} 
                  onClick={() => navigate('/finance/levees-fonds')} 
                  sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, ${COLORS.vertFonce} 100%)`, justifyContent: 'flex-start' }}
                >
                  Levées de fonds
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<MenuBook />} 
                  onClick={() => navigate('/culturelle/mes-progressions')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Mes JUKKI
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<Event />} 
                  onClick={() => navigate('/informations/evenements')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Voir les événements
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
                  Messagerie {unreadMessages > 0 && <Chip label={unreadMessages} size="small" color="error" sx={{ ml: 1, height: 20 }} />}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #2D5F3F', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', mb: 2 }}>Finance & Participation</Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                {leveesFonds.length > 0 && (
                  <Button 
                    variant="contained" 
                    size="medium" 
                    startIcon={<AttachMoney />} 
                    onClick={() => navigate('/finance/levees-fonds')} 
                    sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, ${COLORS.vertFonce} 100%)`, justifyContent: 'flex-start' }}
                  >
                    Participer aux levées de fonds
                    <Chip label={leveesFonds.length} size="small" sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.3)', color: 'inherit' }} />
                  </Button>
                )}
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<Payment />} 
                  onClick={() => navigate('/finance/levees-fonds')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Mes participations
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<TrendingUp />} 
                  onClick={() => navigate('/culturelle/versements-kamil')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Mes versements Kamil
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<Forum />} 
                  onClick={() => navigate('/communication/forums')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Forums de discussion
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Carte d'informations */}
      {kamilStats && (kamilStats.total_assigne > 0 || kamilStats.nb_versements > 0) && (
        <Card sx={{ mt: 3, borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #C9A961' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', mb: 2 }}>Mes statistiques Kamil</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>Montant assigné</Typography>
                <Typography variant="h6" sx={{ color: COLORS.vert, fontWeight: 700 }}>
                  {kamilStats.total_assigne?.toLocaleString('fr-FR') || 0} FCFA
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>Montant versé</Typography>
                <Typography variant="h6" sx={{ color: COLORS.or, fontWeight: 700 }}>
                  {kamilStats.total_verse?.toLocaleString('fr-FR') || 0} FCFA
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>Reste à verser</Typography>
                <Typography variant="h6" sx={{ color: COLORS.vert, fontWeight: 700 }}>
                  {kamilStats.reste_global?.toLocaleString('fr-FR') || 0} FCFA
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>Progression</Typography>
                <Typography variant="h6" sx={{ color: COLORS.or, fontWeight: 700 }}>
                  {Math.round(kamilStats.pourcentage_global || 0)}%
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
