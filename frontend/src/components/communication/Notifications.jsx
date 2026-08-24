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
  const [cible, setCible] = useState('tous')
  const [canaux, setCanaux] = useState([])
  const [canalCible, setCanalCible] = useState('')
  const [loadingCanaux, setLoadingCanaux] = useState(false)

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

  const loadCanaux = () => {
    setLoadingCanaux(true)
    api.get('/communication/canaux/')
      .then(({ data }) => setCanaux(data.results || data || []))
      .catch(() => setCanaux([]))
      .finally(() => setLoadingCanaux(false))
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
    if (cible === 'selection' && destinataires.length === 0) errors.destinataires = 'Choisissez au moins un membre.'
    if (cible === 'canal' && !canalCible) errors.canal = 'Choisissez un canal.'
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
      if (cible === 'selection') payload.destinataires = destinataires
      else if (cible === 'canal') payload.canal = canalCible
      const { data } = await api.post('/communication/notifications/', payload)
      const detail = data?.detail
      setMessage({ type: 'success', text: detail || 'Notification envoyée.' })
      setOpenCreate(false)
      setForm({ type_notification: 'info', titre: '', message: '', lien: '' })
      setCible('tous')
      setDestinataires([])
      setCanalCible('')
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
              <TextField select fullWidth label="Type" value={form.type_notification} onChange={(e) => setForm((f) => ({ ...f, type_notification: e.target.value }))}>
                {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField
                select
                fullWidth
                label="Destinataires"
                value={cible}
                onChange={(e) => {
                  const v = e.target.value
                  setCible(v)
                  setFieldErrors((fe) => ({ ...fe, destinataires: undefined, canal: undefined }))
                  if (v === 'selection' && membres.length === 0 && !loadingMembres) loadMembres()
                  if (v === 'canal' && canaux.length === 0 && !loadingCanaux) loadCanaux()
                }}
              >
                <MenuItem value="tous">Tous les membres</MenuItem>
                <MenuItem value="selection">Sélection de membres</MenuItem>
                <MenuItem value="canal">Membres d'un canal</MenuItem>
              </TextField>

              {cible === 'selection' && (
                <TextField
                  select
                  fullWidth
                  label="Membres"
                  value={destinataires}
                  onChange={(e) => {
                    setDestinataires(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
                    setFieldErrors((fe) => ({ ...fe, destinataires: undefined }))
                  }}
                  error={!!fieldErrors.destinataires}
                  helperText={fieldErrors.destinataires || (loadingMembres ? 'Chargement des membres…' : '')}
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected) => {
                      if (!selected || selected.length === 0) return ''
                      const labels = membres
                        .filter((m) => selected.includes(m.id))
                        .map((m) => m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || `Membre #${m.id}`)
                      return labels.join(', ')
                    },
                  }}
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
              )}

              {cible === 'canal' && (
                <TextField
                  select
                  fullWidth
                  label="Canal"
                  value={canalCible}
                  onChange={(e) => {
                    setCanalCible(e.target.value)
                    setFieldErrors((fe) => ({ ...fe, canal: undefined }))
                  }}
                  error={!!fieldErrors.canal}
                  helperText={fieldErrors.canal || (loadingCanaux ? 'Chargement des canaux…' : "Tous les membres de ce canal seront notifiés.")}
                >
                  {canaux.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.nom} ({c.nb_membres} membre(s))</MenuItem>
                  ))}
                </TextField>
              )}

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
