import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
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
  InputAdornment,
  Pagination,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { Add, Edit, Delete, Visibility, VisibilityOff, Search, FilterList, RestartAlt } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { colors } from '../../styles/theme'

const PAGE_SIZE = 20
const ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'membre', label: 'Membre' },
  { value: 'jewrine_conservatoire', label: 'Jewrine Conservatoire' },
  { value: 'jewrine_finance', label: 'Jewrine Finance' },
  { value: 'jewrine_culturelle', label: 'Jewrine Culturelle' },
  { value: 'jewrine_sociale', label: 'Jewrine Sociale' },
  { value: 'jewrine_communication', label: 'Jewrine Communication' },
  { value: 'jewrine_organisation', label: 'Jewrine Organisation' },
]
const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const initialForm = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: 'membre',
  telephone: '',
  adresse: '',
  sexe: '',
  profession: '',
  categorie: 'professionnel',
  numero_carte: '',
  numero_cni: '',
  montant_cotisation: '',
  est_actif: true,
  regroupement: '',
  section: '',
  dahira: '',
  groupe_sanguin: '',
}

const initialFilters = {
  search: '',
  sexe: '',
  categorie: '',
  profession: '',
  regroupement: '',
  groupe_sanguin: '',
  section: '',
  dahira: '',
}

