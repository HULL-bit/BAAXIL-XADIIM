import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  AvatarGroup,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Autocomplete,
  Chip,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Send, Add, Groups, Videocam, Call, Close, PersonRemove, PersonAdd, ArrowBack, Tag } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getMediaUrl } from '../../services/media'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }

function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve()
  if (window.__jitsiScriptPromise) return window.__jitsiScriptPromise
  window.__jitsiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
  return window.__jitsiScriptPromise
}

function CallDialog({ open, onClose, room, mode, displayName }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    if (!open || !room) return
    let cancelled = false
    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return
        apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: room,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: displayName || 'Membre' },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithVideoMuted: mode === 'audio',
          },
        })
        apiRef.current.addEventListener('readyToClose', () => onClose())
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room, mode])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: COLORS.vertFonce, color: 'white' }}>
        {mode === 'audio' ? 'Appel vocal' : 'Appel vidéo'}
        <IconButton onClick={onClose} sx={{ color: 'white' }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, height: '70vh', bgcolor: '#000' }}>
        <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />
      </DialogContent>
    </Dialog>
  )
}

export default function Canaux() {
  const { user, isSuperAdmin } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [canaux, setCanaux] = useState([])
  const [loadingCanaux, setLoadingCanaux] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [texte, setTexte] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const [openCreate, setOpenCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ nom: '', description: '' })
  const [createMembers, setCreateMembers] = useState([])
  const [memberOptions, setMemberOptions] = useState([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [openManage, setOpenManage] = useState(false)
  const [manageAdd, setManageAdd] = useState([])
  const [manageOptions, setManageOptions] = useState([])
  const [managing, setManaging] = useState(false)

  const [call, setCall] = useState(null) // { room, mode }

  const loadCanaux = useCallback(() => {
    setLoadingCanaux(true)
    api.get('/communication/canaux/')
      .then(({ data }) => setCanaux(data.results || data || []))
      .catch(() => setCanaux([]))
      .finally(() => setLoadingCanaux(false))
  }, [])

  useEffect(() => { loadCanaux() }, [loadCanaux])

  const loadMessages = useCallback((canalId) => {
    setLoadingMessages(true)
    api.get('/communication/canal-messages/', { params: { canal: canalId } })
      .then(({ data }) => setMessages(data.results || data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.id)
    const interval = setInterval(() => loadMessages(selected.id), 5000)
    return () => clearInterval(interval)
  }, [selected, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (openCreate || openManage) {
      api.get('/auth/users/', { params: { minimal: 1, page_size: 500 } })
        .then(({ data }) => {
          const list = data.results || data || []
          if (openCreate) setMemberOptions(list)
          if (openManage) setManageOptions(list)
        })
        .catch(() => {})
    }
  }, [openCreate, openManage])

  const handleSend = async () => {
    if (!texte.trim() || !selected) return
    setSending(true)
    try {
      const { data } = await api.post('/communication/canal-messages/', { canal: selected.id, contenu: texte.trim() })
      setMessages((prev) => [...prev, data])
      setTexte('')
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi du message.")
    } finally {
      setSending(false)
    }
  }

  const handleCreateCanal = async () => {
    if (!createForm.nom.trim()) {
      setCreateError('Le nom du canal est requis.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const { data } = await api.post('/communication/canaux/', createForm)
      if (createMembers.length > 0) {
        await api.post(`/communication/canaux/${data.id}/ajouter_membres/`, { membre_ids: createMembers.map((m) => m.id) })
      }
      setOpenCreate(false)
      setCreateForm({ nom: '', description: '' })
      setCreateMembers([])
      loadCanaux()
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Erreur lors de la création du canal.')
    } finally {
      setCreating(false)
    }
  }

  const handleAddMembers = async () => {
    if (!selected || manageAdd.length === 0) return
    setManaging(true)
    try {
      const { data } = await api.post(`/communication/canaux/${selected.id}/ajouter_membres/`, { membre_ids: manageAdd.map((m) => m.id) })
      setSelected(data)
      setCanaux((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      setManageAdd([])
    } catch {
      // ignore, dialog reste ouvert
    } finally {
      setManaging(false)
    }
  }

  const handleRemoveMember = async (membreId) => {
    if (!selected) return
    try {
      const { data } = await api.post(`/communication/canaux/${selected.id}/retirer_membre/`, { membre_id: membreId })
      setSelected(data)
      setCanaux((prev) => prev.map((c) => (c.id === data.id ? data : c)))
    } catch {
      // ignore
    }
  }

  const startCall = async (mode) => {
    if (!selected) return
    try {
      const { data } = await api.get(`/communication/canaux/${selected.id}/rejoindre/`)
      setCall({ room: data.jitsi_room, mode })
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de rejoindre l'appel.")
    }
  }

  const displayName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }}>Canaux</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>
            Groupes de discussion texte, vocal et vidéo — visibles uniquement par leurs membres.
          </Typography>
        </Box>
        {isSuperAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Créer un canal
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden', borderLeft: `4px solid ${COLORS.or}`, height: { xs: 'calc(100vh - 220px)', md: 'calc(100vh - 250px)' }, display: 'flex' }}>
        {/* Liste des canaux */}
        <Box sx={{ width: { xs: '100%', md: 320 }, borderRight: { md: '1px solid' }, borderColor: 'divider', display: { xs: selected && isMobile ? 'none' : 'flex', md: 'flex' }, flexDirection: 'column' }}>
          <Box sx={{ p: 2, bgcolor: COLORS.vert, color: 'white' }}>
            <Typography variant="subtitle1" fontWeight={600}>Mes canaux</Typography>
          </Box>
          {loadingCanaux ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : canaux.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Aucun canal pour le moment.</Typography>
            </Box>
          ) : (
            <List sx={{ overflowY: 'auto', flex: 1, py: 0 }}>
              {canaux.map((c) => (
                <ListItemButton key={c.id} selected={selected?.id === c.id} onClick={() => setSelected(c)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${COLORS.vert}25`, color: COLORS.vertFonce }}><Tag /></Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={c.nom}
                    secondary={`${c.nb_membres} membre(s)`}
                    primaryTypographyProps={{ fontWeight: 500, noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {/* Détail du canal */}
        <Box sx={{ flex: 1, display: { xs: selected ? 'flex' : 'none', md: 'flex' }, flexDirection: 'column', minWidth: 0 }}>
          {!selected ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
              <Groups sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography color="text.secondary">Sélectionnez un canal pour discuter</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: COLORS.vert, color: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isMobile && (
                    <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: 'white' }}><ArrowBack /></IconButton>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>{selected.nom}</Typography>
                    {selected.description && (
                      <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>{selected.description}</Typography>
                    )}
                  </Box>
                  <Tooltip title="Appel vocal">
                    <IconButton onClick={() => startCall('audio')} sx={{ color: 'white' }}><Call /></IconButton>
                  </Tooltip>
                  <Tooltip title="Appel vidéo">
                    <IconButton onClick={() => startCall('video')} sx={{ color: 'white' }}><Videocam /></IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <AvatarGroup max={6} sx={{ '& .MuiAvatar-root': { width: 26, height: 26, fontSize: '.75rem', border: '2px solid ' + COLORS.vert } }}>
                    {(selected.membres_detail || []).map((m) => (
                      <Tooltip key={m.id} title={`${m.first_name} ${m.last_name}`}>
                        <Avatar src={getMediaUrl(m.photo)} sx={{ bgcolor: COLORS.or, color: COLORS.vertFonce }}>
                          {(m.first_name || m.username || '?')[0]?.toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                  {isSuperAdmin && (
                    <Button size="small" startIcon={<PersonAdd />} onClick={() => setOpenManage(true)} sx={{ color: 'white', ml: 'auto' }}>
                      Gérer les membres
                    </Button>
                  )}
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#F5F9FC' }}>
                {loadingMessages && messages.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : messages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
                    Aucun message pour l'instant — lancez la discussion.
                  </Typography>
                ) : (
                  messages.map((m) => {
                    const isSent = m.auteur === user?.id
                    return (
                      <Box key={m.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start' }}>
                        {!isSent && (
                          <Typography variant="caption" sx={{ color: COLORS.vertFonce, ml: 1, fontWeight: 600 }}>{m.auteur_nom}</Typography>
                        )}
                        <Box
                          sx={{
                            maxWidth: '75%',
                            px: 1.5, py: 1,
                            borderRadius: 2,
                            bgcolor: isSent ? COLORS.vert : 'white',
                            color: isSent ? 'white' : 'inherit',
                            boxShadow: 1,
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.contenu}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
                          {new Date(m.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, bgcolor: 'white' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Écrire un message…"
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  disabled={sending}
                />
                <IconButton onClick={handleSend} disabled={sending || !texte.trim()} sx={{ bgcolor: COLORS.vert, color: 'white', '&:hover': { bgcolor: COLORS.vertFonce } }}>
                  {sending ? <CircularProgress size={20} color="inherit" /> : <Send fontSize="small" />}
                </IconButton>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      {/* Création d'un canal */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Créer un canal</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <TextField
            autoFocus fullWidth margin="dense" label="Nom du canal"
            value={createForm.nom}
            onChange={(e) => setCreateForm((f) => ({ ...f, nom: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="Description (facultatif)" multiline minRows={2}
            value={createForm.description}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Autocomplete
            multiple
            options={memberOptions}
            value={createMembers}
            onChange={(_, v) => setCreateMembers(v)}
            getOptionLabel={(m) => `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderTags={(value, getTagProps) => value.map((m, i) => (
              <Chip label={`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username} {...getTagProps({ index: i })} key={m.id} size="small" />
            ))}
            renderInput={(params) => <TextField {...params} margin="dense" label="Membres à ajouter" placeholder="Rechercher…" />}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)} disabled={creating}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateCanal} disabled={creating} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {creating ? <CircularProgress size={20} color="inherit" /> : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Gestion des membres */}
      <Dialog open={openManage} onClose={() => setOpenManage(false)} fullWidth maxWidth="sm">
        <DialogTitle>Membres de « {selected?.nom} »</DialogTitle>
        <DialogContent>
          <List dense>
            {(selected?.membres_detail || []).map((m) => (
              <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={getMediaUrl(m.photo)} sx={{ width: 28, height: 28, bgcolor: COLORS.or, color: COLORS.vertFonce, fontSize: '.8rem' }}>
                    {(m.first_name || m.username || '?')[0]?.toUpperCase()}
                  </Avatar>
                  <Typography variant="body2">{`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}</Typography>
                </Box>
                <IconButton size="small" onClick={() => handleRemoveMember(m.id)} title="Retirer du canal">
                  <PersonRemove fontSize="small" color="error" />
                </IconButton>
              </Box>
            ))}
          </List>
          <Divider sx={{ my: 1.5 }} />
          <Autocomplete
            multiple
            options={manageOptions.filter((o) => !(selected?.membres_detail || []).some((m) => m.id === o.id))}
            value={manageAdd}
            onChange={(_, v) => setManageAdd(v)}
            getOptionLabel={(m) => `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Ajouter des membres" placeholder="Rechercher…" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManage(false)}>Fermer</Button>
          <Button variant="contained" onClick={handleAddMembers} disabled={managing || manageAdd.length === 0} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {managing ? <CircularProgress size={20} color="inherit" /> : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <CallDialog open={!!call} onClose={() => setCall(null)} room={call?.room} mode={call?.mode} displayName={displayName} />
    </Box>
  )
}
