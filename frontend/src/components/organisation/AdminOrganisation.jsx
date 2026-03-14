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
} from '@mui/material'
import { Edit, Delete, Add, Groups, AccountTree } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

export default function AdminOrganisation() {
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [sousSections, setSousSections] = useState([])
  const [dahiras, setDahiras] = useState([])

  const [selectedRegId, setSelectedRegId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')

  const [regForm, setRegForm] = useState({ id: null, nom: '', code: '', description: '' })
  const [sectionForm, setSectionForm] = useState({ id: null, nom: '', code: '', ville: '', pays: '' })
  const [dahiraForm, setDahiraForm] = useState({ id: null, nom: '', adresse: '', ville: '' })

  const [loading, setLoading] = useState(false)
  const [dialogType, setDialogType] = useState(null) // 'reg' | 'section' | 'dahira'
  const [message, setMessage] = useState({ type: '', text: '' })

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      api.get('organisation/regroupements/').then(({ data }) => data.results || data || []),
      api.get('organisation/sections/').then(({ data }) => data.results || data || []),
      api.get('organisation/sous-sections/').then(({ data }) => data.results || data || []),
      api.get('organisation/dahiras/').then(({ data }) => data.results || data || []),
    ])
      .then(([regs, secs, sousSecs, dah]) => {
        setRegroupements(Array.isArray(regs) ? regs : [])
        setSections(Array.isArray(secs) ? secs : [])
        setSousSections(Array.isArray(sousSecs) ? sousSecs : [])
        setDahiras(Array.isArray(dah) ? dah : [])
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Erreur lors du chargement de l’organisation.' })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAll()
  }, [])

  const sectionsFiltered = selectedRegId
    ? sections.filter((s) => Number(s.regroupement) === Number(selectedRegId))
    : sections

  const sousSectionIdDefaultForSection = (sectionId) => {
    if (!sectionId) return null
    const ssH = sousSections.find((ss) => Number(ss.section) === Number(sectionId) && ss.sexe === 'H')
    const ssAny = sousSections.find((ss) => Number(ss.section) === Number(sectionId))
    return ssH?.id || ssAny?.id || null
  }

  const dahirasFiltered = selectedSectionId
    ? dahiras.filter((d) => {
        const ssId = Number(d.sous_section)
        const ss = sousSections.find((s) => s.id === ssId)
        return ss && Number(ss.section) === Number(selectedSectionId)
      })
    : dahiras

  const openDialog = (type, entity = null) => {
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
            }
          : { id: null, nom: '', code: '', ville: '', pays: '' },
      )
    } else if (type === 'dahira') {
      setDahiraForm(
        entity
          ? { id: entity.id, nom: entity.nom || '', adresse: entity.adresse || '', ville: entity.ville || '' }
          : { id: null, nom: '', adresse: '', ville: '' },
      )
    }
  }

  const closeDialog = () => {
    setDialogType(null)
  }

  const handleSaveReg = async () => {
    if (!regForm.nom.trim()) {
      setMessage({ type: 'error', text: 'Le nom du regroupement est obligatoire.' })
      return
    }
    try {
      if (regForm.id) {
        await api.patch(`organisation/regroupements/${regForm.id}/`, {
          nom: regForm.nom,
          code: regForm.code || undefined,
          description: regForm.description || '',
        })
      } else {
        await api.post('organisation/regroupements/', {
          nom: regForm.nom,
          code: regForm.code || regForm.nom.toUpperCase().replace(/\s+/g, '_'),
          description: regForm.description || '',
        })
      }
      setMessage({ type: 'success', text: 'Regroupement enregistré.' })
      closeDialog()
      loadAll()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de l’enregistrement du regroupement.' })
    }
  }

  const handleDeleteReg = async (id) => {
    if (!window.confirm('Supprimer ce regroupement ?')) return
    try {
      await api.delete(`organisation/regroupements/${id}/`)
      setMessage({ type: 'success', text: 'Regroupement supprimé.' })
      loadAll()
    } catch {
      setMessage({ type: 'error', text: 'Impossible de supprimer ce regroupement (sections ou dahiras associés ?).' })
    }
  }

  const handleSaveSection = async () => {
    if (!selectedRegId && !sectionForm.id) {
      setMessage({ type: 'error', text: 'Choisissez d’abord un regroupement pour la section.' })
      return
    }
    if (!sectionForm.nom.trim()) {
      setMessage({ type: 'error', text: 'Le nom de la section est obligatoire.' })
      return
    }
    const regroupement = sectionForm.id ? undefined : Number(selectedRegId)
    try {
      if (sectionForm.id) {
        await api.patch(`organisation/sections/${sectionForm.id}/`, {
          nom: sectionForm.nom,
          code: sectionForm.code || undefined,
          ville: sectionForm.ville || '',
          pays: sectionForm.pays || '',
        })
      } else {
        await api.post('organisation/sections/', {
          nom: sectionForm.nom,
          code: sectionForm.code || sectionForm.nom.toUpperCase().replace(/\s+/g, '_'),
          ville: sectionForm.ville || '',
          pays: sectionForm.pays || 'Sénégal',
          regroupement,
        })
      }
      setMessage({ type: 'success', text: 'Section enregistrée.' })
      closeDialog()
      loadAll()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de l’enregistrement de la section.' })
    }
  }

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Supprimer cette section ?')) return
    try {
      await api.delete(`organisation/sections/${id}/`)
      setMessage({ type: 'success', text: 'Section supprimée.' })
      loadAll()
    } catch {
      setMessage({ type: 'error', text: 'Impossible de supprimer cette section (dahiras associés ?).' })
    }
  }

  const handleSaveDahira = async () => {
    if (!selectedSectionId && !dahiraForm.id) {
      setMessage({ type: 'error', text: 'Choisissez d’abord une section pour le dahira.' })
      return
    }
    if (!dahiraForm.nom.trim()) {
      setMessage({ type: 'error', text: 'Le nom du dahira est obligatoire.' })
      return
    }
    const sectionId = dahiraForm.id ? null : Number(selectedSectionId)
    let sousSectionId = null
    if (!dahiraForm.id && sectionId) {
      sousSectionId = sousSectionIdDefaultForSection(sectionId)
      if (!sousSectionId) {
        setMessage({ type: 'error', text: 'Aucune sous-section trouvée pour cette section (H/F). Vérifiez la configuration.' })
        return
      }
    }
    try {
      if (dahiraForm.id) {
        await api.patch(`organisation/dahiras/${dahiraForm.id}/`, {
          nom: dahiraForm.nom,
          adresse: dahiraForm.adresse || '',
          ville: dahiraForm.ville || '',
        })
      } else {
        await api.post('organisation/dahiras/', {
          nom: dahiraForm.nom,
          adresse: dahiraForm.adresse || '',
          ville: dahiraForm.ville || '',
          sous_section: sousSectionId,
        })
      }
      setMessage({ type: 'success', text: 'Dahira enregistré.' })
      closeDialog()
      loadAll()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de l’enregistrement du dahira.' })
    }
  }

  const handleDeleteDahira = async (id) => {
    if (!window.confirm('Supprimer ce dahira ?')) return
    try {
      await api.delete(`organisation/dahiras/${id}/`)
      setMessage({ type: 'success', text: 'Dahira supprimé.' })
      loadAll()
    } catch {
      setMessage({ type: 'error', text: 'Impossible de supprimer ce dahira (membres associés ?).' })
    }
  }

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
            </Typography>
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
                {regroupements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">Aucun regroupement</TableCell>
                  </TableRow>
                ) : (
                  regroupements.map((r) => (
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
            <Typography variant="h6" sx={{ color: COLORS.vertFonce }}>
              Sections
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
                {sectionsFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">Aucune section</TableCell>
                  </TableRow>
                ) : (
                  sectionsFiltered.map((s) => {
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
            <Typography variant="h6" sx={{ color: COLORS.vertFonce }}>
              Dahiras
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
                  <TableCell>Section</TableCell>
                  <TableCell>Adresse</TableCell>
                  <TableCell>Ville</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dahirasFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">Aucun dahira</TableCell>
                  </TableRow>
                ) : (
                  dahirasFiltered.map((d) => {
                    const ss = sousSections.find((s) => s.id === d.sous_section)
                    const sec = ss ? sections.find((s) => s.id === ss.section) : null
                    return (
                      <TableRow key={d.id} hover>
                        <TableCell>{d.nom}</TableCell>
                        <TableCell>{sec?.nom || '—'}</TableCell>
                        <TableCell>{d.adresse}</TableCell>
                        <TableCell>{d.ville}</TableCell>
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
          <TextField
            fullWidth
            label="Nom"
            value={regForm.nom}
            onChange={(e) => setRegForm((f) => ({ ...f, nom: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Code"
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
          <Button onClick={closeDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveReg} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogType === 'section'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>
          {sectionForm.id ? 'Modifier la section' : 'Ajouter une section'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {!sectionForm.id && (
            <TextField
              select
              fullWidth
              label="Regroupement"
              value={selectedRegId}
              onChange={(e) => setSelectedRegId(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">— Choisir —</MenuItem>
              {regroupements.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.nom}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            fullWidth
            label="Nom"
            value={sectionForm.nom}
            onChange={(e) => setSectionForm((f) => ({ ...f, nom: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Code"
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
          <Button onClick={closeDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveSection} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogType === 'dahira'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>
          {dahiraForm.id ? 'Modifier le dahira' : 'Ajouter un dahira'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {!dahiraForm.id && (
            <TextField
              select
              fullWidth
              label="Section"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">— Choisir —</MenuItem>
              {sectionsFiltered.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            fullWidth
            label="Nom"
            value={dahiraForm.nom}
            onChange={(e) => setDahiraForm((f) => ({ ...f, nom: e.target.value }))}
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveDahira} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

