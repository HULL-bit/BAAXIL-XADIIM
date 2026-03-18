import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material'
import { Add, Favorite, FavoriteBorder, Bookmark, BookmarkBorder, Comment as CommentIcon } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

export default function News() {
  const { user } = useAuth()
  const canPost = useMemo(() => {
    const role = user?.role || ''
    return role === 'admin' || role === 'jewrin' || String(role).toLowerCase().startsWith('jewrine_')
  }, [user])

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [openCreate, setOpenCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titre: '', contenu: '', image: null, est_publiee: true })

  const [openComments, setOpenComments] = useState(false)
  const [activeNews, setActiveNews] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [openDetail, setOpenDetail] = useState(false)
  const [detailNews, setDetailNews] = useState(null)

  const loadList = () => {
    setLoading(true)
    api
      .get('/informations/news/')
      .then(({ data }) => setList(data.results || data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadList()
  }, [])

  const openCommentsFor = async (n) => {
    setActiveNews(n)
    setOpenComments(true)
    setLoadingComments(true)
    try {
      const { data } = await api.get(`/informations/news/${n.id}/comments/`)
      setComments(Array.isArray(data) ? data : [])
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const openDetailFor = (n) => {
    setDetailNews(n)
    setOpenDetail(true)
  }

  const handleCreate = async () => {
    const hasTitre = form.titre.trim().length > 0
    const hasContenu = form.contenu.trim().length > 0
    const hasImage = !!form.image
    if (!hasTitre && !hasContenu && !hasImage) {
      setMessage({ type: 'error', text: 'Ajoutez au moins un titre, un contenu ou une image.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const fd = new FormData()
      fd.append('titre', form.titre)
      fd.append('contenu', form.contenu)
      fd.append('est_publiee', String(!!form.est_publiee))
      if (form.image) fd.append('image', form.image)
      await api.post('/informations/news/', fd)
      setOpenCreate(false)
      setForm({ titre: '', contenu: '', image: null, est_publiee: true })
      setMessage({ type: 'success', text: 'News publiée.' })
      loadList()
    } catch (err) {
      const d = err.response?.data?.detail || 'Erreur lors de la publication.'
      setMessage({ type: 'error', text: typeof d === 'string' ? d : JSON.stringify(d) })
    } finally {
      setSaving(false)
    }
  }

  const toggleLike = async (n) => {
    try {
      if (n.liked) await api.post(`/informations/news/${n.id}/unlike/`)
      else await api.post(`/informations/news/${n.id}/like/`)
      loadList()
    } catch {}
  }

  const toggleSave = async (n) => {
    try {
      if (n.saved) await api.post(`/informations/news/${n.id}/unsave/`)
      else await api.post(`/informations/news/${n.id}/save/`)
      loadList()
    } catch {}
  }

  const addComment = async () => {
    if (!activeNews) return
    const txt = newComment.trim()
    if (!txt) return
    try {
      const { data } = await api.post(`/informations/news/${activeNews.id}/add_comment/`, { commentaire: txt })
      setComments((c) => [data, ...c])
      setNewComment('')
      loadList()
    } catch {}
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vertFonce, fontWeight: 700 }}>News</Typography>
          <Typography variant="body2" color="text.secondary">Actualités et informations</Typography>
        </Box>
        {canPost && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Publier
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : list.length === 0 ? (
        <Typography color="text.secondary">Aucune news.</Typography>
      ) : (
        <Stack spacing={2}>
          {list.map((n) => (
            <Card key={n.id} sx={{ borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2, overflow: 'hidden' }}>
              {n.image && (
                <CardMedia
                  component="img"
                  image={getMediaUrl(n.image)}
                  alt={n.titre}
                  sx={{ maxHeight: 220, objectFit: 'cover' }}
                />
              )}
              <CardContent>
                <Typography fontWeight={700} sx={{ mb: 0.5 }}>{n.titre}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {n.auteur_nom || '—'} • {n.date_creation ? new Date(n.date_creation).toLocaleString('fr-FR') : ''}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.contenu}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                  <IconButton onClick={() => toggleLike(n)} title="J'aime">
                    {n.liked ? <Favorite sx={{ color: '#e53935' }} /> : <FavoriteBorder />}
                  </IconButton>
                  <Typography component="span" variant="caption" sx={{ mr: 1 }}>
                    {n.likes_count || 0}
                  </Typography>

                  <IconButton onClick={() => openCommentsFor(n)} title="Commentaires">
                    <CommentIcon />
                  </IconButton>
                  <Typography component="span" variant="caption">
                    {n.comments_count || 0}
                  </Typography>
                </Box>
                <Box>
                  <Button size="small" onClick={() => openDetailFor(n)} sx={{ textTransform: 'none', mr: 1 }}>
                    Détails
                  </Button>
                  <IconButton onClick={() => toggleSave(n)} title="Enregistrer">
                    {n.saved ? <Bookmark sx={{ color: COLORS.vertFonce }} /> : <BookmarkBorder />}
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Publier une news</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} fullWidth required />
            <TextField label="Contenu" value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} fullWidth required multiline minRows={4} />
            <Button variant="outlined" component="label">
              Ajouter une image
              <input hidden type="file" accept="image/*" onChange={(e) => setForm((f) => ({ ...f, image: e.target.files?.[0] || null }))} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? <CircularProgress size={22} /> : 'Publier'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        {detailNews && (
          <>
            <DialogTitle>{detailNews.titre}</DialogTitle>
            <DialogContent dividers>
              {detailNews.image && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    component="img"
                    src={getMediaUrl(detailNews.image)}
                    alt={detailNews.titre}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: 500,
                      objectFit: 'contain',
                      borderRadius: 2,
                    }}
                  />
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {detailNews.auteur_nom || '—'} •{' '}
                {detailNews.date_creation ? new Date(detailNews.date_creation).toLocaleString('fr-FR') : ''}
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {detailNews.contenu}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetail(false)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={openComments} onClose={() => setOpenComments(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Commentaires</DialogTitle>
        <DialogContent>
          {loadingComments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={1.5} sx={{ py: 1 }}>
              <TextField
                label="Ajouter un commentaire"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Button variant="contained" onClick={addComment} sx={{ alignSelf: 'flex-end', bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                Envoyer
              </Button>
              <Divider />
              {comments.length === 0 ? (
                <Typography color="text.secondary">Aucun commentaire.</Typography>
              ) : (
                comments.map((c) => (
                  <Box key={c.id} sx={{ p: 1.25, border: '1px solid #00000010', borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {c.user_nom || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.date_creation ? new Date(c.date_creation).toLocaleString('fr-FR') : ''}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {c.commentaire}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenComments(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

