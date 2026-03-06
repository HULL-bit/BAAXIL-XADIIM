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
const STATUTS = [
  { value: 'planifie', label: 'Planifié' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
]
const CATEGORIES = [
  { value: 'education', label: 'Éducation' },
  { value: 'sante', label: 'Santé' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'logement', label: 'Logement' },
  { value: 'emploi', label: 'Emploi' },
  { value: 'urgence', label: 'Urgence' },
  { value: 'autre', label: 'Autre' },
]

export default function ProjetsSociaux() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [users, setUsers] = useState([])
  const [openAssign, setOpenAssign] = useState(null)
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignList, setAssignList] = useState([])
  const [form, setForm] = useState({
    titre: '',
    description: '',
    membre_concerne: '',
    objectif_social: '',
    categorie: 'education',
    objectifs: '',
    lieu: '',
    budget_previsionnel: '',
    date_debut: '',
    date_fin: '',
    statut: 'planifie',
  })
  const [assignMontants, setAssignMontants] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})

  const loadList = () => {
    setLoading(true)
    api.get('/sociale/projets-entraide/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])
  useEffect(() => {
    if (isAdmin) {
      api
        .get('/auth/users/')
        .then(({ data }) => setUsers(data.results || data))
        .catch(() => setUsers([]))
    }
  }, [isAdmin])

  const loadAssignList = (projetId) => {
    if (!projetId) return
    api
      .get(`/sociale/contributions/?projet=${projetId}`)
      .then(({ data }) => {
        const list = data.results || data
        setAssignList(list)
        const byMember = {}
        list.forEach((c) => { byMember[c.membre] = Number(c.montant) || 0 })
        setAssignMontants((prev) => ({ ...prev, ...byMember }))
      })
      .catch(() => setAssignList([]))
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    const now = new Date()
    setForm({
      titre: '',
      description: '',
      membre_concerne: '',
      objectif_social: '',
      categorie: 'education',
      objectifs: '',
      lieu: '',
      budget_previsionnel: '',
      date_debut: now.toISOString().slice(0, 10),
      date_fin: '',
      statut: 'planifie',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleOpenEdit = (p) => {
    setEditingId(p.id)
    setForm({
      titre: p.titre || '',
      description: p.description || '',
      membre_concerne: p.membre_concerne || '',
      objectif_social: p.objectif_social || '',
      categorie: p.categorie || 'education',
      objectifs: p.objectifs || '',
      lieu: p.lieu || '',
      budget_previsionnel: p.budget_previsionnel || '',
      date_debut: p.date_debut ? p.date_debut.slice(0, 10) : '',
      date_fin: p.date_fin ? p.date_fin.slice(0, 10) : '',
      statut: p.statut || 'planifie',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleOpenAssign = (p) => {
    setOpenAssign(p)
    setMessage({ type: '', text: '' })
    loadAssignList(p.id)
    setAssignMontants({})
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.titre) errors.titre = 'Titre requis.'
    if (!form.date_debut) errors.date_debut = 'Date de début requise.'
    if (!form.budget_previsionnel) errors.budget_previsionnel = 'Budget prévisionnel requis.'
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
        description: form.description || '',
        membre_concerne: form.membre_concerne || null,
        objectif_social: form.objectif_social || '',
        categorie: form.categorie,
        objectifs: form.objectifs || '',
        lieu: form.lieu || '',
        budget_previsionnel: Number(form.budget_previsionnel),
        date_debut: form.date_debut,
        date_fin: form.date_fin || null,
        statut: form.statut,
      }
      if (editingId) {
        await api.patch(`/sociale/projets-entraide/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Projet modifié.' })
      } else {
        await api.post('/sociale/projets-entraide/', payload)
        setMessage({ type: 'success', text: 'Projet créé.' })
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
      await api.delete(`/sociale/projets-entraide/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Projet supprimé.' })
      loadList()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAssignations = async () => {
    if (!openAssign) return
    setAssignSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const assignations = users.map((u) => ({
        membre: u.id,
        montant: Number(assignMontants[u.id]) || 0,
      }))
      const { data } = await api.post(`/sociale/projets-entraide/${openAssign.id}/assignations/`, {
        assignations,
      })
      setMessage({ type: 'success', text: data?.detail || 'Assignations enregistrées.' })
      loadAssignList(openAssign.id)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({
        type: 'error',
        text: typeof d === 'string' ? d : JSON.stringify(d) || 'Erreur lors de l\'enregistrement.',
      })
    } finally {
      setAssignSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Projets d'entraide</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Actions sociales et solidarité</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Ajouter un projet
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
                <TableCell>Type sociale</TableCell>
                <TableCell>Membre / Objectif</TableCell>
                <TableCell>Lieu</TableCell>
                <TableCell>Budget</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">Aucun projet</TableCell></TableRow>
              ) : (
                list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.titre}</TableCell>
                    <TableCell><Chip size="small" label={p.categorie_display || p.categorie} /></TableCell>
                    <TableCell>{p.membre_concerne_nom || (p.objectif_social ? p.objectif_social.slice(0, 40) + (p.objectif_social.length > 40 ? '…' : '') : '—')}</TableCell>
                    <TableCell>{p.lieu || '—'}</TableCell>
                    <TableCell>{Number(p.budget_previsionnel || 0).toLocaleString('fr-FR')} FCFA</TableCell>
                    <TableCell>{p.date_debut?.slice(0, 10)} — {p.date_fin ? p.date_fin.slice(0, 10) : '—'}</TableCell>
                    <TableCell><Chip size="small" label={p.statut_display || p.statut} color={p.statut === 'en_cours' ? 'success' : 'default'} /></TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                        onClick={() => handleOpenAssign(p)}
                      >
                        Assignations sociales
                      </Button>
                      <IconButton size="small" onClick={() => handleOpenEdit(p)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                      <IconButton size="small" onClick={() => setOpenDelete(p)} color="error"><Delete /></IconButton>
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
            <Grid item xs={12}><Typography color="text.secondary">Aucun projet pour le moment.</Typography></Grid>
          ) : (
            list.map((p) => (
              <Grid item xs={12} md={6} key={p.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  <CardContent>
                    <Chip label={p.statut_display || p.statut} size="small" sx={{ mb: 1 }} />
                    <Typography variant="h6">{p.titre}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.description}</Typography>
                    <Typography variant="caption" display="block">Catégorie : {p.categorie_display || p.categorie}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier le projet social' : 'Ajouter un projet social'}</DialogTitle>
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
            <Grid item xs={12}><TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Membre concerné (optionnel)" value={form.membre_concerne} onChange={(e) => setForm((f) => ({ ...f, membre_concerne: e.target.value }))}>
                <MenuItem value="">— Aucun —</MenuItem>
                {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Objectif social (si pas de membre concerné, ex: Magal, Gamou)" value={form.objectif_social} onChange={(e) => setForm((f) => ({ ...f, objectif_social: e.target.value }))} multiline rows={2} placeholder="Ex: Collecte pour le Magal" /></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Type sociale" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}>{CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}><TextField fullWidth label="Objectifs du projet" value={form.objectifs} onChange={(e) => setForm((f) => ({ ...f, objectifs: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Lieu" value={form.lieu} onChange={(e) => setForm((f) => ({ ...f, lieu: e.target.value }))} placeholder="Ex: Daara, Mbacké" /></Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Budget prévisionnel (FCFA)"
                value={form.budget_previsionnel}
                onChange={(e) => {
                  setForm((f) => ({ ...f, budget_previsionnel: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, budget_previsionnel: undefined }))
                }}
                inputProps={{ min: 0 }}
                required
                error={!!fieldErrors.budget_previsionnel}
                helperText={fieldErrors.budget_previsionnel || ''}
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
                  setFieldErrors((fe) => ({ ...fe, date_debut: undefined }))
                }}
                InputLabelProps={{ shrink: true }}
                required
                error={!!fieldErrors.date_debut}
                helperText={fieldErrors.date_debut || ''}
              />
            </Grid>
            <Grid item xs={6}><TextField fullWidth type="date" label="Date fin" value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Statut" value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>{STATUTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer ce projet ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer « {openDelete.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openAssign} onClose={() => { setOpenAssign(null); setAssignList([]); setAssignMontants({}) }} maxWidth="md" fullWidth>
        <DialogTitle>Assigner à chaque membre le montant à contribuer — {openAssign?.titre}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Saisissez le montant (FCFA) que chaque membre doit contribuer pour ce projet. Laissez vide ou 0 pour ne pas assigner.
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Membre</TableCell>
                  <TableCell align="right" sx={{ minWidth: 140 }}>Montant à contribuer (FCFA)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={2} align="center">Chargement des membres…</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.first_name} {u.last_name} {u.email && `(${u.email})`}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={assignMontants[u.id] ?? ''}
                          onChange={(e) => setAssignMontants((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          inputProps={{ min: 0 }}
                          placeholder="0"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSaveAssignations}
            disabled={assignSaving || !openAssign || users.length === 0}
            sx={{ mt: 2, bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            {assignSaving ? <CircularProgress size={24} /> : 'Enregistrer toutes les assignations'}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenAssign(null); setAssignList([]); setAssignMontants({}) }}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
