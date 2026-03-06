import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material'
import { MenuBook, CheckCircle, Schedule } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }

function useTempsRestant(dateFin) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!dateFin) return
    const t = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(t)
  }, [dateFin])
  if (!dateFin) return null
  const fin = new Date(dateFin)
  fin.setHours(23, 59, 59, 999)
  const diff = fin - now
  if (diff <= 0) return 'Terminé'
  const jours = Math.ceil(diff / (24 * 60 * 60 * 1000))
  return jours === 1 ? '1 jour restant' : `${jours} jours restants`
}

function IntervalleKamil({ dateDebut, dateFin }) {
  const restant = useTempsRestant(dateFin)
  const debutStr = dateDebut ? new Date(dateDebut).toLocaleDateString('fr-FR') : '—'
  const finStr = dateFin ? new Date(dateFin).toLocaleDateString('fr-FR') : '—'
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        Période d&apos;apprentissage : du {debutStr} au {finStr}
      </Typography>
      {restant != null && (
        <Chip size="small" icon={<Schedule />} label={restant} sx={{ bgcolor: `${COLORS.or}20`, color: COLORS.vertFonce }} />
      )}
    </Box>
  )
}

export default function MesProgressions() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [validating, setValidating] = useState(null)

  const loadData = () => {
    setLoading(true)
    api.get('/culturelle/jukkis/mes_jukkis/')
      .then(({ data }) => setList(data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleValider = async (jukkiId) => {
    setValidating(jukkiId)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/culturelle/jukkis/${jukkiId}/valider/`)
      setMessage({ type: 'success', text: 'JUKKI validé. Vous avez terminé la lecture.' })
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setValidating(null)
    }
  }

  const byKamil = {}
  list.forEach((j) => {
    const k = j.kamil_titre || j.kamil || 'Programme'
    if (!byKamil[k]) byKamil[k] = []
    byKamil[k].push(j)
  })
  Object.keys(byKamil).forEach((k) => byKamil[k].sort((a, b) => a.numero - b.numero))

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
        Mes JUKKI assignés
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Les JUKKI qui vous ont été attribués. Cliquez sur &quot;Valider&quot; une fois la lecture terminée.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : list.length === 0 ? (
        <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
          <CardContent>
            <Typography color="text.secondary">
              Aucun JUKKI assigné pour le moment. L&apos;administrateur peut vous attribuer un ou plusieurs JUKKI dans le programme Kamil.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {Object.entries(byKamil).map(([kamilTitre, jukkis]) => (
            <Grid item xs={12} key={kamilTitre}>
              <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: COLORS.vert, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MenuBook /> {kamilTitre}
                  </Typography>
                  {jukkis[0] && (jukkis[0].kamil_date_debut || jukkis[0].kamil_date_fin) && (
                    <IntervalleKamil dateDebut={jukkis[0].kamil_date_debut} dateFin={jukkis[0].kamil_date_fin} />
                  )}
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: `${COLORS.or}15` }}>
                          <TableCell><strong>JUKKI</strong></TableCell>
                          <TableCell><strong>Statut</strong></TableCell>
                          <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {jukkis.map((j) => (
                          <TableRow key={j.id}>
                            <TableCell><strong>JUKKI {j.numero}</strong></TableCell>
                            <TableCell>
                              {j.est_valide ? (
                                <Chip label="Validé" color="success" size="small" icon={<CheckCircle />} />
                              ) : (
                                <Chip label="À lire" color="default" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              {!j.est_valide && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={validating === j.id ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                                  onClick={() => handleValider(j.id)}
                                  disabled={!!validating}
                                  sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                                >
                                  Valider
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
