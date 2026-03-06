import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
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
import { Add, Edit, Delete } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }
const NIVEAUX = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
  { value: 'expert', label: 'Expert' },
]
const STATUTS = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publie', label: 'Publié' },
  { value: 'archive', label: 'Archivé' },
]

export default function Cours() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [domaines, setDomaines] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    titre: '',
    code: '',
    description: '',
    objectifs: '',
    niveau: 'debutant',
    duree: 10,
    statut: 'brouillon',
    domaine: '',
    prerequis: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})

  const loadList = () => {
    setLoading(true)
    api.get('/scientifique/cours/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])
  useEffect(() => {
    if (isAdmin) api.get('/scientifique/domaines/').then(({ data }) => setDomaines(data.results || data)).catch(() => setDomaines([]))
  }, [isAdmin])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({
      titre: '',
      code: '',
      description: '',
      objectifs: '',
      niveau: 'debutant',
      duree: 10,
      statut: 'brouillon',
      domaine: '',
      prerequis: '',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleOpenEdit = (c) => {
    setEditingId(c.id)
    setForm({
      titre: c.titre || '',
      code: c.code || '',
      description: c.description || '',
      objectifs: c.objectifs || '',
      niveau: c.niveau || 'debutant',
      duree: c.duree || 10,
      statut: c.statut || 'brouillon',
      domaine: c.domaine || '',
      prerequis: c.prerequis || '',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.titre) errors.titre = 'Titre requis.'
    if (!form.code) errors.code = 'Code requis.'
    if (!form.duree) errors.duree = 'Durée requise.'
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
        code: form.code,
        description: form.description || '',
        objectifs: form.objectifs || '',
        niveau: form.niveau,
        duree: Number(form.duree),
        statut: form.statut,
        domaine: form.domaine || null,
        prerequis: form.prerequis || '',
      }
      if (editingId) {
        await api.patch(`/scientifique/cours/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Cours modifié.' })
      } else {
        await api.post('/scientifique/cours/', payload)
        setMessage({ type: 'success', text: 'Cours créé.' })
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
      await api.delete(`/scientifique/cours/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Cours supprimé.' })
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
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Cours & Formation</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Catalogue des cours</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Ajouter un cours
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
                <TableCell>Code</TableCell>
                <TableCell>Titre</TableCell>
                <TableCell>Niveau</TableCell>
                <TableCell>Durée (h)</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">Aucun cours</TableCell></TableRow>
              ) : (
                list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.code}</TableCell>
                    <TableCell>{c.titre}</TableCell>
                    <TableCell><Chip size="small" label={c.niveau_display || c.niveau} /></TableCell>
                    <TableCell>{c.duree}</TableCell>
                    <TableCell><Chip size="small" label={c.statut_display || c.statut} color={c.statut === 'publie' ? 'success' : 'default'} /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEdit(c)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                      <IconButton size="small" onClick={() => setOpenDelete(c)} color="error"><Delete /></IconButton>
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
            <Grid item xs={12}><Typography color="text.secondary">Aucun cours disponible.</Typography></Grid>
          ) : (
            list.map((c) => (
              <Grid item xs={12} md={6} key={c.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{c.titre}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.description}</Typography>
                    <Typography variant="caption" display="block">{c.code} — Niveau : {c.niveau_display || c.niveau}</Typography>
                    <Button size="small" color="primary" sx={{ mt: 1 }}>Voir le cours</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier le cours' : 'Ajouter un cours'}</DialogTitle>
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
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Code"
                value={form.code}
                onChange={(e) => {
                  setForm((f) => ({ ...f, code: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, code: undefined }))
                }}
                required
                error={!!fieldErrors.code}
                helperText={fieldErrors.code || ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Durée (heures)"
                value={form.duree}
                onChange={(e) => {
                  setForm((f) => ({ ...f, duree: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, duree: undefined }))
                }}
                inputProps={{ min: 1 }}
                required
                error={!!fieldErrors.duree}
                helperText={fieldErrors.duree || ''}
              />
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Objectifs" value={form.objectifs} onChange={(e) => setForm((f) => ({ ...f, objectifs: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Niveau" value={form.niveau} onChange={(e) => setForm((f) => ({ ...f, niveau: e.target.value }))}>{NIVEAUX.map((n) => <MenuItem key={n.value} value={n.value}>{n.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Statut" value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>{STATUTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Domaine" value={form.domaine} onChange={(e) => setForm((f) => ({ ...f, domaine: e.target.value }))}><MenuItem value="">— Aucun —</MenuItem>{domaines.map((d) => <MenuItem key={d.id} value={d.id}>{d.nom}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}><TextField fullWidth label="Prérequis" value={form.prerequis} onChange={(e) => setForm((f) => ({ ...f, prerequis: e.target.value }))} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer ce cours ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer « {openDelete.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
