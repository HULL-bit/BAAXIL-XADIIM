import { useState, useEffect, useMemo } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import api from '../../services/api'
import { colors } from '../../styles/theme'

const PAR_PAGE = 50

const ONGLETS = [
  { cle: 'matricule', court: 'Matricules' },
  { cle: 'enfants', court: 'Enfants 500 F' },
  { cle: 'bureau_national', court: 'Bureau National' },
]

export default function ControleQualite({ open, onClose }) {
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [onglet, setOnglet] = useState('matricule')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    api
      .get('/auth/controle-qualite/', { skipCache: true })
      .then(({ data }) => setRapport(data))
      .catch((e) => setError(e.response?.data?.detail || 'Impossible de charger le contrôle qualité.'))
      .finally(() => setLoading(false))
  }, [open])

  const bloc = rapport?.controles?.[onglet]
  const lignes = useMemo(
    () => (bloc?.anomalies || []).filter((a) => !type || a.type === type),
    [bloc, type],
  )
  const pages = Math.max(1, Math.ceil(lignes.length / PAR_PAGE))

  const changerOnglet = (cle) => {
    setOnglet(cle)
    setType('')
    setPage(1)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Contrôle qualité des membres</DialogTitle>
      <DialogContent>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
        {error && <Alert severity="error">{error}</Alert>}
        {rapport && !loading && (
          <>
            <Typography variant="body2" sx={{ mb: 1, color: colors.vertFonce }}>
              {rapport.total_membres} membres contrôlés (année de référence {rapport.annee_reference}). Rien n’est modifié
              automatiquement : corrigez les fiches listées depuis « Gestion des membres ».
            </Typography>
            <Tabs value={onglet} onChange={(_, v) => changerOnglet(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1 }}>
              {ONGLETS.map((o) => {
                const n = rapport.controles[o.cle].total_anomalies
                return <Tab key={o.cle} value={o.cle} label={`${o.court} (${n})`} />
              })}
            </Tabs>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{bloc.libelle}</Typography>
            {onglet === 'matricule' && rapport.references && (
              <Alert severity={rapport.references.cellules_sans_code.length ? 'info' : 'success'} sx={{ mb: 1.5 }}>
                {rapport.references.cellules_avec_code} cellule(s) avec code officiel (ex. S01DK01).
                {rapport.references.cellules_sans_code.length > 0 && (
                  <> {rapport.references.cellules_sans_code.length} cellule(s) sans code officiel : leurs matricules ne sont vérifiés que par cohérence entre membres
                  ({rapport.references.cellules_sans_code.slice(0, 5).map((c) => `${c.dahira} (${c.membres})`).join(', ')}
                  {rapport.references.cellules_sans_code.length > 5 ? '…' : ''}).</>
                )}
              </Alert>
            )}
            {bloc.total_anomalies === 0 ? (
              <Alert severity="success">Aucune anomalie.</Alert>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  <Chip label={`Tout (${bloc.total_anomalies})`} color={type ? 'default' : 'primary'} onClick={() => { setType(''); setPage(1) }} />
                  {Object.entries(bloc.par_type).map(([t, n]) => (
                    <Chip
                      key={t}
                      label={`${rapport.libelles[t]} (${n})`}
                      color={type === t ? 'primary' : 'default'}
                      onClick={() => { setType(t); setPage(1) }}
                    />
                  ))}
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Membre</TableCell>
                        <TableCell>Section / Cellule</TableCell>
                        <TableCell>Matricule</TableCell>
                        <TableCell>Né(e)</TableCell>
                        <TableCell>Tarif</TableCell>
                        <TableCell>Problème</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lignes.slice((page - 1) * PAR_PAGE, page * PAR_PAGE).map((a, i) => (
                        <TableRow key={`${a.membre_id}-${a.type}-${i}`} hover>
                          <TableCell>{a.nom}{a.est_bureau_national && <Chip size="small" label="B.N" sx={{ ml: 0.5 }} />}</TableCell>
                          <TableCell>{a.section}{a.dahira ? ` / ${a.dahira}` : ''}</TableCell>
                          <TableCell>{a.matricule || '—'}</TableCell>
                          <TableCell>{a.annee_naissance ?? '—'}</TableCell>
                          <TableCell>{Number(a.montant_cotisation)} F</TableCell>
                          <TableCell>
                            <Chip size="small" color={a.severite === 'erreur' ? 'error' : 'warning'} label={a.severite === 'erreur' ? 'À corriger' : 'À vérifier'} sx={{ mr: 0.5 }} />
                            {a.libelle}
                            {a.detail && <Typography variant="caption" display="block" color="text.secondary">{a.detail}</Typography>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {pages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} />
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  )
}
