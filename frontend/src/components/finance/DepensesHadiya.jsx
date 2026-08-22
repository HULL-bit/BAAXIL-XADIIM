import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
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
  Chip,
  Grid,
} from '@mui/material'
import { VolunteerActivism, Add } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../styles/theme'

const TYPES = [
  { value: 'depense', label: 'Dépense' },
  { value: 'hadiya', label: 'Hadiya' },
]

const initialForm = { type_transaction: 'depense', montant: '', description: '' }

export default function DepensesHadiya() {
  const { permissions } = useAuth()
  const canManage = !!permissions?.can_manage_finance

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const load = () => {
    setLoading(true)
    api.get('/finance/depenses-hadiya/')
      .then(({ data }) => setList(data.results || data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.montant || Number(form.montant) <= 0) {
      setMessage({ type: 'error', text: 'Montant requis (positif).' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post('/finance/depenses-hadiya/', form)
      setMessage({ type: 'success', text: 'Enregistré.' })
      setForm(initialForm)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || "Erreur lors de l'enregistrement." })
    } finally {
      setSaving(false)
    }
  }

  const totalParType = (type) => list.filter((t) => t.type_transaction === type).reduce((sum, t) => sum + Number(t.montant || 0), 0)

  return (
    <Box>
      <Typography variant="h4" sx={{ color: colors.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VolunteerActivism /> Dépenses & Hadiya
      </Typography>
      <Typography variant="body2" sx={{ color: colors.vertFonce, mb: 3 }}>
        Enregistrement des hadiya reçues et des dépenses de votre cellule.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderTop: `4px solid ${colors.vert}` }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Hadiya</Typography>
              <Typography variant="h5" sx={{ color: colors.vert, fontWeight: 700 }}>{totalParType('hadiya').toLocaleString('fr-FR')} FCFA</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderTop: `4px solid ${colors.or}` }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Dépenses</Typography>
              <Typography variant="h5" sx={{ color: colors.or, fontWeight: 700 }}>{totalParType('depense').toLocaleString('fr-FR')} FCFA</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {canManage && (
        <Card sx={{ mb: 3, borderLeft: `4px solid ${colors.vert}`, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: colors.vertFonce, mb: 2 }}>Nouvel enregistrement</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField select label="Type" value={form.type_transaction} onChange={(e) => setForm((f) => ({ ...f, type_transaction: e.target.value }))} fullWidth size="small">
                  {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="Montant (FCFA)" type="number" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} /> : <Add />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ bgcolor: colors.vert, '&:hover': { bgcolor: colors.vertFonce } }}
                >
                  Ajouter
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${colors.vert}` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: `${colors.vert}15` }}>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Montant</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Enregistré par</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">Aucun enregistrement.</TableCell></TableRow>
              ) : (
                list.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date_transaction ? new Date(t.date_transaction).toLocaleDateString('fr-FR') : '—'}</TableCell>
                    <TableCell><Chip label={t.type_display || t.type_transaction} size="small" color={t.type_transaction === 'hadiya' ? 'success' : 'default'} /></TableCell>
                    <TableCell>{Number(t.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                    <TableCell>{t.description || '—'}</TableCell>
                    <TableCell>{t.membre_nom || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
