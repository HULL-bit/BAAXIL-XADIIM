import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
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
  IconButton,
  Autocomplete,
  Avatar,
} from '@mui/material'
import { Add, Groups, AccountBalance, MonetizationOn, TrendingUp, HourglassEmpty, Download, PictureAsPdf, Check, Edit, Search, Close } from '@mui/icons-material'
import api, { clearCache } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatutCotisationChip from './StatutCotisationChip'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

const StatCard = ({ title, value, icon, color }) => (
  <Card
    sx={{
      borderTop: `4px solid ${color}`,
      height: '100%',
      transition: 'all 0.3s ease',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 10px 30px ${color}25` },
    }}
  >
    <CardContent sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h6" sx={{ color, fontWeight: 700, mt: 0.5 }}>{value}</Typography>
        </Box>
        <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

export default function FinanceParDahira() {
  const { permissions, isSuperAdmin } = useAuth()
  const canView = !!permissions?.can_view_finance
  // Une permission par action précise (pas un agrégat "can_manage_finance") pour que
  // chaque bouton reflète exactement le droit requis côté backend (matrice L/A/M/S/V).
  const canValidate = !!permissions?.finance_validation
  const canEdit = !!permissions?.finance_modification
  const canAdd = !!permissions?.finance_ajout
  const canViewMembers = !!permissions?.can_view_members
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [dahiras, setDahiras] = useState([])
  const [selectedRegroupementId, setSelectedRegroupementId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [selectedDahiraId, setSelectedDahiraId] = useState('')
  const [filterMois, setFilterMois] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  // Cotisations mensuelles et assignations annuelles sont deux choses différentes
  // (fréquence, périmètre) — filtre dédié pour ne jamais les mélanger par défaut
  // dans les gros dahiras qui ont les deux en même temps.
  const [filterType, setFilterType] = useState('')
  const [membres, setMembres] = useState([])
  const [cotisations, setCotisations] = useState([])
  const [selectedCotisationIds, setSelectedCotisationIds] = useState({})
  const [validating, setValidating] = useState(false)
  const [editingCotisation, setEditingCotisation] = useState(null)
  const [editForm, setEditForm] = useState({ statut: '', montant: '', reference_wave: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [stats, setStats] = useState(null)
  const [globalStats, setGlobalStats] = useState(null)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberSearchOptions, setMemberSearchOptions] = useState([])
  const [memberSearchLoading, setMemberSearchLoading] = useState(false)
  const [lookupMember, setLookupMember] = useState(null)
  const [lookupCotisations, setLookupCotisations] = useState([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [exportAnnee, setExportAnnee] = useState(new Date().getFullYear())
  const [exportMois, setExportMois] = useState('')
  const [exportingFormat, setExportingFormat] = useState('')
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
    if (!canView) return
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
  }, [canView])

  // Statistiques globales (toutes cotisations), toujours visibles indépendamment du filtre sélectionné.
  useEffect(() => {
    if (!canView) return
    api.get('/finance/cotisations/statistiques/')
      .then(({ data }) => setGlobalStats(data))
      .catch(() => setGlobalStats(null))
  }, [canView])

  // Recherche d'un membre par nom/téléphone (indépendante du regroupement/section/dahira
  // sélectionné) pour consulter directement son état de paiement.
  useEffect(() => {
    if (!memberSearchQuery || memberSearchQuery.trim().length < 2) {
      setMemberSearchOptions([])
      return
    }
    let cancelled = false
    setMemberSearchLoading(true)
    const timer = setTimeout(() => {
      api.get('/auth/users/', { params: { search: memberSearchQuery.trim(), minimal: 1, page_size: 10 } })
        .then(({ data }) => { if (!cancelled) setMemberSearchOptions(data.results || data || []) })
        .catch(() => { if (!cancelled) setMemberSearchOptions([]) })
        .finally(() => { if (!cancelled) setMemberSearchLoading(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [memberSearchQuery])

  const handleSelectLookupMember = (member) => {
    setLookupMember(member)
    setMemberSearchOptions([])
    if (!member) {
      setLookupCotisations([])
      return
    }
    setLookupLoading(true)
    api.get('/finance/cotisations/', { params: { membre: member.id, page_size: 100 } })
      .then(({ data }) => setLookupCotisations(data.results || data || []))
      .catch(() => setLookupCotisations([]))
      .finally(() => setLookupLoading(false))
  }

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
    const params = { page_size: 500 }
    if (selectedDahiraId) params.dahira = selectedDahiraId
    else if (selectedSectionId) params.section = selectedSectionId
    else if (selectedRegroupementId) params.regroupement = selectedRegroupementId
    const cotisationParams = { ...params }
    if (filterMois) cotisationParams.mois = filterMois
    if (filterAnnee) cotisationParams.annee = filterAnnee
    if (filterStatut) cotisationParams.statut = filterStatut
    if (filterType) cotisationParams.type_cotisation = filterType

    // Use Promise.allSettled for better error handling and performance
    // membres n'est utilisé ici que pour son .length/.id (cf. handleSelectAll) : minimal=1
    // évite de transférer le profil complet de centaines de membres.
    Promise.allSettled([
      api.get('/auth/users/', { params: { ...params, minimal: 1 } }).then(({ data }) => data.results || data || []),
      api.get('/finance/cotisations/', { params: cotisationParams }).then(({ data }) => data.results || data || []),
    ])
      .then(([usersResult, cotsResult]) => {
        setMembres(usersResult.status === 'fulfilled' ? (Array.isArray(usersResult.value) ? usersResult.value : []) : [])
        setCotisations(cotsResult.status === 'fulfilled' ? (Array.isArray(cotsResult.value) ? cotsResult.value : []) : [])
        setSelectedCotisationIds({})
      })
      .catch(() => {
        setMembres([])
        setCotisations([])
      })
      .finally(() => setLoading(false))

    api
      .get('/finance/cotisations/statistiques/', { params: cotisationParams })
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
  }, [selectedRegroupementId, selectedSectionId, selectedDahiraId, filterMois, filterAnnee, filterStatut, filterType, canView])

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

  const handleToggleCotisation = (id) => {
    setSelectedCotisationIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const validatableCotisations = cotisations.filter((c) => c.statut !== 'payee')
  const selectedCount = Object.values(selectedCotisationIds).filter(Boolean).length

  const handleSelectAllCotisations = (checked) => {
    const next = {}
    if (checked) validatableCotisations.forEach((c) => { next[c.id] = true })
    setSelectedCotisationIds(next)
  }

  // Rafraîchit les cartes de statistiques (montant payé, % payé...) pour qu'elles
  // reflètent immédiatement une validation/correction au lieu de rester sur les anciens chiffres.
  const refreshStats = () => {
    const statsParams = {}
    if (selectedDahiraId) statsParams.dahira = selectedDahiraId
    else if (selectedSectionId) statsParams.section = selectedSectionId
    else if (selectedRegroupementId) statsParams.regroupement = selectedRegroupementId
    if (filterMois) statsParams.mois = filterMois
    if (filterAnnee) statsParams.annee = filterAnnee
    if (filterStatut) statsParams.statut = filterStatut
    if (filterType) statsParams.type_cotisation = filterType
    api.get('/finance/cotisations/statistiques/', { params: statsParams }).then(({ data: s }) => setStats(s)).catch(() => {})
    api.get('/finance/cotisations/statistiques/').then(({ data: g }) => setGlobalStats(g)).catch(() => {})
  }

  const handleValiderPaiements = async () => {
    const ids = Object.entries(selectedCotisationIds).filter(([, v]) => v).map(([id]) => Number(id))
    if (ids.length === 0) return
    setValidating(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.post('/finance/cotisations/valider_paiements/', { ids })
      setMessage({ type: 'success', text: `${data.valides} paiement(s) validé(s).` })
      setSelectedCotisationIds({})
      setCotisations((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, statut: 'payee' } : c)))
      refreshStats()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la validation.' })
    } finally {
      setValidating(false)
    }
  }

  const handleOpenEditCotisation = (cotisation) => {
    setEditingCotisation(cotisation)
    setEditForm({
      statut: cotisation.statut,
      montant: cotisation.montant,
      reference_wave: cotisation.reference_wave || '',
    })
  }

  const handleSaveEditCotisation = async () => {
    if (!editingCotisation) return
    setSavingEdit(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.patch(`/finance/cotisations/${editingCotisation.id}/`, {
        statut: editForm.statut,
        montant: editForm.montant,
        reference_wave: editForm.reference_wave,
      })
      setCotisations((prev) => prev.map((c) => (c.id === editingCotisation.id ? { ...c, ...data } : c)))
      setMessage({ type: 'success', text: 'Cotisation modifiée.' })
      setEditingCotisation(null)
      refreshStats()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la modification.' })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleExportCotisations = async (format) => {
    setExportingFormat(format)
    setMessage({ type: '', text: '' })
    try {
      const params = { format, annee: exportAnnee }
      if (exportMois) params.mois = exportMois
      // Exporte le même périmètre que celui actuellement affiché à l'écran
      // (regroupement/section/dahira sélectionné), pas toujours toutes les cotisations.
      if (selectedDahiraId) params.dahira = selectedDahiraId
      else if (selectedSectionId) params.section = selectedSectionId
      else if (selectedRegroupementId) params.regroupement = selectedRegroupementId
      const { data } = await api.get('/finance/export-rapport-cotisations/', { params, responseType: 'blob' })
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `rapport_cotisations_${exportAnnee}${exportMois ? `_${exportMois}` : ''}.${ext}`)
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setMessage({ type: 'error', text: "Erreur lors de l'export du rapport." })
    } finally {
      setExportingFormat('')
    }
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
    api.get('/auth/users/', { params: { ...params, page_size: 500 } })
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
      api.get('/finance/cotisations/statistiques/').then(({ data }) => setGlobalStats(data)).catch(() => {})
      if (hasFilter) {
        const p = { page_size: 500 }
        if (selectedDahiraId) p.dahira = selectedDahiraId
        else if (selectedSectionId) p.section = selectedSectionId
        else if (selectedRegroupementId) p.regroupement = selectedRegroupementId
        const [cotsRes, usersRes] = await Promise.all([
          api.get('/finance/cotisations/', { params: p }),
          api.get('/auth/users/', { params: { ...p, minimal: 1 } }),
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

  if (!canView) {
    return (
      <Box>
        <Typography variant="h6" color="text.secondary">Accès réservé aux rôles ayant la visibilité finance (Super Admin, rôles nationaux/section, Secrétaire aux Finances de Cellule, Président de Cellule).</Typography>
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

      {canViewMembers && (
      <Card sx={{ mb: 3, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ color: COLORS.vertFonce, fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Search fontSize="small" /> Rechercher un membre pour voir son état de paiement
          </Typography>
          <Autocomplete
            options={memberSearchOptions}
            loading={memberSearchLoading}
            value={lookupMember}
            filterOptions={(x) => x}
            getOptionLabel={(m) => (m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username : '')}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onInputChange={(_, value) => setMemberSearchQuery(value)}
            onChange={(_, value) => handleSelectLookupMember(value)}
            noOptionsText={memberSearchQuery.trim().length < 2 ? 'Tapez au moins 2 caractères…' : 'Aucun membre trouvé'}
            renderOption={(props, m) => (
              <Box component="li" {...props} key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: COLORS.vert, fontSize: 13 }}>
                  {m.first_name?.[0]}{m.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="body2">{`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}</Typography>
                  <Typography variant="caption" color="text.secondary">@{m.username}</Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Nom, prénom, téléphone…"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {memberSearchLoading ? <CircularProgress size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {lookupMember && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Historique de {`${lookupMember.first_name || ''} ${lookupMember.last_name || ''}`.trim() || lookupMember.username}
                </Typography>
                <IconButton size="small" onClick={() => handleSelectLookupMember(null)}><Close fontSize="small" /></IconButton>
              </Box>
              {lookupLoading ? (
                <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
              ) : lookupCotisations.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Aucune cotisation trouvée pour ce membre.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: `${COLORS.vert}10` }}>
                        <TableCell>Mois / Année</TableCell>
                        <TableCell>Montant</TableCell>
                        <TableCell>Référence Wave</TableCell>
                        <TableCell>Statut</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...lookupCotisations].sort((a, b) => (b.annee - a.annee) || (b.mois - a.mois)).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.mois}/{c.annee}</TableCell>
                          <TableCell>{Number(c.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                          <TableCell>{c.reference_wave || '—'}</TableCell>
                          <TableCell><StatutCotisationChip statut={c.statut} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
      )}

      {globalStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatCard
              title="Montant total assigné"
              value={`${(globalStats.montant_total_assigne || 0).toLocaleString('fr-FR')} FCFA`}
              icon={<MonetizationOn />}
              color={COLORS.vert}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              title="Montant total payé"
              value={`${(globalStats.montant_total_paye || 0).toLocaleString('fr-FR')} FCFA`}
              icon={<TrendingUp />}
              color={COLORS.vertFonce}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              title="% payé (global)"
              value={`${globalStats.pourcentage_montant_paye?.toFixed?.(1) ?? globalStats.pourcentage_montant_paye ?? 0}%`}
              icon={<AccountBalance />}
              color={COLORS.vert}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              title="Cotisations en attente"
              value={globalStats.total_en_attente ?? 0}
              icon={<HourglassEmpty />}
              color="#C9A961"
            />
          </Grid>
        </Grid>
      )}

      {isSuperAdmin && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: COLORS.vertFonce, fontWeight: 600 }}>
          Export du rapport des cotisations{currentFilterLabel ? ` (${currentFilterLabel})` : ' (toutes sections)'} :
        </Typography>
        <TextField
          select
          size="small"
          label="Année"
          value={exportAnnee}
          onChange={(e) => setExportAnnee(Number(e.target.value))}
          sx={{ minWidth: 110 }}
        >
          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Mois"
          value={exportMois}
          onChange={(e) => setExportMois(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Tous les mois</MenuItem>
          {MOIS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
        </TextField>
        <Button
          variant="outlined"
          size="small"
          startIcon={exportingFormat === 'excel' ? <CircularProgress size={16} /> : <Download />}
          onClick={() => handleExportCotisations('excel')}
          disabled={!!exportingFormat}
        >
          Export Excel
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={exportingFormat === 'pdf' ? <CircularProgress size={16} /> : <PictureAsPdf />}
          onClick={() => handleExportCotisations('pdf')}
          disabled={!!exportingFormat}
        >
          Export PDF
        </Button>
      </Box>
      )}

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
        <TextField
          select
          label="Mois"
          value={filterMois}
          onChange={(e) => setFilterMois(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Tous les mois</MenuItem>
          {MOIS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Année"
          value={filterAnnee}
          onChange={(e) => setFilterAnnee(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">Toutes</MenuItem>
          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          size="small"
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">Mensualités + assignations</MenuItem>
          <MenuItem value="mensualite">Cotisations mensuelles</MenuItem>
          <MenuItem value="assignation">Assignations annuelles</MenuItem>
        </TextField>
        <TextField
          select
          label="Statut de paiement"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          size="small"
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">Tous les statuts</MenuItem>
          <MenuItem value="en_attente">En attente</MenuItem>
          <MenuItem value="payee">Payée</MenuItem>
          <MenuItem value="retard">En retard</MenuItem>
          <MenuItem value="annulee">Annulée</MenuItem>
        </TextField>
        {canAdd && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAssign}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            Ajouter cotisations / assignations
          </Button>
        )}
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            <Typography variant="h6" sx={{ color: COLORS.vertFonce }}>
              Cotisations {selectedDahiraId ? 'de ce dahira' : selectedSectionId ? 'de cette section' : 'de ce regroupement'}
            </Typography>
            {canValidate && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={validating ? <CircularProgress size={16} color="inherit" /> : <Check />}
                disabled={selectedCount === 0 || validating}
                onClick={handleValiderPaiements}
              >
                Valider {selectedCount > 0 ? `${selectedCount} paiement(s)` : 'les paiements sélectionnés'}
              </Button>
            )}
          </Box>
          <TableContainer component={Paper} sx={{ borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.vert}15` }}>
                  {canValidate && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={validatableCotisations.length > 0 && selectedCount === validatableCotisations.length}
                        indeterminate={selectedCount > 0 && selectedCount < validatableCotisations.length}
                        onChange={(e) => handleSelectAllCotisations(e.target.checked)}
                        disabled={validatableCotisations.length === 0}
                      />
                    </TableCell>
                  )}
                  <TableCell>Membre</TableCell>
                  <TableCell>Mois / Année</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Référence Wave</TableCell>
                  <TableCell>Statut</TableCell>
                  {canEdit && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {cotisations.length === 0 ? (
                  <TableRow><TableCell colSpan={6 + (canValidate ? 1 : 0) + (canEdit ? 1 : 0)} align="center">Aucune cotisation</TableCell></TableRow>
                ) : (
                  cotisations.map((c) => (
                    <TableRow key={c.id} hover selected={!!selectedCotisationIds[c.id]}>
                      {canValidate && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={!!selectedCotisationIds[c.id]}
                            onChange={() => handleToggleCotisation(c.id)}
                            disabled={c.statut === 'payee'}
                          />
                        </TableCell>
                      )}
                      <TableCell>{c.membre_nom || `Membre #${c.membre}`}</TableCell>
                      <TableCell>{c.mois === 0 ? `Année ${c.annee}` : `${c.mois}/${c.annee}`}</TableCell>
                      <TableCell>{c.type_cotisation === 'assignation' ? 'Assignation' : 'Mensualité'}</TableCell>
                      <TableCell>{Number(c.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell>{c.reference_wave || '—'}</TableCell>
                      <TableCell><StatutCotisationChip statut={c.statut} /></TableCell>
                      {canEdit && (
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenEditCotisation(c)} sx={{ color: COLORS.vert }} title="Modifier">
                            <Edit fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
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

      <Dialog open={!!editingCotisation} onClose={() => !savingEdit && setEditingCotisation(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>Modifier la cotisation</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editingCotisation && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {editingCotisation.membre_nom} — {editingCotisation.mois}/{editingCotisation.annee}
              </Typography>
              <TextField
                select
                label="Statut"
                value={editForm.statut}
                onChange={(e) => setEditForm((f) => ({ ...f, statut: e.target.value }))}
                fullWidth
                helperText="Utile pour annuler une validation faite par erreur (repasser en attente)."
              >
                <MenuItem value="en_attente">En attente</MenuItem>
                <MenuItem value="payee">Payée</MenuItem>
                <MenuItem value="retard">En retard</MenuItem>
                <MenuItem value="annulee">Annulée</MenuItem>
              </TextField>
              <TextField
                label="Montant (FCFA)"
                type="number"
                value={editForm.montant}
                onChange={(e) => setEditForm((f) => ({ ...f, montant: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Référence Wave"
                value={editForm.reference_wave}
                onChange={(e) => setEditForm((f) => ({ ...f, reference_wave: e.target.value }))}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCotisation(null)} disabled={savingEdit}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSaveEditCotisation}
            disabled={savingEdit}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            {savingEdit ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
