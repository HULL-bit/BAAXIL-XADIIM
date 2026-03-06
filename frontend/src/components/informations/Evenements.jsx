import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Add, Edit, Delete, Event as EventIcon } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }
const TYPES = [
  { value: 'rencontre', label: 'Rencontre' },
  { value: 'ceremonie', label: 'Cérémonie' },
  { value: 'conference', label: 'Conférence' },
  { value: 'ziara', label: 'Ziara' },
  { value: 'formation', label: 'Formation' },
  { value: 'assemblee', label: 'Assemblée Générale' },
  { value: 'autre', label: 'Autre' },
]

const initialForm = {
  titre: '',
  description: '',
  type_evenement: 'rencontre',
  date_debut: '',
  date_fin: '',
  lieu: '',
  adresse_complete: '',
  lien_visio: '',
  capacite_max: '',
  est_publie: false,
}

export default function Evenements() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [detailEvt, setDetailEvt] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const loadList = () => {
    setLoading(true)
    api.get('/informations/evenements/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm(initialForm)
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleOpenEdit = (evt) => {
    setEditingId(evt.id)
    setForm({
      titre: evt.titre || '',
      description: evt.description || '',
      type_evenement: evt.type_evenement || 'rencontre',
      date_debut: evt.date_debut ? evt.date_debut.slice(0, 16) : '',
      date_fin: evt.date_fin ? evt.date_fin.slice(0, 16) : '',
      lieu: evt.lieu || '',
      adresse_complete: evt.adresse_complete || '',
      lien_visio: evt.lien_visio || '',
      capacite_max: evt.capacite_max ?? '',
      est_publie: evt.est_publie ?? false,
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.titre) errors.titre = 'Titre requis.'
    if (!form.date_debut) errors.date_debut = 'Date de début requise.'
    if (!form.date_fin) errors.date_fin = 'Date de fin requise.'
    if (!form.lieu) errors.lieu = 'Lieu requis.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = {
        ...form,
        capacite_max: form.capacite_max ? Number(form.capacite_max) : null,
      }
      if (editingId) {
        await api.patch(`/informations/evenements/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Événement modifié.' })
      } else {
        await api.post('/informations/evenements/', payload)
        setMessage({ type: 'success', text: 'Événement créé.' })
      }
      loadList()
      setOpenForm(false)
      setEditingId(null)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) apiFieldErrors[key] = String(value[0])
          else if (typeof value === 'string') apiFieldErrors[key] = value
        })
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }))
        setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      } else {
        const detail = err.response?.data?.detail || data
        setMessage({ type: 'error', text: typeof detail === 'object' ? JSON.stringify(detail) : (detail || 'Erreur') })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/informations/evenements/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Événement supprimé.' })
      loadList()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Événements</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Calendrier et liste des événements</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Créer un événement
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {list.length === 0 ? (
            <Grid item xs={12}><Typography color="text.secondary">Aucun événement pour le moment.</Typography></Grid>
          ) : (
            list.map((evt) => (
              <Grid item xs={12} sm={6} md={4} key={evt.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  {evt.image && <CardMedia component="img" height="140" image={getMediaUrl(evt.image) || evt.image} alt={evt.titre} />}
                  <CardContent>
                    <Chip label={evt.type_evenement_display || evt.type_evenement} size="small" sx={{ mb: 1, bgcolor: `${COLORS.or}30` }} />
                    <Typography variant="h6">{evt.titre}</Typography>
                    <Typography variant="body2" color="text.secondary">{evt.lieu}</Typography>
                    <Typography variant="caption" display="block">{new Date(evt.date_debut).toLocaleDateString('fr-FR')}</Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" sx={{ color: COLORS.vert }} onClick={() => setDetailEvt(evt)}>
                      Voir détails
                    </Button>
                    {isAdmin && (
                      <>
                        <IconButton size="small" onClick={() => handleOpenEdit(evt)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                        <IconButton size="small" onClick={() => setOpenDelete(evt)} color="error"><Delete /></IconButton>
                      </>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Dialog open={!!detailEvt} onClose={() => setDetailEvt(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detailEvt?.titre}</DialogTitle>
        <DialogContent dividers>
          {detailEvt && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon fontSize="small" sx={{ color: COLORS.vert }} />
                <Chip
                  label={detailEvt.type_evenement_display || detailEvt.type_evenement}
                  size="small"
                  sx={{ bgcolor: `${COLORS.or}30` }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>
                {detailEvt.lieu}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Du{' '}
                {detailEvt.date_debut
                  ? new Date(detailEvt.date_debut).toLocaleString('fr-FR')
                  : '-'}{' '}
                au{' '}
                {detailEvt.date_fin
                  ? new Date(detailEvt.date_fin).toLocaleString('fr-FR')
                  : '-'}
              </Typography>
              {detailEvt.adresse_complete && (
                <Typography variant="body2">{detailEvt.adresse_complete}</Typography>
              )}
              {detailEvt.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {detailEvt.description}
                </Typography>
              )}
              {detailEvt.lien_visio && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Lien visio :{' '}
                  <a href={detailEvt.lien_visio} target="_blank" rel="noopener noreferrer">
                    {detailEvt.lien_visio}
                  </a>
                </Typography>
              )}
              {detailEvt.capacite_max && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Capacité : {detailEvt.capacite_max} personne(s)
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailEvt(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier l\'événement' : 'Créer un événement'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titre"
              value={form.titre}
              onChange={(e) => {
                setForm((f) => ({ ...f, titre: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, titre: undefined }))
              }}
              required
              fullWidth
              error={!!fieldErrors.titre}
              helperText={fieldErrors.titre || ''}
            />
            <TextField label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} fullWidth />
            <TextField select label="Type" value={form.type_evenement} onChange={(e) => setForm((f) => ({ ...f, type_evenement: e.target.value }))} fullWidth>
              {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <TextField
              label="Date début"
              type="datetime-local"
              value={form.date_debut}
              onChange={(e) => {
                setForm((f) => ({ ...f, date_debut: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, date_debut: undefined }))
              }}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!fieldErrors.date_debut}
              helperText={fieldErrors.date_debut || ''}
            />
            <TextField
              label="Date fin"
              type="datetime-local"
              value={form.date_fin}
              onChange={(e) => {
                setForm((f) => ({ ...f, date_fin: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, date_fin: undefined }))
              }}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!fieldErrors.date_fin}
              helperText={fieldErrors.date_fin || ''}
            />
            <TextField
              label="Lieu"
              value={form.lieu}
              onChange={(e) => {
                setForm((f) => ({ ...f, lieu: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, lieu: undefined }))
              }}
              required
              fullWidth
              error={!!fieldErrors.lieu}
              helperText={fieldErrors.lieu || ''}
            />
            <TextField label="Adresse complète" value={form.adresse_complete} onChange={(e) => setForm((f) => ({ ...f, adresse_complete: e.target.value }))} multiline fullWidth />
            <TextField label="Lien visio" value={form.lien_visio} onChange={(e) => setForm((f) => ({ ...f, lien_visio: e.target.value }))} fullWidth />
            <TextField label="Capacité max" type="number" value={form.capacite_max} onChange={(e) => setForm((f) => ({ ...f, capacite_max: e.target.value }))} fullWidth />
            <TextField select label="Publié" value={form.est_publie ? 'oui' : 'non'} onChange={(e) => setForm((f) => ({ ...f, est_publie: e.target.value === 'oui' }))} fullWidth>
              <MenuItem value="non">Non</MenuItem>
              <MenuItem value="oui">Oui</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer cet événement ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer « {openDelete.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
