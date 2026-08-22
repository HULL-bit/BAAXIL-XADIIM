import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import { ExpandMore, AccountTree, TrendingUp, Download, PictureAsPdf, RequestQuote } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

function AssignationAnnuellePanel() {
  const [sections, setSections] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [montant, setMontant] = useState('')
  const [objet, setObjet] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.get('organisation/sections/').then(({ data }) => setSections(data.results || data || [])).catch(() => setSections([]))
  }, [])

  const handleSubmit = async () => {
    if (!sectionId || !montant || Number(montant) <= 0) {
      setResult({ error: 'Section et montant (positif) requis.' })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      const { data } = await api.post('/finance/cotisations/generer_assignation_annuelle/', {
        section: sectionId, annee, montant_total: montant, objet,
      })
      setResult(data)
    } catch (err) {
      setResult({ error: err.response?.data?.detail || "Erreur lors de la création de l'assignation." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card sx={{ mb: 3, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <RequestQuote /> Assignation annuelle par section
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fixe un montant total pour une section, réparti à parts égales entre les membres actifs
          de ses cellules pilotes. Réservé au Super Admin (aucun rôle Section n'a l'écriture).
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField select size="small" label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} fullWidth>
              <MenuItem value="">Choisir…</MenuItem>
              {sections.map((s) => <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField size="small" label="Année" type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} fullWidth />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField size="small" label="Montant total (FCFA)" type="number" value={montant} onChange={(e) => setMontant(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField size="small" label="Objet (optionnel)" value={objet} onChange={(e) => setObjet(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              disabled={saving}
              onClick={handleSubmit}
              sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
            >
              {saving ? <CircularProgress size={20} /> : 'Créer'}
            </Button>
          </Grid>
        </Grid>
        {result && (
          <Alert severity={result.error ? 'error' : 'success'} sx={{ mt: 2 }}>
            {result.error || `Assignation créée pour ${result.total_membres} membre(s) — ${result.montant_par_membre?.toLocaleString('fr-FR')} FCFA/membre (${result.created} créé(s), ${result.already_existing} déjà existant(s)).`}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default function FinanceHierarchie() {
  const { isSuperAdmin, permissions } = useAuth()
  const canView = !!permissions?.can_view_national_synthese
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [mois, setMois] = useState('')
  const [exportingFormat, setExportingFormat] = useState('')
  const [exportError, setExportError] = useState('')

  const handleExport = async (format) => {
    setExportingFormat(format)
    setExportError('')
    try {
      const params = { annee, format }
      if (mois) params.mois = mois
      const { data } = await api.get('/finance/export-rapport-hierarchie/', { params, responseType: 'blob' })
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `synthese_hierarchique_${annee}${mois ? `_${mois}` : ''}.${ext}`)
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setExportError("Erreur lors de l'export du rapport.")
    } finally {
      setExportingFormat('')
    }
  }

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    setLoading(true)
    const params = { annee }
    if (mois) params.mois = mois
    api.get('/finance/cotisations/stats_hierarchie/', { params })
      .then(({ data: res }) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [canView, annee, mois])

  if (!canView) {
    return (
      <Box>
        <Typography variant="h6" color="text.secondary">Accès réservé aux rôles nationaux, de section et au Super Admin.</Typography>
      </Box>
    )
  }

  const MOIS = [
    { value: '', label: 'Tous les mois' }, { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' }, { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' }, { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
  ]

  const globalSummary = data && data.regroupements?.length
    ? data.regroupements.reduce(
        (acc, reg) => {
          const mt = reg.montant_total || 0
          const mp = reg.montant_paye || 0
          const nb = reg.nb_cotisations || 0
          acc.montant_total += mt
          acc.montant_paye += mp
          acc.nb_cotisations += nb
          return acc
        },
        { montant_total: 0, montant_paye: 0, nb_cotisations: 0 },
      )
    : null

  const pctGlobal = globalSummary && globalSummary.montant_total > 0
    ? Math.round((globalSummary.montant_paye / globalSummary.montant_total) * 10000) / 100
    : 0

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUp /> Synthèse finance hiérarchique
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Regroupements → Sections → Dahiras. Montants et % synchronisés à partir des cotisations.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Année"
          value={annee}
          onChange={(e) => setAnnee(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Mois"
          value={mois}
          onChange={(e) => setMois(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 160 }}
        >
          {MOIS.map((m) => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
        </TextField>
        {isSuperAdmin && (
          <>
            <Button
              variant="outlined"
              startIcon={exportingFormat === 'excel' ? <CircularProgress size={16} /> : <Download />}
              onClick={() => handleExport('excel')}
              disabled={!!exportingFormat}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={exportingFormat === 'pdf' ? <CircularProgress size={16} /> : <PictureAsPdf />}
              onClick={() => handleExport('pdf')}
              disabled={!!exportingFormat}
            >
              Export PDF
            </Button>
          </>
        )}
      </Box>

      {exportError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError('')}>{exportError}</Alert>}

      {isSuperAdmin && <AssignationAnnuellePanel />}

      {globalSummary && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, minWidth: 220, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Montant total assigné</Typography>
            <Typography variant="h6">{globalSummary.montant_total.toLocaleString('fr-FR')} FCFA</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 220, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Montant total payé</Typography>
            <Typography variant="h6">{globalSummary.montant_paye.toLocaleString('fr-FR')} FCFA</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 220, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">% montant payé (global)</Typography>
            <Typography variant="h6">{pctGlobal}%</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 220, borderLeft: `3px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Nombre de cotisations</Typography>
            <Typography variant="h6">{globalSummary.nb_cotisations.toLocaleString('fr-FR')}</Typography>
          </Paper>
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: COLORS.vert }} /></Box>
      ) : !data || !data.regroupements?.length ? (
        <Paper sx={{ p: 3, borderLeft: `4px solid ${COLORS.vert}` }}>
          <Typography color="text.secondary">Aucune donnée pour cette période ou aucun regroupement configuré.</Typography>
        </Paper>
      ) : (
        data.regroupements.map((reg) => (
          <Accordion
            key={reg.id}
            defaultExpanded={data.regroupements.length <= 2}
            sx={{
              mb: 1,
              borderLeft: `4px solid ${COLORS.vert}`,
              '&:before': { display: 'none' },
              borderRadius: 2,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: COLORS.vert }} />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <AccountTree sx={{ color: COLORS.vert }} />
                <Typography fontWeight={600} sx={{ color: COLORS.vertFonce }}>{reg.nom}</Typography>
                <Chip size="small" label={`${reg.montant_total?.toLocaleString('fr-FR')} FCFA`} sx={{ bgcolor: `${COLORS.vert}20` }} />
                <Chip size="small" label={`${reg.pct_paye}% payé`} color={reg.pct_paye >= 80 ? 'success' : 'default'} />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {reg.sections?.map((sec) => {
                const dahirasSec = (sec.sous_sections || []).flatMap((ss) => ss.dahiras || [])
                return (
                  <Box key={sec.id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: COLORS.vertFonce, fontWeight: 600, mt: 1 }}>
                      Section {sec.nom} — {sec.montant_total?.toLocaleString('fr-FR')} FCFA · {sec.pct_paye}% payé
                    </Typography>
                    <Table size="small" sx={{ mt: 0.5, ml: 2 }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: `${COLORS.vert}10` }}>
                          <TableCell>Dahira</TableCell>
                          <TableCell align="right">Montant total</TableCell>
                          <TableCell align="right">Payé</TableCell>
                          <TableCell align="right">%</TableCell>
                          <TableCell align="right">Cotisations</TableCell>
                          <TableCell align="right">Membres</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dahirasSec.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">Aucun dahira pour cette section</TableCell>
                          </TableRow>
                        ) : (
                          dahirasSec.map((d) => (
                            <TableRow key={d.id}>
                              <TableCell>{d.nom}</TableCell>
                              <TableCell align="right">{d.montant_total?.toLocaleString('fr-FR')} FCFA</TableCell>
                              <TableCell align="right">{d.montant_paye?.toLocaleString('fr-FR')} FCFA</TableCell>
                              <TableCell align="right">{d.pct_paye}%</TableCell>
                              <TableCell align="right">{d.nb_cotisations}</TableCell>
                              <TableCell align="right">{d.nb_membres}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                )
              })}
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  )
}
