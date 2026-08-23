import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  MenuItem,
  Button,
  Autocomplete,
  Avatar,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material'
import { AdminPanelSettings, Search, PersonAdd, RestartAlt, Info } from '@mui/icons-material'
import api from '../../services/api'
import { colors } from '../../styles/theme'

// Matrice de la phase pilote (audit dahira) — description humaine pour la formation
// des admins de la plateforme. Le backend (apps.accounts.permissions) reste la seule
// source de vérité pour l'application réelle des droits.
const MATRICE = [
  { niveau: 'National', role: 'Administrateur / SG National', value: 'national_lecture', perimetre: 'Cellules pilotes (toutes)', membres: 'Lecture', finance: 'Lecture' },
  { niveau: 'National', role: 'Secrétariat National Administratif', value: 'secretariat_national', perimetre: 'Cellules pilotes (toutes)', membres: 'Lecture', finance: '—' },
  { niveau: 'National', role: 'Secrétariat aux Finances National', value: 'finance_national', perimetre: 'Cellules pilotes (toutes)', membres: '—', finance: 'Lecture' },
  { niveau: 'Section', role: 'Président / SG de Section', value: 'section_lecture', perimetre: 'Cellules pilotes de sa section', membres: 'Lecture', finance: 'Lecture' },
  { niveau: 'Cellule', role: 'Secrétaire Administratif de Cellule', value: 'cellule_admin', perimetre: 'Sa cellule uniquement', membres: 'Écriture', finance: '—' },
  { niveau: 'Cellule', role: 'Secrétaire aux Finances de Cellule', value: 'cellule_finance', perimetre: 'Sa cellule uniquement', membres: 'Lecture', finance: 'Écriture' },
  { niveau: 'Cellule', role: 'Président de Cellule', value: 'cellule_president', perimetre: 'Sa cellule uniquement', membres: 'Lecture', finance: 'Lecture' },
  { niveau: '—', role: 'Membre', value: 'membre', perimetre: 'Son propre profil', membres: '—', finance: '—' },
  { niveau: 'Total', role: 'Super Admin (Programmeur / Auditeur / SAN)', value: 'admin', perimetre: 'Tout le Sénégal', membres: 'Écriture', finance: 'Écriture' },
]

const GESTION_ROLES = MATRICE.filter((r) => r.value !== 'membre').map((r) => r.value)
const SCOPED_SECTION_ROLES = ['section_lecture']
const SCOPED_CELLULE_ROLES = ['cellule_admin', 'cellule_finance', 'cellule_president']

function droitChip(label) {
  if (label === '—') return <Chip label="Aucun" size="small" variant="outlined" />
  if (label === 'Écriture') return <Chip label="Écriture" size="small" color="success" />
  return <Chip label="Lecture" size="small" color="info" />
}