export default function GestionMembres() {
  const [list, setList] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)
  const [totalMembres, setTotalMembres] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [filters, setFilters] = useState(initialFilters)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showUsername, setShowUsername] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [sousSections, setSousSections] = useState([])
  const [dahiras, setDahiras] = useState([])

  const buildParams = (targetPage) => {
    const params = { page: targetPage, page_size: PAGE_SIZE }
    if (filters.search) params.search = filters.search
    if (filters.sexe) params.sexe = filters.sexe
    if (filters.categorie) params.categorie = filters.categorie
    if (filters.profession) params.profession__icontains = filters.profession
    if (filters.regroupement) params.regroupement = filters.regroupement
    if (filters.groupe_sanguin) params.groupe_sanguin = filters.groupe_sanguin
    if (filters.section) params.section = filters.section
    if (filters.dahira) params.dahira = filters.dahira
    return params
  }

  const runSearch = async (targetPage = 1) => {
    setLoading(true)
    setHasSearched(true)
    try {
      const { data } = await api.get('/auth/users/', { params: buildParams(targetPage) })
      setList(data.results || data || [])
      setCount(data.count ?? (Array.isArray(data) ? data.length : 0))
      setPage(targetPage)
    } catch (err) {
      console.error('Erreur lors du chargement:', err)
      setList([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setFilters(initialFilters)
    setHasSearched(false)
    setList([])
    setCount(0)
    setPage(1)
  }

  // Récupère uniquement le total de membres (page_size=1) pour l'affichage initial,
  // sans jamais charger la liste complète des 899 membres.
  const loadTotalMembres = async () => {
    try {
      const { data } = await api.get('/auth/users/', { params: { page_size: 1 } })
      setTotalMembres(data.count ?? null)
    } catch {
      setTotalMembres(null)
    }
  }

  const loadOrganisation = async () => {
    try {
      const [r, s, ss, d] = await Promise.all([
        api.get('organisation/regroupements/').then((res) => res.data.results ?? res.data ?? []),
        api.get('organisation/sections/').then((res) => res.data.results ?? res.data ?? []),
        api.get('organisation/sous-sections/').then((res) => res.data.results ?? res.data ?? []),
        api.get('organisation/dahiras/').then((res) => res.data.results ?? res.data ?? []),
      ])
      setRegroupements(Array.isArray(r) ? r : [])
      setSections(Array.isArray(s) ? s : [])
      setSousSections(Array.isArray(ss) ? ss : [])
      setDahiras(Array.isArray(d) ? d : [])
    } catch (e) {
      console.error('Erreur chargement organisation:', e)
    }
  }

  useEffect(() => { loadTotalMembres() }, [])
  useEffect(() => { loadOrganisation() }, [])

  const refreshCurrentPage = async () => {
    if (hasSearched) await runSearch(page)
    await loadTotalMembres()
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm(initialForm)
    setOpenForm(true)
  }

  const handleOpenEdit = (u) => {
    setEditingId(u.id)
    const normaliseCategorie = (cat) => {
      if (!cat) return 'professionnel'
      const raw = cat.toString().trim().toLowerCase()
      if (raw === 'eleve') return 'eleve'
      if (raw === 'etudiant') return 'etudiant'
      if (raw === 'professionnel' || raw === 'professionel') return 'professionnel'
      return 'professionnel'
    }

    setForm({
      username: u.username,
      email: u.email || '',
      password: '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      role: u.role || 'membre',
      telephone: u.telephone || '',
      adresse: u.adresse || '',
      sexe: u.sexe || '',
      profession: u.profession || '',
      categorie: normaliseCategorie(u.categorie),
      numero_carte: u.numero_carte || '',
      numero_cni: u.numero_cni || '',
      montant_cotisation: u.montant_cotisation ?? '',
      est_actif: u.est_actif ?? true,
      regroupement: (typeof u.regroupement === 'object' ? u.regroupement?.id : u.regroupement) ?? '',
      section: (typeof u.section === 'object' ? u.section?.id : u.section) ?? '',
      dahira: (typeof u.dahira === 'object' ? u.dahira?.id : u.dahira) ?? '',
      groupe_sanguin: u.groupe_sanguin || '',
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleCloseForm = () => {
    setOpenForm(false)
    setEditingId(null)
    setForm(initialForm)
    setFieldErrors({})
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.username) errors.username = 'Identifiant requis.'
    if (!editingId && !form.password) errors.password = 'Mot de passe requis pour un nouveau membre.'
    if (form.password && form.password.length < 8) errors.password = 'Le mot de passe doit faire au moins 8 caractères.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      let categorieValide = form.categorie && form.categorie.trim()
        ? form.categorie.trim().toLowerCase()
        : 'professionnel'
      if (!['eleve', 'etudiant', 'professionnel'].includes(categorieValide)) {
        categorieValide = 'professionnel'
      }

      const toId = (v) => (v === '' || v === undefined || v === null ? null : Number(v) || v)
      const payload = {
        ...form,
        categorie: categorieValide,
        regroupement: toId(form.regroupement),
        section: toId(form.section),
        dahira: toId(form.dahira),
      }
      if (editingId) {
        if (!payload.password) delete payload.password
        const response = await api.patch(`/auth/users/${editingId}/`, payload)
        if (response.data) {
          setList((prevList) => prevList.map((u) => (u.id === editingId ? { ...u, ...response.data } : u)))
        }
        setMessage({ type: 'success', text: 'Membre modifié.' })
      } else {
        await api.post('/auth/register/', payload)
        setMessage({ type: 'success', text: 'Membre créé.' })
      }
      await refreshCurrentPage()
      handleCloseForm()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            apiFieldErrors[key] = String(value[0])
          } else if (typeof value === 'string') {
            apiFieldErrors[key] = value
          }
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
      await api.delete(`/auth/users/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Membre supprimé.' })
      setOpenDelete(null)
      await refreshCurrentPage()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la suppression.' })
    } finally {
      setSaving(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ color: colors.vert, fontWeight: 600 }} gutterBottom>Gestion des membres</Typography>
            <Typography variant="body2" sx={{ color: colors.vertFonce }}>
              {totalMembres !== null ? `${totalMembres} membres enregistrés — ` : ''}
              utilisez les filtres pour rechercher, puis « Rechercher »
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters((v) => !v)}
            >
              Filtres
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAdd}
              sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}
            >
              Ajouter un membre
            </Button>
          </Box>
        </Box>

        <Collapse in={showFilters}>
          <Card sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Rechercher (nom, username, téléphone, carte, CNI)"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  size="small"
                  fullWidth
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(1) }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField select label="Sexe" value={filters.sexe} onChange={(e) => setFilters((f) => ({ ...f, sexe: e.target.value }))} size="small" fullWidth>
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="M">Masculin</MenuItem>
                  <MenuItem value="F">Féminin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField select label="Catégorie" value={filters.categorie} onChange={(e) => setFilters((f) => ({ ...f, categorie: e.target.value }))} size="small" fullWidth>
                  <MenuItem value="">Toutes</MenuItem>
                  <MenuItem value="eleve">Élève</MenuItem>
                  <MenuItem value="etudiant">Étudiant</MenuItem>
                  <MenuItem value="professionnel">Professionnel</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  label="Profession"
                  value={filters.profession}
                  onChange={(e) => setFilters((f) => ({ ...f, profession: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField select label="Groupe sanguin" value={filters.groupe_sanguin} onChange={(e) => setFilters((f) => ({ ...f, groupe_sanguin: e.target.value }))} size="small" fullWidth>
                  <MenuItem value="">Tous</MenuItem>
                  {GROUPES_SANGUINS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  select
                  label="Regroupement"
                  value={filters.regroupement}
                  onChange={(e) => setFilters((f) => ({ ...f, regroupement: e.target.value, section: '', dahira: '' }))}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">Tous</MenuItem>
                  {regroupements.map((r) => <MenuItem key={r.id} value={r.id}>{r.nom || `Regroupement ${r.id}`}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  select
                  label="Section"
                  value={filters.section}
                  onChange={(e) => setFilters((f) => ({ ...f, section: e.target.value, dahira: '' }))}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {sections
                    .filter((s) => !filters.regroupement || String(s.regroupement) === String(filters.regroupement))
                    .map((s) => <MenuItem key={s.id} value={s.id}>{s.nom || `Section ${s.id}`}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  select
                  label="Dahira"
                  value={filters.dahira}
                  onChange={(e) => setFilters((f) => ({ ...f, dahira: e.target.value }))}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {dahiras
                    .filter((d) => {
                      if (!filters.section) return true
                      const ssIds = sousSections.filter((ss) => String(ss.section) === String(filters.section)).map((ss) => String(ss.id))
                      return ssIds.includes(String(d.sous_section))
                    })
                    .map((d) => <MenuItem key={d.id} value={d.id}>{d.nom || `Dahira ${d.id}`}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button startIcon={<RestartAlt />} onClick={resetFilters}>Réinitialiser</Button>
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={() => runSearch(1)}
                  sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}
                >
                  Rechercher
                </Button>
              </Grid>
            </Grid>
          </Card>
        </Collapse>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {!hasSearched ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2, color: colors.vertFonce }}>
            Utilisez les filtres ci-dessus pour rechercher des membres, ou affichez la première page.
          </Typography>
          <Button variant="contained" onClick={() => runSearch(1)} sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}>
            Afficher les membres
          </Button>
        </Card>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Typography variant="body2" sx={{ mb: 1.5, color: colors.vertFonce }}>
            {count} résultat{count > 1 ? 's' : ''} — page {page}/{pageCount}
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${colors.vert}` }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${colors.vert}12` }}>
                  <TableCell>Membre</TableCell>
                  <TableCell>Sexe</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Profession</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Dahira</TableCell>
                  <TableCell>Carte membre</TableCell>
                  <TableCell>CNI</TableCell>
                  <TableCell>Cotisation</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={12} align="center">Aucun membre ne correspond à ces critères.</TableCell></TableRow>
                ) : (
                  list.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            src={getMediaUrl(u.photo, u.photo_updated_at ? `v=${u.photo_updated_at}` : '')}
                            sx={{ width: 32, height: 32, bgcolor: colors.or, color: colors.blanc }}
                          >
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                              {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>@{u.username}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{u.sexe === 'M' ? 'Masculin' : u.sexe === 'F' ? 'Féminin' : '—'}</TableCell>
                      <TableCell><Chip label={u.role_display || u.role} size="small" sx={{ bgcolor: `${colors.or}30` }} /></TableCell>
                      <TableCell>{u.telephone || '—'}</TableCell>
                      <TableCell>{u.profession || '—'}</TableCell>
                      <TableCell>{u.section_nom || '—'}</TableCell>
                      <TableCell>{u.dahira_nom || '—'}</TableCell>
                      <TableCell>{u.numero_carte || '—'}</TableCell>
                      <TableCell>{u.numero_cni || '—'}</TableCell>
                      <TableCell>{u.montant_cotisation ? `${u.montant_cotisation} FCFA` : '—'}</TableCell>
                      <TableCell><Chip label={u.est_actif ? 'Actif' : 'Inactif'} color={u.est_actif ? 'success' : 'default'} size="small" /></TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenEdit(u)} sx={{ color: colors.vert }}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => setOpenDelete(u)} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={pageCount} page={page} onChange={(_, p) => runSearch(p)} color="primary" showFirstButton showLastButton />
            </Box>
          )}
        </>
      )}

      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier le membre' : 'Ajouter un membre'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Identifiant (username)"
              type={showUsername ? 'text' : 'password'}
              value={form.username}
              onChange={(e) => {
                setForm((f) => ({ ...f, username: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, username: undefined }))
              }}
              required
              disabled={!!editingId}
              fullWidth
              error={!!fieldErrors.username}
              helperText={fieldErrors.username || ''}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showUsername ? "Masquer l'identifiant" : "Afficher l'identifiant"}
                      onClick={() => setShowUsername((v) => !v)}
                      edge="end"
                    >
                      {showUsername ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Email (optionnel)"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, email: undefined }))
              }}
              fullWidth
              error={!!fieldErrors.email}
              helperText={fieldErrors.email || ''}
            />
            <TextField
              label={editingId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, password: undefined }))
              }}
              required={!editingId}
              fullWidth
              error={!!fieldErrors.password}
              helperText={fieldErrors.password || (!editingId ? 'Minimum 8 caractères' : '')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField label="Prénom" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} fullWidth />
            <TextField label="Nom" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} fullWidth />
            <TextField
              select
              label="Sexe"
              value={form.sexe}
              onChange={(e) => setForm((f) => ({ ...f, sexe: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Non renseigné</MenuItem>
              <MenuItem value="M">Masculin</MenuItem>
              <MenuItem value="F">Féminin</MenuItem>
            </TextField>
            <TextField select label="Rôle" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} fullWidth>
              {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <TextField label="Téléphone" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} fullWidth />
            <TextField
              select
              label="Catégorie"
              value={form.categorie || 'professionnel'}
              onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value || 'professionnel' }))}
              fullWidth
              required
            >
              <MenuItem value="eleve">Élève</MenuItem>
              <MenuItem value="etudiant">Étudiant</MenuItem>
              <MenuItem value="professionnel">Professionnel</MenuItem>
            </TextField>
            <TextField label="Profession" value={form.profession} onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))} fullWidth />
            <TextField label="Numéro de carte membre" value={form.numero_carte} onChange={(e) => setForm((f) => ({ ...f, numero_carte: e.target.value }))} fullWidth />
            <TextField label="Numéro de carte d'identité (CNI)" value={form.numero_cni} onChange={(e) => setForm((f) => ({ ...f, numero_cni: e.target.value }))} fullWidth />
            <TextField
              label="Cotisation mensuelle assignée (FCFA)"
              type="number"
              value={form.montant_cotisation}
              onChange={(e) => setForm((f) => ({ ...f, montant_cotisation: e.target.value }))}
              fullWidth
            />
            <TextField label="Adresse" value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} multiline rows={2} fullWidth />
            <TextField
              select
              label="Statut du compte"
              value={form.est_actif ? 'actif' : 'inactif'}
              onChange={(e) => setForm((f) => ({ ...f, est_actif: e.target.value === 'actif' }))}
              fullWidth
            >
              <MenuItem value="actif">Actif</MenuItem>
              <MenuItem value="inactif">Inactif</MenuItem>
            </TextField>
            <TextField
              select
              label="Groupe sanguin"
              value={form.groupe_sanguin}
              onChange={(e) => setForm((f) => ({ ...f, groupe_sanguin: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Non renseigné</MenuItem>
              {GROUPES_SANGUINS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Regroupement"
              value={form.regroupement || ''}
              onChange={(e) => setForm((f) => ({ ...f, regroupement: e.target.value || '', section: '', dahira: '' }))}
              fullWidth
            >
              <MenuItem value="">Aucun</MenuItem>
              {regroupements.map((r) => <MenuItem key={r.id} value={r.id}>{r.nom || `Regroupement ${r.id}`}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Section"
              value={form.section || ''}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value || '', dahira: '' }))}
              fullWidth
            >
              <MenuItem value="">Aucune</MenuItem>
              {sections
                .filter((s) => !form.regroupement || String(s.regroupement) === String(form.regroupement))
                .map((s) => <MenuItem key={s.id} value={s.id}>{s.nom || `Section ${s.id}`}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Dahira"
              value={form.dahira || ''}
              onChange={(e) => setForm((f) => ({ ...f, dahira: e.target.value || '' }))}
              fullWidth
            >
              <MenuItem value="">Aucun</MenuItem>
              {dahiras
                .filter((d) => {
                  if (!form.section) return true
                  const ssIds = sousSections.filter((ss) => String(ss.section) === String(form.section)).map((ss) => String(ss.id))
                  return ssIds.includes(String(d.sous_section))
                })
                .map((d) => <MenuItem key={d.id} value={d.id}>{d.nom || `Dahira ${d.id}`}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}>
            {saving ? <CircularProgress size={24} /> : (editingId ? 'Enregistrer' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer ce membre ?</DialogTitle>
        <DialogContent>
          {openDelete && (
            <Typography>Êtes-vous sûr de vouloir supprimer {openDelete.first_name} {openDelete.last_name} ({openDelete.username}) ?</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
