import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { Add, Assignment, Delete, Edit, MenuBook, Schedule } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }

function useTempsRestant(dateFin) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!dateFin) return
    const t = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(t)
  }, [dateFin])
  if (!dateFin) return { jours: 0, texte: '—' }
  const fin = new Date(dateFin)
  fin.setHours(23, 59, 59, 999)
  const diff = fin - now
  if (diff <= 0) return { jours: 0, texte: 'Terminé' }
  const jours = Math.ceil(diff / (24 * 60 * 60 * 1000))
  return { jours, texte: jours === 1 ? '1 jour restant' : `${jours} jours restants` }
}

function MiniStatCard({ icon: Icon, label, value, color }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, flex: 1, minWidth: 0, borderLeft: `4px solid ${color}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Icon sx={{ color, fontSize: 20 }} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      </Box>
      <Typography variant="h6" fontWeight={700} sx={{ color }}>{value}</Typography>
    </Paper>
  )
}

function TempsRestantCard({ dateFin }) {
  const { jours, texte } = useTempsRestant(dateFin)
  return (
    <MiniStatCard
      icon={Schedule}
      label="Temps restant"
      value={jours <= 0 ? 'Terminé' : texte}
      color={jours <= 0 ? COLORS.vertFonce : COLORS.or}
    />
  )
}

export default function ProgrammeKamil() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { user } = useAuth()
  const isJewrine =
    !!user?.role &&
    (user.role === 'jewrin' ||
      user.role.toLowerCase().startsWith('jewrine_'))
  const canCreateProgramme = user?.role === 'admin'
  const canAssignJukki = canCreateProgramme || isJewrine
  const [kamils, setKamils] = useState([])
  const [jukkisByKamil, setJukkisByKamil] = useState({})
  const [membres, setMembres] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openCreate, setOpenCreate] = useState(false)
  const [openAssign, setOpenAssign] = useState(null)
  const [openDelete, setOpenDelete] = useState(null)
  const [openEdit, setOpenEdit] = useState(null)
  const [editForm, setEditForm] = useState({ date_debut: '', date_fin: '' })
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titre: '',
    description: '',
    date_debut: '',
    date_fin: '',
  })
  const [assignForm, setAssignForm] = useState({}) // { numero: membreId }

  const loadKamils = () => api.get('/culturelle/kamil/').then(({ data }) => setKamils(data.results || data)).catch(() => setKamils([]))
  const loadJukkis = () => api.get('/culturelle/jukkis/').then(({ data }) => {
    const list = data.results || data
    const byKamil = {}
    list.forEach((j) => {
      if (!byKamil[j.kamil]) byKamil[j.kamil] = []
      byKamil[j.kamil].push(j)
    })
    Object.keys(byKamil).forEach((k) => byKamil[k].sort((a, b) => a.numero - b.numero))
    setJukkisByKamil(byKamil)
  }).catch(() => setJukkisByKamil({}))
  const loadMembres = () => api.get('/auth/users/').then(({ data }) => setMembres(data.results || data || [])).catch(() => setMembres([]))

  useEffect(() => {
    setLoading(true)
    Promise.all([loadKamils(), loadJukkis()]).finally(() => setLoading(false))
  }, [])
  useEffect(() => { if (canAssignJukki) loadMembres() }, [canAssignJukki])

  const handleCreateOpen = () => {
    setForm({
      titre: '',
      description: '',
      date_debut: '',
      date_fin: '',
    })
    setOpenCreate(true)
  }

  const handleCreateSubmit = async () => {
    if (!form.titre || !form.date_debut || !form.date_fin) {
      setMessage({ type: 'error', text: 'Titre, date de début et date prévue de fin requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post('/culturelle/kamil/', {
        titre: form.titre,
        description: form.description || form.titre,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
      })
      setMessage({ type: 'success', text: 'Programme créé avec 30 JUKKI.' })
      setOpenCreate(false)
      loadKamils()
      loadJukkis()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleEditOpen = (k) => {
    setOpenEdit(k)
    setEditForm({
      date_debut: k.date_debut || '',
      date_fin: k.date_fin || '',
    })
  }

  const handleEditSubmit = async () => {
    if (!openEdit) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.patch(`/culturelle/kamil/${openEdit.id}/`, {
        date_debut: editForm.date_debut,
        date_fin: editForm.date_fin,
      })
      setMessage({ type: 'success', text: 'Dates mises à jour.' })
      setOpenEdit(null)
      loadKamils()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleAssignOpen = async (kamil) => {
    setOpenAssign(kamil)
    let jukkis = (jukkisByKamil[kamil.id] || []).sort((a, b) => a.numero - b.numero)
    if (jukkis.length === 0) {
      try {
        const { data } = await api.get(`/culturelle/kamil/${kamil.id}/`)
        jukkis = (data.jukkis || []).sort((a, b) => a.numero - b.numero)
      } catch { jukkis = [] }
    }
    const initial = {}
    jukkis.forEach((j) => { initial[j.numero] = j.membre || '' })
    setAssignForm(initial)
  }

  const handleAssignChange = (numero, membreId) => {
    setAssignForm((prev) => ({ ...prev, [numero]: membreId ? Number(membreId) : '' }))
  }

  const handleAssignSubmit = async () => {
    if (!openAssign) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const assignations = {}
      Object.entries(assignForm).forEach(([numero, membreId]) => {
        assignations[numero] = membreId || null
      })
      await api.patch(`/culturelle/kamil/${openAssign.id}/assigner_jukkis/`, { assignations })
      setMessage({ type: 'success', text: 'Assignations enregistrées.' })
      setOpenAssign(null)
      loadJukkis()
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
      await api.delete(`/culturelle/kamil/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Programme Kamil supprimé.' })
      setOpenDelete(null)
      loadKamils()
      loadJukkis()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Typography>Chargement...</Typography>

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
        Programme Kamil
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Programmes de lecture (30 JUKKI). {canCreateProgramme && 'En tant qu\'admin vous pouvez créer des programmes et assigner chaque JUKKI à un membre.'}
        {canAssignJukki && !canCreateProgramme && ' Vous pouvez assigner les JUKKI aux membres.'}
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {canCreateProgramme && (
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateOpen}
          sx={{ mb: 2, bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
        >
          Créer un programme (30 JUKKI)
        </Button>
      )}

      <Grid container spacing={2}>
        {kamils.length === 0 ? (
          <Grid item xs={12}><Typography color="text.secondary">Aucun programme Kamil.</Typography></Grid>
        ) : (
          kamils.map((k) => (
            <Grid item xs={12} md={6} key={k.id}>
              <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: COLORS.vert }}>{k.titre}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.description}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <Chip size="small" label={k.statut_display || k.statut} color={k.statut === 'actif' ? 'success' : 'default'} />
                    <Typography variant="caption" color="text.secondary">
                      {k.date_debut ? new Date(k.date_debut).toLocaleDateString('fr-FR') : '—'} → {k.date_fin ? new Date(k.date_fin).toLocaleDateString('fr-FR') : '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <MiniStatCard icon={MenuBook} label="Kamil lus" value={k.nb_lectures ?? 0} color={COLORS.vert} />
                    <TempsRestantCard dateFin={k.date_fin} />
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {canAssignJukki && (
                      <Button
                        size="small"
                        startIcon={<Assignment />}
                        onClick={() => handleAssignOpen(k)}
                        sx={{ color: COLORS.vert }}
                      >
                        Assigner les JUKKI aux membres
                      </Button>
                    )}
                    {canCreateProgramme && (
                      <>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEditOpen(k)}
                          sx={{ color: COLORS.vert }}
                        >
                          Modifier les dates
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Delete />}
                          onClick={() => setOpenDelete(k)}
                          sx={{ color: 'error.main' }}
                        >
                          Supprimer
                        </Button>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer un programme Kamil (30 JUKKI)</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={3} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Date de début" value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Date prévue de fin" value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} InputLabelProps={{ shrink: true }} required />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Créer le programme et les 30 JUKKI
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openEdit} onClose={() => setOpenEdit(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Modifier les dates — {openEdit?.titre}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth type="date" label="Date de début" value={editForm.date_debut} onChange={(e) => setEditForm((f) => ({ ...f, date_debut: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="date" label="Date fin prévue" value={editForm.date_fin} onChange={(e) => setEditForm((f) => ({ ...f, date_fin: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(null)}>Annuler</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(openAssign)}
        onClose={() => setOpenAssign(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={isMobile ? { sx: { maxHeight: '100%' } } : undefined}
      >
        <DialogTitle>Assigner chaque JUKKI à un membre — {openAssign?.titre}</DialogTitle>
        <DialogContent
          sx={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxHeight: isMobile ? 'calc(100dvh - 120px)' : '70vh',
            p: { xs: 2, sm: 3 },
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Un JUKKI ne peut être attribué qu&apos;à un seul membre. Un membre peut avoir plusieurs JUKKI.
          </Typography>
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.or}15` }}>
                  <TableCell width="25%"><strong>JUKKI</strong></TableCell>
                  <TableCell width="75%"><strong>Membre assigné</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((numero) => (
                  <TableRow key={numero}>
                    <TableCell><strong>JUKKI {numero}</strong></TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={assignForm[numero] || ''}
                        onChange={(e) => handleAssignChange(numero, e.target.value)}
                      >
                        <MenuItem value="">— Aucun —</MenuItem>
                        {membres.map((m) => (
                          <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(null)}>Fermer</Button>
          <Button variant="contained" onClick={handleAssignSubmit} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Enregistrer les assignations
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer ce programme Kamil ?</DialogTitle>
        <DialogContent>
          {openDelete && (
            <Typography>
              Êtes-vous sûr de vouloir supprimer le programme &quot;{openDelete.titre}&quot; ? Cette action supprimera également tous les JUKKI associés et ne peut pas être annulée.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
