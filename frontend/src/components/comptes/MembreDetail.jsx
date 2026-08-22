import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Button,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material'
import { ArrowBack, Man, Woman, Phone, Work, Badge as BadgeIcon, AccountBalance, TrendingUp, HourglassEmpty, Warning } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { colors } from '../../styles/theme'
import { useAuth } from '../../context/AuthContext'
import StatutCotisationChip from '../finance/StatutCotisationChip'

const MOIS_LABELS = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const StatTile = ({ title, value, icon, color }) => (
  <Card sx={{ borderTop: `4px solid ${color}`, height: '100%' }}>
    <CardContent sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h5" sx={{ color, fontWeight: 700, mt: 0.5 }}>{value}</Typography>
        </Box>
        <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

export default function MembreDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const canViewFinance = !!permissions?.can_view_finance

  const [membre, setMembre] = useState(null)
  const [cotisations, setCotisations] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const requests = [api.get(`/auth/users/${id}/`)]
    if (canViewFinance) {
      requests.push(api.get('/finance/cotisations/', { params: { membre: id, page_size: 100 } }))
      requests.push(api.get('/finance/cotisations/statistiques/', { params: { membre: id } }))
    }
    Promise.all(requests)
      .then(([membreRes, cotRes, statsRes]) => {
        setMembre(membreRes.data)
        if (cotRes) setCotisations(cotRes.data.results || cotRes.data || [])
        if (statsRes) setStats(statsRes.data)
      })
      .catch((err) => setError(err.response?.data?.detail || "Impossible de charger ce membre (hors de votre périmètre ?)."))
      .finally(() => setLoading(false))
  }, [id, canViewFinance])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/membres')} sx={{ mb: 2 }}>Retour</Button>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }
  if (!membre) return null

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/membres')} sx={{ mb: 2 }}>
        Retour à Gestion des membres
      </Button>

      <Card sx={{ mb: 3, borderLeft: `4px solid ${colors.vert}`, borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={getMediaUrl(membre.photo, membre.photo_updated_at ? `v=${membre.photo_updated_at}` : '')}
              sx={{ width: 72, height: 72, bgcolor: colors.or, color: colors.blanc, fontSize: 28 }}
            >
              {membre.first_name?.[0]}{membre.last_name?.[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h5" sx={{ color: colors.vert, fontWeight: 700 }}>
                {`${membre.first_name || ''} ${membre.last_name || ''}`.trim() || membre.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">@{membre.username}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip label={membre.role_display || membre.role} size="small" sx={{ bgcolor: `${colors.or}30` }} />
                <Chip label={membre.est_actif ? 'Actif' : 'Inactif'} color={membre.est_actif ? 'success' : 'default'} size="small" />
                {membre.sexe && <Chip icon={membre.sexe === 'M' ? <Man /> : <Woman />} label={membre.sexe === 'M' ? 'Masculin' : 'Féminin'} size="small" variant="outlined" />}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Phone fontSize="inherit" /> Téléphone</Typography>
              <Typography variant="body2">{membre.telephone || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Work fontSize="inherit" /> Profession</Typography>
              <Typography variant="body2">{membre.profession || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><BadgeIcon fontSize="inherit" /> Carte membre</Typography>
              <Typography variant="body2">{membre.numero_carte || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><BadgeIcon fontSize="inherit" /> CNI</Typography>
              <Typography variant="body2">{membre.numero_cni || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Section / Dahira</Typography>
              <Typography variant="body2">{membre.section_nom || '—'} / {membre.dahira_nom || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Catégorie</Typography>
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{membre.categorie || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Cotisation mensuelle assignée</Typography>
              <Typography variant="body2">{membre.montant_cotisation ? `${Number(membre.montant_cotisation).toLocaleString('fr-FR')} FCFA` : '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Inscrit le</Typography>
              <Typography variant="body2">{membre.date_inscription ? new Date(membre.date_inscription).toLocaleDateString('fr-FR') : '—'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {canViewFinance && stats && (
        <>
          <Typography variant="h6" sx={{ color: colors.vertFonce, mb: 1.5 }}>Statistiques financières</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <StatTile title="Taux de paiement" value={`${stats.pourcentage_payees ?? 0}%`} icon={<TrendingUp />} color={colors.vert} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile title="Montant payé" value={`${Number(stats.montant_total_paye ?? 0).toLocaleString('fr-FR')} FCFA`} icon={<AccountBalance />} color={colors.vertFonce} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile title="En attente" value={stats.total_en_attente ?? 0} icon={<HourglassEmpty />} color={colors.or} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile title="En retard" value={stats.total_retard ?? 0} icon={<Warning />} color="#d32f2f" />
            </Grid>
          </Grid>
        </>
      )}

      {canViewFinance && (
        <>
          <Typography variant="h6" sx={{ color: colors.vertFonce, mb: 1.5 }}>Historique des cotisations</Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${colors.vert}` }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${colors.vert}12` }}>
                  <TableCell>Période</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Date de paiement</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cotisations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">Aucune cotisation enregistrée.</TableCell></TableRow>
                ) : (
                  [...cotisations]
                    .sort((a, b) => b.annee - a.annee || b.mois - a.mois)
                    .map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.mois === 0 ? `Année ${c.annee}` : `${MOIS_LABELS[c.mois] || c.mois} ${c.annee}`}</TableCell>
                        <TableCell>{c.type_cotisation === 'assignation' ? (c.objet_assignation || 'Assignation annuelle') : 'Mensualité'}</TableCell>
                        <TableCell>{Number(c.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell><StatutCotisationChip statut={c.statut} /></TableCell>
                        <TableCell>{c.date_paiement ? new Date(c.date_paiement).toLocaleDateString('fr-FR') : '—'}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  )
}
