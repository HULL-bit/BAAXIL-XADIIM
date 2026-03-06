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
  Grid,
} from '@mui/material'
import { Add, Edit, Delete } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }
const STATUTS = [
  { value: 'planifiee', label: 'Prévue' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'annulee', label: 'Annulée' },
  { value: 'reportee', label: 'Reportée' },
]

export default function Reunions() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  // Activités / réunions
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    titre: '',
    ordre_du_jour: '',
    date_reunion: '',
    duree_prevue: 60,
    lieu: '',
    lien_visio: '',
    statut: 'planifiee',
  })

  // Matériels du daara
  const [materiels, setMateriels] = useState([])
  const [loadingMateriels, setLoadingMateriels] = useState(true)
  const [stats, setStats] = useState({
    total_types: 0,
    total_quantite: 0,
    total_disponible: 0,
    total_defectueuse: 0,
    pourcentage_disponible: 0,
    par_categorie: [],
  })
  const [materielForm, setMaterielForm] = useState({
    nom: '',
    categorie: '',
    description: '',
    quantite_totale: 0,
    quantite_disponible: 0,
    quantite_defectueuse: 0,
    lieu_stockage: '',
    notes: '',
  })
  const [materielEditingId, setMaterielEditingId] = useState(null)
  const [openMaterielForm, setOpenMaterielForm] = useState(false)
  const [openMaterielDelete, setOpenMaterielDelete] = useState(null)
  const [materielSaving, setMaterielSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [materielFieldErrors, setMaterielFieldErrors] = useState({})

  const loadList = () => {
    setLoading(true)
    api.get('/organisation/reunions/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  const loadMateriels = () => {
    setLoadingMateriels(true)
    api
      .get('/organisation/materiels/')
      .then(({ data }) => {
        const items = data.results || data || []
        setMateriels(items)
      })
      .catch(() => setMateriels([]))
      .finally(() => setLoadingMateriels(false))
  }

  const loadStats = () => {
    api
      .get('/organisation/materiels/stats/')
      .then(({ data }) => {
        setStats({
          total_types: data.total_types ?? 0,
          total_quantite: data.total_quantite ?? 0,
          total_disponible: data.total_disponible ?? 0,
          total_defectueuse: data.total_defectueuse ?? 0,
          pourcentage_disponible: data.pourcentage_disponible ?? 0,
          par_categorie: Array.isArray(data.par_categorie) ? data.par_categorie : [],
        })
      })
      .catch(() => {
        // En cas d'erreur API stats, on recalcule à partir de la liste
        const total_types = materiels.length
        const total_quantite = materiels.reduce((sum, m) => sum + (m.quantite_totale || 0), 0)
        const total_disponible = materiels.reduce((sum, m) => sum + (m.quantite_disponible || 0), 0)
        const total_defectueuse = materiels.reduce((sum, m) => sum + (m.quantite_defectueuse || 0), 0)
        const pourcentage_disponible = total_quantite ? Math.round(1000 * total_disponible / total_quantite) / 10 : 0
        const byCat = {}
        materiels.forEach((m) => {
          const cat = (m.categorie || '').trim() || 'Non classé'
          if (!byCat[cat]) byCat[cat] = { total_quantite: 0, total_disponible: 0, total_defectueuse: 0, nb_types: 0 }
          byCat[cat].total_quantite += m.quantite_totale || 0
          byCat[cat].total_disponible += m.quantite_disponible || 0
          byCat[cat].total_defectueuse += m.quantite_defectueuse || 0
          byCat[cat].nb_types += 1
        })
        const par_categorie = Object.entries(byCat).map(([categorie, v]) => ({
          categorie,
          ...v,
          pourcentage_disponible: v.total_quantite ? Math.round(1000 * v.total_disponible / v.total_quantite) / 10 : 0,
        }))
        setStats({
          total_types,
          total_quantite,
          total_disponible,
          total_defectueuse,
          pourcentage_disponible,
          par_categorie,
        })
      })
  }

  useEffect(() => {
    loadList()
    loadMateriels()
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      ordre_du_jour: '',
      date_reunion: now.toISOString().slice(0, 16),
      duree_prevue: 60,
      lieu: '',
      lien_visio: '',
      statut: 'planifiee',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleOpenEdit = (r) => {
    setEditingId(r.id)
    setForm({
      titre: r.titre || '',
      ordre_du_jour: r.ordre_du_jour || '',
      date_reunion: toDatetimeLocal(r.date_reunion),
      duree_prevue: r.duree_prevue || 60,
      lieu: r.lieu || '',
      lien_visio: r.lien_visio || '',
      statut: r.statut || 'planifiee',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.titre) errors.titre = 'Nom de l’activité requis.'
    if (!form.date_reunion) errors.date_reunion = 'Date et heure requises.'
    if (!form.lieu) errors.lieu = 'Lieu requis.'
    if (!form.ordre_du_jour) errors.ordre_du_jour = 'Description / ordre du jour requis.'
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
        ordre_du_jour: form.ordre_du_jour,
        date_reunion: new Date(form.date_reunion).toISOString(),
        duree_prevue: Number(form.duree_prevue),
        lieu: form.lieu,
        lien_visio: form.lien_visio || '',
        statut: form.statut,
      }
      if (editingId) {
        await api.patch(`/organisation/reunions/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Réunion modifiée.' })
      } else {
        await api.post('/organisation/reunions/', payload)
        setMessage({ type: 'success', text: 'Réunion créée.' })
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

  const resetMaterielForm = () => {
    setMaterielEditingId(null)
    setMaterielForm({
      nom: '',
      categorie: '',
      description: '',
      quantite_totale: 0,
      quantite_disponible: 0,
      quantite_defectueuse: 0,
      lieu_stockage: '',
      notes: '',
    })
    setMaterielFieldErrors({})
  }

  const handleOpenAddMateriel = () => {
    resetMaterielForm()
    setOpenMaterielForm(true)
  }

  const handleOpenEditMateriel = (m) => {
    setMaterielEditingId(m.id)
    setMaterielForm({
      nom: m.nom || '',
      categorie: m.categorie || '',
      description: m.description || '',
      quantite_totale: m.quantite_totale ?? 0,
      quantite_disponible: m.quantite_disponible ?? 0,
      quantite_defectueuse: m.quantite_defectueuse ?? 0,
      lieu_stockage: m.lieu_stockage || '',
      notes: m.notes || '',
    })
    setOpenMaterielForm(true)
  }

  const handleSaveMateriel = async () => {
    const errors = {}
    if (!materielForm.nom) errors.nom = 'Nom du matériel requis.'

    const qt = Number(materielForm.quantite_totale) || 0
    const qd = Number(materielForm.quantite_disponible) || 0
    const qf = Number(materielForm.quantite_defectueuse) || 0

    if (qd > qt || qf > qt) {
      errors.quantites = 'Les quantités disponible / défectueuse ne peuvent pas dépasser la quantité totale.'
    }

    setMaterielFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }

    setMaterielSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = {
        nom: materielForm.nom,
        categorie: materielForm.categorie || '',
        description: materielForm.description || '',
        quantite_totale: qt,
        quantite_disponible: qd,
        quantite_defectueuse: qf,
        lieu_stockage: materielForm.lieu_stockage || '',
        notes: materielForm.notes || '',
      }

      if (materielEditingId) {
        await api.patch(`/organisation/materiels/${materielEditingId}/`, payload)
        setMessage({ type: 'success', text: 'Matériel modifié.' })
      } else {
        await api.post('/organisation/materiels/', payload)
        setMessage({ type: 'success', text: 'Matériel ajouté.' })
      }

      loadMateriels()
      loadStats()
      setOpenMaterielForm(false)
      resetMaterielForm()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setMaterielSaving(false)
    }
  }

  const handleDeleteMateriel = async () => {
    if (!openMaterielDelete) return
    setMaterielSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/organisation/materiels/${openMaterielDelete.id}/`)
      setMessage({ type: 'success', text: 'Matériel supprimé.' })
      loadMateriels()
      loadStats()
      setOpenMaterielDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setMaterielSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/organisation/reunions/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Réunion supprimée.' })
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
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Organisation</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Suivi des activités et des matériels du daara</Typography>
        </Box>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleOpenAddMateriel}
              sx={{ borderColor: COLORS.vert, color: COLORS.vert, '&:hover': { borderColor: COLORS.vertFonce, bgcolor: `${COLORS.vert}08` } }}
            >
              Ajouter un matériel
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAdd}
              sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
            >
              Ajouter une activité
            </Button>
          </Box>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {/* Statistiques rapides sur les matériels */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}` }}>
            <Typography variant="caption" sx={{ color: COLORS.vertFonce, fontWeight: 600 }}>Types de matériels</Typography>
            <Typography variant="h5" sx={{ color: COLORS.vert, fontWeight: 700 }}>{stats.total_types}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.or}` }}>
            <Typography variant="caption" sx={{ color: COLORS.vertFonce, fontWeight: 600 }}>Quantité totale</Typography>
            <Typography variant="h5" sx={{ color: COLORS.vert, fontWeight: 700 }}>{stats.total_quantite}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderLeft: `4px solid #4caf50` }}>
            <Typography variant="caption" sx={{ color: COLORS.vertFonce, fontWeight: 600 }}>Disponible</Typography>
            <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 700 }}>{stats.total_disponible}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderLeft: `4px solid #f44336` }}>
            <Typography variant="caption" sx={{ color: COLORS.vertFonce, fontWeight: 600 }}>Hors service</Typography>
            <Typography variant="h5" sx={{ color: '#f44336', fontWeight: 700 }}>{stats.total_defectueuse}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderLeft: `4px solid #2196f3` }}>
            <Typography variant="caption" sx={{ color: COLORS.vertFonce, fontWeight: 600 }}>% disponible</Typography>
            <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 700 }}>{stats.pourcentage_disponible} %</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Statistiques par catégorie */}
      {stats.par_categorie && stats.par_categorie.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1.5, color: COLORS.vertFonce, fontWeight: 600 }}>Statistiques par catégorie</Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                  <TableCell>Catégorie</TableCell>
                  <TableCell align="right">Types</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Disponible</TableCell>
                  <TableCell align="right">Hors service</TableCell>
                  <TableCell align="right">% dispo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.par_categorie.map((c) => (
                  <TableRow key={c.categorie}>
                    <TableCell>{c.categorie}</TableCell>
                    <TableCell align="right">{c.nb_types}</TableCell>
                    <TableCell align="right">{c.total_quantite}</TableCell>
                    <TableCell align="right">{c.total_disponible}</TableCell>
                    <TableCell align="right">{c.total_defectueuse}</TableCell>
                    <TableCell align="right">{c.pourcentage_disponible} %</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tableau des matériels */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1, color: COLORS.vertFonce, fontWeight: 600 }}>Matériels du daara</Typography>
        {loadingMateriels ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.vert}` }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                  <TableCell>Nom</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Disponible</TableCell>
                  <TableCell align="right">Hors service</TableCell>
                  <TableCell align="right">% dispo</TableCell>
                  <TableCell>Lieu</TableCell>
                  {isAdmin && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {materiels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} align="center">
                      Aucun matériel enregistré
                    </TableCell>
                  </TableRow>
                ) : (
                  materiels.map((m) => {
                    const total = m.quantite_totale || 0
                    const dispo = m.quantite_disponible || 0
                    const pctDispo = total ? Math.round(1000 * dispo / total) / 10 : 0
                    return (
                    <TableRow key={m.id}>
                      <TableCell>{m.nom}</TableCell>
                      <TableCell>{m.categorie || '-'}</TableCell>
                      <TableCell align="right">{m.quantite_totale}</TableCell>
                      <TableCell align="right">{m.quantite_disponible}</TableCell>
                      <TableCell align="right">{m.quantite_defectueuse}</TableCell>
                      <TableCell align="right">{pctDispo} %</TableCell>
                      <TableCell>{m.lieu_stockage || '-'}</TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenEditMateriel(m)} sx={{ color: COLORS.vert }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setOpenMaterielDelete(m)} color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                <TableCell>Activité</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Lieu</TableCell>
                <TableCell>Durée</TableCell>
                <TableCell>Statut</TableCell>
                {isAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 6 : 5} align="center">Aucune activité</TableCell></TableRow>
              ) : (
                list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.titre}</TableCell>
                    <TableCell>{new Date(r.date_reunion).toLocaleString('fr-FR')}</TableCell>
                    <TableCell>{r.lieu}</TableCell>
                    <TableCell>{r.duree_prevue} min</TableCell>
                    <TableCell><Chip label={r.statut_display || r.statut} size="small" color={r.statut === 'en_cours' ? 'success' : 'default'} /></TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenEdit(r)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                        <IconButton size="small" onClick={() => setOpenDelete(r)} color="error"><Delete /></IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isAdmin && (
        <>
          <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
            <DialogTitle>{editingId ? 'Modifier l’activité' : 'Ajouter une activité'}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  fullWidth
                  label="Nom de l’activité"
                  value={form.titre}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, titre: e.target.value }))
                    setFieldErrors((fe) => ({ ...fe, titre: undefined }))
                  }}
                  required
                  error={!!fieldErrors.titre}
                  helperText={fieldErrors.titre || ''}
                />
                <TextField
                  fullWidth
                  label="Description / détails"
                  value={form.ordre_du_jour}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, ordre_du_jour: e.target.value }))
                    setFieldErrors((fe) => ({ ...fe, ordre_du_jour: undefined }))
                  }}
                  multiline
                  rows={3}
                  required
                  error={!!fieldErrors.ordre_du_jour}
                  helperText={fieldErrors.ordre_du_jour || ''}
                />
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Date et heure"
                  value={form.date_reunion}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, date_reunion: e.target.value }))
                    setFieldErrors((fe) => ({ ...fe, date_reunion: undefined }))
                  }}
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!!fieldErrors.date_reunion}
                  helperText={fieldErrors.date_reunion || ''}
                />
                <TextField fullWidth type="number" label="Durée prévue (min)" value={form.duree_prevue} onChange={(e) => setForm((f) => ({ ...f, duree_prevue: e.target.value }))} inputProps={{ min: 1 }} />
                <TextField
                  fullWidth
                  label="Lieu (daara, quartier...)"
                  value={form.lieu}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, lieu: e.target.value }))
                    setFieldErrors((fe) => ({ ...fe, lieu: undefined }))
                  }}
                  required
                  error={!!fieldErrors.lieu}
                  helperText={fieldErrors.lieu || ''}
                />
                <TextField fullWidth label="Remarques / lien" value={form.lien_visio} onChange={(e) => setForm((f) => ({ ...f, lien_visio: e.target.value }))} />
                <TextField select fullWidth label="Statut" value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>{STATUTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
              <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
            <DialogTitle>Supprimer cette activité ?</DialogTitle>
            <DialogContent>{openDelete && <Typography>Supprimer l’activité « {openDelete.titre} » ?</Typography>}</DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
              <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
            </DialogActions>
          </Dialog>

          {/* Dialog Matériel */}
          <Dialog
            open={openMaterielForm}
            onClose={() => {
              setOpenMaterielForm(false)
              resetMaterielForm()
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>{materielEditingId ? 'Modifier le matériel' : 'Ajouter un matériel'}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  fullWidth
                  label="Nom du matériel"
                  value={materielForm.nom}
                  onChange={(e) => setMaterielForm((f) => ({ ...f, nom: e.target.value }))}
                  required
                />
                <TextField
                  fullWidth
                  label="Catégorie (sono, micro, bâche...)"
                  value={materielForm.categorie}
                  onChange={(e) => setMaterielForm((f) => ({ ...f, categorie: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="Description / détails"
                  value={materielForm.description}
                  onChange={(e) => setMaterielForm((f) => ({ ...f, description: e.target.value }))}
                  multiline
                  rows={3}
                />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    type="number"
                    label="Quantité totale"
                    value={materielForm.quantite_totale}
                    onChange={(e) => setMaterielForm((f) => ({ ...f, quantite_totale: e.target.value }))}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                  <TextField
                    type="number"
                    label="Disponible"
                    value={materielForm.quantite_disponible}
                    onChange={(e) => setMaterielForm((f) => ({ ...f, quantite_disponible: e.target.value }))}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                  <TextField
                    type="number"
                    label="Hors service"
                    value={materielForm.quantite_defectueuse}
                    onChange={(e) => setMaterielForm((f) => ({ ...f, quantite_defectueuse: e.target.value }))}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                </Box>
                {materielFieldErrors.quantites && (
                  <Typography variant="caption" color="error">
                    {materielFieldErrors.quantites}
                  </Typography>
                )}
                <TextField
                  fullWidth
                  label="Lieu de stockage"
                  value={materielForm.lieu_stockage}
                  onChange={(e) => setMaterielForm((f) => ({ ...f, lieu_stockage: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="Notes internes"
                  value={materielForm.notes}
                  onChange={(e) => setMaterielForm((f) => ({ ...f, notes: e.target.value }))}
                  multiline
                  rows={2}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setOpenMaterielForm(false)
                  resetMaterielForm()
                }}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveMateriel}
                disabled={materielSaving}
                sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
              >
                {materielSaving ? <CircularProgress size={24} /> : 'Enregistrer'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog suppression matériel */}
          <Dialog open={!!openMaterielDelete} onClose={() => setOpenMaterielDelete(null)}>
            <DialogTitle>Supprimer ce matériel ?</DialogTitle>
            <DialogContent>
              {openMaterielDelete && <Typography>Supprimer le matériel « {openMaterielDelete.nom} » ?</Typography>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenMaterielDelete(null)}>Annuler</Button>
              <Button variant="contained" color="error" onClick={handleDeleteMateriel} disabled={materielSaving}>
                {materielSaving ? <CircularProgress size={24} /> : 'Supprimer'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}
