import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Checkbox,
  Chip,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Link,
  Fade,
} from '@mui/material'
import { Add, Edit, Delete, LibraryBooks, Folder, Groups, Event, PhotoLibrary, Collections, EventAvailable, Person, Search, Download, Description, PlayArrow, OpenInNew } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', vertFonce: '#0F4D71' }
const getLienSon = (a) => (a?.lien_telegramme_du_son || a?.lienTelegrammeDuSon || '').trim()
const toAbsoluteUrl = (url) => {
  const u = (url || '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}
const TYPES_DOC = [
  { value: 'livre', label: 'Livre' },
  { value: 'article', label: 'Article' },
  { value: 'these', label: 'Thèse' },
  { value: 'memoire', label: 'Mémoire' },
  { value: 'rapport', label: 'Rapport' },
  { value: 'guide', label: 'Guide' },
  { value: 'autre', label: 'Autre' },
]

export default function Conservatoire() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  // Vérifier si l'utilisateur est admin ou jewrin conservatoire
  const canManage = isAdmin || user?.role === 'jewrin' || user?.role === 'jewrine_conservatoire'
  const [tab, setTab] = useState(0)
  const [documents, setDocuments] = useState([])
  const [archives, setArchives] = useState([])
  const [categories, setCategories] = useState([])
  const [kourels, setKourels] = useState([])
  const [seances, setSeances] = useState([])
  const [albums, setAlbums] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openDoc, setOpenDoc] = useState(false)
  const [openArchive, setOpenArchive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formDoc, setFormDoc] = useState({ titre: '', auteur: '', description: '' })
  const [formArchive, setFormArchive] = useState({ titre: '', evenement: '', date_evenement: '', lien_telegramme_du_son: '', description: '' })
  const [formKourel, setFormKourel] = useState({ nom: '', description: '', membres: [], maitre_de_coeur: '' })
  const [formSeance, setFormSeance] = useState({
    kourel: '',
    type_seance: 'repetition',
    titre: '',
    description: '',
    date_heure: '',
    heure_fin: '',
    lieu: '',
    khassidas: [],
  })
  const [openRapportExport, setOpenRapportExport] = useState(false)
  const [rapportExport, setRapportExport] = useState({ format: 'excel' })
  const [exportingRapport, setExportingRapport] = useState(false)
  const [openPresences, setOpenPresences] = useState(null)
  const [statsMembres, setStatsMembres] = useState([])
  const [expandedSeance, setExpandedSeance] = useState(null)
  const [filterPresences, setFilterPresences] = useState({ search: '', dateDebut: '', dateFin: '', kourel: '', typeSeance: '', membre: '' })
  const [presencesForm, setPresencesForm] = useState({})
  const [savingPresences, setSavingPresences] = useState(false)
  const [fileDoc, setFileDoc] = useState(null)
  const [openKourel, setOpenKourel] = useState(false)
  const [openSeance, setOpenSeance] = useState(false)
  const [openAlbum, setOpenAlbum] = useState(false)
  const [openPhoto, setOpenPhoto] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [formAlbum, setFormAlbum] = useState({ titre: '', description: '', date_evenement: '', est_public: true })
  const [formPhoto, setFormPhoto] = useState({ album: '', titre: '', description: '', lieu: '' })
  const [albumFile, setAlbumFile] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)

  const loadDocs = () => api.get('/conservatoire/documents/').then(({ data }) => setDocuments(data.results || data)).catch(() => setDocuments([]))
  const loadArchives = () => api.get('/conservatoire/archives/').then(({ data }) => setArchives(data.results || data)).catch(() => setArchives([]))
  const loadCategories = () => api.get('/conservatoire/categories/').then(({ data }) => setCategories(data.results || data)).catch(() => setCategories([]))
  const loadKourels = () => api.get('/conservatoire/kourels/').then(({ data }) => setKourels(data.results || data)).catch(() => setKourels([]))
  const loadSeances = () => api.get('/conservatoire/seances/').then(({ data }) => setSeances(data.results || data)).catch(() => setSeances([]))
  const loadAlbums = () => api.get('/conservatoire/albums/').then(({ data }) => setAlbums(data.results || data)).catch(() => setAlbums([]))
  const loadUsers = () => api.get('/auth/users/').then(({ data }) => setUsers(data.results || data || [])).catch(() => setUsers([]))
  const loadKourelDetail = (id) => api.get(`/conservatoire/kourels/${id}/`).then(({ data }) => data).catch(() => null)

  const loadStatsMembres = () => api.get('/conservatoire/presences/stats_membres/').then(({ data }) => setStatsMembres(Array.isArray(data) ? data : (data?.results || []))).catch(() => setStatsMembres([]))
  const loadAll = () => {
    setLoading(true)
    // Premier batch : données affichées en premier (onglets 0–2) pour un affichage plus rapide
    Promise.all([loadDocs(), loadKourels(), loadSeances()])
      .then(() => {
        setLoading(false)
        // Second batch en arrière-plan (archives, catégories, albums)
        Promise.all([loadArchives(), loadCategories(), loadAlbums()]).catch(() => {})
      })
      .catch(() => setLoading(false))
  }
  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (tab === 4) loadStatsMembres() }, [tab])
  useEffect(() => { if (canManage) loadCategories() }, [canManage])
  useEffect(() => { if (canManage) loadUsers() }, [canManage])

  const handleSaveDoc = async () => {
    if (!formDoc.titre || !formDoc.auteur) {
      setMessage({ type: 'error', text: 'Nom (titre) et auteur sont requis.' })
      return
    }
    if (!editingId && !fileDoc) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier à télécharger.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      if (editingId) {
        const payload = { 
          ...formDoc,
          type_document: 'autre', // Valeur par défaut pour éviter l'erreur
        }
        await api.patch(`/conservatoire/documents/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Document modifié avec succès.' })
      } else {
        const fd = new FormData()
        // Ajouter les champs du formulaire
        Object.entries(formDoc).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') {
            fd.append(k, v)
          }
        })
        // Ajouter type_document par défaut si non fourni
        if (!formDoc.type_document) {
          fd.append('type_document', 'autre')
        }
        if (fileDoc) {
          fd.append('fichier', fileDoc)
        }
        await api.post('/conservatoire/documents/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setMessage({ type: 'success', text: 'Document ajouté avec succès. Tous les membres peuvent maintenant le télécharger.' })
      }
      loadDocs()
      setOpenDoc(false)
      setEditingId(null)
      setFileDoc(null)
      setFormDoc({ titre: '', auteur: '', description: '' })
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      const errorMsg = typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur lors de l\'enregistrement')
      setMessage({ type: 'error', text: errorMsg })
      console.error('Erreur lors de l\'enregistrement du document:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveArchive = async () => {
    if (!formArchive.titre || !formArchive.lien_telegramme_du_son?.trim()) {
      setMessage({ type: 'error', text: 'Titre et lien Telegram du son sont requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const dateVal = formArchive.date_evenement || null
      const annee = dateVal ? new Date(dateVal).getFullYear() : null
      const payload = {
        titre: String(formArchive.titre || '').trim(),
        evenement: String(formArchive.evenement ?? '').trim(),
        type_archive: 'autre',
        date_evenement: dateVal,
        annee,
        lien_telegramme_du_son: String(formArchive.lien_telegramme_du_son ?? '').trim(),
        description: String(formArchive.description ?? '').trim(),
      }
      let saved
      if (editingId) {
        const { data } = await api.patch(`/conservatoire/archives/${editingId}/`, payload)
        saved = { ...data, evenement: payload.evenement, lien_telegramme_du_son: payload.lien_telegramme_du_son }
        setMessage({ type: 'success', text: 'Entrée du répertoire modifiée.' })
      } else {
        const { data } = await api.post('/conservatoire/archives/', payload)
        saved = { ...data, evenement: payload.evenement, lien_telegramme_du_son: payload.lien_telegramme_du_son }
        setMessage({ type: 'success', text: 'Entrée ajoutée au répertoire.' })
      }
      setArchives((prev) => {
        if (editingId) {
          return prev.map((a) => (a.id === saved.id ? { ...a, ...saved } : a))
        }
        return [{ ...saved }, ...prev]
      })
      setOpenArchive(false)
      setEditingId(null)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDoc = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/documents/${deleteTarget.id}/`)
      setMessage({ type: 'success', text: 'Document supprimé.' })
      loadDocs()
      setDeleteTarget(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteArchive = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/archives/${deleteTarget.id}/`)
      setMessage({ type: 'success', text: 'Entrée du répertoire supprimée.' })
      loadArchives()
      setDeleteTarget(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveKourel = async () => {
    if (!formKourel.nom) {
      setMessage({ type: 'error', text: 'Nom requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = { ...formKourel, membres: formKourel.membres, maitre_de_coeur: formKourel.maitre_de_coeur || null }
      if (editingId) {
        await api.patch(`/conservatoire/kourels/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Kourel modifié.' })
      } else {
        await api.post('/conservatoire/kourels/', payload)
        setMessage({ type: 'success', text: 'Kourel créé.' })
      }
      loadKourels()
      setOpenKourel(false)
      setEditingId(null)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const addKhassidaRow = () => {
    setFormSeance((f) => ({ ...f, khassidas: [...(f.khassidas || []), { nom_khassida: '', dathie: '', khassida_portion: '' }] }))
  }
  const removeKhassidaRow = (idx) => {
    setFormSeance((f) => ({ ...f, khassidas: (f.khassidas || []).filter((_, i) => i !== idx) }))
  }
  const updateKhassidaRow = (idx, field, value) => {
    setFormSeance((f) => {
      const k = [...(f.khassidas || [])]
      k[idx] = { ...(k[idx] || {}), [field]: value }
      return { ...f, khassidas: k }
    })
  }

  const handleSaveSeance = async () => {
    if (!formSeance.kourel || !formSeance.titre || !formSeance.date_heure) {
      setMessage({ type: 'error', text: 'Kourel, titre et date/heure requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = {
        kourel: formSeance.kourel,
        type_seance: formSeance.type_seance,
        titre: formSeance.titre,
        description: formSeance.description || '',
        date_heure: formSeance.date_heure,
        heure_fin: formSeance.heure_fin || null,
        lieu: formSeance.lieu || '',
      }
      let seanceId = editingId
      if (editingId) {
        await api.patch(`/conservatoire/seances/${editingId}/`, payload)
        seanceId = editingId
        setMessage({ type: 'success', text: 'Séance modifiée.' })
      } else {
        const { data } = await api.post('/conservatoire/seances/', payload)
        seanceId = data.id
        setMessage({ type: 'success', text: 'Séance créée.' })
      }
      const khassidas = (formSeance.khassidas || []).filter((k) => (k.nom_khassida || '').trim() && (k.dathie || '').trim())
      if (khassidas.length > 0 && seanceId) {
        await api.post(`/conservatoire/seances/${seanceId}/khassidas/`, {
          khassidas: khassidas.map((k, i) => ({
            nom_khassida: (k.nom_khassida || '').trim(),
            dathie: (k.dathie || '').trim(),
            khassida_portion: (k.khassida_portion || '').trim(),
            ordre: i,
          })),
        })
      }
      loadSeances()
      setOpenSeance(false)
      setEditingId(null)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleExportRapport = async () => {
    const { format } = rapportExport
    setExportingRapport(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.get('/conservatoire/seances/rapport-export/', {
        params: { format },
        responseType: 'blob',
      })
      const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `rapport_seances_toutes.${ext}`)
      link.click()
      window.URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'Rapport exporté.' })
      setOpenRapportExport(false)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'export.' })
    } finally { setExportingRapport(false) }
  }

  const handleOpenPresences = async (seance) => {
    let membreIds = []
    const kourel = kourels.find((k) => k.id === seance.kourel)
    if (kourel && Array.isArray(kourel.membres) && kourel.membres.length > 0) {
      membreIds = kourel.membres
    } else {
      try {
        const { data } = await api.get(`/conservatoire/kourels/${seance.kourel}/`)
        membreIds = data.membres || []
      } catch {
        membreIds = []
      }
    }
    const existing = (seance.presences || []).reduce((acc, p) => {
      acc[p.membre] = { statut: p.statut, remarque: p.remarque || '' }
      return acc
    }, {})
    const initial = {}
    membreIds.forEach((mid) => {
      initial[mid] = existing[mid] || { statut: 'present', remarque: '' }
    })
    setPresencesForm(initial)
    setOpenPresences(seance)
  }

  const handleSavePresences = async () => {
    if (!openPresences) return
    setSavingPresences(true)
    setMessage({ type: '', text: '' })
    try {
      const presences = Object.entries(presencesForm).map(([membre, v]) => ({
        membre: Number(membre),
        statut: v.statut || 'present',
        remarque: v.remarque || '',
      }))
      await api.post(`/conservatoire/seances/${openPresences.id}/presences/`, { presences })
      setMessage({ type: 'success', text: 'Présences enregistrées.' })
      loadSeances()
      setOpenPresences(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' })
    } finally { setSavingPresences(false) }
  }

  const handleDeleteKourel = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/kourels/${deleteTarget.id}/`)
      setMessage({ type: 'success', text: 'Kourel supprimé.' })
      loadKourels()
      setDeleteTarget(null)
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' }) }
    finally { setSaving(false) }
  }

  const handleDeleteSeance = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/seances/${deleteTarget.id}/`)
      setMessage({ type: 'success', text: 'Séance supprimée.' })
      loadSeances()
      setDeleteTarget(null)
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' }) }
    finally { setSaving(false) }
  }

  const handleSaveAlbum = async () => {
    if (!formAlbum.titre || !formAlbum.date_evenement) {
      setMessage({ type: 'error', text: 'Titre et date requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      if (editingId) {
        const payload = { ...formAlbum }
        if (albumFile) {
          const fd = new FormData()
          Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ''))
          fd.append('couverture', albumFile)
          await api.patch(`/conservatoire/albums/${editingId}/`, fd)
        } else {
          await api.patch(`/conservatoire/albums/${editingId}/`, payload)
        }
        setMessage({ type: 'success', text: 'Album modifié.' })
      } else {
        const fd = new FormData()
        Object.entries(formAlbum).forEach(([k, v]) => fd.append(k, v ?? ''))
        if (albumFile) fd.append('couverture', albumFile)
        await api.post('/conservatoire/albums/', fd)
        setMessage({ type: 'success', text: 'Album créé.' })
      }
      loadAlbums()
      setOpenAlbum(false)
      setEditingId(null)
      setAlbumFile(null)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleSavePhoto = async () => {
    if (!formPhoto.album) {
      setMessage({ type: 'error', text: 'Sélectionnez un album.' })
      return
    }
    if (!photoFile) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner une photo.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const fd = new FormData()
      fd.append('album', formPhoto.album)
      fd.append('fichier', photoFile)
      if (formPhoto.titre) fd.append('titre', formPhoto.titre)
      if (formPhoto.description) fd.append('description', formPhoto.description)
      if (formPhoto.lieu) fd.append('lieu', formPhoto.lieu)
      await api.post('/conservatoire/photos/', fd)
      setMessage({ type: 'success', text: 'Photo ajoutée.' })
      await loadAlbums()
      if (selectedAlbum && Number(formPhoto.album) === selectedAlbum.id) {
        const { data } = await api.get(`/conservatoire/albums/${selectedAlbum.id}/`)
        setSelectedAlbum(data)
      }
      setOpenPhoto(false)
      setPhotoFile(null)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleDeleteAlbum = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/albums/${deleteTarget.id}/`)
      setMessage({ type: 'success', text: 'Album supprimé.' })
      loadAlbums()
      setDeleteTarget(null)
      setSelectedAlbum(null)
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' }) }
    finally { setSaving(false) }
  }

  const handleDeletePhoto = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/photos/${deleteTarget.id}/`)
      setMessage({ type: 'success', text: 'Photo supprimée.' })
      await loadAlbums()
      if (selectedAlbum) {
        const { data } = await api.get(`/conservatoire/albums/${selectedAlbum.id}/`)
        setSelectedAlbum(data)
      }
      setDeleteTarget(null)
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' }) }
    finally { setSaving(false) }
  }

  const getImageUrl = (path) => getMediaUrl(path)

  // Statistiques de présence par membre, séparées répétitions / prestations et global
  const enrichedStatsMembres = useMemo(() => {
    const byId = {}

    // Point de départ : stats globales renvoyées par l'API
    statsMembres.forEach((m) => {
      byId[m.membre_id] = {
        ...m,
        rep_presents: 0,
        rep_absents: 0,
        rep_total: 0,
        rep_pourcentage: 0,
        prest_presents: 0,
        prest_absents: 0,
        prest_total: 0,
        prest_pourcentage: 0,
      }
    })

    // Compléter avec les séances + présences pour séparer répétitions / prestations
    seances.forEach((s) => {
      const type = s.type_seance // 'repetition' ou 'prestation'
      const presences = s.presences || []
      presences.forEach((p) => {
        const id = p.membre
        if (!byId[id]) {
          byId[id] = {
            membre_id: id,
            membre_nom: p.membre_nom || `#${id}`,
            nb_presents: 0,
            nb_absents: 0,
            nb_total: 0,
            pourcentage: 0,
            rep_presents: 0,
            rep_absents: 0,
            rep_total: 0,
            rep_pourcentage: 0,
            prest_presents: 0,
            prest_absents: 0,
            prest_total: 0,
            prest_pourcentage: 0,
          }
        }
        const entry = byId[id]
        const isPresent = p.statut === 'present'
        const isAbsent = p.statut === 'absent_non_justifie' || p.statut === 'absent_justifie'

        if (isPresent) entry.nb_presents += 1
        if (isAbsent) entry.nb_absents += 1
        if (isPresent || isAbsent) entry.nb_total += 1

        if (type === 'repetition') {
          if (isPresent) entry.rep_presents += 1
          if (isAbsent) entry.rep_absents += 1
          if (isPresent || isAbsent) entry.rep_total += 1
        } else if (type === 'prestation') {
          if (isPresent) entry.prest_presents += 1
          if (isAbsent) entry.prest_absents += 1
          if (isPresent || isAbsent) entry.prest_total += 1
        }
      })
    })

    return Object.values(byId).map((m) => {
      const total = m.nb_total || (m.nb_presents + m.nb_absents)
      const pourcentage =
        total > 0 ? Math.round((m.nb_presents / total) * 100) : (m.pourcentage || 0)

      const repTotal = m.rep_total || (m.rep_presents + m.rep_absents)
      const repPourcentage =
        repTotal > 0 ? Math.round((m.rep_presents / repTotal) * 100) : 0

      const prestTotal = m.prest_total || (m.prest_presents + m.prest_absents)
      const prestPourcentage =
        prestTotal > 0 ? Math.round((m.prest_presents / prestTotal) * 100) : 0

      return {
        ...m,
        nb_total: total,
        pourcentage,
        rep_total: repTotal,
        rep_pourcentage: repPourcentage,
        prest_total: prestTotal,
        prest_pourcentage: prestPourcentage,
      }
    })
  }, [statsMembres, seances])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Conservatoire</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Bibliothèque numérique, répertoire</Typography>
        </Box>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      <Paper sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<LibraryBooks />} iconPosition="start" label={`Documents (${documents.length})`} />
          <Tab icon={<Folder />} iconPosition="start" label={`Répertoire (${archives.length})`} />
          <Tab icon={<Groups />} iconPosition="start" label={`Kourels (${kourels.length})`} />
          <Tab icon={<Event />} iconPosition="start" label={`Séances (${seances.length})`} />
          <Tab icon={<EventAvailable />} iconPosition="start" label="Présences" />
          <Tab icon={<PhotoLibrary />} iconPosition="start" label={`Galerie (${albums.length})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : tab === 0 ? ( /* Documents */
          <Box sx={{ p: 2 }}>
            {canManage && (
              <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingId(null); setFormDoc({ titre: '', auteur: '', description: '' }); setFileDoc(null); setOpenDoc(true) }} sx={{ mb: 2, bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                Ajouter un document
              </Button>
            )}
            {documents.length === 0 ? (
              <Typography color="text.secondary">Aucun document disponible.</Typography>
            ) : (
              <Grid container spacing={2}>
                {documents.map((d) => (
                  <Grid item xs={12} sm={6} md={4} key={d.id}>
                    <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ color: COLORS.vert, mb: 1, fontWeight: 600 }}>
                          {d.titre}
                        </Typography>
                        <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 1 }}>
                          <strong>Auteur:</strong> {d.auteur}
                        </Typography>
                        {d.description && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, flex: 1 }}>
                            {d.description.length > 150 ? `${d.description.substring(0, 150)}...` : d.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 2 }}>
                          {d.fichier && (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Download />}
                              href={getMediaUrl(d.fichier)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce }, flex: 1 }}
                            >
                              Télécharger
                            </Button>
                          )}
                          {canManage && (
                            <>
                              <IconButton size="small" onClick={() => { setEditingId(d.id); setFormDoc({ titre: d.titre, auteur: d.auteur, description: d.description || '' }); setFileDoc(null); setOpenDoc(true) }} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                              <IconButton size="small" onClick={() => setDeleteTarget({ id: d.id, type: 'doc' })} color="error"><Delete /></IconButton>
                            </>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : tab === 1 ? ( /* Répertoire */
          <Box sx={{ p: 3 }}>
            {canManage && (
              <Fade in>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingId(null); setFormArchive({ titre: '', evenement: '', date_evenement: '', lien_telegramme_du_son: '', description: '' }); setOpenArchive(true) }} sx={{ mb: 3, bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce }, boxShadow: 2, borderRadius: 2 }}>
                  Ajouter au répertoire
                </Button>
              </Fade>
            )}
            {archives.length === 0 ? (
              <Fade in>
                <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                  <Folder sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
                  <Typography color="text.secondary" variant="h6">Aucune entrée dans le répertoire</Typography>
                  <Typography color="text.secondary" variant="body2">Ajoutez des enregistrements pour les retrouver ici.</Typography>
                </Box>
              </Fade>
            ) : (
              <Grid container spacing={2}>
                {archives.map((a, index) => (
                  <Grid item xs={12} sm={6} md={4} key={a.id}>
                    <Fade in timeout={{ enter: 400 + index * 80 }}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 2,
                          overflow: 'hidden',
                          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                          borderLeft: `4px solid ${COLORS.vert}`,
                        }}
                      >
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.vertFonce, lineHeight: 1.3 }}>
                            {a.titre}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            <strong>Événement :</strong> {a.evenement?.trim() || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {a.date_evenement ? new Date(a.date_evenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : (a.annee ? String(a.annee) : '—')}
                          </Typography>
                          {a.description?.trim() && (
                            <Typography variant="body2" sx={{ mt: 0.5, flex: 1, color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {a.description}
                            </Typography>
                          )}
                          <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            {getLienSon(a) ? (
                              <Button
                                component="a"
                                href={toAbsoluteUrl(getLienSon(a))}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="contained"
                                size="small"
                                startIcon={<PlayArrow />}
                                sx={{ bgcolor: '#0088cc', '&:hover': { bgcolor: '#006699' }, borderRadius: 2 }}
                              >
                                LIEN SON BI
                              </Button>
                            ) : (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<PlayArrow />}
                                disabled
                                sx={{ borderRadius: 2 }}
                              >
                                LIEN SON BI
                              </Button>
                            )}
                            {canManage && (
                              <>
                                <IconButton size="small" onClick={() => { setEditingId(a.id); setFormArchive({ titre: a.titre, evenement: a.evenement || '', date_evenement: a.date_evenement?.slice(0, 10) || '', lien_telegramme_du_son: getLienSon(a) || a.lien_telegramme_du_son || a.lienTelegrammeDuSon || '', description: a.description || '' }); setOpenArchive(true) }} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                                <IconButton size="small" onClick={() => setDeleteTarget({ id: a.id, type: 'archive' })} color="error"><Delete /></IconButton>
                              </>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : tab === 2 ? ( /* Kourels */
          <Box sx={{ p: 2 }}>
            {isAdmin && (
              <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingId(null); setFormKourel({ nom: '', description: '', membres: [], maitre_de_coeur: '' }); setOpenKourel(true) }} sx={{ mb: 2, bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                Ajouter un Kourel
              </Button>
            )}
            {kourels.length === 0 ? (
              <Typography color="text.secondary">Aucun Kourel.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow sx={{ bgcolor: `${COLORS.vert}12` }}><TableCell>Kourel</TableCell><TableCell>Maître de cœur</TableCell><TableCell>Membres</TableCell>{isAdmin && <TableCell align="right">Actions</TableCell>}</TableRow></TableHead>
                  <TableBody>
                    {kourels.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell><strong>{k.nom}</strong></TableCell>
                        <TableCell>{k.maitre_de_coeur_nom || '—'}</TableCell>
                        <TableCell>{k.nb_membres ?? k.membres?.length ?? 0} membre(s)</TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <IconButton size="small" onClick={async () => { setEditingId(k.id); const detail = await loadKourelDetail(k.id); const m = detail ? (Array.isArray(detail.membres) ? detail.membres : []) : (Array.isArray(k.membres) ? k.membres : []); setFormKourel({ nom: detail?.nom ?? k.nom, description: detail?.description ?? k.description ?? '', membres: m.map((x) => (typeof x === 'object' && x?.id ? x.id : x)), maitre_de_coeur: detail?.maitre_de_coeur ?? k.maitre_de_coeur ?? '' }); setOpenKourel(true) }} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                            <IconButton size="small" onClick={() => setDeleteTarget({ id: k.id, type: 'kourel' })} color="error"><Delete /></IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : tab === 3 ? ( /* Séances */
          <Box sx={{ p: 2 }}>
            {isAdmin && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingId(null); const dt = new Date(); dt.setMinutes(0); setFormSeance({ kourel: kourels[0]?.id || '', type_seance: 'repetition', titre: '', description: '', date_heure: dt.toISOString().slice(0, 16), heure_fin: '', lieu: '', khassidas: [] }); setOpenSeance(true) }} disabled={kourels.length === 0} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                  Ajouter une séance
                </Button>
                <Button variant="outlined" onClick={() => { setRapportExport({ format: 'excel' }); setOpenRapportExport(true) }} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
                  Exporter rapport
                </Button>
              </Box>
            )}
            {isAdmin && kourels.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Créez un Kourel pour planifier des séances.</Typography>}
            {seances.length === 0 ? (
              <Typography color="text.secondary">Aucune séance planifiée.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                      <TableCell>Titre</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Kourel</TableCell>
                      <TableCell>Date / Heure</TableCell>
                      <TableCell>Lieu</TableCell>
                      <TableCell>Khassida</TableCell>
                      {isAdmin && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {seances.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell><strong>{s.titre}</strong></TableCell>
                        <TableCell>{s.type_display || s.type_seance}</TableCell>
                        <TableCell>{s.kourel_nom || '—'}</TableCell>
                        <TableCell>
                          {s.date_heure ? new Date(s.date_heure).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          {s.heure_fin ? ` → ${s.heure_fin}` : ''}
                        </TableCell>
                        <TableCell>{s.lieu || '—'}</TableCell>
                        <TableCell>
                          {(s.khassidas || []).length > 0
                            ? (s.khassidas || []).map((k) => `${k.nom_khassida} (${k.dathie})${k.khassida_portion ? ` — ${k.khassida_portion}` : ''}`).join(' ; ')
                            : '—'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => handleOpenPresences(s)} sx={{ mr: 0.5, fontSize: '0.75rem', borderColor: COLORS.vert, color: COLORS.vert }}>Présences</Button>
                            <IconButton size="small" onClick={() => { const d = s.date_heure ? new Date(s.date_heure) : null; const dtLocal = d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''; setEditingId(s.id); setFormSeance({ kourel: s.kourel, type_seance: s.type_seance, titre: s.titre, description: s.description || '', date_heure: dtLocal, heure_fin: s.heure_fin || '', lieu: s.lieu || '', khassidas: (s.khassidas || []).map((k) => ({ nom_khassida: k.nom_khassida || '', dathie: k.dathie || '', khassida_portion: k.khassida_portion || '' })) }); setOpenSeance(true) }} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                            <IconButton size="small" onClick={() => setDeleteTarget({ id: s.id, type: 'seance' })} color="error"><Delete /></IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : tab === 4 ? ( /* Présences */
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ color: COLORS.vert, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventAvailable /> Gestion des présences
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Par séance ou prestation : nombre de présents/absents et qui sont-ils. Par membre : % de présence globale.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: `${COLORS.or}10` }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1.5 }}>Filtrer</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Rechercher (titre, kourel, membre...)"
                  value={filterPresences.search}
                  onChange={(e) => setFilterPresences((f) => ({ ...f, search: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: COLORS.vert, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Date début"
                  value={filterPresences.dateDebut}
                  onChange={(e) => setFilterPresences((f) => ({ ...f, dateDebut: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Date fin"
                  value={filterPresences.dateFin}
                  onChange={(e) => setFilterPresences((f) => ({ ...f, dateFin: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  size="small"
                  select
                  label="Kourel"
                  value={filterPresences.kourel}
                  onChange={(e) => setFilterPresences((f) => ({ ...f, kourel: e.target.value }))}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  {kourels.map((k) => (
                    <MenuItem key={k.id} value={k.id}>{k.nom}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  select
                  label="Type"
                  value={filterPresences.typeSeance}
                  onChange={(e) => setFilterPresences((f) => ({ ...f, typeSeance: e.target.value }))}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="repetition">Répétition</MenuItem>
                  <MenuItem value="prestation">Prestation</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  placeholder="Filtrer par membre"
                  value={filterPresences.membre}
                  onChange={(e) => setFilterPresences((f) => ({ ...f, membre: e.target.value }))}
                  sx={{ minWidth: 180 }}
                />
                <Button size="small" variant="outlined" onClick={() => setFilterPresences({ search: '', dateDebut: '', dateFin: '', kourel: '', typeSeance: '', membre: '' })} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
                  Réinitialiser
                </Button>
              </Box>
            </Paper>

            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLORS.vertFonce, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Event /> Par séance ou prestation
              </Typography>
              {(() => {
                const q = (filterPresences.search || '').trim().toLowerCase()
                let filteredSeances = seances.filter((s) => {
                  const matchSearch = !q ||
                    (s.titre && s.titre.toLowerCase().includes(q)) ||
                    (s.kourel_nom && s.kourel_nom.toLowerCase().includes(q)) ||
                    ((s.presences || []).some((p) => (p.membre_nom || '').toLowerCase().includes(q)))
                  const matchDateDebut = !filterPresences.dateDebut || (s.date_heure && s.date_heure.slice(0, 10) >= filterPresences.dateDebut)
                  const matchDateFin = !filterPresences.dateFin || (s.date_heure && s.date_heure.slice(0, 10) <= filterPresences.dateFin)
                  const matchKourel = !filterPresences.kourel || Number(s.kourel) === Number(filterPresences.kourel)
                  const matchType = !filterPresences.typeSeance || s.type_seance === filterPresences.typeSeance
                  const matchMembre = !filterPresences.membre || ((s.presences || []).some((p) => (p.membre_nom || '').toLowerCase().includes((filterPresences.membre || '').toLowerCase())))
                  return matchSearch && matchDateDebut && matchDateFin && matchKourel && matchType && matchMembre
                })
                return filteredSeances.length === 0 ? (
                  <Typography color="text.secondary">{seances.length === 0 ? 'Aucune séance.' : 'Aucune séance ne correspond aux filtres.'}</Typography>
                ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                        <TableCell><strong>Date / Titre</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Kourel</strong></TableCell>
                        <TableCell><strong>Présents</strong></TableCell>
                        <TableCell><strong>Absents</strong></TableCell>
                        <TableCell><strong>Détail</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSeances.map((s) => {
                        const presences = s.presences || []
                        const nbPresents = presences.filter((p) => p.statut === 'present').length
                        const nbAbsents = presences.filter((p) => p.statut === 'absent_non_justifie' || p.statut === 'absent_justifie').length
                        const presents = presences.filter((p) => p.statut === 'present').map((p) => p.membre_nom || `#${p.membre}`).join(', ') || '—'
                        const absents = presences.filter((p) => p.statut !== 'present').map((p) => `${p.membre_nom || p.membre} (${p.statut_display || p.statut})`).join(', ') || '—'
                        const isExpanded = expandedSeance === s.id
                        return (
                          <React.Fragment key={s.id}>
                            <TableRow sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${COLORS.or}15` } }} onClick={() => setExpandedSeance(isExpanded ? null : s.id)}>
                              <TableCell>
                                {s.date_heure ? new Date(s.date_heure).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'} — {s.titre}
                              </TableCell>
                              <TableCell>{s.type_display || s.type_seance}</TableCell>
                              <TableCell>{s.kourel_nom || '—'}</TableCell>
                              <TableCell><Chip label={nbPresents} color="success" size="small" /></TableCell>
                              <TableCell><Chip label={nbAbsents} color={nbAbsents > 0 ? 'error' : 'default'} size="small" /></TableCell>
                              <TableCell>{isExpanded ? '▲ Réduire' : '▼ Voir qui'}</TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={6} sx={{ bgcolor: `${COLORS.or}25`, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.vert }}>Présents :</Typography>
                                      <Typography variant="body2" sx={{ mt: 0.5 }}>{presents || '—'}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#c62828' }}>Absents :</Typography>
                                      <Typography variant="body2" sx={{ mt: 0.5 }}>{absents || '—'}</Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                )
              })()}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLORS.vertFonce, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> % de présence globale par membre
              </Typography>
              {(() => {
                const qM = (filterPresences.search || filterPresences.membre || '').trim().toLowerCase()
                const filteredStats = enrichedStatsMembres.filter((m) => !qM || (m.membre_nom || '').toLowerCase().includes(qM))
                return filteredStats.length === 0 ? (
                <Typography color="text.secondary">{enrichedStatsMembres.length === 0 ? 'Aucune donnée de présence.' : 'Aucun membre ne correspond aux filtres.'}</Typography>
              ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.vert}` }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                        <TableCell><strong>Membre</strong></TableCell>
                        <TableCell><strong>Répétitions</strong></TableCell>
                        <TableCell><strong>Prestations</strong></TableCell>
                        <TableCell><strong>Global</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStats.map((m) => (
                        <TableRow key={m.membre_id}>
                          <TableCell>{m.membre_nom || `#${m.membre_id}`}</TableCell>
                          <TableCell>
                            {m.rep_total > 0 ? (
                              <Chip
                                label={`${m.rep_pourcentage} % (${m.rep_presents}/${m.rep_absents})`}
                                size="small"
                                color={m.rep_pourcentage >= 80 ? 'success' : m.rep_pourcentage >= 50 ? 'warning' : 'error'}
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {m.prest_total > 0 ? (
                              <Chip
                                label={`${m.prest_pourcentage} % (${m.prest_presents}/${m.prest_absents})`}
                                size="small"
                                color={m.prest_pourcentage >= 80 ? 'success' : m.prest_pourcentage >= 50 ? 'warning' : 'error'}
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {m.nb_total > 0 ? (
                              <Chip
                                label={`${m.pourcentage} % (${m.nb_presents}/${m.nb_absents})`}
                                size="small"
                                color={m.pourcentage >= 80 ? 'success' : m.pourcentage >= 50 ? 'warning' : 'error'}
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
              })()}
            </Box>
          </Box>
        ) : ( /* Galerie */
          <Box sx={{ p: 2 }}>
            {isAdmin && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingId(null); setFormAlbum({ titre: '', description: '', date_evenement: new Date().toISOString().slice(0, 10), est_public: true }); setAlbumFile(null); setOpenAlbum(true) }} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                  Nouvel album
                </Button>
                <Button variant="outlined" startIcon={<Collections />} onClick={() => { setFormPhoto({ album: albums[0]?.id || '', titre: '', description: '', lieu: '' }); setPhotoFile(null); setOpenPhoto(true) }} disabled={albums.length === 0} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
                  Ajouter une photo
                </Button>
              </Box>
            )}
            {albums.length === 0 ? (
              <Typography color="text.secondary">Aucun album photo.</Typography>
            ) : (
              <Grid container spacing={2}>
                {albums.map((album) => (
                  <Grid item xs={12} sm={6} md={4} key={album.id}>
                    <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, overflow: 'hidden', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => setSelectedAlbum(album)}>
                      <Box sx={{ height: 160, bgcolor: `${COLORS.vert}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {getImageUrl(album.couverture) ? (
                          <Box component="img" src={getImageUrl(album.couverture)} alt={album.titre} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <PhotoLibrary sx={{ fontSize: 64, color: `${COLORS.or}99` }} />
                        )}
                      </Box>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography fontWeight={600} sx={{ color: COLORS.vert }}>{album.titre}</Typography>
                        <Typography variant="caption" color="text.secondary">{new Date(album.date_evenement).toLocaleDateString('fr-FR')} — {album.photos?.length ?? 0} photo(s)</Typography>
                        {isAdmin && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingId(album.id); setFormAlbum({ titre: album.titre, description: album.description || '', date_evenement: album.date_evenement?.slice(0, 10), est_public: album.est_public ?? true }); setOpenAlbum(true) }} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: album.id, type: 'album' }) }} color="error"><Delete /></IconButton>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            <Dialog open={!!selectedAlbum} onClose={() => setSelectedAlbum(null)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{selectedAlbum?.titre}</span>
                <IconButton onClick={() => setSelectedAlbum(null)} size="small">×</IconButton>
              </DialogTitle>
              <DialogContent>
                {selectedAlbum && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selectedAlbum.description} — {new Date(selectedAlbum.date_evenement).toLocaleDateString('fr-FR')}</Typography>
                    <Grid container spacing={1}>
                      {(selectedAlbum.photos || []).map((p) => (
                        <Grid item xs={6} sm={4} md={3} key={p.id}>
                          <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden', bgcolor: `${COLORS.vert}10` }}>
                            <Box component="img" src={getImageUrl(p.fichier)} alt={p.titre} sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                            {isAdmin && (
                              <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }} onClick={() => setDeleteTarget({ id: p.id, type: 'photo' })}><Delete fontSize="small" /></IconButton>
                            )}
                          </Box>
                          {p.titre && <Typography variant="caption" display="block">{p.titre}</Typography>}
                        </Grid>
                      ))}
                    </Grid>
                    {(!selectedAlbum.photos || selectedAlbum.photos.length === 0) && <Typography color="text.secondary">Aucune photo dans cet album.</Typography>}
                    {isAdmin && selectedAlbum && (
                      <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => { setFormPhoto({ album: selectedAlbum.id, titre: '', description: '', lieu: '' }); setPhotoFile(null); setOpenPhoto(true) }} sx={{ mt: 2, borderColor: COLORS.vert, color: COLORS.vert }}>
                        Ajouter une photo
                      </Button>
                    )}
                  </Box>
                )}
              </DialogContent>
            </Dialog>
          </Box>
        )}
      </Paper>

      {canManage && (
        <>
          <Dialog open={openDoc} onClose={() => { setOpenDoc(false); setEditingId(null); setFileDoc(null) }} maxWidth="md" fullWidth>
            <DialogTitle>{editingId ? 'Modifier le document' : 'Ajouter un document'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Nom du document (Titre)" 
                    value={formDoc.titre} 
                    onChange={(e) => setFormDoc((f) => ({ ...f, titre: e.target.value }))} 
                    required 
                    helperText="Nom du document à afficher"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Auteur" 
                    value={formDoc.auteur} 
                    onChange={(e) => setFormDoc((f) => ({ ...f, auteur: e.target.value }))} 
                    required 
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Description" 
                    value={formDoc.description} 
                    onChange={(e) => setFormDoc((f) => ({ ...f, description: e.target.value }))} 
                    multiline 
                    rows={4} 
                    helperText="Description détaillée du document (optionnelle)"
                  />
                </Grid>
                {!editingId && (
                  <Grid item xs={12}>
                    <Box sx={{ border: '2px dashed', borderColor: COLORS.or, borderRadius: 2, p: 2, textAlign: 'center' }}>
                      <Button 
                        variant="outlined" 
                        component="label" 
                        startIcon={<Add />}
                        sx={{ borderColor: COLORS.vert, color: COLORS.vert, '&:hover': { borderColor: COLORS.vertFonce } }}
                      >
                        Choisir un fichier
                        <input 
                          type="file" 
                          hidden 
                          onChange={(e) => setFileDoc(e.target.files?.[0])} 
                          accept=".pdf,.doc,.docx,.txt,.odt"
                        />
                      </Button>
                      {fileDoc && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ color: COLORS.vert, fontWeight: 600 }}>
                            Fichier sélectionné: {fileDoc.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Taille: {(fileDoc.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                      )}
                      {!fileDoc && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                          Formats acceptés: PDF, DOC, DOCX, TXT, ODT
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setOpenDoc(false); setEditingId(null); setFileDoc(null) }}>Annuler</Button>
              <Button 
                variant="contained" 
                onClick={handleSaveDoc} 
                disabled={saving || (!editingId && !fileDoc)} 
                sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
              >
                {saving ? <CircularProgress size={24} /> : 'Enregistrer'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={openArchive} onClose={() => { setOpenArchive(false); setEditingId(null) }} maxWidth="sm" fullWidth>
            <DialogTitle>{editingId ? 'Modifier l\'entrée du répertoire' : 'Ajouter au répertoire'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12}><TextField fullWidth label="Titre *" value={formArchive.titre} onChange={(e) => setFormArchive((f) => ({ ...f, titre: e.target.value }))} required /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Événement" value={formArchive.evenement} onChange={(e) => setFormArchive((f) => ({ ...f, evenement: e.target.value }))} placeholder="Nom de l'événement" /></Grid>
                <Grid item xs={12}><TextField fullWidth type="date" label="Date" value={formArchive.date_evenement} onChange={(e) => setFormArchive((f) => ({ ...f, date_evenement: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Lien Telegram du son *" value={formArchive.lien_telegramme_du_son} onChange={(e) => setFormArchive((f) => ({ ...f, lien_telegramme_du_son: e.target.value }))} placeholder="https://t.me/..." required /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Description (optionnel)" value={formArchive.description} onChange={(e) => setFormArchive((f) => ({ ...f, description: e.target.value }))} multiline rows={3} /></Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setOpenArchive(false); setEditingId(null) }}>Annuler</Button>
              <Button variant="contained" onClick={handleSaveArchive} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
            <DialogTitle>Supprimer ?</DialogTitle>
            <DialogContent><Typography>Confirmer la suppression.</Typography></DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
              <Button variant="contained" color="error" onClick={
                deleteTarget?.type === 'doc' ? handleDeleteDoc :
                deleteTarget?.type === 'archive' ? handleDeleteArchive :
                deleteTarget?.type === 'kourel' ? handleDeleteKourel :
                deleteTarget?.type === 'seance' ? handleDeleteSeance :
                deleteTarget?.type === 'album' ? handleDeleteAlbum :
                handleDeletePhoto
              } disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={openKourel} onClose={() => { setOpenKourel(false); setEditingId(null) }} maxWidth="sm" fullWidth>
            <DialogTitle>{editingId ? 'Modifier le Kourel' : 'Ajouter un Kourel'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12}><TextField fullWidth label="Nom du Kourel" value={formKourel.nom} onChange={(e) => setFormKourel((f) => ({ ...f, nom: e.target.value }))} required /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Description" value={formKourel.description} onChange={(e) => setFormKourel((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
                <Grid item xs={12}><TextField select fullWidth label="Maître de cœur" value={formKourel.maitre_de_coeur} onChange={(e) => setFormKourel((f) => ({ ...f, maitre_de_coeur: e.target.value ? Number(e.target.value) : '' }))}>
                  <MenuItem value="">— Aucun —</MenuItem>
                  {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</MenuItem>)}
                </TextField></Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Membres du Kourel (cochez tous les membres)</Typography>
                  <Paper variant="outlined" sx={{ maxHeight: 220, overflow: 'auto', p: 1 }}>
                    {users.map((u) => (
                      <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', py: 0.5, px: 1, '&:hover': { bgcolor: `${COLORS.or}15` } }}>
                        <Checkbox checked={formKourel.membres?.includes(u.id)} onChange={(e) => setFormKourel((f) => ({ ...f, membres: e.target.checked ? [...(f.membres || []), u.id] : (f.membres || []).filter((id) => id !== u.id) }))} sx={{ color: COLORS.vert, '&.Mui-checked': { color: COLORS.vert } }} />
                        <Typography variant="body2">{u.first_name} {u.last_name}</Typography>
                      </Box>
                    ))}
                  </Paper>
                  {formKourel.membres?.length > 0 && <Typography variant="caption" color="text.secondary">{formKourel.membres.length} membre(s) sélectionné(s)</Typography>}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setOpenKourel(false); setEditingId(null) }}>Annuler</Button>
              <Button variant="contained" onClick={handleSaveKourel} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={openAlbum} onClose={() => { setOpenAlbum(false); setEditingId(null) }} maxWidth="sm" fullWidth>
            <DialogTitle>{editingId ? 'Modifier l\'album' : 'Nouvel album'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12}><TextField fullWidth label="Titre" value={formAlbum.titre} onChange={(e) => setFormAlbum((f) => ({ ...f, titre: e.target.value }))} required /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Description" value={formAlbum.description} onChange={(e) => setFormAlbum((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
                <Grid item xs={12}><TextField fullWidth type="date" label="Date événement" value={formAlbum.date_evenement} onChange={(e) => setFormAlbum((f) => ({ ...f, date_evenement: e.target.value }))} InputLabelProps={{ shrink: true }} required /></Grid>
                <Grid item xs={12}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Checkbox checked={formAlbum.est_public} onChange={(e) => setFormAlbum((f) => ({ ...f, est_public: e.target.checked }))} /><Typography>Album public</Typography></Box></Grid>
                <Grid item xs={12}><Button variant="outlined" component="label">Couverture (image)<input type="file" accept="image/*" hidden onChange={(e) => setAlbumFile(e.target.files?.[0])} /></Button>{albumFile && <Typography variant="caption" sx={{ ml: 1 }}>{albumFile.name}</Typography>}</Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setOpenAlbum(false); setEditingId(null) }}>Annuler</Button>
              <Button variant="contained" onClick={handleSaveAlbum} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={openPhoto} onClose={() => { setOpenPhoto(false) }} maxWidth="sm" fullWidth>
            <DialogTitle>Ajouter une photo</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12}><TextField select fullWidth label="Album" value={formPhoto.album} onChange={(e) => setFormPhoto((f) => ({ ...f, album: Number(e.target.value) }))} required>
                  {albums.map((a) => <MenuItem key={a.id} value={a.id}>{a.titre}</MenuItem>)}
                </TextField></Grid>
                <Grid item xs={12}><TextField fullWidth label="Titre (optionnel)" value={formPhoto.titre} onChange={(e) => setFormPhoto((f) => ({ ...f, titre: e.target.value }))} /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Lieu (optionnel)" value={formPhoto.lieu} onChange={(e) => setFormPhoto((f) => ({ ...f, lieu: e.target.value }))} /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Description (optionnel)" value={formPhoto.description} onChange={(e) => setFormPhoto((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
                <Grid item xs={12}><Button variant="outlined" component="label">Choisir une photo<input type="file" accept="image/*" hidden onChange={(e) => setPhotoFile(e.target.files?.[0])} /></Button>{photoFile && <Typography variant="caption" sx={{ ml: 1 }}>{photoFile.name}</Typography>}</Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenPhoto(false)}>Annuler</Button>
              <Button variant="contained" onClick={handleSavePhoto} disabled={saving || !photoFile} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Ajouter'}</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={openSeance} onClose={() => { setOpenSeance(false); setEditingId(null) }} maxWidth="sm" fullWidth>
            <DialogTitle>{editingId ? 'Modifier la séance' : 'Ajouter une séance'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12}><TextField select fullWidth label="Kourel" value={formSeance.kourel} onChange={(e) => setFormSeance((f) => ({ ...f, kourel: Number(e.target.value) }))} required>
                  {kourels.map((k) => <MenuItem key={k.id} value={k.id}>{k.nom}</MenuItem>)}
                </TextField></Grid>
                <Grid item xs={12}><TextField select fullWidth label="Type" value={formSeance.type_seance} onChange={(e) => setFormSeance((f) => ({ ...f, type_seance: e.target.value }))}>
                  <MenuItem value="repetition">Répétition</MenuItem>
                  <MenuItem value="prestation">Prestation</MenuItem>
                </TextField></Grid>
                <Grid item xs={12}><TextField fullWidth label="Titre" value={formSeance.titre} onChange={(e) => setFormSeance((f) => ({ ...f, titre: e.target.value }))} required /></Grid>
                <Grid item xs={12}><TextField fullWidth type="datetime-local" label="Date et heure de début" value={formSeance.date_heure} onChange={(e) => setFormSeance((f) => ({ ...f, date_heure: e.target.value }))} InputLabelProps={{ shrink: true }} required /></Grid>
                <Grid item xs={12}><TextField fullWidth type="time" label="Heure de fin" value={formSeance.heure_fin} onChange={(e) => setFormSeance((f) => ({ ...f, heure_fin: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Lieu de la répétition" value={formSeance.lieu} onChange={(e) => setFormSeance((f) => ({ ...f, lieu: e.target.value }))} /></Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Khassidas répétées (nom, dathie ex: Serigne Massamba, portion)</Typography>
                  {(formSeance.khassidas || []).map((k, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField size="small" placeholder="Nom khassida" value={k.nom_khassida || ''} onChange={(e) => updateKhassidaRow(idx, 'nom_khassida', e.target.value)} sx={{ minWidth: 140 }} />
                      <TextField size="small" placeholder="Dathie (ex: Serigne Massamba)" value={k.dathie || ''} onChange={(e) => updateKhassidaRow(idx, 'dathie', e.target.value)} sx={{ minWidth: 160 }} />
                      <TextField size="small" placeholder="Portion" value={k.khassida_portion || ''} onChange={(e) => updateKhassidaRow(idx, 'khassida_portion', e.target.value)} sx={{ minWidth: 100 }} />
                      <IconButton size="small" onClick={() => removeKhassidaRow(idx)} color="error"><Delete fontSize="small" /></IconButton>
                    </Box>
                  ))}
                  <Button size="small" variant="outlined" startIcon={<Add />} onClick={addKhassidaRow} sx={{ mt: 0.5, borderColor: COLORS.vert, color: COLORS.vert }}>Ajouter une khassida</Button>
                </Grid>
                <Grid item xs={12}><TextField fullWidth label="Description" value={formSeance.description} onChange={(e) => setFormSeance((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setOpenSeance(false); setEditingId(null) }}>Annuler</Button>
              <Button variant="contained" onClick={handleSaveSeance} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={!!openPresences} onClose={() => setOpenPresences(null)} maxWidth="sm" fullWidth>
            <DialogTitle>Marquer les présences — {openPresences?.titre} ({openPresences?.kourel_nom})</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pour chaque membre du kourel : Présent, Absent justifié ou Absent non justifié.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                      <TableCell>Membre</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Remarque (si absent justifié)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(presencesForm).map(([membreId, v]) => {
                      const u = users.find((x) => x.id === Number(membreId))
                      const nomMembre = u ? `${u.first_name} ${u.last_name}` : `Membre #${membreId}`
                      return (
                        <TableRow key={membreId}>
                          <TableCell>{nomMembre}</TableCell>
                          <TableCell>
                            <TextField
                              select
                              size="small"
                              value={v.statut}
                              onChange={(e) => setPresencesForm((prev) => ({ ...prev, [membreId]: { ...prev[membreId], statut: e.target.value } }))}
                              sx={{ minWidth: 180 }}
                            >
                              <MenuItem value="present">Présent</MenuItem>
                              <MenuItem value="absent_justifie">Absent justifié</MenuItem>
                              <MenuItem value="absent_non_justifie">Absent non justifié</MenuItem>
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Justification..."
                              value={v.remarque}
                              onChange={(e) => setPresencesForm((prev) => ({ ...prev, [membreId]: { ...prev[membreId], remarque: e.target.value } }))}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {Object.keys(presencesForm).length === 0 && (
                <Typography color="text.secondary" sx={{ py: 2 }}>Aucun membre dans ce kourel.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenPresences(null)}>Fermer</Button>
              <Button variant="contained" onClick={handleSavePresences} disabled={savingPresences || Object.keys(presencesForm).length === 0} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                {savingPresences ? <CircularProgress size={24} /> : 'Enregistrer les présences'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={openRapportExport} onClose={() => setOpenRapportExport(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Exporter le rapport des séances</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Exporte toutes les séances de répétition créées (avec présences et statistiques).
              </Typography>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12}>
                  <TextField select fullWidth label="Format" value={rapportExport.format} onChange={(e) => setRapportExport((f) => ({ ...f, format: e.target.value }))}>
                    <MenuItem value="excel">Excel (.xlsx)</MenuItem>
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="csv">CSV</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenRapportExport(false)}>Annuler</Button>
              <Button variant="contained" onClick={handleExportRapport} disabled={exportingRapport} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                {exportingRapport ? <CircularProgress size={24} /> : 'Télécharger'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}
