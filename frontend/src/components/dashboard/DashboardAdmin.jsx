import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button, Chip, Badge } from '@mui/material'
import { People, AccountBalance, Event, Add, AttachMoney, Message, TrendingUp, Payment, Man, Woman, MenuBook as StudentIcon, Work, RequestQuote } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import WelcomeBand from './WelcomeBand'

const COLORS = {
  vert: '#2DA9E1',
  vertClair: '#7ED3FF',
  or: '#2DA9E1',
  noir: '#0F2030',
}

// Cartes "hero" plus grandes pour les indicateurs prioritaires (membres + finance) ;
// les StatCard classiques restent pour les répartitions secondaires.
const HeroCard = ({ title, value, subtitle, icon, color, delay = 0 }) => (
  <Card
    className="dashboard-hero-enter"
    sx={{
      borderTop: `6px solid ${color}`,
      borderRadius: 4,
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(12px)',
      height: '100%',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      animationDelay: `${delay}ms`,
      '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 16px 48px ${color}30` },
    }}
  >
    <CardContent sx={{ p: 3.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body1" sx={{ color: COLORS.noir, fontWeight: 600 }}>{title}</Typography>
          <Typography variant="h3" sx={{ color, fontWeight: 800, fontFamily: '"Cormorant Garamond", serif', mt: 0.5 }}>{value}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>}
        </Box>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

const StatCard = ({ title, value, icon, color, delay = 0 }) => (
  <Card
    className="dashboard-hero-enter"
    sx={{
      borderTop: `4px solid ${color}`,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      animationDelay: `${delay}ms`,
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 40px ${color}25` },
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
  const { user, isSuperAdmin, permissions } = useAuth()
  const canViewMembers = !!permissions?.can_view_members
  const canViewFinance = !!permissions?.can_view_finance
  const canManageMembers = !!permissions?.can_manage_members
  const canManageFinance = !!permissions?.can_manage_finance
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    Promise.all([
      api.get('/auth/admin/statistiques/').then(({ data }) => data).catch(() => ({})),
      api.get('/communication/messages/conversations/').then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        return convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      }).catch(() => 0),
    ]).then(([statsData, unread]) => {
      setStats(statsData)
      setUnreadMessages(unread)
    }).finally(() => setLoading(false))
  }, [])

  const formatUserName = () => {
    if (!user) return ''
    const sexe = user.sexe || user.gender
    const prefix = sexe === 'M' ? 'DALALL AK JAM Sen' : sexe === 'F' ? 'Sokhna' : ''
    const prenom = user.first_name || ''
    const nom = user.last_name || ''
    if (prefix) return `${prefix} ${prenom} ${nom}`.trim()
    return `${prenom} ${nom}`.trim() || user.username || ''
  }

  if (loading) return <Typography sx={{ color: COLORS.noir }}>Chargement...</Typography>

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      <WelcomeBand name={formatUserName()} roleLabel={`${user?.role_display || 'Tableau de bord'} — Ahibahil Khadim`} />

      {isSuperAdmin && (
        <Box display="flex" justifyContent="flex-end" mb={3} mt={-1.5}>
          <Button
            variant="outlined"
            startIcon={<Event />}
            onClick={() => navigate('/informations/evenements')}
            sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2, '&:hover': { borderColor: COLORS.vert, backgroundColor: `${COLORS.vert}20` } }}
          >
            Créer Événement
          </Button>
        </Box>
      )}

      {/* Indicateurs prioritaires — membres et finance (cœur de la phase pilote) */}
      <Grid container spacing={3}>
        {canViewMembers && (
          <Grid item xs={12} sm={6} md={canViewFinance ? 4 : 6}>
            <HeroCard title="Membres actifs" value={stats?.membres_actifs ?? 0} subtitle={`sur ${stats?.total_membres ?? 0} au total`} icon={<People sx={{ fontSize: 32 }} />} color={COLORS.vert} delay={0} />
          </Grid>
        )}
        {canViewFinance && (
          <Grid item xs={12} sm={6} md={canViewMembers ? 4 : 6}>
            <HeroCard
              title="Cotisations ce mois"
              value={`${Math.round((stats?.taux_paiement_cotisations_ce_mois ?? 0) * 10) / 10}%`}
              subtitle={`${stats?.cotisations_payees_ce_mois ?? 0} / ${stats?.cotisations_total_ce_mois ?? 0} payées`}
              icon={<AccountBalance sx={{ fontSize: 32 }} />}
              color={COLORS.or}
              delay={80}
            />
          </Grid>
        )}
        {canViewFinance && (
          <Grid item xs={12} sm={6} md={4}>
            <HeroCard title="Assignations annuelles en cours" value={stats?.assignations_annuelles_en_cours ?? 0} subtitle="cette année" icon={<RequestQuote sx={{ fontSize: 32 }} />} color={COLORS.vertFonce || COLORS.vert} delay={160} />
          </Grid>
        )}
        {!canViewMembers && !canViewFinance && (
          <Grid item xs={12} sm={6} md={4}>
            <HeroCard title="Événements" value={stats?.evenements ?? 0} icon={<Event sx={{ fontSize: 32 }} />} color={COLORS.vert} />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Événements" value={stats?.evenements ?? 0} icon={<Event />} color={COLORS.vert} delay={220} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Messages non lus"
            value={unreadMessages > 0 ? unreadMessages : 'Aucun'}
            icon={<Badge badgeContent={unreadMessages} color="error" invisible={unreadMessages === 0}><Message /></Badge>}
            color={COLORS.or}
            delay={260}
          />
        </Grid>
        {canViewFinance && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Taux de recouvrement global" value={`${Math.round((stats?.taux_paiement_cotisations_global ?? 0) * 10) / 10}%`} icon={<TrendingUp />} color={COLORS.vertClair} delay={300} />
          </Grid>
        )}
      </Grid>

      {canViewMembers && (
        <>
          <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, mt: 4, mb: 2 }}>
            Répartition des membres
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard title="Hommes" value={stats?.membres_hommes ?? 0} icon={<Man />} color={COLORS.vert} />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard title="Femmes" value={stats?.membres_femmes ?? 0} icon={<Woman />} color={COLORS.or} />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard title="Élèves" value={stats?.membres_eleves ?? 0} icon={<StudentIcon />} color={COLORS.vertClair} />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard title="Étudiants" value={stats?.membres_etudiants ?? 0} icon={<StudentIcon />} color={COLORS.vert} />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard title="Professionnels" value={stats?.membres_professionnels ?? 0} icon={<Work />} color={COLORS.or} />
            </Grid>
          </Grid>
        </>
      )}

      {(canViewMembers || canViewFinance) && (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #C9A961' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, mb: 2 }}>
                  Accès rapides
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1.5}>
                  {canViewMembers && (
                    <Button
                      variant="contained"
                      startIcon={canManageMembers ? <Add /> : <People />}
                      onClick={() => navigate('/admin/membres')}
                      sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, #3A7750 100%)` }}
                    >
                      {canManageMembers ? 'Gestion des membres' : 'Voir les membres'}
                    </Button>
                  )}
                  {canViewFinance && (
                    <Button variant="outlined" startIcon={<AccountBalance />} onClick={() => navigate('/finance/par-dahira')} sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2 }}>
                      Finance par Dahira
                    </Button>
                  )}
                  {canManageFinance && (
                    <Button variant="outlined" startIcon={<Payment />} onClick={() => navigate('/finance/depenses-hadiya')} sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2 }}>
                      Dépenses & Hadiya
                    </Button>
                  )}
                  {permissions?.can_view_national_synthese && (
                    <Button variant="outlined" startIcon={<TrendingUp />} onClick={() => navigate('/finance/hierarchie')} sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2 }}>
                      Synthèse hiérarchique
                    </Button>
                  )}
                  <Button variant="outlined" startIcon={<AttachMoney />} onClick={() => navigate('/finance/barkelou')} sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2 }}>
                    Barkelou (cotisations)
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Badge badgeContent={unreadMessages} color="error" invisible={unreadMessages === 0}><Message /></Badge>}
                    onClick={() => navigate('/communication/messagerie')}
                    sx={{ borderColor: COLORS.vert, color: COLORS.noir, borderRadius: 2 }}
                  >
                    Messagerie
                    {unreadMessages > 0 && <Chip label={unreadMessages} size="small" color="error" sx={{ ml: 1 }} />}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
