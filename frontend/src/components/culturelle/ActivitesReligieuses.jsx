import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
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
} from '@mui/material'
import { Add, Edit, Delete } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }
const TYPES = [
  { value: 'wird', label: 'Wird' },
  { value: 'khassida', label: 'Khassida' },
  { value: 'tafsir', label: 'Tafsir' },
  { value: 'cours', label: 'Cours religieux' },
  { value: 'sermon', label: 'Sermon' },
  { value: 'conference', label: 'Conférence' },
  { value: 'autre', label: 'Autre' },
]

export default function ActivitesReligieuses() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    titre: '',
    type_activite: 'wird',
    description: '',
    date_activite: '',
    duree: 60,
    lieu: '',
    lien_visio: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})

  const loadList = () => {
    setLoading(true)
    api.get('/culturelle/activites-religieuses/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const toDatetimeLocal = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    const now = new Date()
    setForm({
      titre: '',
      type_activite: 'wird',
      description: '',
      date_activite: now.toISOString().slice(0, 16),
      duree: 60,
      lieu: '',
      lien_visio: '',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleOpenEdit = (a) => {
    setEditingId(a.id)
    setForm({
      titre: a.titre || '',
      type_activite: a.type_activite || 'wird',
      description: a.description || '',
      date_activite: toDatetimeLocal(a.date_activite),
      duree: a.duree || 60,
      lieu: a.lieu || '',
      lien_visio: a.lien_visio || '',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.titre) errors.titre = 'Titre requis.'
    if (!form.date_activite) errors.date_activite = 'Date et heure requises.'
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
        titre: form.titre,
        type_activite: form.type_activite,
        description: form.description || '',
        date_activite: new Date(form.date_activite).toISOString(),
        duree: Number(form.duree),
        lieu: form.lieu,
        lien_visio: form.lien_visio || '',
      }
      if (editingId) {
        await api.patch(`/culturelle/activites-religieuses/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Activité modifiée.' })
      } else {
        await api.post('/culturelle/activites-religieuses/', payload)
        setMessage({ type: 'success', text: 'Activité créée.' })
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
        const d = err.response?.data?.detail || data
        setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
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
      await api.delete(`/culturelle/activites-religieuses/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Activité supprimée.' })
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
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Activités religieuses</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Wird, Khassida, Tafsir, cours</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Ajouter une activité
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : isAdmin ? (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                <TableCell>Titre</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Lieu</TableCell>
                <TableCell>Animateur</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">Aucune activité</TableCell></TableRow>
              ) : (
                list.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.titre}</TableCell>
                    <TableCell><Chip size="small" label={a.type_display || a.type_activite} /></TableCell>
                    <TableCell>{new Date(a.date_activite).toLocaleString('fr-FR')}</TableCell>
                    <TableCell>{a.lieu}</TableCell>
                    <TableCell>{a.animateur_nom || '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEdit(a)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                      <IconButton size="small" onClick={() => setOpenDelete(a)} color="error"><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Grid container spacing={2}>
          {list.length === 0 ? (
            <Grid item xs={12}><Typography color="text.secondary">Aucune activité programmée.</Typography></Grid>
          ) : (
            list.map((a) => (
              <Grid item xs={12} md={6} key={a.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  <CardContent>
                    <Chip label={a.type_display || a.type_activite} size="small" sx={{ mb: 1 }} />
                    <Typography variant="h6">{a.titre}</Typography>
                    <Typography variant="body2" color="text.secondary">{a.lieu}</Typography>
                    <Typography variant="caption" display="block">{new Date(a.date_activite).toLocaleString('fr-FR')} — {a.animateur_nom}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier l\'activité' : 'Ajouter une activité religieuse'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre"
                value={form.titre}
                onChange={(e) => {
                  setForm((f) => ({ ...f, titre: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, titre: undefined }))
                }}
                required
                error={!!fieldErrors.titre}
                helperText={fieldErrors.titre || ''}
              />
            </Grid>
            <Grid item xs={12}><TextField select fullWidth label="Type" value={form.type_activite} onChange={(e) => setForm((f) => ({ ...f, type_activite: e.target.value }))}>{TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Date et heure"
                value={form.date_activite}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date_activite: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, date_activite: undefined }))
                }}
                InputLabelProps={{ shrink: true }}
                required
                error={!!fieldErrors.date_activite}
                helperText={fieldErrors.date_activite || ''}
              />
            </Grid>
            <Grid item xs={6}><TextField fullWidth type="number" label="Durée (min)" value={form.duree} onChange={(e) => setForm((f) => ({ ...f, duree: e.target.value }))} inputProps={{ min: 1 }} /></Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lieu"
                value={form.lieu}
                onChange={(e) => {
                  setForm((f) => ({ ...f, lieu: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, lieu: undefined }))
                }}
                required
                error={!!fieldErrors.lieu}
                helperText={fieldErrors.lieu || ''}
              />
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Lien visio" value={form.lien_visio} onChange={(e) => setForm((f) => ({ ...f, lien_visio: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer cette activité ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer « {openDelete.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
