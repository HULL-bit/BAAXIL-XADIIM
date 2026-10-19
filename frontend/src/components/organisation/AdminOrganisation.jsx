import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Switch,
  FormControlLabel,
  Chip,
  InputAdornment,
} from '@mui/material'
import { Edit, Delete, Add, Groups, AccountTree, Search } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

const LIBELLES_CHAMPS = {
  nom: 'Nom', code: 'Code', regroupement: 'Regroupement', section: 'Section', sous_section: 'Sous-section',
  ville: 'Ville', pays: 'Pays', adresse: 'Adresse', non_field_errors: '',
}

// Message lisible à partir d'une erreur d'API (DRF : {champ: ["message"]}, {detail}, liste) ou réseau.
function erreurServeur(err, defaut) {
  if (err?.response?.status === 403) return 'Action réservée au Super Admin.'
  if (err?.response?.status === 401) return 'Session expirée : reconnectez-vous.'
  const d = err?.response?.data
  if (!d) return err?.request ? 'Serveur injoignable : vérifiez votre connexion et réessayez.' : defaut
  if (typeof d === 'string') return defaut
  if (Array.isArray(d)) return d.join(' ')
  if (d.detail) return String(d.detail)
  const lignes = Object.entries(d).map(([k, v]) => {
    const texte = [].concat(v).join(' ')
    const libelle = LIBELLES_CHAMPS[k] ?? k
    return libelle ? `${libelle} : ${texte}` : texte
  })
  return lignes.length ? lignes.join(' — ') : defaut
}

// Recherche insensible à la casse et aux accents.
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const contient = (champs, q) => !norm(q) || champs.some((c) => norm(c).includes(norm(q)))

// Tri par code officiel (S01DK avant S02KL…), sans code en dernier, puis par nom : l'ordre ne dépend
// plus du nom (une section renommée sans son préfixe numérique disparaissait en bas de liste).
const parCode = (a, b) =>
  (a.code || '~').localeCompare(b.code || '~', 'fr', { numeric: true }) ||
  String(a.nom).localeCompare(String(b.nom), 'fr', { numeric: true })

const champRecherche = (label, value, onChange) => (
  <TextField
    size="small"
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    sx={{ minWidth: 220 }}
    InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
  />
)

