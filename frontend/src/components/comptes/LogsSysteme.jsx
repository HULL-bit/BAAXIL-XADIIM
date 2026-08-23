import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  MenuItem,
  Button,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material'
import { History, Security, RestartAlt } from '@mui/icons-material'
import api from '../../services/api'
import { colors } from '../../styles/theme'

const ACTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'role_change', label: 'Changement de rôle' },
  { value: 'membre_create', label: "Création d'un membre" },
  { value: 'membre_update', label: "Modification d'un membre" },
  { value: 'membre_delete', label: "Suppression d'un membre" },
  { value: 'import_excel', label: 'Import Excel' },
  { value: 'paiement_valide', label: 'Validation de paiement(s)' },
  { value: 'assignation_annuelle', label: 'Assignation annuelle créée' },
  { value: 'dahira_pilote', label: 'Statut cellule pilote modifié' },
]

const initialFilters = { search: '', action: '', ip: '', date_min: '', date_max: '', succes: '' }

export default function LogsSysteme() {
  const [tab, setTab] = useState('journal')
  const [filters, setFilters] = useState(initialFilters)
  const [journal, setJournal] = useState([])
  const [connexions, setConnexions] = useState([])
  const [loading, setLoading] = useState(false)

  const loadJournal = useCallback(() => {
    setLoading(true)
    const params = { page_size: 100, ordering: '-date_action' }
    if (filters.search) params.search = filters.search
    if (filters.action) params.action = filters.action
    if (filters.ip) params.adresse_ip__icontains = filters.ip
    if (filters.date_min) params.date_action__gte = filters.date_min
    if (filters.date_max) params.date_action__lte = filters.date_max
    api.get('/auth/journal/', { params })
      .then(({ data }) => setJournal(data.results || data || []))
      .catch(() => setJournal([]))
      .finally(() => setLoading(false))
  }, [filters])

  const loadConnexions = useCallback(() => {
    setLoading(true)
    const params = { page_size: 100 }
    if (filters.search) params.search = filters.search
    if (filters.ip) params.adresse_ip__icontains = filters.ip
    if (filters.date_min) params.date_connexion__gte = filters.date_min
    if (filters.date_max) params.date_connexion__lte = filters.date_max
    if (filters.succes) params.succes = filters.succes
    api.get('/auth/connexions/', { params })
      .then(({ data }) => setConnexions(data.results || data || []))
      .catch(() => setConnexions([]))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => {
    if (tab === 'journal') loadJournal()
    else loadConnexions()
  }, [tab, loadJournal, loadConnexions])

  const fmt = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }) : '—')

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      <Typography variant="h4" sx={{ color: colors.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security /> Logs système
      </Typography>
      <Typography variant="body2" sx={{ color: colors.vertFonce, mb: 3 }}>
        Traçabilité des connexions et des actions sensibles (rôles, membres, paiements, cellules pilotes).
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="journal" label="Journal des actions" icon={<History fontSize="small" />} iconPosition="start" />
        <Tab value="connexions" label="Historique des connexions" icon={<Security fontSize="small" />} iconPosition="start" />
      </Tabs>

      <Card sx={{ mb: 3, borderLeft: `4px solid ${colors.vert}`, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              label="Rechercher (nom, utilisateur…)"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              sx={{ minWidth: 220 }}
            />
            {tab === 'journal' && (
              <TextField
                select size="small" label="Action" value={filters.action}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                sx={{ minWidth: 220 }}
              >
                {ACTIONS.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
              </TextField>
            )}
            {tab === 'connexions' && (
              <TextField
                select size="small" label="Résultat" value={filters.succes}
                onChange={(e) => setFilters((f) => ({ ...f, succes: e.target.value }))}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="true">Réussies</MenuItem>
                <MenuItem value="false">Échouées</MenuItem>
              </TextField>
            )}
            <TextField
              size="small"
              label="Adresse IP"
              value={filters.ip}
              onChange={(e) => setFilters((f) => ({ ...f, ip: e.target.value }))}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small" type="date" label="Du" value={filters.date_min}
              onChange={(e) => setFilters((f) => ({ ...f, date_min: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }}
            />
            <TextField
              size="small" type="date" label="Au" value={filters.date_max}
              onChange={(e) => setFilters((f) => ({ ...f, date_max: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }}
            />
            <Button startIcon={<RestartAlt />} onClick={() => setFilters(initialFilters)}>Réinitialiser</Button>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : tab === 'journal' ? (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${colors.vert}`, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: `${colors.vert}12` }}>
                <TableCell>Horodatage</TableCell>
                <TableCell>Acteur</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Détails</TableCell>
                <TableCell>Adresse IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {journal.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">Aucune action enregistrée pour ces critères.</TableCell></TableRow>
              ) : (
                journal.map((j) => (
                  <TableRow key={j.id} hover>
                    <TableCell>{fmt(j.date_action)}</TableCell>
                    <TableCell>{j.acteur_nom || j.acteur_username || '—'}</TableCell>
                    <TableCell><Chip label={j.action_display} size="small" sx={{ bgcolor: `${colors.or}30` }} /></TableCell>
                    <TableCell>{j.description || '—'}</TableCell>
                    <TableCell>{j.adresse_ip || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${colors.vert}`, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: `${colors.vert}12` }}>
                <TableCell>Horodatage</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Adresse IP</TableCell>
                <TableCell>Navigateur</TableCell>
                <TableCell>Système</TableCell>
                <TableCell>Appareil</TableCell>
                <TableCell>Résultat</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {connexions.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">Aucune connexion enregistrée pour ces critères.</TableCell></TableRow>
              ) : (
                connexions.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{fmt(c.date_connexion)}</TableCell>
                    <TableCell>{c.user_nom || c.username || '—'}</TableCell>
                    <TableCell>{c.adresse_ip || '—'}</TableCell>
                    <TableCell>{c.navigateur || '—'}</TableCell>
                    <TableCell>{c.systeme_exploitation || '—'}</TableCell>
                    <TableCell>{c.appareil || '—'}</TableCell>
                    <TableCell>
                      <Chip label={c.succes ? 'Réussie' : 'Échouée'} size="small" color={c.succes ? 'success' : 'error'} />
                    </TableCell>
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
