import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Chip,
} from '@mui/material'
import { Add, Edit, Delete, Payment } from '@mui/icons-material'
import api, { clearCache } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }
const WAVE_PAYMENT_URL = 'https://pay.wave.com/m/M_sn_A4og8Zu7m589/c/sn/'
const STATUTS = [
  { value: 'active', label: 'Active' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'annulee', label: 'Annulée' },
]

export default function LeveesFonds() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [openParticipate, setOpenParticipate] = useState(null)
  const [openPayer, setOpenPayer] = useState(null)
  const [payerForm, setPayerForm] = useState({ reference_wave: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [participateForm, setParticipateForm] = useState({ montant: '', reference_wave: '', description: '' })
  const [form, setForm] = useState({
    titre: '',
    description: '',
    objectif: '',
    montant_objectif: '',
    date_debut: '',
    date_fin: '',
    statut: 'active',
    lien_paiement_wave: '',
  })
  const [formErrors, setFormErrors] = useState({})

  const loadList = () => {
    setLoading(true)
    // Add timeout for better UX on slow connections
    const timeoutId = setTimeout(() => {
      if (loading) {
        setMessage({ type: 'info', text: 'Chargement en cours...' })
      }
    }, 3000)
    
    api.get('/finance/levees-fonds/')
      .then(({ data }) => setList(data.results || data))
      .catch(() => setList([]))
      .finally(() => {
        clearTimeout(timeoutId)
        setLoading(false)
      })
  }
  useEffect(() => { loadList() }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    const now = new Date()
    setForm({
      titre: '',
      description: '',
      objectif: '',
      montant_objectif: '',
      date_debut: now.toISOString().slice(0, 10),
      date_fin: '',
      statut: 'active',
      lien_paiement_wave: '',
    })
    setFormErrors({})
    setOpenForm(true)
  }

  const handleOpenEdit = (lf) => {
    setEditingId(lf.id)
    setForm({
      titre: lf.titre || '',
      description: lf.description || '',
      objectif: lf.objectif || '',
      montant_objectif: lf.montant_objectif || '',
      date_debut: lf.date_debut ? lf.date_debut.slice(0, 10) : '',
      date_fin: lf.date_fin ? lf.date_fin.slice(0, 10) : '',
      statut: lf.statut || 'active',
      lien_paiement_wave: lf.lien_paiement_wave || '',
    })
    setFormErrors({})
    setOpenForm(true)
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.titre) errors.titre = 'Titre requis.'
    if (!form.montant_objectif) errors.montant_objectif = 'Montant objectif requis.'
    if (!form.date_debut) errors.date_debut = 'Date de début requise.'
    if (!form.date_fin) errors.date_fin = 'Date de fin requise.'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = {
        titre: form.titre,
        description: form.description || '',
        objectif: form.objectif || form.titre,
        montant_objectif: Number(form.montant_objectif),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        statut: form.statut,
        lien_paiement_wave: form.lien_paiement_wave || '',
      }
      if (editingId) {
        await api.patch(`/finance/levees-fonds/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Levée de fonds modifiée.' })
      } else {
        await api.post('/finance/levees-fonds/', payload)
        setMessage({ type: 'success', text: 'Levée de fonds créée.' })
      }
      loadList()
      setOpenForm(false)
      setEditingId(null)
      // Clear cache to show updated data
      clearCache('/finance/levees-fonds')
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/finance/levees-fonds/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Levée de fonds supprimée.' })
      loadList()
      setOpenDelete(null)
      // Clear cache to show updated data
      clearCache('/finance/levees-fonds')
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleBarkelou = async (lf) => {
    // Ouvrir le dialog pour entrer le montant avant d'ouvrir Wave
    // Le lien Wave peut être celui de la levée de fonds ou le lien par défaut
    setOpenParticipate(lf)
    setParticipateForm({ montant: '', description: '' })
  }

  const handleOpenParticipate = (lf) => {
    setOpenParticipate(lf)
    setParticipateForm({ montant: '', description: '' })
  }

  const handleParticipate = async () => {
    if (!openParticipate || !participateForm.montant) {
      setMessage({ type: 'error', text: 'Montant requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.post(`/finance/levees-fonds/${openParticipate.id}/participer/`, {
        montant: Number(participateForm.montant),
        description: participateForm.description || `Participation à ${openParticipate.titre}`,
      })
      // Utiliser le lien Wave de la réponse ou le lien par défaut
      const lienWave = data.lien_wave || openParticipate.lien_paiement_wave || WAVE_PAYMENT_URL
      // Ouvrir Wave dans un nouvel onglet
      if (lienWave) {
        window.open(lienWave, '_blank', 'noopener,noreferrer')
      }
      // Fermer le dialog après ouverture de Wave
      setOpenParticipate(null)
      setParticipateForm({ montant: '', reference_wave: '', description: '' })
      setMessage({ type: 'info', text: 'Transaction créée. Veuillez effectuer votre paiement sur Wave.' })
      // Reload list in background without blocking UI
      setTimeout(() => loadList(), 1000)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenPayer = (lf) => {
    setOpenPayer(lf)
    setPayerForm({ reference_wave: '', description: '' })
  }

  const handlePayer = async () => {
    if (!openPayer) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      // Créer une transaction pour cette levée de fonds
      const { data: transactionData } = await api.post(`/finance/levees-fonds/${openPayer.id}/participer/`, {
        montant: Number(openPayer.montant_par_membre || 1000), // Utiliser montant_par_membre si disponible, sinon valeur par défaut
        description: payerForm.description || `Participation à ${openPayer.titre}`,
      })
      
      // Si une référence Wave est fournie, confirmer le paiement
      if (payerForm.reference_wave.trim()) {
        await api.post(`/finance/levees-fonds/${openPayer.id}/confirmer_paiement/`, {
          reference_interne: transactionData.reference_transaction,
          reference_wave: payerForm.reference_wave.trim(),
        })
        setMessage({ type: 'success', text: 'Paiement déclaré. L\'administrateur validera le paiement.' })
      } else {
        setMessage({ type: 'info', text: 'Transaction créée. Veuillez effectuer votre paiement sur Wave et déclarer votre référence.' })
      }
      
      setOpenPayer(null)
      setPayerForm({ reference_wave: '', description: '' })
      loadList()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur lors de l\'enregistrement du paiement.') })
    } finally {
      setSaving(false)
    }
  }

  // Statistiques globales des levées de fonds
  const totalObjectif = list.reduce((sum, lf) => sum + Number(lf.montant_objectif || 0), 0)
  const totalCollecte = list.reduce((sum, lf) => sum + Number(lf.montant_collecte || 0), 0)
  const pourcentageGlobal = totalObjectif > 0 ? Math.round((totalCollecte / totalObjectif) * 100) : 0
  const nbActives = list.filter((lf) => (lf.statut_reel || lf.statut) === 'active').length
  const nbTerminees = list.filter((lf) => (lf.statut_reel || lf.statut) === 'terminee').length

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Levées de fonds</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Campagnes en cours et participation</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Ajouter une levée de fonds
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert 
          severity={message.type === 'error' ? 'error' : message.type === 'info' ? 'info' : 'success'} 
          sx={{ mb: 2 }} 
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      {!loading && list.length > 0 && (
        <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Objectif global</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.vert }}>
              {totalObjectif.toLocaleString('fr-FR')} FCFA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {list.length} campagne(s)
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Montant collecté</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.or }}>
              {totalCollecte.toLocaleString('fr-FR')} FCFA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pourcentageGlobal}% de l'objectif global
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, borderLeft: '4px solid #1565c0', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>États des campagnes</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1565c0' }}>
              {nbActives} active(s) · {nbTerminees} terminée(s)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Statut global des levées de fonds
            </Typography>
          </Paper>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : isAdmin ? (
        <Grid container spacing={2}>
          {list.length === 0 ? (
            <Grid item xs={12}><Typography color="text.secondary">Aucune levée de fonds</Typography></Grid>
          ) : (
            list.map((lf) => (
              <Grid item xs={12} md={6} key={lf.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>{lf.titre}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{lf.description}</Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {Number(lf.montant_collecte || 0).toLocaleString('fr-FR')} / {Number(lf.montant_objectif).toLocaleString('fr-FR')} FCFA
                      </Typography>
                      <LinearProgress variant="determinate" value={lf.pourcentage_atteint || 0} sx={{ mt: 1, height: 8, borderRadius: 1 }} color="primary" />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {Math.round(lf.pourcentage_atteint || 0)}% atteint
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2 }}>
                      <Chip size="small" label={lf.statut_reel_display || lf.statut_reel || lf.statut_display || lf.statut} color={(lf.statut_reel || lf.statut) === 'active' ? 'success' : 'default'} />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {lf.date_debut?.slice(0, 10)} — {lf.date_fin?.slice(0, 10)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                      {/* Bouton Payer : visible pour TOUS les membres (y compris admins) sur les levées de fonds actives */}
                      {(() => {
                        const statut = String(lf.statut_reel || lf.statut || '').toLowerCase()
                        const hasWaveLink = lf.lien_paiement_wave && String(lf.lien_paiement_wave).trim() !== ''
                        const isActive = statut === 'active'
                        return isActive && hasWaveLink
                      })() && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Payment />}
                          onClick={() => handleOpenPayer(lf)}
                          sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                        >
                          Payer
                        </Button>
                      )}
                      {/* Bouton Participer : visible pour toutes les levées de fonds actives
                      {(() => {
                        const statut = String(lf.statut_reel || lf.statut || '').toLowerCase()
                        const isActive = statut === 'active'
                        return isActive
                      })() && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenParticipate(lf)}
                          sx={{ borderColor: COLORS.or, color: COLORS.or, '&:hover': { borderColor: COLORS.vertFonce, bgcolor: COLORS.or + '10' } }}
                        >
                          Participer
                        </Button>
                      )} */}
                      {/* Bouton Barkeilou : toujours disponible pour les levées de fonds actives */}
                      {(() => {
                        const statut = String(lf.statut_reel || lf.statut || '').toLowerCase()
                        const isActive = statut === 'active'
                        return isActive
                      })() && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Payment />}
                          onClick={() => handleBarkelou(lf)}
                          sx={{ borderColor: COLORS.vert, color: COLORS.vert, '&:hover': { borderColor: COLORS.vertFonce } }}
                        >
                          Barkeilou
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <IconButton size="small" onClick={() => handleOpenEdit(lf)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                          <IconButton size="small" onClick={() => setOpenDelete(lf)} color="error"><Delete /></IconButton>
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {list.length === 0 ? (
            <Grid item xs={12}><Typography color="text.secondary">Aucune levée de fonds active.</Typography></Grid>
          ) : (
            list.filter((lf) => (lf.statut_reel || lf.statut) === 'active').map((lf) => (
              <Grid item xs={12} md={6} key={lf.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>{lf.titre}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{lf.description}</Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {Number(lf.montant_collecte || 0).toLocaleString('fr-FR')} / {Number(lf.montant_objectif).toLocaleString('fr-FR')} FCFA
                      </Typography>
                      <LinearProgress variant="determinate" value={lf.pourcentage_atteint || 0} sx={{ mt: 1, height: 8, borderRadius: 1 }} color="primary" />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {Math.round(lf.pourcentage_atteint || 0)}% atteint
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2 }}>
                      <Chip size="small" label={lf.statut_reel_display || lf.statut_reel || lf.statut_display || lf.statut} color={(lf.statut_reel || lf.statut) === 'active' ? 'success' : 'default'} />
                      {/* Bouton Payer : visible pour TOUS les membres (y compris admins) sur les levées de fonds actives */}
                      {(() => {
                        const statut = String(lf.statut_reel || lf.statut || '').toLowerCase()
                        const isActive = statut === 'active'
                        // Le bouton apparaît si la levée de fonds est active (même sans lien Wave, on utilisera le lien par défaut)
                        return isActive
                      })() && (
                        <>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Payment />}
                            onClick={() => handleOpenPayer(lf)}
                            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                          >
                            Payer
                          </Button>
                          {/* <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenParticipate(lf)}
                            sx={{ borderColor: COLORS.or, color: COLORS.or, '&:hover': { borderColor: COLORS.vertFonce, bgcolor: COLORS.or + '10' } }}
                          >
                            Participer
                          </Button> */}
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier la levée de fonds' : 'Ajouter une levée de fonds'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre"
                value={form.titre}
                onChange={(e) => {
                  setForm((f) => ({ ...f, titre: e.target.value }))
                  setFormErrors((fe) => ({ ...fe, titre: undefined }))
                }}
                required
                error={!!formErrors.titre}
                helperText={formErrors.titre || ''}
              />
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Objectif (texte)" value={form.objectif} onChange={(e) => setForm((f) => ({ ...f, objectif: e.target.value }))} /></Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Montant objectif (FCFA)"
                value={form.montant_objectif}
                onChange={(e) => {
                  setForm((f) => ({ ...f, montant_objectif: e.target.value }))
                  setFormErrors((fe) => ({ ...fe, montant_objectif: undefined }))
                }}
                inputProps={{ min: 0 }}
                required
                error={!!formErrors.montant_objectif}
                helperText={formErrors.montant_objectif || ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date début"
                value={form.date_debut}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date_debut: e.target.value }))
                  setFormErrors((fe) => ({ ...fe, date_debut: undefined }))
                }}
                InputLabelProps={{ shrink: true }}
                required
                error={!!formErrors.date_debut}
                helperText={formErrors.date_debut || ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date fin"
                value={form.date_fin}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date_fin: e.target.value }))
                  setFormErrors((fe) => ({ ...fe, date_fin: undefined }))
                }}
                InputLabelProps={{ shrink: true }}
                required
                error={!!formErrors.date_fin}
                helperText={formErrors.date_fin || ''}
              />
            </Grid>
            <Grid item xs={12}><TextField select fullWidth label="Statut" value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>{STATUTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}><TextField fullWidth label="Lien paiement Wave" value={form.lien_paiement_wave} onChange={(e) => setForm((f) => ({ ...f, lien_paiement_wave: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer cette levée de fonds ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer « {openDelete.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openParticipate} onClose={() => setOpenParticipate(null)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { mx: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Barkeilou</DialogTitle>
        <DialogContent>
          {openParticipate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {openParticipate.titre}
              </Typography>
              {!openParticipate.lien_paiement_wave && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Le lien de paiement Wave spécifique n'est pas configuré. Le lien par défaut sera utilisé.
                </Alert>
              )}
              <TextField
                fullWidth
                type="number"
                label="Montant (FCFA)"
                value={participateForm.montant}
                onChange={(e) => setParticipateForm((f) => ({ ...f, montant: e.target.value }))}
                inputProps={{ min: 1 }}
                required
              />
              <TextField
                fullWidth
                label="Description (optionnel)"
                value={participateForm.description}
                onChange={(e) => setParticipateForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
              <Alert severity="info" sx={{ mt: 1 }}>
                Après avoir cliqué sur "Barkeilou", une transaction sera créée et vous serez redirigé vers Wave pour effectuer le paiement. 
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParticipate(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleParticipate}
            disabled={saving || !participateForm.montant}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            {saving ? <CircularProgress size={24} /> : 'Barkeilou'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openPayer} onClose={() => setOpenPayer(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: 'white' }}>Payer ma participation</DialogTitle>
        <DialogContent>
          {openPayer && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                Levée de fonds : <strong>{openPayer.titre}</strong>
                {openPayer.montant_par_membre && (
                  <> — Montant suggéré : <strong>{openPayer.montant_par_membre} FCFA</strong></>
                )}
              </Alert>
              <Button
                variant="contained"
                href={openPayer.lien_paiement_wave || WAVE_PAYMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
                startIcon={<Payment />}
                sx={{
                  bgcolor: COLORS.vert,
                  color: '#1A1A1A',
                  py: 1.5,
                  '&:hover': { bgcolor: COLORS.vertFonce, color: '#1A1A1A' },
                }}
              >
                Payer avec Wave
              </Button>
              <Typography variant="body2" color="text.secondary">
                Après avoir payé via le lien Wave ci-dessus, cliquez sur &quot;Déclarer mon paiement&quot; pour enregistrer votre référence. L&apos;administrateur validera le versement avant de marquer la transaction comme validée.
              </Typography>
              <TextField
                fullWidth
                label="Référence Wave (optionnel)"
                value={payerForm.reference_wave}
                onChange={(e) => setPayerForm((f) => ({ ...f, reference_wave: e.target.value }))}
                placeholder="Ex: 7XX1234567 — utile si vous avez déjà payé"
              />
              <TextField
                fullWidth
                label="Description (optionnel)"
                value={payerForm.description}
                onChange={(e) => setPayerForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
                placeholder="Description de votre participation"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayer(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handlePayer}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Payment />}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            Déclarer mon paiement
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}
