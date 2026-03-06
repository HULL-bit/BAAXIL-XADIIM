import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button, Chip, Badge } from '@mui/material'
import { People, AccountBalance, Event, MenuBook, Add, AttachMoney, Message, School, TrendingUp, Forum, Payment, Notifications } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const COLORS = {
  vert: '#2DA9E1',
  vertClair: '#7ED3FF',
  or: '#2DA9E1',
  noir: '#0F2030',
}

const StatCard = ({ title, value, icon, color }) => (
  <Card
    sx={{
      borderTop: `4px solid ${color}`,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 40px ${color}25`,
      },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>{title}</Typography>
          <Typography variant="h4" sx={{ color, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif', mt: 0.5 }}>{value}</Typography>
        </Box>
        <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [leveesFonds, setLeveesFonds] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [kamilStats, setKamilStats] = useState(null)

  useEffect(() => {
    // Charger toutes les données en parallèle pour améliorer les performances
    Promise.all([
      api.get('/auth/admin/statistiques/').then(({ data }) => data).catch(() => ({ membres_actifs: 0, total_membres: 0, cotisations_payees_ce_mois: 0, evenements: 0 })),
      api.get('/finance/levees-fonds/').then(({ data }) => {
        const lf = data.results || data
        return Array.isArray(lf) ? lf.filter(l => (l.statut_reel || l.statut) === 'active') : []
      }).catch(() => []),
      api.get('/communication/messages/conversations/').then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        return convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      }).catch(() => 0),
      api.get('/culturelle/versements-kamil/').then(({ data }) => {
        const versements = data.results || data || []
        const enAttente = Array.isArray(versements) ? versements.filter(v => v.statut === 'en_attente').length : 0
        return { en_attente: enAttente, total: Array.isArray(versements) ? versements.length : 0 }
      }).catch(() => null)
    ]).then(([statsData, levees, unread, kamil]) => {
      setStats(statsData)
      setLeveesFonds(levees)
      setUnreadMessages(unread)
      setKamilStats(kamil)
    }).finally(() => setLoading(false))
  }, [])

  // Formater le nom avec DALALL AK JAM Sen/Sokhna
  const formatUserName = () => {
    if (!user) return 'Administrateur'
    const sexe = user.sexe || user.gender
    const prefix = sexe === 'M' ? 'DALALL AK JAM Sen' : sexe === 'F' ? 'Sokhna' : ''
    const prenom = user.first_name || ''
    const nom = user.last_name || ''
    if (prefix) {
      return `${prefix} ${prenom} ${nom}`.trim()
    }
    return `${prenom} ${nom}`.trim() || user.username || 'Administrateur'
  }

  if (loading) return <Typography sx={{ color: COLORS.noir }}>Chargement...</Typography>

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700 }}>
            Bienvenue, {formatUserName()}
          </Typography>
          <Typography variant="body1" sx={{ color: COLORS.noir, mt: 0.5 }}>
            Tableau de bord Administrateur — Vue d'ensemble de la plateforme Ahibahil Khadim
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Event />}
            onClick={() => navigate('/informations/evenements')}
            sx={{
              borderColor: COLORS.vert,
              color: COLORS.noir,
              borderRadius: 2,
              '&:hover': { borderColor: COLORS.vert, backgroundColor: `${COLORS.vert}20` },
            }}
          >
            Créer Événement
          </Button>
        </Box>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Membres actifs" value={stats?.membres_actifs ?? 0} icon={<People />} color={COLORS.vert} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total membres" value={stats?.total_membres ?? 0} icon={<People />} color={COLORS.vertClair} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cotisations ce mois"
            value={
              stats
                ? `${stats.cotisations_payees_ce_mois ?? 0} / ${stats.cotisations_total_ce_mois ?? 0} (${Math.round(
                    (stats.taux_paiement_cotisations_ce_mois ?? 0) * 10,
                  ) / 10} %)`
                : '0 / 0 (0 %)'
            }
            icon={<AccountBalance />}
            color={COLORS.or}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Événements" value={stats?.evenements ?? 0} icon={<Event />} color={COLORS.vert} />
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
            title="Levées de fonds actives" 
            value={leveesFonds.length} 
            icon={<AttachMoney />} 
            color={COLORS.vert} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Versements Kamil en attente" 
            value={kamilStats?.en_attente || 0} 
            icon={<School />} 
            color={COLORS.or} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total versements Kamil" 
            value={kamilStats?.total || 0} 
            icon={<TrendingUp />} 
            color={COLORS.vertClair} 
          />
        </Grid>
      </Grid>
      {/* Cartes d'actions rapides */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #C9A961', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, mb: 2 }}>
                Gestion & Administration
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Button 
                  variant="contained" 
                  size="medium" 
                  startIcon={<Add />} 
                  onClick={() => navigate('/admin/membres')} 
                  sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, #3A7750 100%)`, justifyContent: 'flex-start' }}
                >
                  Gestion des membres
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<AccountBalance />} 
                  onClick={() => navigate('/finance/par-dahira')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Finance par Dahira
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<AttachMoney />} 
                  onClick={() => navigate('/finance/levees-fonds')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Levées de fonds
                  {leveesFonds.length > 0 && <Chip label={leveesFonds.length} size="small" sx={{ ml: 1 }} />}
                </Button>
                <Button 
                  variant="outlined" 
                  size="medium" 
                  startIcon={<Event />} 
                  onClick={() => navigate('/informations/evenements')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Gérer les événements
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #2D5F3F', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, mb: 2 }}>
                Culture & Communication
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
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
                  startIcon={<School />} 
                  onClick={() => navigate('/culturelle/versements-kamil')} 
                  sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Versements Kamil
                  {kamilStats?.en_attente > 0 && (
                    <Chip label={kamilStats.en_attente} size="small" color="warning" sx={{ ml: 1 }} />
                  )}
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
    </Box>
  )
}
