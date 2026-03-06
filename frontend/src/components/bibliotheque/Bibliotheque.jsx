import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Tabs,
  Tab,
  Grid,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { Add, MenuBook, Download, Visibility, Close, Edit, Delete, PictureAsPdf, AutoStories } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = {
  vert: '#2DA9E1',
  or: '#2DA9E1',
  vertFonce: '#0F4D71',
  beige: '#F4EAD5',
  beigeClair: '#faf5eb',
}

const CATEGORIES = [
  { value: 'alquran', label: 'ALQURAN', icon: '📖' },
  { value: 'qassida', label: 'QASSIDA', icon: '🎵' },
]

export default function Bibliotheque() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isSmall = useMediaQuery(theme.breakpoints.down(400))
  const { user } = useAuth()
  const isAdmin = user?.is_staff || user?.role === 'admin'

  const [tab, setTab] = useState(0)
  const [livres, setLivres] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openReader, setOpenReader] = useState(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nom: '', categorie: 'alquran', description: '' })
  const [pdfFile, setPdfFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(24)

  const loadLivres = useCallback(() => {
    const accumulate = (acc, data) => {
      const results = data.results || data || []
      const list = Array.isArray(results) ? results : []
      return [...acc, ...list]
    }
    return api
      .get('/bibliotheque/livres/', { params: { page_size: 200 } })
      .then(async ({ data }) => {
        let all = accumulate([], data)
        let nextUrl = data.next
        while (nextUrl) {
          const { data: nextData } = await api.get(nextUrl)
          all = accumulate(all, nextData)
          nextUrl = nextData?.next
        }
        setLivres(all)
        setVisibleCount(24)
      })
      .catch((err) => {
        setLivres([])
        if (err.response?.status === 404) {
          setMessage({
            type: 'error',
            text: 'Module Bibliothèque introuvable sur le serveur. Redéployez le backend (Render) pour activer la bibliothèque.',
          })
        }
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    loadLivres().finally(() => setLoading(false))
  }, [loadLivres])

  const livresByCategory = (cat) => livres.filter((l) => l.categorie === cat)
  const alquran = livresByCategory('alquran')
  const qassida = livresByCategory('qassida')
  const currentList = tab === 0 ? alquran : qassida
  const INITIAL_VISIBLE = 24
  const LOAD_MORE_STEP = 24
  const visibleList = currentList.slice(0, visibleCount)
  const hasMore = visibleCount < currentList.length
  const showLoadMore = currentList.length > INITIAL_VISIBLE && hasMore
  const resetVisibleCount = () => setVisibleCount(INITIAL_VISIBLE)

  const handleOpenForm = (livre = null) => {
    if (livre) {
      setForm({
        nom: livre.nom,
        categorie: livre.categorie,
        description: livre.description || '',
      })
      setEditingId(livre.id)
    } else {
      setForm({ nom: '', categorie: 'alquran', description: '' })
      setEditingId(null)
    }
    setPdfFile(null)
    setOpenForm(true)
  }

  const handleCloseForm = () => {
    setOpenForm(false)
    setForm({ nom: '', categorie: 'alquran', description: '' })
    setPdfFile(null)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!form.nom?.trim()) {
      setMessage({ type: 'error', text: 'Le nom du livre est requis.' })
      return
    }
    if (!editingId && !pdfFile) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier PDF pour un nouveau livre.' })
      return
    }
    if (pdfFile && pdfFile.size === 0) {
      setMessage({ type: 'error', text: 'Le fichier sélectionné est vide. Choisissez un autre PDF.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const fd = new FormData()
      fd.append('nom', form.nom.trim())
      fd.append('categorie', form.categorie)
      if (form.description) fd.append('description', form.description)
      if (pdfFile) fd.append('pdf', pdfFile)
      if (editingId) {
        await api.patch(`/bibliotheque/livres/${editingId}/`, fd)
        setMessage({ type: 'success', text: 'Livre modifié avec succès.' })
      } else {
        await api.post('/bibliotheque/livres/', fd)
        setMessage({ type: 'success', text: 'Livre ajouté avec succès.' })
      }
      handleCloseForm()
      loadLivres()
    } catch (err) {
      const status = err.response?.status
      const data = err.response?.data
      if (process.env.NODE_ENV !== 'production') {
        console.error('Bibliothèque enregistrement erreur:', status, data, err)
      }
      let msg = 'Erreur lors de l\'enregistrement.'
      if (status === 403) {
        msg = 'Seuls les administrateurs peuvent ajouter ou modifier des livres. Connectez-vous avec un compte administrateur.'
      } else if (status === 404) {
        msg = 'Module Bibliothèque introuvable sur le serveur. Redéployez le backend (Render) pour activer la bibliothèque.'
      } else if (data && typeof data === 'object' && !(data instanceof Blob)) {
        if (typeof data.detail === 'string') msg = data.detail
        else if (data.detail) msg = Array.isArray(data.detail) ? data.detail.join(' ') : String(data.detail)
        else {
          const parts = []
          for (const [k, v] of Object.entries(data)) {
            if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`)
            else if (v && typeof v === 'string') parts.push(`${k}: ${v}`)
            else if (v) parts.push(`${k}: ${String(v)}`)
          }
          if (parts.length) msg = parts.join(' — ')
        }
      } else if (status) {
        msg = `Erreur serveur (${status}). Réessayez ou contactez l'administrateur.`
      } else {
        msg = 'Vérifiez votre connexion et réessayez.'
      }
      setMessage({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce livre ?')) return
    try {
      await api.delete(`/bibliotheque/livres/${id}/`)
      setMessage({ type: 'success', text: 'Livre supprimé.' })
      loadLivres()
    } catch {
      setMessage({ type: 'error', text: 'Impossible de supprimer.' })
    }
  }

  const handleLire = async (livre) => {
    setOpenReader(livre)
    setPdfBlobUrl(null)
    setLoadingPdf(true)
    setMessage({ type: '', text: '' })
    try {
      const res = await api.get(`/bibliotheque/livres/${livre.id}/lire/`, {
        responseType: 'blob',
        validateStatus: () => true,
      })
      if (res.status !== 200) {
        const text = await (res.data instanceof Blob ? new Promise((ok) => {
          const r = new FileReader()
          r.onload = () => ok(r.result)
          r.readAsText(res.data)
        }) : Promise.resolve(String(res.data)))
        let errMsg = 'Impossible de charger le PDF.'
        try {
          const j = JSON.parse(text)
          if (j.detail) errMsg = j.detail
        } catch {
          if (text && text.length < 200) errMsg = text
        }
        setMessage({ type: 'error', text: errMsg })
        setOpenReader(null)
        return
      }
      const url = URL.createObjectURL(res.data)
      if (isMobile) {
        window.open(url, '_blank')
        setMessage({ type: 'success', text: 'PDF ouvert dans un nouvel onglet. Le défilement y fonctionne correctement.' })
        setOpenReader(null)
      } else {
        setPdfBlobUrl(url)
      }
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Impossible de charger le PDF. Vérifiez votre connexion.' })
      setOpenReader(null)
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleCloseReader = () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    setPdfBlobUrl(null)
    setOpenReader(null)
  }

  const handleTelecharger = async (livre) => {
    setMessage({ type: '', text: '' })
    try {
      const res = await api.get(`/bibliotheque/livres/${livre.id}/telecharger/`, {
        responseType: 'blob',
        validateStatus: () => true,
      })
      if (res.status !== 200) {
        const text = await (res.data instanceof Blob ? new Promise((ok) => {
          const r = new FileReader()
          r.onload = () => ok(r.result)
          r.readAsText(res.data)
        }) : Promise.resolve(String(res.data)))
        let errMsg = 'Impossible de télécharger le PDF.'
        try {
          const j = JSON.parse(text)
          if (j.detail) errMsg = j.detail
        } catch {
          if (text && text.length < 200) errMsg = text
        }
        setMessage({ type: 'error', text: errMsg })
        return
      }
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = (livre.nom || 'livre') + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
      loadLivres()
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Impossible de télécharger le PDF. Vérifiez votre connexion.' })
    }
  }

  return (
    <Box sx={{ minHeight: '100%', pb: 4, px: { xs: 1.5, sm: 2 }, pt: { xs: 1, sm: 0 } }}>
      {/* En-tête dynamique */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${COLORS.vert} 0%, ${COLORS.vertFonce} 50%, ${alpha(COLORS.vert, 0.95)} 100%)`,
          color: 'white',
          borderRadius: { xs: 2, sm: 3 },
          p: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 3 },
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 8px 32px ${alpha(COLORS.vert, 0.35)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 20% 80%, ${COLORS.or}33 0%, transparent 50%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 44, sm: 56 },
                height: { xs: 44, sm: 56 },
                borderRadius: 2,
                bgcolor: alpha('#fff', 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.8 } },
              }}
            >
              <AutoStories sx={{ fontSize: { xs: 26, sm: 32 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={800} sx={{ letterSpacing: '-0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.2)', fontSize: { xs: '1.25rem', sm: 'inherit' } }}>
                Bibliothèque
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.95, mt: 0.5, fontSize: { xs: '0.8rem', sm: 'inherit' } }}>
                Lisez en ligne ou téléchargez ALQURAN et QASSIDA
              </Typography>
            </Box>
          </Box>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenForm()}
              fullWidth={isMobile}
              sx={{
                bgcolor: COLORS.or,
                color: COLORS.vertFonce,
                fontWeight: 700,
                px: 2.5,
                py: { xs: 1.5, sm: 1.25 },
                minHeight: 44,
                borderRadius: 2,
                boxShadow: `0 4px 14px ${alpha(COLORS.or, 0.5)}`,
                '&:hover': {
                  bgcolor: alpha(COLORS.or, 0.9),
                  boxShadow: `0 6px 20px ${alpha(COLORS.or, 0.5)}`,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.25s ease',
              }}
            >
              Ajouter un livre
            </Button>
          )}
        </Box>
      </Box>

      {message.text && (
        <Alert
          severity={message.type === 'error' ? 'error' : 'success'}
          onClose={() => setMessage({ type: '', text: '' })}
          sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
        >
          {message.text}
        </Alert>
      )}

      {/* Onglets animés */}
      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); resetVisibleCount() }}
        variant={isMobile ? 'fullWidth' : 'standard'}
        sx={{
          mb: { xs: 2, sm: 3 },
          minHeight: 48,
          '& .MuiTabs-indicator': {
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${COLORS.vert}, ${COLORS.or})`,
          },
          '& .MuiTab-root': {
            fontWeight: 700,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            textTransform: 'none',
            transition: 'color 0.2s ease',
            minHeight: 48,
            py: 1.5,
          },
          '& .Mui-selected': { color: COLORS.vert },
        }}
      >
        <Tab label={isSmall ? `📖 ALQURAN` : `${CATEGORIES[0].icon} ALQURAN (${alquran.length})`} />
        <Tab label={isSmall ? `🎵 QASSIDA` : `${CATEGORIES[1].icon} QASSIDA (${qassida.length})`} />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: { xs: 6, sm: 8 } }}>
          <CircularProgress size={isMobile ? 40 : 48} sx={{ color: COLORS.vert, mb: 2 }} />
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: 'inherit' } }}>Chargement de la bibliothèque…</Typography>
        </Box>
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {visibleList.map((livre, index) => (
            <Grid item xs={12} sm={6} md={4} key={livre.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: { xs: 2, sm: 3 },
                  border: '1px solid',
                  borderColor: alpha(COLORS.vert, 0.15),
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  animation: visibleList.length <= 30 ? 'fadeInUp 0.4s ease-out forwards' : 'none',
                  animationDelay: index < 20 ? `${Math.min(index * 0.03, 0.4)}s` : '0s',
                  opacity: visibleList.length > 30 ? 1 : 0,
                  '@keyframes fadeInUp': {
                    '0%': { opacity: 0, transform: 'translateY(12px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                  },
                  '&:hover': {
                    transform: isMobile ? 'none' : 'translateY(-6px)',
                    boxShadow: isMobile ? undefined : `0 12px 40px ${alpha(COLORS.vert, 0.2)}`,
                    borderColor: alpha(COLORS.or, 0.4),
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2.5 } }}>
                  <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 } }}>
                    <Box
                      sx={{
                        width: { xs: 44, sm: 52 },
                        height: { xs: 60, sm: 72 },
                        borderRadius: 1.5,
                        bgcolor: alpha(COLORS.vert, 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: `2px solid ${alpha(COLORS.or, 0.3)}`,
                      }}
                    >
                      <PictureAsPdf sx={{ fontSize: { xs: 24, sm: 28 }, color: COLORS.vert }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} color={COLORS.vertFonce} sx={{ lineHeight: 1.3, fontSize: { xs: '0.95rem', sm: 'inherit' } }}>
                        {livre.nom}
                      </Typography>
                      {livre.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.4, fontSize: { xs: '0.8rem', sm: 'inherit' } }}>
                          {livre.description.slice(0, isMobile ? 60 : 90)}
                          {livre.description.length > (isMobile ? 60 : 90) ? '…' : ''}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontSize: { xs: '0.7rem', sm: 'inherit' } }}>
                        {livre.telechargements} téléchargement(s) · {livre.vues} lecture(s)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.75 }, p: { xs: 1.5, sm: 2 }, pt: 0, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, order: 1 }}>
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<Visibility />}
                      onClick={() => handleLire(livre)}
                      fullWidth={isMobile}
                      sx={{
                        minHeight: 44,
                        bgcolor: COLORS.vert,
                        fontWeight: 600,
                        borderRadius: 2,
                        px: 2,
                        flex: isMobile ? undefined : 1,
                        boxShadow: `0 4px 12px ${alpha(COLORS.vert, 0.35)}`,
                        '&:hover': {
                          bgcolor: COLORS.vertFonce,
                          transform: 'scale(1.02)',
                          boxShadow: `0 6px 16px ${alpha(COLORS.vert, 0.4)}`,
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Lire en ligne
                    </Button>
                    <Button
                      variant="outlined"
                      size="medium"
                      startIcon={<Download />}
                      onClick={() => handleTelecharger(livre)}
                      fullWidth={isMobile}
                      sx={{
                        minHeight: 44,
                        borderColor: COLORS.or,
                        color: COLORS.vertFonce,
                        fontWeight: 600,
                        borderRadius: 2,
                        px: 2,
                        flex: isMobile ? undefined : 1,
                        '&:hover': {
                          borderColor: COLORS.vert,
                          bgcolor: alpha(COLORS.vert, 0.06),
                          transform: 'scale(1.02)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Télécharger
                    </Button>
                  </Box>
                  {isAdmin && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', order: 2, minHeight: 44, alignItems: 'center' }}>
                      <IconButton size="medium" onClick={() => handleOpenForm(livre)} sx={{ color: COLORS.vertFonce }} title="Modifier" aria-label="Modifier">
                        <Edit />
                      </IconButton>
                      <IconButton size="medium" onClick={() => handleDelete(livre.id)} color="error" title="Supprimer" aria-label="Supprimer">
                        <Delete />
                      </IconButton>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && showLoadMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setVisibleCount((v) => Math.min(v + LOAD_MORE_STEP, currentList.length))}
            sx={{
              borderColor: COLORS.vert,
              color: COLORS.vert,
              fontWeight: 600,
              '&:hover': { borderColor: COLORS.vertFonce, bgcolor: alpha(COLORS.vert, 0.06) },
            }}
          >
            Voir plus ({Math.min(LOAD_MORE_STEP, currentList.length - visibleCount)} de plus)
          </Button>
        </Box>
      )}

      {!loading && currentList.length > 0 && !showLoadMore && currentList.length > INITIAL_VISIBLE && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          Tous les ouvrages sont affichés ({currentList.length})
        </Typography>
      )}

      {!loading && currentList.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: { xs: 5, sm: 8 },
            px: 2,
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: alpha(COLORS.vert, 0.04),
            border: `2px dashed ${alpha(COLORS.vert, 0.2)}`,
          }}
        >
          <MenuBook sx={{ fontSize: { xs: 48, sm: 64 }, color: alpha(COLORS.vert, 0.3), mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: 'inherit' } }}>
            Aucun livre dans cette catégorie
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: 'inherit' } }}>
            {tab === 0 ? 'Les ouvrages ALQURAN apparaîtront ici.' : 'Les ouvrages QASSIDA apparaîtront ici.'}
          </Typography>
        </Box>
      )}

      {/* Formulaire ajout/édition (admin) */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, m: isMobile ? 0 : 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: COLORS.vertFonce, fontSize: { xs: '1.1rem', sm: 'inherit' }, py: { xs: 1.5, sm: 2 } }}>
          {editingId ? 'Modifier le livre' : 'Ajouter un livre'}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <TextField
            label="Nom du livre"
            fullWidth
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            margin="normal"
            required
          />
          <TextField
            select
            label="Catégorie"
            fullWidth
            value={form.categorie}
            onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
            margin="normal"
            SelectProps={{ native: true }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </TextField>
          <TextField
            label="Description (optionnel)"
            fullWidth
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            margin="normal"
          />
          <Button variant="outlined" component="label" sx={{ mt: 1 }}>
            {editingId ? 'Remplacer le PDF (optionnel)' : 'Choisir le PDF'}
            <input type="file" accept=".pdf,application/pdf" hidden onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          </Button>
          {pdfFile && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{pdfFile.name}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 }, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={handleCloseForm} sx={{ minHeight: 44 }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce }, minHeight: 44 }}
          >
            {saving ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lecteur PDF — plein écran, défilement tactile OK sur mobile */}
      <Dialog
        open={!!openReader}
        onClose={handleCloseReader}
        maxWidth={false}
        fullWidth
        fullScreen
        PaperProps={{
          sx: {
            borderRadius: 0,
            bgcolor: '#1a1a1a',
            maxHeight: { xs: '100dvh', sm: '100vh' },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 1.5 },
            bgcolor: alpha(COLORS.vertFonce, 0.98),
            color: 'white',
            minHeight: 56,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            <PictureAsPdf sx={{ fontSize: { xs: 22, sm: 28 }, flexShrink: 0 }} />
            <Typography variant="h6" fontWeight={700} noWrap sx={{ fontSize: { xs: '0.95rem', sm: 'inherit' } }}>
              {openReader?.nom}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            {pdfBlobUrl && isMobile && (
              <Button
                size="small"
                onClick={() => pdfBlobUrl && window.open(pdfBlobUrl, '_blank')}
                sx={{ color: COLORS.or, fontWeight: 600, mr: 0.5 }}
              >
                Ouvrir en onglet
              </Button>
            )}
            <IconButton
              onClick={() => openReader && handleTelecharger(openReader)}
              sx={{ color: COLORS.or }}
              size="medium"
              title="Télécharger"
              aria-label="Télécharger"
            >
              <Download />
            </IconButton>
            <IconButton onClick={handleCloseReader} sx={{ color: 'white' }} size="large" aria-label="Fermer">
              <Close />
            </IconButton>
          </Box>
        </Box>
        <DialogContent
          sx={{
            p: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: '#2d2d2d',
            height: { xs: 'calc(100dvh - 56px)', sm: 'calc(100vh - 56px)' },
          }}
        >
          {loadingPdf && (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: 2 }}>
              <CircularProgress size={56} sx={{ color: COLORS.or }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>Ouverture du document…</Typography>
            </Box>
          )}
          {pdfBlobUrl && !loadingPdf && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y pinch-zoom',
              }}
            >
              <iframe
                title={openReader?.nom}
                src={pdfBlobUrl}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  minHeight: '100%',
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
