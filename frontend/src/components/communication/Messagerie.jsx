import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
  Divider,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Send, Search, AttachFile, Image as ImageIcon, Delete, MoreVert, ArrowBack } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getMediaUrl } from '../../services/media'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }

export default function Messagerie() {
  const { user } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [conversations, setConversations] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filePreview, setFilePreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null)
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState(null)
  const [deletingMessage, setDeletingMessage] = useState(false)
  const conversationsRef = useRef([])
  const lastLoadTimeRef = useRef(0)
  const searchTimeoutRef = useRef(null)

  const loadConversations = useCallback(() => {
    // Éviter les appels trop fréquents (debounce de 2 secondes minimum)
    const now = Date.now()
    if (now - lastLoadTimeRef.current < 2000) {
      return Promise.resolve()
    }
    lastLoadTimeRef.current = now
    
    setLoading(true)
    setMessage({ type: '', text: '' })
    return api.get('/communication/messages/conversations/')
      .then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        conversationsRef.current = convs
        setConversations(convs)
        if (convs.length === 0) {
          console.log('Aucun autre membre actif trouvé dans la base de données')
        } else {
          setMessage({ type: '', text: '' })
        }
      })
      .catch(async (err) => {
        console.error('Erreur lors du chargement des conversations:', err)
        // Si l'endpoint conversations n'existe pas (404), utiliser destinataires comme fallback
        if (err.response?.status === 404) {
          try {
            const { data } = await api.get('/communication/messages/destinataires/')
            // Convertir les destinataires en format conversations
            const convs = Array.isArray(data) ? data.map(u => ({
              contact_id: u.id,
              contact_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `Utilisateur #${u.id}`,
              contact_email: u.email || '',
              contact_photo: u.photo,
              contact_photo_updated_at: null,
              last_message: null,
              unread_count: 0,
              has_conversation: false,
            })) : []
            conversationsRef.current = convs
            setConversations(convs)
            setMessage({ type: '', text: '' })
            return
          } catch (fallbackErr) {
            console.error('Erreur avec le fallback destinataires:', fallbackErr)
          }
        }
        console.error('Détails de l\'erreur:', err.response?.data)
        const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Erreur lors du chargement des contacts'
        conversationsRef.current = []
        setConversations([])
        setMessage({ type: 'error', text: `Erreur: ${errorMsg}. Vérifiez la console pour plus de détails.` })
      })
      .finally(() => setLoading(false))
  }, [])

  const loadMessages = (contactId) => {
    if (!contactId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    // Filtrer les messages uniquement pour ce contact spécifique
    // Le backend filtre déjà par contact_id, mais on double-vérifie côté frontend
    api.get('/communication/messages/', { params: { contact_id: String(contactId) } })
      .then(({ data }) => {
        const msgs = data.results || data
        // Filtrer pour s'assurer qu'on n'affiche que les messages avec ce contact spécifique
        const contactIdNum = Number(contactId)
        const userIdNum = Number(user?.id)
        let messagesArray = Array.isArray(msgs) ? msgs.filter(msg => {
          // Le message doit être soit envoyé à ce contact, soit reçu de ce contact
          const expediteurId = Number(msg.expediteur)
          const destinataireId = Number(msg.destinataire)
          return (expediteurId === contactIdNum && destinataireId === userIdNum) ||
                 (expediteurId === userIdNum && destinataireId === contactIdNum)
        }) : []
        
        // Trier par date croissante pour afficher les plus anciens en haut et les plus récents en bas
        messagesArray.sort((a, b) => {
          const dateA = new Date(a.date_envoi).getTime()
          const dateB = new Date(b.date_envoi).getTime()
          return dateA - dateB
        })
        
        setMessages(messagesArray)
        // Faire défiler vers le bas après chargement (avec plusieurs tentatives pour s'assurer que le DOM est mis à jour)
        const scrollToBottom = () => {
          const messagesContainer = document.querySelector('[data-messages-container]')
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
          }
        }
        setTimeout(scrollToBottom, 100)
        setTimeout(scrollToBottom, 300)
        setTimeout(scrollToBottom, 500)
      })
      .catch((err) => {
        console.error('Erreur lors du chargement des messages:', err)
        setMessages([])
      })
      .finally(() => setLoadingMessages(false))
  }

  useEffect(() => {
    loadConversations()
    
    // Recharger les conversations périodiquement pour mettre à jour les derniers messages (augmenté à 60 secondes)
    const interval = setInterval(() => {
      if (!selectedContact) {
        loadConversations()
      }
    }, 60000) // Recharger toutes les 60 secondes si aucune conversation n'est sélectionnée
    
    // Recharger quand la page redevient visible (quand l'utilisateur revient sur l'onglet)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Attendre un peu avant de recharger pour éviter les appels multiples
        setTimeout(() => loadConversations(), 500)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadConversations, selectedContact])

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.contact_id)
    }
    // Ne pas recharger les conversations ici pour éviter les appels multiples
  }, [selectedContact])

  useEffect(() => {
    // Marquer toute la conversation comme lue en une seule requête (plus rapide)
    if (selectedContact && messages.length > 0) {
      const hasUnread = messages.some(m => !m.est_lu && m.expediteur === selectedContact.contact_id)
      if (hasUnread) {
        api.post('/communication/messages/marquer_conversation_lue/', { contact_id: selectedContact.contact_id })
          .then(() => {
            setMessages(prev => prev.map(m => (m.expediteur === selectedContact.contact_id ? { ...m, est_lu: true } : m)))
            setConversations(prev => prev.map(c => c.contact_id === selectedContact.contact_id ? { ...c, unread_count: 0 } : c))
          })
          .catch(() => {})
      }
    }
  }, [messages, selectedContact])

  // Scroller automatiquement vers le bas quand les messages changent
  useEffect(() => {
    if (messages.length > 0) {
      const scrollToBottom = () => {
        const messagesContainer = document.querySelector('[data-messages-container]')
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }
      // Plusieurs tentatives pour s'assurer que le DOM est mis à jour
      setTimeout(scrollToBottom, 50)
      setTimeout(scrollToBottom, 200)
      setTimeout(scrollToBottom, 400)
    }
  }, [messages])

  const handleSelectContact = (contact) => {
    setSelectedContact(contact)
    setNewMessage('')
    setFilePreview(null)
    setSelectedFile(null)
  }

  const handleSend = async () => {
    if (!selectedContact || (!newMessage.trim() && !selectedFile)) {
      setMessage({ type: 'error', text: 'Veuillez saisir un message ou joindre un fichier.' })
      return
    }

    // Vérifier qu'un seul contact est sélectionné
    if (!selectedContact.contact_id) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un contact.' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })
    
    // Sauvegarder le contenu du message avant l'envoi pour l'ajout optimiste
    const messageContent = newMessage.trim()
    const fileToSend = selectedFile
    
    // Créer un message optimiste (temporaire) pour l'affichage immédiat
    const tempMessage = {
      id: `temp-${Date.now()}`,
      expediteur: user?.id,
      destinataire: selectedContact.contact_id,
      expediteur_nom: user?.first_name || 'Moi',
      contenu: messageContent || 'Fichier joint',
      date_envoi: new Date().toISOString(),
      est_lu: false,
      fichier_joint: fileToSend ? fileToSend.name : null,
      isOptimistic: true, // Marqueur pour identifier les messages optimistes
    }
    
    // Ajouter le message optimiste immédiatement à l'état local
    setMessages(prev => {
      const newMessages = [...prev, tempMessage]
      // Trier par date croissante
      return newMessages.sort((a, b) => new Date(a.date_envoi).getTime() - new Date(b.date_envoi).getTime())
    })
    
    // Vider les champs immédiatement pour une meilleure UX
    setNewMessage('')
    setFilePreview(null)
    setSelectedFile(null)
    
    // Faire défiler vers le bas immédiatement
    setTimeout(() => {
      const messagesContainer = document.querySelector('[data-messages-container]')
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    }, 50)
    
    try {
      // S'assurer qu'on envoie à un seul destinataire
      const destinataireId = Number(selectedContact.contact_id)
      let response
      
      if (fileToSend) {
        const fd = new FormData()
        fd.append('destinataires', String(destinataireId))
        fd.append('sujet', `Message de ${user?.first_name || 'Moi'}`)
        fd.append('contenu', messageContent || 'Fichier joint')
        fd.append('fichier_joint', fileToSend)
        response = await api.post('/communication/messages/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        response = await api.post('/communication/messages/', {
          destinataires: [destinataireId],
          sujet: `Message de ${user?.first_name || 'Moi'}`,
          contenu: messageContent,
        })
      }
      
      // Récupérer le message réel depuis la réponse
      // La réponse peut être un objet unique ou un tableau avec un élément
      let realMessage = response.data
      if (Array.isArray(realMessage) && realMessage.length > 0) {
        realMessage = realMessage[0]
      } else if (realMessage.messages && Array.isArray(realMessage.messages) && realMessage.messages.length > 0) {
        // Si la réponse contient un champ 'messages' avec un tableau
        realMessage = realMessage.messages[0]
      }
      
      // Remplacer le message optimiste par le message réel seulement si on a un message valide
      if (realMessage && realMessage.id) {
        setMessages(prev => {
          // Retirer le message optimiste
          const withoutTemp = prev.filter(m => m.id !== tempMessage.id)
          // Vérifier si le message réel n'existe pas déjà (éviter les doublons)
          const exists = withoutTemp.some(m => m.id === realMessage.id)
          if (!exists) {
            // Ajouter le message réel
            const withReal = [...withoutTemp, realMessage]
            // Trier par date croissante
            return withReal.sort((a, b) => new Date(a.date_envoi).getTime() - new Date(b.date_envoi).getTime())
          }
          return withoutTemp.sort((a, b) => new Date(a.date_envoi).getTime() - new Date(b.date_envoi).getTime())
        })
      } else {
        // Si on n'a pas reçu le message réel, recharger les messages
        await loadMessages(selectedContact.contact_id)
      }
      
      // Recharger les conversations pour avoir les données à jour depuis le backend
      // Cela garantit que le last_message est correctement mis à jour
      await loadConversations()
      
      setMessage({ type: 'success', text: 'Message envoyé.' })
      
      // Faire défiler vers le bas après l'ajout du message réel
      setTimeout(() => {
        const messagesContainer = document.querySelector('[data-messages-container]')
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 100)
    } catch (err) {
      // En cas d'erreur, retirer le message optimiste
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      
      // Restaurer le message dans le champ de saisie
      setNewMessage(messageContent)
      if (fileToSend) {
        setSelectedFile(fileToSend)
        setFilePreview(URL.createObjectURL(fileToSend))
      }
      
      const d = err.response?.data?.detail || err.response?.data
      const errorMsg = typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur lors de l\'envoi')
      setMessage({ type: 'error', text: errorMsg })
      console.error('Erreur lors de l\'envoi du message:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMessage = async () => {
    if (!selectedMessageForDelete) return
    setDeletingMessage(true)
    setMessage({ type: '', text: '' })
    try {
      // Essayer d'abord avec DELETE standard (méthode destroy)
      let response
      try {
        response = await api.delete(`/communication/messages/${selectedMessageForDelete.id}/`)
      } catch (deleteErr) {
        // Si DELETE échoue (404), essayer avec l'action supprimer
        if (deleteErr.response?.status === 404) {
          response = await api.post(`/communication/messages/${selectedMessageForDelete.id}/supprimer/`)
        } else {
          throw deleteErr
        }
      }
      console.log('Message supprimé avec succès:', response?.data)
      setMessage({ type: 'success', text: 'Message supprimé.' })
      // Recharger les messages et conversations
      if (selectedContact) {
        await loadMessages(selectedContact.contact_id)
        loadConversations()
      }
      // Fermer le menu
      setMessageMenuAnchor(null)
      setSelectedMessageForDelete(null)
    } catch (err) {
      console.error('Erreur lors de la suppression du message:', err)
      const d = err.response?.data?.detail || err.response?.data
      let errorMsg = typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur lors de la suppression')
      // Si c'est une erreur 404, donner un message plus clair
      if (err.response?.status === 404) {
        errorMsg = 'Route de suppression non trouvée. Veuillez redémarrer le serveur Django.'
      }
      setMessage({ type: 'error', text: errorMsg })
      console.error('Détails de l\'erreur:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
    } finally {
      setDeletingMessage(false)
    }
  }

  const handleOpenMessageMenu = (event, msg) => {
    setMessageMenuAnchor(event.currentTarget)
    setSelectedMessageForDelete(msg)
  }

  const handleCloseMessageMenu = () => {
    setMessageMenuAnchor(null)
    setSelectedMessageForDelete(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Seules les images sont autorisées.' })
      return
    }
    setSelectedFile(file)
    setFilePreview(URL.createObjectURL(file))
    setMessage({ type: '', text: '' })
  }

  // Trier les conversations : celles avec des messages récents en premier, puis par nom
  const sortedConversations = [...conversations].sort((a, b) => {
    // Si les deux ont un dernier message, trier par date (plus récent en premier)
    if (a.last_message?.date_envoi && b.last_message?.date_envoi) {
      const dateA = new Date(a.last_message.date_envoi).getTime()
      const dateB = new Date(b.last_message.date_envoi).getTime()
      return dateB - dateA // Plus récent en premier
    }
    // Si seulement a a un message, a vient en premier
    if (a.last_message?.date_envoi && !b.last_message?.date_envoi) {
      return -1
    }
    // Si seulement b a un message, b vient en premier
    if (!a.last_message?.date_envoi && b.last_message?.date_envoi) {
      return 1
    }
    // Si aucun n'a de message, trier par nom alphabétique
    return a.contact_name.localeCompare(b.contact_name, 'fr', { sensitivity: 'base' })
  })

  // Utiliser useMemo pour éviter les recalculs inutiles avec debouncing sur la recherche
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) {
      return sortedConversations
    }
    const term = searchTerm.toLowerCase()
    return sortedConversations.filter(conv =>
      conv.contact_name.toLowerCase().includes(term) ||
      conv.contact_email.toLowerCase().includes(term)
    )
  }, [sortedConversations, searchTerm])

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const formatMessageTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    // Si c'est aujourd'hui, afficher seulement l'heure
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    // Si c'est hier
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (messageDate.getTime() === yesterday.getTime()) {
      return `Hier ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    }
    // Sinon, afficher la date complète
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  // Grouper les messages par date pour un meilleur historique - mémorisé pour éviter les recalculs
  const groupMessagesByDate = useCallback((msgs) => {
    if (!Array.isArray(msgs) || msgs.length === 0) {
      return []
    }
    
    // S'assurer que les messages sont triés par date croissante
    const sortedMsgs = [...msgs].sort((a, b) => {
      const dateA = new Date(a.date_envoi).getTime()
      const dateB = new Date(b.date_envoi).getTime()
      return dateA - dateB
    })
    
    const grouped = []
    let currentDate = null
    let currentGroup = []

    sortedMsgs.forEach((msg) => {
      const msgDate = new Date(msg.date_envoi)
      const dateKey = msgDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      
      if (dateKey !== currentDate) {
        if (currentGroup.length > 0) {
          grouped.push({ date: currentDate, messages: currentGroup })
        }
        currentDate = dateKey
        currentGroup = [msg]
      } else {
        currentGroup.push(msg)
      }
    })

    if (currentGroup.length > 0) {
      grouped.push({ date: currentDate, messages: currentGroup })
    }

    return grouped
  }, [])
  
  // Mémoriser les messages groupés pour éviter les recalculs
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages, groupMessagesByDate])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: { xs: 2, md: 3 } }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, fontSize: { xs: '1.5rem', md: '2rem' } }} gutterBottom>
            Messagerie
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce, fontSize: { xs: '0.75rem', md: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
            Communiquez avec tous les membres de la daara
          </Typography>
        </Box>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden', borderLeft: `4px solid ${COLORS.or}`, height: { xs: 'calc(100vh - 200px)', md: 'calc(100vh - 250px)' }, display: 'flex' }}>
        {/* Liste des contacts à gauche */}
        <Box sx={{ 
          width: { xs: selectedContact ? '0%' : '100%', md: '380px' }, 
          borderRight: { md: 1 }, 
          borderColor: 'divider', 
          display: { xs: selectedContact ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column', 
          bgcolor: '#f0f2f5',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
        }}>
          {/* Barre de recherche */}
          <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: 1, borderColor: 'divider', bgcolor: COLORS.vert, color: 'white' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: { xs: '0.875rem', md: '1rem' } }}>
              Tous les membres de la daara
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value
                setSearchTerm(value)
                // Debouncing pour améliorer les performances
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current)
                }
                searchTimeoutRef.current = setTimeout(() => {
                  // Le filtrage se fait déjà dans useMemo avec searchTerm
                }, 300)
              }}
              sx={{
                bgcolor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { border: 'none' },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: { xs: 18, md: 20 } }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Liste des conversations */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredConversations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Aucun contact trouvé</Typography>
            </Box>
          ) : (
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {filteredConversations.map((conv) => (
                <ListItem
                  key={conv.contact_id}
                  button
                  onClick={() => handleSelectContact(conv)}
                  selected={selectedContact?.contact_id === conv.contact_id}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: selectedContact?.contact_id === conv.contact_id ? '#e9edef' : 'transparent',
                    '&:hover': { bgcolor: '#f5f6f6' },
                    py: 1.5,
                    px: 2,
                  }}
                >
                  <ListItemAvatar>
                    <Badge badgeContent={conv.unread_count} color="error" invisible={conv.unread_count === 0}>
                      <Avatar
                        src={conv.contact_photo ? getMediaUrl(conv.contact_photo, conv.contact_photo_updated_at ? `v=${conv.contact_photo_updated_at}` : '') : null}
                        sx={{ 
                          bgcolor: COLORS.or, 
                          color: COLORS.vert,
                          width: { xs: 48, md: 56 },
                          height: { xs: 48, md: 56 },
                          fontSize: { xs: '1.25rem', md: '1.5rem' },
                          fontWeight: 600,
                        }}
                      >
                        {conv.contact_name[0]?.toUpperCase() || '?'}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          fontWeight={conv.unread_count > 0 ? 600 : 500}
                          sx={{ fontSize: '1rem', color: '#111b21' }}
                        >
                          {conv.contact_name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {conv.last_message && (conv.last_message.contenu || conv.last_message.fichier_joint) ? (
                            <Typography 
                              variant="body2" 
                              noWrap 
                              sx={{ 
                                maxWidth: '200px',
                                color: conv.unread_count > 0 ? '#111b21' : '#667781',
                                fontSize: '0.875rem',
                                fontWeight: conv.unread_count > 0 ? 500 : 400,
                              }}
                            >
                              {conv.last_message.fichier_joint ? '📎 Fichier joint' : (conv.last_message.contenu?.slice(0, 50) || '')}
                              {conv.last_message.contenu && conv.last_message.contenu.length > 50 ? '...' : ''}
                            </Typography>
                          ) : conv.has_conversation ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontStyle: 'italic',
                                color: '#667781',
                                fontSize: '0.875rem',
                              }}
                            >
                              Conversation démarrée
                            </Typography>
                          ) : (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontStyle: 'italic',
                                color: '#667781',
                                fontSize: '0.875rem',
                              }}
                            >
                              Appuyez pour commencer
                            </Typography>
                          )}
                        </Box>
                        {conv.last_message && conv.last_message.date_envoi && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              flexShrink: 0,
                              color: '#667781',
                              fontSize: '0.75rem',
                            }}
                          >
                            {formatTime(conv.last_message.date_envoi)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Zone de conversation à droite */}
        <Box sx={{ 
          flex: 1, 
          display: { xs: selectedContact ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column', 
          minWidth: 0,
          width: { xs: selectedContact ? '100%' : '0%', md: 'auto' },
          transition: 'width 0.3s ease',
        }}>
          {selectedContact ? (
            <>
              {/* En-tête de la conversation */}
              <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: 1, borderColor: 'divider', bgcolor: COLORS.vert, color: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
                  {isMobile && (
                    <IconButton
                      onClick={() => setSelectedContact(null)}
                      sx={{ color: 'white', mr: 0.5 }}
                    >
                      <ArrowBack />
                    </IconButton>
                  )}
                  <Avatar
                    src={selectedContact.contact_photo ? getMediaUrl(selectedContact.contact_photo, selectedContact.contact_photo_updated_at ? `v=${selectedContact.contact_photo_updated_at}` : '') : null}
                    sx={{ 
                      bgcolor: COLORS.or, 
                      color: COLORS.vert,
                      width: { xs: 40, md: 48 },
                      height: { xs: 40, md: 48 },
                      fontSize: { xs: '1rem', md: '1.25rem' },
                      fontWeight: 600,
                    }}
                  >
                    {selectedContact.contact_name[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }} noWrap>
                      {selectedContact.contact_name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap>
                      {selectedContact.contact_email}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Messages */}
              <Box 
                data-messages-container
                sx={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  p: { xs: 1, md: 2 }, 
                  bgcolor: '#e5ddd5', 
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 100 0 L 0 0 0 100\' fill=\'none\' stroke=\'%23d4c5b9\' stroke-width=\'1\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")' 
                }}
              >
                {loadingMessages ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">Aucun message. Commencez la conversation !</Typography>
                  </Box>
                ) : (
                  groupedMessages.map((group) => (
                      <Box key={group.date}>
                        {/* Séparateur de date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: { xs: 1, md: 2 } }}>
                          <Chip
                            label={group.date}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.9)',
                              fontWeight: 500,
                              fontSize: { xs: '0.65rem', md: '0.75rem' },
                            }}
                          />
                        </Box>
                        {/* Messages du groupe */}
                        {group.messages.map((msg) => {
                          const isSent = msg.expediteur === user?.id
                          return (
                            <Box
                              key={msg.id}
                              sx={{
                                display: 'flex',
                                justifyContent: isSent ? 'flex-end' : 'flex-start',
                                mb: 1.5,
                                position: 'relative',
                                '&:hover .message-actions': {
                                  opacity: 1,
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  maxWidth: { xs: '85%', md: '70%' },
                                  p: { xs: 1, md: 1.5 },
                                  borderRadius: 2,
                                  bgcolor: isSent ? COLORS.vert : 'white',
                                  color: isSent ? 'white' : 'text.primary',
                                  boxShadow: 1,
                                  position: 'relative',
                                }}
                              >
                                {/* Menu d'actions pour supprimer */}
                                {isSent && (
                                  <IconButton
                                    size="small"
                                    className="message-actions"
                                    onClick={(e) => handleOpenMessageMenu(e, msg)}
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      opacity: 0,
                                      transition: 'opacity 0.2s',
                                      color: isSent ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                      '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
                                    }}
                                  >
                                    <MoreVert fontSize="small" />
                                  </IconButton>
                                )}
                                {!isSent && (
                                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600, fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                                    {msg.expediteur_nom}
                                  </Typography>
                                )}
                                <Typography variant="body1" sx={{ 
                                  mb: msg.fichier_joint ? 1 : 0, 
                                  pr: isSent ? { xs: 2, md: 3 } : 0, 
                                  wordBreak: 'break-word',
                                  fontSize: { xs: '0.875rem', md: '1rem' },
                                }}>
                                  {msg.contenu}
                                </Typography>
                                {msg.fichier_joint && (
                                  <Box sx={{ mt: 1 }}>
                                    {msg.fichier_joint.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                      <Box
                                        component="img"
                                        src={getMediaUrl(msg.fichier_joint)}
                                        alt="Pièce jointe"
                                        onError={(e) => {
                                          // Si l'image ne charge pas (404), afficher un message
                                          const parent = e.target.parentNode
                                          const errorBox = document.createElement('div')
                                          errorBox.style.cssText = 'padding: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; color: inherit; font-size: 0.875rem; text-align: center;'
                                          errorBox.textContent = 'Image non disponible'
                                          parent.replaceChild(errorBox, e.target)
                                        }}
                                        sx={{ maxWidth: '100%', borderRadius: 1, maxHeight: 300, display: 'block' }}
                                      />
                                    ) : (
                                      <Button
                                        size="small"
                                        startIcon={<AttachFile />}
                                        href={getMediaUrl(msg.fichier_joint)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => {
                                          // Vérifier si le fichier existe avant d'ouvrir
                                          fetch(getMediaUrl(msg.fichier_joint), { method: 'HEAD' })
                                            .then((res) => {
                                              if (!res.ok) {
                                                e.preventDefault()
                                                setMessage({ type: 'error', text: 'Le fichier joint n\'est plus disponible.' })
                                              }
                                            })
                                            .catch(() => {
                                              e.preventDefault()
                                              setMessage({ type: 'error', text: 'Le fichier joint n\'est plus disponible.' })
                                            })
                                        }}
                                        sx={{ color: isSent ? 'white' : COLORS.vert }}
                                      >
                                        Voir le fichier
                                      </Button>
                                    )}
                                  </Box>
                                )}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                    {formatMessageTime(msg.date_envoi)}
                                  </Typography>
                                  {msg.est_lu && isSent && (
                                    <Typography variant="caption" sx={{ opacity: 0.7, ml: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                      ✓✓
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          )
                        })}
                      </Box>
                    ))
                )}
              </Box>

              {/* Zone de saisie */}
              <Box sx={{ p: { xs: 1, md: 2 }, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
                {filePreview && (
                  <Box sx={{ mb: 1, position: 'relative', display: 'inline-block' }}>
                    <Box component="img" src={filePreview} alt="Aperçu" sx={{ maxWidth: { xs: 100, md: 150 }, maxHeight: { xs: 100, md: 150 }, borderRadius: 1 }} />
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFilePreview(null)
                        setSelectedFile(null)
                      }}
                      sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                    >
                      ×
                    </IconButton>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, alignItems: 'flex-end' }}>
                  <IconButton component="label" sx={{ color: COLORS.vert, p: { xs: 0.5, md: 1 } }}>
                    <ImageIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
                    <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                  </IconButton>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Tapez un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: { xs: '0.875rem', md: '1rem' },
                      },
                    }}
                  />
                  <IconButton
                    onClick={handleSend}
                    disabled={saving || (!newMessage.trim() && !selectedFile)}
                    sx={{ 
                      bgcolor: COLORS.vert, 
                      color: 'white', 
                      p: { xs: 0.75, md: 1 },
                      '&:hover': { bgcolor: COLORS.vertFonce }, 
                      '&:disabled': { bgcolor: 'grey.300' } 
                    }}
                  >
                    {saving ? <CircularProgress size={20} /> : <Send sx={{ fontSize: { xs: 20, md: 24 } }} />}
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" color="text.secondary">
                Sélectionnez un contact pour commencer une conversation
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Menu pour supprimer un message */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleCloseMessageMenu}
      >
        <MenuItem
          onClick={handleDeleteMessage}
          disabled={deletingMessage}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          {deletingMessage ? 'Suppression...' : 'Supprimer le message'}
        </MenuItem>
      </Menu>
    </Box>
  )
}
