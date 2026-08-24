import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import {
  Add, Download, Delete, PictureAsPdf, Image as ImageIcon, TableChart, Description, InsertDriveFile, UploadFile,
} from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getMediaUrl } from '../../services/media'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }

const TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Image' },
  { value: 'excel', label: 'Excel' },
  { value: 'word', label: 'Word' },
  { value: 'autre', label: 'Autre' },
]

const TYPE_ICON = {
  pdf: <PictureAsPdf fontSize="small" sx={{ color: '#C0432F' }} />,
  image: <ImageIcon fontSize="small" sx={{ color: '#1F7A52' }} />,
  excel: <TableChart fontSize="small" sx={{ color: '#1F7FAC' }} />,
  word: <Description fontSize="small" sx={{ color: '#5B4A94' }} />,
  autre: <InsertDriveFile fontSize="small" sx={{ color: 'text.disabled' }} />,
}

function formatTaille(octets) {
  if (!octets) return '—'
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

export default function Documents() {
  const { isSuperAdmin } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [openAdd, setOpenAdd] = useState(false)
  const [form, setForm] = useState({ nom: '', description: '', categorie: '' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const [openDelete, setOpenDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (typeFilter) params.type_fichier = typeFilter
    api.get('/documents/', { params })
      .then(({ data }) => setList(data.results || data || []))
      .catch(() => setError('Erreur lors du chargement des documents.'))
      .finally(() => setLoading(false))
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!form.nom) setForm((prev) => ({ ...prev, nom: f.name.replace(/\.[^.]+$/, '') }))
  }

  const handleAdd = async () => {
    if (!form.nom.trim() || !file) {
      setAddError('Nom et fichier requis.')
      return
    }
    setSaving(true)
    setAddError('')
    try {
      const fd = new FormData()
      fd.append('nom', form.nom)
      fd.append('description', form.description || '')
      fd.append('categorie', form.categorie || '')
      fd.append('fichier', file)
      await api.post('/documents/', fd)
      setOpenAdd(false)
      setForm({ nom: '', description: '', categorie: '' })
      setFile(null)
      load()
    } catch (err) {
      setAddError(err.response?.data?.detail || "Erreur lors de l'ajout du document.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setDeleting(true)
    try {
      await api.delete(`/documents/${openDelete.id}/`)
      setOpenDelete(null)
      load()
    } catch {
      setError('Erreur lors de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }}>Documents</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>
            PDF, images, fichiers Excel et autres documents partagés de la plateforme.
          </Typography>
        </Box>
        {isSuperAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAdd(true)} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Ajouter un document
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
        <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 180 }}>
          {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
      </Box>

      <Paper sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : list.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Aucun document.</Typography></Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}10` }}>
                  <TableCell>Document</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>Taille</TableCell>
                  <TableCell>Ajouté par</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {TYPE_ICON[d.type_fichier] || TYPE_ICON.autre}
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{d.nom}</Typography>
                          {d.description && <Typography variant="caption" color="text.secondary">{d.description}</Typography>}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{d.categorie ? <Chip size="small" label={d.categorie} sx={{ bgcolor: `${COLORS.or}25` }} /> : '—'}</TableCell>
                    <TableCell>{formatTaille(d.taille_octets)}</TableCell>
                    <TableCell>{d.ajoute_par_nom || '—'}</TableCell>
                    <TableCell>{new Date(d.date_ajout).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Télécharger">
                        <IconButton size="small" component="a" href={getMediaUrl(d.fichier)} target="_blank" rel="noopener noreferrer" sx={{ color: COLORS.vert }}>
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isSuperAdmin && (
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => setOpenDelete(d)} sx={{ color: 'error.main' }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
        <DialogTitle>Ajouter un document</DialogTitle>
        <DialogContent>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
          <Button component="label" variant="outlined" startIcon={<UploadFile />} sx={{ mt: 1, mb: 2 }}>
            {file ? file.name : 'Choisir un fichier'}
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          <TextField
            fullWidth margin="dense" label="Nom du document"
            value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="Catégorie (facultatif)"
            value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="Description (facultatif)" multiline minRows={2}
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer le document ?</DialogTitle>
        <DialogContent>
          {openDelete && <Typography>Êtes-vous sûr de vouloir supprimer « {openDelete.nom} » ?</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)} disabled={deleting}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
