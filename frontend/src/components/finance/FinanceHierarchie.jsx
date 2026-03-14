import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
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
} from '@mui/material'
import { ExpandMore, AccountTree, TrendingUp } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

export default function FinanceHierarchie() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'jewrine_finance'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [mois, setMois] = useState('')

  useEffect(() => {
    if (!isAdmin) {
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
  }, [isAdmin, annee, mois])

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h6" color="text.secondary">Accès réservé aux administrateurs et Jewrine Finance.</Typography>
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
      </Box>

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