export default function GestionRoles() {
  const [comptes, setComptes] = useState([])
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState([])
  const [dahiras, setDahiras] = useState([])
  const [sousSections, setSousSections] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [savingId, setSavingId] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOptions, setSearchOptions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [assignRole, setAssignRole] = useState('cellule_admin')
  const [assignSection, setAssignSection] = useState('')
  const [assignDahira, setAssignDahira] = useState('')
  const [assigning, setAssigning] = useState(false)

  const loadComptes = useCallback(() => {
    setLoading(true)
    api.get('/auth/users/', { params: { role__in: GESTION_ROLES.join(','), page_size: 200 } })
      .then(({ data }) => setComptes(data.results || data || []))
      .catch(() => setComptes([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadComptes() }, [loadComptes])

  useEffect(() => {
    Promise.all([
      api.get('organisation/sections/').then(({ data }) => data.results || data || []),
      api.get('organisation/dahiras/').then(({ data }) => data.results || data || []),
      api.get('organisation/sous-sections/').then(({ data }) => data.results || data || []),
    ]).then(([s, d, ss]) => {
      setSections(Array.isArray(s) ? s : [])
      setDahiras(Array.isArray(d) ? d : [])
      setSousSections(Array.isArray(ss) ? ss : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) { setSearchOptions([]); return }
    setSearchLoading(true)
    const t = setTimeout(() => {
      api.get('/auth/users/', { params: { search: searchQuery.trim(), role: 'membre', minimal: 1, page_size: 10 } })
        .then(({ data }) => setSearchOptions(data.results || data || []))
        .catch(() => setSearchOptions([]))
        .finally(() => setSearchLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const dahirasDeSection = (sectionId) => {
    if (!sectionId) return []
    const ssIds = sousSections.filter((ss) => String(ss.section) === String(sectionId)).map((ss) => String(ss.id))
    return dahiras.filter((d) => ssIds.includes(String(d.sous_section)))
  }

  const handleUpdateCompte = async (compte, patch) => {
    setSavingId(compte.id)
    setMessage({ type: '', text: '' })
    try {
      await api.patch(`/auth/users/${compte.id}/`, patch)
      setMessage({ type: 'success', text: `Rôle mis à jour pour ${compte.first_name || compte.username}.` })
      loadComptes()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la mise à jour du rôle.' })
    } finally {
      setSavingId(null)
    }
  }

  const handleRetrograder = (compte) => {
    if (!window.confirm(`Retirer les droits de gestion de ${compte.first_name || compte.username} (retour au rôle Membre) ?`)) return
    handleUpdateCompte(compte, { role: 'membre', section: null, dahira: null, sous_section: null, regroupement: null })
  }

  const handleAssign = async () => {
    if (!selectedMember) {
      setMessage({ type: 'error', text: 'Choisissez un membre.' })
      return
    }
    const patch = { role: assignRole }
    if (SCOPED_SECTION_ROLES.includes(assignRole)) {
      if (!assignSection) { setMessage({ type: 'error', text: 'Section requise pour ce rôle.' }); return }
      patch.section = Number(assignSection)
    } else if (SCOPED_CELLULE_ROLES.includes(assignRole)) {
      if (!assignDahira) { setMessage({ type: 'error', text: 'Cellule (dahira) requise pour ce rôle.' }); return }
      patch.dahira = Number(assignDahira)
      const dahira = dahiras.find((d) => d.id === Number(assignDahira))
      const ss = dahira ? sousSections.find((s) => s.id === dahira.sous_section) : null
      if (ss) patch.section = ss.section
    }
    setAssigning(true)
    setMessage({ type: '', text: '' })
    try {
      await api.patch(`/auth/users/${selectedMember.id}/`, patch)
      setMessage({ type: 'success', text: `Rôle attribué à ${selectedMember.first_name || selectedMember.username}.` })
      setSelectedMember(null)
      setSearchQuery('')
      setAssignSection('')
      setAssignDahira('')
      loadComptes()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || "Erreur lors de l'attribution du rôle." })
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      <Typography variant="h4" sx={{ color: colors.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AdminPanelSettings /> Rôles & Permissions
      </Typography>
      <Typography variant="body2" sx={{ color: colors.vertFonce, mb: 3 }}>
        Matrice d'accès de la phase pilote — qui voit quoi, et qui peut modifier quoi.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Card sx={{ mb: 3, borderLeft: `4px solid ${colors.vert}`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: colors.vertFonce, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info fontSize="small" /> Matrice des droits d'accès
          </Typography>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${colors.vert}12` }}>
                  <TableCell>Niveau</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Périmètre</TableCell>
                  <TableCell>Membres</TableCell>
                  <TableCell>Finance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MATRICE.map((r) => (
                  <TableRow key={r.value} hover>
                    <TableCell>{r.niveau}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.role}</TableCell>
                    <TableCell>{r.perimetre}</TableCell>
                    <TableCell>{droitChip(r.membres)}</TableCell>
                    <TableCell>{droitChip(r.finance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, borderLeft: `4px solid ${colors.vert}`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: colors.vertFonce, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd fontSize="small" /> Attribuer un rôle de gestion à un membre
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Autocomplete
              sx={{ minWidth: 280, flex: 1 }}
              options={searchOptions}
              loading={searchLoading}
              value={selectedMember}
              filterOptions={(x) => x}
              getOptionLabel={(m) => (m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username : '')}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onInputChange={(_, value) => setSearchQuery(value)}
              onChange={(_, value) => setSelectedMember(value)}
              noOptionsText={searchQuery.trim().length < 2 ? 'Tapez au moins 2 caractères…' : 'Aucun membre trouvé'}
              renderOption={(props, m) => (
                <Box component="li" {...props} key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: colors.or, fontSize: 13 }}>{m.first_name?.[0]}{m.last_name?.[0]}</Avatar>
                  <Box>
                    <Typography variant="body2">{`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}</Typography>
                    <Typography variant="caption" color="text.secondary">@{m.username}</Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Rechercher un membre (simple, pas encore un rôle de gestion)"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Search fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />,
                    endAdornment: (<>{searchLoading ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>),
                  }}
                />
              )}
            />
            <TextField select size="small" label="Rôle" value={assignRole} onChange={(e) => setAssignRole(e.target.value)} sx={{ minWidth: 240 }}>
              {MATRICE.filter((r) => r.value !== 'membre').map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.role}</MenuItem>
              ))}
            </TextField>
            {SCOPED_SECTION_ROLES.includes(assignRole) && (
              <TextField select size="small" label="Section" value={assignSection} onChange={(e) => setAssignSection(e.target.value)} sx={{ minWidth: 200 }}>
                <MenuItem value="">Choisir…</MenuItem>
                {sections.map((s) => <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>)}
              </TextField>
            )}
            {SCOPED_CELLULE_ROLES.includes(assignRole) && (
              <TextField select size="small" label="Section" value={assignSection} onChange={(e) => { setAssignSection(e.target.value); setAssignDahira('') }} sx={{ minWidth: 200 }}>
                <MenuItem value="">Choisir…</MenuItem>
                {sections.map((s) => <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>)}
              </TextField>
            )}
            {SCOPED_CELLULE_ROLES.includes(assignRole) && (
              <TextField select size="small" label="Cellule (dahira)" value={assignDahira} onChange={(e) => setAssignDahira(e.target.value)} sx={{ minWidth: 220 }} disabled={!assignSection}>
                <MenuItem value="">Choisir…</MenuItem>
                {dahirasDeSection(assignSection).map((d) => <MenuItem key={d.id} value={d.id}>{d.nom}{d.est_pilote ? ' (pilote)' : ''}</MenuItem>)}
              </TextField>
            )}
            <Button
              variant="contained"
              disabled={assigning || !selectedMember}
              onClick={handleAssign}
              sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}
            >
              {assigning ? <CircularProgress size={20} /> : 'Attribuer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderLeft: `4px solid ${colors.vert}`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: colors.vertFonce, mb: 2 }}>
            Comptes avec un rôle de gestion ({comptes.length})
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: `${colors.vert}12` }}>
                    <TableCell>Compte</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Section / Dahira</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comptes.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">Aucun compte de gestion pour l'instant.</TableCell></TableRow>
                  ) : (
                    comptes.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: colors.or, fontSize: 13 }}>{c.first_name?.[0]}{c.last_name?.[0]}</Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username}</Typography>
                              <Typography variant="caption" color="text.secondary">@{c.username}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={c.role}
                            disabled={savingId === c.id}
                            onChange={(e) => handleUpdateCompte(c, { role: e.target.value })}
                            sx={{ minWidth: 220 }}
                          >
                            {MATRICE.filter((r) => r.value !== 'membre').map((r) => (
                              <MenuItem key={r.value} value={r.value}>{r.role}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{c.section_nom || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.dahira_nom || ''}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Retirer les droits de gestion (retour à Membre)">
                            <span>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<RestartAlt />}
                                disabled={savingId === c.id}
                                onClick={() => handleRetrograder(c)}
                              >
                                Rétrograder
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