export default function AdminOrganisation() {
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [sousSections, setSousSections] = useState([])
  const [dahiras, setDahiras] = useState([])

  const [selectedRegId, setSelectedRegId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [searchReg, setSearchReg] = useState('')
  const [searchSection, setSearchSection] = useState('')
  const [searchDahira, setSearchDahira] = useState('')
  const [sexeFiltre, setSexeFiltre] = useState('') // '' | 'H' | 'F'
  const [codeFiltre, setCodeFiltre] = useState('') // '' | 'avec' | 'sans'

  const [regForm, setRegForm] = useState({ id: null, nom: '', code: '', description: '' })
  const [sectionForm, setSectionForm] = useState({ id: null, nom: '', code: '', ville: '', pays: '', regroupement: '' })
  const [dahiraForm, setDahiraForm] = useState({ id: null, nom: '', code: '', adresse: '', ville: '', est_pilote: false, section: '', sexe: 'H' })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dialogType, setDialogType] = useState(null) // 'reg' | 'section' | 'dahira'
  const [dialogError, setDialogError] = useState('') // erreur affichée DANS la fenêtre de saisie
  const [message, setMessage] = useState({ type: '', text: '' })

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      api.get('organisation/regroupements/', { skipCache: true }).then(({ data }) => data.results || data || []),
      api.get('organisation/sections/', { skipCache: true }).then(({ data }) => data.results || data || []),
      api.get('organisation/sous-sections/', { skipCache: true }).then(({ data }) => data.results || data || []),
      api.get('organisation/dahiras/', { skipCache: true }).then(({ data }) => data.results || data || []),
    ])
      .then(([regs, secs, sousSecs, dah]) => {
        setRegroupements(Array.isArray(regs) ? regs : [])
        setSections(Array.isArray(secs) ? secs : [])
        setSousSections(Array.isArray(sousSecs) ? sousSecs : [])
        setDahiras(Array.isArray(dah) ? dah : [])
      })
      .catch((err) => {
        setMessage({ type: 'error', text: erreurServeur(err, 'Erreur lors du chargement de l’organisation.') })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAll()
  }, [])

  const sectionsFiltered = (selectedRegId
    ? sections.filter((s) => Number(s.regroupement) === Number(selectedRegId))
    : [...sections]
  ).sort(parCode)

  const regroupementsAffiches = regroupements.filter((r) => contient([r.nom, r.code, r.description], searchReg))
  const sectionsAffichees = sectionsFiltered.filter((x) => contient([x.nom, x.code, x.ville, x.pays], searchSection))

  const sectionsTriees = [...sections].sort(parCode)

  const dahirasFiltered = selectedSectionId
    ? dahiras.filter((d) => {
        const ssId = Number(d.sous_section)
        const ss = sousSections.find((s) => s.id === ssId)
        return ss && Number(ss.section) === Number(selectedSectionId)
      })
    : dahiras

  const dahirasAffichees = dahirasFiltered.filter((d) => {
    const ss = sousSections.find((x) => x.id === Number(d.sous_section))
    if (sexeFiltre && ss?.sexe !== sexeFiltre) return false
    if (codeFiltre === 'avec' && !d.code) return false
    if (codeFiltre === 'sans' && d.code) return false
    return contient([d.nom, d.code, d.ville, d.adresse], searchDahira)
  }).sort(parCode)

  const openDialog = (type, entity = null) => {
    setDialogError('')
    setDialogType(type)
    if (type === 'reg') {
      setRegForm(
        entity
          ? { id: entity.id, nom: entity.nom || '', code: entity.code || '', description: entity.description || '' }
          : { id: null, nom: '', code: '', description: '' },
      )
    } else if (type === 'section') {
      setSectionForm(
        entity
          ? {
              id: entity.id,
              nom: entity.nom || '',
              code: entity.code || '',
              ville: entity.ville || '',
              pays: entity.pays || '',
              regroupement: entity.regroupement ?? '',
            }
          : { id: null, nom: '', code: '', ville: '', pays: 'Sénégal', regroupement: selectedRegId || '' },
      )
    } else if (type === 'dahira') {
      const ss = entity ? sousSections.find((x) => x.id === Number(entity.sous_section)) : null
      setDahiraForm(
        entity
          ? {
              id: entity.id,
              nom: entity.nom || '',
              code: entity.code || '',
              adresse: entity.adresse || '',
              ville: entity.ville || '',
              est_pilote: !!entity.est_pilote,
              section: ss ? ss.section : '',
              sexe: ss ? ss.sexe : 'H',
            }
          : { id: null, nom: '', code: '', adresse: '', ville: '', est_pilote: false, section: selectedSectionId || '', sexe: 'H' },
      )
    }
  }

  const closeDialog = () => {
    if (saving) return
    setDialogType(null)
    setDialogError('')
  }

  // Enregistre en gardant la fenêtre ouverte et en affichant le vrai motif en cas d'échec.
  const enregistrer = async (appel, succes, echec, apres) => {
    setSaving(true)
    setDialogError('')
    try {
      await appel()
      setMessage({ type: 'success', text: succes })
      setDialogType(null)
      apres?.()
      loadAll()
    } catch (err) {
      setDialogError(erreurServeur(err, echec))
    } finally {
      setSaving(false)
    }
  }

  const supprimer = async (url, confirmation, succes, echec) => {
    if (!window.confirm(confirmation)) return
    try {
      await api.delete(url)
      setMessage({ type: 'success', text: succes })
      loadAll()
    } catch (err) {
      setMessage({ type: 'error', text: erreurServeur(err, echec) })
    }
  }

  const handleSaveReg = () => {
    if (!regForm.nom.trim()) {
      setDialogError('Le nom du regroupement est obligatoire.')
      return
    }
    const payload = { nom: regForm.nom.trim(), code: regForm.code.trim(), description: regForm.description || '' }
    return enregistrer(
      () => (regForm.id ? api.patch(`organisation/regroupements/${regForm.id}/`, payload) : api.post('organisation/regroupements/', payload)),
      'Regroupement enregistré.',
      'Erreur lors de l’enregistrement du regroupement.',
      () => setSearchReg(''),
    )
  }

  const handleDeleteReg = (id) =>
    supprimer(`organisation/regroupements/${id}/`, 'Supprimer ce regroupement ?', 'Regroupement supprimé.', 'Impossible de supprimer ce regroupement.')

  const handleSaveSection = () => {
    if (!sectionForm.regroupement) {
      setDialogError('Choisissez un regroupement pour la section.')
      return
    }
    if (!sectionForm.nom.trim()) {
      setDialogError('Le nom de la section est obligatoire.')
      return
    }
    const payload = {
      nom: sectionForm.nom.trim(),
      code: sectionForm.code.trim(),
      ville: sectionForm.ville || '',
      pays: sectionForm.pays || 'Sénégal',
      regroupement: Number(sectionForm.regroupement),
    }
    return enregistrer(
      () => (sectionForm.id ? api.patch(`organisation/sections/${sectionForm.id}/`, payload) : api.post('organisation/sections/', payload)),
      'Section enregistrée.',
      'Erreur lors de l’enregistrement de la section.',
      () => { setSearchSection(''); setSelectedRegId(String(sectionForm.regroupement)) },
    )
  }

  const handleDeleteSection = (id) =>
    supprimer(`organisation/sections/${id}/`, 'Supprimer cette section ?', 'Section supprimée.', 'Impossible de supprimer cette section.')

  // Sous-section Hommes/Femmes d'une section : la crée si elle manque (sections anciennes).
  const sousSectionPour = async (sectionId, sexe) => {
    const existante = sousSections.find((ss) => Number(ss.section) === Number(sectionId) && ss.sexe === sexe)
    if (existante) return existante.id
    const { data } = await api.post('organisation/sous-sections/', { section: Number(sectionId), sexe })
    return data.id
  }

  const handleSaveDahira = () => {
    if (!dahiraForm.id && !dahiraForm.section) {
      setDialogError('Choisissez la section du dahira.')
      return
    }
    if (!dahiraForm.nom.trim()) {
      setDialogError('Le nom du dahira est obligatoire.')
      return
    }
    const code = dahiraForm.code.trim().toUpperCase()
    if (code && !/^S\d{2}[A-Z]{2}\d{2}$/.test(code)) {
      setDialogError('Code de cellule invalide. Format attendu : S01DK01 (code de la section + n° de cellule sur 2 chiffres).')
      return
    }
    return enregistrer(
      async () => {
        const base = {
          nom: dahiraForm.nom.trim(),
          code,
          adresse: dahiraForm.adresse || '',
          ville: dahiraForm.ville || '',
          est_pilote: dahiraForm.est_pilote,
        }
        if (dahiraForm.id) return api.patch(`organisation/dahiras/${dahiraForm.id}/`, base)
        const sous_section = await sousSectionPour(dahiraForm.section, dahiraForm.sexe)
        return api.post('organisation/dahiras/', { ...base, sous_section })
      },
      'Dahira enregistré.',
      'Erreur lors de l’enregistrement du dahira.',
      () => { setSearchDahira(''); setSexeFiltre(''); setCodeFiltre(''); if (dahiraForm.section) setSelectedSectionId(String(dahiraForm.section)) },
    )
  }

  const handleDeleteDahira = (id) =>
    supprimer(`organisation/dahiras/${id}/`, 'Supprimer ce dahira ?', 'Dahira supprimé.', 'Impossible de supprimer ce dahira.')

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountTree /> Administration de l’organisation
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Gestion des regroupements, sections et dahiras de Ahibahil Khadim. Les sous-sections restent internes (H/F) et sont gérées automatiquement.
      </Typography>

      {message.text && (
        <Alert
          severity={message.type === 'error' ? 'error' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Regroupements */}
        <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: COLORS.vertFonce, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Groups /> Regroupements
              <Chip size="small" label={`${regroupementsAffiches.length} / ${regroupements.length}`} />
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {champRecherche('Rechercher un regroupement', searchReg, setSearchReg)}
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => openDialog('reg')}
              sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
            >
              Ajouter
            </Button>
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}15` }}>
                  <TableCell>Nom</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regroupementsAffiches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">{regroupements.length ? 'Aucun résultat pour cette recherche' : 'Aucun regroupement'}</TableCell>
                  </TableRow>
                ) : (
                  regroupementsAffiches.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.nom}</TableCell>
                      <TableCell>{r.code}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openDialog('reg', r)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteReg(r.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Sections */}
        <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ color: COLORS.vertFonce, display: 'flex', alignItems: 'center', gap: 1 }}>
              Sections
              <Chip size="small" label={`${sectionsAffichees.length} / ${sections.length}`} />
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {champRecherche('Rechercher une section', searchSection, setSearchSection)}
              <TextField
                select
                size="small"
                label="Regroupement"
                value={selectedRegId}
                onChange={(e) => { setSelectedRegId(e.target.value); setSelectedSectionId('') }}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">— Tous —</MenuItem>
                {regroupements.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.nom}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => openDialog('section')}
                sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
              >
                Ajouter
              </Button>
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}15` }}>
                  <TableCell>Nom</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Ville</TableCell>
                  <TableCell>Pays</TableCell>
                  <TableCell>Regroupement</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sectionsAffichees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">{sections.length ? 'Aucun résultat pour ces filtres' : 'Aucune section'}</TableCell>
                  </TableRow>
                ) : (
                  sectionsAffichees.map((s) => {
                    const reg = regroupements.find((r) => r.id === s.regroupement)
                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>{s.nom}</TableCell>
                        <TableCell>{s.code}</TableCell>
                        <TableCell>{s.ville}</TableCell>
                        <TableCell>{s.pays}</TableCell>
                        <TableCell>{reg?.nom || '—'}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => { setSelectedRegId(String(s.regroupement)); openDialog('section', s) }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteSection(s.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Dahiras */}
        <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ color: COLORS.vertFonce, display: 'flex', alignItems: 'center', gap: 1 }}>
              Dahiras
              <Chip size="small" label={`${dahirasAffichees.length} / ${dahiras.length}`} />
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {champRecherche('Rechercher un dahira', searchDahira, setSearchDahira)}
              <TextField
                select
                size="small"
                label="Section"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">— Toutes —</MenuItem>
                {sectionsFiltered.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Hommes / Femmes" value={sexeFiltre} onChange={(e) => setSexeFiltre(e.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="H">Hommes</MenuItem>
                <MenuItem value="F">Femmes</MenuItem>
              </TextField>
              <TextField select size="small" label="Code de cellule" value={codeFiltre} onChange={(e) => setCodeFiltre(e.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="avec">Avec code</MenuItem>
                <MenuItem value="sans">Sans code</MenuItem>
              </TextField>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => openDialog('dahira')}
                sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
              >
                Ajouter
              </Button>
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}15` }}>
                  <TableCell>Nom</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Adresse</TableCell>
                  <TableCell>Ville</TableCell>
                  <TableCell>Pilote</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dahirasAffichees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">{dahiras.length ? 'Aucun résultat pour ces filtres' : 'Aucun dahira'}</TableCell>
                  </TableRow>
                ) : (
                  dahirasAffichees.map((d) => {
                    const ss = sousSections.find((s) => s.id === d.sous_section)
                    const sec = ss ? sections.find((s) => s.id === ss.section) : null
                    return (
                      <TableRow key={d.id} hover>
                        <TableCell>{d.nom}</TableCell>
                        <TableCell>{d.code || <Typography component="span" variant="caption" color="text.secondary">à définir</Typography>}</TableCell>
                        <TableCell>
                          {sec?.nom || '—'}
                          {ss && <Chip size="small" variant="outlined" label={ss.sexe === 'F' ? 'Femmes' : 'Hommes'} sx={{ ml: 0.5 }} />}
                        </TableCell>
                        <TableCell>{d.adresse}</TableCell>
                        <TableCell>{d.ville}</TableCell>
                        <TableCell>
                          {d.est_pilote ? <Chip label="Pilote" size="small" color="success" /> : <Chip label="—" size="small" variant="outlined" />}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openDialog('dahira', d)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteDahira(d.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Dialogues */}
      <Dialog open={dialogType === 'reg'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>
          {regForm.id ? 'Modifier le regroupement' : 'Ajouter un regroupement'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField
            fullWidth
            required
            label="Nom"
            value={regForm.nom}
            onChange={(e) => setRegForm((f) => ({ ...f, nom: e.target.value }))}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Code"
            helperText="Laissez vide pour un code automatique."
            value={regForm.code}
            onChange={(e) => setRegForm((f) => ({ ...f, code: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Description"
            value={regForm.description}
            onChange={(e) => setRegForm((f) => ({ ...f, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveReg} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogType === 'section'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>
          {sectionForm.id ? 'Modifier la section' : 'Ajouter une section'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField
            select
            fullWidth
            required
            label="Regroupement"
            value={sectionForm.regroupement}
            onChange={(e) => setSectionForm((f) => ({ ...f, regroupement: e.target.value }))}
            sx={{ mt: 1, mb: 2 }}
          >
            <MenuItem value="">— Choisir —</MenuItem>
            {regroupements.map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.nom}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            required
            label="Nom"
            value={sectionForm.nom}
            onChange={(e) => setSectionForm((f) => ({ ...f, nom: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Code"
            helperText="Code officiel de la section, ex. S01DK (Dakar). Laissez vide pour un code automatique."
            value={sectionForm.code}
            onChange={(e) => setSectionForm((f) => ({ ...f, code: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Ville"
            value={sectionForm.ville}
            onChange={(e) => setSectionForm((f) => ({ ...f, ville: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Pays"
            value={sectionForm.pays}
            onChange={(e) => setSectionForm((f) => ({ ...f, pays: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveSection} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogType === 'dahira'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>
          {dahiraForm.id ? 'Modifier le dahira' : 'Ajouter un dahira'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {dahiraForm.id ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              {sections.find((s) => s.id === Number(dahiraForm.section))?.nom || '—'} — {dahiraForm.sexe === 'F' ? 'Femmes' : 'Hommes'}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                required
                label="Section"
                value={dahiraForm.section}
                onChange={(e) => setDahiraForm((f) => ({ ...f, section: e.target.value }))}
                sx={{ flex: '2 1 220px' }}
              >
                <MenuItem value="">— Choisir —</MenuItem>
                {sectionsTriees.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                required
                label="Hommes / Femmes"
                value={dahiraForm.sexe}
                onChange={(e) => setDahiraForm((f) => ({ ...f, sexe: e.target.value }))}
                sx={{ flex: '1 1 140px' }}
              >
                <MenuItem value="H">Hommes</MenuItem>
                <MenuItem value="F">Femmes</MenuItem>
              </TextField>
            </Box>
          )}
          <TextField
            fullWidth
            required
            label="Nom"
            value={dahiraForm.nom}
            onChange={(e) => setDahiraForm((f) => ({ ...f, nom: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Code de la cellule"
            placeholder="S01DK01"
            helperText="Code officiel (code de la section + n° de cellule). Sert de préfixe aux matricules des membres."
            value={dahiraForm.code}
            onChange={(e) => setDahiraForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Adresse"
            value={dahiraForm.adresse}
            onChange={(e) => setDahiraForm((f) => ({ ...f, adresse: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Ville"
            value={dahiraForm.ville}
            onChange={(e) => setDahiraForm((f) => ({ ...f, ville: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={dahiraForm.est_pilote}
                onChange={(e) => setDahiraForm((f) => ({ ...f, est_pilote: e.target.checked }))}
              />
            }
            label="Cellule pilote (phase pilote — visible pour les rôles nationaux/section)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveDahira} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
