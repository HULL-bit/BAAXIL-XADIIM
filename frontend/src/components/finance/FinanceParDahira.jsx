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
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

export default function FinanceParDahira() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'jewrine_finance'
  const [dahiras, setDahiras] = useState([])
  const [selectedDahiraId, setSelectedDahiraId] = useState('')
  const [membres, setMembres] = useState([])
  const [cotisations, setCotisations] = useState([])
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

  useEffect(() => {
    if (!isAdmin) return
    api.get('organisation/dahiras/').then(({ data }) => setDahiras(data.results || data || [])).catch(() => setDahiras([]))
  }, [isAdmin])

  useEffect(() => {
    if (!selectedDahiraId) {
      setMembres([])
      setCotisations([])
      return
    }
    setLoading(true)
    Promise.all([
      api.get('/auth/users/', { params: { dahira: selectedDahiraId } }).then(({ data }) => data.results || data || []),
      api.get('/finance/cotisations/', { params: { dahira: selectedDahiraId } }).then(({ data }) => data.results || data || []),
    ])
      .then(([users, cots]) => {
        setMembres(Array.isArray(users) ? users : [])
        setCotisations(Array.isArray(cots) ? cots : [])
      })
      .catch(() => {
        setMembres([])
        setCotisations([])
      })
      .finally(() => setLoading(false))
  }, [selectedDahiraId, isAdmin])

  const selectedDahira = dahiras.find((d) => d.id === Number(selectedDahiraId))

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
    setDahiraInDialog(selectedDahiraId || '')
    setMembresInDialog([])
    if (selectedDahiraId) {
      api.get('/auth/users/', { params: { dahira: selectedDahiraId } })
        .then(({ data }) => setMembresInDialog(data.results || data || []))
        .catch(() => setMembresInDialog([]))
    }
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

  const handleDahiraInDialogChange = (dahiraId) => {
    setDahiraInDialog(dahiraId)
    setSelectedMemberIds({})
    if (dahiraId) {
      api.get('/auth/users/', { params: { dahira: dahiraId } })
        .then(({ data }) => setMembresInDialog(data.results || data || []))
        .catch(() => setMembresInDialog([]))
    } else {
      setMembresInDialog([])
    }
  }

  const handleCreateCotisations = async () => {
    setDialogError('')
    const ids = Object.entries(selectedMemberIds).filter(([, v]) => v).map(([id]) => Number(id))
    if (!dahiraInDialog) {
      setDialogError('Sélectionnez un dahira.')
      return
    }
    if (ids.length === 0) {
      setDialogError('Sélectionnez au moins un membre dans la liste.')
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      for (const membreId of ids) {
        await api.post('/finance/cotisations/', {
          membre: membreId,
          mois: assignForm.mois,
          annee: assignForm.annee,
          date_echeance: assignForm.date_echeance,
          type_cotisation: assignForm.type_cotisation,
          objet_assignation: assignForm.type_cotisation === 'assignation' ? (assignForm.objet_assignation || '').trim() : '',
          montant: Number(assignForm.montant) || 1000,
          statut: 'en_attente',
          mode_paiement: 'wave',
        })
      }
      setMessage({ type: 'success', text: `${ids.length} cotisation(s) créée(s).` })
      setOpenAssign(false)
      const dahiraRef = dahiraInDialog || selectedDahiraId
      if (dahiraRef) {
        const { data } = await api.get('/finance/cotisations/', { params: { dahira: dahiraRef } })
        setCotisations(data.results || data || [])
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || (typeof err.response?.data?.membre === 'object' ? err.response?.data?.membre?.[0] : null) || 'Erreur lors de la création.'
      setDialogError(errMsg)
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSaving(false)
    }
    if (dahiraInDialog) setSelectedDahiraId(dahiraInDialog)
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
        Sélectionnez un dahira pour voir les membres, ajouter des mensualités ou assignations et consulter les cotisations.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Dahira"
          value={selectedDahiraId}
          onChange={(e) => setSelectedDahiraId(e.target.value)}
          size="small"
          sx={{ minWidth: 320 }}
        >
          <MenuItem value="">— Choisir un dahira —</MenuItem>
          {dahiras.map((d) => (
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
      ) : selectedDahiraId ? (
        <>
          <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 1 }}>
            Dahira {selectedDahira?.nom} — {membres.length} membre(s)
          </Typography>
          <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 1 }}>Cotisations de ce dahira</Typography>
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
      ) : null}

      <Dialog open={openAssign} onClose={() => !saving && setOpenAssign(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: '#fff' }}>Ajouter cotisations / assignations</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError('')}>{dialogError}</Alert>
          )}
          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1, fontWeight: 600 }}>1. Choisir le dahira et les membres</Typography>
          <TextField
            select
            fullWidth
            label="Dahira"
            value={dahiraInDialog}
            onChange={(e) => handleDahiraInDialogChange(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">— Choisir un dahira —</MenuItem>
            {dahiras.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.nom}</MenuItem>
            ))}
          </TextField>
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
                  <TableCell>Email</TableCell>
                  <TableCell>Téléphone</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!dahiraInDialog ? (
                  <TableRow><TableCell colSpan={4} align="center">Sélectionnez un dahira ci-dessus</TableCell></TableRow>
                ) : membresInDialog.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center">Aucun membre dans ce dahira</TableCell></TableRow>
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
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{m.telephone || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1, fontWeight: 600 }}>2. Période et montant</Typography>
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
