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
  const cotisationCourante = cotisations.find((c) => c.mois === moisCourant && c.annee === anneeCourante)

  const handleDeclarerPaiement = async (cotisation) => {
    const reference = (referenceInputs[cotisation.id] || '').trim()
    setSubmittingId(cotisation.id)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/finance/cotisations/${cotisation.id}/payer/`, {
        reference_wave: reference,
        mode_paiement: 'wave',
      })
      setMessage({ type: 'success', text: "Déclaration envoyée. Le jewrine finance validera votre paiement après vérification." })
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
                      Référence envoyée : {cotisationCourante.reference_wave} — en attente de validation par le jewrine finance.
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
        <TableContainer component={Paper} sx={{ borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
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
              {cotisations.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center">Aucune cotisation pour {filterAnnee}.</TableCell></TableRow>
              ) : (
                [...cotisations].sort((a, b) => b.mois - a.mois).map((c) => (
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
      )}
    </Box>
  )
}
