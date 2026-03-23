import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Add, Groups, AccountBalance } from '@mui/icons-material'
import api, { clearCache } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

export default function FinanceParDahira() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'jewrine_finance'
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [dahiras, setDahiras] = useState([])
  const [selectedRegroupementId, setSelectedRegroupementId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [selectedDahiraId, setSelectedDahiraId] = useState('')
  const [membres, setMembres] = useState([])
  const [cotisations, setCotisations] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openAssign, setOpenAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    date_echeance: new Date().toISOString().slice(0, 10),
    type_cotisation: 'mensualite',
    objet_assignation: '',
    montant: 1000,
  })
  const [selectedMemberIds, setSelectedMemberIds] = useState({})
  const [saving, setSaving] = useState(false)
  const [dahiraInDialog, setDahiraInDialog] = useState('')
  const [membresInDialog, setMembresInDialog] = useState([])
  const [dialogError, setDialogError] = useState('')
  const [regInDialog, setRegInDialog] = useState('')
  const [sectionInDialog, setSectionInDialog] = useState('')
  const [sousSections, setSousSections] = useState([])

  useEffect(() => {
    if (!isAdmin) return
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
      .catch(() => { setRegroupements([]); setSections([]); setSousSections([]); setDahiras([]) })
  }, [isAdmin])

  const sectionsFiltered = selectedRegroupementId
    ? sections.filter((s) => Number(s.regroupement) === Number(selectedRegroupementId))
    : sections
  const sousSectionIdsForSection = selectedSectionId
    ? sousSections.filter((ss) => Number(ss.section) === Number(selectedSectionId)).map((ss) => ss.id)
    : []
  const sectionIdsForRegroupement = selectedRegroupementId
    ? sections.filter((s) => Number(s.regroupement) === Number(selectedRegroupementId)).map((s) => s.id)
    : []
  const sousSectionIdsForRegroupement = sectionIdsForRegroupement.length
    ? sousSections.filter((ss) => sectionIdsForRegroupement.includes(Number(ss.section))).map((ss) => ss.id)
    : []
  const dahirasFiltered = selectedSectionId
    ? dahiras.filter((d) => sousSectionIdsForSection.includes(Number(d.sous_section)))
    : selectedRegroupementId
      ? dahiras.filter((d) => sousSectionIdsForRegroupement.includes(Number(d.sous_section)))
      : dahiras

  useEffect(() => {
    const hasFilter = selectedRegroupementId || selectedSectionId || selectedDahiraId
    if (!hasFilter) {
      setMembres([])
      setCotisations([])
      setStats(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const params = {}
    if (selectedDahiraId) params.dahira = selectedDahiraId
    else if (selectedSectionId) params.section = selectedSectionId
    else if (selectedRegroupementId) params.regroupement = selectedRegroupementId
    
    // Use Promise.allSettled for better error handling and performance
    Promise.allSettled([
      api.get('/auth/users/', { params }).then(({ data }) => data.results || data || []),
      api.get('/finance/cotisations/', { params }).then(({ data }) => data.results || data || []),
    ])
      .then(([usersResult, cotsResult]) => {
        setMembres(usersResult.status === 'fulfilled' ? (Array.isArray(usersResult.value) ? usersResult.value : []) : [])
        setCotisations(cotsResult.status === 'fulfilled' ? (Array.isArray(cotsResult.value) ? cotsResult.value : []) : [])
      })
      .catch(() => {
        setMembres([])
        setCotisations([])
      })
      .finally(() => setLoading(false))

    api
      .get('/finance/cotisations/statistiques/', { params })
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
  }, [selectedRegroupementId, selectedSectionId, selectedDahiraId, isAdmin])

  const selectedRegroupement = regroupements.find((r) => r.id === Number(selectedRegroupementId))
  const selectedSection = sections.find((s) => s.id === Number(selectedSectionId))
  const selectedDahira = dahiras.find((d) => d.id === Number(selectedDahiraId))

  const handleRegroupementChange = (v) => {
    setSelectedRegroupementId(v)
    setSelectedSectionId('')
    setSelectedDahiraId('')
  }
  const handleSectionChange = (v) => {
    setSelectedSectionId(v)
    setSelectedDahiraId('')
  }

  const handleOpenAssign = () => {
    setDialogError('')
    setAssignForm({
      mois: new Date().getMonth() + 1,
      annee: new Date().getFullYear(),
      date_echeance: new Date().toISOString().slice(0, 10),
      type_cotisation: 'mensualite',
      objet_assignation: '',
      montant: 1000,
    })
    setSelectedMemberIds({})
    setRegInDialog('')
    setSectionInDialog('')
    setDahiraInDialog('')
    setMembresInDialog([])
    setOpenAssign(true)
  }

  const handleToggleMember = (id) => {
    setSelectedMemberIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSelectAll = (checked) => {
    const list = openAssign ? membresInDialog : membres
    const next = {}
    list.forEach((m) => { next[m.id] = checked })
    setSelectedMemberIds(next)
  }

  const sectionsFilteredInDialog = regInDialog
    ? sections.filter((s) => Number(s.regroupement) === Number(regInDialog))
    : sections
  const sousSectionIdsInDialog = sectionInDialog
    ? sousSections.filter((ss) => Number(ss.section) === Number(sectionInDialog)).map((ss) => ss.id)
    : []
  const dahirasFilteredInDialog = sectionInDialog
    ? dahiras.filter((d) => sousSectionIdsInDialog.includes(Number(d.sous_section)))
    : regInDialog
      ? dahiras.filter((d) => {
          const secIds = sections.filter((s) => Number(s.regroupement) === Number(regInDialog)).map((s) => s.id)
          const ssIds = sousSections.filter((ss) => secIds.includes(Number(ss.section))).map((ss) => ss.id)
          return ssIds.includes(Number(d.sous_section))
        })
      : dahiras

  const loadMembresInDialog = (params) => {
    if (!params.regroupement && !params.section && !params.dahira) {
      setMembresInDialog([])
      return
    }
    api.get('/auth/users/', { params })
      .then(({ data }) => setMembresInDialog(data.results || data || []))
      .catch(() => setMembresInDialog([]))
  }

  const handleRegInDialogChange = (v) => {
    setRegInDialog(v)
    setSectionInDialog('')
    setDahiraInDialog('')
    setSelectedMemberIds({})
    if (v) loadMembresInDialog({ regroupement: v })
    else setMembresInDialog([])
  }
  const handleSectionInDialogChange = (v) => {
    setSectionInDialog(v)
    setDahiraInDialog('')
    setSelectedMemberIds({})
    if (v) loadMembresInDialog({ section: v })
    else setMembresInDialog([])
  }
  const handleDahiraInDialogChange = (dahiraId) => {
    setDahiraInDialog(dahiraId)
    setSelectedMemberIds({})
    if (dahiraId) loadMembresInDialog({ dahira: dahiraId })
    else setMembresInDialog([])
  }

  const currentFilterLabel = selectedDahira
    ? `Dahira ${selectedDahira.nom}`
    : selectedSection
      ? `Section ${selectedSection.nom}`
      : selectedRegroupement
        ? `Regroupement ${selectedRegroupement.nom}`
        : null

  const hasFilter = selectedRegroupementId || selectedSectionId || selectedDahiraId
  const hasScopeInDialog = regInDialog || sectionInDialog || dahiraInDialog

  const handleCreateCotisations = async () => {
    setDialogError('')
    const ids = Object.entries(selectedMemberIds).filter(([, v]) => v).map(([id]) => Number(id))
    if (!hasScopeInDialog) {
      setDialogError('Choisissez au moins un regroupement, une section ou un dahira pour afficher la liste des membres.')
      return
    }
    if (ids.length === 0) {
      setDialogError('Sélectionnez au moins un membre dans la liste.')
      return
    }
    
    // Validate form data before sending
    if (!assignForm.type_cotisation || assignForm.type_cotisation.trim() === '') {
      setDialogError('Le type de cotisation est requis.')
      return
    }
    if (!assignForm.montant || Number(assignForm.montant) <= 0) {
      setDialogError('Le montant doit être supérieur à 0.')
      return
    }
    
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      // Prepare common payload - ensure type_cotisation is explicitly set
      const payload = {
        mois: assignForm.mois,
        annee: assignForm.annee,
        date_echeance: assignForm.date_echeance,
        type_cotisation: assignForm.type_cotisation || 'mensualite',
        objet_assignation: assignForm.type_cotisation === 'assignation' ? (assignForm.objet_assignation || '').trim() : '',
        montant: Number(assignForm.montant) || 1000,
        statut: 'en_attente',
        mode_paiement: 'wave',
      }
      
      console.log('Creating cotisations with payload:', payload)
      
      // Create cotisations in parallel with concurrency limit for better performance
      const batchSize = 5
      const errors = []
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        const results = await Promise.allSettled(batch.map(membreId => 
          api.post('/finance/cotisations/', { ...payload, membre: membreId })
        ))
        
        // Collect any errors but continue processing
        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            const memberName = membresInDialog.find(m => m.id === batch[idx])?.username || `Membre #${batch[idx]}`
            errors.push(`${memberName}: ${result.reason?.response?.data?.detail || result.reason?.message || 'Erreur inconnue'}`)
          }
        })
      }
      
      if (errors.length > 0) {
        setDialogError(`Erreurs lors de la création:\n${errors.join('\n')}`)
        setMessage({ type: 'error', text: `${ids.length - errors.length} cotisation(s) créée(s), ${errors.length} échec(s).` })
      } else {
        setMessage({ type: 'success', text: `${ids.length} cotisation(s) créée(s).` })
        setOpenAssign(false)
      }
      
      // Clear cache to force fresh data on next load
      clearCache('/finance/cotisations')
      clearCache('/auth/users')
      if (hasFilter) {
        const p = {}
        if (selectedDahiraId) p.dahira = selectedDahiraId
        else if (selectedSectionId) p.section = selectedSectionId
        else if (selectedRegroupementId) p.regroupement = selectedRegroupementId
        const [cotsRes, usersRes] = await Promise.all([
          api.get('/finance/cotisations/', { params: p }),
          api.get('/auth/users/', { params: p }),
        ])
        setCotisations(cotsRes.data.results || cotsRes.data || [])
        setMembres(usersRes.data.results || usersRes.data || [])
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || (typeof err.response?.data?.membre === 'object' ? err.response?.data?.membre?.[0] : null) || 'Erreur lors de la création.'
      setDialogError(errMsg)
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSaving(false)
    }
  }

  const MOIS = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
  ]

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h6" color="text.secondary">Accès réservé aux administrateurs et Jewrine Finance.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalance /> Finance par Dahira
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Sélectionnez un regroupement, une section ou un dahira pour voir les membres et les cotisations. Pour ajouter des cotisations, cliquez sur le bouton puis choisissez un regroupement, une section ou un dahira et sélectionnez un ou plusieurs membres.
      </Typography>

      {stats && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, minWidth: 200, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Montant assigné</Typography>
            <Typography variant="h6">{(stats.montant_total_assigne || 0).toLocaleString('fr-FR')} FCFA</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 200, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Montant payé</Typography>
            <Typography variant="h6">{(stats.montant_total_paye || 0).toLocaleString('fr-FR')} FCFA</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 200, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">% montant payé</Typography>
            <Typography variant="h6">{stats.pourcentage_montant_paye?.toFixed?.(2) ?? stats.pourcentage_montant_paye}%</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 200, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Cotisations payées / totales</Typography>
            <Typography variant="h6">
              {(stats.total_payees || 0).toLocaleString('fr-FR')} / {(stats.total_assignations || 0).toLocaleString('fr-FR')}
            </Typography>
          </Paper>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Regroupement"
          value={selectedRegroupementId}
          onChange={(e) => handleRegroupementChange(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">— Tous —</MenuItem>
          {regroupements.map((r) => (
            <MenuItem key={r.id} value={r.id}>{r.nom}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Section"
          value={selectedSectionId}
          onChange={(e) => handleSectionChange(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">— Tous —</MenuItem>
          {sectionsFiltered.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Dahira"
          value={selectedDahiraId}
          onChange={(e) => setSelectedDahiraId(e.target.value)}
          size="small"
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">— Tous —</MenuItem>
          {dahirasFiltered.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.nom}</MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAssign}
          sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
        >
          Ajouter cotisations / assignations
        </Button>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: COLORS.vert }} /></Box>
      ) : hasFilter ? (
        <>
          <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 1 }}>
            {currentFilterLabel} — {membres.length} membre(s)
          </Typography>
          <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 1 }}>
            Cotisations {selectedDahiraId ? 'de ce dahira' : selectedSectionId ? 'de cette section' : 'de ce regroupement'}
          </Typography>
          <TableContainer component={Paper} sx={{ borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}15` }}>
                  <TableCell>Membre</TableCell>
                  <TableCell>Mois / Année</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cotisations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">Aucune cotisation</TableCell></TableRow>
                ) : (
                  cotisations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.membre_nom || `Membre #${c.membre}`}</TableCell>
                      <TableCell>{c.mois}/{c.annee}</TableCell>
                      <TableCell>{c.type_cotisation === 'assignation' ? 'Assignation' : 'Mensualité'}</TableCell>
                      <TableCell>{Number(c.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell>{c.statut === 'payee' ? 'Payée' : c.statut === 'en_attente' ? 'En attente' : c.statut}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Typography color="text.secondary">Choisissez un regroupement, une section ou un dahira pour afficher les membres et cotisations.</Typography>
      )}

      <Dialog open={openAssign} onClose={() => !saving && setOpenAssign(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>Ajouter cotisations / assignations</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError('')}>{dialogError}</Alert>
          )}
          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1, fontWeight: 600 }}>1. Choisir un dahira (regroupement et section optionnels, pour filtrer)</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <TextField
              select
              size="small"
              label="Regroupement (optionnel)"
              value={regInDialog}
              onChange={(e) => handleRegInDialogChange(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">— Optionnel —</MenuItem>
              {regroupements.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.nom}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Section (optionnel)"
              value={sectionInDialog}
              onChange={(e) => handleSectionInDialogChange(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">— Optionnel —</MenuItem>
              {sectionsFilteredInDialog.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Dahira"
              value={dahiraInDialog}
              onChange={(e) => handleDahiraInDialogChange(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">— Choisir un dahira —</MenuItem>
              {dahirasFilteredInDialog.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.nom}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1, fontWeight: 600 }}>2. Sélectionner un ou plusieurs membres (regroupement / section affichés automatiquement)</Typography>
          <Box sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}15` }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={membresInDialog.length > 0 && membresInDialog.every((m) => selectedMemberIds[m.id])}
                      indeterminate={Object.values(selectedMemberIds).some(Boolean) && !membresInDialog.every((m) => selectedMemberIds[m.id])}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Membre</TableCell>
                  <TableCell>Regroupement</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Dahira</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Téléphone</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!hasScopeInDialog ? (
                  <TableRow><TableCell colSpan={7} align="center">Choisissez au moins un dahira ci-dessus (regroupement et section optionnels)</TableCell></TableRow>
                ) : membresInDialog.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">Aucun membre dans ce périmètre</TableCell></TableRow>
                ) : (
                  membresInDialog.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={!!selectedMemberIds[m.id]}
                          onChange={() => handleToggleMember(m.id)}
                        />
                      </TableCell>
                      <TableCell>{[m.first_name, m.last_name].filter(Boolean).join(' ') || m.username}</TableCell>
                      <TableCell>{m.regroupement_nom || '—'}</TableCell>
                      <TableCell>{m.section_nom || '—'}</TableCell>
                      <TableCell>{m.dahira_nom || '—'}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{m.telephone || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1, fontWeight: 600 }}>3. Période et montant</Typography>
          <TextField
            select
            fullWidth
            label="Mois"
            value={assignForm.mois}
            onChange={(e) => setAssignForm((f) => ({ ...f, mois: Number(e.target.value) }))}
            sx={{ mb: 2 }}
          >
            {MOIS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            type="number"
            label="Année"
            value={assignForm.annee}
            onChange={(e) => setAssignForm((f) => ({ ...f, annee: Number(e.target.value) }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="date"
            label="Date d'échéance"
            value={assignForm.date_echeance}
            onChange={(e) => setAssignForm((f) => ({ ...f, date_echeance: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Type"
            value={assignForm.type_cotisation}
            onChange={(e) => setAssignForm((f) => ({ ...f, type_cotisation: e.target.value }))}
            sx={{ mb: 2 }}
          >
            <MenuItem value="mensualite">Mensualité</MenuItem>
            <MenuItem value="assignation">Assignation</MenuItem>
          </TextField>
          {assignForm.type_cotisation === 'assignation' && (
            <TextField
              fullWidth
              label="Objet (ex. Magal, Gamou)"
              value={assignForm.objet_assignation}
              onChange={(e) => setAssignForm((f) => ({ ...f, objet_assignation: e.target.value }))}
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            fullWidth
            type="number"
            label="Montant (FCFA)"
            value={assignForm.montant}
            onChange={(e) => setAssignForm((f) => ({ ...f, montant: Number(e.target.value) || 0 }))}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            {Object.values(selectedMemberIds).filter(Boolean).length} membre(s) sélectionné(s) — une cotisation sera créée pour chacun.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(false)} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateCotisations} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? <CircularProgress size={24} /> : 'Créer les cotisations'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
