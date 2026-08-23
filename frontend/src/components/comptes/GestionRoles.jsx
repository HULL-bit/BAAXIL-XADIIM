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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material'
import { AdminPanelSettings, Search, PersonAdd, RestartAlt, Info, Tune } from '@mui/icons-material'
import api from '../../services/api'
import { colors } from '../../styles/theme'

// Matrice de la phase pilote (audit dahira) — préréglages "par rôle" : les choisir
// pré-remplit les droits individuels (hérités par tout le monde ayant ce rôle), qui
// restent ensuite ajustables pour UNE personne précise (bouton "Personnaliser").
const MATRICE = [
  { niveau: 'National', role: 'Administrateur / SG National', value: 'national_lecture', perimetre: 'Cellules pilotes (toutes)', membres: 'L', finance: 'L' },
  { niveau: 'National', role: 'Secrétariat National Administratif', value: 'secretariat_national', perimetre: 'Cellules pilotes (toutes)', membres: 'L', finance: '' },
  { niveau: 'National', role: 'Secrétariat aux Finances National', value: 'finance_national', perimetre: 'Cellules pilotes (toutes)', membres: '', finance: 'L' },
  { niveau: 'Section', role: 'Président / SG de Section', value: 'section_lecture', perimetre: 'Cellules pilotes de sa section', membres: 'L', finance: 'L' },
  { niveau: 'Cellule', role: 'Secrétaire Administratif de Cellule', value: 'cellule_admin', perimetre: 'Sa cellule uniquement', membres: 'LAMS', finance: '' },
  { niveau: 'Cellule', role: 'Secrétaire aux Finances de Cellule', value: 'cellule_finance', perimetre: 'Sa cellule uniquement', membres: 'L', finance: 'LAMSV' },
  { niveau: 'Cellule', role: 'Président de Cellule', value: 'cellule_president', perimetre: 'Sa cellule uniquement', membres: 'L', finance: 'L' },
  { niveau: '—', role: 'Membre', value: 'membre', perimetre: 'Son propre profil', membres: '', finance: '' },
  { niveau: 'Total', role: 'Super Admin (Programmeur / Auditeur / SAN)', value: 'admin', perimetre: 'Tout le Sénégal', membres: 'LAMS', finance: 'LAMSV' },
]

const GESTION_ROLES = MATRICE.filter((r) => r.value !== 'membre').map((r) => r.value)
const SCOPED_SECTION_ROLES = ['section_lecture']
const SCOPED_CELLULE_ROLES = ['cellule_admin', 'cellule_finance', 'cellule_president']

// Champs individuels éditables via "Personnaliser" — groupés par domaine, chacun
// avec son action (Lecture / Ajout / Modification / Suppression / Validation).
const CHAMPS_MEMBRES = [
  { field: 'membres_lecture', label: 'Lecture' },
  { field: 'membres_ajout', label: 'Ajout' },
  { field: 'membres_modification', label: 'Modification' },
  { field: 'membres_suppression', label: 'Suppression' },
]
const CHAMPS_FINANCE = [
  { field: 'finance_lecture', label: 'Lecture' },
  { field: 'finance_ajout', label: 'Ajout' },
  { field: 'finance_modification', label: 'Modification' },
  { field: 'finance_suppression', label: 'Suppression' },
  { field: 'finance_validation', label: 'Validation' },
]
const ACTION_LETTER = { L: 'Lecture', A: 'Ajout', M: 'Modification', S: 'Suppression', V: 'Validation' };

function ActionDots({ code }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {['L', 'A', 'M', 'S', 'V'].map((letter) => (
        code.includes(letter) ? (
          <Tooltip key={letter} title={ACTION_LETTER[letter]}>
            <Chip label={letter} size="small" color={letter === 'V' ? 'warning' : 'success'} sx={{ width: 26, height: 22, fontSize: 11, fontWeight: 700 }} />
          </Tooltip>
        ) : (
          <Chip key={letter} label={letter} size="small" variant="outlined" sx={{ width: 26, height: 22, fontSize: 11, color: 'text.disabled', borderColor: 'divider' }} />
        )
      ))}
    </Box>
  )
}

