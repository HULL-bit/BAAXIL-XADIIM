import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Checkbox,
} from '@mui/material'
import { Add, Done } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }
const TYPES = [
  { value: 'info', label: 'Information' },
  { value: 'succes', label: 'Succès' },
  { value: 'avertissement', label: 'Avertissement' },
  { value: 'erreur', label: 'Erreur' },
  { value: 'message', label: 'Message' },
  { value: 'evenement', label: 'Événement' },
  { value: 'finance', label: 'Finance' },
  { value: 'kamil', label: 'Kamil' },
  { value: 'systeme', label: 'Système' },
]

export default function Notifications() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openCreate, setOpenCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type_notification: 'info', titre: '', message: '', lien: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [membres, setMembres] = useState([])
  const [destinataires, setDestinataires] = useState([])
  const [loadingMembres, setLoadingMembres] = useState(false)

  const loadList = () => {
    setLoading(true)
    api.get('/communication/notifications/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const loadMembres = () => {
    setLoadingMembres(true)
    api.get('/communication/messages/destinataires/')
      .then(({ data }) => setMembres(Array.isArray(data) ? data : []))
      .catch(() => setMembres([]))
      .finally(() => setLoadingMembres(false))
  }

  const handleMarquerLue = async (id) => {
    try {
      await api.post(`/communication/notifications/${id}/marquer_lue/`)
      loadList()
    } catch (_) {}
  }

  const handleCreate = async () => {
    const errors = {}
    if (!form.titre) errors.titre = 'Titre requis.'
    if (!form.message) errors.message = 'Message requis.'
    if (destinataires.length === 0) errors.destinataires = 'Sélectionnez au moins un destinataire.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = {
        type_notification: form.type_notification,
        titre: form.titre,
        message: form.message,
        lien: form.lien || '',
      }
      if (destinataires.length > 0) {
        payload.destinataires = destinataires
      }
      const { data } = await api.post('/communication/notifications/', payload)
      const detail = data?.detail
      setMessage({ type: 'success', text: detail || `1 message envoyé à ${destinataires.length} membre(s).` })
      setOpenCreate(false)
      setForm({ type_notification: 'info', titre: '', message: '', lien: '' })
      setDestinataires([])
      loadList()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) apiFieldErrors[key] = String(value[0])
          else if (typeof value === 'string') apiFieldErrors[key] = value
        })
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }))
        setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      } else {
        const d = err.response?.data?.detail || data
        setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Notifications</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Toutes vos notifications</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Créer une notification
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <Paper sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, overflow: 'hidden' }}>
          {list.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Aucune notification</Typography></Box>
          ) : (
            <List disablePadding>
              {list.map((n) => (
                <ListItem
                  key={n.id}
                  divider
                  sx={{
                    bgcolor: n.est_lue ? 'transparent' : `${COLORS.vert}08`,
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography fontWeight={600}>{n.titre}</Typography>
                        <Chip size="small" label={n.type_display || n.type_notification} sx={{ bgcolor: `${COLORS.or}30` }} />
                        {!n.est_lue && <Chip size="small" label="Non lue" color="primary" />}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{n.message}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{new Date(n.date_creation).toLocaleString('fr-FR')}</Typography>
                      </>
                    }
                  />
                  {!n.est_lue && (
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => handleMarquerLue(n.id)} title="Marquer comme lue" sx={{ color: COLORS.vert }}>
                        <Done />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}

      {isAdmin && (
        <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Créer une notification</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Par défaut, la notification est envoyée à tous les membres. Vous pouvez cibler un ou plusieurs destinataires ci‑dessous.
              </Typography>
              <TextField select fullWidth label="Type" value={form.type_notification} onChange={(e) => setForm((f) => ({ ...f, type_notification: e.target.value }))}>
                {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField
                select
                fullWidth
                label="Destinataires (optionnel)"
                value={destinataires}
                onChange={(e) => setDestinataires(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => {
                    if (!selected || selected.length === 0) return 'Tous les membres'
                    const labels = membres
                      .filter((m) => selected.includes(m.id))
                      .map((m) => m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || `Membre #${m.id}`)
                    return labels.join(', ')
                  },
                }}
                helperText={loadingMembres ? 'Chargement des membres…' : 'Laissez vide pour envoyer à tous les membres.'}
                onOpen={() => { if (membres.length === 0 && !loadingMembres) loadMembres() }}
              >
                {membres.map((m) => {
                  const label = m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || `Membre #${m.id}`
                  const checked = destinataires.includes(m.id)
                  return (
                    <MenuItem key={m.id} value={m.id}>
                      <Checkbox checked={checked} sx={{ mr: 1 }} />
                      {label}
                    </MenuItem>
                  )
                })}
              </TextField>
              <TextField
                fullWidth
                label="Titre"
                value={form.titre}
                onChange={(e) => {
                  setForm((f) => ({ ...f, titre: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, titre: undefined }))
                }}
                required
                error={!!fieldErrors.titre}
                helperText={fieldErrors.titre || ''}
              />
              <TextField
                fullWidth
                label="Message"
                value={form.message}
                onChange={(e) => {
                  setForm((f) => ({ ...f, message: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, message: undefined }))
                }}
                multiline
                rows={3}
                required
                error={!!fieldErrors.message}
                helperText={fieldErrors.message || ''}
              />
              <TextField fullWidth label="Lien (optionnel)" value={form.lien} onChange={(e) => setForm((f) => ({ ...f, lien: e.target.value }))} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>Annuler</Button>
            <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Créer'}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}
