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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { CheckCircle, Cancel, HourglassEmpty, Payment } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }

const statutColor = (s) => (s === 'valide' ? 'success' : s === 'refuse' ? 'error' : 'warning')

export default function ValidationsVersements() {
  const [versements, setVersements] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openRefus, setOpenRefus] = useState(null)
  const [commentaireRefus, setCommentaireRefus] = useState('')
  const [saving, setSaving] = useState(false)

  const loadVersements = () => {
    setLoading(true)
    api.get('/culturelle/versements-kamil/')
      .then(({ data }) => setVersements(data.results || data))
      .catch(() => setVersements([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadVersements() }, [])

  const handleValider = async (id) => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/culturelle/versements-kamil/${id}/valider/`)
      setMessage({ type: 'success', text: 'Versement validé.' })
      loadVersements()
    } catch (err) {
      const d = err.response?.data?.detail || 'Erreur'
      setMessage({ type: 'error', text: d })
    } finally {
      setSaving(false)
    }
  }

  const handleRefuser = async () => {
    if (!openRefus) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/culturelle/versements-kamil/${openRefus}/refuser/`, { commentaire: commentaireRefus })
      setMessage({ type: 'success', text: 'Versement refusé.' })
      setOpenRefus(null)
      setCommentaireRefus('')
      loadVersements()
    } catch (err) {
      const d = err.response?.data?.detail || 'Erreur'
      setMessage({ type: 'error', text: d })
    } finally {
      setSaving(false)
    }
  }

  const enAttente = versements.filter((v) => v.statut === 'en_attente')
  const traites = versements.filter((v) => v.statut !== 'en_attente')

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
        Validation des versements Kamil
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Validez ou refusez les versements effectués par les membres pour leurs assignations Kamil.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Versements en attente */}
          <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: COLORS.vert, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <HourglassEmpty /> En attente de validation ({enAttente.length})
              </Typography>
              {enAttente.length === 0 ? (
                <Typography color="text.secondary">Aucun versement en attente.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: `${COLORS.or}15` }}>
                        <TableCell><strong>Membre</strong></TableCell>
                        <TableCell><strong>Juzz</strong></TableCell>
                        <TableCell><strong>Montant</strong></TableCell>
                        <TableCell><strong>Méthode</strong></TableCell>
                        <TableCell><strong>N° Transaction</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enAttente.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.membre_nom || '—'}</TableCell>
                          <TableCell>{v.chapitre_titre || `Juzz ${v.chapitre_numero}`}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{Number(v.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                          <TableCell>{v.methode_display || v.methode_paiement}</TableCell>
                          <TableCell>{v.numero_transaction || '—'}</TableCell>
                          <TableCell>{new Date(v.date_versement).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={() => handleValider(v.id)}
                                disabled={saving}
                              >
                                Valider
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Cancel />}
                                onClick={() => setOpenRefus(v.id)}
                                disabled={saving}
                              >
                                Refuser
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Versements traités */}
          <Card sx={{ borderLeft: `4px solid ${COLORS.vertFonce}`, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payment /> Historique des versements traités ({traites.length})
              </Typography>
              {traites.length === 0 ? (
                <Typography color="text.secondary">Aucun versement traité.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: `${COLORS.or}10` }}>
                        <TableCell><strong>Membre</strong></TableCell>
                        <TableCell><strong>Juzz</strong></TableCell>
                        <TableCell><strong>Montant</strong></TableCell>
                        <TableCell><strong>Méthode</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Statut</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {traites.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.membre_nom || '—'}</TableCell>
                          <TableCell>{v.chapitre_titre || `Juzz ${v.chapitre_numero}`}</TableCell>
                          <TableCell>{Number(v.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                          <TableCell>{v.methode_display || v.methode_paiement}</TableCell>
                          <TableCell>{new Date(v.date_versement).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>
                            <Chip
                              label={v.statut_display || v.statut}
                              color={statutColor(v.statut)}
                              size="small"
                              icon={v.statut === 'valide' ? <CheckCircle /> : <Cancel />}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog refus */}
      <Dialog open={Boolean(openRefus)} onClose={() => setOpenRefus(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Refuser le versement</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Motif du refus (optionnel)"
            value={commentaireRefus}
            onChange={(e) => setCommentaireRefus(e.target.value)}
            multiline
            rows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRefus(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRefuser}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Cancel />}
          >
            Confirmer le refus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