const emptyPerms = {
  niveau_acces: '', regroupement: '',
  membres_lecture: false, membres_ajout: false, membres_modification: false, membres_suppression: false,
  finance_lecture: false, finance_ajout: false, finance_modification: false, finance_suppression: false, finance_validation: false,
  synthese_nationale: false, logs_lecture: false,
}

export default function GestionRoles() {
  const [comptes, setComptes] = useState([])
  const [loading, setLoading] = useState(true)
  const [regroupements, setRegroupements] = useState([])
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

  const [customizeTarget, setCustomizeTarget] = useState(null)
  const [customizeForm, setCustomizeForm] = useState(emptyPerms)
  const [customizeSaving, setCustomizeSaving] = useState(false)

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
      api.get('organisation/regroupements/').then(({ data }) => data.results || data || []),
      api.get('organisation/sections/').then(({ data }) => data.results || data || []),
      api.get('organisation/dahiras/').then(({ data }) => data.results || data || []),
      api.get('organisation/sous-sections/').then(({ data }) => data.results || data || []),
    ]).then(([r, s, d, ss]) => {
      setRegroupements(Array.isArray(r) ? r : [])
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
      setMessage({ type: 'success', text: `Droits mis à jour pour ${compte.first_name || compte.username}.` })
      loadComptes()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la mise à jour.' })
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
      setMessage({ type: 'success', text: `Rôle attribué à ${selectedMember.first_name || selectedMember.username} — vous pouvez maintenant ajuster ses droits individuels avec "Personnaliser" si besoin.` })
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

  const openCustomize = (compte) => {
    setCustomizeTarget(compte)
    setCustomizeForm({
      niveau_acces: compte.niveau_acces || '',
      regroupement: (typeof compte.regroupement === 'object' ? compte.regroupement?.id : compte.regroupement) || '',
      membres_lecture: !!compte.membres_lecture,
      membres_ajout: !!compte.membres_ajout,
      membres_modification: !!compte.membres_modification,
      membres_suppression: !!compte.membres_suppression,
      finance_lecture: !!compte.finance_lecture,
      finance_ajout: !!compte.finance_ajout,
      finance_modification: !!compte.finance_modification,
      finance_suppression: !!compte.finance_suppression,
      finance_validation: !!compte.finance_validation,
      synthese_nationale: !!compte.synthese_nationale,
      logs_lecture: !!compte.logs_lecture,
    })
  }

  const closeCustomize = () => {
    setCustomizeTarget(null)
    setCustomizeForm(emptyPerms)
  }

  const handleSaveCustomize = async () => {
    if (!customizeTarget) return
    setCustomizeSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.patch(`/auth/users/${customizeTarget.id}/`, { ...customizeForm, regroupement: customizeForm.regroupement || null })
      setMessage({ type: 'success', text: `Droits personnalisés enregistrés pour ${customizeTarget.first_name || customizeTarget.username}.` })
      closeCustomize()
      loadComptes()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || "Erreur lors de l'enregistrement des droits personnalisés." })
    } finally {
      setCustomizeSaving(false)
    }
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      <Typography variant="h4" sx={{ color: colors.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AdminPanelSettings /> Rôles & Permissions
      </Typography>
      <Typography variant="body2" sx={{ color: colors.vertFonce, mb: 3 }}>
        Deux façons de donner un droit : choisir un <strong>rôle</strong> (hérité par tout le monde ayant ce rôle),
        ou <strong>personnaliser</strong> les droits d'une seule personne, sans toucher aux autres.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Card sx={{ mb: 3, borderLeft: `4px solid ${colors.vert}`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: colors.vertFonce, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info fontSize="small" /> Matrice des droits (préréglages par rôle)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            L = Lecture · A = Ajout · M = Modification · S = Suppression · V = Validation
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
                    <TableCell><ActionDots code={r.membres} /></TableCell>
                    <TableCell><ActionDots code={r.finance} /></TableCell>
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
            {(SCOPED_SECTION_ROLES.includes(assignRole) || SCOPED_CELLULE_ROLES.includes(assignRole)) && (
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
                    <TableCell>Rôle (préréglage)</TableCell>
                    <TableCell>Section / Dahira</TableCell>
                    <TableCell>Droits actuels</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comptes.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center">Aucun compte de gestion pour l'instant.</TableCell></TableRow>
                  ) : (
                    comptes.map((c) => {
                      const membresCode = ['membres_lecture', 'membres_ajout', 'membres_modification', 'membres_suppression']
                        .map((f, i) => (c[f] ? 'LAMS'[i] : '')).join('')
                      const financeCode = ['finance_lecture', 'finance_ajout', 'finance_modification', 'finance_suppression', 'finance_validation']
                        .map((f, i) => (c[f] ? 'LAMSV'[i] : '')).join('')
                      return (
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
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" sx={{ width: 52 }}>Membres</Typography>
                                <ActionDots code={membresCode} />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" sx={{ width: 52 }}>Finance</Typography>
                                <ActionDots code={financeCode} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<Tune />}
                              onClick={() => openCustomize(c)}
                              disabled={savingId === c.id}
                              sx={{ mr: 1 }}
                            >
                              Personnaliser
                            </Button>
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
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!customizeTarget} onClose={closeCustomize} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: colors.vert, color: '#fff' }}>
          Personnaliser les droits — {customizeTarget ? (`${customizeTarget.first_name || ''} ${customizeTarget.last_name || ''}`.trim() || customizeTarget.username) : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ces droits s'appliquent uniquement à cette personne — ils n'affectent personne d'autre, même si elle
            partage le même rôle affiché.
          </Typography>
          <TextField
            select
            size="small"
            label="Périmètre (niveau)"
            value={customizeForm.niveau_acces}
            onChange={(e) => setCustomizeForm((f) => ({ ...f, niveau_acces: e.target.value, regroupement: e.target.value === 'regroupement' ? f.regroupement : '' }))}
            fullWidth
            sx={{ mb: customizeForm.niveau_acces === 'regroupement' ? 2 : 2 }}
          >
            <MenuItem value="">Aucun</MenuItem>
            <MenuItem value="national">National (cellules pilotes)</MenuItem>
            <MenuItem value="regroupement">Regroupement (son propre regroupement)</MenuItem>
            <MenuItem value="section">Section (sa propre section)</MenuItem>
            <MenuItem value="cellule">Cellule (sa propre cellule)</MenuItem>
          </TextField>

          {customizeForm.niveau_acces === 'regroupement' && (
            <TextField
              select
              size="small"
              label="Regroupement"
              value={customizeForm.regroupement}
              onChange={(e) => setCustomizeForm((f) => ({ ...f, regroupement: e.target.value }))}
              fullWidth
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Choisir…</MenuItem>
              {regroupements.map((r) => <MenuItem key={r.id} value={r.id}>{r.nom}</MenuItem>)}
            </TextField>
          )}

          <Typography variant="subtitle2" sx={{ color: colors.vertFonce, mb: 1 }}>Membres</Typography>
          <FormGroup row sx={{ mb: 2 }}>
            {CHAMPS_MEMBRES.map((c) => (
              <FormControlLabel
                key={c.field}
                control={<Checkbox size="small" checked={customizeForm[c.field]} onChange={(e) => setCustomizeForm((f) => ({ ...f, [c.field]: e.target.checked }))} />}
                label={c.label}
              />
            ))}
          </FormGroup>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ color: colors.vertFonce, mb: 1 }}>Finance</Typography>
          <FormGroup row sx={{ mb: 2 }}>
            {CHAMPS_FINANCE.map((c) => (
              <FormControlLabel
                key={c.field}
                control={<Checkbox size="small" checked={customizeForm[c.field]} onChange={(e) => setCustomizeForm((f) => ({ ...f, [c.field]: e.target.checked }))} />}
                label={c.label}
              />
            ))}
          </FormGroup>

          <Divider sx={{ mb: 2 }} />

          <FormControlLabel
            control={<Checkbox size="small" checked={customizeForm.synthese_nationale} onChange={(e) => setCustomizeForm((f) => ({ ...f, synthese_nationale: e.target.checked }))} />}
            label="Synthèse hiérarchique nationale"
          />
          <FormControlLabel
            sx={{ display: 'block' }}
            control={<Checkbox size="small" checked={customizeForm.logs_lecture} onChange={(e) => setCustomizeForm((f) => ({ ...f, logs_lecture: e.target.checked }))} />}
            label="Logs système (connexions + journal des actions)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCustomize}>Annuler</Button>
          <Button
            variant="contained"
            disabled={customizeSaving}
            onClick={handleSaveCustomize}
            sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}
          >
            {customizeSaving ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
