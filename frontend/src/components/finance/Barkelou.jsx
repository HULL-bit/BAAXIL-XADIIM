import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from '@mui/material'
import { AccountBalance, Payment } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatutCotisationChip from './StatutCotisationChip'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }
const MOIS = [
  { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
]

export default function Barkelou() {
  const { user } = useAuth()
  const now = new Date()
  const [cotisations, setCotisations] = useState([])
  const [loading, setLoading] = useState(true)
  const [waveLink, setWaveLink] = useState('')
  const [filterAnnee, setFilterAnnee] = useState(now.getFullYear())
  const [message, setMessage] = useState({ type: '', text: '' })
  const [referenceInputs, setReferenceInputs] = useState({})
  const [submittingId, setSubmittingId] = useState(null)

  const loadCotisations = () => {
    setLoading(true)
    api.get('/finance/cotisations/', { params: { annee: filterAnnee } })
      .then(({ data }) => setCotisations(data.results || data || []))
      .catch(() => setCotisations([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCotisations() }, [filterAnnee])

  useEffect(() => {
    api.get('/finance/parametres-financiers/')
      .then(({ data }) => {
        const list = data.results || data || []
        setWaveLink(list[0]?.lien_paiement_wave || '')
      })
      .catch(() => setWaveLink(''))
  }, [])

  const moisCourant = now.getMonth() + 1
  const anneeCourante = now.getFullYear()
  const cotisationCourante = cotisations.find((c) => c.type_cotisation !== 'assignation' && c.mois === moisCourant && c.annee === anneeCourante)
  const assignationCourante = cotisations.find((c) => c.type_cotisation === 'assignation' && c.annee === anneeCourante)
  // Mensualités et assignations annuelles sont deux choses différentes (l'une est
  // mensuelle par cellule, l'autre annuelle et répartie par section) — on les
  // sépare toujours à l'affichage pour ne jamais les mélanger.
  const mensualites = cotisations.filter((c) => c.type_cotisation !== 'assignation')
  const assignations = cotisations.filter((c) => c.type_cotisation === 'assignation')

  const handleDeclarerPaiement = async (cotisation) => {
    const reference = (referenceInputs[cotisation.id] || '').trim()
    setSubmittingId(cotisation.id)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/finance/cotisations/${cotisation.id}/payer/`, {
        reference_wave: reference,
        mode_paiement: 'wave',
      })
      setMessage({ type: 'success', text: "Déclaration envoyée. Le Secrétaire aux Finances de votre cellule validera votre paiement après vérification." })
      loadCotisations()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || "Erreur lors de l'envoi de la déclaration." })
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalance /> Barkelou — Mes cotisations
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Suivez votre cotisation mensuelle et payez-la directement via Wave.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Card sx={{ mb: 4, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 2 }}>
            {MOIS.find((m) => m.value === moisCourant)?.label} {anneeCourante} — Cotisation de ce mois
          </Typography>

          {!cotisationCourante ? (
            <Typography color="text.secondary">
              Votre cotisation de ce mois n'a pas encore été générée par l'administration. Revenez plus tard.
            </Typography>
          ) : (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Montant à cotiser</Typography>
                <Typography variant="h5" sx={{ color: COLORS.vert, fontWeight: 700 }}>
                  {Number(cotisationCourante.montant).toLocaleString('fr-FR')} FCFA
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Statut</Typography>
                <StatutCotisationChip statut={cotisationCourante.statut} />
              </Grid>
              {cotisationCourante.statut !== 'payee' && (
                <Grid item xs={12} sm={5}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<Payment />}
                      disabled={!waveLink}
                      onClick={() => window.open(waveLink, '_blank', 'noopener,noreferrer')}
                      sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                    >
                      Payer via Wave
                    </Button>
                  </Box>
                  {!waveLink && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Lien de paiement Wave non configuré — contactez l'administration.
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      label="Référence Wave après paiement"
                      value={referenceInputs[cotisationCourante.id] || ''}
                      onChange={(e) => setReferenceInputs((f) => ({ ...f, [cotisationCourante.id]: e.target.value }))}
                      sx={{ minWidth: 220 }}
                    />
                    <Button
                      variant="outlined"
                      disabled={submittingId === cotisationCourante.id}
                      onClick={() => handleDeclarerPaiement(cotisationCourante)}
                    >
                      {submittingId === cotisationCourante.id ? <CircularProgress size={20} /> : "J'ai payé"}
                    </Button>
                  </Box>
                  {cotisationCourante.reference_wave && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Référence envoyée : {cotisationCourante.reference_wave} — en attente de validation par le Secrétaire aux Finances de cellule.
                    </Typography>
                  )}
                </Grid>
              )}
              {cotisationCourante.statut === 'payee' && (
                <Grid item xs={12} sm={5}>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>
                    Payée le {cotisationCourante.date_paiement ? new Date(cotisationCourante.date_paiement).toLocaleDateString('fr-FR') : '—'}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      {assignationCourante && (
        <Card sx={{ mb: 4, borderLeft: `4px solid #8B5CF6`, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 2 }}>
              Assignation annuelle {anneeCourante} — {assignationCourante.objet_assignation || 'Cotisation exceptionnelle de section'}
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Montant à cotiser</Typography>
                <Typography variant="h5" sx={{ color: '#8B5CF6', fontWeight: 700 }}>
                  {Number(assignationCourante.montant).toLocaleString('fr-FR')} FCFA
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Statut</Typography>
                <StatutCotisationChip statut={assignationCourante.statut} />
              </Grid>
              {assignationCourante.statut !== 'payee' ? (
                <Grid item xs={12} sm={5}>
                  <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1, sm: 0 }, flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      label="Référence Wave après paiement"
                      value={referenceInputs[assignationCourante.id] || ''}
                      onChange={(e) => setReferenceInputs((f) => ({ ...f, [assignationCourante.id]: e.target.value }))}
                      sx={{ minWidth: 220 }}
                    />
                    <Button
                      variant="outlined"
                      disabled={submittingId === assignationCourante.id}
                      onClick={() => handleDeclarerPaiement(assignationCourante)}
                    >
                      {submittingId === assignationCourante.id ? <CircularProgress size={20} /> : "J'ai payé"}
                    </Button>
                  </Box>
                </Grid>
              ) : (
                <Grid item xs={12} sm={5}>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>
                    Payée le {assignationCourante.date_paiement ? new Date(assignationCourante.date_paiement).toLocaleDateString('fr-FR') : '—'}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ color: COLORS.vertFonce }}>Historique</Typography>
        <TextField
          select
          size="small"
          label="Année"
          value={filterAnnee}
          onChange={(e) => setFilterAnnee(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Cotisations mensuelles et assignations annuelles sont deux choses
              différentes (fréquence, périmètre) — toujours affichées séparément. */}
          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1 }}>Cotisations mensuelles</Typography>
          <TableContainer component={Paper} sx={{ borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2, mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}15` }}>
                  <TableCell>Mois</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Date de paiement</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mensualites.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center">Aucune cotisation mensuelle pour {filterAnnee}.</TableCell></TableRow>
                ) : (
                  [...mensualites].sort((a, b) => b.mois - a.mois).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{MOIS.find((m) => m.value === c.mois)?.label || c.mois}</TableCell>
                      <TableCell>{Number(c.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><StatutCotisationChip statut={c.statut} /></TableCell>
                      <TableCell>{c.date_paiement ? new Date(c.date_paiement).toLocaleDateString('fr-FR') : '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1 }}>Assignations annuelles</Typography>
          <TableContainer component={Paper} sx={{ borderLeft: `4px solid #8B5CF6`, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#8B5CF615' }}>
                  <TableCell>Année</TableCell>
                  <TableCell>Objet</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Date de paiement</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">Aucune assignation annuelle pour {filterAnnee}.</TableCell></TableRow>
                ) : (
                  assignations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.annee}</TableCell>
                      <TableCell>{c.objet_assignation || 'Assignation annuelle'}</TableCell>
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
