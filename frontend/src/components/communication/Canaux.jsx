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
  Checkbox,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Send, Add, Groups, Videocam, Call, Close, PersonRemove, PersonAdd, ArrowBack, Tag, Edit, PhotoCamera,
  Mic, Stop, MoreVert, DeleteOutline, PlaylistRemove,
} from '@mui/icons-material'
import api, { clearCache } from '../../services/api'
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

  // Enregistrement d'un message vocal
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const recordChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const recordStreamRef = useRef(null)

  // Sélection multiple + suppression d'un ou plusieurs messages
  const [selectMode, setSelectMode] = useState(false)
  const [selectedMsgIds, setSelectedMsgIds] = useState({})
  const [msgMenuAnchor, setMsgMenuAnchor] = useState(null)
  const [msgMenuTarget, setMsgMenuTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [openEdit, setOpenEdit] = useState(false)
  const [editForm, setEditForm] = useState({ nom: '', description: '' })
  const [editPhotoFile, setEditPhotoFile] = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const loadCanaux = useCallback(() => {
    setLoadingCanaux(true)
    api.get('/communication/canaux/')
      .then(({ data }) => setCanaux(data.results || data || []))
      .catch(() => setCanaux([]))
      .finally(() => setLoadingCanaux(false))
  }, [])

  useEffect(() => { loadCanaux() }, [loadCanaux])

  useEffect(() => () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    recordStreamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

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

  const stopRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current)
      recordTimerRef.current = null
    }
  }

  const handleStartRecording = async () => {
    if (!selected || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordStreamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recordChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        sendVoiceMessage(blob, recordSeconds)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch (err) {
      setError("Impossible d'accéder au micro : vérifiez les permissions du navigateur.")
    }
  }

  const handleStopRecording = () => {
    stopRecordTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }

  const handleCancelRecording = () => {
    stopRecordTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        recordStreamRef.current?.getTracks().forEach((t) => t.stop())
      }
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    setRecordSeconds(0)
  }

  const sendVoiceMessage = async (blob, dureeSecondes) => {
    if (!selected) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('canal', selected.id)
      fd.append('type_message', 'vocal')
      fd.append('duree_secondes', String(dureeSecondes))
      fd.append('fichier_joint', blob, `vocal-${Date.now()}.webm`)
      const { data } = await api.post('/communication/canal-messages/', fd)
      setMessages((prev) => [...prev, data])
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi du message vocal.")
    } finally {
      setSending(false)
      setRecordSeconds(0)
    }
  }

  const formatDuree = (s) => {
    const sec = Math.max(0, Math.floor(s || 0))
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  const toggleSelectMode = () => {
    setSelectMode((v) => !v)
    setSelectedMsgIds({})
  }

  const toggleMsgSelected = (id) => {
    setSelectedMsgIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectedMsgCount = Object.values(selectedMsgIds).filter(Boolean).length

  const runDeleteMessages = async (ids, mode) => {
    if (ids.length === 0) return
    setDeleting(true)
    try {
      await api.post('/communication/canal-messages/supprimer/', { ids, mode })
      if (mode === 'moi') {
        setMessages((prev) => prev.filter((m) => !ids.includes(m.id)))
      } else {
        setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, supprime_pour_tous: true, contenu: '', fichier_joint: null } : m)))
      }
      setSelectedMsgIds({})
      setSelectMode(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenMsgMenu = (e, msg) => {
    setMsgMenuAnchor(e.currentTarget)
    setMsgMenuTarget(msg)
  }
  const handleCloseMsgMenu = () => {
    setMsgMenuAnchor(null)
    setMsgMenuTarget(null)
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
      clearCache('/communication/canaux')
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
      clearCache('/communication/canaux')
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
      clearCache('/communication/canaux')
    } catch {
      // ignore
    }
  }

  const handleOpenEdit = () => {
    if (!selected) return
    setEditForm({ nom: selected.nom, description: selected.description || '' })
    setEditPhotoFile(null)
    setEditPhotoPreview(null)
    setEditError('')
    setOpenEdit(true)
  }

  const handleEditPhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setEditError('Veuillez choisir une image (JPG, PNG).')
      return
    }
    setEditPhotoFile(file)
    setEditPhotoPreview(URL.createObjectURL(file))
    setEditError('')
  }

  const handleSaveEdit = async () => {
    if (!selected || !editForm.nom.trim()) {
      setEditError('Le nom du canal est requis.')
      return
    }
    setSavingEdit(true)
    setEditError('')
    try {
      let data
      if (editPhotoFile) {
        const fd = new FormData()
        fd.append('nom', editForm.nom)
        fd.append('description', editForm.description || '')
        fd.append('photo', editPhotoFile)
        ;({ data } = await api.patch(`/communication/canaux/${selected.id}/`, fd))
      } else {
        ;({ data } = await api.patch(`/communication/canaux/${selected.id}/`, editForm))
      }
      setSelected(data)
      setCanaux((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      clearCache('/communication/canaux')
      setOpenEdit(false)
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Erreur lors de la modification du canal.')
    } finally {
      setSavingEdit(false)
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
                    <Avatar src={getMediaUrl(c.photo)} sx={{ bgcolor: `${COLORS.vert}25`, color: COLORS.vertFonce }}><Tag /></Avatar>
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
                  <Avatar src={getMediaUrl(selected.photo)} sx={{ bgcolor: `${COLORS.or}`, color: COLORS.vertFonce, width: 36, height: 36 }}>
                    <Tag fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>{selected.nom}</Typography>
                    {selected.description && (
                      <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>{selected.description}</Typography>
                    )}
                  </Box>
                  {isSuperAdmin && (
                    <Tooltip title="Modifier le canal">
                      <IconButton onClick={handleOpenEdit} sx={{ color: 'white' }}><Edit /></IconButton>
                    </Tooltip>
                  )}
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
                  <Button size="small" startIcon={<PlaylistRemove />} onClick={toggleSelectMode} sx={{ color: 'white' }}>
                    {selectMode ? 'Annuler' : 'Sélectionner'}
                  </Button>
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
                    const canDeleteForAll = isSent || isSuperAdmin
                    const isSelected = !!selectedMsgIds[m.id]
                    return (
                      <Box
                        key={m.id}
                        sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 0.5, justifyContent: isSent ? 'flex-end' : 'flex-start' }}
                      >
                        {selectMode && (
                          <Checkbox size="small" checked={isSelected} onChange={() => toggleMsgSelected(m.id)} sx={{ p: 0.5 }} />
                        )}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                          {!isSent && (
                            <Typography variant="caption" sx={{ color: COLORS.vertFonce, ml: 1, fontWeight: 600 }}>{m.auteur_nom}</Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box
                              sx={{
                                px: 1.5, py: 1,
                                borderRadius: 2,
                                bgcolor: m.supprime_pour_tous ? (isSent ? `${COLORS.vert}55` : '#EDEDED') : (isSent ? COLORS.vert : 'white'),
                                color: m.supprime_pour_tous ? 'text.secondary' : (isSent ? 'white' : 'inherit'),
                                boxShadow: m.supprime_pour_tous ? 0 : 1,
                                fontStyle: m.supprime_pour_tous ? 'italic' : 'normal',
                              }}
                            >
                              {m.supprime_pour_tous ? (
                                <Typography variant="body2">Message supprimé</Typography>
                              ) : m.type_message === 'vocal' ? (
                                <Box component="audio" controls src={getMediaUrl(m.fichier_joint)} sx={{ height: 36, maxWidth: 240 }} />
                              ) : (
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.contenu}</Typography>
                              )}
                            </Box>
                            {!selectMode && !m.supprime_pour_tous && (
                              <IconButton size="small" onClick={(e) => handleOpenMsgMenu(e, m)} sx={{ p: 0.25 }}>
                                <MoreVert fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
                            {new Date(m.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      </Box>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {selectMode && selectedMsgCount > 0 && (
                <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, bgcolor: `${COLORS.vert}10`, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ mr: 'auto' }}>{selectedMsgCount} message(s) sélectionné(s)</Typography>
                  <Button
                    size="small" startIcon={<DeleteOutline />} disabled={deleting}
                    onClick={() => runDeleteMessages(Object.entries(selectedMsgIds).filter(([, v]) => v).map(([id]) => Number(id)), 'moi')}
                  >
                    Supprimer pour moi
                  </Button>
                  <Button
                    size="small" color="error" startIcon={<DeleteOutline />} disabled={deleting}
                    onClick={() => runDeleteMessages(Object.entries(selectedMsgIds).filter(([, v]) => v).map(([id]) => Number(id)), 'tous')}
                  >
                    Supprimer pour tout le monde
                  </Button>
                </Box>
              )}

              <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white' }}>
                {recording ? (
                  <>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main', animation: 'pulse 1s infinite' }} />
                      <Typography variant="body2">Enregistrement… {formatDuree(recordSeconds)}</Typography>
                    </Box>
                    <Button size="small" onClick={handleCancelRecording}>Annuler</Button>
                    <IconButton onClick={handleStopRecording} sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}>
                      <Stop fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Écrire un message…"
                      value={texte}
                      onChange={(e) => setTexte(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      disabled={sending}
                    />
                    {texte.trim() ? (
                      <IconButton onClick={handleSend} disabled={sending} sx={{ bgcolor: COLORS.vert, color: 'white', '&:hover': { bgcolor: COLORS.vertFonce } }}>
                        {sending ? <CircularProgress size={20} color="inherit" /> : <Send fontSize="small" />}
                      </IconButton>
                    ) : (
                      <Tooltip title="Message vocal">
                        <IconButton onClick={handleStartRecording} disabled={sending} sx={{ bgcolor: COLORS.vert, color: 'white', '&:hover': { bgcolor: COLORS.vertFonce } }}>
                          <Mic fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                )}
              </Box>
            </>
          )}
        </Box>
      </Paper>

      <Menu anchorEl={msgMenuAnchor} open={!!msgMenuAnchor} onClose={handleCloseMsgMenu}>
        <MenuItem
          onClick={() => { runDeleteMessages([msgMenuTarget.id], 'moi'); handleCloseMsgMenu() }}
        >
          Supprimer pour moi
        </MenuItem>
        {msgMenuTarget && (msgMenuTarget.auteur === user?.id || isSuperAdmin) && (
          <MenuItem
            onClick={() => { runDeleteMessages([msgMenuTarget.id], 'tous'); handleCloseMsgMenu() }}
            sx={{ color: 'error.main' }}
          >
            Supprimer pour tout le monde
          </MenuItem>
        )}
      </Menu>

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

      {/* Modification du canal (nom, description, photo) */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Modifier le canal</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={editPhotoPreview || getMediaUrl(selected?.photo)}
                sx={{ width: 84, height: 84, bgcolor: `${COLORS.vert}25`, color: COLORS.vertFonce, fontSize: '2rem' }}
              >
                <Tag fontSize="large" />
              </Avatar>
              <IconButton
                component="label"
                size="small"
                sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: COLORS.vert, color: 'white', '&:hover': { bgcolor: COLORS.vertFonce } }}
              >
                <PhotoCamera fontSize="small" />
                <input type="file" accept="image/*" hidden onChange={handleEditPhotoChange} />
              </IconButton>
            </Box>
          </Box>
          <TextField
            autoFocus fullWidth margin="dense" label="Nom du canal"
            value={editForm.nom}
            onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="Description (facultatif)" multiline minRows={2}
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)} disabled={savingEdit}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={savingEdit} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {savingEdit ? <CircularProgress size={20} color="inherit" /> : 'Enregistrer'}
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
